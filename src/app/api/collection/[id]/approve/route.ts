import { NextRequest, NextResponse } from "next/server";
import { analysisStore } from "@/lib/analysis-store";
import { ApproveRequestSchema } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = ApproveRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid approval action",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const existing = analysisStore.getById(id);
    if (existing && existing.branchB_with_qloo.items.length === 0) {
      return NextResponse.json({ success: false, error: "No relevant products to approve." }, { status: 409 });
    }
    const { action, notes, productSku, productNotes } = parsed.data;
    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const updated = productSku
      ? analysisStore.updateProductReview(id, productSku, action === "APPROVE" ? "approved" : "revision", notes)
      : analysisStore.updateStatus(id, newStatus, notes, productNotes);

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: "Analysis not found",
          message: `Unable to approve analysis ${id} (not found)`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Collection ${id} updated with status: ${updated.status}`,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Could not update approval status",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
