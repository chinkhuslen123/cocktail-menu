"use client";

import { useEffect, useRef, useState } from "react";

type Shift = {
  id: number;
  opened_at: string;
  closed_at: string | null;
  opened_by: string | null;
  is_open: boolean;
  created_at: string;
};

type Summary = {
  orderCount: number;
  total: number;
};

type ProductSummary = {
  name: string;
  quantity: number;
  total: number;
};

type ReceiptData = {
  shift: Shift;
  summary: Summary;
  products: ProductSummary[];
  auto?: boolean;
};

export default function ShiftManager() {
  const [shift, setShift] =
    useState<Shift | null>(null);

  const [summary, setSummary] =
    useState<Summary>({
      orderCount: 0,
      total: 0,
    });

  const [products, setProducts] =
    useState<ProductSummary[]>([]);

  const [receiptData, setReceiptData] =
    useState<ReceiptData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const autoPrintedRef = useRef(false);

  async function loadShift() {
    try {
      setError("");

      const response = await fetch(
        "/api/shifts",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Ээлжийн мэдээлэл авахад алдаа гарлаа."
        );
      }

      setShift(data.shift ?? null);

      setSummary(
        data.summary ?? {
          orderCount: 0,
          total: 0,
        }
      );

      setProducts(data.products ?? []);
    } catch (error) {
      console.error(
        "LOAD SHIFT ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Ээлжийн мэдээлэл авахад алдаа гарлаа."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShift();
  }, []);

  async function startShift() {
    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(
        "/api/shifts",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Ээлж эхлүүлэхэд алдаа гарлаа."
        );
      }

      setShift(data.shift);

      setSummary({
        orderCount: 0,
        total: 0,
      });

      setProducts([]);
    } catch (error) {
      console.error(
        "START SHIFT ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Ээлж эхлүүлэхэд алдаа гарлаа."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function closeShift() {
    const confirmed = window.confirm(
      "Энэ ээлжийг хаахдаа итгэлтэй байна уу?"
    );

    if (!confirmed) {
      return;
    }

    // хаахаас өмнөх нийт дүнгийн agnapshot-ийг авч үлдэнэ —
    // учир нь PATCH хариу нь summary/products буцаадаггүй
    const summarySnapshot = summary;
    const productsSnapshot = products;

    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(
        "/api/shifts",
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        let message =
          data.error ||
          "Ээлж хаахад алдаа гарлаа.";

        if (
          Array.isArray(data.tableNumbers) &&
          data.tableNumbers.length > 0
        ) {
          message += ` Ширээ: ${data.tableNumbers.join(
            ", "
          )}`;
        }

        throw new Error(message);
      }

      // =========================
      // AUTO-PRINT CLOSING SUMMARY
      // =========================

      autoPrintedRef.current = false;

      setReceiptData({
        shift: data.shift,
        summary: summarySnapshot,
        products: productsSnapshot,
        auto: true,
      });

      setShift(null);

      setSummary({
        orderCount: 0,
        total: 0,
      });

      setProducts([]);
    } catch (error) {
      console.error(
        "CLOSE SHIFT ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Ээлж хаахад алдаа гарлаа."
      );
    } finally {
      setActionLoading(false);
    }
  }

  // Хаагдсаны дараа гарч ирэх тайланг DOM-д зурагдмагц
  // нэг л удаа автоматаар, popup цонхон дээр хэвлэнэ
  // (үндсэн хуудсыг блоклохгүйн тулд)
  useEffect(() => {
    if (
      receiptData?.auto &&
      !autoPrintedRef.current
    ) {
      autoPrintedRef.current = true;
      printInPopup(buildReceiptHtml(receiptData));
    }
  }, [receiptData]);

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      "mn-MN",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

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

  function formatMoney(amount: number) {
    return new Intl.NumberFormat(
      "mn-MN"
    ).format(amount);
  }

  // =========================
  // PRINT VIA POPUP (үндсэн хуудсыг блоклохгүйн тулд)
  // =========================

  function printInPopup(bodyHtml: string) {
    const printWindow = window.open(
      "",
      "_blank",
      "width=380,height=600"
    );

    if (!printWindow) {
      console.error(
        "PRINT POPUP BLOCKED: browser popup blocker-т хориглогдсон байж магадгүй."
      );
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Ээлжийн тайлан</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              width: 80mm;
              margin: 0;
              padding: 4mm;
              color: #000;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 8px;
              font-size: 11px;
              margin: 2px 0;
            }
            .line { border-top: 1px solid #000; margin: 8px 0; }
            .dotted { border-top: 1px dotted #000; margin: 6px 0; }
            h1 { font-size: 16px; text-align: center; margin: 0; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            @page { size: 80mm auto; margin: 0; }
          </style>
        </head>
        <body>${bodyHtml}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onafterprint = () => {
      printWindow.close();
    };

    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  function buildReceiptHtml(data: ReceiptData) {
    const itemsHtml =
      data.products.length === 0
        ? `<p class="center" style="font-size:11px;">Бүтээгдэхүүний мэдээлэл алга</p>`
        : data.products
            .map(
              (product) => `
                <div class="row">
                  <span>${product.name}</span>
                  <span>${product.quantity}</span>
                  <span>${formatMoney(product.total)}₮</span>
                </div>
              `
            )
            .join("");

    const title = data.shift.is_open
      ? "ОДООГИЙН ЭЭЛЖИЙН ТАЙЛАН"
      : "БОРЛУУЛАЛТЫН ТАЙЛАН";

    const closedRow =
      data.shift.is_open || !data.shift.closed_at
        ? "Идэвхтэй байна"
        : formatDate(data.shift.closed_at);

    return `
      <h1>CLIQUE</h1>
      <p class="center bold">${title}</p>
      <p class="center" style="font-size:11px;">${formatReceiptDate(data.shift.opened_at)}</p>
      <p class="center" style="font-size:11px;">Ээлж #${data.shift.id}</p>
      <div class="line"></div>
      <div class="row"><span>Ээлж эхэлсэн</span><span>${formatDate(data.shift.opened_at)}</span></div>
      <div class="row"><span>Ээлж хаасан</span><span>${closedRow}</span></div>
      <div class="line"></div>
      <div class="row bold"><span>Бүтээгдэхүүн</span><span>Тоо</span><span>Дүн</span></div>
      <div class="dotted"></div>
      ${itemsHtml}
      <div class="line"></div>
      <div class="row"><span>Нийт захиалга</span><span class="bold">${data.summary.orderCount}</span></div>
      <div class="row bold" style="font-size:14px;"><span>НИЙТ</span><span>${formatMoney(data.summary.total)}₮</span></div>
      <div class="line"></div>
      <p class="center" style="font-size:9px;">${
        data.shift.is_open
          ? "Идэвхтэй ээлжийн явцын тайлан"
          : "Ээлжийн хаалтын тайлан"
      }</p>
    `;
  }

  function printReceipt() {
    if (!receiptData) {
      return;
    }
    printInPopup(buildReceiptHtml(receiptData));
  }

  if (loading) {
    return (
      <section className="mb-8 rounded-2xl border border-white/10 bg-zinc-900 p-6">
        <p className="text-sm text-zinc-400">
          Ээлжийн мэдээлэл ачааллаж байна...
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="mb-8 rounded-2xl border border-white/10 bg-zinc-900 p-6">
        {/* HEADER */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">
                Ээлжийн удирдлага
              </h2>

              {shift ? (
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                  ● Нээлттэй
                </span>
              ) : (
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400">
                  ● Хаалттай
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-zinc-400">
              Өдрийн захиалга болон борлуулалтын ээлж
            </p>
          </div>

          {/* ACTIONS */}

          <div className="flex items-center gap-3">
            {shift && (
              <button
                type="button"
                onClick={() =>
                  setReceiptData({
                    shift,
                    summary,
                    products,
                  })
                }
                className="rounded-xl border border-white/10 bg-zinc-800 px-5 py-3 font-semibold text-white transition hover:bg-zinc-700"
              >
                🧾 Баримт харах
              </button>
            )}

            {shift ? (
              <button
                type="button"
                onClick={closeShift}
                disabled={actionLoading}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Хааж байна..."
                  : "🌙 Ээлж хаах"}
              </button>
            ) : (
              <button
                type="button"
                onClick={startShift}
                disabled={actionLoading}
                className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Эхлүүлж байна..."
                  : "☀️ Ээлж эхлүүлэх"}
              </button>
            )}
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* OPEN SHIFT */}

        {shift && (
          <button
            type="button"
            onClick={() =>
              setReceiptData({
                shift,
                summary,
                products,
              })
            }
            className="mt-6 grid w-full gap-4 text-left md:grid-cols-3"
          >
            {/* START TIME */}

            <div className="rounded-xl border border-white/10 bg-zinc-800 p-5 transition hover:border-white/20">
              <p className="text-sm text-zinc-400">
                Ээлж эхэлсэн
              </p>

              <p className="mt-2 text-lg font-semibold text-white">
                {formatDate(shift.opened_at)}
              </p>
            </div>

            {/* ORDERS */}

            <div className="rounded-xl border border-white/10 bg-zinc-800 p-5 transition hover:border-white/20">
              <p className="text-sm text-zinc-400">
                Нийт захиалга
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                {summary.orderCount}
              </p>
            </div>

            {/* TOTAL */}

            <div className="rounded-xl border border-white/10 bg-zinc-800 p-5 transition hover:border-white/20">
              <p className="text-sm text-zinc-400">
                Нийт борлуулалт
              </p>

              <p className="mt-2 text-2xl font-bold text-emerald-400">
                {formatMoney(summary.total)} ₮
              </p>
            </div>
          </button>
        )}

        {/* CLOSED MESSAGE */}

        {!shift && !error && (
          <div className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center">
            <p className="text-zinc-400">
              Одоогоор нээлттэй ээлж байхгүй байна.
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Захиалга авахын өмнө ээлжээ эхлүүлнэ үү.
            </p>
          </div>
        )}
      </section>

      {/* ==================================================
          RECEIPT MODAL
      ================================================== */}

      {receiptData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setReceiptData(null)}
        >
          <div
            className="flex max-h-[95vh] w-full max-w-[430px] flex-col"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* ACTION BUTTONS */}

            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setReceiptData(null)}
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

            {/* 88MM RECEIPT */}

            <div
              id="current-shift-receipt"
              className="current-shift-receipt-print mx-auto w-full overflow-y-auto bg-white px-5 py-6 text-black shadow-2xl"
            >
              {/* HEADER */}

              <div className="text-center">
                <h3 className="text-xl font-bold tracking-wide">
                  CLIQUE
                </h3>

                <p className="mt-1 text-sm font-semibold">
                  {receiptData.shift.is_open
                    ? "ОДООГИЙН ЭЭЛЖИЙН ТАЙЛАН"
                    : "БОРЛУУЛАЛТЫН ТАЙЛАН"}
                </p>

                <p className="mt-2 text-xs">
                  {formatReceiptDate(
                    receiptData.shift.opened_at
                  )}
                </p>

                <p className="mt-1 text-xs">
                  Ээлж #{receiptData.shift.id}
                </p>
              </div>

              <div className="my-4 border-t border-black" />

              {/* SHIFT INFO */}

              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-3">
                  <span>Ээлж эхэлсэн</span>

                  <span className="text-right">
                    {formatDate(
                      receiptData.shift.opened_at
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span>Ээлж хаасан</span>

                  <span className="text-right">
                    {receiptData.shift.is_open ||
                    !receiptData.shift.closed_at
                      ? "Идэвхтэй байна"
                      : formatDate(
                          receiptData.shift.closed_at
                        )}
                  </span>
                </div>
              </div>

              <div className="my-4 border-t border-black" />

              {/* PRODUCT HEADER */}

              <div className="grid grid-cols-[1fr_35px_75px] gap-2 text-[11px] font-bold">
                <span>Бүтээгдэхүүн</span>
                <span className="text-center">Тоо</span>
                <span className="text-right">Дүн</span>
              </div>

              <div className="my-2 border-t border-dotted border-black" />

              {/* PRODUCTS */}

              <div className="space-y-2">
                {receiptData.products.length === 0 ? (
                  <p className="py-4 text-center text-xs">
                    Бүтээгдэхүүний мэдээлэл алга
                  </p>
                ) : (
                  receiptData.products.map(
                    (product, index) => (
                      <div
                        key={`${product.name}-${index}`}
                        className="grid grid-cols-[1fr_35px_75px] gap-2 text-[11px]"
                      >
                        <span className="break-words">
                          {product.name}
                        </span>

                        <span className="text-center">
                          {product.quantity}
                        </span>

                        <span className="text-right">
                          {formatMoney(
                            product.total
                          )}₮
                        </span>
                      </div>
                    )
                  )
                )}
              </div>

              <div className="my-4 border-t border-black" />

              {/* SUMMARY */}

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Нийт захиалга</span>

                  <span className="font-semibold">
                    {receiptData.summary.orderCount}
                  </span>
                </div>

                <div className="flex justify-between text-base font-bold">
                  <span>НИЙТ</span>

                  <span>
                    {formatMoney(
                      receiptData.summary.total
                    )}₮
                  </span>
                </div>
              </div>

              <div className="my-4 border-t border-black" />

              {/* FOOTER */}

              <div className="text-center">
                <p className="text-[10px] font-medium">
                  {receiptData.shift.is_open
                    ? "ОДООГИЙН ЭЭЛЖИЙН ТАЙЛАН"
                    : "БОРЛУУЛАЛТЫН ТАЙЛАН"}
                </p>

                <p className="mt-1 text-[9px] text-zinc-500">
                  {receiptData.shift.is_open
                    ? "Идэвхтэй ээлжийн явцын тайлан"
                    : "Ээлжийн хаалтын тайлан — автоматаар хэвлэгдсэн"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
