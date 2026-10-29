import { describe, it } from "node:test";
import assert from "node:assert";
import { AgentOrchestrator } from "../lib/agent-orchestrator.js";

describe("🧠 Agent Orchestrator & Comparateur A/B Équitable", () => {
  const orchestrator = new AgentOrchestrator({ mode: "mock_only" });

  it("exécute l'analyse complète et produit une comparaison A/B", async () => {
    const brief = "Audience Synthwave et Cyberpunk 2077";
    const result = await orchestrator.runAnalysis(brief, { bundleSize: 4 });

    assert.ok(result.id.startsWith("analysis_"), "L'analyse doit avoir un ID unique.");
    assert.strictEqual(result.brief, brief);
    assert.strictEqual(result.status, "PENDING_REVIEW");

    // Vérification Branche B (Avec Qloo)
    assert.ok(result.branchB_with_qloo, "La branche B (Avec Qloo) doit exister.");
    assert.strictEqual(result.branchB_with_qloo.items.length, 4);
    assert.strictEqual(result.branchB_with_qloo.data_state, "MOCK_SIMULATED");

    // Vérification Branche A (Sans Qloo — Témoin)
    assert.ok(result.branchA_without_qloo, "La branche A (Sans Qloo) doit exister.");
    assert.strictEqual(result.branchA_without_qloo.items.length, 4);
  });

  it("garantit un protocole équitable : même catalogue et mêmes contraintes de marge et stock", async () => {
    const result = await orchestrator.runAnalysis("Indie Rock & Vins Naturels", {
      bundleSize: 3,
      minMargin: 0.35,
    });

    // 1. Aucune rupture dans les deux branches
    for (const item of result.branchA_without_qloo.items) {
      assert.ok(item.product.stock_units > 0, `Rupture détectée en Branche A: ${item.product.sku}`);
      assert.ok(item.product.margin_pct >= 0.30, `Marge trop basse en Branche A: ${item.product.sku}`);
    }
    for (const item of result.branchB_with_qloo.items) {
      assert.ok(item.product.stock_units > 0, `Rupture détectée en Branche B: ${item.product.sku}`);
      assert.ok(item.product.margin_pct >= 0.30, `Marge trop basse en Branche B: ${item.product.sku}`);
    }
  });

  it("génère une trace de décision agentique auditable", async () => {
    const result = await orchestrator.runAnalysis("Style Minimaliste et Design Japonais");

    assert.ok(result.decision_trace.length >= 4, "La trace doit documenter au moins 4 étapes.");
    assert.ok(
      result.decision_trace.some((t) => t.includes("[Agentic Tool Selection]")),
      "La trace doit mentionner la sélection d'outils."
    );
    assert.ok(
      result.decision_trace.some((t) => t.includes("[Comparaison A/B]")),
      "La trace doit documenter la comparaison A/B."
    );
  });

  it("calcule les deltas métriques entre la branche avec Qloo et la branche témoin", async () => {
    const result = await orchestrator.runAnalysis("Cyberpunk & High-Tech");
    const metrics = result.comparison_metrics;

    assert.ok(typeof metrics.margin_delta_eur === "number");
    assert.ok(typeof metrics.basket_delta_eur === "number");
    assert.ok(typeof metrics.cultural_relevance_delta === "number");
    assert.ok(Array.isArray(metrics.qloo_unique_insights));
    assert.ok(metrics.summary.length > 0);
  });
});
