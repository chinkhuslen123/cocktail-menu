import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// =========================
// GET CURRENT SHIFT
// =========================

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: shift, error } = await supabase
      .from("shifts")
      .select(
        "id, opened_at, closed_at, opened_by, is_open, created_at"
      )
      .eq("is_open", true)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("CURRENT SHIFT ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!shift) {
      return NextResponse.json({
        shift: null,
        summary: {
          orderCount: 0,
          total: 0,
        },
      });
    }

    // =========================
    // SHIFT ORDERS
    // =========================

    const { data: orders, error: ordersError } =
      await supabase
        .from("orders")
        .select(
          "id, total_amount, total, status"
        )
        .eq("shift_id", shift.id);

    if (ordersError) {
      console.error(
        "SHIFT ORDERS ERROR:",
        ordersError
      );

      return NextResponse.json(
        {
          error: ordersError.message,
        },
        { status: 500 }
      );
    }

    const orderList = orders ?? [];

    const total = orderList.reduce(
      (sum, order) => {
        const amount =
          order.total ?? order.total_amount ?? 0;

        return sum + Number(amount);
      },
      0
    );

    // =========================
    // ORDER ITEMS (PRODUCT BREAKDOWN)
    // =========================

    const orderIds = orderList.map(
      (order) => order.id
    );

    let products: {
      name: string;
      quantity: number;
      total: number;
    }[] = [];

    if (orderIds.length > 0) {
      const { data: items, error: itemsError } =
        await supabase
          .from("order_items")
          .select(
            "id, order_id, product_name_snapshot, unit_price_snapshot, quantity, subtotal"
          )
          .in("order_id", orderIds);

      if (itemsError) {
        console.error(
          "CURRENT SHIFT ITEMS ERROR:",
          itemsError
        );

        return NextResponse.json(
          {
            error: itemsError.message,
          },
          { status: 500 }
        );
      }

      const productMap = new Map<
        string,
        { name: string; quantity: number; total: number }
      >();

      (items ?? []).forEach((item) => {
        const name = item.product_name_snapshot;
        const quantity = Number(item.quantity) || 0;
        const subtotal = Number(item.subtotal) || 0;

        const existing = productMap.get(name);

        if (existing) {
          existing.quantity += quantity;
          existing.total += subtotal;
        } else {
          productMap.set(name, {
            name,
            quantity,
            total: subtotal,
          });
        }
      });

      products = Array.from(productMap.values());
    }

    return NextResponse.json({
      shift,
      summary: {
        orderCount: orderList.length,
        total,
      },
      products,
    });
  } catch (error) {
    console.error("SHIFT GET ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Серверийн алдаа гарлаа.",
      },
      { status: 500 }
    );
  }
}

// =========================
// START SHIFT
// =========================

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    // =========================
    // AUTH
    // =========================

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(
        "SHIFT AUTH ERROR:",
        authError
      );

      return NextResponse.json(
        {
          error: "Нэвтрэлт шалгахад алдаа гарлаа.",
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Та эхлээд нэвтэрнэ үү.",
        },
        { status: 401 }
      );
    }

    // =========================
    // CHECK OPEN SHIFT
    // =========================

    const { data: existingShift, error: existingError } =
      await supabase
        .from("shifts")
        .select(
          "id, opened_at, opened_by, is_open"
        )
        .eq("is_open", true)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (existingError) {
      console.error(
        "EXISTING SHIFT ERROR:",
        existingError
      );

      return NextResponse.json(
        {
          error: existingError.message,
        },
        { status: 500 }
      );
    }

    if (existingShift) {
      return NextResponse.json(
        {
          error: "Одоогоор нээлттэй ээлж байна.",
          shift: existingShift,
        },
        { status: 400 }
      );
    }

    // =========================
    // CREATE SHIFT
    // =========================

    const { data: shift, error: insertError } =
      await supabase
        .from("shifts")
        .insert({
          opened_at: new Date().toISOString(),
          opened_by: user.id,
          closed_at: null,
          is_open: true,
        })
        .select(
          "id, opened_at, closed_at, opened_by, is_open, created_at"
        )
        .single();

    if (insertError) {
      console.error(
        "SHIFT INSERT ERROR:",
        insertError
      );

      return NextResponse.json(
        {
          error: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        shift,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("SHIFT START ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Серверийн алдаа гарлаа.",
      },
      { status: 500 }
    );
  }
}

// =========================
// CLOSE SHIFT
// =========================

export async function PATCH() {
  try {
    const supabase = await createSupabaseServerClient();

    // =========================
    // FIND OPEN SHIFT
    // =========================

    const { data: shift, error: shiftError } =
      await supabase
        .from("shifts")
        .select(
          "id, opened_at, closed_at, opened_by, is_open, created_at"
        )
        .eq("is_open", true)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (shiftError) {
      console.error(
        "OPEN SHIFT FIND ERROR:",
        shiftError
      );

      return NextResponse.json(
        {
          error: shiftError.message,
        },
        { status: 500 }
      );
    }

    if (!shift) {
      return NextResponse.json(
        {
          error: "Одоогоор нээлттэй ээлж алга.",
        },
        { status: 400 }
      );
    }

    // =========================
    // FIND ACTIVE ORDERS
    // =========================

    const { data: activeOrders, error: ordersError } =
      await supabase
        .from("orders")
        .select(
          "id, table_id, total_amount, total, status"
        )
        .eq("shift_id", shift.id)
        .neq("status", "done");

    if (ordersError) {
      console.error(
        "ACTIVE ORDERS ERROR:",
        ordersError
      );

      return NextResponse.json(
        {
          error: ordersError.message,
        },
        { status: 500 }
      );
    }

    // =========================
    // CHECK ACTIVE ORDERS
    // =========================

    if (
      activeOrders &&
      activeOrders.length > 0
    ) {
      const tableIds = [
        ...new Set(
          activeOrders.map(
            (order) => order.table_id
          )
        ),
      ];

      const { data: tables } = await supabase
        .from("tables")
        .select("id, number")
        .in("id", tableIds);

      const tableNumbers =
        (tables ?? [])
          .map((table) => table.number)
          .sort((a, b) => a - b);

      return NextResponse.json(
        {
          error:
            "Ээлж хаахаас өмнө бүх ширээний тооцоог хаана уу.",
          activeOrderCount:
            activeOrders.length,
          tableNumbers,
        },
        { status: 400 }
      );
    }

    // =========================
    // CLOSE SHIFT
    // =========================

    const closedAt =
      new Date().toISOString();

    const { error: closeError } =
      await supabase
        .from("shifts")
        .update({
          is_open: false,
          closed_at: closedAt,
        })
        .eq("id", shift.id)
        .eq("is_open", true);

    if (closeError) {
      console.error(
        "SHIFT CLOSE ERROR:",
        closeError
      );

      return NextResponse.json(
        {
          error: closeError.message,
        },
        { status: 500 }
      );
    }

    // =========================
    // RETURN CLOSED SHIFT
    // =========================

    return NextResponse.json({
      success: true,
      shift: {
        ...shift,
        is_open: false,
        closed_at: closedAt,
      },
    });
  } catch (error) {
    console.error(
      "SHIFT PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Серверийн алдаа гарлаа.",
      },
      { status: 500 }
    );
  }
}
