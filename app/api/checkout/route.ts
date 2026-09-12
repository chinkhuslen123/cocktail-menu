import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const body = await request.json();

    const tableNumber = Number(body.table_number);

    if (
      !Number.isInteger(tableNumber) ||
      tableNumber <= 0
    ) {
      return NextResponse.json(
        {
          error: "Зөв ширээний дугаар оруулна уу.",
        },
        { status: 400 }
      );
    }

    // =========================
    // FIND TABLE
    // =========================

    const { data: table, error: tableError } =
      await supabase
        .from("tables")
        .select("id, number")
        .eq("number", tableNumber)
        .maybeSingle();

    if (tableError) {
      console.error(
        "CHECKOUT TABLE ERROR:",
        tableError
      );

      return NextResponse.json(
        {
          error: tableError.message,
        },
        { status: 500 }
      );
    }

    if (!table) {
      return NextResponse.json(
        {
          error: `${tableNumber}-р ширээ олдсонгүй.`,
        },
        { status: 404 }
      );
    }

    // =========================
    // FIND OPEN SHIFT
    // =========================

    const { data: openShift, error: shiftError } =
      await supabase
        .from("shifts")
        .select(
          "id, opened_at, closed_at, is_open"
        )
        .eq("is_open", true)
        .order("opened_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (shiftError) {
      console.error(
        "CHECKOUT SHIFT ERROR:",
        shiftError
      );

      return NextResponse.json(
        {
          error: shiftError.message,
        },
        { status: 500 }
      );
    }

    if (!openShift) {
      return NextResponse.json(
        {
          error: "Нээлттэй shift олдсонгүй.",
        },
        { status: 404 }
      );
    }

    // =========================
    // GET TABLE ORDERS
    // =========================

    const { data: orders, error: ordersError } =
      await supabase
        .from("orders")
        .select(
          `
            id,
            table_id,
            shift_id,
            status,
            created_at,
            total_amount,
            total
          `
        )
        .eq("table_id", table.id)
        .eq("shift_id", openShift.id)
        .order("created_at", {
          ascending: true,
        });

    if (ordersError) {
      console.error(
        "CHECKOUT ORDERS ERROR:",
        ordersError
      );

      return NextResponse.json(
        {
          error: ordersError.message,
        },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        {
          error: `${tableNumber}-р ширээнд хаах захиалга алга байна.`,
        },
        { status: 404 }
      );
    }

    // =========================
    // GET ORDER ITEMS
    // =========================

    const orderIds = orders.map(
      (order) => order.id
    );

    const {
      data: items,
      error: itemsError,
    } = await supabase
      .from("order_items")
      .select(
        `
          id,
          order_id,
          product_id,
          product_name_snapshot,
          unit_price_snapshot,
          quantity,
          subtotal
        `
      )
      .in("order_id", orderIds);

    if (itemsError) {
      console.error(
        "CHECKOUT ITEMS ERROR:",
        itemsError
      );

      return NextResponse.json(
        {
          error: itemsError.message,
        },
        { status: 500 }
      );
    }

    // =========================
    // GROUP ITEMS
    // =========================

    const groupedItems = new Map<
      string,
      {
        product_id: number | null;
        product_name_snapshot: string;
        unit_price_snapshot: number;
        quantity: number;
        subtotal: number;
      }
    >();

    const activeOrderIds = orders
  .filter(
    (order) => order.status !== "done"
  )
  .map((order) => order.id);

for (const item of items ?? []) {
  if (!activeOrderIds.includes(item.order_id)) {
    continue;
  }

  const key =
    `${item.product_id}-${item.product_name_snapshot}`;

  const existing =
    groupedItems.get(key);

  if (existing) {
    existing.quantity += Number(
      item.quantity
    );

    existing.subtotal += Number(
      item.subtotal
    );
  } else {
    groupedItems.set(key, {
      product_id: item.product_id,
      product_name_snapshot:
        item.product_name_snapshot,
      unit_price_snapshot: Number(
        item.unit_price_snapshot
      ),
      quantity: Number(item.quantity),
      subtotal: Number(item.subtotal),
    });
  }
}

    const grouped = Array.from(
      groupedItems.values()
    );

    // =========================
    // TOTAL
    // =========================

    const total = grouped.reduce(
      (sum, item) =>
        sum + Number(item.subtotal),
      0
    );

    // =========================
    // CLOSE SHIFT
    // =========================

    // =========================
// MARK TABLE ORDERS AS DONE
// =========================

const { error: doneError } =
  await supabase
    .from("orders")
    .update({
      status: "done",
    })
    .in("id", activeOrderIds);

if (doneError) {
  console.error(
    "CHECKOUT MARK DONE ERROR:",
    doneError
  );

  return NextResponse.json(
    {
      error: doneError.message,
    },
    { status: 500 }
  );
}

    return NextResponse.json({
      success: true,

      table: {
        id: table.id,
        number: table.number,
      },

      shift: {
  id: openShift.id,
  opened_at: openShift.opened_at,
  closed_at: openShift.closed_at,
  is_open: openShift.is_open,
},

      orders,

      items: grouped,

      total,
    });
  } catch (error) {
    console.error(
      "CHECKOUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Тооцоо хаах үед серверийн алдаа гарлаа.",
      },
      { status: 500 }
    );
  }
}