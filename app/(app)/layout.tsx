import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={session?.user} />
      <main className="flex-1 lg:pl-64 flex flex-col min-h-screen pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
