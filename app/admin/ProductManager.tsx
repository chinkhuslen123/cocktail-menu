"use client";

import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  description: string | null;
  category_id: number;
  image_url: string | null;
  ingredients: string | null;
  price: number;
  is_available: boolean;
  sort_order: number;
};

type ProductManagerProps = {
  categories: Category[];
  products: Product[];
};

export default function ProductManager({
  categories,
  products,
}: ProductManagerProps) {
  const router = useRouter();

  // =========================
  // FORM STATE
  // =========================

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [price, setPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isAvailable, setIsAvailable] = useState(true);

  // =========================
  // UI STATE
  // =========================

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [imagePreview, setImagePreview] =
    useState("");

  // =========================
  // RESET FORM
  // =========================

  function resetForm() {
    setName("");
    setDescription("");
    setCategoryId("");
    setImageUrl("");
    setIngredients("");
    setPrice("");
    setSortOrder("0");
    setIsAvailable(true);

    setEditingId(null);
    setError("");
    setImagePreview("");
  }

  // =========================
  // START EDIT
  // =========================

  function startEdit(product: Product) {
    setEditingId(product.id);

    setName(product.name);
    setDescription(product.description ?? "");
    setCategoryId(String(product.category_id));
    setImageUrl(product.image_url ?? "");
    setIngredients(product.ingredients ?? "");
    setPrice(String(product.price));
    setSortOrder(String(product.sort_order));
    setIsAvailable(product.is_available);

    setImagePreview(product.image_url ?? "");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =========================
  // IMAGE UPLOAD
  // =========================

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    // File type check
    if (!file.type.startsWith("image/")) {
      setError("Зөвхөн зураг сонгоно уу.");
      return;
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Зургийн хэмжээ 5MB-аас бага байх ёстой."
      );
      return;
    }

    // Local preview
    const localPreview =
      URL.createObjectURL(file);

    setImagePreview(localPreview);
    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        "/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Зураг upload хийхэд алдаа гарлаа."
        );

        setImagePreview("");

        return;
      }

      setImageUrl(result.url);
      setImagePreview(result.url);
    } catch (error) {
      console.error(
        "IMAGE UPLOAD ERROR:",
        error
      );

      setError(
        "Зураг upload хийх үед серверийн алдаа гарлаа."
      );

      setImagePreview("");
    } finally {
      setUploading(false);
    }
  }

  // =========================
  // CREATE / UPDATE PRODUCT
  // =========================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    // Name
    if (!name.trim()) {
      setError(
        "Cocktail-ийн нэр оруулна уу."
      );

      return;
    }

    // Category
    if (!categoryId) {
      setError(
        "Ангилал сонгоно уу."
      );

      return;
    }

    // Price
    if (
      !price ||
      Number.isNaN(Number(price)) ||
      Number(price) < 0
    ) {
      setError(
        "Зөв үнэ оруулна уу."
      );

      return;
    }

    // Sort order
    if (
      Number.isNaN(Number(sortOrder)) ||
      Number(sortOrder) < 0
    ) {
      setError(
        "Зөв sort order оруулна уу."
      );

      return;
    }

    // Upload
    if (uploading) {
      setError(
        "Зураг upload дуусахыг хүлээнэ үү."
      );

      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),

        description:
          description.trim() || null,

        category_id: Number(categoryId),

        image_url:
          imageUrl || null,

        ingredients:
          ingredients.trim() || null,

        price: Number(price),

        sort_order: Number(sortOrder),

        is_available: isAvailable,
      };

      const url = editingId
        ? `/api/products/${editingId}`
        : "/api/products";

      const method = editingId
        ? "PUT"
        : "POST";

      const response = await fetch(
        url,
        {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload
          ),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Cocktail хадгалахад алдаа гарлаа."
        );

        return;
      }

      resetForm();

      router.refresh();
    } catch (error) {
      console.error(
        "PRODUCT SAVE ERROR:",
        error
      );

      setError(
        "Сервертэй холбогдоход алдаа гарлаа."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // DELETE PRODUCT
  // =========================

  async function handleDelete(
    id: number,
    productName: string
  ) {
    const confirmed =
      window.confirm(
        `"${productName}" cocktail-ийг устгах уу?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeletingId(id);

    try {
      const response = await fetch(
        `/api/products/${id}`,
        {
          method: "DELETE",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Cocktail устгахад алдаа гарлаа."
        );

        return;
      }

      // If deleting currently edited product
      if (editingId === id) {
        resetForm();
      }

      router.refresh();
    } catch (error) {
      console.error(
        "PRODUCT DELETE ERROR:",
        error
      );

      setError(
        "Сервертэй холбогдоход алдаа гарлаа."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // =========================
  // CATEGORY NAME
  // =========================

  function getCategoryName(
    categoryId: number
  ) {
    return (
      categories.find(
        (category) =>
          category.id === categoryId
      )?.name ||
      "Ангилалгүй"
    );
  }

  // =========================
  // RENDER
  // =========================

  return (
    <div className="space-y-8">

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ================================= */}
      {/* PRODUCT FORM */}
      {/* ================================= */}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-zinc-800 p-6"
      >

        {/* FORM HEADER */}

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white">
            {editingId
              ? "Cocktail засах"
              : "Шинэ cocktail нэмэх"}
          </h3>

          <p className="mt-1 text-sm text-zinc-400">
            Cocktail-ийн мэдээллийг оруулна уу.
          </p>
        </div>

        {/* FORM GRID */}

        <div className="grid gap-5 md:grid-cols-2">

          {/* NAME */}

          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Нэр *
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Mojito"
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/40 disabled:opacity-50"
            />
          </div>

          {/* CATEGORY */}

          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Ангилал *
            </label>

            <select
              value={categoryId}
              onChange={(event) =>
                setCategoryId(
                  event.target.value
                )
              }
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-amber-400/40 disabled:opacity-50"
            >
              <option value="">
                Ангилал сонгох
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* PRICE */}

          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Үнэ *
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(event) =>
                setPrice(
                  event.target.value
                )
              }
              placeholder="18000"
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/40 disabled:opacity-50"
            />
          </div>

          {/* SORT ORDER */}

          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Sort order
            </label>

            <input
              type="number"
              min="0"
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(
                  event.target.value
                )
              }
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/40 disabled:opacity-50"
            />
          </div>

          {/* DESCRIPTION */}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-zinc-300">
              Тайлбар
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Fresh mint, lime and white rum..."
              disabled={loading}
              className="w-full resize-none rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/40 disabled:opacity-50"
            />
          </div>

          {/* INGREDIENTS */}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-zinc-300">
              Орц
            </label>

            <textarea
              value={ingredients}
              onChange={(event) =>
                setIngredients(
                  event.target.value
                )
              }
              rows={3}
              placeholder="White rum, lime, mint, sugar..."
              disabled={loading}
              className="w-full resize-none rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/40 disabled:opacity-50"
            />
          </div>

          {/* IMAGE */}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-zinc-300">
              Cocktail зураг
            </label>

            <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900 p-5">

              {/* PREVIEW */}

              {imagePreview && (
                <div className="mb-5 overflow-hidden rounded-xl border border-white/10">
                  <img
                    src={imagePreview}
                    alt="Cocktail preview"
                    className="h-64 w-full object-cover"
                  />
                </div>
              )}

              {/* FILE */}

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleImageUpload
                }
                disabled={
                  uploading ||
                  loading
                }
                className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-medium file:text-zinc-950 hover:file:bg-zinc-200 disabled:opacity-50"
              />

              <p className="mt-2 text-xs text-zinc-500">
                JPG, PNG, WEBP —
                хамгийн ихдээ 5MB.
              </p>

              {/* UPLOADING */}

              {uploading && (
                <p className="mt-3 text-sm text-blue-400">
                  Зураг upload хийж байна...
                </p>
              )}

              {/* SUCCESS */}

              {imageUrl &&
                !uploading && (
                  <p className="mt-3 text-xs text-green-400">
                    ✓ Зураг upload амжилттай
                  </p>
                )}
            </div>
          </div>

          {/* AVAILABLE */}

          <div className="md:col-span-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(event) =>
                  setIsAvailable(
                    event.target.checked
                  )
                }
                disabled={loading}
                className="h-5 w-5 rounded"
              />

              <span className="text-sm text-zinc-300">
                Menu дээр харагдана
              </span>
            </label>
          </div>

        </div>

        {/* BUTTONS */}

        <div className="mt-6 flex flex-wrap gap-3">

          <button
            type="submit"
            disabled={
              loading ||
              uploading
            }
            className="rounded-xl bg-white px-6 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Хадгалж байна..."
              : editingId
                ? "Өөрчлөлт хадгалах"
                : "Cocktail нэмэх"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={
                loading ||
                uploading
              }
              className="rounded-xl border border-white/10 px-6 py-3 font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              Болих
            </button>
          )}

        </div>

      </form>

      {/* ================================= */}
      {/* PRODUCT LIST */}
      {/* ================================= */}

      <div>

        {/* LIST HEADER */}

        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white">
            Cocktail жагсаалт
          </h3>

          <p className="mt-1 text-sm text-zinc-400">
            Нийт {products.length} cocktail
          </p>
        </div>

        {/* EMPTY */}

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
            <div className="text-4xl opacity-40">
              🍸
            </div>

            <p className="mt-3 text-zinc-400">
              Одоогоор cocktail алга
              байна.
            </p>
          </div>
        ) : (

          /* PRODUCT LIST */

          <div className="space-y-3">

            {products.map(
              (product) => {

                const isDeleting =
                  deletingId ===
                  product.id;

                return (
                  <div
                    key={product.id}
                    className="rounded-xl border border-white/10 bg-zinc-800 p-5"
                  >

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                      {/* PRODUCT INFO */}

                      <div className="flex gap-4">

                        {/* IMAGE */}

                        {product.image_url ? (
                          <img
                            src={
                              product.image_url
                            }
                            alt={
                              product.name
                            }
                            className="h-20 w-20 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-3xl opacity-40">
                            🍸
                          </div>
                        )}

                        {/* TEXT */}

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <h4 className="font-semibold text-white">
                              {
                                product.name
                              }
                            </h4>

                            <span className="rounded-lg bg-zinc-700 px-2 py-1 text-xs text-zinc-300">
                              {
                                getCategoryName(
                                  product.category_id
                                )
                              }
                            </span>

                            {!product.is_available && (
                              <span className="rounded-lg bg-yellow-500/10 px-2 py-1 text-xs text-yellow-400">
                                Нуугдсан
                              </span>
                            )}

                          </div>

                          {/* DESCRIPTION */}

                          {product.description && (
                            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                              {
                                product.description
                              }
                            </p>
                          )}

                          {/* INFO */}

                          <div className="mt-3 flex flex-wrap gap-4 text-sm">

                            <span className="font-medium text-amber-300">
                              {Number(
                                product.price
                              ).toLocaleString()}
                              ₮
                            </span>

                            <span className="text-zinc-500">
                              Sort:{" "}
                              {
                                product.sort_order
                              }
                            </span>

                            <span className="text-zinc-500">
                              ID:{" "}
                              {
                                product.id
                              }
                            </span>

                          </div>

                          {/* INGREDIENTS */}

                          {product.ingredients && (
                            <p className="mt-2 text-xs text-zinc-500">
                              Орц:{" "}
                              {
                                product.ingredients
                              }
                            </p>
                          )}

                        </div>

                      </div>

                      {/* ACTIONS */}

                      <div className="flex shrink-0 gap-3">

                        {/* EDIT */}

                        <button
                          type="button"
                          onClick={() =>
                            startEdit(
                              product
                            )
                          }
                          className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-500/20"
                        >
                          Засах
                        </button>

                        {/* DELETE */}

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              product.id,
                              product.name
                            )
                          }
                          disabled={
                            isDeleting
                          }
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting
                            ? "Устгаж байна..."
                            : "Устгах"}
                        </button>

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>

    </div>
  );
}