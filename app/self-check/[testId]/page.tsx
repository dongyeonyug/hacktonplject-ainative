import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { getCheckDefinition } from "@/lib/selfCheck/definitions";
import { SurveyRunner } from "@/components/self-check/SurveyRunner";

export default async function SelfCheckTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  const def = getCheckDefinition(testId);
  if (!def) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <AppShell current="self-check">
      <SurveyRunner def={def} />
    </AppShell>
  );
}
