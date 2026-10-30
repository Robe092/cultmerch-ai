import { displayAnalysisEn } from "@/lib/display-en";
import { NextRequest, NextResponse } from "next/server";
import { analysisStore } from "@/lib/analysis-store";
import { asStoredAnalysis } from "@/lib/stored-analysis";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const saved = analysisStore.getById(id);
  const analysis = saved ? displayAnalysisEn(asStoredAnalysis(saved)) : undefined;

  if (!analysis) {
    return NextResponse.json(
      {
        success: false,
        error: "Analysis not found",
        message: `No analysis found with ID ${id}`,
      },
      { status: 404 }
    );
  }

  if (analysis.status !== "APPROVED") {
    return NextResponse.json({ success: false, error: "Approve every product before exporting." }, { status: 409 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";
  const branch = searchParams.get("branch") === "A" ? analysis.branchA_without_qloo : analysis.branchB_with_qloo;

  if (format === "csv") {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const headers = "SKU,Name,Category,PriceEUR,MarginPct,Stock,ScoreMAI\n";
    const rows = branch.items
      .map(
        (i) =>
          `${escape(i.product.sku)},${escape(i.product.name)},${escape(i.product.category)},${i.product.price_eur},${(i.product.margin_pct * 100).toFixed(1)}%,${i.product.stock_units},${i.mai_total}`
      )
      .join("\n");

    return new NextResponse(headers + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cultmerch_drop_${id}.csv"`,
      },
    });
  }

  // Export JSON standardisé prêt pour Shopify/CMS
  const exportPayload = {
    drop_id: analysis.id,
    created_at: analysis.created_at,
    exported_at: new Date().toISOString(),
    status: analysis.status,
    collection_title: branch.title,
    target_audience: analysis.brief,
    data_state: branch.data_state,
    catalog_is_synthetic: true,
    provenance: analysis.provenance,
    product_reviews: analysis.product_reviews,
    metrics: branch.metrics,
    products: branch.items.map((i) => ({
      sku: i.product.sku,
      title: i.product.name,
      category: i.product.category,
      price: i.product.price_eur,
      margin_pct: i.product.margin_pct,
      inventory_available: i.product.stock_units,
      merchandising_affinity_index: i.mai_total,
      matched_cultural_tags: i.matched_tags,
      qloo_evidence: i.qloo_evidence,
    })),
  };

  return NextResponse.json({
    success: true,
    format: "json",
    data: exportPayload,
  });
}
