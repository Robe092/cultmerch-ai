import { matchBrief, matchQlooSignal, normalizeText } from "./cultural-mapping";
import { BriefProfile, CulturalEvidence, MerchandisingScore, Product } from "@/types";

export interface FilterOptions {
  minMargin?: number; // Défaut : 0.35 (35 %)
  minStock?: number; // Défaut : 1 unité
}

export interface FilterResult {
  eligible: Product[];
  excluded: { product: Product; reason: string }[];
}

export interface ScoringWeights {
  affinityWeight?: number; // Défaut : 0.50
  marginWeight?: number; // Défaut : 0.30
  stockWeight?: number; // Défaut : 0.20
}

export interface BundleSummary {
  items: MerchandisingScore[];
  metrics: {
    total_basket_eur: number;
    total_cost_eur: number;
    total_margin_eur: number;
    average_margin_pct: number;
    average_mai_score: number;
  };
}

/**
 * Filtre les produits du catalogue selon les règles strictes de rentabilité et d'inventaire
 */
export function filterEligibleProducts(
  products: Product[],
  options: FilterOptions = {}
): FilterResult {
  const minMargin = options.minMargin ?? 0.35;
  const minStock = options.minStock ?? 1;

  const eligible: Product[] = [];
  const excluded: { product: Product; reason: string }[] = [];

  for (const product of products) {
    if (product.stock_units < minStock) {
      excluded.push({
        product,
        reason: `Rupture d'inventaire (stock=${product.stock_units} < ${minStock})`,
      });
      continue;
    }

    if (product.margin_pct < minMargin) {
      excluded.push({
        product,
        reason: `Marge insuffisante (${(product.margin_pct * 100).toFixed(1)}% < ${(minMargin * 100).toFixed(1)}%)`,
      });
      continue;
    }

    eligible.push(product);
  }

  return { eligible, excluded };
}

/** Matching explicite de tags et marques ; aucune inférence sémantique attribuée à Qloo. */
export function normalizeSignal(value: string): string {
  return normalizeText(value);
}
export function calculateMerchandisingScores(
  products: Product[],
  provisionalSignals: { targetTags?: string[]; qlooSignals?: CulturalEvidence[]; profile?: BriefProfile } = {},
  weights: ScoringWeights = {}
): MerchandisingScore[] {
  const wA = weights.affinityWeight ?? 0.5;
  const wM = weights.marginWeight ?? 0.3;
  const wS = weights.stockWeight ?? 0.2;
  const targetTags = (provisionalSignals.targetTags || []).map((t) => t.toLowerCase());

  return products.map((product) => {
    // 1. Calcul d'affinité provisoire (ratio de tags correspondants)
    let matchedTags: string[] = [];
    let affinityScore = 0.5; // Neutre par défaut si aucun tag cible

    if (targetTags.length > 0) {
      const productTags = product.tags_style.map((t) => t.toLowerCase());
      matchedTags = productTags.filter((t) => targetTags.includes(t));
      affinityScore = Math.min(1.0, matchedTags.length / Math.min(targetTags.length, 3));
    }

    const profile = provisionalSignals.profile;
    const briefMatches = profile ? matchBrief(product, profile) : [];
    const qlooEvidence = (provisionalSignals.qlooSignals || []).flatMap((signal) => {
      const match = matchQlooSignal(product, signal);
      return match ? [match] : [];
    });
    // Un signal sans score est visible comme preuve de correspondance, sans score inventé.
    const strengths = new Map<string, number>();
    for (const signal of qlooEvidence) {
      const key = normalizeSignal(signal.name);
      strengths.set(key, Math.max(strengths.get(key) || 0, (signal.score_available ? signal.affinity_score : 0) * signal.weight / 3));
    }
    const qlooStrength = Math.min(1, Math.max(0, ...strengths.values()));
    if (provisionalSignals.qlooSignals) {
      affinityScore = Math.min(1, affinityScore * 0.4 + qlooStrength * 0.6);
    }

    const covered = new Set(briefMatches.map((match) => match.concept));
    const coreCoverage = profile?.core_concepts.length ? profile.core_concepts.filter((id) => covered.has(id)).length / profile.core_concepts.length : 0;
    const briefScore = briefMatches.length ? 0.7 * Math.max(...briefMatches.map((match) => match.strength)) + 0.3 * coreCoverage : 0;

    // 2. Normalisation de la marge M(P) dans l'intervalle [0, 1] (borne min 0.35, max 0.85)
    const marginScore = Math.max(0, Math.min(1, (product.margin_pct - 0.35) / (0.85 - 0.35)));

    // 3. Normalisation du stock S(P) dans [0, 1] (plafond à 50 unités)
    const stockScore = Math.min(1.0, product.stock_units / 50);

    // 4. Calcul déterministe du MAI pondéré
    const maiTotal = Number((profile
      ? 0.55 * briefScore + 0.25 * qlooStrength + 0.12 * marginScore + 0.08 * stockScore
      : wA * affinityScore + wM * marginScore + wS * stockScore).toFixed(4));

    return {
      product,
      affinity_score: Number(affinityScore.toFixed(4)),
      margin_score: Number(marginScore.toFixed(4)),
      stock_score: Number(stockScore.toFixed(4)),
      mai_total: maiTotal,
      matched_tags: matchedTags,
      semantic_matches: profile ? briefMatches.map((match) => match.label) : matchedTags,
      brief_matches: briefMatches,
      brief_score: profile ? Number(briefScore.toFixed(4)) : undefined,
      qloo_score: Number(qlooStrength.toFixed(4)),
      product_kind: product.cultural_features?.find((id) => ["denim", "ceramics", "coffee", "analog-audio", "skincare", "stationery", "cinema", "techwear", "wine", "spirits", "home-decor"].includes(id)) || product.category,
      qloo_evidence: qlooEvidence,
    };
  });
}

/**
 * Assemblage de la collection capsule optimisée (Top N par score MAI décroissant)
 */
export function generateCollectionBundle(
  scoredProducts: MerchandisingScore[],
  bundleSize: number = 4
): BundleSummary {
  // Tri déterministe : MAI décroissant, puis prix décroissant pour départager
  const sorted = [...scoredProducts].sort((a, b) => {
    if (b.mai_total !== a.mai_total) {
      return b.mai_total - a.mai_total;
    }
    return b.product.price_eur - a.product.price_eur;
  });

  const profileMode = sorted.some((item) => item.brief_score !== undefined);
  const selected: MerchandisingScore[] = [];
  const remaining = profileMode ? sorted.filter((item) => (item.brief_score || 0) > 0) : sorted;
  const covered = new Set<string>();
  const kinds = new Set<string>();
  while (selected.length < bundleSize && remaining.length) {
    const adjusted = (item: MerchandisingScore) => item.mai_total + (profileMode ?
      Math.min(0.18, (item.brief_matches || []).filter((match) => !covered.has(match.concept)).length * 0.09)
      + (kinds.has(item.product_kind || "") ? 0 : 0.025) : 0);
    remaining.sort((a, b) => adjusted(b) - adjusted(a) || b.mai_total - a.mai_total || a.product.sku.localeCompare(b.product.sku));
    const next = remaining.shift()!;
    selected.push(next);
    next.brief_matches?.forEach((match) => covered.add(match.concept));
    kinds.add(next.product_kind || "");
  }

  const totalBasket = selected.reduce((acc, item) => acc + item.product.price_eur, 0);
  const totalCost = selected.reduce((acc, item) => acc + item.product.cost_eur, 0);
  const totalMarginEur = totalBasket - totalCost;
  const avgMarginPct = totalBasket > 0 ? totalMarginEur / totalBasket : 0;
  const avgMaiScore =
    selected.length > 0
      ? selected.reduce((acc, item) => acc + item.mai_total, 0) / selected.length
      : 0;

  return {
    items: selected,
    metrics: {
      total_basket_eur: Number(totalBasket.toFixed(2)),
      total_cost_eur: Number(totalCost.toFixed(2)),
      total_margin_eur: Number(totalMarginEur.toFixed(2)),
      average_margin_pct: Number(avgMarginPct.toFixed(4)),
      average_mai_score: Number(avgMaiScore.toFixed(4)),
    },
  };
}
