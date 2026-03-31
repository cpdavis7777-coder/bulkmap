import { NextResponse } from "next/server";
import { generatePlanBundle } from "@/lib/optimizer/planBundle";
import { resolvePlanInput } from "@/lib/optimizer/resolvePlanInput";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const input = resolvePlanInput(body);
    const debug =
      request.headers.get("x-bulkmap-planner-debug") === "1" || process.env.BULKMAP_PLANNER_DEBUG === "1";
    const output = generatePlanBundle(input, { includeDiagnostics: debug });
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plan generation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
