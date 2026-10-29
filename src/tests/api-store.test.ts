import { describe, it } from "node:test";
import assert from "node:assert";
import { AgentOrchestrator } from "../lib/agent-orchestrator.js";
import { analysisStore } from "../lib/analysis-store.js";

describe("🗄️ Backend Store, Gouvernance HITL & Export de Drop", () => {
  const orchestrator = new AgentOrchestrator({ mode: "mock_only" });

  it("enregistre et récupère une analyse par son identifiant", async () => {
    analysisStore.clear();
    const result = await orchestrator.runAnalysis("Ambiance Neo-Noir Parisienne");
    analysisStore.save(result);

    const retrieved = analysisStore.getById(result.id);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.id, result.id);
    assert.strictEqual(retrieved.status, "PENDING_REVIEW");
  });

  it("gère l'approbation humaine (HITL) : passage à APPROVED avec notes", async () => {
    const result = await orchestrator.runAnalysis("Collection Synthwave Test HITL");
    analysisStore.save(result);

    const approved = analysisStore.updateStatus(
      result.id,
      "APPROVED",
      "Validé par le directeur merchandising pour la newsletter de vendredi"
    );

    assert.ok(approved);
    assert.strictEqual(approved.status, "APPROVED");
    assert.strictEqual(
      approved.approval_metadata?.notes,
      "Validé par le directeur merchandising pour la newsletter de vendredi"
    );
    assert.ok(approved.approval_metadata?.reviewed_at);
  });

  it("gère le rejet humain (HITL) : passage à REJECTED", async () => {
    const result = await orchestrator.runAnalysis("Collection Synthwave Rejetée");
    analysisStore.save(result);

    const rejected = analysisStore.updateStatus(result.id, "REJECTED", "Trop cher pour la cible");
    assert.ok(rejected);
    assert.strictEqual(rejected.status, "REJECTED");
  });

  it("génère une charge utile d'export e-commerce conforme et structurée", async () => {
    const result = await orchestrator.runAnalysis("Drop Électro Minimaliste");
    analysisStore.save(result);

    const stored = analysisStore.getById(result.id);
    assert.ok(stored);

    const exportDrop = {
      drop_id: stored.id,
      title: stored.branchB_with_qloo.title,
      audience: stored.brief,
      skus: stored.branchB_with_qloo.items.map((i) => i.product.sku),
      total_basket_eur: stored.branchB_with_qloo.metrics.total_basket_eur,
      margin_pct: stored.branchB_with_qloo.metrics.average_margin_pct,
    };

    assert.strictEqual(exportDrop.drop_id, stored.id);
    assert.ok(exportDrop.skus.length > 0);
    assert.ok(exportDrop.total_basket_eur > 0);
    assert.ok(exportDrop.margin_pct >= 0.30);
  });
});
