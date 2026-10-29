import { describe, it } from "node:test";
import assert from "node:assert/strict";
import catalogData from "../data/catalog_sample.json";
import { Product } from "../types";
import {
  filterEligibleProducts,
  calculateMerchandisingScores,
  generateCollectionBundle,
} from "../lib/inventory-engine";
import { AgentOrchestrator } from "../lib/agent-orchestrator";

describe("🧪 Moteur Commercial — Invariants Stricts & Cas Limites", () => {
  const catalog = catalogData as Product[];

  it("invariant plancher : aucun article sélectionné ne peut enfreindre minMargin (50 tests aléatoires)", () => {
    for (let i = 0; i < 50; i++) {
      // Générer un seuil de marge aléatoire entre 0.35 et 0.70
      const threshold = Number((0.35 + Math.random() * 0.35).toFixed(2));
      const { eligible } = filterEligibleProducts(catalog, {
        minMargin: threshold,
        minStock: 1,
      });

      if (eligible.length >= 4) {
        const scored = calculateMerchandisingScores(eligible, {
          targetTags: ["minimalist", "craft", "workwear"],
        });
        const bundle = generateCollectionBundle(scored, 4);

        assert.equal(bundle.items.length, 4);
        for (const item of bundle.items) {
          assert.ok(
            item.product.margin_pct >= threshold,
            `Violation de marge : ${item.product.sku} a une marge de ${item.product.margin_pct} < ${threshold}`
          );
          assert.ok(
            item.product.stock_units >= 1,
            `Violation de stock : ${item.product.sku} a un stock de ${item.product.stock_units}`
          );
        }
      }
    }
  });

  it("invariant zero-stock : le SKU en rupture SKU-SYNTH-047 est systématiquement éliminé", () => {
    const { eligible, excluded } = filterEligibleProducts(catalog, {
      minMargin: 0.35,
      minStock: 1,
    });

    const hasZeroStockInEligible = eligible.some((p) => p.sku === "SKU-SYNTH-047" || p.stock_units < 1);
    assert.equal(hasZeroStockInEligible, false, "Le produit en rupture ne doit jamais figurer dans les éligibles");

    const zeroStockItem = excluded.find((p) => p.product.sku === "SKU-SYNTH-047");
    assert.ok(zeroStockItem, "SKU-SYNTH-047 doit figurer dans les exclus");
    assert.ok(
      zeroStockItem?.reason.includes("Rupture d'inventaire"),
      "La raison d'exclusion doit mentionner la rupture d'inventaire"
    );
  });

  it("invariant arithmétique financière : total_basket_eur et total_margin_eur sont strictement exacts", () => {
    const { eligible } = filterEligibleProducts(catalog, { minMargin: 0.40, minStock: 1 });
    const scored = calculateMerchandisingScores(eligible, { targetTags: ["japan-chic", "denim"] });
    const bundle = generateCollectionBundle(scored, 4);

    const calculatedBasket = Number(bundle.items.reduce((acc, i) => acc + i.product.price_eur, 0).toFixed(2));
    const calculatedCost = Number(bundle.items.reduce((acc, i) => acc + i.product.cost_eur, 0).toFixed(2));
    const calculatedMarginEur = Number((calculatedBasket - calculatedCost).toFixed(2));

    assert.equal(bundle.metrics.total_basket_eur, calculatedBasket);
    assert.equal(bundle.metrics.total_cost_eur, calculatedCost);
    assert.equal(bundle.metrics.total_margin_eur, calculatedMarginEur);
  });

  it("invariant MAI : tous les scores MAI sont strictement normalisés dans [0.0, 1.0]", () => {
    const { eligible } = filterEligibleProducts(catalog, { minMargin: 0.35, minStock: 1 });
    const scored = calculateMerchandisingScores(eligible, {
      targetTags: ["techno", "modular", "brutalist", "minimalist"],
    });

    for (const item of scored) {
      assert.ok(item.mai_total >= 0.0, `MAI négatif détecté sur ${item.product.sku}`);
      assert.ok(item.mai_total <= 1.0, `MAI supérieur à 1.0 détecté sur ${item.product.sku}`);
      assert.ok(item.affinity_score >= 0.0 && item.affinity_score <= 1.0);
      assert.ok(item.margin_score >= 0.0 && item.margin_score <= 1.0);
      assert.ok(item.stock_score >= 0.0 && item.stock_score <= 1.0);
    }
  });

  it("gestion d'un seuil impossible (minMargin: 0.99) : levée d'erreur explicite sans crash système", async () => {
    const orchestrator = new AgentOrchestrator();
    await assert.rejects(
      async () => {
        await orchestrator.runAnalysis("Festival Impossible", { minMargin: 0.99 });
      },
      (err: Error) => {
        assert.match(err.message, /Aucun produit du catalogue ne respecte le seuil de marge/);
        return true;
      }
    );
  });
});
