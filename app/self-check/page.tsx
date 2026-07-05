import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { SelfCheckContent } from "@/components/pages/SelfCheckContent";

export default async function SelfCheckPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <AppShell current="self-check">
      <SelfCheckContent />
    </AppShell>
  );
}
