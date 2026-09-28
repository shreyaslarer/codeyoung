import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
    redirectUrl: "/admin",
  });

  response.cookies.delete("codeyoung_admin_session");
  return response;
}
