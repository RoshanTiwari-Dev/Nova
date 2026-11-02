import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runner } from "@/lib/runner/judge0";
import { checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

export const maxDuration = 30;
export const runtime = "nodejs";

const runCodeSchema = z.object({
  language: z.enum(["cpp", "java", "python", "javascript", "typescript", "go", "rust"]),
  code: z
    .string()
    .min(1, "Code cannot be empty")
    .max(100 * 1024, "Code length exceeds 100 KB limit"),
  stdin: z
    .string()
    .max(64 * 1024, "Standard input exceeds 64 KB limit")
    .optional(),
  projectId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || "dev-user-001";

  // Enforce Rate Limit: 20 runs per minute
  const limitCheck = await checkRateLimit("run", userId);
  if (!limitCheck.success) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Code execution rate limit reached (20 runs/minute). Reset in ${Math.ceil(
            (limitCheck.reset - Date.now()) / 1000
          )} seconds.`,
        },
      },
      { status: 429 }
    );
  }

  try {
    const json = await req.json();
    const parsed = runCodeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid submission parameters",
          },
        },
        { status: 400 }
      );
    }

    const { language, code, stdin } = parsed.data;

    // Submit to isolated runner
    const submission = await runner.submit({
      language,
      code,
      stdin,
      cpuTimeLimit: 5,
      wallTimeLimit: 10,
      memoryLimit: 256000,
    });

    return NextResponse.json({
      token: submission.token,
      status: "queue",
      message: "Submission received and queued on sandbox runner",
    });
  } catch (err: any) {
    console.error("Code submission route failed:", err);
    return NextResponse.json(
      {
        error: {
          code: "RUNNER_ERROR",
          message: err?.message || "Failed to submit execution job to runner",
        },
      },
      { status: 500 }
    );
  }
}
