import { auth } from "@/lib/auth";
import { AdminView } from "@/components/admin/admin-view";
import { getAdminMetrics } from "@/lib/db/queries";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4 p-8 rounded-2xl border border-border bg-card shadow-lg">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Admin Access Restricted</h2>
          <p className="text-sm text-muted-foreground">
            This dashboard requires an administrator account configured in <code>ADMIN_EMAILS</code> in your environment.
          </p>
          <div className="pt-2">
            <Link href="/chat">
              <Button size="sm">Back to AI Chat</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const metrics = await getAdminMetrics();
  return <AdminView metrics={metrics} />;
}
