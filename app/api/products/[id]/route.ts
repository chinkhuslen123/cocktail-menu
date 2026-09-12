import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
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

    const { id } = await params;
    const productId = Number(id);

    if (!Number.isInteger(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
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
      .update({
        name,
        description,
        category_id: categoryId,
        image_url: imageUrl,
        ingredients,
        price,
        is_available: isAvailable,
        sort_order: sortOrder,
      })
      .eq("id", productId)
      .select()
      .single();

    if (error) {
      console.error("PRODUCT UPDATE ERROR:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      product: data,
    });
  } catch (error) {
    console.error("PRODUCT PUT API ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
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

    const { id } = await params;
    const productId = Number(id);

    if (!Number.isInteger(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error("PRODUCT DELETE ERROR:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("PRODUCT DELETE API ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
