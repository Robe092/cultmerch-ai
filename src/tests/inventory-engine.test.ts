import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Product } from "../types/index.js";
import {
  calculateMerchandisingScores,
  filterEligibleProducts,
  generateCollectionBundle,
} from "../lib/inventory-engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("⚙️ Moteur Commercial & Inventaire (Jalon 2 Indépendant)", () => {
  const catalogPath = path.resolve(__dirname, "../data/catalog_sample.json");
  const catalog: Product[] = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));

  it("exclut strictement les ruptures de stock (SKU-SYNTH-047)", () => {
    const { eligible, excluded } = filterEligibleProducts(catalog);

    const outOfStockItem = excluded.find((e) => e.product.sku === "SKU-SYNTH-047");
    assert.ok(outOfStockItem, "SKU-SYNTH-047 doit être exclu pour rupture de stock.");
    assert.match(outOfStockItem.reason, /Rupture d'inventaire/);

    assert.strictEqual(
      eligible.some((p) => p.sku === "SKU-SYNTH-047"),
      false,
      "Aucun produit en rupture ne doit figurer dans les éligibles."
    );
  });

  it("exclut strictement les produits à marge insuffisante < 35% (SKU-SYNTH-048)", () => {
    const { eligible, excluded } = filterEligibleProducts(catalog, { minMargin: 0.35 });

    const lowMarginItem = excluded.find((e) => e.product.sku === "SKU-SYNTH-048");
    assert.ok(lowMarginItem, "SKU-SYNTH-048 (marge 15%) doit être exclu pour marge insuffisante.");
    assert.match(lowMarginItem.reason, /Marge insuffisante/);

    assert.strictEqual(
      eligible.some((p) => p.sku === "SKU-SYNTH-048"),
      false,
      "Aucun produit à faible marge ne doit être éligible."
    );
  });

  it("conserve exactement 48 produits éligibles sur les 50 initiaux", () => {
    const { eligible } = filterEligibleProducts(catalog);
    assert.strictEqual(eligible.length, 48, "48 produits doivent être éligibles après exclusion des 2 cas limites.");
  });

  it("calcule des scores normalisés strictement dans l'intervalle [0.0, 1.0]", () => {
    const { eligible } = filterEligibleProducts(catalog);
    const scored = calculateMerchandisingScores(eligible, {
      targetTags: ["synthwave", "cyberpunk"],
    });

    for (const item of scored) {
      assert.ok(item.affinity_score >= 0 && item.affinity_score <= 1, `Affinité hors borne pour ${item.product.sku}`);
      assert.ok(item.margin_score >= 0 && item.margin_score <= 1, `Marge normalisée hors borne pour ${item.product.sku}`);
      assert.ok(item.stock_score >= 0 && item.stock_score <= 1, `Stock normalisé hors borne pour ${item.product.sku}`);
      assert.ok(item.mai_total >= 0 && item.mai_total <= 1, `MAI hors borne pour ${item.product.sku}`);
    }
  });

  it("attribue un MAI supérieur aux produits partageant les tags d'affinités ciblés", () => {
    const { eligible } = filterEligibleProducts(catalog);
    const scored = calculateMerchandisingScores(eligible, {
      targetTags: ["synthwave", "cyberpunk"],
    });

    const matchingProduct = scored.find((s) => s.product.sku === "SKU-SYNTH-001"); // Bomber Cyberpunk
    const nonMatchingProduct = scored.find((s) => s.product.sku === "SKU-SYNTH-038"); // Cidre Brut

    assert.ok(matchingProduct && nonMatchingProduct);
    assert.ok(
      matchingProduct.mai_total > nonMatchingProduct.mai_total,
      "Le produit avec affinité doit avoir un MAI supérieur au produit sans affinité."
    );
  });

  it("assemble un bundle optimisé de 4 produits avec calculs financiers exacts", () => {
    const { eligible } = filterEligibleProducts(catalog);
    const scored = calculateMerchandisingScores(eligible, {
      targetTags: ["synthwave", "neo-noir"],
    });
    const bundle = generateCollectionBundle(scored, 4);

    assert.strictEqual(bundle.items.length, 4, "Le bundle doit contenir 4 articles.");
    
    // Vérification de l'exactitude comptable
    const manualBasket = bundle.items.reduce((acc, i) => acc + i.product.price_eur, 0);
    const manualCost = bundle.items.reduce((acc, i) => acc + i.product.cost_eur, 0);
    const manualMarginEur = manualBasket - manualCost;
    const manualMarginPct = manualMarginEur / manualBasket;

    assert.strictEqual(bundle.metrics.total_basket_eur, Number(manualBasket.toFixed(2)));
    assert.strictEqual(bundle.metrics.total_margin_eur, Number(manualMarginEur.toFixed(2)));
    assert.strictEqual(bundle.metrics.average_margin_pct, Number(manualMarginPct.toFixed(4)));
  });
});
