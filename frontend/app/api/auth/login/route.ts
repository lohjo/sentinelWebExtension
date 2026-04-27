import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators/auth.validator";
import { loginUser, AuthError } from "@/lib/services/auth.service";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  try {
    const input = loginSchema.parse(body);
    const result = await loginUser(input);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    if (
      error &&
      typeof error === "object" &&
      "issues" in error
    ) {
      return NextResponse.json(
        { error: "Validation failed", details: (error as { issues: unknown }).issues },
        { status: 400 }
      );
    }
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
