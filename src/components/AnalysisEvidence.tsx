import { CONCEPTS } from "@/lib/cultural-mapping";
import type { ABComparisonResult, MerchandisingScore, QlooDataState } from "@/types";

export const qlooStateLabel = (state?: QlooDataState): string => ({
  LIVE_QLOO: "Qloo en direct", CACHED_QLOO: "Qloo en cache", MOCK_SIMULATED: "Simulation — données fictives",
  MIXED_QLOO: "Résultat partiel ou mixte", NO_QLOO: "Aucune donnée Qloo exploitable",
}[state || "MOCK_SIMULATED"]);
export const signed = (value: number, digits = 2) => `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;

export function ProductEvidence({ item }: { item: MerchandisingScore }) {
  const evidence = item.qloo_evidence || [];
  const unique = Array.from(new Map(evidence.map((signal) => [`${signal.anchor_id}:${signal.id}:${signal.name}`, signal])).values());
  return <div className="space-y-2 text-xs" data-testid="product-evidence">
    <p className="font-semibold text-slate-900">Pourquoi cette référence ?</p>
    <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
      {unique.length ? unique.slice(0, 3).map((signal, index) => <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
        <p><strong>{signal.anchor_name}</strong> → {signal.name} → <strong>{item.product.name}</strong></p>
        <p className="text-slate-500">{signal.match_method === "editorial_translation" ? "Passerelle éditoriale locale" : "Correspondance de tag ou de marque"} · {qlooStateLabel(signal.state)}</p>
        {signal.mapping_note && <p className="text-slate-600">{signal.mapping_note}</p>}
        <p>{signal.score_available ? `Score d’affinité normalisé : ${signal.affinity_score.toFixed(3)}` : "Score d’affinité non fourni"} · Priorité de la référence : {signal.weight}/3</p>
      </div>) : <p className="rounded-lg bg-amber-50 p-3 text-amber-900">Aucune correspondance Qloo explicite pour cet article. La sélection repose sur les déductions du brief, la marge et le stock.</p>}
      {unique.length > 3 && <p className="text-[11px] text-slate-400 italic">+{unique.length - 3} autre(s) correspondance(s) Qloo prises en compte dans le scoring.</p>}
    </div>
    {item.brief_matches?.length ? <div className="rounded-lg border border-slate-200 p-2.5"><p className="font-medium text-slate-900">Adéquation au brief</p>{item.brief_matches.map((match, index) => <p key={index} className="text-slate-600">{match.label} · {match.method === "editorial_bridge" ? "passerelle éditoriale" : "caractéristique déclarée du catalogue"}</p>)}</div> : null}
    <p className="text-slate-600">Tags issus de l’interprétation du brief : {item.semantic_matches?.join(", ") || "aucun"}. Ils ne constituent pas une preuve Qloo.</p>
    <p className="text-slate-500">Score interne MAI : {(item.mai_total * 100).toFixed(1)}/100 (adéquation au brief, signaux Qloo, marge, stock). Ce n’est pas une probabilité de vente.</p>
  </div>;
}

export function AnalysisEvidence({ result }: { result: ABComparisonResult }) {
  const source = result.provenance;
  if (!source) return null;
  const matched = result.branchB_with_qloo.items.filter((item) => item.qloo_evidence?.length).length;
  const exampleItem = result.branchB_with_qloo.items.find((item) => item.qloo_evidence?.length);
  const exampleSignal = exampleItem?.qloo_evidence?.[0];
  return <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4" aria-label="Preuves de l’analyse">
    <div className="flex flex-wrap justify-between gap-3">
      <div><h2 className="font-semibold text-slate-900">Ce que Qloo a apporté à cette sélection</h2><p className="text-xs text-slate-500 mt-1">{matched}/{result.branchB_with_qloo.items.length} articles reliés à un signal Qloo · {source.signals.length} signaux collectés</p></div>
      <span className={`text-xs rounded-lg px-3 py-2 ${source.qloo_state === "LIVE_QLOO" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{qlooStateLabel(source.qloo_state)}</span>
    </div>
    {exampleItem && exampleSignal && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"><strong>{exampleSignal.anchor_name}</strong> → {exampleSignal.name} → <strong>{exampleItem.product.name}</strong><p className="text-xs text-slate-500 mt-1">{exampleSignal.match_method === "editorial_translation" ? "Passerelle éditoriale locale, consultable dans les preuves" : "Correspondance de tag ou de marque"} · {qlooStateLabel(exampleSignal.state)}</p></div>}
    {result.brief_profile && <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1"><p><strong>Brief interprété :</strong> {result.brief_profile.concepts.map((id) => CONCEPTS[id]?.label || id).join(", ") || "univers non reconnu"}.</p><p>{result.matching_diagnostics?.relevant_candidates || 0} produits pertinents parmi {result.matching_diagnostics?.financially_eligible || 0} disponibles selon les contraintes commerciales. Les autres ne servent pas à compléter la collection.</p>{result.brief_profile.excluded_concepts.length > 0 && <p>Exclusions : {result.brief_profile.excluded_concepts.map((id) => CONCEPTS[id]?.label || id).join(", ")}.</p>}</div>}
    <p className="text-sm text-slate-700">{result.comparison_metrics.summary}</p>
    {result.branchB_with_qloo.items.length < (result.request?.bundleSize || 4) && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Catalogue insuffisant : {result.branchB_with_qloo.items.length}/{result.request?.bundleSize || 4} références pertinentes et éligibles. Précisez le brief ou élargissez le catalogue ; les contraintes ne sont pas relâchées.</p>}
    <p className="text-xs text-slate-500">Analyse du {new Date(result.created_at).toLocaleString("fr-FR")} · {source.catalog_count} produits fictifs · Interprétation : {source.planner} · Rédaction : {source.copywriter}</p>
    <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-medium text-slate-700">Voir les entités résolues et la provenance des appels</summary>
      <div className="mt-3 space-y-2 text-xs text-slate-600">
        {source.anchors.map((anchor, index) => <p key={index}>{anchor.query} → <strong>{anchor.name}</strong> · ID {anchor.id} · priorité {anchor.weight}/3 · {qlooStateLabel(anchor.state)}</p>)}
        {source.target_brands?.length ? <p className="font-medium">Marques du catalogue évaluées : {source.target_brands.map((brand) => brand.name).join(", ")}. Les liens produit/marque sont éditoriaux et fictifs ; les scores d’affinité proviennent des appels Qloo.</p> : null}
        {source.calls.map((call, index) => <p key={index} className="border-t border-slate-100 pt-2">{call.endpoint} · {qlooStateLabel(call.state)} · {call.count} résultat(s) · {new Date(call.captured_at).toLocaleTimeString("fr-FR")}{call.error ? ` · ${call.error}` : ""}</p>)}
      </div>
    </details>
    <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-medium text-slate-700">Voir les signaux collectés, y compris sans correspondance au catalogue</summary><div className="mt-3 max-h-64 overflow-y-auto space-y-2 text-xs text-slate-600">{source.signals.map((signal, index) => <p key={index}><strong>{signal.name}</strong> · {signal.type} · depuis {signal.anchor_name} · {signal.score_available ? `affinité normalisée ${signal.affinity_score.toFixed(3)}` : "score non fourni"} · {qlooStateLabel(signal.state)}</p>)}</div></details>
    <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-medium text-slate-700">Voir les étapes de décision de l’agent</summary><ol className="mt-3 space-y-2 text-xs text-slate-600">{result.decision_trace.map((step, index) => <li key={index}>{step}</li>)}</ol></details>
    <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-medium text-slate-700">Examiner les preuves par article</summary><div className="mt-4 grid gap-4 md:grid-cols-2">{result.branchB_with_qloo.items.map((item) => <ProductEvidence key={item.product.sku} item={item} />)}</div></details>
  </section>;
}

export function CollectionComparison({ result }: { result: ABComparisonResult }) {
  const a = result.branchA_without_qloo;
  const b = result.branchB_with_qloo;
  return <section className="space-y-5" aria-label="Comparaison sans et avec Qloo">
    <div><h1 className="text-2xl font-semibold text-slate-900">Même brief, sans et avec Qloo</h1><p className="text-sm text-slate-600 mt-2">Même interprétation du brief, même catalogue fictif, mêmes règles de marge et de stock. Seuls les signaux Qloo s’ajoutent au classement B.</p></div>
    <div className="rounded-xl bg-slate-900 text-white p-5 space-y-2"><p className="text-lg font-semibold">Écart de marge théorique : {signed(result.comparison_metrics.margin_delta_eur)} €</p><p className="text-sm text-slate-300">{result.comparison_metrics.summary}</p><p className="text-xs text-slate-300">Écart d’indice de correspondance Qloo : {signed(result.comparison_metrics.cultural_relevance_delta * 100, 1)} points. Les deux sélections sont évaluées avec les mêmes signaux. Une donnée absente n’est pas une désaffinité mesurée. Aucune conversion ni hausse des ventes mesurée.</p></div>
    <div className="grid md:grid-cols-2 gap-5">{([a, b]).map((branch, index) => <div key={branch.id} className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
      <h2 className="font-semibold text-slate-900">{index ? "B · Avec les signaux Qloo" : "A · Sans Qloo"}</h2><p className="text-xs text-slate-500">{index ? qlooStateLabel(branch.data_state) : "Interprétation du brief et contraintes commerciales"}</p>
      <div className="grid grid-cols-2 gap-3 text-sm"><p>Panier : <strong>{branch.metrics.total_basket_eur.toFixed(2)} €</strong></p><p>Marge : <strong>{branch.metrics.total_margin_eur.toFixed(2)} €</strong></p></div>
      <p className="text-xs text-slate-600">Couverture des axes du brief : {Math.round((index ? result.comparison_metrics.brief_coverage_b || 0 : result.comparison_metrics.brief_coverage_a || 0) * 100)}% · Indice de correspondance Qloo (même échelle) : {((index ? result.comparison_metrics.qloo_alignment_b || 0 : result.comparison_metrics.qloo_alignment_a || 0) * 100).toFixed(1)}/100</p>
      <ul className="divide-y divide-slate-100">{branch.items.map((item) => <li className="py-3 space-y-1" key={item.product.sku}><p className="text-sm font-medium text-slate-900">{item.product.name}</p><p className="text-xs text-slate-500">{item.product.sku} · {item.product.price_eur} € · marge {(item.product.margin_pct * 100).toFixed(1)}% · stock {item.product.stock_units}</p><p className="text-xs text-slate-600">{index ? `${item.qloo_evidence?.length || 0} correspondance(s) Qloo explicite(s)` : `Tags du brief : ${item.semantic_matches?.join(", ") || "aucun"}`}</p></li>)}</ul>
    </div>)}</div>
  </section>;
}
