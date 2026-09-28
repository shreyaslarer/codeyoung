import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";


export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/bookings`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json({ bookings: [], count: 0 });
  } catch (err) {
    return NextResponse.json({ bookings: [], count: 0, error: String(err) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idempotencyKey =
      request.headers.get("idempotency-key") ||
      `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const res = await fetch(`${BACKEND_URL}/api/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error creating booking through API proxy:", err);
    return NextResponse.json(
      {
        type: "https://codeyoung.dev/problems/internal-error",
        title: "Internal Server Error",
        status: 500,
        detail: err instanceof Error ? err.message : "Failed to create booking",
      },
      { status: 500 }
    );
  }
}
