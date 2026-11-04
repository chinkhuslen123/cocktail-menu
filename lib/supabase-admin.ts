import { createClient } from "@supabase/supabase-js";

// Зөвхөн сервер талын API route-д ашиглана.
// Хөтөч дээр ажилладаг (use client) файлд хэзээ ч импортлохгүй.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}