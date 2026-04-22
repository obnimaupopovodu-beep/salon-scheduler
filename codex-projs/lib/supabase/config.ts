const missingVar = (name: string): never => {
  throw new Error(`Missing environment variable: ${name}. Add it to your .env.local file.`);
};

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? missingVar("NEXT_PUBLIC_SUPABASE_URL");

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? missingVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");
