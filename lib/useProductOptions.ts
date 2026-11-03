"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const supabase = createSupabaseBrowserClient();

export type MilkOption = {
  id: number;
  name: string;
  extra_price: number;
};

export function useProductOptions(productId: number | null) {
  const [options, setOptions] = useState<MilkOption[]>([]);
  const [selected, setSelected] = useState<MilkOption | null>(null);

  useEffect(() => {
    if (productId == null) {
      setOptions([]);
      setSelected(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("product_option_groups")
        .select("option_groups(options(id, name, extra_price))")
        .eq("product_id", productId);

      if (cancelled) return;

      if (error) {
        console.error(
  "LOAD OPTIONS ERROR:",
  error.message,
  error.code,
  error.details,
  error.hint
);
        setOptions([]);
        setSelected(null);
        return;
      }

      const list: MilkOption[] = (data ?? [])
        .flatMap((row: any) => row.option_groups?.options ?? [])
        .map((o: any) => ({ ...o, extra_price: Number(o.extra_price) }))
        .sort((a: MilkOption, b: MilkOption) => a.extra_price - b.extra_price);

      setOptions(list);
      setSelected(list.find((o) => o.extra_price === 0) ?? list[0] ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  return { options, selected, setSelected };
}