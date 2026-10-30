import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { displayAnalysisEn, summaryEn, textEn } from '../lib/display-en';
import type { ABComparisonResult } from '../types';

const fixture = () => JSON.parse(fs.readFileSync(new URL('./fixtures/stored-analysis.synthetic.json', import.meta.url), 'utf8')).result as ABComparisonResult;
it('English presentation keeps the original analysis immutable and preserves scores, provider evidence, dates and API reference codes', () => {
  const original = fixture();
  const before = structuredClone(original);
  const translated = displayAnalysisEn(original);
  assert.deepEqual(original, before);
  assert.notEqual(translated, original);
  assert.equal(translated.id, original.id);
  assert.equal(translated.created_at, original.created_at);
  assert.deepEqual(translated.request, original.request);
  assert.ok(translated.provenance && original.provenance);
  assert.equal(translated.provenance.qloo_state, original.provenance.qloo_state);
  assert.deepEqual(translated.provenance.signals, original.provenance.signals);
  for (const key of ['branchA_without_qloo', 'branchB_with_qloo'] as const) {
    assert.deepEqual(translated[key].metrics, original[key].metrics);
    assert.equal(translated[key].data_state, original[key].data_state);
    for (let index=0; index<original[key].items.length; index++) {
      const a=original[key].items[index], b=translated[key].items[index];
      assert.equal(a.product.sku,b.product.sku);
      assert.equal(a.mai_total,b.mai_total);
      assert.equal(a.product.price_eur,b.product.price_eur);
      assert.equal(a.product.stock_units,b.product.stock_units);
      assert.deepEqual(a.qloo_evidence?.map(({mapping_note,...e})=>e),b.qloo_evidence?.map(({mapping_note,...e})=>e));
    }
  }
  assert.deepEqual(displayAnalysisEn(translated), translated);
});
it('legacy records without a changed-product count do not invent a zero difference', () => {
  const result=fixture();
  delete result.comparison_metrics.changed_skus;
  assert.match(summaryEn(result), /count unavailable/);
});

it("editorial notes translate the local concept without changing the original Qloo signal name", () => {
  assert.equal(textEn("Traduction éditoriale locale : Jazz → Écoute et vinyle. Qloo fournit le signal ; cette interprétation est celle de CultMerch."), "Local editorial mapping: Jazz → Audio & vinyl. Qloo supplies the signal; this interpretation is made by CultMerch.");
});
