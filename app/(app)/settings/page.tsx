import { auth } from "@/lib/auth";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const session = await auth();
  return <SettingsView user={session?.user} />;
}
