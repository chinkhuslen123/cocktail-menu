import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        category_id,
        image_url,
        ingredients,
        price,
        is_available,
        sort_order,
        created_at,
        categories (
          id,
          name
        )
      `)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("PRODUCT FETCH ERROR:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      products: data ?? [],
    });
  } catch (error) {
    console.error("PRODUCT GET API ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;

    const categoryId = Number(body.category_id);

    const imageUrl =
      typeof body.image_url === "string" &&
      body.image_url.trim()
        ? body.image_url.trim()
        : null;

    const ingredients =
      typeof body.ingredients === "string" &&
      body.ingredients.trim()
        ? body.ingredients.trim()
        : null;

    const price = Number(body.price);

    const sortOrder =
      body.sort_order === undefined ||
      body.sort_order === ""
        ? 0
        : Number(body.sort_order);

    const isAvailable =
      body.is_available === undefined
        ? true
        : Boolean(body.is_available);

    if (!name) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(categoryId)) {
      return NextResponse.json(
        { error: "Valid category_id is required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { error: "Price must be a valid positive number" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      return NextResponse.json(
        { error: "Sort order must be a non-negative integer" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        name,
        description,
        category_id: categoryId,
        image_url: imageUrl,
        ingredients,
        price,
        is_available: isAvailable,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("PRODUCT INSERT ERROR:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        product: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("PRODUCT POST API ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}