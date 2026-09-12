import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  // =========================
  // ADMIN AUTH
  // =========================

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("ADMIN AUTH ERROR:", authError);
  }

  if (!user) {
    redirect("/admin/login");
  }

  // =========================
  // CATEGORIES
  // =========================

  const {
    data: categories,
    error: categoryError,
  } = await supabase
    .from("categories")
    .select("id, name, sort_order, created_at")
    .order("sort_order", { ascending: true });

  if (categoryError) {
    console.error("CATEGORY FETCH ERROR:", categoryError);
  }

  // =========================
  // PRODUCTS
  // =========================

  const {
    data: products,
    error: productError,
  } = await supabase
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
    .order("sort_order", { ascending: true });

  if (productError) {
    console.error("PRODUCT FETCH ERROR:", productError);
  }

  // =========================
  // TABLES
  // =========================

  const {
    data: tables,
    error: tableError,
  } = await supabase
    .from("tables")
    .select("id, number, created_at")
    .order("number", { ascending: true });

  if (tableError) {
    console.error("TABLE FETCH ERROR MESSAGE:", tableError.message);
    console.error("TABLE FETCH ERROR DETAILS:", tableError.details);
    console.error("TABLE FETCH ERROR HINT:", tableError.hint);
    console.error("TABLE FETCH ERROR CODE:", tableError.code);
  }

  // =========================
  // DASHBOARD
  // =========================

  return (
    <AdminDashboard
      userEmail={user.email ?? ""}
      categories={categories ?? []}
      products={products ?? []}
      tables={tables ?? []}
      categoryError={categoryError?.message ?? null}
      productError={productError?.message ?? null}
      tableError={tableError?.message ?? null}
    />
  );
}   