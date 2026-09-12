import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Нэвтрэх шаардлагатай." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const tableId = Number(id);

    if (!Number.isInteger(tableId) || tableId <= 0) {
      return NextResponse.json(
        { error: "Ширээний ID буруу байна." },
        { status: 400 }
      );
    }

    const { data: table, error: findError } = await supabase
      .from("tables")
      .select("id, number")
      .eq("id", tableId)
      .maybeSingle();

    if (findError) {
      console.error("TABLE FIND ERROR:", findError);

      return NextResponse.json(
        {
          error: "Ширээ олоход алдаа гарлаа.",
        },
        { status: 500 }
      );
    }

    if (!table) {
      return NextResponse.json(
        {
          error: "Ийм ширээ олдсонгүй.",
        },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("tables")
      .delete()
      .eq("id", tableId);

    if (deleteError) {
      console.error("TABLE DELETE ERROR:", deleteError);

      return NextResponse.json(
        {
          error:
            "Ширээ устгахад алдаа гарлаа: " +
            deleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${table.number}-р ширээ устгагдлаа.`,
    });
  } catch (error) {
    console.error("TABLE DELETE SERVER ERROR:", error);

    return NextResponse.json(
      {
        error: "Серверийн алдаа гарлаа.",
      },
      { status: 500 }
    );
  }
}