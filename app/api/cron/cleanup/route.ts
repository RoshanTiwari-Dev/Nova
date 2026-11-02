import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { codeExecutions } from "@/lib/db/schema";
import { lt, sql } from "drizzle-orm";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" } },
      { status: 401 }
    );
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await db
      .delete(codeExecutions)
      .where(lt(codeExecutions.createdAt, thirtyDaysAgo))
      .returning({ id: codeExecutions.id });

    return NextResponse.json({
      success: true,
      recordsCleaned: deleted.length,
      cutoffDate: thirtyDaysAgo.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Cron cleanup error:", err);
    return NextResponse.json(
      { error: { code: "CLEANUP_FAILED", message: err?.message || "Execution cleanup failed" } },
      { status: 500 }
    );
  }
}
