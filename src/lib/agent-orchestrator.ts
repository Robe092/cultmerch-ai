import { matchedQlooInsights } from "./analysis-summary";
import { buildBriefProfile, normalizeBrand } from "./cultural-mapping";
import catalogData from "@/data/catalog_sample.json";
import { calculateMerchandisingScores, normalizeSignal, filterEligibleProducts, generateCollectionBundle } from "./inventory-engine";
import { LLMService } from "./llm-service";
import { QlooClient } from "./qloo-client";
import type { ABComparisonResult, AnalyzeRequest, AnalysisProvenance, CollectionProposal, CulturalEvidence, Product, QlooDataState } from "@/types";

export interface OrchestratorOptions {
  bundleSize?: number;
  minMargin?: number;
  seeds?: AnalyzeRequest["seeds"];
  qlooApiKey?: string;
  geminiApiKey?: string;
  mode?: "auto" | "mock_only" | "live_only";
}

export function aggregateQlooState(states: QlooDataState[]): QlooDataState {
  if (!states.length || states.every((state) => state === "NO_QLOO")) return "NO_QLOO";
  return new Set(states).size === 1 ? states[0] : "MIXED_QLOO";
}

export class AgentOrchestrator {
  private qlooClient: QlooClient;
  private llmService: LLMService;
  private catalog = catalogData as Product[];

  constructor(options: OrchestratorOptions = {}) {
    this.qlooClient = new QlooClient({ apiKey: options.qlooApiKey, mode: options.mode || "auto" });
    this.llmService = new LLMService(options.geminiApiKey);
  }

  async runAnalysis(brief: string, options: OrchestratorOptions = {}): Promise<ABComparisonResult> {
    const bundleSize = options.bundleSize ?? 4;
    const minMargin = options.minMargin ?? 0.35;
    const seeds = options.seeds ?? [];
    const trace = [`[Init] Brief : ${brief}`, `[Contraintes Inviolables] Marge >= ${minMargin * 100}%, stock > 0, cible ${bundleSize} SKUs.`];
    const { eligible, excluded } = filterEligibleProducts(this.catalog, { minMargin, minStock: 1 });
    if (!eligible.length) throw new Error(`Aucun produit du catalogue ne respecte le seuil de marge de ${minMargin * 100}% et le stock requis.`);
    const context = seeds.length ? `${brief}\nRéférences d'audience : ${seeds.map((seed) => `${seed.label} (${seed.domain}, ${seed.weight})`).join(" ; ")}` : brief;
    const plan = await this.llmService.analyzeBrief(context);
    trace.push(`[Agentic Tool Selection] ${this.llmService.getExecutionModes().planner} : ancre ${plan.anchor_entity}, outils ${plan.cultural_tools.join(", ")}.`);
    trace.push(`[Agentic Reasoning] ${plan.strategic_reasoning}`);
    const provenance: AnalysisProvenance = {
      qloo_state: "NO_QLOO", ...this.llmService.getExecutionModes(), catalog_count: this.catalog.length,
      catalog_is_synthetic: true, anchors: [], calls: [], signals: [],
    };
    const profile = buildBriefProfile(brief, plan.inferred_vibe_tags, seeds.map((seed) => seed.label));
    const candidateScores = calculateMerchandisingScores(eligible, { profile, qlooSignals: [] });
    const relevant = candidateScores.filter((item) => (item.brief_score || 0) > 0);
    const candidates = relevant.map((item) => item.product);
    trace.push(`[Interprétation] Concepts : ${profile.concepts.join(", ") || "aucun univers reconnu"}. Source : ${profile.source}. ${relevant.length}/${eligible.length} candidats pertinents ; aucun complément par la seule marge.`);
    const byKind = new Map<string, typeof relevant>();
    for (const item of [...relevant].sort((a, b) => b.mai_total - a.mai_total || a.product.sku.localeCompare(b.product.sku))) {
      const kind = item.product_kind || item.product.category;
      byKind.set(kind, [...(byKind.get(kind) || []), item]);
    }
    const ordered: typeof relevant = [];
    for (let index = 0; index < relevant.length; index++) for (const group of byKind.values()) if (group[index]) ordered.push(group[index]);
    const brandQueries = Array.from(new Set(ordered.flatMap((item) => item.product.marques_affinitaires.slice(0, 1)))).slice(0, 12);
    provenance.target_brands = [];
    // Affinités ciblées : interroger les marques réellement présentes dans les candidats.
    await Promise.all(brandQueries.map(async (query) => {
      const response = await this.qlooClient.search(query, "urn:entity:brand");
      provenance.calls.push({ endpoint: `/search catalogue (${query})`, state: response.state, count: response.data.results.length, captured_at: new Date().toISOString(), error: response.fallback_reason });
      const brand = response.data.results.find((entity) => normalizeBrand(entity.name) === normalizeBrand(query));
      if (brand?.id) provenance.target_brands!.push({ query, id: brand.id, name: brand.name, state: response.state });
    }));
    const targetIds = provenance.target_brands.map((brand) => brand.id);
    const queries = new Map<string, number>(candidates.length ? [[plan.anchor_entity, 3]] : []);
    if (candidates.length) for (const seed of seeds) queries.set(seed.label, { Principal: 3, Secondaire: 2, Subtil: 1 }[seed.weight]);
    const tools = Array.from(new Set(["urn:tag", "urn:entity:brand", ...plan.cultural_tools])).slice(0, 3);
    const domainTypes: Record<string, string> = { Musique: "urn:entity:artist", "Cinéma": "urn:entity:movie,urn:entity:tv_show", Mode: "urn:entity:brand", "Art & Design": "urn:entity:brand,urn:entity:person,urn:entity:place", Lifestyle: "urn:entity:brand,urn:entity:place", "Édition": "urn:entity:book" };
    // Chaque appel conserve sa provenance, même après un repli ou une erreur partielle.
    await Promise.all(Array.from(queries, async ([query, weight]) => {
      try {
        const seed = seeds.find((item) => item.label === query);
        const search = await this.qlooClient.search(query, seed ? domainTypes[seed.domain] : undefined);
        provenance.calls.push({ endpoint: `/search (${query})`, state: search.state, count: search.data.results.length, captured_at: new Date().toISOString(), error: search.fallback_reason });
        const normalizedQuery = normalizeSignal(query);
        const words = normalizedQuery.split(" ").filter((word) => word.length > 2);
        const anchor = search.state === "MOCK_SIMULATED" ? search.data.results[0] : search.data.results.find((entity) => normalizeSignal(entity.name) === normalizedQuery)
          || search.data.results.find((entity) => words.length > 0 && words.filter((word) => normalizeSignal(entity.name).split(" ").includes(word)).length / words.length >= 0.6);
        if (!anchor?.id) {
          provenance.calls.push({ endpoint: `Résolution (${query})`, state: "NO_QLOO", count: 0, captured_at: new Date().toISOString(), error: "Aucune correspondance suffisamment proche ; précisez le nom d’un artiste, film ou d’une marque" });
          return;
        }
        provenance.anchors.push({ query, id: anchor.id, name: anchor.name, state: search.state, weight });
        await Promise.all((seed ? ["urn:tag", "urn:entity:brand"] : tools).map(async (tool) => {
          try {
            const response = await this.qlooClient.getInsights(anchor.id, tool, tool === "urn:entity:brand" && targetIds.length ? { entityIds: targetIds } : {});
            provenance.calls.push({ endpoint: `/v2/insights (${anchor.name}, ${tool})`, state: response.state, count: response.items.length, captured_at: response.captured_at, error: response.fallback_reason });
            provenance.signals.push(...response.items.filter((item) => item.name.trim() && (tool !== "urn:entity:brand" || !targetIds.length || targetIds.some((id) => id.toLowerCase() === item.id.toLowerCase()))).map((item): CulturalEvidence => ({
              id: item.id, name: item.name, type: item.type, affinity_score: item.affinity_score,
              score_available: item.score_available ?? true, state: response.state,
              anchor_id: anchor.id, anchor_name: anchor.name, captured_at: response.captured_at, weight,
            })));
          } catch (error) {
            provenance.calls.push({ endpoint: `/v2/insights (${anchor.name}, ${tool})`, state: "NO_QLOO", count: 0, captured_at: new Date().toISOString(), error: error instanceof Error ? error.message : "Appel échoué" });
          }
        }));
      } catch (error) {
        provenance.calls.push({ endpoint: `/search (${query})`, state: "NO_QLOO", count: 0, captured_at: new Date().toISOString(), error: error instanceof Error ? error.message : "Appel échoué" });
      }
    }));
    provenance.qloo_state = aggregateQlooState(provenance.calls.map((call) => call.state));
    trace.push(`[Qloo Insights] ${provenance.signals.length} signaux collectés ; état ${provenance.qloo_state}.`);
    trace.push(`[Filtrage Dur Stock/Marge] ${eligible.length} références éligibles, ${excluded.length} exclues. ${candidates.length} correspondent aussi au brief.`);
    const targetTags = profile.concepts;
    const semanticScores = calculateMerchandisingScores(candidates, { targetTags, profile, qlooSignals: [] });
    const qlooScores = calculateMerchandisingScores(candidates, { targetTags, profile, qlooSignals: provenance.signals });
    const a = generateCollectionBundle(semanticScores, bundleSize);
    const b = generateCollectionBundle(qlooScores, bundleSize);
    const matches = b.items.filter((item) => item.qloo_evidence?.length).length;
    trace.push(`[Matching Qloo] ${matches}/${b.items.length} produits retenus avec correspondance explicite de tag ou marque. Les déductions locales restent séparées.`);
    if (b.items.length < bundleSize) trace.push(`[Catalogue insuffisant] ${b.items.length}/${bundleSize} références disponibles ; aucun assouplissement des contraintes.`);
    const copy = b.items.length ? await this.llmService.generateCapsuleCopy({ brief, culturalTags: targetTags, products: b.items.map(({ product }) => ({ sku: product.sku, name: product.name, category: product.category })) }) : { title: "Aucune sélection suffisamment pertinente", pitch: "Précisez le brief ou élargissez le catalogue. Aucun article n’a été ajouté pour compléter artificiellement la sélection.", sku_justifications: {} };
    provenance.copywriter = this.llmService.getExecutionModes().copywriter;
    const createdAt = new Date().toISOString();
    const proposal = (bundle: typeof a, name: string, title: string, pitch: string, state: QlooDataState): CollectionProposal => ({
      id: `${name}_${crypto.randomUUID()}`, title, pitch, target_audience: brief, data_state: state,
      items: bundle.items, metrics: bundle.metrics, decision_trace: trace.slice(), created_at: createdAt,
    });
    const branchA = proposal(a, "baseline", "Sélection sans Qloo", "Même interprétation du brief, catalogue et contraintes. Aucun signal Qloo ajouté au classement.", "NO_QLOO");
    const branchB = proposal(b, "qloo", copy.title, copy.pitch, provenance.qloo_state);
    const delta = Number((b.metrics.total_margin_eur - a.metrics.total_margin_eur).toFixed(2));
    const changed = b.items.filter((item) => !a.items.some((other) => other.product.sku === item.product.sku)).length;
    const evaluate = (items: typeof a.items) => items.length ? items.reduce((sum, item) => sum + (qlooScores.find((score) => score.product.sku === item.product.sku)?.qloo_score || 0), 0) / items.length : 0;
    const coverage = (items: typeof a.items) => profile.core_concepts.length ? profile.core_concepts.filter((id) => items.some((item) => item.brief_matches?.some((match) => match.concept === id))).length / profile.core_concepts.length : 0;
    const alignmentA = evaluate(a.items);
    const alignmentB = evaluate(b.items);
    const summary = `${changed} référence(s) différente(s) sur ${b.items.length}. Écart de marge théorique : ${delta > 0 ? "+" : ""}${delta.toFixed(2)} €. ${matches} produit(s) avec correspondance Qloo explicite. Catalogue fictif ; aucune vente ou conversion mesurée.`;
    trace.push(`[Comparaison A/B] ${summary}`);
    return {
      id: `analysis_${crypto.randomUUID()}`, brief, branchA_without_qloo: branchA, branchB_with_qloo: branchB,
      comparison_metrics: {
        qloo_unique_insights: matchedQlooInsights(brief, b.items),
        cultural_relevance_delta: Number((alignmentB - alignmentA).toFixed(4)),
        changed_skus: changed, qloo_alignment_a: alignmentA, qloo_alignment_b: alignmentB,
        brief_coverage_a: coverage(a.items), brief_coverage_b: coverage(b.items),
        margin_delta_eur: delta, basket_delta_eur: Number((b.metrics.total_basket_eur - a.metrics.total_basket_eur).toFixed(2)), summary,
      },
      status: "PENDING_REVIEW", provenance, brief_profile: profile,
      matching_diagnostics: { financially_eligible: eligible.length, relevant_candidates: candidates.length, excluded_as_irrelevant: eligible.length - candidates.length, targeted_brands: brandQueries },
      request: { brief, bundleSize, minMargin, seeds },
      product_reviews: Object.fromEntries(b.items.map((item) => [item.product.sku, { status: "pending" as const }])),
      decision_trace: trace, created_at: createdAt,
    };
  }
}
