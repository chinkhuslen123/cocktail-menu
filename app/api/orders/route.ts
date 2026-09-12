import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { searchParams } = new URL(request.url);

    const orderIdsParam = searchParams.get("ids");
    const tableNumberParam = searchParams.get("table_number");

    // =========================
    // MY ORDERS BY IDS
    // =========================

    if (orderIdsParam) {
      const ids = orderIdsParam
        .split(",")
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id));

      if (ids.length === 0) {
        return NextResponse.json({
          orders: [],
        });
      }
          const { data: orders, error: ordersError } =
  await supabase
    .from("orders")
    .select(
      "id, table_id, shift_id, status, created_at, total_amount, total"
    )
    .in("id", ids)
    .neq("status", "done")
    .order("created_at", {
      ascending: false,
    });

      if (ordersError) {
        console.error(
          "MY ORDERS FETCH ERROR:",
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
        return NextResponse.json({
          orders: [],
        });
      }

      const orderIds = orders.map(
        (order) => order.id
      );

      const { data: items, error: itemsError } =
        await supabase
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
          "MY ORDER ITEMS FETCH ERROR:",
          itemsError
        );

        return NextResponse.json(
          {
            error: itemsError.message,
          },
          { status: 500 }
        );
      }

      const result = orders.map((order) => ({
        ...order,
        items:
          items?.filter(
            (item) =>
              item.order_id === order.id
          ) ?? [],
      }));

      return NextResponse.json({
        orders: result,
      });
    }

    // =========================
    // ORDERS BY TABLE
    // =========================

    if (tableNumberParam) {
      const tableNumber = Number(
        tableNumberParam
      );

      if (
        !Number.isInteger(tableNumber) ||
        tableNumber <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Ширээний дугаар буруу байна.",
          },
          { status: 400 }
        );
      }

      const { data: table, error: tableError } =
        await supabase
          .from("tables")
          .select("id, number")
          .eq("number", tableNumber)
          .maybeSingle();

      if (tableError) {
        console.error(
          "TABLE FIND ERROR:",
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
            error:
              "Ширээ олдсонгүй.",
          },
          { status: 404 }
        );
      }

      const {
  data: orders,
  error: ordersError,
} = await supabase
  .from("orders")
  .select(
    "id, table_id, shift_id, status, created_at, total_amount, total"
  )
  .eq("table_id", table.id)
  .neq("status", "done")
  .order("created_at", {
    ascending: false,
  });

      if (ordersError) {
        console.error(
          "TABLE ORDERS FETCH ERROR:",
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
        return NextResponse.json({
          orders: [],
        });
      }

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
          "TABLE ORDER ITEMS ERROR:",
          itemsError
        );

        return NextResponse.json(
          {
            error: itemsError.message,
          },
          { status: 500 }
        );
      }

      const result = orders.map((order) => ({
        ...order,
        tableNumber: table.number,
        items:
          items?.filter(
            (item) =>
              item.order_id === order.id
          ) ?? [],
      }));

      return NextResponse.json({
        orders: result,
      });
    }

    return NextResponse.json(
      {
        error:
          "ids эсвэл table_number шаардлагатай.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "ORDERS GET ERROR:",
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

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const body = await request.json();

    const tableNumber = Number(body.table_number);
    const items = body.items;

    // =========================
    // VALIDATION
    // =========================

    if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
      return NextResponse.json(
        {
          error: "Ширээний зөв дугаар оруулна уу.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          error: "Захиалгад cocktail сонгоно уу.",
        },
        { status: 400 }
      );
    }

    // =========================
    // TABLE FIND
    // =========================

    const { data: table, error: tableError } =
      await supabase
        .from("tables")
        .select("id, number")
        .eq("number", tableNumber)
        .maybeSingle();
    
    // =========================
// OPEN SHIFT FIND
// =========================

const { data: shift, error: shiftError } =
  await supabase
    .from("shifts")
    .select("id")
    .eq("is_open", true)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

if (shiftError) {
  console.error("SHIFT FIND ERROR:", shiftError);

  return NextResponse.json(
    {
      error: "Нээлттэй shift шалгахад алдаа гарлаа.",
    },
    { status: 500 }
  );
}

if (!shift) {
  return NextResponse.json(
    {
      error:
        "Одоогоор нээлттэй shift байхгүй байна. Админ shift нээнэ үү.",
    },
    { status: 400 }
  );
}

    if (tableError) {
      console.error("TABLE FIND ERROR:", tableError);

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
    // PRODUCT IDS
    // =========================

    const productIds = items
      .map((item: any) => Number(item.product_id))
      .filter((id: number) => Number.isInteger(id));

    if (productIds.length === 0) {
      return NextResponse.json(
        {
          error: "Cocktail сонгосонгүй байна.",
        },
        { status: 400 }
      );
    }

    // =========================
    // GET PRODUCTS
    // =========================

    const { data: products, error: productError } =
      await supabase
        .from("products")
        .select(
          `
            id,
            name,
            price,
            is_available
          `
        )
        .in("id", productIds);

    if (productError) {
      console.error("PRODUCT FIND ERROR:", productError);

      return NextResponse.json(
        {
          error: productError.message,
        },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        {
          error: "Сонгосон cocktail олдсонгүй.",
        },
        { status: 404 }
      );
    }

    // =========================
    // CREATE ORDER ITEMS
    // =========================

    let total = 0;

    const orderItems = [];

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return NextResponse.json(
          {
            error: "Захиалгын мэдээлэл буруу байна.",
          },
          { status: 400 }
        );
      }

      const product = products.find(
        (p) => p.id === productId
      );

      if (!product) {
        return NextResponse.json(
          {
            error: `Cocktail ID ${productId} олдсонгүй.`,
          },
          { status: 404 }
        );
      }

      if (!product.is_available) {
        return NextResponse.json(
          {
            error: `"${product.name}" одоогоор байхгүй байна.`,
          },
          { status: 400 }
        );
      }

      const price = Number(product.price);
const subtotal = price * quantity;

total += subtotal;

orderItems.push({
  product_id: product.id,
  product_name_snapshot: product.name,
  unit_price_snapshot: price,
  quantity,
  subtotal,
});
    }

    // =========================
    // CREATE ORDER
    // =========================

    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .insert({
        table_id: table.id,
        shift_id: shift.id,
        status: "new",
        total_amount: total,
        total: total,
        })
        .select(
        "id, table_id, status, total, created_at"
        )
        .single();

    if (orderError) {
      console.error(
        "ORDER INSERT ERROR:",
        orderError
      );

      return NextResponse.json(
        {
          error: orderError.message,
        },
        { status: 500 }
      );
    }

    // =========================
    // CREATE ORDER ITEMS
    // =========================

    const itemsToInsert = orderItems.map((item) => ({
      order_id: order.id,
      ...item,
    }));

    const {
      data: createdItems,
      error: itemsError,
    } = await supabase
      .from("order_items")
      .insert(itemsToInsert)
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
);
    if (itemsError) {
      console.error(
        "ORDER ITEMS INSERT ERROR:",
        itemsError
      );

      // Order үүссэн боловч item үүсээгүй бол
      // order-ийг буцааж устгана.
      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          error: itemsError.message,
        },
        { status: 500 }
      );
    }

    // =========================
    // SUCCESS
    // =========================

    return NextResponse.json(
      {
        success: true,
        order: {
          ...order,
          items: createdItems,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ORDER POST ERROR:", error);

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
