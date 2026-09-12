import { supabase } from "@/lib/supabase";
import MenuView from "./MenuView";

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

  return (
    <MenuView
      categories={categories ?? []}
      products={products ?? []}
    />
  );
}