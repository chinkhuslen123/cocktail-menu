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
        { error: "Нэвтрэх шаардлагатай." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("tables")
      .select("id, number, created_at")
      .order("number", { ascending: true });

    if (error) {
      console.error("TABLE GET ERROR:", error);

      return NextResponse.json(
        {
          error: "Ширээнүүдийг уншихад алдаа гарлаа.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tables: data ?? [],
    });
  } catch (error) {
    console.error("TABLE GET SERVER ERROR:", error);

    return NextResponse.json(
      {
        error: "Серверийн алдаа гарлаа.",
      },
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
        { error: "Нэвтрэх шаардлагатай." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const tableNumber = Number(body.number);

    if (
      !Number.isInteger(tableNumber) ||
      tableNumber <= 0
    ) {
      return NextResponse.json(
        {
          error: "Ширээний зөв дугаар оруулна уу.",
        },
        { status: 400 }
      );
    }

    const { data: existingTable } = await supabase
      .from("tables")
      .select("id")
      .eq("number", tableNumber)
      .maybeSingle();

    if (existingTable) {
      return NextResponse.json(
        {
          error: `${tableNumber}-р ширээ аль хэдийн байна.`,
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("tables")
      .insert({
        number: tableNumber,
      })
      .select("id, number, created_at")
      .single();

    if (error) {
      console.error("TABLE INSERT ERROR:", error);

      return NextResponse.json(
        {
          error:
            "Ширээ нэмэхэд алдаа гарлаа: " +
            error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        table: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("TABLE POST ERROR:", error);

    return NextResponse.json(
      {
        error: "Серверийн алдаа гарлаа.",
      },
      { status: 500 }
    );
  }
}