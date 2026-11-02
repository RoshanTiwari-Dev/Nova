import { Suspense } from "react";
import { IdeView } from "@/components/ide/ide-view";
import { Loader2 } from "lucide-react";

export default function IdePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <IdeView />
    </Suspense>
  );
}
