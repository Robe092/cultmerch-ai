import { z } from "zod";

// --- Types Produit & Catalogue ---
export const ProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.enum([
    "fashion",
    "lifestyle",
    "epicurien",
    "decoration",
    "audio_accessoires",
  ]),
  description: z.string(),
  price_eur: z.number().positive(),
  cost_eur: z.number().positive(),
  stock_units: z.number().int().nonnegative(),
  margin_pct: z.number().min(0).max(1),
  tags_style: z.array(z.string()),
  notes_matieres: z.array(z.string()),
  marques_affinitaires: z.array(z.string()),
  cultural_features: z.array(z.string()).optional(),
  is_synthetic: z.literal(true), // Explicitement étiqueté comme donnée fictive
});

export type Product = z.infer<typeof ProductSchema>;

export const CatalogSchema = z.array(ProductSchema);
export type Catalog = z.infer<typeof CatalogSchema>;

// --- Types API Qloo v2 ---
export const QlooEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
  category: z.string().optional(),
  score: z.number().optional(),
});
export type QlooEntity = z.infer<typeof QlooEntitySchema>;

export const QlooSearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(QlooEntitySchema),
});
export type QlooSearchResponse = z.infer<typeof QlooSearchResponseSchema>;

export const QlooInsightItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(), // ex: 'urn:tag', 'urn:entity:brand', etc.
  affinity_score: z.number().min(0).max(1), // Normalisé 0.0 - 1.0
  category: z.string().optional(),
  score_available: z.boolean().optional(),
});
export type QlooInsightItem = z.infer<typeof QlooInsightItemSchema>;

export type QlooDataState = "LIVE_QLOO" | "CACHED_QLOO" | "MOCK_SIMULATED" | "MIXED_QLOO" | "NO_QLOO";

export interface BriefProfile {
  version: string; concepts: string[]; core_concepts: string[]; excluded_concepts: string[]; required_concepts: string[];
  source: "brief" | "references" | "llm_interpretation" | "unresolved";
}
export interface SemanticMatch {
  concept: string; feature: string; label: string; strength: number; method: "catalog_feature" | "editorial_bridge";
}
export interface CulturalEvidence {
  id: string;
  name: string;
  type: string;
  affinity_score: number;
  score_available: boolean;
  state: QlooDataState;
  anchor_id: string;
  anchor_name: string;
  captured_at: string;
  weight: number;
  match_method?: "catalog_brand" | "exact_tag" | "editorial_translation";
  matched_feature?: string;
  mapping_note?: string;
}

export interface ProductReview {
  status: "pending" | "approved" | "revision";
  notes?: string;
  reviewed_at?: string;
}

export interface AnalysisProvenance {
  qloo_state: QlooDataState;
  planner: string;
  copywriter: string;
  catalog_count: number;
  catalog_is_synthetic: true;
  anchors: { query: string; id: string; name: string; state: QlooDataState; weight: number }[];
  calls: { endpoint: string; state: QlooDataState; count: number; captured_at: string; error?: string }[];
  signals: CulturalEvidence[];
  target_brands?: { query: string; id: string; name: string; state: QlooDataState }[];
}

export const QlooInsightsResponseSchema = z.object({
  state: z.enum(["LIVE_QLOO", "CACHED_QLOO", "MOCK_SIMULATED", "NO_QLOO"]),
  anchor_entity: z.string(),
  filter_type: z.string(),
  captured_at: z.string(), // ISO 8601
  items: z.array(QlooInsightItemSchema),
  raw_response: z.unknown().optional(),
  fallback_reason: z.string().optional(),
});
export type QlooInsightsResponse = z.infer<typeof QlooInsightsResponseSchema>;

// --- Types Scoring & Merchandising ---
export interface MerchandisingScore {
  product: Product;
  affinity_score: number; // A(P) in [0, 1]
  margin_score: number; // M(P) in [0, 1]
  stock_score: number; // S(P) in [0, 1]
  mai_total: number; // Merchandising Affinity Index in [0, 1]
  matched_tags: string[];
  rejection_reason?: string;
  qloo_evidence?: CulturalEvidence[];
  semantic_matches?: string[];
  brief_matches?: SemanticMatch[];
  brief_score?: number;
  qloo_score?: number;
  product_kind?: string;
}

export interface CollectionProposal {
  id: string;
  title: string;
  pitch: string;
  target_audience: string;
  data_state: QlooDataState;
  items: MerchandisingScore[];
  metrics: {
    total_basket_eur: number;
    total_cost_eur?: number;
    total_margin_eur: number;
    average_margin_pct: number;
    average_mai_score: number;
  };
  decision_trace: string[];
  created_at: string;
}

// --- Types Comparateur A/B & Gouvernance HITL ---
export type ApprovalStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export interface ABComparisonResult {
  id: string;
  brief: string;
  branchA_without_qloo: CollectionProposal;
  branchB_with_qloo: CollectionProposal;
  comparison_metrics: {
    qloo_unique_insights: string[];
    cultural_relevance_delta: number;
    margin_delta_eur: number;
    basket_delta_eur: number;
    summary: string;
    changed_skus?: number;
    qloo_alignment_a?: number;
    qloo_alignment_b?: number;
    brief_coverage_a?: number;
    brief_coverage_b?: number;
  };
  status: ApprovalStatus;
  provenance?: AnalysisProvenance;
  request?: AnalyzeRequest;
  brief_profile?: BriefProfile;
  matching_diagnostics?: { financially_eligible: number; relevant_candidates: number; excluded_as_irrelevant: number; targeted_brands: string[] };
  product_reviews?: Record<string, ProductReview>;
  approval_metadata?: {
    reviewed_at?: string;
    notes?: string;
  };
  decision_trace: string[];
  created_at: string;
}

// --- Schémas de Validation d'Entrée API ---
export const AnalyzeRequestSchema = z.object({
  brief: z.string().trim().min(2, "Le brief doit comporter au moins 2 caractères").max(2000),
  seeds: z.array(z.object({
    label: z.string().trim().min(1).max(120),
    domain: z.enum(["Musique", "Cinéma", "Mode", "Art & Design", "Lifestyle", "Édition"]),
    weight: z.enum(["Principal", "Secondaire", "Subtil"]),
  })).max(8).optional().default([]),
  bundleSize: z.number().int().min(1).max(10).optional().default(4),
  minMargin: z.number().min(0).max(1).optional().default(0.35),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const ApproveRequestSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "REQUEST_REVISION"]),
  productSku: z.string().min(1).optional(),
  productNotes: z.record(z.string().max(2000)).optional(),
  notes: z.string().max(2000).optional(),
});
export type ApproveRequest = z.infer<typeof ApproveRequestSchema>;
