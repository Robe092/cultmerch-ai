import {
  QlooDataState,
  QlooEntity,
  QlooInsightItem,
  QlooInsightsResponse,
  QlooSearchResponse,
} from "@/types";

// File partagée par les requêtes du serveur : éviter les rafales sur la clé hackathon.
let requestQueue: Promise<unknown> = Promise.resolve();
let nextRequestAt = 0;
async function qlooFetch(url: string, init: RequestInit): Promise<Response> {
  const run = async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const delay = Math.max(0, nextRequestAt - Date.now());
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
      nextRequestAt = Date.now() + 300;
      if (response.status !== 429 || attempt === 1) return response;
      const retryAfter = Number(response.headers.get("retry-after"));
      nextRequestAt = Date.now() + Math.min(2000, Math.max(1000, Number.isFinite(retryAfter) ? retryAfter * 1000 : 1000));
    }
    throw new Error("Qloo indisponible");
  };
  const request = requestQueue.then(run, run);
  requestQueue = request.then(() => undefined, () => undefined);
  return request;
}

export interface QlooClientConfig {
  apiKey?: string;
  baseUrl?: string;
  mode?: "auto" | "mock_only" | "live_only";
}

export class QlooClient {
  private apiKey: string | undefined;
  private baseUrl: string;
  private mode: "auto" | "mock_only" | "live_only";

  constructor(config: QlooClientConfig = {}) {
    this.apiKey = config.apiKey || process.env.QLOO_API_KEY;
    this.baseUrl = config.baseUrl || "https://hackathon.api.qloo.com";
    this.mode = config.mode || "auto";

    // Sécurité Production : Interdiction absolue de basculer silencieusement en MOCK en production (sauf dérogation explicite QLOO_MOCK_FALLBACK_ALLOWED)
    const isProduction = process.env.NODE_ENV === "production";
    const allowMockFallback = process.env.QLOO_MOCK_FALLBACK_ALLOWED === "true";
    if (isProduction && !this.apiKey && this.mode !== "mock_only" && !allowMockFallback) {
      throw new Error(
        "[QlooClient Sécurité] En production, l'absence de QLOO_API_KEY est interdite. " +
          "Le basculement silencieux vers le mode MOCK est bloqué pour garantir la transparence."
      );
    }
  }

  /**
   * Résolution d'entité culturelle via GET /search
   */
  async search(query: string, types?: string): Promise<{ state: QlooDataState; data: QlooSearchResponse; fallback_reason?: string }> {
    if (!query || query.trim() === "") {
      throw new Error("Le paramètre query ne peut pas être vide.");
    }

    // Mode simulation mock explicite
    if (this.mode === "mock_only" || (!this.apiKey && this.mode === "auto")) {
      return {
        state: "MOCK_SIMULATED",
        data: this.getMockSearchResponse(query),
      };
    }

    if (!this.apiKey) {
      throw new Error("Clé API Qloo manquante (QLOO_API_KEY). Impossible d'exécuter l'appel en direct.");
    }

    try {
      const url = new URL("/search", this.baseUrl);
      url.searchParams.set("query", query);
      if (types) url.searchParams.set("types", types);

      const response = await qlooFetch(url.toString(), {
        signal: AbortSignal.timeout(8000),
        method: "GET",
        headers: {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Échec API Qloo /search: HTTP ${response.status} (${response.statusText})`
        );
      }

      const raw = await response.json();
      const rawResults = Array.isArray(raw?.results) ? raw.results : [];
      const results: QlooEntity[] = rawResults.map((r: any) => ({
        id: String(r.entity_id || r.id || ""),
        name: String(r.name || r.title || query),
        type: Array.isArray(r.types) ? String(r.types[0]) : r.type ? String(r.type) : undefined,
        category: r.category ? String(r.category) : undefined,
        score:
          typeof r.popularity === "number"
            ? r.popularity
            : typeof r.score === "number"
            ? r.score
            : undefined,
      }));

      return {
        state: "LIVE_QLOO",
        data: {
          query,
          results,
        },
      };
    } catch (error: any) {
      if (this.mode === "live_only") {
        throw error;
      }
      console.warn(`[QlooClient] Recherche indisponible: ${error.message}`);
      return {
        state: "NO_QLOO",
        data: { query, results: [] },
        fallback_reason: error.message,
      };
    }
  }

  /**
   * Extraction d'affinités culturelles via GET /v2/insights
   */
  async getInsights(
    entityId: string,
    filterType: string = "urn:tag",
    options: { entityIds?: string[] } = {}
  ): Promise<QlooInsightsResponse> {
    if (!entityId || entityId.trim() === "") {
      throw new Error("Le paramètre entityId est requis.");
    }

    // Mode simulation mock explicite
    if (this.mode === "mock_only" || (!this.apiKey && this.mode === "auto")) {
      return this.getMockInsightsResponse(entityId, filterType);
    }

    if (!this.apiKey) {
      throw new Error("Clé API Qloo manquante (QLOO_API_KEY). Impossible d'exécuter l'appel en direct.");
    }

    try {
      const url = new URL("/v2/insights", this.baseUrl);
      url.searchParams.set("signal.interests.entities", entityId);
      url.searchParams.set("filter.type", filterType);
      url.searchParams.set("take", "50");
      if (options.entityIds?.length) {
        url.searchParams.set("filter.results.entities", options.entityIds.join(","));
        url.searchParams.set("feature.explainability", "true");
      }

      const response = await qlooFetch(url.toString(), {
        signal: AbortSignal.timeout(8000),
        method: "GET",
        headers: {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Échec API Qloo /v2/insights: HTTP ${response.status} (${response.statusText})`
        );
      }

      const raw = await response.json();
      let rawItems: any[] = [];
      if (raw?.results?.tags && Array.isArray(raw.results.tags)) {
        rawItems = raw.results.tags;
      } else if (raw?.results?.entities && Array.isArray(raw.results.entities)) {
        rawItems = raw.results.entities;
      } else if (Array.isArray(raw?.results)) {
        rawItems = raw.results;
      } else if (Array.isArray(raw?.items || raw?.data)) {
        rawItems = raw.items || raw.data;
      }

      const items: QlooInsightItem[] = rawItems.map((item: any) => {
        const rawScore =
          typeof item.query?.affinity === "number"
            ? item.query.affinity
            : typeof item.affinity === "number"
            ? item.affinity
            : typeof item.score === "number"
            ? item.score
            : undefined;
        const normalizedScore = Math.max(0, Math.min(1, rawScore === undefined ? 0 : rawScore > 1 ? rawScore / 100 : rawScore));
        return {
          id: String(item.tag_id || item.entity_id || item.id || ""),
          name: String(item.name || item.label || item.tag || ""),
          type: String(
            item.subtype ||
            (Array.isArray(item.types) ? item.types[0] : item.type) ||
            filterType
          ),
          affinity_score: normalizedScore,
          score_available: rawScore !== undefined,
          category: item.category ? String(item.category) : undefined,
        };
      });

      return {
        state: "LIVE_QLOO",
        anchor_entity: entityId,
        filter_type: filterType,
        captured_at: new Date().toISOString(),
        items,
        raw_response: raw,
      };
    } catch (error: any) {
      if (this.mode === "live_only") {
        throw error;
      }
      console.warn(`[QlooClient] Appel direct /v2/insights échoué: ${error.message}`);
      return { state: "NO_QLOO", anchor_entity: entityId, filter_type: filterType,
        captured_at: new Date().toISOString(), items: [], fallback_reason: error.message };
    }
  }

  // --- Mocks Étiquetés & Documentés (Utilisés uniquement sans clé en dev ou en mock_only) ---
  private getMockSearchResponse(query: string): QlooSearchResponse {
    const q = query.toLowerCase();
    let mockResults: QlooEntity[] = [];

    if (q.includes("synthwave") || q.includes("daft punk") || q.includes("kavinsky")) {
      mockResults = [
        { id: "ent_daft_punk_001", name: "Daft Punk", type: "urn:entity:artist", category: "music" },
        { id: "ent_kavinsky_002", name: "Kavinsky", type: "urn:entity:artist", category: "music" },
      ];
    } else if (q.includes("cyberpunk") || q.includes("blade runner")) {
      mockResults = [
        { id: "ent_blade_runner_001", name: "Blade Runner 2049", type: "urn:entity:movie", category: "film" },
      ];
    } else {
      mockResults = [
        { id: `ent_generic_${encodeURIComponent(query)}`, name: query, type: "urn:entity:topic" },
      ];
    }

    return { query, results: mockResults };
  }

  private getMockInsightsResponse(entityId: string, filterType: string): QlooInsightsResponse {
    let mockItems: QlooInsightItem[] = [];

    if (filterType === "urn:tag") {
      mockItems = [
        { id: "tag_synthwave", name: "synthwave", type: "urn:tag", affinity_score: 0.94 },
        { id: "tag_neonoir", name: "neo-noir", type: "urn:tag", affinity_score: 0.88 },
        { id: "tag_minimalist", name: "minimalist", type: "urn:tag", affinity_score: 0.81 },
        { id: "tag_japan", name: "japan-chic", type: "urn:tag", affinity_score: 0.76 },
        { id: "tag_craft", name: "craft", type: "urn:tag", affinity_score: 0.72 },
        { id: "tag_vintage80s", name: "vintage-80s", type: "urn:tag", affinity_score: 0.69 },
      ];
    } else if (filterType === "urn:entity:brand") {
      mockItems = [
        { id: "brand_teenage", name: "Teenage Engineering", type: "urn:entity:brand", affinity_score: 0.91 },
        { id: "brand_aesop", name: "Aesop", type: "urn:entity:brand", affinity_score: 0.84 },
        { id: "brand_acne", name: "Acne Studios", type: "urn:entity:brand", affinity_score: 0.79 },
      ];
    } else {
      mockItems = [
        { id: "item_generic_1", name: "Ambiance Électronique", type: filterType, affinity_score: 0.75 },
      ];
    }

    return {
      state: "MOCK_SIMULATED",
      anchor_entity: entityId,
      filter_type: filterType,
      captured_at: new Date().toISOString(),
      items: mockItems,
    };
  }
}
