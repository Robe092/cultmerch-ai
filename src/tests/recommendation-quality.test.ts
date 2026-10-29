import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildBriefProfile, matchBrief, matchQlooSignal } from "../lib/cultural-mapping";
import { calculateMerchandisingScores, filterEligibleProducts, generateCollectionBundle } from "../lib/inventory-engine";
import { QlooClient } from "../lib/qloo-client";
import { AgentOrchestrator } from "../lib/agent-orchestrator";
import { LLMService } from "../lib/llm-service";
import catalog from "../data/catalog_sample.json";
import cases from "../data/evaluation_cases.json";
import type { Product, CulturalEvidence } from "../types";
const products = catalog as Product[];
const signal: CulturalEvidence = { id: "test-signal", name: "Japanese", type: "urn:tag:genre:place", affinity_score: 0.98, score_available: true, state: "MOCK_SIMULATED", anchor_id: "test-anchor", anchor_name: "Test", captured_at: "2026-10-16T00:00:00Z", weight: 3 };

describe("Pertinence culturelle et comparaison sur une échelle commune", () => {
  for (const scenario of cases) it(`sélection adaptée : ${scenario.id}`, async () => {
    const result = await new AgentOrchestrator({ mode: "mock_only" }).runAnalysis(scenario.brief);
    for (const branch of [result.branchA_without_qloo, result.branchB_with_qloo]) {
      assert.ok(branch.items.length <= scenario.maximum_items);
      assert.ok(branch.items.filter((item) => scenario.expected_skus.includes(item.product.sku)).length >= scenario.minimum_expected);
      assert.ok(branch.items.every((item) => !scenario.forbidden_skus.includes(item.product.sku)));
      assert.ok(branch.items.every((item) => item.product.margin_pct >= 0.35 && item.product.stock_units > 0));
    }
  });
  it("comprend les équivalents français et anglais sans dépendre du LLM", () => {
    const fr = buildBriefProfile("Jazz, denim brut, céramique japonaise artisanale");
    const en = buildBriefProfile("Jazz, raw denim, Japanese design, handmade ceramics craft");
    assert.deepEqual(new Set(fr.core_concepts), new Set(en.core_concepts));
    const matched = (profile: typeof fr) => products.filter((item) => matchBrief(item, profile).length).map((item) => item.sku);
    assert.deepEqual(matched(fr), matched(en));
  });
  it("une déduction LLM cosmétique ne remplace pas un brief jazz/denim", () => {
    const profile = buildBriefProfile("Jazz et denim", ["skincare", "minimalist"]);
    assert.equal(matchBrief(products.find((item) => item.sku === "SKU-SYNTH-041")!, profile).length, 0);
    assert.ok(matchBrief(products.find((item) => item.sku === "SKU-SYNTH-032")!, profile).length > 0);
  });
  it("respecte les exclusions et les demandes de produits exclusivement", () => {
    const profile = buildBriefProfile("Gastronomie artisanale sans alcool et sans cosmétiques");
    for (const item of products.filter((item) => matchBrief(item, profile).length)) {
      assert.ok(!item.cultural_features?.some((id) => ["wine", "spirits", "beer", "skincare"].includes(id)));
    }
    const only = buildBriefProfile("Uniquement du denim japonais");
    assert.deepEqual(products.filter((item) => matchBrief(item, only).length).map((item) => item.sku), ["SKU-SYNTH-032", "SKU-SYNTH-042"]);
  });
  it("ne transforme ni une cuisine japonaise ni une carte bancaire en esthétique produit", () => {
    const ceramic = products.find((item) => item.sku === "SKU-SYNTH-036")!;
    assert.equal(matchQlooSignal(ceramic, signal), undefined);
    assert.equal(matchQlooSignal(ceramic, { ...signal, name: "JCB", type: "urn:tag:credit_card:place" }), undefined);
    const coffee = products.find((item) => item.sku === "SKU-SYNTH-014")!;
    const mapped = matchQlooSignal(coffee, { ...signal, name: "Cafe" });
    assert.equal(mapped?.match_method, "editorial_translation");
    assert.ok(mapped?.mapping_note?.includes("locale"));
  });
  it("un signal skincare très fort ne fait pas entrer un cosmétique dans la sélection jazz", () => {
    const eligible = filterEligibleProducts(products).eligible;
    const scored = calculateMerchandisingScores(eligible, { profile: buildBriefProfile("Jazz et denim brut"), qlooSignals: [{ ...signal, name: "Aesop", type: "urn:entity:brand", affinity_score: 1 }] });
    const selected = generateCollectionBundle(scored, 4);
    assert.ok(selected.items.every((item) => !["SKU-SYNTH-031", "SKU-SYNTH-041"].includes(item.product.sku)));
  });
  it("aucun article n’est inventé pour remplir une demande absente du catalogue", async (t) => {
    const search = t.mock.method(QlooClient.prototype, "search");
    t.mock.method(LLMService.prototype, "analyzeBrief", async () => ({ anchor_entity: "Squash", cultural_tools: ["urn:tag"], inferred_vibe_tags: ["techwear"], strategic_reasoning: "Test" }));
    const result = await new AgentOrchestrator({ mode: "mock_only" }).runAnalysis("Uniquement des raquettes de squash professionnelles");
    assert.equal(result.branchB_with_qloo.items.length, 0);
    assert.equal(result.status, "PENDING_REVIEW");
    assert.equal(search.mock.callCount(), 0);
  });
  it("transmet à Qloo les identifiants des marques du catalogue à évaluer", async (t) => {
    let called: URL | undefined;
    t.mock.method(globalThis, "fetch", async (url: string) => { called = new URL(url); return new Response(JSON.stringify({ results: { entities: [] } }), { status: 200 }); });
    await new QlooClient({ apiKey: "test-key", mode: "live_only" }).getInsights("anchor", "urn:entity:brand", { entityIds: ["brand-a", "brand-b"] });
    assert.equal(called?.searchParams.get("filter.results.entities"), "brand-a,brand-b");
    assert.equal(called?.searchParams.get("take"), "50");
  });
  it("calcule l’écart culturel en évaluant les deux sélections avec les mêmes signaux", async () => {
    const result = await new AgentOrchestrator({ mode: "mock_only" }).runAnalysis("Cyberpunk synthwave");
    const scores = calculateMerchandisingScores(filterEligibleProducts(products).eligible, { profile: result.brief_profile!, qlooSignals: result.provenance!.signals });
    const evaluate = (items: typeof result.branchB_with_qloo.items) => items.reduce((total, item) => total + (scores.find((score) => score.product.sku === item.product.sku)?.qloo_score || 0), 0) / items.length;
    const a = evaluate(result.branchA_without_qloo.items);
    const b = evaluate(result.branchB_with_qloo.items);
    assert.equal(result.comparison_metrics.cultural_relevance_delta, Number((b - a).toFixed(4)));
  });
});
