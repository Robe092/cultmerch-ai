import { NextRequest, NextResponse } from "next/server";
import { analysisStore } from "@/lib/analysis-store";
import { asStoredAnalysis } from "@/lib/stored-analysis";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const analysis = analysisStore.getById(id);

  if (!analysis) {
    return NextResponse.json(
      {
        success: false,
        error: "Analyse introuvable",
        message: `Aucune analyse trouvée avec l'identifiant ${id}`,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: asStoredAnalysis(analysis),
    storage: analysisStore.getStorageMetadata(),
  });
}
