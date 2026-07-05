import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { ChatHistoryContent } from "@/components/pages/ChatHistoryContent";

export default async function ChatHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <AppShell>
      <ChatHistoryContent />
    </AppShell>
  );
}
