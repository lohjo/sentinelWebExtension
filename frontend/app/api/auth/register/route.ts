import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators/auth.validator";
import { registerUser, AuthError } from "@/lib/services/auth.service";

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
    const input = registerSchema.parse(body);
    const result = await registerUser(input);

    return NextResponse.json(result, { status: 201 });
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
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
