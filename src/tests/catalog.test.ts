import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CatalogSchema, Product } from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("📦 Validation du Catalogue Démo (50 SKUs)", () => {
  const catalogPath = path.resolve(__dirname, "../data/catalog_sample.json");
  const rawData = fs.readFileSync(catalogPath, "utf-8");
  const catalog: Product[] = JSON.parse(rawData);

  it("doit être un JSON valide conforme au schéma Zod CatalogSchema", () => {
    const parsed = CatalogSchema.safeParse(catalog);
    assert.strictEqual(parsed.success, true, `Erreur validation schéma: ${JSON.stringify(parsed.error?.format())}`);
  });

  it("doit contenir exactement 50 produits", () => {
    assert.strictEqual(catalog.length, 50, `Le catalogue contient ${catalog.length} produits au lieu de 50.`);
  });

  it("chaque produit doit être explicitement étiqueté comme fictif (is_synthetic: true)", () => {
    for (const item of catalog) {
      assert.strictEqual(item.is_synthetic, true, `Le produit ${item.sku} n'a pas is_synthetic: true`);
    }
  });

  it("tous les SKUs doivent être uniques", () => {
    const skus = new Set<string>();
    for (const item of catalog) {
      assert.strictEqual(skus.has(item.sku), false, `Doublon de SKU détecté: ${item.sku}`);
      skus.add(item.sku);
    }
  });

  it("les marges déclarées doivent être cohérentes avec prix et coût", () => {
    for (const item of catalog) {
      const calculatedMargin = (item.price_eur - item.cost_eur) / item.price_eur;
      const delta = Math.abs(calculatedMargin - item.margin_pct);
      assert.ok(delta < 0.02, `Marge incohérente pour ${item.sku}: déclaré=${item.margin_pct}, calculé=${calculatedMargin}`);
    }
  });

  it("doit contenir les cas de test limites pour la disqualification", () => {
    const outOfStock = catalog.filter((p) => p.stock_units === 0);
    assert.ok(outOfStock.length >= 1, "Il doit y avoir au moins 1 article en rupture de stock pour tester le filtre.");

    const lowMargin = catalog.filter((p) => p.margin_pct < 0.35);
    assert.ok(lowMargin.length >= 1, "Il doit y avoir au moins 1 article à marge < 35% pour tester le filtre.");
  });
});
