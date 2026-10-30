import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("🚀 Parcours Utilisateur End-to-End & Intégration API HTTP", () => {
  const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

  it("Étape 1 : Chargement de la page racine (SSR + Hydratation)", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("CultMerch AI"), "La page doit contenir le titre de l'application");
    assert.ok(html.includes("antialiased bg-[#F9FAFB]"), "Le style de fond de l'interface doit être présent");
  });

  let createdAnalysisId = "";

  it("Étape 2 : Saisie d'un brief en langage naturel & analyse agentique", async () => {
    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brief: "Festival Techno Underground - Capsule inspirée de l'architecture brutaliste et du design suisse",
        bundleSize: 4,
        minMargin: 0.38,
      }),
    });

    assert.equal(res.status, 201, `Statut attendu 201, reçu ${res.status}`);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.id, "Un identifiant d'analyse doit être retourné");
    createdAnalysisId = json.data.id;

    // Vérifier la structure A/B
    assert.ok(json.data.branchA_without_qloo);
    assert.ok(json.data.branchB_with_qloo);
    assert.equal(json.data.branchA_without_qloo.items.length, 4);
    assert.equal(json.data.branchB_with_qloo.items.length, 4);

    // Vérifier le respect strict des contraintes
    for (const item of json.data.branchB_with_qloo.items) {
      assert.ok(item.product.margin_pct >= 0.38);
      assert.ok(item.product.stock_units >= 1);
    }

    // Vérifier la trace de décision de l'agent
    assert.ok(json.data.decision_trace.some((step: string) => step.includes("[Matching Qloo]")));
    assert.ok(json.data.comparison_metrics);
  });

  it("bloque l’export avant validation et conserve les décisions par référence", async () => {
    const before = await fetch(`${baseUrl}/api/export/${createdAnalysisId}?format=json`);
    assert.equal(before.status, 409);
    const analysis = await (await fetch(`${baseUrl}/api/analysis/${createdAnalysisId}`)).json();
    const sku = analysis.data.branchB_with_qloo.items[0].product.sku;
    const review = await fetch(`${baseUrl}/api/collection/${createdAnalysisId}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE", productSku: sku, notes: "Une seule pièce approuvée" }),
    });
    assert.equal(review.status, 200);
    const updated = await review.json();
    assert.equal(updated.data.status, "PENDING_REVIEW");
    assert.equal(Object.values(updated.data.product_reviews).filter((item: any) => item.status === "approved").length, 1);
    assert.equal((await fetch(`${baseUrl}/api/export/${createdAnalysisId}?format=csv`)).status, 409);
  });

  it("Étape 3 : Consultation de l'analyse créée via GET /api/analysis/[id]", async () => {
    assert.ok(createdAnalysisId, "L'analyse doit exister");
    const res = await fetch(`${baseUrl}/api/analysis/${createdAnalysisId}`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.id, createdAnalysisId);
    assert.equal(json.data.status, "PENDING_REVIEW");
  });

  it("Étape 4 : Validation humaine HITL via POST /api/collection/[id]/approve", async () => {
    assert.ok(createdAnalysisId);
    const res = await fetch(`${baseUrl}/api/collection/${createdAnalysisId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "APPROVE",
        notes: "Bon à tirer validé par le Responsable Merchandising.",
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, "APPROVED");
    assert.equal(
      json.data.approval_metadata?.notes,
      "Bon à tirer validé par le Responsable Merchandising."
    );
  });

  it("Étape 5 : Export E-Commerce JSON via GET /api/export/[id]?format=json", async () => {
    assert.ok(createdAnalysisId);
    const res = await fetch(`${baseUrl}/api/export/${createdAnalysisId}?format=json`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.format, "json");
    assert.equal(json.data.status, "APPROVED");
    assert.equal(json.data.products.length, 4);

    for (const p of json.data.products) {
      assert.ok(p.sku);
      assert.ok(p.title);
      assert.ok(p.price > 0);
      assert.ok(p.margin_pct >= 0.38);
    }
  });

  it("Étape 6 : Export Grille Logistique CSV via GET /api/export/[id]?format=csv", async () => {
    assert.ok(createdAnalysisId);
    const res = await fetch(`${baseUrl}/api/export/${createdAnalysisId}?format=csv`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type")?.includes("text/csv"), true);

    const csvText = await res.text();
    const lines = csvText.trim().split("\n");
    assert.equal(lines[0], "SKU,Name,Category,PriceEUR,MarginPct,Stock,ScoreMAI");
    assert.equal(lines.length, 5); // 1 ligne entête + 4 lignes produits
  });

  it("Tests de garde négatifs : entrées invalides & 404 gérées proprement", async () => {
    // 1. Brief vide -> 400
    const resEmpty = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: "" }),
    });
    assert.equal(resEmpty.status, 400);

    // 2. Marge invalide (> 1.0) -> 400
    const resInvalidMargin = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: "Test", minMargin: 2.5 }),
    });
    assert.equal(resInvalidMargin.status, 400);

    // 3. ID inexistant pour approbation -> 404
    const resApprove404 = await fetch(`${baseUrl}/api/collection/inexistant_999/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE" }),
    });
    assert.equal(resApprove404.status, 404);

    // 4. ID inexistant pour export -> 404
    const resExport404 = await fetch(`${baseUrl}/api/export/inexistant_999?format=json`);
    assert.equal(resExport404.status, 404);
  });
});
