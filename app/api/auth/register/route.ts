import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, createUser } from "@/lib/db/queries";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";

export const runtime = "nodejs";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = registerSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check if user already exists
    const existing = await getUserByEmail(email);
    if (existing && (existing as any).password) {
      return NextResponse.json(
        {
          error: {
            code: "USER_EXISTS",
            message: "An account with this email already exists. Please sign in instead.",
          },
        },
        { status: 409 }
      );
    }

    // Hash password and store user
    const hashedPassword = hashPassword(password);
    const newUser = await createUser({
      name,
      email,
      password: hashedPassword,
      role: "user",
      isGuest: false,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully. You can now sign in.",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Registration error:", err);
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: err?.message || "Failed to create account. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
