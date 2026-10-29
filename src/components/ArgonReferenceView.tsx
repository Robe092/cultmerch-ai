"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Sparkles,
  GitCompare,
  ShoppingBag,
  CheckCircle2,
  Plus,
  X,
  ArrowRight,
  SlidersHorizontal,
  Search,
  ChevronRight,
  Check,
  Clock,
  RefreshCw,
  Code2,
  Copy,
  Layers,
  TrendingUp,
  Package,
  AlertCircle,
  Eye,
  Menu,
  ArrowUpRight,
  Sliders,
  FileText,
  Download
} from "lucide-react";
import { AnalysisEvidence, CollectionComparison, ProductEvidence, qlooStateLabel, signed } from "./AnalysisEvidence";
import type { ABComparisonResult, MerchandisingScore, QlooDataState } from "@/types";
import { asStoredAnalysis } from "@/lib/stored-analysis";
import { JuryGuide } from "./JuryGuide";

// ============================================================================
// 1. CONTRATS TYPESCRIPT (NEXT.JS 16 ENGINE BRIDGE)
// ============================================================================

export type CulturalDomain =
  | "Musique"
  | "Cinéma"
  | "Mode"
  | "Art & Design"
  | "Lifestyle"
  | "Édition";

export interface CulturalSeed {
  id: string;
  label: string;
  domain: CulturalDomain;
  weight: "Principal" | "Secondaire" | "Subtil";
}

export interface AudienceProfile {
  positioning: "Accessible" | "Premium" | "Édition Limitée";
  aestheticDepth: number; // 0 to 100
  targetMargin: number; // %
}

export interface CulturalInsight {
  id: string;
  title: string;
  domains: CulturalDomain[];
  direction: string;
  materialGuideline: string;
  pitfallsToAvoid: string[];
}

export interface CollectionDirection {
  title: string;
  subtitle: string;
  positioningStatement: string;
  fabricStrategy: string;
  visualIdentity: string;
  typography: string;
  palette: { hex: string; name: string }[];
  financials: {
    avgUnitCost: number;
    avgRetailPrice: number;
    estimatedMargin: number;
    sellThroughProjection: string;
  };
  keyTakeaways: string[];
}

export type ApprovalStatus = "approved" | "pending" | "revision";

export type GarmentType =
  | "hoodie"
  | "tee"
  | "tote"
  | "vinyl"
  | "cap"
  | "ceramic"
  | "object"
  | "audio";

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  category: "Textile" | "Accessoires" | "Objets & Éditions";
  garmentType: GarmentType;
  specs: string;
  fit: string;
  finish: string;
  composition: string;
  unitCost: number;
  retailPrice: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  culturalRationale: string;
  standardAlternative: string;
  status: ApprovalStatus;
  reviewerNote: string;
}

export interface WorkspaceDataset {
  id: string;
  brandName: string;
  campaignTitle: string;
  season: string;
  summary: string;
  seeds: CulturalSeed[];
  profile: AudienceProfile;
  insights: CulturalInsight[];
  comparison: {
    standardApproach: CollectionDirection;
    culturalApproach: CollectionDirection;
  };
  products: CatalogProduct[];
}

export interface AnalysisProvenance {
  qlooMode: QlooDataState;
  qlooEntitiesCount: number;
  llmModelUsed: string;
  catalogSkusEvaluated: number;
  executionTimestamp: string;
}

export function mapScoreToCatalogProduct(
  score: MerchandisingScore,
  index: number
): CatalogProduct {
  const p = score.product;
  const lower = (p.sku + " " + p.name + " " + p.category).toLowerCase();
  let garmentType: GarmentType = "object";
  if (lower.includes("casque") || lower.includes("dac") || lower.includes("audio") || lower.includes("hi-fi") || lower.includes("hifi") || lower.includes("ecouteur")) {
    garmentType = "audio";
  } else if (lower.includes("hd") || lower.includes("hoodie") || lower.includes("sweat")) {
    garmentType = "hoodie";
  } else if (lower.includes("t-shirt") || lower.includes("tee") || lower.includes("chemise")) {
    garmentType = "tee";
  } else if (lower.includes("tb") || lower.includes("tote") || lower.includes("sac")) {
    garmentType = "tote";
  } else if (lower.includes("vn") || lower.includes("vinyl") || lower.includes("disque")) {
    garmentType = "vinyl";
  } else if (lower.includes("cp") || lower.includes("cap") || lower.includes("casquette")) {
    garmentType = "cap";
  } else if (
    lower.includes("mg") ||
    lower.includes("ceramic") ||
    lower.includes("gobelet") ||
    lower.includes("cafe")
  ) {
    garmentType = "ceramic";
  }

  let category: "Textile" | "Accessoires" | "Objets & Éditions" = "Textile";
  if (p.category === "fashion") {
    category = "Textile";
  } else if (
    p.category === "audio_accessoires" ||
    garmentType === "tote" ||
    garmentType === "cap"
  ) {
    category = "Accessoires";
  } else {
    category = "Objets & Éditions";
  }

  const defaultColors = [
    { pri: "#27272A", sec: "#A1A1AA", acc: "#EA580C" },
    { pri: "#3F3F46", sec: "#E4E4E7", acc: "#EA580C" },
    { pri: "#18181B", sec: "#A1A1AA", acc: "#EA580C" },
    { pri: "#1B4332", sec: "#EAE5D9", acc: "#9A3412" },
    { pri: "#D6CFC2", sec: "#1B4332", acc: "#9A3412" },
  ];
  const color = defaultColors[index % defaultColors.length];

  return {
    id: p.sku,
    sku: p.sku,
    name: p.name,
    category,
    garmentType,
    specs:
      p.notes_matieres.length > 0
        ? p.notes_matieres.join(" • ")
        : `${p.category.toUpperCase()} Edition`,
    fit: p.tags_style.length > 0 ? p.tags_style.join(", ") : "Coupe contemporaine",
    finish:
      p.marques_affinitaires.length > 0
        ? `Affinité: ${p.marques_affinitaires.join(", ")}`
        : "Finition atelier",
    composition: p.notes_matieres.length > 0 ? p.notes_matieres[0] : "Non renseigné",
    unitCost: p.cost_eur,
    retailPrice: p.price_eur,
    primaryColor: color.pri,
    secondaryColor: color.sec,
    accentColor: color.acc,
    culturalRationale: `Score interne MAI : ${(score.mai_total * 100).toFixed(0)}/100. Correspondances Qloo explicites : ${score.qloo_evidence?.map((signal) => signal.name).join(", ") || "aucune"}.`,
    standardAlternative: `Alternative promotionnelle standard sans Taste Graph (marge ${(p.margin_pct * 100).toFixed(0)}%).`,
    status: "pending",
    reviewerNote: `Score MAI: ${(score.mai_total * 100).toFixed(1)}% | Stock: ${p.stock_units} unités`,
  };
}

const WORKSPACES: Record<string, WorkspaceDataset> = {
  monolith: {
    id: "monolith",
    brandName: "Monolith Festival",
    campaignTitle: "Capsule Automne/Hiver — Architecture & Son",
    season: "FW26",
    summary:
      "Collection destinée à un public urbain amateur de musique électronique modulaire, d'architecture brutaliste et de vêtements techniques durables.",
    profile: {
      positioning: "Premium",
      aestheticDepth: 80,
      targetMargin: 35,
    },
    seeds: [
      { id: "s1", label: "Kraftwerk", domain: "Musique", weight: "Principal" },
      { id: "s2", label: "Blade Runner 2049", domain: "Cinéma", weight: "Principal" },
      { id: "s3", label: "Carhartt WIP", domain: "Mode", weight: "Secondaire" },
      { id: "s4", label: "Helvetica", domain: "Cinéma", weight: "Subtil" },
    ],
    insights: [
      {
        id: "in1",
        title: "Minimalisme Acoustique & Matière Brute",
        domains: ["Musique", "Art & Design"],
        direction:
          "Privilégier des schémas techniques sobres et des grilles modulaires plutôt que des visuels musicaux explicites.",
        materialGuideline: "Molleton très lourd (480 gsm) avec lavage minéral mat.",
        pitfallsToAvoid: ["Couleurs fluo saturées", "Logos surdimensionnés", "Références rétro années 80"],
      },
      {
        id: "in2",
        title: "Fonctionnalité & Signalétique Industrielle",
        domains: ["Mode", "Édition"],
        direction:
          "Intégrer des étiquettes tissées inspirées de la signalétique d'équipement acoustique de laboratoire.",
        materialGuideline: "Toile Jacquard dense, nylon ripstop et broderies ton sur ton.",
        pitfallsToAvoid: ["Textiles promotionnels légers", "Slogans événementiels datés"],
      },
    ],
    comparison: {
      standardApproach: {
        title: "Approche Promotionnelle Standard",
        subtitle: "Interprétation directe des mots-clés de l'événement",
        positioningStatement:
          "Merchandising événementiel classique centré sur le logo du festival et une imagerie musicale générique.",
        fabricStrategy: "Sweatshirt standard 280 gsm (mélange coton/polyester) et t-shirt léger 160 gsm.",
        visualIdentity: "Visuels centrés grand format, illustrations d'ondes sonores et couleurs vives.",
        typography: "Caractères d'affichage génériques à fort impact",
        palette: [
          { hex: "#E11D48", name: "Rouge Vif" },
          { hex: "#0284C7", name: "Bleu Électrique" },
          { hex: "#18181B", name: "Noir Standard" },
        ],
        financials: {
          avgUnitCost: 14.5,
          avgRetailPrice: 45.0,
          estimatedMargin: 67,
          sellThroughProjection: "Modéré (achat souvenir uniquement)",
        },
        keyTakeaways: [
          "Faible portabilité au quotidien en dehors de l'événement.",
          "Perception de produit publicitaire limitant le prix de vente conseillé.",
          "Forte décote après l'événement en raison du marquage daté.",
        ],
      },
      culturalApproach: {
        title: "Approche Affinitaire Qloo (Simulée)",
        subtitle: "Croisement entre musique modulaire, architecture et mode utilitaire",
        positioningStatement:
          "Une ligne de vêtements et d'objets conçue comme un label de design indépendant, valorisant la coupe et le détail subtil.",
        fabricStrategy: "Molleton peigné 480 gsm coupe boxy, toile Jacquard 520 gsm et coton cardé lourd.",
        visualIdentity: "Micro-typographie technique, schémas de routage sobres et étiquettes tissées externes.",
        typography: "DIN 1451 & Monospace technique corps 8pt",
        palette: [
          { hex: "#27272A", name: "Asphalte Brut" },
          { hex: "#A1A1AA", name: "Béton Banché" },
          { hex: "#EA580C", name: "Orange Oscilloscope" },
          { hex: "#F4F4F0", name: "Papier Calque" },
        ],
        financials: {
          avgUnitCost: 22.0,
          avgRetailPrice: 92.0,
          estimatedMargin: 76,
          sellThroughProjection: "Élevé (désirabilité retail permanente)",
        },
        keyTakeaways: [
          "Adéquation immédiate avec les codes vestimentaires réels de l'audience cible.",
          "Valorisation du prix de vente (+104% de chiffre d'affaires unitaire) grâce à la qualité perçue.",
          "Durée de vie commerciale prolongée au-delà de l'événement.",
        ],
      },
    },
    products: [
      {
        id: "p1",
        sku: "MN-FW26-HD01",
        name: "Hoodie Architectonique 480gsm",
        category: "Textile",
        garmentType: "hoodie",
        specs: "480 GSM Heavy French Terry",
        fit: "Coupe Boxy / Épaules tombantes / Sans cordon",
        finish: "Sérigraphie haute densité + Étiquette Tyvek cousue",
        composition: "100% Coton Biologique Peigné",
        unitCost: 28.5,
        retailPrice: 115.0,
        primaryColor: "#27272A",
        secondaryColor: "#A1A1AA",
        accentColor: "#EA580C",
        culturalRationale:
          "Répond à la préférence de l'audience pour les pièces structurées d'inspiration workwear japonais, sans logo ostentatoire.",
        standardAlternative: "Sweat à capuche promotionnel 280 gsm avec logo poitrine.",
        status: "approved",
        reviewerNote: "Grammage et coupe validés avec l'atelier de confection.",
      },
      {
        id: "p2",
        sku: "MN-FW26-TB02",
        name: "Cabas Disquaire Jacquard 12\"",
        category: "Accessoires",
        garmentType: "tote",
        specs: "Toile Jacquard 520 GSM + Sangles Nylon",
        fit: "Format structuré 34x34cm (capacité 15 vinyles)",
        finish: "Motif tissé dans la masse + Boucle métal mat",
        composition: "80% Coton recyclé / 20% Cordura",
        unitCost: 16.0,
        retailPrice: 68.0,
        primaryColor: "#3F3F46",
        secondaryColor: "#E4E4E7",
        accentColor: "#EA580C",
        culturalRationale:
          "Remplace le tote bag promotionnel léger par un sac utilitaire calibré pour les acheteurs de disques vinyles et d'équipement.",
        standardAlternative: "Tote bag écru 140 gsm imprimé sur une face.",
        status: "approved",
        reviewerNote: "Très forte marge prévisionnelle sur cet accessoire.",
      },
      {
        id: "p3",
        sku: "MN-FW26-VN03",
        name: "Édition Vinyle 180g + Livret Risographie",
        category: "Objets & Éditions",
        garmentType: "vinyl",
        specs: "Vinyle 180g / Pochette Carton Brut 400g",
        fit: "Gatefold avec bande Obi numérotée",
        finish: "Impression Risographie 2 tons sur papier non couché",
        composition: "PVC Vierge 180g / Papier Munken",
        unitCost: 14.2,
        retailPrice: 55.0,
        primaryColor: "#18181B",
        secondaryColor: "#A1A1AA",
        accentColor: "#EA580C",
        culturalRationale:
          "Objet de collection éditorial combinant archive sonore et design graphique suisse.",
        standardAlternative: "Compilation numérique ou affiche standard.",
        status: "revision",
        reviewerNote: "Vérifier le grammage du papier intérieur avec l'imprimeur.",
      },
      {
        id: "p4",
        sku: "MN-FW26-CP04",
        name: "Casquette 5-Panel Ripstop Technique",
        category: "Accessoires",
        garmentType: "cap",
        specs: "Nylon Ripstop Déperlant 210D",
        fit: "Couronne basse souple / Visière plate",
        finish: "Micro-patch silicone + Boucle magnétique",
        composition: "100% Nylon Technique",
        unitCost: 11.5,
        retailPrice: 48.0,
        primaryColor: "#18181B",
        secondaryColor: "#71717A",
        accentColor: "#EA580C",
        culturalRationale:
          "Forte affinité entre le public de musique électronique et les équipements outdoor urbains sobres.",
        standardAlternative: "Casquette trucker filet avec flocage mousse.",
        status: "pending",
        reviewerNote: "",
      },
    ],
  },

  lumiere: {
    id: "lumiere",
    brandName: "Cinéma Lumière & Roastery",
    campaignTitle: "Collection Résidence — Édition 35mm",
    season: "SS26",
    summary:
      "Ligne éditoriale croisant l'univers du cinéma d'auteur indépendant, des revues photographiques argentiques et des cafés de spécialité.",
    profile: {
      positioning: "Premium",
      aestheticDepth: 75,
      targetMargin: 35,
    },
    seeds: [
      { id: "b1", label: "The Grand Budapest Hotel", domain: "Cinéma", weight: "Principal" },
      { id: "b2", label: "Blue Bottle Coffee", domain: "Lifestyle", weight: "Principal" },
      { id: "b3", label: "Fujifilm", domain: "Art & Design", weight: "Secondaire" },
      { id: "b4", label: "A.P.C.", domain: "Mode", weight: "Secondaire" },
    ],
    insights: [
      {
        id: "in_b1",
        title: "Esthétique « Équipe de Tournage » (Crew Gear)",
        domains: ["Cinéma", "Mode"],
        direction:
          "Concevoir les pièces comme des dotations confidentielles d'studios de production ou d'archives universitaires.",
        materialGuideline: "Jersey de coton cardé toucher sec (310 gsm) en teinte écru non blanchi.",
        pitfallsToAvoid: ["Illustrations de caméras ou claps", "Citations explicites sur le café"],
      },
      {
        id: "in_b2",
        title: "Artisanat Sensoriel & Tactile",
        domains: ["Lifestyle", "Art & Design"],
        direction:
          "Associer le textile à des objets du quotidien en matières naturelles brutes (grès chamotté, papier coton).",
        materialGuideline: "Grès tourné artisanalement et broderie au point de chaînette.",
        pitfallsToAvoid: ["Mugs publicitaires en porcelaine blanche brillante"],
      },
    ],
    comparison: {
      standardApproach: {
        title: "Approche Promotionnelle Standard",
        subtitle: "Juxtaposition littérale des thématiques cinéma et café",
        positioningStatement:
          "Produits dérivés classiques illustrant directement les symboles du cinéma et de la pause café.",
        fabricStrategy: "T-shirt blanc optique 150 gsm et mug cylindrique promotionnel.",
        visualIdentity: "Pictogrammes de bobines de film, tasses fumantes et slogans humoristiques.",
        typography: "Police machine à écrire standard",
        palette: [
          { hex: "#4E342E", name: "Brun Café" },
          { hex: "#000000", name: "Noir" },
          { hex: "#FFFFFF", name: "Blanc Optique" },
        ],
        financials: {
          avgUnitCost: 9.0,
          avgRetailPrice: 28.0,
          estimatedMargin: 68,
          sellThroughProjection: "Faible auprès d'une clientèle sensible au design",
        },
        keyTakeaways: [
          "Décalage esthétique avec les attentes d'un public cinéphile urbain.",
          "Blanc optique perçu comme bas de gamme comparé aux teintes naturelles.",
        ],
      },
      culturalApproach: {
        title: "Approche Affinitaire Qloo (Simulée)",
        subtitle: "Croisement entre édition indépendante, textile vintage et céramique",
        positioningStatement:
          "Une collection capsule sobre inspirée des vêtements d'archive de réalisateurs et de l'art de vivre nordique.",
        fabricStrategy: "T-shirt lourd 310 gsm écru chiné, twill de coton brossé et grès artisanal.",
        visualIdentity: "Typographie Serif condensée inspirée des génériques de films des années 1970.",
        typography: "Garamond Condensé Italique & Sans-Serif micro",
        palette: [
          { hex: "#EAE5D9", name: "Écru Naturel" },
          { hex: "#1B4332", name: "Vert Forêt" },
          { hex: "#9A3412", name: "Terre de Sienne" },
          { hex: "#27272A", name: "Noir Argentique" },
        ],
        financials: {
          avgUnitCost: 13.5,
          avgRetailPrice: 58.0,
          estimatedMargin: 77,
          sellThroughProjection: "Très élevé (forte valeur de collection)",
        },
        keyTakeaways: [
          "Positionnement « Stealth Merch » : désirable même pour les personnes extérieures à l'événement.",
          "Harmonisation chromatique inspirée des pellicules photographiques analogiques.",
        ],
      },
    },
    products: [
      {
        id: "pb1",
        sku: "LM-SS26-TE01",
        name: "T-Shirt Archive 310gsm « Sound Dept. »",
        category: "Textile",
        garmentType: "tee",
        specs: "310 GSM Coton Cardé Toucher Sec",
        fit: "Coupe droite relax / Col côtelé épais 3cm",
        finish: "Broderie poitrine vert forêt + Sérigraphie à l'eau au dos",
        composition: "100% Coton Biologique Non Blanchi",
        unitCost: 15.8,
        retailPrice: 65.0,
        primaryColor: "#EAE5D9",
        secondaryColor: "#1B4332",
        accentColor: "#9A3412",
        culturalRationale:
          "Le col épais 3cm et le coton écru à main sèche correspondent aux standards des labels streetwear et cinéphiles actuels.",
        standardAlternative: "T-shirt blanc léger avec impression numérique frontale.",
        status: "approved",
        reviewerNote: "Échantillon validé. Excellente tenue du col.",
      },
      {
        id: "pb2",
        sku: "LM-SS26-MG02",
        name: "Gobelet Céramique Grès Chamotté",
        category: "Objets & Éditions",
        garmentType: "ceramic",
        specs: "Grès Pyrite 320ml — Cuisson 1280°C",
        fit: "Format dégustation sans anse / Base brute",
        finish: "Émail réactif céladon + Estampille en creux",
        composition: "Argile de grès naturelle & émail sans plomb",
        unitCost: 12.4,
        retailPrice: 44.0,
        primaryColor: "#D6CFC2",
        secondaryColor: "#1B4332",
        accentColor: "#9A3412",
        culturalRationale:
          "Conçu pour la dégustation de café filtre, s'intégrant naturellement dans un intérieur contemporain.",
        standardAlternative: "Mug en porcelaine blanche imprimé par sublimation.",
        status: "approved",
        reviewerNote: "Production lancée en série limitée de 300 pièces.",
      },
      {
        id: "pb3",
        sku: "LM-SS26-CP03",
        name: "Casquette 6-Panel Twill Émerisé",
        category: "Accessoires",
        garmentType: "cap",
        specs: "Twill de Coton Brossé 10oz",
        fit: "Couronne souple / Visière incurvée / Boucle laiton",
        finish: "Broderie Serif condensée + Sous-visière verte",
        composition: "100% Coton Brossé",
        unitCost: 9.8,
        retailPrice: 45.0,
        primaryColor: "#1B4332",
        secondaryColor: "#EAE5D9",
        accentColor: "#9A3412",
        culturalRationale:
          "Pièce emblématique du vestiaire néo-preppy et des équipes de tournage cinéma.",
        standardAlternative: "Casquette promotionnelle en polyester.",
        status: "pending",
        reviewerNote: "",
      },
    ],
  },

  tokyo: {
    id: "tokyo",
    brandName: "Tokyo Sound Bar",
    campaignTitle: "Kissa Sessions — Jazz & Denim",
    season: "FW26",
    summary:
      "Tokyo Sound Bar - Capsule confidentielle croisant le jazz spirituel, l'art du denim brut et la céramique japonaise artisanale.",
    profile: {
      positioning: "Premium",
      aestheticDepth: 85,
      targetMargin: 35,
    },
    seeds: [
      { id: "t1", label: "John Coltrane", domain: "Musique", weight: "Principal" },
      { id: "t2", label: "Our Legacy", domain: "Mode", weight: "Secondaire" },
      { id: "t3", label: "Muji", domain: "Lifestyle", weight: "Subtil" },
    ],
    insights: [
      {
        id: "in_t1",
        title: "Audiophile Analogique & Matériaux Nobles",
        domains: ["Musique", "Art & Design"],
        direction:
          "Associer des accessoires d'écoute haute fidélité à des toiles de denim lourd d'inspiration japonaise.",
        materialGuideline: "Denim selvedge 13oz, bois de noyer et composants audio blindés.",
        pitfallsToAvoid: ["Plastiques brillants", "Logos ostentatoires"],
      },
    ],
    comparison: {
      standardApproach: {
        title: "Approche Promotionnelle Standard",
        subtitle: "Merchandising bar générique",
        positioningStatement: "Goodies promotionnels imprimés avec le logo du bar.",
        fabricStrategy: "T-shirt blanc 140g et sous-bock carton.",
        visualIdentity: "Logo typographique simple sur fond blanc.",
        typography: "Helvetica Standard",
        palette: [
          { hex: "#18181B", name: "Noir" },
          { hex: "#FAFAFA", name: "Blanc" },
        ],
        financials: {
          avgUnitCost: 12.0,
          avgRetailPrice: 38.0,
          estimatedMargin: 68,
          sellThroughProjection: "Faible (achat souvenir occasionnel)",
        },
        keyTakeaways: ["Faible désirabilité en dehors de la visite physique."],
      },
      culturalApproach: {
        title: "Approche Affinitaire Qloo",
        subtitle: "Sélection audiophile et vestiaire contemporain",
        positioningStatement: "Une capsule art de vivre et son haute fidélité connectée au Taste Graph.",
        fabricStrategy: "Denim brut japonais 13oz, noyer américain et DAC USB-C audiophile.",
        visualIdentity: "Lignes discrètes, marquages aveugles et finitions artisanales.",
        typography: "Typographie japonaise minimale & Garamond",
        palette: [
          { hex: "#1E293B", name: "Indigo Brut" },
          { hex: "#78350F", name: "Noyer Fumé" },
          { hex: "#E2E8F0", name: "Papier Washi" },
        ],
        financials: {
          avgUnitCost: 26.5,
          avgRetailPrice: 85.0,
          estimatedMargin: 71,
          sellThroughProjection: "Très élevé (pièces convoitées par les passionnés)",
        },
        keyTakeaways: ["Forte valeur perçue et panier moyen significativement augmenté."],
      },
    },
    products: [
      {
        id: "pt1",
        sku: "TK-FW26-DN01",
        name: "Surchemise Denim Brut Japonais 13 oz",
        category: "Textile",
        garmentType: "tee",
        specs: "13 oz Selvedge Denim Kaihara",
        fit: "Coupe droite / Boutons corozo / Sans délavage",
        finish: "Lisière selvedge apparente + Point de chaînette",
        composition: "100% Coton Selvedge Japonais",
        unitCost: 38.0,
        retailPrice: 135.0,
        primaryColor: "#1E293B",
        secondaryColor: "#CBD5E1",
        accentColor: "#D97706",
        culturalRationale: "Correspondance directe avec les amateurs de jazz analogique et de vestiaire workwear haut de gamme.",
        standardAlternative: "Chemise en jean standard prélavée.",
        status: "approved",
        reviewerNote: "Pièce maîtresse de la sélection.",
      },
      {
        id: "pt2",
        sku: "TK-FW26-AU02",
        name: "Convertisseur DAC Audio USB-C Haute Résolution",
        category: "Accessoires",
        garmentType: "audio",
        specs: "Puce ES9038Q2M 32-bit/384kHz DSD256",
        fit: "Boîtier aluminium usiné CNC / Câble cuivre OCC",
        finish: "Anodisation gris titane",
        composition: "Aluminium de qualité aéronautique",
        unitCost: 19.5,
        retailPrice: 65.0,
        primaryColor: "#334155",
        secondaryColor: "#94A3B8",
        accentColor: "#F59E0B",
        culturalRationale: "Recommandé par Qloo en affinité croisée avec les auditeurs de jazz acoustique nomades.",
        standardAlternative: "Adaptateur audio générique en plastique.",
        status: "approved",
        reviewerNote: "Marge brute unitaire très confortable.",
      },
    ],
  },
};

// ============================================================================
// 3. ILLUSTRATIONS VECTORIELLES DE PRODUITS (CLEAN TECHNICAL STUDIO)
// ============================================================================

interface ProductIllustrationProps {
  garmentType: GarmentType;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

const ProductIllustration: React.FC<ProductIllustrationProps> = ({
  garmentType,
  primaryColor,
  secondaryColor,
  accentColor,
}) => {
  return (
    <div className="relative w-full h-48 bg-slate-50/80 rounded-lg border border-slate-200/70 flex items-center justify-center overflow-hidden group">
      {/* Subtle studio dot pattern */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      <svg
        viewBox="0 0 240 180"
        className="w-40 h-36 transition-transform duration-300 group-hover:scale-105 drop-shadow-sm"
      >
        {garmentType === "object" && <g><rect x="65" y="40" width="110" height="110" rx="12" fill={primaryColor} /><path d="M65 65 L120 92 L175 65 M120 92 V150" fill="none" stroke={secondaryColor} strokeWidth="2" /><rect x="107" y="57" width="26" height="10" rx="2" fill={accentColor} /></g>}
        {garmentType === "hoodie" && (
          <g>
            <path
              d="M78,34 L54,44 L28,106 L48,116 L64,76 L64,154 L176,154 L176,76 L192,116 L212,106 L186,44 L162,34 Z"
              fill={primaryColor}
              stroke="#0F172A"
              strokeWidth="1.2"
              strokeOpacity="0.25"
            />
            <path
              d="M78,34 C78,12 162,12 162,34 C146,42 94,42 78,34 Z"
              fill={primaryColor}
              stroke="#0F172A"
              strokeWidth="1.2"
              strokeOpacity="0.3"
            />
            <path
              d="M86,112 L154,112 L160,142 L80,142 Z"
              fill="#000000"
              fillOpacity="0.12"
            />
            <rect x="64" y="142" width="112" height="12" fill="#000000" fillOpacity="0.2" />
            <rect x="92" y="62" width="56" height="22" fill="none" stroke={secondaryColor} strokeWidth="1" opacity="0.7" />
            <line x1="98" y1="70" x2="132" y2="70" stroke={accentColor} strokeWidth="2" />
            <rect x="148" y="130" width="12" height="7" fill={accentColor} rx="1" />
          </g>
        )}

        {garmentType === "tee" && (
          <g>
            <path
              d="M80,32 L38,50 L50,94 L70,84 L70,156 L170,156 L170,84 L190,94 L202,50 L160,32 Z"
              fill={primaryColor}
              stroke="#0F172A"
              strokeWidth="1.2"
              strokeOpacity="0.25"
            />
            <path
              d="M80,32 Q120,46 160,32 Q120,39 80,32 Z"
              fill={secondaryColor}
            />
            <line x1="132" y1="66" x2="152" y2="66" stroke={secondaryColor} strokeWidth="2.5" />
            <circle cx="126" cy="66" r="2.5" fill={accentColor} />
          </g>
        )}

        {garmentType === "tote" && (
          <g>
            <path
              d="M90,50 L90,20 L150,20 L150,50"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="6"
            />
            <rect
              x="64"
              y="48"
              width="112"
              height="110"
              rx="3"
              fill={primaryColor}
              stroke="#0F172A"
              strokeWidth="1.2"
              strokeOpacity="0.25"
            />
            <rect x="86" y="48" width="7" height="110" fill="#000000" fillOpacity="0.2" />
            <rect x="147" y="48" width="7" height="110" fill="#000000" fillOpacity="0.2" />
            <circle cx="120" cy="102" r="14" fill="none" stroke={secondaryColor} strokeWidth="1.2" opacity="0.8" />
            <rect x="132" y="134" width="14" height="8" fill={accentColor} rx="1" />
          </g>
        )}

        {garmentType === "vinyl" && (
          <g>
            <circle cx="146" cy="92" r="48" fill="#18181B" />
            <circle cx="146" cy="92" r="34" fill="none" stroke="#3F3F46" strokeWidth="0.8" />
            <circle cx="146" cy="92" r="15" fill={accentColor} />
            <circle cx="146" cy="92" r="3" fill="#FAFAFA" />
            <rect
              x="44"
              y="42"
              width="100"
              height="100"
              rx="2"
              fill={primaryColor}
              stroke="#0F172A"
              strokeWidth="1.2"
              strokeOpacity="0.25"
            />
            <rect x="56" y="42" width="18" height="100" fill={accentColor} opacity="0.9" />
            <rect x="84" y="60" width="44" height="44" fill="none" stroke={secondaryColor} strokeWidth="1.2" />
          </g>
        )}

        {garmentType === "cap" && (
          <g>
            <path
              d="M58,108 C58,56 168,56 168,108 Z"
              fill={primaryColor}
              stroke="#0F172A"
              strokeWidth="1.2"
              strokeOpacity="0.25"
            />
            <path
              d="M54,108 L174,108 L200,122 C152,130 88,126 54,108 Z"
              fill={secondaryColor}
              stroke="#0F172A"
              strokeWidth="1"
              strokeOpacity="0.2"
            />
            <rect x="96" y="80" width="34" height="14" rx="2" fill={accentColor} />
          </g>
        )}

        {garmentType === "ceramic" && (
          <g>
            <path
              d="M80,44 L160,44 L152,142 C152,148 88,148 88,142 Z"
              fill={primaryColor}
              stroke="#0F172A"
              strokeWidth="1.2"
              strokeOpacity="0.25"
            />
            <path
              d="M80,44 L160,44 L156,96 C132,102 108,90 84,98 Z"
              fill={secondaryColor}
              opacity="0.85"
            />
            <path
              d="M87,132 L153,132 L152,144 L88,144 Z"
              fill={accentColor}
              opacity="0.75"
            />
          </g>
        )}

        {(garmentType === "audio" || (!["hoodie", "tee", "tote", "vinyl", "cap", "ceramic", "object"].includes(garmentType))) && (
          <g>
            <path
              d="M72,96 C72,44 168,44 168,96"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M86,62 C106,52 134,52 154,62"
              fill="none"
              stroke={primaryColor}
              strokeWidth="8"
              strokeLinecap="round"
            />
            <rect x="58" y="84" width="26" height="44" rx="10" fill={primaryColor} stroke="#0F172A" strokeWidth="1.2" strokeOpacity="0.25" />
            <rect x="67" y="93" width="8" height="26" rx="2" fill={accentColor} />
            <rect x="156" y="84" width="26" height="44" rx="10" fill={primaryColor} stroke="#0F172A" strokeWidth="1.2" strokeOpacity="0.25" />
            <rect x="165" y="93" width="8" height="26" rx="2" fill={accentColor} />
            <path d="M71,128 C71,148 105,156 120,156" fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="120" cy="156" r="3" fill={accentColor} />
          </g>
        )}
      </svg>

      <span className="absolute top-2 right-2 text-[10px] text-slate-500">Illustration indicative</span>
      {/* Color swatches */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full border border-slate-200/80 shadow-2xs">
        <span
          className="w-3 h-3 rounded-full border border-slate-300"
          style={{ backgroundColor: primaryColor }}
        />
        <span
          className="w-3 h-3 rounded-full border border-slate-300"
          style={{ backgroundColor: secondaryColor }}
        />
        <span
          className="w-3 h-3 rounded-full border border-slate-300"
          style={{ backgroundColor: accentColor }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// 4. APPLICATION PRINCIPALE (DESIGN SYSTEM SAAS B2B)
// ============================================================================

type NavSection =
  | "dashboard"
  | "analyses"
  | "collections"
  | "catalogue"
  | "approbations";

export default function App() {
  // --- Workspace & Navigation ---
  const [workspaceKey, setWorkspaceKey] = useState<string>("monolith");
  const currentWorkspace = WORKSPACES[workspaceKey];
  const [activeNav, setActiveNav] = useState<NavSection>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [activeNav]);

  // --- État interactif : Audience & Paramètres ---
  const [seeds, setSeeds] = useState<CulturalSeed[]>(currentWorkspace.seeds);
  const [profile, setProfile] = useState<AudienceProfile>(currentWorkspace.profile);
  const [newSeedInput, setNewSeedInput] = useState("");
  const [newSeedDomain, setNewSeedDomain] = useState<CulturalDomain>("Musique");
  const [newSeedWeight, setNewSeedWeight] = useState<CulturalSeed["weight"]>("Principal");

  // --- État interactif : Simulation d'analyse & Liaison Backend ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const requestVersion = useRef(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const [submittedInput, setSubmittedInput] = useState("");
  const [analysisBanner, setAnalysisBanner] = useState<string | null>(null);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [realComparison, setRealComparison] = useState<ABComparisonResult | null>(null);
  const [provenance, setProvenance] = useState<AnalysisProvenance | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [customBrief, setCustomBrief] = useState<string>(currentWorkspace.summary);

  useEffect(() => {
    const reqId = new URLSearchParams(window.location.search).get("analysisId");
    if (!reqId) return;
    fetch(`/api/analysis/${encodeURIComponent(reqId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json?.success || !json?.data) throw new Error("Analyse introuvable. Lancez une nouvelle analyse.");
        {
          const comp = asStoredAnalysis(json.data as ABComparisonResult);
          setActiveAnalysisId(comp.id);
          setRealComparison(comp);
          setCustomBrief(comp.brief);
          const initialSeeds: CulturalSeed[] = (comp.request?.seeds || []).map((seed, index) => ({
            id: `s-${index}`, label: seed.label, domain: seed.domain, weight: seed.weight,
          }));
          setSeeds(initialSeeds);
          if (comp.brief.toLowerCase().includes("tokyo") || comp.brief.toLowerCase().includes("jazz")) {
            setWorkspaceKey("tokyo");
          } else if (comp.brief.toLowerCase().includes("lumière") || comp.brief.toLowerCase().includes("lumiere") || comp.brief.toLowerCase().includes("cinéma")) {
            setWorkspaceKey("lumiere");
          } else {
            setWorkspaceKey("monolith");
          }
          if (comp.request?.minMargin !== undefined) {
            const minMargin = comp.request.minMargin;
            setProfile((prev) => ({ ...prev, targetMargin: Math.round(minMargin * 100) }));
          }
          setSubmittedInput(JSON.stringify({
            brief: comp.brief.trim(),
            bundleSize: comp.request?.bundleSize || 4,
            minMargin: comp.request?.minMargin ?? 0.35,
            seeds: initialSeeds.map((s) => ({ label: s.label, domain: s.domain, weight: s.weight }))
          }));
          const dataState = comp.branchB_with_qloo.data_state;
          const prov: AnalysisProvenance = {
            qlooMode: dataState,
            qlooEntitiesCount: comp.provenance?.anchors?.length || 0,
            llmModelUsed: comp.provenance?.planner || "Mode non renseigné",
            catalogSkusEvaluated: comp.provenance?.catalog_count || 0,
            executionTimestamp: comp.created_at,
          };
          setProvenance(prov);
          const mappedProds = comp.branchB_with_qloo.items.map(
            (item: MerchandisingScore, idx: number) => ({
              ...mapScoreToCatalogProduct(item, idx),
              status: comp.product_reviews?.[item.product.sku]?.status || "pending" as ApprovalStatus,
              reviewerNote: comp.product_reviews?.[item.product.sku]?.notes || "",
            })
          );
          setProducts(mappedProds);
        }
      })
      .catch((error) => setApiError(error instanceof Error ? error.message : "Impossible de charger l’analyse."));
  }, []);

  // --- État interactif : Catalogue & Approbations ---
  const [products, setProducts] = useState<CatalogProduct[]>(currentWorkspace.products);
  const [categoryFilter, setCategoryFilter] = useState<string>("Tous");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  // --- Modal d'intégration technique Next.js 16 ---
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Changement de projet / workspace
  const handleSwitchWorkspace = (key: string) => {
    setIsReviewing(false);
    requestVersion.current++;
    setIsAnalyzing(false);
    setWorkspaceKey(key);
    const previewUrl = new URL(window.location.href);
    previewUrl.searchParams.delete("analysisId");
    window.history.replaceState(null, "", previewUrl);
    const next = WORKSPACES[key];
    setSeeds(next.seeds);
    setProfile(next.profile);
    setProducts(next.products);
    setSelectedProduct(null);
    setAnalysisBanner(null);
    setActiveAnalysisId(null);
    setRealComparison(null);
    setProvenance(null);
    setApiError(null);
    setCustomBrief(next.summary);
  };

  // Ajout / suppression de signal culturel
  const handleAddSeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeedInput.trim() || seeds.length >= 8) return;
    const item: CulturalSeed = {
      id: `seed-${Date.now()}`,
      label: newSeedInput.trim(),
      domain: newSeedDomain,
      weight: newSeedWeight,
    };
    setSeeds((prev) => [...prev, item]);
    setNewSeedInput("");
  };

  const handleRemoveSeed = (id: string) => {
    if (seeds.length <= 1) return;
    setSeeds((prev) => prev.filter((s) => s.id !== id));
  };

  // Exécuter l'analyse réelle via /api/analyze avec bascule gracieuse
  const handleRunAnalysis = async (explicitBrief?: string, activeSeeds: CulturalSeed[] = seeds) => {
    const version = ++requestVersion.current;
    setIsAnalyzing(true);
    setAnalysisBanner(null);
    setApiError(null);

    const targetBrief =
      (typeof explicitBrief === "string" && explicitBrief.trim()) ||
      customBrief.trim() ||
      `${currentWorkspace.brandName} - Capsule ${seeds.map((s) => s.label).join(", ")} (${profile.positioning})`;

    const input = { brief: targetBrief.trim(), bundleSize: 4, minMargin: profile.targetMargin / 100,
      seeds: activeSeeds.map(({ label, domain, weight }) => ({ label, domain, weight })) };
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `Erreur HTTP ${res.status}`);
      }

      const resBody = await res.json();
      if (version !== requestVersion.current) return;
      const comp: ABComparisonResult = resBody.data;
      if (resBody.success && comp) {
        setSubmittedInput(JSON.stringify(input));
        setNoteDrafts({});
        setSelectedProduct(null);
        setActiveAnalysisId(comp.id);
        const analysisUrl = new URL(window.location.href);
        analysisUrl.searchParams.set("analysisId", comp.id);
        window.history.replaceState(null, "", analysisUrl);
        setRealComparison(comp);
        const dataState = comp.branchB_with_qloo.data_state;
        const prov: AnalysisProvenance = {
          qlooMode: dataState,
          qlooEntitiesCount: comp.provenance?.anchors.length || 0,
          llmModelUsed: comp.provenance?.planner || "Mode non renseigné",
          catalogSkusEvaluated: comp.provenance?.catalog_count || 0,
          executionTimestamp: comp.created_at,
        };
        setProvenance(prov);

        {
          const mappedProds = comp.branchB_with_qloo.items.map(
            (item: MerchandisingScore, idx: number) => mapScoreToCatalogProduct(item, idx)
          );
          setProducts(mappedProds);
        }

        const modeBadge = qlooStateLabel(dataState);
        setAnalysisBanner(
          `Analyse CultMerch terminée (ID: ${comp.id.slice(-8)}) • Mode: ${modeBadge} • ${comp.provenance?.catalog_count || 0} SKUs traités • Écart de marge théorique : ${signed(comp.comparison_metrics.margin_delta_eur)} €`
        );
      }
    } catch (err: unknown) {
      if (version !== requestVersion.current) return;
      const msg = err instanceof Error ? err.message : "Erreur de connexion";
      setApiError(msg);
      setAnalysisBanner(null);
    } finally {
      if (version === requestVersion.current) setIsAnalyzing(false);
    }
  };

  const currentInput = JSON.stringify({ brief: customBrief.trim(), bundleSize: 4, minMargin: profile.targetMargin / 100,
    seeds: seeds.map(({ label, domain, weight }) => ({ label, domain, weight })) });
  const isStale = Boolean(realComparison && currentInput !== submittedInput);
  const canReview = Boolean(activeAnalysisId && realComparison?.branchB_with_qloo.items.length && !isStale && !isAnalyzing && !isReviewing);
  const canExport = canReview && realComparison?.status === "APPROVED";

  const submitReview = async (productId?: string, status: ApprovalStatus = "approved") => {
    if (!canReview) return;
    const version = requestVersion.current;
    setIsReviewing(true);
    setApiError(null);
    try {
      const response = await fetch(`/api/collection/${activeAnalysisId}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSku: productId, action: status === "approved" ? "APPROVE" : "REQUEST_REVISION", productNotes: productId ? undefined : noteDrafts,
          notes: productId ? noteDrafts[productId] : "Validation de toutes les références depuis le studio." }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || "Validation non enregistrée");
      if (version !== requestVersion.current) return;
      const updated = asStoredAnalysis(body.data as ABComparisonResult);
      setProvenance((previous) => previous ? { ...previous, qlooMode: updated.branchB_with_qloo.data_state } : previous);
      setRealComparison(updated);
      const mapped = updated.branchB_with_qloo.items.map((item, index) => ({
        ...mapScoreToCatalogProduct(item, index), status: updated.product_reviews?.[item.product.sku]?.status || "pending" as ApprovalStatus,
        reviewerNote: updated.product_reviews?.[item.product.sku]?.notes || "",
      }));
      setProducts(mapped);
      if (selectedProduct) setSelectedProduct(mapped.find((product) => product.id === selectedProduct.id) || null);
      setAnalysisBanner(updated.status === "APPROVED" ? "Collection validée : toutes les décisions sont enregistrées. Export disponible." : "Décision enregistrée pour cette référence. La collection reste à valider.");
    } catch (error) {
      if (version === requestVersion.current) setApiError(error instanceof Error ? error.message : "Validation non enregistrée");
    } finally { setIsReviewing(false); }
  };
  const handleProductStatus = (productId: string, status: ApprovalStatus) => submitReview(productId, status);
  const handleApproveAll = () => submitReview();

  // Calcul des indicateurs financiers et d'avancement
  const metrics = useMemo(() => {
    const total = products.length;
    const approved = products.filter((p) => p.status === "approved").length;
    const pending = products.filter((p) => p.status === "pending").length;
    const revision = products.filter((p) => p.status === "revision").length;

    const avgMargin =
      total > 0
        ? Math.round(
            products.reduce(
              (acc, p) => acc + ((p.retailPrice - p.unitCost) / p.retailPrice) * 100,
              0
            ) / total
          )
        : 0;

    const avgRetail =
      total > 0
        ? Math.round(products.reduce((acc, p) => acc + p.retailPrice, 0) / total)
        : 0;

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return {
      total,
      approved,
      pending,
      revision,
      avgMargin,
      avgRetail,
      approvalRate,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = categoryFilter === "Tous" || p.category === categoryFilter;
      const matchesQuery =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [products, categoryFilter, searchQuery]);

  const navItems: { id: NavSection; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analyses", label: "Analyses", icon: SlidersHorizontal, badge: `${seeds.length}` },
    { id: "collections", label: "Collections", icon: GitCompare },
    { id: "catalogue", label: "Catalogue", icon: ShoppingBag, badge: `${products.length}` },
    {
      id: "approbations",
      label: "Approbations",
      icon: CheckCircle2,
      badge: `${metrics.approved}/${metrics.total}`,
    },
  ];

  const handleCopyPayload = () => {
    const payload = JSON.stringify(realComparison || { mode: "PREVIEW", workspace: currentWorkspace.id, seeds, minMargin: profile.targetMargin / 100 }, null, 2);
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayBrandName = realComparison
    ? /tokyo sound bar/i.test(realComparison.brief) ? "Tokyo Sound Bar"
      : /cinéma lumière|cinema lumiere/i.test(realComparison.brief) ? "Cinéma Lumière & Roastery"
      : /monolith festival/i.test(realComparison.brief) ? "Monolith Festival"
      : "Audience personnalisée"
    : currentWorkspace.brandName;

  const displayWorkspace: WorkspaceDataset = realComparison ? {
    ...currentWorkspace,
    brandName: displayBrandName,
    campaignTitle: realComparison.branchB_with_qloo.title || currentWorkspace.campaignTitle,
    summary: realComparison.brief,
    insights: realComparison.branchB_with_qloo.items.map((item) => ({
      id: item.product.sku, title: item.product.name, domains: ["Lifestyle"],
      direction: item.qloo_evidence?.length ? `Correspondances Qloo : ${Array.from(new Set(item.qloo_evidence.map((signal) => signal.name))).join(", ")}.` : "Aucune correspondance Qloo explicite. Sélection selon le brief, la marge et le stock.",
      materialGuideline: item.product.notes_matieres.join(", ") || "Non renseigné dans le catalogue",
      pitfallsToAvoid: [],
    })),
  } : currentWorkspace;
  const selectedScore = realComparison?.branchB_with_qloo.items.find((item) => item.product.sku === selectedProduct?.sku);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex font-sans antialiased selection:bg-slate-900 selection:text-white">
      {/* =====================================================================
          SIDEBAR NAVIGATION (DESKTOP)
      ===================================================================== */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 bg-white border-r border-slate-200/80 z-30 justify-between">
        <div className="p-5 space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-semibold text-sm shadow-xs">
                C
              </div>
              <div>
                <span className="font-semibold text-sm tracking-tight text-slate-900 block leading-none">
                  CultMerch
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Cultural Retail OS
                </span>
              </div>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              v2.4
            </span>
          </div>

          {/* Workspace Switcher */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400 px-1 block">
              Exemples de brief
            </label>
            <select
              aria-label="Sélecteur de collection"
              value={workspaceKey}
              onChange={(e) => handleSwitchWorkspace(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              {Object.values(WORKSPACES).map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.brandName} ({ws.season})
                </option>
              ))}
            </select>
          </div>

          {/* Main Navigation */}
          <nav className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 px-2 pb-1">
              Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        active ? "text-white" : "text-slate-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${
                        active
                          ? "bg-white/15 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar : Simulation Notice & Next.js Integration */}
        <div className="p-4 border-t border-slate-200/80 space-y-3 bg-slate-50/50">
          <div className="px-2 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 leading-relaxed">
            <div className="font-semibold flex items-center gap-1.5 text-slate-900 mb-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  provenance?.qlooMode === "LIVE_QLOO"
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-500"
                }`}
              />
              {provenance
                ? qlooStateLabel(provenance.qlooMode)
                : "Données de prévisualisation"}
            </div>
            {provenance
              ? `${provenance.catalogSkusEvaluated} produits évalués • ${provenance.llmModelUsed}`
              : "Lancez une analyse pour vérifier les données Qloo disponibles."}
          </div>

          <button
            onClick={() => setIsApiModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-slate-500" />
              Exports & traçabilité
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </aside>

      {/* =====================================================================
          MAIN CONTENT AREA
      ===================================================================== */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="truncate">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{displayWorkspace.brandName}</span>
                <span>/</span>
                <span className="text-slate-900 font-medium truncate">
                  {displayWorkspace.campaignTitle}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  provenance?.qlooMode === "LIVE_QLOO"
                    ? "bg-emerald-500 animate-pulse"
                    : provenance?.qlooMode === "CACHED_QLOO"
                    ? "bg-cyan-500"
                    : provenance?.qlooMode === "MIXED_QLOO"
                    ? "bg-indigo-500"
                    : "bg-amber-500"
                }`}
              />
              {provenance
                ? qlooStateLabel(provenance.qlooMode)
                : "Aperçu illustratif"}
            </span>

            <button
              onClick={() => handleRunAnalysis()}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all shadow-2xs disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
              <span>{isAnalyzing ? "Calcul de l'analyse..." : "Actualiser l'analyse"}</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-2">
            <div className="pb-2">
              <select
                value={workspaceKey}
                onChange={(e) => {
                  handleSwitchWorkspace(e.target.value);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800"
              >
                {Object.values(WORKSPACES).map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.brandName} ({ws.season})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    activeNav === item.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notification Banner on Analysis Update */}
        {analysisBanner && (
          <div className="bg-emerald-50 border-b border-emerald-200/80 px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{analysisBanner}</span>
            </div>
            <button
              onClick={() => setAnalysisBanner(null)}
              className="text-emerald-700 hover:text-emerald-950 font-medium"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Page Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
          <JuryGuide />
          {apiError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{apiError}</div>}
          {isStale && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Paramètres modifiés. Relancez l’analyse pour actualiser les recommandations et réactiver la validation et l’export.</div>}
          {!realComparison && <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">Aperçu illustratif : les collections et indicateurs ci-dessous sont fictifs. Décrivez votre audience, puis lancez une analyse pour voir ce que Qloo change dans la sélection.</div>}
          {realComparison && activeNav === "analyses" && <AnalysisEvidence result={realComparison} />}
          {activeNav === "collections" && realComparison && <CollectionComparison result={realComparison} />}
          {/* =================================================================
              VUE 1 : DASHBOARD EXÉCUTIF
          ================================================================= */}
          {activeNav === "dashboard" && (
            <div className="space-y-8">
              {/* En-tête de section */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Vue d'ensemble • {displayWorkspace.season}
                  </span>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mt-1">
                    {realComparison
                      ? realComparison.branchB_with_qloo.title
                      : displayWorkspace.campaignTitle}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                    {realComparison
                      ? realComparison.brief
                      : displayWorkspace.summary}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveNav("analyses")}
                    className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                  >
                    Configurer l'audience
                  </button>
                  <button
                    onClick={() => setActiveNav("collections")}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Comparer les collections</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Pilotage de l'Agent en Langage Naturel */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Commande de l'Agent IA en Langage Naturel
                      </h2>
                      <p className="text-xs text-slate-500">
                        Décrivez l'univers ou le brief de votre capsule : l'agent déduit les affinités culturelles (Qloo), applique les contraintes financières et assemble la collection.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 self-start sm:self-auto shrink-0">
                    {provenance ? qlooStateLabel(provenance.qlooMode) : "Aperçu — lancer une analyse"}
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRunAnalysis(customBrief);
                  }}
                  className="space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={customBrief}
                        onChange={(e) => setCustomBrief(e.target.value)}
                        aria-label="Brief de la collection"
                        maxLength={2000}
                        placeholder="Ex: Capsule streetwear technique pour fans d'électro minimale, d'architecture brutaliste et de design suisse..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3.5 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isAnalyzing || !customBrief.trim()}
                      className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                      <span>{isAnalyzing ? "L'agent analyse..." : "Exécuter l'analyse"}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-500">{seeds.length} référence(s) culturelle(s) ajoutée(s) au brief · Marge minimale : {profile.targetMargin}%. <button type="button" className="underline underline-offset-2" onClick={() => setActiveNav("analyses")}>Configurer ces paramètres</button></p>
                  {/* Suggestions de briefs rapides */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-slate-400 font-medium">Exemples :</span>
                    {[
                      {
                        workspaceKey: "monolith",
                        label: "Monolith Festival (Techno & Brutalisme)",
                        brief:
                          "Monolith Festival - Capsule Automne/Hiver inspirée des synthétiseurs modulaires, de l'architecture brutaliste et du workwear technique.",
                        seeds: [
                          { id: "s1", label: "Kraftwerk", domain: "Musique" as CulturalDomain, weight: "Principal" as const },
                          { id: "s2", label: "Acronym", domain: "Mode" as CulturalDomain, weight: "Secondaire" as const },
                          { id: "s3", label: "Marcel Breuer", domain: "Art & Design" as CulturalDomain, weight: "Subtil" as const },
                        ],
                      },
                      {
                        workspaceKey: "lumiere",
                        label: "Cinéma Lumière (Cinéphiles & Céramique)",
                        brief:
                          "Cinéma Lumière & Roastery - Capsule sobre croisant le cinéma d'auteur 35mm, les cafés de spécialité et les matières brutes.",
                        seeds: [
                          { id: "b1", label: "Jean-Luc Godard", domain: "Cinéma" as CulturalDomain, weight: "Principal" as const },
                          { id: "b2", label: "Blue Bottle Coffee", domain: "Lifestyle" as CulturalDomain, weight: "Principal" as const },
                          { id: "b3", label: "A.P.C.", domain: "Mode" as CulturalDomain, weight: "Secondaire" as const },
                        ],
                      },
                      {
                        workspaceKey: "tokyo",
                        label: "Tokyo Sound Bar (Jazz & Denim)",
                        brief:
                          "Tokyo Sound Bar - Capsule confidentielle croisant le jazz spirituel, l'art du denim brut et la céramique japonaise artisanale.",
                        seeds: [
                          { id: "t1", label: "John Coltrane", domain: "Musique" as CulturalDomain, weight: "Principal" as const },
                          { id: "t2", label: "Our Legacy", domain: "Mode" as CulturalDomain, weight: "Secondaire" as const },
                          { id: "t3", label: "Muji", domain: "Lifestyle" as CulturalDomain, weight: "Subtil" as const },
                        ],
                      },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setWorkspaceKey(item.workspaceKey);
                          setCustomBrief(item.brief);
                          setSeeds(item.seeds);
                          handleRunAnalysis(item.brief, item.seeds);
                        }}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 transition-colors cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </form>
              </div>

              {realComparison && <AnalysisEvidence result={realComparison} />}

              {/* Cartes de métriques commerciales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Marge brute prévisionnelle</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-slate-900">
                      {metrics.avgMargin}%
                    </span>
                    {realComparison ? (
                      <span className={`text-xs font-medium ${realComparison.comparison_metrics.margin_delta_eur >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        {signed(realComparison.comparison_metrics.margin_delta_eur)} € vs sans Qloo
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">Aperçu fictif</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Calcul sur le catalogue fictif, sans ventes mesurées
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Prix retail moyen</span>
                    <ShoppingBag className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-slate-900">
                      {metrics.avgRetail} €
                    </span>
                    <span className="text-xs text-slate-500">
                      {realComparison ? "Sélection calculée" : "Exemple illustratif"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Prix issus du catalogue de démonstration
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Signaux culturels actifs</span>
                    <Layers className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-slate-900">
                      {realComparison?.provenance?.signals.length ?? seeds.length}
                    </span>
                    <span className="text-xs text-slate-500">
                      {realComparison ? `${provenance?.qlooEntitiesCount || 0} entités résolues` : `${displayWorkspace.insights.length} exemples éditoriaux`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {provenance ? qlooStateLabel(provenance.qlooMode) : "Données d’affinités simulées"}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Statut d'approbation</span>
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-slate-900">
                      {metrics.approved} / {metrics.total}
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      ({metrics.approvalRate}% validés)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-slate-900 transition-all duration-300"
                      style={{ width: `${metrics.approvalRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Parcours guidé en 4 étapes claires */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Flux de conception de la collection
                    </h2>
                    <p className="text-xs text-slate-500">
                      Parcours structuré de l'analyse culturelle jusqu'au bon à tirer (BAT).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    {
                      step: "01",
                      title: "Audience & Signaux",
                      desc: `${seeds.length} repères culturels configurés pour orienter la direction artistique.`,
                      target: "analyses" as NavSection,
                      cta: "Ajuster l'audience",
                    },
                    {
                      step: "02",
                      title: "Comparatif Stratégique",
                      desc: "Évaluation de l'écart de valeur entre une collection standard et l'approche affinitaire.",
                      target: "collections" as NavSection,
                      cta: "Voir le comparatif",
                    },
                    {
                      step: "03",
                      title: "Catalogue & Coûts",
                      desc: `${products.length} références détaillées avec grammages, finitions et marges.`,
                      target: "catalogue" as NavSection,
                      cta: "Explorer les produits",
                    },
                    {
                      step: "04",
                      title: "Approbation Finale",
                      desc: `${metrics.pending + metrics.revision} référence(s) en attente de validation avant mise en production.`,
                      target: "approbations" as NavSection,
                      cta: "Valider le lancement",
                    },
                  ].map((wf) => (
                    <div
                      key={wf.step}
                      onClick={() => setActiveNav(wf.target)}
                      className="group p-4 rounded-lg border border-slate-200/80 hover:border-slate-900/40 bg-slate-50/40 hover:bg-white transition-all flex flex-col justify-between cursor-pointer"
                    >
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono font-semibold text-slate-400">
                          ÉTAPE {wf.step}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {wf.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {wf.desc}
                        </p>
                      </div>
                      <div className="pt-4 flex items-center gap-1 text-xs font-medium text-slate-900 group-hover:translate-x-0.5 transition-transform">
                        <span>{wf.cta}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aperçu rapide : Recommandations & Produits phares */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Synthèse des axes créatifs (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Correspondances par produit
                      </h2>
                      <span className="text-[11px] text-slate-400">
                        {provenance ? qlooStateLabel(provenance.qlooMode) : "Exemple simulé"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {displayWorkspace.insights.map((insight) => (
                        <div
                          key={insight.id}
                          className="p-4 rounded-lg bg-slate-50 border border-slate-200/60 space-y-2"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {insight.domains.map((d) => (
                              <span
                                key={d}
                                className="text-[10px] font-medium px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {insight.title}
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {insight.direction}
                          </p>
                          <div className="pt-1 text-[11px] text-slate-500">
                            <span className="font-medium text-slate-700">
                              Matières du catalogue :{" "}
                            </span>
                            {insight.materialGuideline}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveNav("analyses")}
                    className="w-full py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border-t border-slate-100 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Modifier les signaux d'entrée</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Aperçu des produits de la capsule (7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Pièces principales de la collection
                      </h2>
                      <p className="text-xs text-slate-500">
                        Cliquez sur une pièce pour inspecter sa fiche technique et ses marges.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveNav("catalogue")}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Tout le catalogue</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {products.slice(0, 3).map((prod) => {
                      const margin = Math.round(
                        ((prod.retailPrice - prod.unitCost) / prod.retailPrice) * 100
                      );
                      return (
                        <div
                          key={prod.id}
                          onClick={() => setSelectedProduct(prod)}
                          className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-4 hover:bg-slate-50/70 px-2 -mx-2 rounded-lg transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className="w-10 h-10 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: prod.primaryColor }}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: prod.accentColor }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900 truncate">
                                  {prod.name}
                                </span>
                                <span className="text-[11px] font-mono text-slate-400">
                                  {prod.sku}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 truncate">
                                {prod.specs} • {prod.fit}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-5 shrink-0">
                            <div className="text-right hidden sm:block">
                              <span className="text-xs font-semibold text-slate-900 block">
                                {prod.retailPrice} €
                              </span>
                              <span className="text-[11px] text-emerald-600 font-medium">
                                Marge {margin}%
                              </span>
                            </div>

                            <span
                              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                                prod.status === "approved"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : prod.status === "revision"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {prod.status === "approved"
                                ? "Approuvé"
                                : prod.status === "revision"
                                ? "À réviser"
                                : "En attente"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VUE 2 : ANALYSES & DÉFINITION D'AUDIENCE
          ================================================================= */}
          {activeNav === "analyses" && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Étape 1 • Calibration Culturelle
                  </span>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mt-1">
                    Audience & Recommandations Créatives
                  </h1>
                  <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                    Définissez les entités culturelles de votre audience pour rechercher des affinités et classer les références du catalogue.
                  </p>
                </div>
                <button
                  onClick={() => setActiveNav("collections")}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <span>Comparer les collections générées</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Colonne gauche : Signaux & Paramètres (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Ajout de signal culturel */}
                  <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          Signaux culturels de l'audience
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Ces références alimentent la recherche d'affinités croisées.
                        </p>
                      </div>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                        {seeds.length} actifs
                      </span>
                    </div>

                    <form onSubmit={handleAddSeed} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <select
                        aria-label="Domaine"
                        value={newSeedDomain}
                        onChange={(e) => setNewSeedDomain(e.target.value as CulturalDomain)}
                        className="sm:col-span-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-900"
                      >
                        <option value="Musique">Musique</option>
                        <option value="Cinéma">Cinéma</option>
                        <option value="Mode">Mode</option>
                        <option value="Art & Design">Art & Design</option>
                        <option value="Lifestyle">Lifestyle</option>
                        <option value="Édition">Édition</option>
                      </select>

                      <input
                        type="text"
                        value={newSeedInput}
                        onChange={(e) => setNewSeedInput(e.target.value)}
                        placeholder="Ajouter une entité précise (ex: Daft Punk, Aesop...)"
                        maxLength={120}
                        disabled={seeds.length >= 8}
                        className="sm:col-span-5 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                      />

                      <select
                        aria-label="Importance"
                        value={newSeedWeight}
                        onChange={(e) =>
                          setNewSeedWeight(e.target.value as CulturalSeed["weight"])
                        }
                        className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-900"
                      >
                        <option value="Principal">Principal</option>
                        <option value="Secondaire">Secondaire</option>
                        <option value="Subtil">Subtil</option>
                      </select>

                      <button
                        type="submit"
                        className="sm:col-span-2 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter</span>
                      </button>
                    </form>

                    <p className="text-xs text-slate-500">{seeds.length}/8 références. Chaque nom est recherché dans Qloo. Priorités de classement : Principal 3, Secondaire 2, Subtil 1.</p>
                    {/* Liste épurée des signaux */}
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {seeds.map((seed) => (
                        <div
                          key={seed.id}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                              {seed.domain}
                            </span>
                            <span className="text-sm font-medium text-slate-900">
                              {seed.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                                seed.weight === "Principal"
                                  ? "bg-slate-900 text-white"
                                  : seed.weight === "Secondaire"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-slate-50 text-slate-500 border border-slate-200"
                              }`}
                            >
                              {seed.weight}
                            </span>
                            <button
                              onClick={() => handleRemoveSeed(seed.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                              title="Retirer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Paramètres de positionnement commercial */}
                  <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6 space-y-5">
                    <h2 className="text-base font-semibold text-slate-900">
                      Contraintes de sélection
                    </h2>

                    <div className="max-w-md">
                      <div>
                        <div className="flex justify-between text-xs font-medium text-slate-700 mb-2">
                          <span>Objectif de marge brute</span>
                          <span className="text-emerald-700 font-semibold">
                            {profile.targetMargin}%
                          </span>
                        </div>
                        <input
                          type="range"
                          aria-label="Marge minimale"
                          min="35"
                          max="85"
                          value={profile.targetMargin}
                          onChange={(e) =>
                            setProfile({
                              ...profile,
                              targetMargin: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full accent-slate-900 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <span className="text-[11px] text-slate-400 block mt-1">
                          Exclut tout produit sous ce seuil. Les stocks doivent être supérieurs à zéro.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colonne droite : Recommandations d'affinités croisées (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          Synthèse des affinités croisées
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Correspondances entre les signaux collectés et les produits retenus.
                        </p>
                      </div>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60">
                        {provenance ? qlooStateLabel(provenance.qlooMode) : "Simulé"}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {displayWorkspace.insights.map((node) => (
                        <div
                          key={node.id}
                          className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-3"
                        >
                          <div className="flex items-center gap-1.5">
                            {node.domains.map((dom, idx) => (
                              <React.Fragment key={dom}>
                                <span className="text-[11px] font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {dom}
                                </span>
                                {idx < node.domains.length - 1 && (
                                  <span className="text-slate-400 text-xs">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              {node.title}
                            </h3>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              {node.direction}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-lg bg-white border border-slate-200/60 text-xs">
                            <span className="font-medium text-slate-900 block mb-0.5">
                              Matières du catalogue
                            </span>
                            <span className="text-slate-600">
                              {node.materialGuideline}
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] font-medium text-slate-500 block mb-1.5">
                              Limites documentées :
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {node.pitfallsToAvoid.map((p) => (
                                <span
                                  key={p}
                                  className="text-[11px] px-2 py-0.5 rounded bg-rose-50/70 text-rose-700 border border-rose-200/60"
                                >
                                  ✕ {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VUE 3 : COMPARATEUR DE COLLECTIONS (SANS VS AVEC QLOO)
          ================================================================= */}
          {activeNav === "collections" && !realComparison && (
            <section className="space-y-5">
              <h1 className="text-2xl font-semibold text-slate-900">Aperçu du comparatif de collections</h1>
              <p className="text-sm text-slate-600">Exemples éditoriaux fictifs. Lancez une analyse pour comparer les références réellement sélectionnées avec et sans Qloo.</p>
              <div className="grid md:grid-cols-2 gap-5">
                {[currentWorkspace.comparison.standardApproach, currentWorkspace.comparison.culturalApproach].map((direction) => (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3" key={direction.title}>
                    <h2 className="font-semibold text-slate-900">{direction.title}</h2>
                    <p className="text-sm text-slate-600">{direction.positioningStatement}</p>
                    <p className="text-xs text-slate-500">{direction.fabricStrategy}</p>
                  </div>
                ))}
              </div>
              <button className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm" onClick={() => setActiveNav("dashboard")}>Définir un brief et lancer l’analyse</button>
            </section>
          )}

          {/* =================================================================
              VUE 4 : CATALOGUE DE PRODUITS & MARGES
          ================================================================= */}
          {activeNav === "catalogue" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Étape 3 • Développement Produit
                  </span>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mt-1">
                    Catalogue & Spécifications Techniques
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Consultez les fiches techniques, la structure de coûts et la justification culturelle de chaque référence.
                  </p>
                </div>

                <button
                  onClick={() => setActiveNav("approbations")}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <span>Passer aux approbations ({metrics.approved}/{metrics.total})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Barre de filtres et recherche */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {["Tous", "Textile", "Accessoires", "Objets & Éditions"].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          categoryFilter === cat
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom ou SKU..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Grille de produits sobre type Shopify / Linear */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProducts.map((product) => {
                  const unitMargin = product.retailPrice - product.unitCost;
                  const marginPct = Math.round(
                    (unitMargin / product.retailPrice) * 100
                  );

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 shadow-2xs p-5 flex flex-col justify-between transition-all"
                    >
                      <div className="space-y-4">
                        {/* Header Carte */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {product.sku}
                            </span>
                            <span className="text-xs text-slate-500">
                              {product.category}
                            </span>
                          </div>

                          <span
                            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                              product.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : product.status === "revision"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {product.status === "approved"
                              ? "Approuvé"
                              : product.status === "revision"
                              ? "À réviser"
                              : "En attente"}
                          </span>
                        </div>

                        {/* Illustration vectorielle propre */}
                        <div
                          onClick={() => setSelectedProduct(product)}
                          className="cursor-pointer"
                        >
                          <ProductIllustration
                            garmentType={product.garmentType}
                            primaryColor={product.primaryColor}
                            secondaryColor={product.secondaryColor}
                            accentColor={product.accentColor}
                          />
                        </div>

                        {/* Infos Produit */}
                        <div>
                          <h3
                            onClick={() => setSelectedProduct(product)}
                            className="text-base font-semibold text-slate-900 hover:underline cursor-pointer"
                          >
                            {product.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {product.specs} • {product.fit}
                          </p>
                        </div>

                        {/* Recommandation culturelle concise */}
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-600 leading-relaxed">
                          <span className="font-medium text-slate-900 block mb-0.5">
                            Justification culturelle :
                          </span>
                          {product.culturalRationale}
                        </div>
                      </div>

                      {/* Footer Financier & Action */}
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[11px]">
                              Coût unitaire
                            </span>
                            <span className="font-medium text-slate-700">
                              {product.unitCost.toFixed(2)} €
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">
                              Prix retail
                            </span>
                            <span className="font-semibold text-slate-900">
                              {product.retailPrice.toFixed(0)} €
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">
                              Marge brute
                            </span>
                            <span className="font-semibold text-emerald-700">
                              {marginPct}% (+{unitMargin.toFixed(1)} €)
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors shadow-2xs cursor-pointer shrink-0"
                        >
                          Fiche détaillée
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              VUE 5 : APPROBATIONS & VALIDATION HUMAINE
          ================================================================= */}
          {activeNav === "approbations" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Étape 4 • Gouvernance & Bon à Tirer
                  </span>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mt-1">
                    Validation de la Collection
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Révisez chaque référence, ajoutez vos instructions d'atelier et validez les pièces pour débloquer l'export de production.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleApproveAll}
                    disabled={!canReview}
                    className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {isReviewing ? "Enregistrement…" : "Tout approuver"}
                  </button>
                  <button
                    onClick={() => setIsApiModalOpen(true)}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Exporter la collection</span>
                  </button>
                </div>
              </div>

              {/* Barre de progression globale */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      Avancement des validations : {metrics.approved} sur {metrics.total} références approuvées
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {metrics.approvalRate === 100
                      ? "Toutes les références sont validées et prêtes pour l'export ERP / Production."
                      : "Certaines pièces nécessitent encore une décision ou un ajustement technique."}
                  </p>
                </div>

                <div className="w-full sm:w-56 space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Progression</span>
                    <span className="text-slate-900">{metrics.approvalRate}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${metrics.approvalRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tableau de révision professionnel */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs divide-y divide-slate-200/70">
                {products.map((product) => {
                  const marginPct = Math.round(
                    ((product.retailPrice - product.unitCost) /
                      product.retailPrice) *
                      100
                  );
                  return (
                    <div key={product.id} className="p-5 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className="w-12 h-12 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center mt-0.5"
                            style={{ backgroundColor: product.primaryColor }}
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: product.accentColor }}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-slate-400">
                                {product.sku}
                              </span>
                              <h3 className="text-base font-semibold text-slate-900">
                                {product.name}
                              </h3>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {product.specs} • {product.finish}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs">
                              <span className="text-slate-600">
                                Coût : <strong>{product.unitCost.toFixed(2)} €</strong>
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-600">
                                Retail : <strong>{product.retailPrice} €</strong>
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="text-emerald-700 font-medium">
                                Marge : {marginPct}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Boutons d'arbitrage */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            disabled={!canReview}
                            onClick={() =>
                              handleProductStatus(product.id, "approved")
                            }
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                              product.status === "approved"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approuver</span>
                          </button>

                          <button
                            disabled={!canReview}
                            onClick={() =>
                              handleProductStatus(product.id, "revision")
                            }
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                              product.status === "revision"
                                ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            Demander révision
                          </button>
                        </div>
                      </div>

                      {/* Note d'atelier / Commentaire */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                        <input
                          type="text"
                          value={
                            noteDrafts[product.id] !== undefined
                              ? noteDrafts[product.id]
                              : product.reviewerNote
                          }
                          onChange={(e) =>
                            setNoteDrafts({
                              ...noteDrafts,
                              [product.id]: e.target.value,
                            })
                          }
                          placeholder="Ajouter une note de confection ou un commentaire de validation..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900"
                        />
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer"
                        >
                          Voir fiche complète →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =====================================================================
          MODAL FICHE TECHNIQUE PRODUIT
      ===================================================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-xl my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedProduct.sku}
                  </span>
                  <span className="text-xs text-slate-500">
                    {selectedProduct.category}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedProduct.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <ProductIllustration
                  garmentType={selectedProduct.garmentType}
                  primaryColor={selectedProduct.primaryColor}
                  secondaryColor={selectedProduct.secondaryColor}
                  accentColor={selectedProduct.accentColor}
                />

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Alternative promotionnelle écartée :
                  </span>
                  <p className="text-xs text-slate-600">
                    {selectedProduct.standardAlternative}
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-2.5">
                  <h3 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
                    Cahier des charges confection
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div>
                      <span className="text-slate-400 block">Grammage</span>
                      <span className="font-medium text-slate-800">
                        {selectedProduct.specs}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Coupe</span>
                      <span className="font-medium text-slate-800">
                        {selectedProduct.fit}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Finition</span>
                      <span className="font-medium text-slate-800">
                        {selectedProduct.finish}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Composition</span>
                      <span className="font-medium text-slate-800">
                        {selectedProduct.composition}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
                    Preuves culturelles & méthode de sélection
                  </h3>
                  <p className="text-slate-600 leading-relaxed p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    {selectedProduct.culturalRationale}
                  </p>
                  {selectedScore && <ProductEvidence item={selectedScore} />}
                </div>

                <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Coût</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {selectedProduct.unitCost.toFixed(2)} €
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Retail</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {selectedProduct.retailPrice} €
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Marge</span>
                    <span className="font-semibold text-emerald-700 text-sm">
                      {Math.round(
                        ((selectedProduct.retailPrice - selectedProduct.unitCost) /
                          selectedProduct.retailPrice) *
                          100
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Statut :{" "}
                <strong className="text-slate-900">
                  {selectedProduct.status === "approved"
                    ? "Approuvé"
                    : selectedProduct.status === "revision"
                    ? "En révision"
                    : "En attente"}
                </strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={!canReview}
                  onClick={() =>
                    handleProductStatus(selectedProduct.id, "revision")
                  }
                  className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Demander une révision
                </button>
                <button
                  disabled={!canReview}
                  onClick={() =>
                    handleProductStatus(selectedProduct.id, "approved")
                  }
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
                >
                  Approuver cette pièce
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL D'INTÉGRATION NEXT.JS 16
      ===================================================================== */}
      {isApiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full p-6 sm:p-7 space-y-5 shadow-xl my-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Exporter la collection validée
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exports JSON et CSV du catalogue de démonstration. Un connecteur Shopify ou ERP reste nécessaire pour publier en boutique.
                </p>
              </div>
              <button
                onClick={() => setIsApiModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">{canExport ? "Collection approuvée. Les exports incluent la provenance et les décisions enregistrées." : "L’export sera disponible après une analyse à jour et l’approbation de toutes les références."}</p>
            {exportNotice && (
              <div role="status" className="rounded-lg bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-900">
                {exportNotice}
              </div>
            )}
            {/* Export & Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={canExport ? `/api/export/${activeAnalysisId}?format=json` : "#"}
                onClick={(e) => {
                  if (!canExport) {
                    e.preventDefault();
                    setExportNotice("Veuillez lancer une analyse à jour et approuver l'ensemble des références avant de pouvoir exporter.");
                  }
                }}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  canExport
                    ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger Manifeste E-Commerce (.json)</span>
              </a>

              <a
                href={canExport ? `/api/export/${activeAnalysisId}?format=csv` : "#"}
                onClick={(e) => {
                  if (!canExport) {
                    e.preventDefault();
                    setExportNotice("Veuillez lancer une analyse à jour et approuver l'ensemble des références avant de pouvoir exporter.");
                  }
                }}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  canExport
                    ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer"
                    : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger Grille Logistique (.csv)</span>
              </a>
            </div>

            <div className="relative">
              <pre className="bg-slate-950 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-80 leading-relaxed">
                {JSON.stringify(
                  realComparison
                    ? {
                        analysisId: activeAnalysisId,
                        provenance,
                        branchA_without_qloo: {
                          total_basket_eur: realComparison.branchA_without_qloo.metrics.total_basket_eur,
                          average_margin_pct: realComparison.branchA_without_qloo.metrics.average_margin_pct,
                          item_count: realComparison.branchA_without_qloo.items.length,
                        },
                        branchB_with_qloo: {
                          total_basket_eur: realComparison.branchB_with_qloo.metrics.total_basket_eur,
                          average_margin_pct: realComparison.branchB_with_qloo.metrics.average_margin_pct,
                          average_mai_score: realComparison.branchB_with_qloo.metrics.average_mai_score,
                          item_count: realComparison.branchB_with_qloo.items.length,
                        },
                        comparison_metrics: realComparison.comparison_metrics,
                        decision_trace: realComparison.decision_trace,
                        approved_products: products
                          .filter((p) => p.status === "approved")
                          .map((p) => ({
                            sku: p.sku,
                            name: p.name,
                            unitCost: p.unitCost,
                            retailPrice: p.retailPrice,
                            note: p.reviewerNote,
                          })),
                      }
                    : {
                        _simulationNotice: "UI Preview Data — Exécutez l'analyse pour sérialiser le Taste Graph réel",
                        workspaceId: displayWorkspace.id,
                        season: displayWorkspace.season,
                        audienceProfile: profile,
                        culturalSeeds: seeds,
                        approvedSkus: products
                          .filter((p) => p.status === "approved")
                          .map((p) => ({
                            sku: p.sku,
                            name: p.name,
                            unitCost: p.unitCost,
                            retailPrice: p.retailPrice,
                            note: p.reviewerNote,
                          })),
                      },
                  null,
                  2
                )}
              </pre>
              <button
                onClick={handleCopyPayload}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-xs cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier le JSON</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}