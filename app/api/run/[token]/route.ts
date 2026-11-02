import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runner } from "@/lib/runner/judge0";
import { saveExecutionRecord } from "@/lib/db/queries";
import { truncateText } from "@/lib/utils";

export const maxDuration = 30;
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const session = await auth();
  const userId = session?.user?.id || "dev-user-001";
  const { token } = params;

  if (!token) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Execution token is required" } },
      { status: 400 }
    );
  }

  try {
    const result = await runner.getResult(token);

    // If final execution status reached, record in database
    if (result.status !== "queue" && result.status !== "processing") {
      try {
        await saveExecutionRecord({
          userId,
          language: result.language,
          runtimeVersion: result.runtimeVersion,
          status: result.status,
          exitCode: result.exitCode,
          timeMs: result.timeMs,
          memoryKb: result.memoryKb,
          stdoutPreview: truncateText(result.stdout || "", 1500),
          stderrPreview: truncateText(result.stderr || result.compileOutput || "", 1500),
        });
      } catch (dbErr) {
        console.warn("Could not save execution history:", dbErr);
      }
    }

    return NextResponse.json({ result });
  } catch (err: any) {
    console.error(`Error polling token ${token}:`, err);
    return NextResponse.json(
      {
        error: {
          code: "POLL_FAILED",
          message: err?.message || "Failed to poll runner result",
        },
      },
      { status: 500 }
    );
  }
}
