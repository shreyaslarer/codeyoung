import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 1. Validation check
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        {
          type: "https://codeyoung.dev/problems/invalid-parameter",
          title: "Invalid Email Address",
          status: 400,
          detail: "A valid email address is required.",
        },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        {
          type: "https://codeyoung.dev/problems/invalid-parameter",
          title: "Invalid Password",
          status: 400,
          detail: "Password must be at least 6 characters long.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Authentication logic (supports designated admin accounts or any valid @codeyoung domain account)
    const isPrimaryAdmin =
      normalizedEmail === "admin@codeyoung.com" &&
      (password === "codeyoung2026" || password === "admin123");
    const isMentorAdmin =
      normalizedEmail === "mentor@codeyoung.dev" &&
      (password === "codeyoung2026" || password === "mentor123");
    const isCorporateUser =
      (normalizedEmail.endsWith("@codeyoung.com") || normalizedEmail.endsWith("@codeyoung.dev")) &&
      password.length >= 6;

    if (!isPrimaryAdmin && !isMentorAdmin && !isCorporateUser) {
      return NextResponse.json(
        {
          type: "https://codeyoung.dev/problems/invalid-credentials",
          title: "Authentication Failed",
          status: 401,
          detail: "Invalid email or password. Use demo account: admin@codeyoung.com / codeyoung2026",
        },
        { status: 401 }
      );
    }

    // Determine user role and name
    const userName = isMentorAdmin
      ? "Lead Mentor"
      : isPrimaryAdmin
      ? "Operations Lead"
      : normalizedEmail.split("@")[0].replace(/\./g, " ");

    const sessionPayload = {
      id: "usr-" + Math.random().toString(36).substring(2, 9),
      name: userName.charAt(0).toUpperCase() + userName.slice(1),
      email: normalizedEmail,
      role: isMentorAdmin ? "MENTOR_LEAD" : "SYSTEM_ADMIN",
      authenticatedAt: new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
      redirectUrl: "/dashboard",
      message: "Authentication successful",
    });

    // Set secure session cookie
    response.cookies.set("codeyoung_admin_session", JSON.stringify(sessionPayload), {
      httpOnly: false, // Accessible to client-side auth state
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      {
        type: "https://codeyoung.dev/problems/internal-error",
        title: "Internal Server Error",
        status: 500,
        detail: "An unexpected error occurred during authentication.",
      },
      { status: 500 }
    );
  }
}
