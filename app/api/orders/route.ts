import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { timingSafeEqual } from "crypto";

async function isValidTableToken(
  supabase: any,
  tableId: number,
  token: unknown
) {
  if (typeof token !== "string" || token.length < 10 || token.length > 100) {
    return false;
  }

  const { data, error } = await supabase
    .from("table_tokens")
    .select("token")
    .eq("table_id", tableId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  const a = Buffer.from(String(data.token));
  const b = Buffer.from(token);

  return a.length === b.length && timingSafeEqual(a, b);
}

async function isAdminUser() {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  return !!user;
}

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();

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

      if (
        !(await isAdminUser()) &&
        !(await isValidTableToken(
          supabase,
          table.id,
          searchParams.get("token")
        ))
      ) {
        return NextResponse.json(
          { error: "Ширээний код буруу байна." },
          { status: 403 }
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
    const supabase = createSupabaseAdminClient();

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
    // TABLE TOKEN (админаас бусад)
    // =========================

    if (
      !(await isAdminUser()) &&
      !(await isValidTableToken(supabase, table.id, body.token))
    ) {
      return NextResponse.json(
        { error: "Ширээний код буруу байна. QR кодоо дахин уншуулна уу." },
        { status: 403 }
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
    // GET PRODUCT OPTIONS (milk)
    // =========================

    const { data: optionLinks, error: optionLinksError } =
      await supabase
        .from("product_option_groups")
        .select(
          "product_id, option_groups(options(id, name, extra_price))"
        )
        .in("product_id", productIds);

    if (optionLinksError) {
      console.error(
        "PRODUCT OPTIONS FIND ERROR:",
        optionLinksError
      );

      return NextResponse.json(
        {
          error: optionLinksError.message,
        },
        { status: 500 }
      );
    }

    // productId -> тухайн бүтээгдэхүүнд зөвшөөрөгдсөн сонголтууд
    const optionsByProduct = new Map<
      number,
      { id: number; name: string; extra_price: number }[]
    >();

    for (const link of optionLinks ?? []) {
      const list = (link as any).option_groups?.options ?? [];
      const productKey = Number((link as any).product_id);

      optionsByProduct.set(productKey, [
        ...(optionsByProduct.get(productKey) ?? []),
        ...list,
      ]);
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

            // Сонгосон сүү (байвал)
      let option: {
        id: number;
        name: string;
        extra_price: number;
      } | null = null;

      if (
        item.option_id !== null &&
        item.option_id !== undefined
      ) {
        const optionId = Number(item.option_id);

        if (!Number.isInteger(optionId)) {
          return NextResponse.json(
            {
              error: "Сонголтын мэдээлэл буруу байна.",
            },
            { status: 400 }
          );
        }

        option =
          (optionsByProduct.get(productId) ?? []).find(
            (o) => Number(o.id) === optionId
          ) ?? null;

        if (!option) {
          return NextResponse.json(
            {
              error: `"${product.name}" дээр энэ сонголт боломжгүй байна.`,
            },
            { status: 400 }
          );
        }
      }

      const extraPrice = option
        ? Number(option.extra_price)
        : 0;

      const price = Number(product.price) + extraPrice;
      const subtotal = price * quantity;

      total += subtotal;

      orderItems.push({
        product_id: product.id,
        product_name_snapshot: option
          ? `${product.name} (${option.name})`
          : product.name,
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
