import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // =========================
    // AUTH
    // =========================

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Нэвтрэх шаардлагатай.",
        },
        { status: 401 }
      );
    }

    // =========================
    // LAST 7 DAYS
    // =========================

    const sevenDaysAgo = new Date();

    sevenDaysAgo.setDate(
      sevenDaysAgo.getDate() - 7
    );

    // =========================
    // GET CLOSED SHIFTS
    // =========================

    const {
      data: shifts,
      error: shiftsError,
    } = await supabase
      .from("shifts")
      .select(
        `
          id,
          opened_at,
          closed_at,
          opened_by,
          is_open,
          created_at
        `
      )
      .eq("is_open", false)
      .gte(
        "opened_at",
        sevenDaysAgo.toISOString()
      )
      .order("opened_at", {
        ascending: false,
      });

    if (shiftsError) {
      console.error(
        "SHIFT HISTORY ERROR:",
        shiftsError
      );

      return NextResponse.json(
        {
          error: shiftsError.message,
        },
        { status: 500 }
      );
    }

    const shiftList = shifts ?? [];

    // =========================
    // NO HISTORY
    // =========================

    if (shiftList.length === 0) {
      return NextResponse.json({
        shifts: [],
      });
    }

    // =========================
    // SHIFT IDS
    // =========================

    const shiftIds = shiftList.map(
      (shift) => shift.id
    );

    // =========================
    // GET ORDERS
    // =========================

    const {
      data: orders,
      error: ordersError,
    } = await supabase
      .from("orders")
      .select(
        `
          id,
          shift_id,
          table_id,
          total_amount,
          total,
          status
        `
      )
      .in("shift_id", shiftIds);

    if (ordersError) {
      console.error(
        "SHIFT HISTORY ORDERS ERROR:",
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

    // =========================
    // GET ORDER ITEMS
    // =========================

    const orderIds = orderList.map(
      (order) => order.id
    );

    let orderItems: {
      id: number;
      order_id: number;
      product_name_snapshot: string;
      unit_price_snapshot: number;
      quantity: number;
      subtotal: number;
    }[] = [];

    if (orderIds.length > 0) {
      const {
        data: items,
        error: itemsError,
      } = await supabase
        .from("order_items")
        .select(
          `
            id,
            order_id,
            product_name_snapshot,
            unit_price_snapshot,
            quantity,
            subtotal
          `
        )
        .in("order_id", orderIds);

      if (itemsError) {
        console.error(
          "SHIFT HISTORY ITEMS ERROR:",
          itemsError
        );

        return NextResponse.json(
          {
            error: itemsError.message,
          },
          { status: 500 }
        );
      }

      orderItems = items ?? [];
    }

    // =========================
    // BUILD HISTORY
    // =========================

    const history = shiftList.map(
      (shift) => {
        // ЗӨВХӨН ТУХАЙН SHIFT-ИЙН ORDERS
        const shiftOrders =
          orderList.filter(
            (order) =>
              order.shift_id ===
              shift.id
          );

        const shiftOrderIds =
          shiftOrders.map(
            (order) => order.id
          );

        // ЗӨВХӨН ТУХАЙН SHIFT-ИЙН ITEMS
        const shiftItems =
          orderItems.filter((item) =>
            shiftOrderIds.includes(
              item.order_id
            )
          );

        // =========================
        // GROUP PRODUCTS
        // =========================

        const productMap =
          new Map<
            string,
            {
              name: string;
              quantity: number;
              total: number;
            }
          >();

        shiftItems.forEach((item) => {
          const name =
            item.product_name_snapshot;

          const quantity =
            Number(item.quantity) || 0;

          const subtotal =
            Number(item.subtotal) || 0;

          const existing =
            productMap.get(name);

          if (existing) {
            existing.quantity +=
              quantity;

            existing.total +=
              subtotal;
          } else {
            productMap.set(name, {
              name,
              quantity,
              total: subtotal,
            });
          }
        });

        const products =
          Array.from(
            productMap.values()
          );

        // =========================
        // SHIFT TOTAL
        // =========================

        const total =
          shiftOrders.reduce(
            (sum, order) => {
              const amount =
                order.total ??
                order.total_amount ??
                0;

              return (
                sum + Number(amount)
              );
            },
            0
          );

        // =========================
        // RETURN SHIFT
        // =========================

        return {
          id: shift.id,
          opened_at: shift.opened_at,
          closed_at: shift.closed_at,
          opened_by: shift.opened_by,
          is_open: shift.is_open,
          created_at: shift.created_at,

          orderCount:
            shiftOrders.length,

          total,

          products,
        };
      }
    );

    // =========================
    // RESPONSE
    // =========================

    return NextResponse.json({
      shifts: history,
    });
  } catch (error) {
    console.error(
      "SHIFT HISTORY SERVER ERROR:",
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