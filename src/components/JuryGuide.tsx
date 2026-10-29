export function JuryGuide() {
  return <details lang="en" className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
    <summary className="cursor-pointer font-semibold text-slate-900">English guide · Audience → Qloo evidence → Collection → Approval</summary>
    <p className="mt-3">CultMerch helps a merchandiser turn cultural tastes into a stock- and margin-constrained collection. This prototype uses 50 synthetic products.</p>
    <ol className="mt-3 list-decimal pl-5 space-y-2">
      <li>Use the audience brief on Dashboard. Configure named references in <strong>Analyses</strong>. <strong>Exécuter l’analyse</strong> runs the workflow; <strong>Actualiser l’analyse</strong> reruns it.</li>
      <li><strong>Collections</strong> compares the same brief, catalog and constraints, without and with Qloo signals. Differences are theoretical catalog calculations, not measured sales.</li>
      <li><strong>Analyses</strong> shows resolved entities, request timestamps and evidence. In <strong>Catalogue</strong>, open an item to inspect its signal-to-product link. Product-to-brand associations are local editorial data.</li>
      <li><strong>Approbations</strong> records individual decisions. <strong>Approuver</strong> approves a piece; <strong>Demander révision</strong> requests changes; <strong>Tout approuver</strong> approves the collection. Export JSON/CSV after all pieces are approved.</li>
    </ol>
    <p className="mt-3 text-xs"><strong>Data labels:</strong> “Qloo en direct” = fresh API response; “Qloo en cache” = stored response, see original date; “Simulation — données fictives” = synthetic signals; “Résultat partiel ou mixte” = incomplete/mixed provenance; “Aucune donnée Qloo exploitable” = no usable Qloo data.</p>
  </details>;
}
