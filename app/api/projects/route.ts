import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveProject, getProjects, getProjectById } from "@/lib/db/queries";
import { z } from "zod";

export const runtime = "nodejs";

const projectSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(100),
  language: z.string().min(1),
  files: z.array(
    z.object({
      name: z.string(),
      content: z.string(),
    })
  ),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || "dev-user-001";

  const projectId = req.nextUrl.searchParams.get("id");
  if (projectId) {
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    }
    return NextResponse.json({ project });
  }

  const list = await getProjects(userId);
  return NextResponse.json({ projects: list });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || "dev-user-001";

  try {
    const json = await req.json();
    const parsed = projectSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message } },
        { status: 400 }
      );
    }

    const saved = await saveProject({
      userId,
      id: parsed.data.id,
      title: parsed.data.title,
      language: parsed.data.language,
      files: parsed.data.files,
    });

    return NextResponse.json({ project: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: err?.message || "Failed to save project" } },
      { status: 500 }
    );
  }
}
