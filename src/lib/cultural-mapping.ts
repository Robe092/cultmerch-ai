import type { BriefProfile, Product, SemanticMatch, CulturalEvidence } from "@/types";

/** Vocabulaire éditorial local, versionné. Ces équivalences ne sont pas des faits fournis par Qloo. */
export const CONCEPTS: Record<string, { label: string; aliases: string[]; soft?: boolean }> = {
  electronic: { label: "Musique électronique", aliases: ["electronic", "electronique", "electro", "techno", "modular", "modulaire", "modulaires", "kraftwerk", "daft punk"] },
  synthwave: { label: "Synthwave", aliases: ["synthwave", "retrowave", "kavinsky", "retro futurism", "retrofuturiste"] },
  cyberpunk: { label: "Cyberpunk", aliases: ["cyberpunk", "blade runner", "neo noir", "neonoir"] },
  jazz: { label: "Jazz", aliases: ["jazz", "blue note", "john coltrane", "miles davis"] },
  rock: { label: "Rock indépendant", aliases: ["rock", "indie rock", "indie folk", "punk"] },
  cinema: { label: "Cinéma", aliases: ["cinema", "cinematique", "cinephiles", "cinephile", "film", "films", "35mm", "wes anderson", "grand budapest"] },
  coffee: { label: "Café de spécialité", aliases: ["coffee", "cafe", "cafes", "roastery", "kurasu", "blue bottle"] },
  ceramics: { label: "Céramique", aliases: ["ceramics", "ceramic", "ceramique", "ceramiques", "poterie", "gres", "hasami"] },
  denim: { label: "Denim", aliases: ["denim", "jean", "jeans", "selvedge"] },
  workwear: { label: "Vêtement utilitaire", aliases: ["workwear", "utilitaire", "carhartt", "surchemise", "vetements techniques"] },
  techwear: { label: "Textile technique", aliases: ["techwear", "technique", "techniques", "ripstop", "nylon"] },
  brutalism: { label: "Architecture brute", aliases: ["brutalism", "brutalisme", "brutaliste", "brutalistes", "beton", "industriel", "industrial"] },
  typography: { label: "Édition graphique", aliases: ["typography", "typographie", "typographique", "risographie", "design suisse", "helvetica"] },
  "japanese-design": { label: "Design japonais", soft: true, aliases: ["japan chic", "japanese design", "japonais", "japonaise", "japonaises", "japon", "tokyo", "hinoki"] },
  "analog-audio": { label: "Écoute et vinyle", aliases: ["analog audio", "audiophile", "audio", "vinyl", "vinyle", "vinyles", "hi fi", "hi-fi", "ecoute"] },
  streetwear: { label: "Streetwear", aliases: ["streetwear", "stussy", "mode urbaine"] },
  photography: { label: "Photographie", aliases: ["photography", "photographie", "argentique", "photo", "fujifilm"] },
  stationery: { label: "Papeterie", aliases: ["stationery", "papeterie", "carnet", "carnets", "ecriture"] },
  skincare: { label: "Soin et cosmétique", aliases: ["skincare", "cosmetique", "cosmetiques", "cosmetics", "soin", "soins", "savon", "barbe", "aesop"] },
  gastronomy: { label: "Gastronomie", aliases: ["gastronomy", "gastronomie", "epicurien", "epicuriens", "chocolat", "miel"] },
  wine: { label: "Vin naturel", aliases: ["natural wine", "vin", "vins", "vin naturel", "cidre"] },
  spirits: { label: "Spiritueux", aliases: ["whisky", "whiskey", "gin", "cocktail", "cocktails", "spiritueux"] },
  beer: { label: "Bière artisanale", aliases: ["beer", "biere", "bieres", "stout"] },
  "home-decor": { label: "Objets de décoration", aliases: ["home decor", "decoration", "decor", "interieur", "bougie", "vase", "lampe"] },
  minimalist: { label: "Minimalisme", aliases: ["minimalist", "minimalism", "minimaliste", "minimalistes", "minimalisme", "minimal"], soft: true },
  craft: { label: "Fabrication artisanale", aliases: ["craft", "artisan", "artisanat", "artisanal", "artisanale", "artisanaux", "fait main"], soft: true },
  cozy: { label: "Confort", aliases: ["cozy", "cosy", "confort", "cocooning"] , soft: true },
};
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
const includesPhrase = (text: string, phrase: string) => (` ${normalizeText(text)} `).includes(` ${normalizeText(phrase)} `);
export function conceptsIn(text: string): string[] {
  return Object.entries(CONCEPTS).filter(([id, value]) => includesPhrase(text, id) || value.aliases.some((alias) => includesPhrase(text, alias))).map(([id]) => id);
}

const BRIDGES: Record<string, string[]> = {
  jazz: ["analog-audio"], electronic: ["analog-audio"], rock: ["analog-audio"],
  synthwave: ["electronic"], cinema: ["photography"], workwear: ["denim"],
};
export function buildBriefProfile(brief: string, inferredTags: string[] = [], seeds: string[] = []): BriefProfile {
  const excluded: string[] = [];
  let positive = normalizeText(brief);
  const exclusions: [RegExp, string[]][] = [
    [/\b(?:sans|no|excluding|pas de) (?:produits? )?(?:alcool|alcohol)\b/g, ["wine", "spirits", "beer"]],
    [/\b(?:sans|no|excluding|pas de) (?:produits? )?(?:cosmetiques?|cosmetics|skincare|soins?)\b/g, ["skincare"]],
    [/\b(?:sans|no|excluding|pas de) (?:vetements?|textiles?|clothing)\b/g, ["workwear", "denim", "techwear", "streetwear"]],
  ];
  for (const [pattern, ids] of exclusions) positive = positive.replace(pattern, () => { excluded.push(...ids); return ""; });
  const literal = conceptsIn(positive);
  const seedConcepts = conceptsIn(seeds.join(" ; "));
  // Les déductions libres ne peuvent pas remplacer un univers explicitement demandé.
  const ids = Array.from(new Set(literal.length ? literal : seedConcepts.length ? seedConcepts : conceptsIn(inferredTags.join(" ; ")).filter((id) => !CONCEPTS[id].soft))).filter((id) => !excluded.includes(id));
  const core = ids.filter((id) => !CONCEPTS[id].soft);
  const productOnly = /\b(?:uniquement|seulement|exclusivement|only)\b/.test(positive);
  const kinds = ["denim", "ceramics", "coffee", "stationery", "skincare", "photography", "wine", "spirits", "beer"].filter((id) => literal.includes(id));
  return { version: "editorial-v1", concepts: ids, core_concepts: core.length ? core : ids,
    excluded_concepts: Array.from(new Set(excluded)), required_concepts: productOnly ? kinds.length ? kinds : ["unsupported-product-type"] : [],
    source: literal.length ? "brief" : seedConcepts.length ? "references" : ids.length ? "llm_interpretation" : "unresolved" };
}

export function matchBrief(product: Product, profile: BriefProfile): SemanticMatch[] {
  const features = product.cultural_features || conceptsIn([...product.tags_style, product.name].join(" ; "));
  if (features.some((id) => profile.excluded_concepts.includes(id))) return [];
  if (profile.required_concepts.length && !profile.required_concepts.some((id) => features.includes(id))) return [];
  const matches: SemanticMatch[] = [];
  for (const concept of profile.concepts) {
    if (features.includes(concept)) matches.push({ concept, feature: concept, label: CONCEPTS[concept]?.label || concept, strength: 1, method: "catalog_feature" });
    else for (const feature of BRIDGES[concept] || []) if (features.includes(feature)) matches.push({ concept, feature, label: `${CONCEPTS[concept].label} → ${CONCEPTS[feature].label}`, strength: 0.7, method: "editorial_bridge" });
  }
  return matches.some((match) => profile.core_concepts.includes(match.concept)) ? matches : [];
}

const BRAND_ALIASES: Record<string, string> = { "blue bottle": "blue bottle coffee", "pro ject audio systems": "pro ject", "porter yoshida co": "porter yoshida", "apc": "a p c" };
export function normalizeBrand(name: string): string {
  const normalized = normalizeText(name);
  return BRAND_ALIASES[normalized] || normalized;
}
export function matchQlooSignal(product: Product, signal: CulturalEvidence): CulturalEvidence | undefined {
  const directBrand = product.marques_affinitaires.find((brand) => normalizeBrand(brand) === normalizeBrand(signal.name));
  if (signal.type.includes("entity:brand") && directBrand) return { ...signal, match_method: "catalog_brand", matched_feature: directBrand, mapping_note: "Marque affinitaire déclarée dans le catalogue fictif ; ce produit n’est pas certifié par la marque." };
  // Les métadonnées de paiement, de coût ou de démographie ne décrivent pas une esthétique.
  if (!signal.type.startsWith("urn:tag") || /credit_card|inclusivity|demographic|cost_description|price|specialty_dish/.test(signal.type)) return;
  const isPlace = signal.type.includes(":place");
  const ids = conceptsIn(signal.name).filter((id) => !isPlace || ["coffee", "wine", "beer", "spirits", "gastronomy"].includes(id));
  const features = product.cultural_features || conceptsIn(product.tags_style.join(" ; "));
  const direct = product.tags_style.find((tag) => normalizeText(tag) === normalizeText(signal.name));
  if (direct && !isPlace) return { ...signal, match_method: "exact_tag", matched_feature: direct, mapping_note: "Même tag dans Qloo et dans le catalogue." };
  for (const concept of ids) {
    const feature = features.includes(concept) ? concept : (BRIDGES[concept] || []).find((id) => features.includes(id));
    if (feature) return { ...signal, match_method: "editorial_translation", matched_feature: feature,
      mapping_note: `Traduction éditoriale locale : ${signal.name} → ${CONCEPTS[feature]?.label || feature}. Qloo fournit le signal ; cette interprétation est celle de CultMerch.` };
  }
}
