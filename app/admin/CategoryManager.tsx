"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function CategoryManager() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Ангиллын нэр оруулна уу.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          sort_order: Number(sortOrder),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Ангилал нэмэхэд алдаа гарлаа.");
        return;
      }

      setName("");
      setSortOrder("0");

      router.refresh();
    } catch (error) {
      console.error("CATEGORY CREATE ERROR:", error);
      setError("Сервертэй холбогдоход алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-white/10 bg-zinc-800 p-4"
    >
      <div className="grid gap-4 md:grid-cols-[1fr_160px_auto] md:items-end">
        {/* CATEGORY NAME */}
        <div>
          <label
            htmlFor="category-name"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Ангиллын нэр
          </label>

          <input
            id="category-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Cocktail"
            required
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-white/30 disabled:opacity-50"
          />
        </div>

        {/* SORT ORDER */}
        <div>
          <label
            htmlFor="sort-order"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Sort order
          </label>

          <input
            id="sort-order"
            type="number"
            min="0"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white/30 disabled:opacity-50"
          />
        </div>

        {/* BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white px-5 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Нэмж байна..." : "+ Ангилал нэмэх"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </form>
  );
}