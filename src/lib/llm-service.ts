import { CONCEPTS, buildBriefProfile } from "./cultural-mapping";
import { z } from "zod";

export interface LLMBriefAnalysis {
  anchor_entity: string;
  cultural_tools: string[];
  strategic_reasoning: string;
  inferred_vibe_tags: string[];
}

export interface LLMCapsuleCopy {
  title: string;
  pitch: string;
  sku_justifications: Record<string, string>;
}

export class LLMService {
  private apiKey: string | undefined;
  private modelName: string;
  private planner = "Règles locales";
  private copywriter = "Texte local";

  getExecutionModes() { return { planner: this.planner, copywriter: this.copywriter }; }

  constructor(apiKey?: string, modelName?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    this.modelName = modelName || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  }

  hasLiveKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  getModelName(): string {
    return this.modelName;
  }

  /**
   * Analyse sémantique et planification du brief via LLM (ou moteur déterministe certifié)
   */
  async analyzeBrief(brief: string): Promise<LLMBriefAnalysis> {
    this.planner = "Règles locales";
    if (!this.hasLiveKey()) {
      return this.fallbackAnalyzeBrief(brief);
    }

    try {
      const prompt = `
Tu es un Directeur de Merchandising et d'Intelligence Culturelle de haut niveau.
Analyse le brief utilisateur suivant : "${brief}".
Détermine :
1. L'entité culturelle ancre la plus pertinente à rechercher dans le Taste Graph de Qloo (film, artiste, album, marque ou genre précis).
2. Les outils culturels Qloo pertinents parmi : ["urn:tag", "urn:entity:brand", "urn:entity:artist", "urn:entity:movie", "urn:entity:place"].
3. Une justification stratégique concise de ton approche.
4. Une liste de 3 à 5 concepts du catalogue parmi : ${Object.keys(CONCEPTS).join(", ")}. Utilise les identifiants exacts ; n’invente pas de synonymes. Si le brief demande des produits absents de ce vocabulaire, retourne une liste vide plutôt que de forcer un rapprochement.
L’ancre doit être un artiste, film ou marque nommé précisément. Un lieu mentionné dans le nom d’une campagne n’est pas nécessairement une préférence pour ce lieu. Si l’utilisateur décrit des goûts musicaux, privilégie une œuvre ou un artiste pertinent plutôt qu’un restaurant ou une ville.

Réponds STRICTEMENT sous format JSON avec la structure :
{
  "anchor_entity": "string",
  "cultural_tools": ["urn:..."],
  "strategic_reasoning": "string",
  "inferred_vibe_tags": ["string"]
}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`,
        {
          signal: AbortSignal.timeout(12000),
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API HTTP ${response.status}`);
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Réponse Gemini vide");

      const parsed = z.object({
        anchor_entity: z.string().trim().min(1).max(120),
        cultural_tools: z.array(z.enum(["urn:tag", "urn:entity:brand", "urn:entity:artist", "urn:entity:movie", "urn:entity:place"])).max(5),
        strategic_reasoning: z.string().max(2000),
        inferred_vibe_tags: z.array(z.string().max(100)).max(10),
      }).parse(JSON.parse(rawText));
      if (!parsed.anchor_entity || !Array.isArray(parsed.cultural_tools)) {
        throw new Error("Format JSON Gemini invalide");
      }

      // S'assurer que urn:tag est toujours présent
      if (!parsed.cultural_tools.includes("urn:tag")) {
        parsed.cultural_tools.unshift("urn:tag");
      }

      this.planner = `Gemini (${this.modelName})`;
      return parsed;
    } catch (err: any) {
      console.warn(`[LLMService] Bascule sur raisonneur déterministe: ${err.message}`);
      return this.fallbackAnalyzeBrief(brief);
    }
  }

  /**
   * Rédaction marketing de la collection capsule via LLM
   */
  async generateCapsuleCopy(params: {
    brief: string;
    culturalTags: string[];
    products: { sku: string; name: string; category: string }[];
  }): Promise<LLMCapsuleCopy> {
    this.copywriter = "Texte local";
    if (!this.hasLiveKey()) {
      return this.fallbackCapsuleCopy(params);
    }

    try {
      const prompt = `
En tant que stratège e-commerce, rédige la présentation commerciale de cette collection capsule :
Brief cible : "${params.brief}"
Tags de travail (ils peuvent inclure des déductions locales et des simulations ; ne prétends pas que ces liens sont certifiés par Qloo) : ${params.culturalTags.join(", ")}
Produits sélectionnés :
${params.products.map((p) => `- ${p.sku}: ${p.name} (${p.category})`).join("\n")}

Génère en JSON :
{
  "title": "Nom percutant et élégant de la collection",
  "pitch": "Argumentaire marketing de 2-3 phrases expliquant la cohérence culturelle de la collection pour cette audience",
  "sku_justifications": {
    "SKU-ID": "Raison culturelle courte justifiant cet article précis"
  }
}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`,
        {
          signal: AbortSignal.timeout(12000),
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Réponse Gemini vide");

      const copy = z.object({title: z.string().min(1).max(300), pitch: z.string().max(3000), sku_justifications: z.record(z.string())}).parse(JSON.parse(rawText));
      this.copywriter = `Gemini (${this.modelName})`;
      return copy;
    } catch (err: any) {
      return this.fallbackCapsuleCopy(params);
    }
  }

  // --- Moteur de Raisonnement Déterministe (Sans clé API externe) ---
  private fallbackAnalyzeBrief(brief: string): LLMBriefAnalysis {
    const lower = brief.toLowerCase();
    const tools = ["urn:tag"];
    const vibeTags: string[] = [];

    if (lower.includes("marque") || lower.includes("brand") || lower.includes("style") || lower.includes("fashion")) {
      tools.push("urn:entity:brand");
    }
    if (lower.includes("musique") || lower.includes("rock") || lower.includes("electro") || lower.includes("jazz")) {
      tools.push("urn:entity:artist");
    }
    if (lower.includes("film") || lower.includes("cinema") || lower.includes("scifi") || lower.includes("retro")) {
      tools.push("urn:entity:movie");
    }

    const profile = buildBriefProfile(brief);
    let anchor = "";
    if (lower.includes("daft punk")) anchor = "Daft Punk";
    else if (lower.includes("kavinsky") || profile.concepts.includes("synthwave")) anchor = "Kavinsky";
    else if (lower.includes("blade runner")) anchor = "Blade Runner 2049";
    else if (profile.concepts.includes("cyberpunk")) anchor = "Cyberpunk 2077";
    else if (profile.concepts.includes("jazz")) anchor = "John Coltrane";
    else if (profile.concepts.includes("cinema")) anchor = "The Grand Budapest Hotel";
    else if (profile.concepts.includes("electronic") || profile.concepts.includes("brutalism")) anchor = "Kraftwerk";
    else if (profile.concepts.includes("rock")) anchor = "Arctic Monkeys";
    else if (profile.concepts.includes("coffee")) anchor = "Blue Bottle Coffee";
    else if (profile.concepts.includes("japanese-design") || profile.concepts.includes("ceramics")) anchor = "Muji";
    else if (profile.concepts.includes("denim") || profile.concepts.includes("workwear")) anchor = "Carhartt WIP";
    else anchor = brief.replace(/[^\w\s]/gi, "").split(/\s+/).filter((word) => word.length > 3).slice(0, 2).join(" ") || "Design";
    vibeTags.push(...profile.concepts);

    return {
      anchor_entity: anchor,
      cultural_tools: Array.from(new Set(tools)),
      strategic_reasoning: `Ancre exploratoire "${anchor}" choisie par les règles locales à partir du brief ; ce choix n’est pas une affinité fournie par Qloo.`,
      inferred_vibe_tags: vibeTags,
    };
  }

  private fallbackCapsuleCopy(params: {
    brief: string;
    culturalTags: string[];
    products: { sku: string; name: string; category: string }[];
  }): LLMCapsuleCopy {
    const cleanTitle = params.brief.replace(/[^\p{L}\p{N}\s-]/gu, "").trim();
    const formattedTitle = cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : "Édition Limitée";
    const justifications: Record<string, string> = {};

    for (const p of params.products) {
      justifications[p.sku] = `Produit sélectionné pour son ancrage dans l'esthétique ${params.culturalTags[0] || "lifestyle"} et son niveau de marge brute élevé.`;
    }

    return {
      title: `Capsule Culturelle Qloo — ${formattedTitle}`,
      pitch: `Collection conçue sur mesure pour l'audience "${params.brief}". Sélection de ${params.products.length} références selon les tags de travail (${params.culturalTags.slice(0, 3).join(", ")}) et les contraintes de marge et de stock. Consultez les preuves par produit pour identifier les correspondances Qloo.`,
      sku_justifications: justifications,
    };
  }
}
