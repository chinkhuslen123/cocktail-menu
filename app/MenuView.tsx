"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
const supabase = createSupabaseBrowserClient();

type Category = {
  id: number;
  name: string;
  sort_order: number;
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

type MenuViewProps = {
  categories: Category[];
  products: Product[];
  tableNumber?: number;
};

type CartItem = {
  product: Product;
  quantity: number;
};

export default function MenuView({
  categories,
  products,
  tableNumber,
}: MenuViewProps) {
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [myOrders, setMyOrders] = useState<any[]>([]);
const [myOrdersLoading, setMyOrdersLoading] =
  useState(false);
const [showMyOrders, setShowMyOrders] =
  useState(false);

  async function loadMyOrders() {
    setMyOrdersLoading(true);

    try {
      const savedIds = JSON.parse(
        localStorage.getItem("my_order_ids") || "[]"
      );

      if (
        !Array.isArray(savedIds) ||
        savedIds.length === 0
      ) {
        setMyOrders([]);
        return;
      }

      const ids = savedIds
        .map((id: unknown) => Number(id))
        .filter((id: number) => Number.isInteger(id));

      if (ids.length === 0) {
        setMyOrders([]);
        return;
      }

      const response = await fetch(
        `/api/orders?ids=${ids.join(",")}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "MY ORDERS ERROR:",
          result.error
        );
        return;
      }

      setMyOrders(result.orders ?? []);
    } catch (error) {
      console.error(
        "LOAD MY ORDERS ERROR:",
        error
      );
    } finally {
      setMyOrdersLoading(false);
    }
  }
  useEffect(() => {
    loadMyOrders();

    const channel = supabase
      .channel("my-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadMyOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        () => {
          loadMyOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedProduct || showCart) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedProduct, showCart]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedProduct(null);
        setShowCart(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  const cartCount = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.product.price) * item.quantity,
      0
    );
  }, [cart]);

  function addToCart(product: Product) {
    setOrderError("");
    setOrderSuccess(false);

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.product.id === product.id
      );

      if (existing) {
        return currentCart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          product,
          quantity: 1,
        },
      ];
    });

    setSelectedProduct(null);
  }

  function increaseQuantity(productId: number) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  function decreaseQuantity(productId: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId: number) {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.product.id !== productId
      )
    );
  }

  async function placeOrder() {
    if (cart.length === 0) {
      setOrderError(
        "Захиалгад cocktail сонгоно уу."
      );
      return;
    }

    setOrdering(true);
    setOrderError("");
    setOrderSuccess(false);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table_number: tableNumber,
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setOrderError(
          result.error ||
            "Захиалга өгөхөд алдаа гарлаа."
        );
        return;
      }

      if (result.order?.id) {
  const existingIds = JSON.parse(
    localStorage.getItem("my_order_ids") || "[]"
  );

  const updatedIds = [
    Number(result.order.id),
    ...existingIds.filter(
      (id: number) =>
        Number(id) !== Number(result.order.id)
    ),
  ];

  localStorage.setItem(
    "my_order_ids",
    JSON.stringify(updatedIds.slice(0, 20))
  );
}

setCart([]);
setShowCart(false);
setOrderSuccess(true);
    } catch (error) {
      console.error("PLACE ORDER ERROR:", error);

      setOrderError(
        "Сервертэй холбогдоход алдаа гарлаа."
      );
    } finally {
      setOrdering(false);
    }
  }


  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      {/* HEADER */}
      <header className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-5 py-10 text-center sm:px-6 sm:py-14">
          <div className="flex items-center justify-between gap-4">
            <div className="text-left">
              <p className="text-xs font-medium uppercase tracking-[0.4em] text-amber-400">
                Cocktail Bar
              </p>

              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
                Our Menu
              </h1>

              <p className="mt-3 text-sm text-zinc-400">
                Өөрийн дуртай cocktail-оо сонгоорой.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-3">
  <button
    type="button"
    onClick={() => {
      setShowMyOrders(true);
      loadMyOrders();
    }}
    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-300"
  >
    📋 Миний захиалга
  </button>

  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-3 text-center">
    <p className="text-xs text-zinc-400">
      Ширээ
    </p>

    <p className="text-2xl font-bold text-amber-300">
      {tableNumber}
    </p>
  </div>
</div>
          </div>
        </div>
      </header>

      {/* CATEGORY NAVIGATION */}
      {categories.length > 0 && (
        <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0b0b]/95 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl overflow-x-auto px-5 sm:px-6">
            <div className="flex min-w-max gap-2 py-3">
              {categories.map((category) => (
                <a
                  key={category.id}
                  href={`#category-${category.id}`}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-300"
                >
                  {category.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {orderSuccess && (
        <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-center">
            <p className="font-semibold text-green-400">
              ✓ Захиалга амжилттай илгээгдлээ
            </p>

            <p className="mt-1 text-sm text-green-400/70">
              Удахгүй ажилтан таны захиалгыг хүлээн авна.
            </p>
          </div>
        </div>
      )}

      {/* MENU */}
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        {categories.map((category) => {
          const categoryProducts = products
            .filter(
              (product) =>
                product.category_id === category.id
            )
            .sort(
              (a, b) =>
                a.sort_order - b.sort_order
            );

          if (categoryProducts.length === 0) {
            return null;
          }

          return (
            <section
              key={category.id}
              id={`category-${category.id}`}
              className="mb-14 scroll-mt-20 last:mb-0"
            >
              <div className="mb-7 flex items-end gap-4">
                <div className="shrink-0">
                  <p className="text-xs uppercase tracking-[0.25em] text-amber-400/80">
                    Menu
                  </p>

                  <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                    {category.name}
                  </h2>
                </div>

                <div className="mb-2 hidden h-px flex-1 bg-white/10 sm:block" />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {categoryProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() =>
                      setSelectedProduct(product)
                    }
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-[#141414] text-left shadow-xl shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-amber-400/30 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl opacity-30">
                              🍸
                            </div>

                            <p className="mt-2 text-xs text-zinc-600">
                              No Image
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
                      <h3 className="min-w-0 truncate text-base font-semibold tracking-tight sm:text-lg">
                        {product.name}
                      </h3>

                      <span className="shrink-0 text-sm font-bold text-amber-400 sm:text-base">
                        {Number(
                          product.price
                        ).toLocaleString()}
                        ₮
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        {categories.length === 0 &&
          products.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
              <div className="text-5xl">🍸</div>

              <h2 className="mt-5 text-xl font-semibold">
                Menu хоосон байна
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Одоогоор cocktail нэмэгдээгүй байна.
              </p>
            </div>
          )}
      </div>

      {/* CART BUTTON */}
      {cartCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setOrderError("");
            setShowCart(true);
          }}
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full bg-amber-400 px-6 py-4 font-bold text-zinc-950 shadow-2xl shadow-black/40 transition hover:bg-amber-300"
        >
          <span>
            🛒 Сагс
          </span>

          <span className="rounded-full bg-zinc-950 px-3 py-1 text-sm text-white">
            {cartCount}
          </span>

          <span>
            {cartTotal.toLocaleString()}₮
          </span>
        </button>
      )}

      <footer className="border-t border-white/10 px-5 py-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-600">
          Cocktail Bar
        </p>
      </footer>
            {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() =>
            setSelectedProduct(null)
          }
        >
          <div
            className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#151515] shadow-2xl sm:max-w-2xl sm:rounded-3xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              onClick={() =>
                setSelectedProduct(null)
              }
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-2xl text-white backdrop-blur transition hover:bg-black hover:text-amber-300"
            >
              ×
            </button>

            <div className="aspect-[4/3] w-full bg-zinc-900 sm:aspect-[16/9]">
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-6xl opacity-30">
                    🍸
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.3em] text-amber-400">
                    Cocktail
                  </p>

                  <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                    {selectedProduct.name}
                  </h2>
                </div>

                <div className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300 sm:text-base">
                  {Number(
                    selectedProduct.price
                  ).toLocaleString()}
                  ₮
                </div>
              </div>

              {selectedProduct.description && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                    Тайлбар
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-zinc-400">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {selectedProduct.ingredients && (
                <div className="mt-8 border-t border-white/10 pt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                    Орц / Найрлага
                  </h3>

                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-400">
                    {selectedProduct.ingredients}
                  </p>
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    addToCart(selectedProduct)
                  }
                  className="flex-1 rounded-xl bg-amber-400 px-5 py-3 font-bold text-zinc-950 transition hover:bg-amber-300"
                >
                  Сагсанд нэмэх
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedProduct(null)
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-medium text-zinc-300 transition hover:bg-white/10"
                >
                  Буцах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CART MODAL */}
      {showCart && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setShowCart(false)}
        >
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#151515] shadow-2xl sm:max-w-lg sm:rounded-3xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-[#151515] p-5">
              <div>
                <h2 className="text-xl font-bold">
                  Таны захиалга
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Ширээ №{tableNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCart(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-xl text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 p-5">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex gap-3">
                    {item.product.image_url && (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <h3 className="font-semibold">
                          {item.product.name}
                        </h3>

                        <span className="shrink-0 text-sm font-bold text-amber-400">
                          {(
                            Number(
                              item.product.price
                            ) * item.quantity
                          ).toLocaleString()}
                          ₮
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              decreaseQuantity(
                                item.product.id
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
                          >
                            −
                          </button>

                          <span className="w-6 text-center text-sm font-bold">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              increaseQuantity(
                                item.product.id
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              item.product.id
                            )
                          }
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Устгах
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {orderError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {orderError}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-zinc-400">
                  Нийт
                </span>

                <span className="text-2xl font-bold text-amber-400">
                  {cartTotal.toLocaleString()}₮
                </span>
              </div>

              <button
                type="button"
                onClick={placeOrder}
                disabled={ordering || cart.length === 0}
                className="w-full rounded-xl bg-amber-400 px-5 py-4 font-bold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ordering
                  ? "Захиалга илгээж байна..."
                  : "Захиалга өгөх"}
              </button>
            </div>
          </div>
        </div>
            )}

      {/* MY ORDERS MODAL */}
      {showMyOrders && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setShowMyOrders(false)}
        >
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#151515] shadow-2xl sm:max-w-lg sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#151515] p-5">
              <div>
                <h2 className="text-xl font-bold">
                  📋 Миний захиалга
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Ширээ №{tableNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMyOrders(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-xl text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              {myOrdersLoading ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />

                  <p className="mt-4 text-sm text-zinc-400">
                    Захиалгуудыг ачааллаж байна...
                  </p>
                </div>
              ) : myOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
                  <div className="text-4xl">
                    🍸
                  </div>

                  <p className="mt-3 text-sm text-zinc-400">
                    Танд одоогоор захиалга байхгүй байна.
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowMyOrders(false)}
                    className="mt-5 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300"
                  >
                    Menu үзэх
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((order) => (
                    <div
                      key={order.id}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
                    >
                      <div className="border-b border-white/10 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-bold text-white">
                              Захиалга #{order.id}
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {order.created_at
                                ? new Date(
                                    order.created_at
                                  ).toLocaleString("mn-MN", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : ""}
                            </p>
                          </div>

                        
                        </div>
                      </div>

                      <div className="space-y-2 p-4">
                        {Array.isArray(order.items) &&
                          order.items.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white">
                                  {item.product_name_snapshot}
                                </p>

                                <p className="mt-1 text-xs text-zinc-500">
                                  {Number(
                                    item.unit_price_snapshot
                                  ).toLocaleString("mn-MN")}
                                  ₮ × {item.quantity}
                                </p>
                              </div>

                              <p className="shrink-0 text-sm font-semibold text-white">
                                {Number(
                                  item.subtotal
                                ).toLocaleString("mn-MN")}
                                ₮
                              </p>
                            </div>
                          ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-white/10 px-4 py-4">
                        <span className="text-sm text-zinc-400">
                          Нийт
                        </span>

                        <span className="text-xl font-bold text-amber-400">
                          {Number(
                            order.total ??
                              order.total_amount ??
                              0
                          ).toLocaleString("mn-MN")}
                          ₮
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-5">
              <button
                type="button"
                onClick={loadMyOrders}
                disabled={myOrdersLoading}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {myOrdersLoading
                  ? "Шалгаж байна..."
                  : "↻ Захиалга шинэчлэх"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}