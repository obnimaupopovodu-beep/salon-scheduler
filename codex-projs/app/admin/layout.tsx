import { redirect } from "next/navigation";

import { BottomNav } from "@/components/admin/BottomNav";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pb-28 pt-4">
      <div className="mx-auto max-w-[430px]">{children}</div>
      <BottomNav />
    </div>
  );
}
