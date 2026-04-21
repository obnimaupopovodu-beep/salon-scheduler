import { redirect } from "next/navigation";

import { BookingWizard } from "@/components/booking/BookingWizard";
import { createClient } from "@/lib/supabase/server";
import type { Branch } from "@/types";

interface BookingBranchPageProps {
  params: {
    branchSlug: string;
  };
}

export default async function BookingBranchPage({ params }: BookingBranchPageProps) {
  const { branchSlug } = params;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, slug, name, address")
    .eq("slug", branchSlug)
    .maybeSingle();

  if (error || !data) {
    redirect("/");
  }

  const branch = data as Branch;

  return (
    <main className="min-h-screen bg-canvas px-4 py-6">
      <div className="mx-auto max-w-[430px] space-y-4">
        <header className="rounded-[32px] bg-white px-5 py-6 shadow-sm">
          <p className="text-sm font-medium text-accent">Онлайн-запись</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Запишитесь на услугу</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{branch.address}</p>
        </header>
        <BookingWizard branch={branch} />
      </div>
    </main>
  );
}
