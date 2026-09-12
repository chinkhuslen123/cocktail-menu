"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

type Table = {
  id: number;
  number: number;
  created_at: string;
};

type TableManagerProps = {
  tables: Table[];
};

export default function TableManager({
  tables,
}: TableManagerProps) {
  const router = useRouter();

  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(
    null
  );
  const [error, setError] = useState("");

  const [qrTable, setQrTable] = useState<Table | null>(null);

  const canvasRefs = useRef<
    Record<number, HTMLCanvasElement | null>
  >({});

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "";

  function tableUrl(tableNumber: number) {
    return `${origin}/table/${tableNumber}`;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const tableNumber = Number(number);

    if (
      !Number.isInteger(tableNumber) ||
      tableNumber <= 0
    ) {
      setError("Ширээний зөв дугаар оруулна уу.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: tableNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || "Ширээ нэмэхэд алдаа гарлаа."
        );
        return;
      }

      setNumber("");
      router.refresh();

      // Шинэ ширээ нэмэгдмэгц QR-г нь шууд харуулна
      if (result.table) {
        setQrTable(result.table);
      }
    } catch (error) {
      console.error("TABLE CREATE ERROR:", error);

      setError("Сервертэй холбогдоход алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(
    id: number,
    tableNumber: number
  ) {
    const confirmed = window.confirm(
      `${tableNumber}-р ширээг устгах уу?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeletingId(id);

    try {
      const response = await fetch(
        `/api/tables/${id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Ширээ устгахад алдаа гарлаа."
        );
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("TABLE DELETE ERROR:", error);

      setError("Сервертэй холбогдоход алдаа гарлаа.");
    } finally {
      setDeletingId(null);
    }
  }

  function downloadQr(table: Table) {
    const canvas = canvasRefs.current[table.id];

    if (!canvas) {
      return;
    }

    const url = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");

    const link = document.createElement("a");
    link.href = url;
    link.download = `shiree-${table.number}-qr.png`;
    link.click();
  }

  function printQr(table: Table) {
    const canvas = canvasRefs.current[table.id];

    if (!canvas) {
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");

    const printWindow = window.open(
      "",
      "_blank",
      "width=400,height=500"
    );

    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Ширээ ${table.number} — QR</title>
          <style>
            body {
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
              height: 100vh;
              font-family: Arial, Helvetica, sans-serif;
            }
            h1 { font-size: 28px; margin-bottom: 4px; }
            p { color: #555; margin-top: 0; margin-bottom: 20px; }
            img { width: 260px; height: 260px; }
          </style>
        </head>
        <body>
          <h1>Ширээ №${table.number}</h1>
          <p>QR кодоо уншуулж менюгээ үзнэ үү</p>
          <img src="${dataUrl}" />
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ADD TABLE */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-white/10 bg-zinc-800 p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="number"
            min="1"
            value={number}
            onChange={(event) =>
              setNumber(event.target.value)
            }
            placeholder="Ширээний дугаар"
            disabled={loading}
            className="flex-1 rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-white/30 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-white px-6 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Нэмж байна..."
              : "+ Ширээ нэмэх"}
          </button>
        </div>
      </form>

      {/* TABLE LIST */}
      <div>
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white">
            Ширээнүүд
          </h3>

          <p className="mt-1 text-sm text-zinc-400">
            Нийт {tables.length} ширээ
          </p>
        </div>

        {tables.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
            <p className="text-zinc-400">
              Одоогоор ширээ алга байна.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {tables.map((table) => {
              const isDeleting =
                deletingId === table.id;

              return (
                <div
                  key={table.id}
                  className="rounded-xl border border-white/10 bg-zinc-800 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {table.number}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        Ширээ
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          table.id,
                          table.number
                        )
                      }
                      disabled={isDeleting}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDeleting
                        ? "Устгаж байна..."
                        : "Устгах"}
                    </button>
                  </div>

                  {/* QR PREVIEW */}
                  <button
                    type="button"
                    onClick={() => setQrTable(table)}
                    className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white p-3 transition hover:border-white/30"
                  >
                    <QRCodeCanvas
                      value={tableUrl(table.number)}
                      size={96}
                      level="M"
                      ref={(node: HTMLCanvasElement | null) => {
                        canvasRefs.current[table.id] = node;
                      }}
                    />
                  </button>

                  <p className="mt-2 text-center text-[11px] text-zinc-500">
                    Дарж томоор харах / хэвлэх
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================
          QR MODAL
      ================================================== */}

      {qrTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setQrTable(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm text-zinc-400">Ширээ</p>
            <h3 className="mt-1 text-3xl font-bold text-white">
              №{qrTable.number}
            </h3>

            <div className="mt-5 flex justify-center rounded-xl bg-white p-4">
              <QRCodeCanvas
                value={tableUrl(qrTable.number)}
                size={200}
                level="M"
                ref={(node: HTMLCanvasElement | null) => {
                  canvasRefs.current[qrTable.id] = node;
                }}
              />
            </div>

            <p className="mt-4 break-all text-xs text-zinc-500">
              {tableUrl(qrTable.number)}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => downloadQr(qrTable)}
                className="rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
              >
                ⬇ PNG татах
              </button>

              <button
                type="button"
                onClick={() => printQr(qrTable)}
                className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                🖨 Хэвлэх
              </button>
            </div>

            <button
              type="button"
              onClick={() => setQrTable(null)}
              className="mt-3 w-full rounded-xl px-4 py-2 text-sm text-zinc-500 transition hover:text-white"
            >
              Хаах
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
