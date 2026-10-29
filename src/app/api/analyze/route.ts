import { NextRequest, NextResponse } from "next/server";
import { AgentOrchestrator } from "@/lib/agent-orchestrator";
import { analysisStore } from "@/lib/analysis-store";
import { AnalyzeRequestSchema } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = AnalyzeRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Requête invalide",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { brief, bundleSize, minMargin, seeds } = parsed.data;
    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runAnalysis(brief, {
      bundleSize,
      minMargin,
      seeds,
    });

    // Enregistrement dans le magasin pour consultation ultérieure et approbation HITL
    analysisStore.save(result);

    return NextResponse.json(
      {
        success: true,
        data: result,
        storage: analysisStore.getStorageMetadata(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/analyze Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Échec de l'analyse merchandising",
        message: error.message || "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}

// Public status only. Saved analyses are retrieved by their unguessable analysis URL.
// Never enumerate the server-side Qloo cache to anonymous visitors.
export async function GET() {
  return NextResponse.json({
    success: true,
    has_live_key: !!process.env.QLOO_API_KEY,
  });
}
