import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import MenuView from "@/app/MenuView";

type PageProps = {
  params: Promise<{
    number: string;
  }>;
};

export default async function TableMenuPage({
  params,
}: PageProps) {
  const { number } = await params;

  const tableNumber = Number(number);

  // URL дээр буруу дугаар байвал 404
  if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  // =========================
  // TABLE ШАЛГАХ
  // =========================

  const { data: table, error: tableError } = await supabase
    .from("tables")
    .select("id, number")
    .eq("number", tableNumber)
    .maybeSingle();

  if (tableError) {
    console.error("TABLE FETCH ERROR:", tableError);
    notFound();
  }

  if (!table) {
    notFound();
  }

  // =========================
  // CATEGORY АВАХ
  // =========================

  const { data: categories, error: categoryError } =
    await supabase
      .from("categories")
      .select("id, name, sort_order")
      .order("sort_order", {
        ascending: true,
      });

  if (categoryError) {
    console.error(
      "CATEGORY FETCH ERROR:",
      categoryError
    );
  }

  // =========================
  // AVAILABLE PRODUCTS АВАХ
  // =========================

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
      .order("sort_order", {
        ascending: true,
      });

  if (productError) {
    console.error(
      "PRODUCT FETCH ERROR:",
      productError
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto min-h-screen max-w-6xl">
        {/* HEADER */}

        <header className="border-b border-white/10 bg-zinc-900 px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Cocktail Bar
              </h1>

              <p className="mt-1 text-sm text-zinc-400">
                Меню
              </p>
            </div>

            <div className="rounded-xl bg-white px-4 py-2 text-center text-zinc-950">
              <p className="text-xs font-medium">
                Ширээ
              </p>

              <p className="text-xl font-bold">
                {table.number}
              </p>
            </div>
          </div>
        </header>

        {/* ERROR */}

        {categoryError && (
          <div className="mx-4 mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 sm:mx-6">
            Ангилал уншихад алдаа гарлаа.
          </div>
        )}

        {productError && (
          <div className="mx-4 mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 sm:mx-6">
            Меню уншихад алдаа гарлаа.
          </div>
        )}

        {/* MENU */}

        <MenuView
          categories={categories ?? []}
          products={products ?? []}
          tableNumber={table.number}
        />
      </div>
    </main>
  );
}