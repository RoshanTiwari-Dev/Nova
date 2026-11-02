import { Suspense } from "react";
import { IdeView } from "@/components/ide/ide-view";
import { getProjectById } from "@/lib/db/queries";
import { Loader2 } from "lucide-react";
import { SupportedLanguage } from "@/lib/runner/types";

export default async function ProjectIdePage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProjectById(params.id);
  const initialCode = project?.files?.[0]?.content;
  const initialLang = (project?.language as SupportedLanguage) || "python";

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <IdeView
        projectId={params.id}
        initialCode={initialCode}
        initialLanguage={initialLang}
      />
    </Suspense>
  );
}
