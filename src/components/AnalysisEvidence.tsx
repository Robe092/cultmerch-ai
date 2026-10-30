import { productNameEn, labelEn, summaryEn, textEn } from "@/lib/display-en";
import { CONCEPTS } from "@/lib/cultural-mapping";
import type { ABComparisonResult, MerchandisingScore, QlooDataState } from "@/types";

export const qlooStateLabel = (state?: QlooDataState): string => ({
  LIVE_QLOO: "Live Qloo", CACHED_QLOO: "Cached Qloo", MOCK_SIMULATED: "Simulation — synthetic data",
  MIXED_QLOO: "Partial or mixed result", NO_QLOO: "No usable Qloo data",
}[state || "MOCK_SIMULATED"]);
export const signed = (value: number, digits = 2) => `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;

export function ProductEvidence({ item }: { item: MerchandisingScore }) {
  const evidence = item.qloo_evidence || [];
  const unique = Array.from(new Map(evidence.map((signal) => [`${signal.anchor_id}:${signal.id}:${signal.name}`, signal])).values());
  return <div className="space-y-2 text-xs" data-testid="product-evidence">
    <p className="font-semibold text-slate-900">Why this product?</p>
    <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
      {unique.length ? unique.slice(0, 3).map((signal, index) => <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
        <p><strong>{signal.anchor_name}</strong> → {signal.name} → <strong>{productNameEn(item.product)}</strong></p>
        <p className="text-slate-500">{signal.match_method === "editorial_translation" ? "Local editorial mapping" : "Tag or brand match"} · {qlooStateLabel(signal.state)}</p>
        {signal.mapping_note && <p className="text-slate-600">{textEn(signal.mapping_note)}</p>}
        <p>{signal.score_available ? `Normalised affinity score: ${signal.affinity_score.toFixed(3)}` : "Affinity score not provided"} · Reference priority: {signal.weight}/3</p>
      </div>) : <p className="rounded-lg bg-amber-50 p-3 text-amber-900">No explicit Qloo match for this item. Selection uses the brief interpretation, margin and stock.</p>}
      {unique.length > 3 && <p className="text-[11px] text-slate-400 italic">+{unique.length - 3} additional Qloo matches used in scoring.</p>}
    </div>
    {item.brief_matches?.length ? <div className="rounded-lg border border-slate-200 p-2.5"><p className="font-medium text-slate-900">Brief relevance</p>{item.brief_matches.map((match, index) => <p key={index} className="text-slate-600">{labelEn(match.label)} · {match.method === "editorial_bridge" ? "editorial mapping" : "declared catalog feature"}</p>)}</div> : null}
    <p className="text-slate-600">Tags from brief interpretation: {item.semantic_matches?.map(labelEn).join(", ") || "none"}. These are not Qloo evidence.</p>
    <p className="text-slate-500">Internal MAI score: {(item.mai_total * 100).toFixed(1)}/100 (brief relevance, Qloo signals, margin and stock). This is not a purchase probability.</p>
  </div>;
}

export function AnalysisEvidence({ result }: { result: ABComparisonResult }) {
  const source = result.provenance;
  if (!source) return null;
  const matched = result.branchB_with_qloo.items.filter((item) => item.qloo_evidence?.length).length;
  const exampleItem = result.branchB_with_qloo.items.find((item) => item.qloo_evidence?.length);
  const exampleSignal = exampleItem?.qloo_evidence?.[0];
  return <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4" aria-label="Analysis evidence">
    <div className="flex flex-wrap justify-between gap-3">
      <div><h2 className="font-semibold text-slate-900">What Qloo contributed to this selection</h2><p className="text-xs text-slate-500 mt-1">{matched}/{result.branchB_with_qloo.items.length} items linked to a Qloo signal · {source.signals.length} signals collected</p></div>
      <span className={`text-xs rounded-lg px-3 py-2 ${source.qloo_state === "LIVE_QLOO" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{qlooStateLabel(source.qloo_state)}</span>
    </div>
    {exampleItem && exampleSignal && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"><strong>{exampleSignal.anchor_name}</strong> → {exampleSignal.name} → <strong>{productNameEn(exampleItem.product)}</strong><p className="text-xs text-slate-500 mt-1">{exampleSignal.match_method === "editorial_translation" ? "Local editorial mapping; inspect the evidence" : "Tag or brand match"} · {qlooStateLabel(exampleSignal.state)}</p></div>}
    {result.brief_profile && <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1"><p><strong>Interpreted brief:</strong> {result.brief_profile.concepts.map((id) => labelEn(CONCEPTS[id]?.label || id)).join(", ") || "unrecognised audience"}.</p><p>{result.matching_diagnostics?.relevant_candidates || 0} relevant products out of {result.matching_diagnostics?.financially_eligible || 0} eligible products under the commercial constraints. Irrelevant products are not used to fill the collection.</p>{result.brief_profile.excluded_concepts.length > 0 && <p>Exclusions: {result.brief_profile.excluded_concepts.map((id) => labelEn(CONCEPTS[id]?.label || id)).join(", ")}.</p>}</div>}
    <p className="text-sm text-slate-700">{summaryEn(result)}</p>
    {result.branchB_with_qloo.items.length < (result.request?.bundleSize || 4) && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Insufficient catalog: {result.branchB_with_qloo.items.length}/{result.request?.bundleSize || 4} relevant and eligible products. Refine the brief or expand the catalog; constraints are not relaxed.</p>}
    <p className="text-xs text-slate-500">Analysis recorded on {new Date(result.created_at).toLocaleString("en-GB")} · {source.catalog_count} synthetic products · Interpretation: {labelEn(source.planner)} · Copy: {labelEn(source.copywriter)}</p>
    <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-medium text-slate-700">Inspect resolved entities and request provenance</summary>
      <div className="mt-3 space-y-2 text-xs text-slate-600">
        {source.anchors.map((anchor, index) => <p key={index}>{anchor.query} → <strong>{anchor.name}</strong> · ID {anchor.id} · priority {anchor.weight}/3 · {qlooStateLabel(anchor.state)}</p>)}
        {source.target_brands?.length ? <p className="font-medium">Catalog brands evaluated: {source.target_brands.map((brand) => brand.name).join(", ")}. Product-to-brand associations are editorial and synthetic; affinity scores come from Qloo requests.</p> : null}
        {source.calls.map((call, index) => <p key={index} className="border-t border-slate-100 pt-2">{call.endpoint} · {qlooStateLabel(call.state)} · {call.count} result(s) · {new Date(call.captured_at).toLocaleTimeString("en-GB")}{call.error ? ` · ${call.error}` : ""}</p>)}
      </div>
    </details>
    <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-medium text-slate-700">Inspect collected signals, including unmatched signals</summary><div className="mt-3 max-h-64 overflow-y-auto space-y-2 text-xs text-slate-600">{source.signals.map((signal, index) => <p key={index}><strong>{signal.name}</strong> · {signal.type} · from {signal.anchor_name} · {signal.score_available ? `normalised affinity ${signal.affinity_score.toFixed(3)}` : "score not provided"} · {qlooStateLabel(signal.state)}</p>)}</div></details>
    <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-medium text-slate-700">Inspect the agent decision steps</summary><ol className="mt-3 space-y-2 text-xs text-slate-600">{result.decision_trace.map((step, index) => <li key={index}>{textEn(step)}</li>)}</ol></details>
    <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-medium text-slate-700">Inspect evidence by product</summary><div className="mt-4 grid gap-4 md:grid-cols-2">{result.branchB_with_qloo.items.map((item) => <ProductEvidence key={item.product.sku} item={item} />)}</div></details>
  </section>;
}

export function CollectionComparison({ result }: { result: ABComparisonResult }) {
  const a = result.branchA_without_qloo;
  const b = result.branchB_with_qloo;
  return <section className="space-y-5" aria-label="Comparison without and with Qloo">
    <div><h1 className="text-2xl font-semibold text-slate-900">Same brief, without and with Qloo</h1><p className="text-sm text-slate-600 mt-2">Same brief interpretation, synthetic catalog, margin and stock rules. Only Qloo signals are added to ranking B.</p></div>
    <div className="rounded-xl bg-slate-900 text-white p-5 space-y-2"><p className="text-lg font-semibold">Calculated gross-margin difference: {signed(result.comparison_metrics.margin_delta_eur)} €</p><p className="text-sm text-slate-300">{summaryEn(result)}</p><p className="text-xs text-slate-300">Qloo alignment score difference: {signed(result.comparison_metrics.cultural_relevance_delta * 100, 1)} points. Both selections are evaluated against the same signals. Missing data is not measured dislike. No conversion or sales uplift measured.</p></div>
    <div className="grid md:grid-cols-2 gap-5">{([a, b]).map((branch, index) => <div key={branch.id} className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
      <h2 className="font-semibold text-slate-900">{index ? "B · With Qloo signals" : "A · Without Qloo"}</h2><p className="text-xs text-slate-500">{index ? qlooStateLabel(branch.data_state) : "Brief interpretation and commercial constraints"}</p>
      <div className="grid grid-cols-2 gap-3 text-sm"><p>Basket: <strong>{branch.metrics.total_basket_eur.toFixed(2)} €</strong></p><p>Gross margin: <strong>{branch.metrics.total_margin_eur.toFixed(2)} €</strong></p></div>
      <p className="text-xs text-slate-600">Brief coverage: {Math.round((index ? result.comparison_metrics.brief_coverage_b || 0 : result.comparison_metrics.brief_coverage_a || 0) * 100)}% · Qloo alignment score (same scale): {((index ? result.comparison_metrics.qloo_alignment_b || 0 : result.comparison_metrics.qloo_alignment_a || 0) * 100).toFixed(1)}/100</p>
      <ul className="divide-y divide-slate-100">{branch.items.map((item) => <li className="py-3 space-y-1" key={item.product.sku}><p className="text-sm font-medium text-slate-900">{productNameEn(item.product)}</p><p className="text-xs text-slate-500">{item.product.sku} · {item.product.price_eur} € · margin {(item.product.margin_pct * 100).toFixed(1)}% · stock {item.product.stock_units}</p><p className="text-xs text-slate-600">{index ? `${item.qloo_evidence?.length || 0} explicit Qloo match(es)` : `Brief tags: ${item.semantic_matches?.map(labelEn).join(", ") || "none"}`}</p></li>)}</ul>
    </div>)}</div>
  </section>;
}
