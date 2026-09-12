"use client";

import { useEffect, useState } from "react";

type ProductSummary = {
  name: string;
  quantity: number;
  total: number;
};

type ShiftHistoryItem = {
  id: number;
  opened_at: string;
  closed_at: string | null;
  opened_by: string | null;
  is_open: boolean;
  created_at: string;
  orderCount: number;
  total: number;
  products?: ProductSummary[];
};

export default function ShiftHistory() {
  const [shifts, setShifts] = useState<ShiftHistoryItem[]>([]);
  const [currentShift, setCurrentShift] =
    useState<ShiftHistoryItem | null>(null);
  const [selectedShift, setSelectedShift] =
    useState<ShiftHistoryItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==================================================
  // LOAD CURRENT (OPEN) SHIFT — /api/shifts
  // ==================================================

  async function loadCurrentShift() {
    try {
      const response = await fetch("/api/shifts", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.shift) {
        setCurrentShift(null);
        return null;
      }

      const active: ShiftHistoryItem = {
        ...data.shift,
        orderCount: data.summary?.orderCount ?? 0,
        total: data.summary?.total ?? 0,
        products: data.products ?? [],
      };

      setCurrentShift(active);
      return active;
    } catch (error) {
      console.error(
        "CURRENT SHIFT LOAD ERROR:",
        error
      );
      setCurrentShift(null);
      return null;
    }
  }

  // ==================================================
  // LOAD HISTORY (CLOSED SHIFTS) — /api/shifts/history
  // ==================================================

  async function loadHistory() {
    try {
      setLoading(true);
      setError("");

      const [response, active] = await Promise.all([
        fetch("/api/shifts/history", {
          cache: "no-store",
        }),
        loadCurrentShift(),
      ]);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Ээлжийн түүх авахад алдаа гарлаа."
        );
      }

      const history = Array.isArray(data.shifts)
        ? data.shifts
        : [];

      setShifts(history);

      if (selectedShift) {
        const combined = active
          ? [active, ...history]
          : history;

        const updated = combined.find(
          (shift: ShiftHistoryItem) =>
            shift.id === selectedShift.id
        );

        if (updated) {
          setSelectedShift(updated);
        } else {
          setSelectedShift(null);
        }
      }
    } catch (error) {
      console.error(
        "SHIFT HISTORY LOAD ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Ээлжийн түүх авахад алдаа гарлаа."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  // ==================================================
  // FORMAT DATE
  // ==================================================

  function formatDate(date: string | null) {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleString("mn-MN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ==================================================
  // RECEIPT DATE
  // ==================================================

  function formatReceiptDate(date: string) {
    const d = new Date(date);

    const year = d.getFullYear();

    const month = String(
      d.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      d.getDate()
    ).padStart(2, "0");

    return `${year}.${month}.${day}`;
  }

  // ==================================================
  // MONEY
  // ==================================================

  function formatMoney(amount: number) {
    return new Intl.NumberFormat("mn-MN").format(
      Number(amount) || 0
    );
  }

  // ==================================================
  // PRINT
  // ==================================================

  function printReceipt() {
    window.print();
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6">
        <p className="text-sm text-zinc-400">
          Ээлжийн түүх ачааллаж байна...
        </p>
      </section>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6">
        {/* =========================
            HEADER
        ========================= */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Ээлжийн түүх
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Сүүлийн 7 хоногийн хаасан ээлжүүд
            </p>
          </div>

          <button
            type="button"
            onClick={loadHistory}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ↻ Шинэчлэх
          </button>
        </div>

        {/* =========================
            ERROR
        ========================= */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* =========================
            CURRENT SHIFT
        ========================= */}

        {currentShift && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Одоогийн ээлж
            </p>

            <button
              type="button"
              onClick={() =>
                setSelectedShift(currentShift)
              }
              className="group w-full rounded-2xl border border-emerald-500/30 bg-zinc-800 p-5 text-left transition hover:border-emerald-500/50 hover:bg-zinc-750 hover:shadow-xl md:max-w-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">
                    ЭЭЛЖ
                  </p>

                  <h3 className="mt-1 text-xl font-bold text-white">
                    #{currentShift.id}
                  </h3>
                </div>

                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
                  Идэвхтэй
                </span>
              </div>

              <div className="mt-5">
                <p className="text-xs text-zinc-500">
                  Огноо
                </p>

                <p className="mt-1 text-sm text-zinc-200">
                  {formatReceiptDate(
                    currentShift.opened_at
                  )}
                </p>
              </div>

              <div className="mt-3">
                <p className="text-xs text-zinc-500">
                  Ээлж эхэлсэн
                </p>

                <p className="mt-1 text-xs text-zinc-300">
                  {formatDate(
                    currentShift.opened_at
                  )}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-zinc-900 p-3">
                  <p className="text-[11px] text-zinc-500">
                    Захиалга
                  </p>

                  <p className="mt-1 text-lg font-bold text-white">
                    {currentShift.orderCount}
                  </p>
                </div>

                <div className="rounded-xl bg-zinc-900 p-3">
                  <p className="text-[11px] text-zinc-500">
                    Борлуулалт
                  </p>

                  <p className="mt-1 text-sm font-bold text-emerald-400">
                    {formatMoney(
                      currentShift.total
                    )}{" "}
                    ₮
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-center text-sm font-medium text-zinc-400 transition group-hover:text-white">
                  Баримт харах →
                </p>
              </div>
            </button>
          </div>
        )}

        {/* =========================
            EMPTY
        ========================= */}

        {shifts.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
            <p className="text-zinc-400">
              Сүүлийн 7 хоногт хаасан ээлж байхгүй
              байна.
            </p>
          </div>
        )}

        {/* =========================
            SHIFT LIST
        ========================= */}

        {shifts.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shifts.map((shift) => (
              <button
                key={shift.id}
                type="button"
                onClick={() =>
                  setSelectedShift(shift)
                }
                className="group rounded-2xl border border-white/10 bg-zinc-800 p-5 text-left transition hover:border-white/20 hover:bg-zinc-750 hover:shadow-xl"
              >
                {/* SHIFT NUMBER */}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">
                      ЭЭЛЖ
                    </p>

                    <h3 className="mt-1 text-xl font-bold text-white">
                      #{shift.id}
                    </h3>
                  </div>

                  <span className="rounded-full bg-zinc-700 px-3 py-1 text-xs text-zinc-300">
                    Хаагдсан
                  </span>
                </div>

                {/* DATE */}

                <div className="mt-5">
                  <p className="text-xs text-zinc-500">
                    Огноо
                  </p>

                  <p className="mt-1 text-sm text-zinc-200">
                    {formatReceiptDate(
                      shift.opened_at
                    )}
                  </p>
                </div>

                {/* TIME */}

                <div className="mt-3">
                  <p className="text-xs text-zinc-500">
                    Ээлжийн хугацаа
                  </p>

                  <p className="mt-1 text-xs text-zinc-300">
                    {formatDate(
                      shift.opened_at
                    )}
                  </p>

                  <p className="text-xs text-zinc-500">
                    →
                  </p>

                  <p className="text-xs text-zinc-300">
                    {formatDate(
                      shift.closed_at
                    )}
                  </p>
                </div>

                {/* SUMMARY */}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-zinc-900 p-3">
                    <p className="text-[11px] text-zinc-500">
                      Захиалга
                    </p>

                    <p className="mt-1 text-lg font-bold text-white">
                      {shift.orderCount}
                    </p>
                  </div>

                  <div className="rounded-xl bg-zinc-900 p-3">
                    <p className="text-[11px] text-zinc-500">
                      Борлуулалт
                    </p>

                    <p className="mt-1 text-sm font-bold text-emerald-400">
                      {formatMoney(
                        shift.total
                      )}{" "}
                      ₮
                    </p>
                  </div>
                </div>

                {/* BUTTON */}

                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-center text-sm font-medium text-zinc-400 transition group-hover:text-white">
                    Баримт харах →
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ==================================================
          RECEIPT MODAL
      ================================================== */}

      {selectedShift && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() =>
            setSelectedShift(null)
          }
        >
          <div
            className="flex max-h-[95vh] w-full max-w-[430px] flex-col"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* =========================
                ACTION BUTTONS
            ========================= */}

            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setSelectedShift(null)
                }
                className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                ✕ Хаах
              </button>

              <button
                type="button"
                onClick={printReceipt}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black shadow-lg hover:bg-zinc-200"
              >
                🖨 Хэвлэх
              </button>
            </div>

            {/* =========================
                88MM RECEIPT
            ========================= */}

            <div
              id="shift-receipt"
              className="receipt-print mx-auto w-full overflow-y-auto bg-white px-5 py-6 text-black shadow-2xl"
            >
              {/* HEADER */}

              <div className="text-center">
                <h3 className="text-xl font-bold tracking-wide">
                  CLIQUE
                </h3>

                <p className="mt-1 text-sm font-semibold">
                  {selectedShift.is_open
                    ? "ОДООГИЙН ЭЭЛЖИЙН ТАЙЛАН"
                    : "БОРЛУУЛАЛТЫН ТАЙЛАН"}
                </p>

                <p className="mt-2 text-xs">
                  {formatReceiptDate(
                    selectedShift.opened_at
                  )}
                </p>

                <p className="mt-1 text-xs">
                  Ээлж #{selectedShift.id}
                </p>
              </div>

              {/* LINE */}

              <div className="my-4 border-t border-black" />

              {/* SHIFT INFO */}

              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-3">
                  <span>
                    Ээлж эхэлсэн
                  </span>

                  <span className="text-right">
                    {formatDate(
                      selectedShift.opened_at
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span>
                    Ээлж хаасан
                  </span>

                  <span className="text-right">
                    {selectedShift.is_open
                      ? "Идэвхтэй байна"
                      : formatDate(
                          selectedShift.closed_at
                        )}
                  </span>
                </div>
              </div>

              {/* LINE */}

              <div className="my-4 border-t border-black" />

              {/* PRODUCT HEADER */}

              <div className="grid grid-cols-[1fr_35px_75px] gap-2 text-[11px] font-bold">
                <span>
                  Бүтээгдэхүүн
                </span>

                <span className="text-center">
                  Тоо
                </span>

                <span className="text-right">
                  Дүн
                </span>
              </div>

              <div className="my-2 border-t border-dotted border-black" />

              {/* PRODUCTS */}

              <div className="space-y-2">
                {(
                  selectedShift.products ??
                  []
                ).length === 0 ? (
                  <p className="py-4 text-center text-xs">
                    Бүтээгдэхүүний мэдээлэл алга
                  </p>
                ) : (
                  (
                    selectedShift.products ??
                    []
                  ).map(
                    (
                      product,
                      index
                    ) => (
                      <div
                        key={`${product.name}-${index}`}
                        className="grid grid-cols-[1fr_35px_75px] gap-2 text-[11px]"
                      >
                        <span className="break-words">
                          {product.name}
                        </span>

                        <span className="text-center">
                          {
                            product.quantity
                          }
                        </span>

                        <span className="text-right">
                          {formatMoney(
                            product.total
                          )}
                          ₮
                        </span>
                      </div>
                    )
                  )
                )}
              </div>

              {/* LINE */}

              <div className="my-4 border-t border-black" />

              {/* SUMMARY */}

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>
                    Нийт захиалга
                  </span>

                  <span className="font-semibold">
                    {
                      selectedShift.orderCount
                    }
                  </span>
                </div>

                <div className="flex justify-between text-base font-bold">
                  <span>
                    НИЙТ
                  </span>

                  <span>
                    {formatMoney(
                      selectedShift.total
                    )}
                    ₮
                  </span>
                </div>
              </div>

              {/* LINE */}

              <div className="my-4 border-t border-black" />

              {/* FOOTER */}

              <div className="text-center">
                <p className="text-[10px] font-medium">
                  {selectedShift.is_open
                    ? "ОДООГИЙН ЭЭЛЖИЙН ТАЙЛАН"
                    : "БОРЛУУЛАЛТЫН ТАЙЛАН"}
                </p>

                <p className="mt-1 text-[9px] text-zinc-500">
                  {selectedShift.is_open
                    ? "Идэвхтэй ээлжийн явцын тайлан"
                    : "Ээлжийн хаалтын тайлан"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          PRINT CSS
      ================================================== */}

      <style jsx global>{`
        @media print {
          @page {
            size: 88mm auto;
            margin: 0;
          }

          html,
          body {
            width: 88mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          #shift-receipt,
          #shift-receipt * {
            visibility: visible !important;
          }

          #shift-receipt {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;

            width: 88mm !important;
            min-width: 88mm !important;
            max-width: 88mm !important;

            margin: 0 !important;
            padding: 5mm !important;

            overflow: visible !important;

            background: white !important;
            color: black !important;

            box-shadow: none !important;
          }

          .receipt-print {
            font-family:
              Arial,
              Helvetica,
              sans-serif !important;
          }

          button {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
