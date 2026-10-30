import { matchedQlooInsights } from "./analysis-summary";
/** English presentation only. Original catalog text remains unchanged for matching. */
const PRODUCT_NAMES: Record<string, string> = {
  "SKU-SYNTH-001": "Cyberpunk Neon Bomber Jacket",
  "SKU-SYNTH-002": "Neo-80s Aviator Sunglasses",
  "SKU-SYNTH-003": "Pastel Purple Backlit Mechanical Keyboard",
  "SKU-SYNTH-004": "Sunset Horizon Neon Ambient Lamp",
  "SKU-SYNTH-005": "Artisan Yuzu and Black Juniper Gin",
  "SKU-SYNTH-006": "Plant-Wax Candle — Wet Asphalt and Cedar",
  "SKU-SYNTH-007": "Wired Hi-Fi Headphones with Walnut Ear Cups",
  "SKU-SYNTH-008": "Natural Syrah Red Wine — Domaine des Éclipses",
  "SKU-SYNTH-009": "Heavyweight Cotton Graphic T-Shirt — Tokyo Drift 1993",
  "SKU-SYNTH-010": "Matte Black Minimalist Turntable with Preamplifier",
  "SKU-SYNTH-011": "Midnight Palm Viscose Camp-Collar Shirt",
  "SKU-SYNTH-012": "Full-Grain Leather Notebook with Japanese Paper",
  "SKU-SYNTH-013": "Set of Two Fluted Crystal Cocktail Glasses",
  "SKU-SYNTH-014": "Light-Roast Ethiopian Yirgacheffe Specialty Coffee",
  "SKU-SYNTH-015": "Stealth Matte Black Stainless-Steel Insulated Bottle",
  "SKU-SYNTH-016": "Relaxed Cargo Trousers with Integrated Belt",
  "SKU-SYNTH-017": "Greige Ceramic Ultrasonic Diffuser with Hinoki Oil",
  "SKU-SYNTH-018": "75% Dark Chocolate with Oak-Smoked Cocoa Beans",
  "SKU-SYNTH-019": "Portable Bluetooth Speaker in Brass and Leather",
  "SKU-SYNTH-020": "Minimalist Black Plant-Based Leather Cardholder",
  "SKU-SYNTH-021": "Circuit City Neo-Noir Cinema Screen Print",
  "SKU-SYNTH-022": "Artisan Genmaicha Green Tea with Puffed Rice",
  "SKU-SYNTH-023": "Washed Cotton Embroidered Six-Panel Cap",
  "SKU-SYNTH-024": "Bourbon-Barrel-Aged Craft Stout",
  "SKU-SYNTH-025": "Raw Ceramic Vase with Volcanic Stoneware Finish",
  "SKU-SYNTH-026": "450 gsm Heavyweight Charcoal Hoodie",
  "SKU-SYNTH-027": "Geometric Merino Wool Throw — Grey and Terracotta",
  "SKU-SYNTH-028": "Ten-Year-Old Peated Single Malt Whisky",
  "SKU-SYNTH-029": "Retro Metal Cassette USB Drive",
  "SKU-SYNTH-030": "Wavy Mirror with Pastel Lilac Acrylic Frame",
  "SKU-SYNTH-031": "Black Cedar and Bergamot Beard and Face Oil",
  "SKU-SYNTH-032": "Straight-Fit 13 oz Japanese Raw Denim Overshirt",
  "SKU-SYNTH-033": "Sandblasted Aluminium Fountain Pen with Black Ink",
  "SKU-SYNTH-034": "Traditional Twelve-Year Barrel-Aged Balsamic Vinegar",
  "SKU-SYNTH-035": "Waterproof Cordura Crossbody Belt Bag",
  "SKU-SYNTH-036": "Handmade Ceramic Cup with Matte Chestnut Glaze",
  "SKU-SYNTH-037": "Portable High-Resolution USB-C Headphone DAC",
  "SKU-SYNTH-038": "Dry Wood-Aged Cider",
  "SKU-SYNTH-039": "Raw Brushed 925 Sterling Silver Ring",
  "SKU-SYNTH-040": "Bent Plywood Laptop Stand",
  "SKU-SYNTH-041": "Cold-Process Activated Charcoal and Rosemary Soap",
  "SKU-SYNTH-042": "Vegetable-Tanned Full-Grain Leather Belt with Black Buckle",
  "SKU-SYNTH-043": "Stackable Industrial Metal Storage Box",
  "SKU-SYNTH-044": "Wild Forest Honey Smoked with Applewood",
  "SKU-SYNTH-045": "400-Lumen Anodised Aluminium LED Keyring Torch",
  "SKU-SYNTH-046": "Cork and Black Slate Coasters — Set of Four",
  "SKU-SYNTH-047": "Vintage Biker Leather Jacket — Out-of-Stock Demo Item",
  "SKU-SYNTH-048": "Event Paper Cup — Disqualified Low-Margin Test Item",
  "SKU-SYNTH-049": "Minimalist Solid Brass Disc Incense Holder",
  "SKU-SYNTH-050": "Cotton Canvas Weekender with Leather Reinforcement",
};
export const productNameEn = (product: { sku: string; name: string }) => PRODUCT_NAMES[product.sku] || product.name;

const LABELS: Record<string, string> = {
  "Musique": "Music", "Cinéma": "Film & TV", "Mode": "Fashion", "Édition": "Books & Publishing",
  "Principal": "Primary", "Secondaire": "Secondary", "Subtil": "Subtle",
  "Édition Limitée": "Limited Edition", "Accessoires": "Accessories", "Objets & Éditions": "Objects & Editions",
  "Règles locales": "Local rules", "Texte local": "Local copy", "Céramique": "Ceramics",
  "Écoute et vinyle": "Audio & vinyl", "Design japonais": "Japanese design", "Fabrication artisanale": "Craftsmanship",
  "aucun": "none", "Non renseigné": "Not specified", "Non renseigné dans le catalogue": "Not specified in the catalog",
};
Object.assign(LABELS, {"Musique électronique": "Electronic music", "Rock indépendant": "Independent rock", "Café de spécialité": "Specialty coffee", "Vêtement utilitaire": "Workwear", "Textile technique": "Technical clothing", "Architecture brute": "Brutalist architecture", "Édition graphique": "Graphic publishing", "Photographie": "Photography", "Papeterie": "Stationery", "Soin et cosmétique": "Skincare", "Gastronomie": "Gastronomy", "Vin naturel": "Natural wine", "Spiritueux": "Spirits", "Bière artisanale": "Craft beer", "Objets de décoration": "Home decor", "Minimalisme": "Minimalism", "Confort": "Comfort"});
export const labelEn = (value: string) => value.split(" → ").map(part => LABELS[part] || part).join(" → ");
export function summaryEn(result: { comparison_metrics: { changed_skus?: number; margin_delta_eur: number }; branchB_with_qloo: { items: unknown[] } }) {
  const { changed_skus, margin_delta_eur } = result.comparison_metrics;
  return `${typeof changed_skus === "number" ? `${changed_skus} of ${result.branchB_with_qloo.items.length} products changed` : "Product change count unavailable"}. Calculated gross-margin difference: ${margin_delta_eur > 0 ? "+" : ""}${margin_delta_eur.toFixed(2)} EUR. Synthetic catalog; no sales or conversions measured.`;
}

const MATERIALS: Record<string, string> = {
  "nylon-technique":"technical nylon", "denim-brut":"raw denim", "titane":"titanium", "noyer":"walnut", "gres":"stoneware", "ceramique":"ceramic", "coton":"cotton", "laine":"wool", "cuir":"leather", "laiton":"brass", "liege":"cork", "ardoise":"slate", "argent":"silver", "bois":"wood", "papier":"paper", "verre":"glass", "acier":"steel", "chene":"oak", "chataigne":"chestnut", "cire-vegetale":"plant wax", "merinos":"merino wool", "metal-brosse":"brushed metal"
};
Object.assign(MATERIALS, {"acier-inox": "stainless steel", "acrylique": "acrylic", "aluminium-anodise": "anodised aluminium", "aluminium-sable": "sandblasted aluminium", "argent-925": "925 silver", "cacao": "cocoa", "cafe-arabica": "arabica coffee", "carton": "cardboard", "charbon-actif": "activated charcoal", "cire-soja": "soy wax", "coton-canvas": "cotton canvas", "coton-delave": "washed cotton", "coton-lourd": "heavyweight cotton", "coton-molleton": "cotton fleece", "coton-technique": "technical cotton", "cristal": "crystal", "huiles-vegetales": "plant oils", "laine-merinos": "merino wool", "malt-torrefie": "roasted malt", "mdf-dense": "dense MDF", "miel-sauvage": "wild honey", "papier-art": "art paper", "papier-japonais": "Japanese paper", "pommes-anciennes": "heritage apples", "raisin-trebbiano": "Trebbiano grapes", "serigraphie": "screen print", "the-vert": "green tea", "tourbe": "peat", "verre-opalin": "opal glass"});
export const materialEn = (value: string) => MATERIALS[value] || value;

const PHRASES: Record<string, string> = {
"Sélection sans Qloo":"Selection without Qloo","Même interprétation du brief, catalogue et contraintes. Aucun signal Qloo ajouté au classement.":"Same brief interpretation, catalog and constraints. No Qloo signals added to the ranking.","Aucune sélection suffisamment pertinente":"No sufficiently relevant selection","Précisez le brief ou élargissez le catalogue. Aucun article n’a été ajouté pour compléter artificiellement la sélection.":"Refine the brief or expand the catalog. No products have been added merely to fill the selection.","[Catalogue insuffisant]":"[Insufficient Catalog]","références disponibles ; aucun assouplissement des contraintes.":"products available; constraints have not been relaxed.","Collection conçue sur mesure pour l'audience":"Collection tailored to the audience","Sélection de ":"Selection of ","références selon les tags de travail":"products based on working tags","et les contraintes de marge et de stock. Consultez les preuves par produit pour identifier les correspondances Qloo.":"and margin and stock constraints. Inspect product evidence to identify Qloo matches.","Échec API Qloo":"Qloo API error","Impossible de":"Unable to","Édition Limitée":"Limited Edition",

  "Marque affinitaire déclarée dans le catalogue fictif ; ce produit n’est pas certifié par la marque.": "Editorial brand association in the synthetic catalog; the brand does not certify this product.",
  "Même tag dans Qloo et dans le catalogue.": "The same tag appears in Qloo and the catalog.",
  "Traduction éditoriale locale :": "Local editorial mapping:",
  "Qloo fournit le signal ; cette interprétation est celle de CultMerch.": "Qloo supplies the signal; this interpretation is made by CultMerch.",
  "Capsule Culturelle Qloo": "Qloo Cultural Capsule",
  "Règles locales": "Local rules", "Texte local": "Local copy",
  "[Contraintes Inviolables]": "[Hard Constraints]", "Marge >=": "Margin >=", ", cible ": ", target ",
  "[Interprétation]": "[Interpretation]", "[Filtrage Dur Stock/Marge]": "[Stock/Margin Constraints]",
  "[Comparaison A/B]": "[A/B Comparison]", "ancre ": "anchor ", "outils ": "tools ",
  "Ancre exploratoire": "Exploratory anchor", "choisie par les règles locales à partir du brief ; ce choix n’est pas une affinité fournie par Qloo.": "selected from the brief by local rules; this choice is not an affinity supplied by Qloo.",
  "signaux collectés ; état": "signals collected; state", "références éligibles": "eligible products", "exclues": "excluded",
  "correspondent aussi au brief.": "also match the brief.", "aucun complément par la seule marge.": "no filling based only on margin.",
  "candidats pertinents": "relevant candidates", "produits retenus avec correspondance explicite de tag ou marque.": "selected products with an explicit tag or brand match.",
  "Les déductions locales restent séparées.": "Local interpretations remain separate.",
  "référence(s) différente(s) sur": "changed product(s) out of", "Écart de marge théorique :": "Calculated gross-margin difference:",
  "produit(s) avec correspondance Qloo explicite.": "product(s) with explicit Qloo evidence.", "Catalogue fictif ; aucune vente ou conversion mesurée.": "Synthetic catalog; no sales or conversions measured.",
  "Aucune correspondance suffisamment proche ; précisez le nom d’un artiste, film ou d’une marque": "No sufficiently close match; specify an artist, film or brand name",
  "Résolution (": "Resolution (", "/search catalogue (": "/search catalog (",
  "Analyse introuvable": "Analysis not found", "Requête invalide": "Invalid request", "Échec de l'analyse merchandising": "Merchandising analysis failed",
  "Approuvez toutes les références avant l’export.": "Approve every product before exporting.",
  "Action d'approbation invalide": "Invalid approval action", "Aucune référence pertinente à approuver.": "No relevant products to approve.",
  "Erreur lors de la mise à jour du statut": "Could not update approval status", "Clé API Qloo manquante": "Qloo API key missing",
  "[QlooClient Sécurité] En production, l'absence de QLOO_API_KEY est interdite. Le basculement silencieux vers le mode MOCK est bloqué pour garantir la transparence.": "Qloo is not configured on the server. Live analysis requires a valid server-side Qloo key; simulated data is not substituted silently."
};
export function textEn(value: string): string {
  let translated = value;
  for (const [source, target] of Object.entries(PHRASES).sort((a,b)=>b[0].length-a[0].length)) translated = translated.split(source).join(target);
  for (const [source, target] of Object.entries(LABELS)) translated = translated.split(`→ ${source}.`).join(`→ ${target}.`);
  return translated;
}

/** Localise presentation fields without mutating stored evidence or scoring inputs. */
export function displayAnalysisEn(original: import("@/types").ABComparisonResult): import("@/types").ABComparisonResult {
  const result = structuredClone(original);
  for (const branch of [result.branchA_without_qloo, result.branchB_with_qloo]) {
    branch.title = textEn(branch.title);
    branch.pitch = textEn(branch.pitch);
    branch.decision_trace = branch.decision_trace.map(textEn);
    for (const item of branch.items) {
      item.product.name = productNameEn(item.product);
      item.product.notes_matieres = item.product.notes_matieres.map(materialEn);
      if (item.semantic_matches) item.semantic_matches = item.semantic_matches.map(labelEn);
      if (item.brief_matches) for (const match of item.brief_matches) match.label = labelEn(match.label);
      if (item.qloo_evidence) for (const evidence of item.qloo_evidence) if (evidence.mapping_note) evidence.mapping_note = textEn(evidence.mapping_note);
    }
  }
  result.decision_trace = result.decision_trace.map(textEn);
  result.comparison_metrics.summary = summaryEn(result);
  result.comparison_metrics.qloo_unique_insights = matchedQlooInsights(result.brief, result.branchB_with_qloo.items);
  if (result.provenance) {
    result.provenance.planner = labelEn(result.provenance.planner) as typeof result.provenance.planner;
    result.provenance.copywriter = labelEn(result.provenance.copywriter) as typeof result.provenance.copywriter;
    for (const call of result.provenance.calls) { call.endpoint = textEn(call.endpoint); if (call.error) call.error = textEn(call.error); }
  }
  return result;
}
