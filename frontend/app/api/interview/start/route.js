import { NextResponse } from "next/server";

/**
 * POST /api/interview/start
 * Proxies request to the backend Express port 4000
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get("authorization");

    const headers = {
      "Content-Type": "application/json",
    };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch("http://localhost:4000/api/interview/start", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proxy start error:", error);
    return NextResponse.json(
      { success: false, error: "Internal API proxy error." },
      { status: 500 }
    );
  }
}
