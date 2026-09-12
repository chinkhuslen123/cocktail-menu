import { supabase } from "@/lib/supabase";

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

export default async function Home() {
  const { data: categories, error: categoryError } =
    await supabase
      .from("categories")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true });

  const { data: products, error: productError } =
    await supabase
      .from("products")
      .select(
        `
          id,
          name,
          description,
          category_id,
          image_url,
          ingredients,
          price,
          is_available,
          sort_order
        `
      )
      .eq("is_available", true)
      .order("sort_order", { ascending: true });

  if (categoryError || productError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-xl font-semibold text-red-400">
            Menu ачаалахад алдаа гарлаа
          </h1>

          {categoryError && (
            <p className="mt-3 text-sm text-red-300">
              Category: {categoryError.message}
            </p>
          )}

          {productError && (
            <p className="mt-2 text-sm text-red-300">
              Product: {productError.message}
            </p>
          )}
        </div>
      </main>
    );
  }

  const visibleCategories = categories ?? [];
  const visibleProducts = products ?? [];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="mb-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Cocktail Bar
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Cocktail Menu
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400 sm:text-base">
            Манай cocktail menu-ээс өөрийн дуртай ундаагаа сонгоорой.
          </p>
        </header>

        {/* EMPTY STATE */}
        {visibleCategories.length === 0 &&
          visibleProducts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <p className="text-zinc-400">
                Одоогоор menu хоосон байна.
              </p>
            </div>
          )}

        {/* CATEGORIES */}
        <div className="space-y-12">
          {visibleCategories.map((category) => {
            const categoryProducts = visibleProducts
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
              <section key={category.id}>
                <div className="mb-5">
                  <h2 className="text-2xl font-bold sm:text-3xl">
                    {category.name}
                  </h2>

                  <div className="mt-2 h-px w-16 bg-white/20" />
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {categoryProducts.map((product) => (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 transition hover:-translate-y-1 hover:border-white/20"
                    >
                      {/* IMAGE */}
                      <div className="aspect-[4/3] bg-zinc-800">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-sm text-zinc-600">
                              No Image
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CONTENT */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-lg font-semibold">
                            {product.name}
                          </h3>

                          <span className="shrink-0 text-base font-semibold text-white">
                            {Number(
                              product.price
                            ).toLocaleString()}
                            ₮
                          </span>
                        </div>

                        {product.description && (
                          <p className="mt-3 text-sm leading-6 text-zinc-400">
                            {product.description}
                          </p>
                        )}

                        {product.ingredients && (
                          <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-zinc-500">
                            {product.ingredients}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}