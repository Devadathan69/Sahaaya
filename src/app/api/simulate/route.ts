import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiUrl = process.env.SAHAAYA_API_URL ?? "http://127.0.0.1:8000";
  try {
    const payload = await request.json();
    const response = await fetch(`${apiUrl}/api/simulate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      { detail: "The Sahaaya Python API is not reachable. Start it on http://127.0.0.1:8000 and try again." },
      { status: 503 },
    );
  }
}
