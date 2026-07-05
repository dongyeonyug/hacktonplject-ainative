import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { SurveyContent } from "@/components/pages/SurveyContent";

export default async function SurveyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <AppShell current="survey">
      <SurveyContent />
    </AppShell>
  );
}
