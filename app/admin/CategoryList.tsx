"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
};

type CategoryListProps = {
  categories: Category[];
};

export default function CategoryList({
  categories,
}: CategoryListProps) {
  const router = useRouter();

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [editName, setEditName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("0");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(category: Category) {
    setError("");

    setEditingId(category.id);
    setEditName(category.name);
    setEditSortOrder(String(category.sort_order));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditSortOrder("0");
    setError("");
  }

  async function handleUpdate(id: number) {
    const name = editName.trim();

    if (!name) {
      setError("Ангиллын нэр оруулна уу.");
      return;
    }

    const sortOrder = Number(editSortOrder);

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setError("Sort order нь 0 буюу түүнээс дээш бүхэл тоо байна.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          sort_order: sortOrder,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || "Ангилал засахад алдаа гарлаа."
        );
        return;
      }

      cancelEdit();
      router.refresh();
    } catch (error) {
      console.error("CATEGORY UPDATE ERROR:", error);
      setError("Сервертэй холбогдоход алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    const confirmed = window.confirm(
      `"${name}" ангиллыг устгах уу?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeletingId(id);

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || "Ангилал устгахад алдаа гарлаа."
        );
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("CATEGORY DELETE ERROR:", error);
      setError("Сервертэй холбогдоход алдаа гарлаа.");
    } finally {
      setDeletingId(null);
    }
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
        <p className="text-zinc-400">
          Одоогоор ангилал алга байна.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {categories.map((category) => {
          const isDeleting = deletingId === category.id;
          const isEditing = editingId === category.id;

          return (
            <div
              key={category.id}
              className="rounded-xl border border-white/10 bg-zinc-800 p-4"
            >
              {isEditing ? (
                <div className="grid gap-4 md:grid-cols-[1fr_160px_auto_auto] md:items-end">
                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">
                      Ангиллын нэр
                    </label>

                    <input
                      type="text"
                      value={editName}
                      onChange={(event) =>
                        setEditName(event.target.value)
                      }
                      disabled={saving}
                      className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">
                      Sort order
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={editSortOrder}
                      onChange={(event) =>
                        setEditSortOrder(event.target.value)
                      }
                      disabled={saving}
                      className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white/30"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdate(category.id)}
                    disabled={saving}
                    className="rounded-xl bg-white px-5 py-3 font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {saving ? "Хадгалж байна..." : "Хадгалах"}
                  </button>

                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="rounded-xl border border-white/10 px-5 py-3 font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                  >
                    Болих
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-white">
                      {category.name}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Sort order: {category.sort_order}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-zinc-700 px-3 py-1 text-xs text-zinc-300">
                      ID: {category.id}
                    </span>

                    <button
                      type="button"
                      onClick={() => startEdit(category)}
                      className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-500/20"
                    >
                      Засах
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          category.id,
                          category.name
                        )
                      }
                      disabled={isDeleting}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDeleting
                        ? "Устгаж байна..."
                        : "Устгах"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}