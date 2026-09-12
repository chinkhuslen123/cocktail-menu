"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Table = {
  id: number;
  number: number;
};

type Order = {
  id: number;
  table_id: number;
  shift_id: number;
  status: string;
  created_at: string;
  total_amount: number;
  total: number;
};

type OrderItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  subtotal: number;
};

type OrderWithItems = Order & {
  items: OrderItem[];
  tableNumber: number;
};

type GroupedItem = {
  product_id: number | null;
  product_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  subtotal: number;
};

type TableOrderGroup = {
  tableNumber: number;
  orders: OrderWithItems[];
  items: GroupedItem[];
  total: number;
  latestOrderTime: string;
};

const supabase = createSupabaseBrowserClient();

export default function OrderRealtime() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] =
    useState<TableOrderGroup | null>(null);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // =========================
  // AUTO-PRINT QUEUE (шинэ захиалга ирэхэд)
  // =========================

  const [printQueue, setPrintQueue] = useState<OrderWithItems[]>([]);
  const [currentPrintOrder, setCurrentPrintOrder] =
    useState<OrderWithItems | null>(null);
  const isPrintingRef = useRef(false);

  // Ширээний тооцоог (хаалгүйгээр) хэвлэх
  const [printBillGroup, setPrintBillGroup] =
    useState<TableOrderGroup | null>(null);

  // =========================
  // LOAD ALL ORDERS
  // =========================

  async function loadOrders() {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          "id, table_id, shift_id, status, created_at, total_amount, total"
        )
        .neq("status", "done")
        .order("created_at", {
          ascending: false,
        })
        .limit(50);

      if (orderError) {
        console.error("ORDERS FETCH ERROR:", orderError);
        setLoading(false);
        return;
      }

      if (!orderData || orderData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // =========================
      // LOAD TABLES
      // =========================

      const { data: tables, error: tableError } = await supabase
        .from("tables")
        .select("id, number");

      if (tableError) {
        console.error("TABLES FETCH ERROR:", tableError);
      }

      const tableList: Table[] = tables ?? [];

      // =========================
      // LOAD ORDER ITEMS
      // =========================

      const orderIds = orderData.map((order) => order.id);

      const { data: itemData, error: itemError } = await supabase
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

      if (itemError) {
        console.error("ORDER ITEMS FETCH ERROR:", itemError);
        setLoading(false);
        return;
      }

      // =========================
      // COMBINE
      // =========================

      const combined: OrderWithItems[] = orderData.map((order) => {
        const table = tableList.find((item) => item.id === order.table_id);

        return {
          ...order,
          tableNumber: table?.number ?? order.table_id,
          items:
            itemData?.filter((item) => item.order_id === order.id) ?? [],
        };
      });

      setOrders(combined);
      setLoading(false);
    } catch (error) {
      console.error("LOAD ORDERS ERROR:", error);
      setLoading(false);
    }
  }

  // =========================
  // LOAD ONE ORDER
  // =========================

  async function loadNewOrder(
    orderId: number,
    shouldPrint: boolean = false
  ) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(
          "id, table_id, shift_id, status, created_at, total_amount, total"
        )
        .eq("id", orderId)
        .maybeSingle();

      if (orderError || !order) {
        console.error("NEW ORDER FETCH ERROR:", orderError);
        return;
      }

      const { data: table, error: tableError } = await supabase
        .from("tables")
        .select("id, number")
        .eq("id", order.table_id)
        .maybeSingle();

      if (tableError) {
        console.error("NEW ORDER TABLE ERROR:", tableError);
      }

      const { data: items, error: itemError } = await supabase
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
        .eq("order_id", orderId);

      if (itemError) {
        console.error("NEW ORDER ITEMS FETCH ERROR:", itemError);
        return;
      }

      const newOrder: OrderWithItems = {
        ...order,
        tableNumber: table?.number ?? order.table_id,
        items: items ?? [],
      };

      setOrders((current) => {
        const exists = current.some((item) => item.id === newOrder.id);

        if (exists) {
          return current.map((item) =>
            item.id === newOrder.id ? newOrder : item
          );
        }

        return [newOrder, ...current].slice(0, 50);
      });

      if (shouldPrint) {
        setPrintQueue((queue) => [...queue, newOrder]);
      }
    } catch (error) {
      console.error("LOAD NEW ORDER ERROR:", error);
    }
  }

  async function checkoutTable(tableNumber: number) {
    // Хаахаас өмнөх барааны жагсаалт/дүнгийн snapshot-ийг авч үлдэнэ,
    // учир нь checkout амжилттай болмогц selectedTable цэвэрлэгдэнэ.
    const billSnapshot = selectedTable;

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table_number: tableNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("CHECKOUT ERROR:", result);
        alert(result.error || "Тооцоо хаах үед алдаа гарлаа.");
        return;
      }

      console.log("CHECKOUT SUCCESS:", result);

      const checkedOutOrderIds = result.orders.map(
        (order: { id: number }) => order.id
      );

      setOrders((currentOrders) =>
        currentOrders.filter(
          (order) => !checkedOutOrderIds.includes(order.id)
        )
      );

      setSelectedTable(null);

      // =========================
      // AUTO-PRINT: ТООЦОО ХААХ ҮЕД БАРИМТ АВТОМАТААР ХЭВЛЭХ
      // =========================
      if (billSnapshot) {
        setPrintBillGroup(billSnapshot);
      }
    } catch (error) {
      console.error("CHECKOUT ERROR:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Тооцоо хаах үед серверийн алдаа гарлаа."
      );
    }
  }

  // =========================
  // REALTIME
  // =========================

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("NEW ORDER:", payload.new);
          loadNewOrder(Number(payload.new.id), true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("ORDER UPDATED:", payload.new);
          const orderId = Number(payload.new.id);

          if (payload.new.status === "done") {
            setOrders((currentOrders) =>
              currentOrders.filter((order) => order.id !== orderId)
            );
            return;
          }

          loadNewOrder(orderId);
        }
      )
      .subscribe((status) => {
        console.log("ORDER REALTIME STATUS:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // =========================
  // AUTO-PRINT QUEUE PROCESSOR
  // =========================
  // Шинэ захиалга ирэх бүрд дараалан (нэг нэгээр) тасалбар хэвлэнэ.

  useEffect(() => {
    if (
      !currentPrintOrder &&
      printQueue.length > 0 &&
      !isPrintingRef.current
    ) {
      isPrintingRef.current = true;
      setCurrentPrintOrder(printQueue[0]);
    }
  }, [printQueue, currentPrintOrder]);

  useEffect(() => {
    if (!currentPrintOrder) {
      return;
    }

    const timer = setTimeout(() => {
      window.print();

      setPrintQueue((queue) => queue.slice(1));
      setCurrentPrintOrder(null);
      isPrintingRef.current = false;
    }, 300);

    return () => clearTimeout(timer);
  }, [currentPrintOrder]);

  // =========================
  // AUTO-PRINT: TABLE BILL (хаахгүйгээр зөвхөн хэвлэх)
  // =========================

  useEffect(() => {
    if (!printBillGroup) {
      return;
    }

    const timer = setTimeout(() => {
      window.print();
      setPrintBillGroup(null);
    }, 300);

    return () => clearTimeout(timer);
  }, [printBillGroup]);

  // =========================
  // GROUP ORDERS BY TABLE (Sorted by tableNumber: 1, 2, 3...)
  // =========================

  const groupedOrders = useMemo<TableOrderGroup[]>(() => {
    const groups = new Map<number, TableOrderGroup>();

    for (const order of orders) {
      if (!groups.has(order.tableNumber)) {
        groups.set(order.tableNumber, {
          tableNumber: order.tableNumber,
          orders: [],
          items: [],
          total: 0,
          latestOrderTime: order.created_at,
        });
      }

      const group = groups.get(order.tableNumber)!;

      group.orders.push(order);
      group.total += Number(order.total);

      if (
        new Date(order.created_at).getTime() >
        new Date(group.latestOrderTime).getTime()
      ) {
        group.latestOrderTime = order.created_at;
      }

      for (const item of order.items) {
        const existingItem = group.items.find(
          (groupItem) =>
            groupItem.product_id === item.product_id &&
            groupItem.product_name_snapshot === item.product_name_snapshot
        );

        if (existingItem) {
          existingItem.quantity += Number(item.quantity);
          existingItem.subtotal += Number(item.subtotal);
        } else {
          group.items.push({
            product_id: item.product_id,
            product_name_snapshot: item.product_name_snapshot,
            unit_price_snapshot: Number(item.unit_price_snapshot),
            quantity: Number(item.quantity),
            subtotal: Number(item.subtotal),
          });
        }
      }
    }

    return Array.from(groups.values()).sort(
      (a, b) => a.tableNumber - b.tableNumber
    );
  }, [orders]);

  // =========================
  // FORMATTERS
  // =========================

  function formatPrice(price: number) {
    return Number(price).toLocaleString("mn-MN");
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("mn-MN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6">
        <p className="text-sm text-zinc-400">
          Захиалгууд ачааллаж байна...
        </p>
      </section>
    );
  }

  // =========================
  // UI
  // =========================

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6">
      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Захиалгууд
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Ширээг сонгоод тухайн ширээний бүх захиалгыг харна
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          REALTIME
        </div>
      </div>

      {/* EMPTY */}
      {groupedOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
          <div className="text-4xl">🍸</div>
          <p className="mt-3 text-sm text-zinc-400">
            Одоогоор захиалга алга байна.
          </p>
        </div>
      ) : (
        /* TABLE GRID */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groupedOrders.map((group) => (
            <button
              key={group.tableNumber}
              type="button"
              onClick={() => setSelectedTable(group)}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-left transition hover:-translate-y-1 hover:border-amber-400/40 hover:bg-zinc-900 hover:shadow-xl hover:shadow-amber-400/5"
            >
              {/* TABLE HEADER */}
              <div className="border-b border-white/10 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      🪑 Ширээ №{group.tableNumber}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      {group.orders.length} захиалга
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Сүүлд: {formatDate(group.latestOrderTime)}
                    </p>
                  </div>

                  <div className="rounded-full bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-400">
                    ХАРАХ
                  </div>
                </div>
              </div>

              {/* SUMMARY ITEMS */}
              <div className="p-5">
                <div className="space-y-2">
                  {group.items.slice(0, 4).map((item, index) => (
                    <div
                      key={`${item.product_id}-${item.product_name_snapshot}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5"
                    >
                      <span className="min-w-0 truncate text-sm text-zinc-300">
                        {item.product_name_snapshot}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-zinc-500">
                        ×{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {group.items.length > 4 && (
                  <p className="mt-3 text-xs text-zinc-500">
                    +{group.items.length - 4} төрлийн бүтээгдэхүүн
                  </p>
                )}

                {/* TOTAL */}
                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-sm text-zinc-400">Нийт</span>
                  <span className="text-xl font-bold text-amber-400">
                    {formatPrice(group.total)}₮
                  </span>
                </div>

                <div className="mt-4 text-center text-xs font-medium text-zinc-500 transition group-hover:text-amber-400">
                  Дэлгэрэнгүй харах →
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* =========================
          SELECTED TABLE MODAL
      ========================= */}
      {selectedTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTable(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  🪑 Ширээ №{selectedTable.tableNumber}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {selectedTable.orders.length} захиалга
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Сүүлд: {formatDate(selectedTable.latestOrderTime)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-xl text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            {/* ORDERS */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              {selectedTable.orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-5">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-white">
                          Захиалга #{order.id}
                        </h3>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        🕐 {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Нийт</p>
                      <p className="mt-1 text-xl font-bold text-amber-400">
                        {formatPrice(Number(order.total))}₮
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 p-5">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {item.product_name_snapshot}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {formatPrice(Number(item.unit_price_snapshot))}₮ ×{" "}
                            {item.quantity}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-bold text-white">
                          {formatPrice(Number(item.subtotal))}₮
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* TABLE TOTAL */}
            <div className="border-t border-white/10 bg-zinc-950 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Ширээний нийт</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedTable.orders.length} захиалгын нийлбэр
                  </p>
                </div>
                <p className="text-3xl font-bold text-amber-400">
                  {formatPrice(selectedTable.total)}₮
                </p>
              </div>
            </div>

            {/* CHECKOUT + PRINT BUTTONS */}
            <div className="border-t border-white/10 bg-zinc-950 p-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPrintBillGroup(selectedTable)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-base font-bold text-white transition hover:bg-white/10"
                >
                  🖨 Хэвлэх
                </button>

                <button
                  type="button"
                  onClick={() => setShowCheckoutConfirm(true)}
                  className="w-full rounded-xl bg-emerald-500 px-5 py-4 text-base font-bold text-white transition hover:bg-emerald-400"
                >
                  💰 Тооцоо хаах
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-zinc-500">
                "Хэвлэх" нь ширээг хаахгүй, зөвхөн тооцоог хэвлэнэ. "Тооцоо
                хаах" нь энэ ширээний захиалгыг хаана.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          CHECKOUT CONFIRMATION MODAL
      ================================================== */}
      {showCheckoutConfirm && selectedTable && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowCheckoutConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/10 text-2xl">
              💰
            </div>

            <div className="mt-4 text-center">
              <h3 className="text-xl font-bold text-white">
                Тооцоо хаахдаа итгэлтэй байна уу?
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Ширээ №{selectedTable.tableNumber}-ийн бүх идэвхтэй захиалга
                хаагдана.
              </p>
              <p className="mt-3 text-lg font-bold text-amber-400">
                {formatPrice(selectedTable.total)}₮
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowCheckoutConfirm(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
              >
                Болих
              </button>

              <button
                type="button"
                onClick={async () => {
                  await checkoutTable(selectedTable.tableNumber);
                  setShowCheckoutConfirm(false);
                }}
                className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-400"
              >
                Тийм, тооцоо хаах
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          AUTO-PRINT: NEW ORDER TICKET (80mm, зөвхөн хэвлэхэд харагдана)
      ================================================== */}
      {currentPrintOrder && (
        <div id="order-ticket-receipt" className="hidden">
          <div className="text-center">
            <h3 className="text-lg font-bold tracking-wide">CLIQUE</h3>
            <p className="mt-1 text-sm font-semibold">ШИНЭ ЗАХИАЛГА</p>
            <p className="mt-2 text-xs">
              {formatDate(currentPrintOrder.created_at)}
            </p>
          </div>

          <div className="my-3 border-t border-black" />

          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-3">
              <span>Ширээ</span>
              <span className="font-bold">
                №{currentPrintOrder.tableNumber}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Захиалга</span>
              <span>#{currentPrintOrder.id}</span>
            </div>
          </div>

          <div className="my-3 border-t border-black" />

          <div className="grid grid-cols-[1fr_35px_75px] gap-2 text-[11px] font-bold">
            <span>Бүтээгдэхүүн</span>
            <span className="text-center">Тоо</span>
            <span className="text-right">Дүн</span>
          </div>

          <div className="my-2 border-t border-dotted border-black" />

          <div className="space-y-2">
            {currentPrintOrder.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_35px_75px] gap-2 text-[11px]"
              >
                <span className="break-words">
                  {item.product_name_snapshot}
                </span>
                <span className="text-center">{item.quantity}</span>
                <span className="text-right">
                  {formatPrice(Number(item.subtotal))}₮
                </span>
              </div>
            ))}
          </div>

          <div className="my-3 border-t border-black" />

          <div className="flex justify-between text-sm font-bold">
            <span>НИЙТ</span>
            <span>{formatPrice(Number(currentPrintOrder.total))}₮</span>
          </div>

          <div className="my-3 border-t border-black" />

          <p className="text-center text-[9px]">
            Автоматаар хэвлэгдсэн тасалбар
          </p>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html,
          body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          #order-ticket-receipt,
          #order-ticket-receipt * {
            visibility: visible !important;
          }

          #order-ticket-receipt {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;

            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;

            margin: 0 !important;
            padding: 4mm !important;

            background: white !important;
            color: black !important;

            font-family: Arial, Helvetica, sans-serif !important;
          }

          button {
            display: none !important;
          }
        }
      `}</style>

      {/* ==================================================
          AUTO-PRINT: TABLE BILL (ширээг хаалгүйгээр зөвхөн хэвлэх)
      ================================================== */}
      {printBillGroup && (
        <div id="table-bill-receipt" className="hidden">
          <div className="text-center">
            <h3 className="text-lg font-bold tracking-wide">CLIQUE</h3>
            <p className="mt-1 text-sm font-semibold">ТООЦООНЫ БАРИМТ</p>
            <p className="mt-2 text-xs">
              {formatDate(printBillGroup.latestOrderTime)}
            </p>
          </div>

          <div className="my-3 border-t border-black" />

          <div className="text-xs">
            <div className="flex justify-between gap-3">
              <span>Ширээ</span>
              <span className="font-bold">
                №{printBillGroup.tableNumber}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Захиалгын тоо</span>
              <span>{printBillGroup.orders.length}</span>
            </div>
          </div>

          <div className="my-3 border-t border-black" />

          <div className="grid grid-cols-[1fr_35px_75px] gap-2 text-[11px] font-bold">
            <span>Бүтээгдэхүүн</span>
            <span className="text-center">Тоо</span>
            <span className="text-right">Дүн</span>
          </div>

          <div className="my-2 border-t border-dotted border-black" />

          <div className="space-y-2">
            {printBillGroup.items.map((item, index) => (
              <div
                key={`${item.product_id}-${index}`}
                className="grid grid-cols-[1fr_35px_75px] gap-2 text-[11px]"
              >
                <span className="break-words">
                  {item.product_name_snapshot}
                </span>
                <span className="text-center">{item.quantity}</span>
                <span className="text-right">
                  {formatPrice(item.subtotal)}₮
                </span>
              </div>
            ))}
          </div>

          <div className="my-3 border-t border-black" />

          <div className="flex justify-between text-sm font-bold">
            <span>НИЙТ ТӨЛӨХ</span>
            <span>{formatPrice(printBillGroup.total)}₮</span>
          </div>

          <div className="my-3 border-t border-black" />

          <p className="text-center text-[9px]">Баярлалаа!</p>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html,
          body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          #table-bill-receipt,
          #table-bill-receipt * {
            visibility: visible !important;
          }

          #table-bill-receipt {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;

            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;

            margin: 0 !important;
            padding: 4mm !important;

            background: white !important;
            color: black !important;

            font-family: Arial, Helvetica, sans-serif !important;
          }

          button {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}