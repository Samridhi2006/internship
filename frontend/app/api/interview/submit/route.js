import { NextResponse } from "next/server";

/**
 * POST /api/interview/submit
 * Proxies request to the backend Express port 4000 submit-answer endpoint
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

    // Map body attributes if they come from standard client
    const payload = {
      sessionId: body.sessionId,
      questionId: body.questionId,
      answer: body.answer,
      skipped: body.skipped !== undefined ? body.skipped : body.isSkipped,
    };

    const res = await fetch("http://localhost:4000/api/interview/evaluate", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proxy submit error:", error);
    return NextResponse.json(
      { success: false, error: "Internal API proxy error." },
      { status: 500 }
    );
  }
}
