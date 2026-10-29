import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AgentOrchestrator, aggregateQlooState } from "../lib/agent-orchestrator";
import { calculateMerchandisingScores } from "../lib/inventory-engine";
import { AnalysisStore } from "../lib/analysis-store";
import { QlooClient } from "../lib/qloo-client";
import { LLMService } from "../lib/llm-service";
import { AnalyzeRequestSchema, type CulturalEvidence, type Product } from "../types";

const signal = (patch: Partial<CulturalEvidence> = {}): CulturalEvidence => ({
  id: "tag-a", name: "minimalist", type: "urn:tag", affinity_score: 0.9, score_available: true,
  state: "LIVE_QLOO", anchor_id: "artist-a", anchor_name: "Artist A", captured_at: "2026-10-16T12:00:00Z", weight: 3, ...patch,
});
const product = (sku: string, tag: string, brand = ""): Product => ({
  sku, name: sku, category: "fashion", description: "Test", price_eur: 100, cost_eur: 40, margin_pct: 0.6, stock_units: 20,
  tags_style: [tag], notes_matieres: [], marques_affinitaires: [brand], is_synthetic: true,
});

describe("Provenance, effet Qloo et décisions par référence", () => {
  it("ne classe jamais un mélange live/mock ou une panne partielle comme live", () => {
    assert.equal(aggregateQlooState(["LIVE_QLOO", "MOCK_SIMULATED"]), "MIXED_QLOO");
    assert.equal(aggregateQlooState(["LIVE_QLOO", "NO_QLOO"]), "MIXED_QLOO");
    assert.equal(aggregateQlooState([]), "NO_QLOO");
  });
  it("le score Qloo et la priorité influencent réellement le classement, y compris pour une marque", () => {
    const products = [product("a", "minimalist"), product("b", "other", "Acne Studios")];
    const ranked = calculateMerchandisingScores(products, { qlooSignals: [signal({ weight: 1 }), signal({ name: "Acne Studios", type: "urn:entity:brand", weight: 3, affinity_score: 0.8 })] });
    assert.ok(ranked[1].mai_total > ranked[0].mai_total);
    assert.equal(ranked[1].qloo_evidence?.[0].name, "Acne Studios");
    const reversed = calculateMerchandisingScores(products, { qlooSignals: [signal({ weight: 3 }), signal({ name: "Acne Studios", type: "urn:entity:brand", weight: 1, affinity_score: 0.8 })] });
    assert.ok(reversed[0].mai_total > reversed[1].mai_total);
  });
  it("n’attribue aucun bonus à un score absent et ne double pas un signal répété", () => {
    const p = [product("a", "minimalist")];
    const score = (signals: CulturalEvidence[]) => calculateMerchandisingScores(p, { qlooSignals: signals })[0].mai_total;
    assert.equal(score([signal(), signal()]), score([signal()]));
    assert.equal(score([signal({ score_available: false })]), score([]));
  });
  it("préserve le diagnostic exact lors d’un appel d’affinités simulé après une recherche live", async (t) => {
    const queries: string[] = [];
    t.mock.method(QlooClient.prototype, "search", async (query: string) => { queries.push(query); return { state: "LIVE_QLOO", data: { query, results: [{ id: "entity", name: query }] } }; });
    t.mock.method(QlooClient.prototype, "getInsights", async () => ({ state: "MOCK_SIMULATED", captured_at: new Date().toISOString(), items: [{ id: "tag", name: "minimalist", type: "urn:tag", affinity_score: 0.9 }] }));
    t.mock.method(LLMService.prototype, "analyzeBrief", async () => ({ anchor_entity: "Daft Punk", cultural_tools: ["urn:tag"], strategic_reasoning: "Test", inferred_vibe_tags: ["minimalist"] }));
    t.mock.method(LLMService.prototype, "generateCapsuleCopy", async () => ({ title: "Test", pitch: "Test", sku_justifications: {} }));
    const result = await new AgentOrchestrator({ mode: "mock_only" }).runAnalysis("Capsule test", { seeds: [{ label: "Aesop", domain: "Mode", weight: "Subtil" }] });
    assert.ok(queries.includes("Aesop"));
    assert.equal(result.branchB_with_qloo.data_state, "MIXED_QLOO");
    assert.ok(result.provenance?.signals.every((item) => item.state === "MOCK_SIMULATED"));
    assert.ok(Object.values(result.product_reviews || {}).every((review) => review.status === "pending"));
  });
  it("affiche un résultat neutre si Qloo ne correspond à aucun produit", async (t) => {
    t.mock.method(QlooClient.prototype, "search", async () => ({ state: "LIVE_QLOO", data: { query: "Test", results: [{ id: "entity", name: "Test" }] } }));
    t.mock.method(QlooClient.prototype, "getInsights", async () => ({ state: "LIVE_QLOO", captured_at: new Date().toISOString(), items: [] }));
    const result = await new AgentOrchestrator({ mode: "mock_only" }).runAnalysis("Capsule Synthwave");
    assert.equal(result.comparison_metrics.margin_delta_eur, 0);
    assert.deepEqual(result.branchA_without_qloo.items.map((item) => item.product.sku), result.branchB_with_qloo.items.map((item) => item.product.sku));
    assert.ok(result.comparison_metrics.summary.includes("0 référence(s) différente(s)"));
  });
  it("l’approbation d’une pièce n’approuve pas les autres et une révision révoque l’approbation globale", async () => {
    const result = await new AgentOrchestrator({ mode: "mock_only" }).runAnalysis("Synthwave");
    const store = new AnalysisStore();
    store.save(result);
    const first = result.branchB_with_qloo.items[0].product.sku;
    const updated = store.updateProductReview(result.id, first, "approved", "Pièce validée");
    assert.equal(updated?.status, "PENDING_REVIEW");
    assert.equal(Object.values(updated?.product_reviews || {}).filter((review) => review.status === "approved").length, 1);
    store.updateStatus(result.id, "APPROVED");
    assert.equal(store.updateProductReview(result.id, first, "revision", "À corriger")?.status, "REJECTED");
    assert.equal(store.updateProductReview(result.id, "unknown-sku", "approved"), undefined);
  });
  it("écarte une entité sans rapport au lieu de l’utiliser comme ancre", async (t) => {
    t.mock.method(QlooClient.prototype, "search", async () => ({ state: "LIVE_QLOO", data: { query: "Synthétiseurs Modulaires", results: [{ id: "unrelated", name: "Domaine de maisons modulaires Deux-Montagnes" }] } }));
    const insight = t.mock.method(QlooClient.prototype, "getInsights", async () => { throw new Error("Ne doit pas être appelé"); });
    t.mock.method(LLMService.prototype, "analyzeBrief", async () => ({ anchor_entity: "Synthétiseurs Modulaires", cultural_tools: ["urn:tag"], strategic_reasoning: "Test", inferred_vibe_tags: [] }));
    const result = await new AgentOrchestrator({ mode: "mock_only" }).runAnalysis("Modular music");
    assert.equal(insight.mock.callCount(), 0);
    assert.equal(result.provenance?.anchors.length, 0);
    assert.ok(result.provenance?.calls.some((call) => call.error?.includes("Aucune correspondance")));
  });
  it("un échec live ne remplace pas les affinités par des fixtures", async (t) => {
    t.mock.method(globalThis, "fetch", async () => new Response("Unavailable", { status: 503 }));
    const client = new QlooClient({ apiKey: "test-key", mode: "auto" });
    const result = await client.getInsights("real-id");
    assert.equal(result.state, "NO_QLOO");
    assert.equal(result.items.length, 0);
    assert.ok(result.fallback_reason?.includes("503"));
  });
  it("valide et borne les références transmises", () => {
    assert.equal(AnalyzeRequestSchema.safeParse({ brief: "Test", seeds: [{ label: "Aesop", domain: "Mode", weight: "Principal" }] }).success, true);
    assert.equal(AnalyzeRequestSchema.safeParse({ brief: "Test", seeds: [{ label: "Aesop", domain: "Mode", weight: "unbounded" }] }).success, false);
    assert.equal(AnalyzeRequestSchema.safeParse({ brief: "Test", seeds: Array(9).fill({ label: "Aesop", domain: "Mode", weight: "Principal" }) }).success, false);
  });
});
