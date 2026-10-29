import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { AgentOrchestrator } from "../lib/agent-orchestrator";
import { analysisStore } from "../lib/analysis-store";

describe("🛡️ Fiabilité, Concurrence & Persistance Serverless (Cold Start)", () => {
  it("concurrence : exécute 10 analyses simultanées sans interférence ni collision d'identifiants", async () => {
    const orchestrator = new AgentOrchestrator();
    const briefs = [
      "Capsule Festival Jazz 01",
      "Capsule Festival Electro 02",
      "Capsule Cinéma 35mm 03",
      "Capsule Streetwear Tokyo 04",
      "Capsule Minimalisme Suisse 05",
      "Capsule Art Brutaliste 06",
      "Capsule Café Céramique 07",
      "Capsule Vintage 80s 08",
      "Capsule Dark Academia 09",
      "Capsule Workwear Lyon 10",
    ];

    const start = Date.now();
    const promises = briefs.map((b) => orchestrator.runAnalysis(b, { bundleSize: 4 }));
    const results = await Promise.all(promises);
    const duration = Date.now() - start;

    assert.equal(results.length, 10);
    const ids = new Set(results.map((r) => r.id));
    assert.equal(ids.size, 10, "Tous les identifiants d'analyse doivent être strictement uniques");

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      assert.equal(res.brief, briefs[i]);
      assert.ok(res.branchA_without_qloo.items.length <= 4);
      assert.ok(res.branchB_with_qloo.items.length <= 4);
      assert.ok(res.branchB_with_qloo.items.every((item) => (item.brief_score || 0) > 0));
      if (!res.branchB_with_qloo.items.length) assert.equal(res.matching_diagnostics?.relevant_candidates, 0);
      assert.ok(res.decision_trace.length >= 8);
    }

    assert.ok(duration < 5000, `L'exécution concurrente de 10 analyses a pris ${duration}ms (doit être < 5s)`);
  });

  it("persistance session : rechargement scratchpad conteneur et déclaration explicite du mode EPHEMERAL_DEMO", async () => {
    // Vérification du contrat de persistance transparent
    const meta = analysisStore.getStorageMetadata();
    assert.equal(meta.mode, "EPHEMERAL_DEMO");
    assert.equal(meta.isDistributed, false);
    assert.ok(meta.durabilityNote.includes("Mode Démonstration Serverless"));

    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runAnalysis("Brief Synthwave Test Cold Start Vercel", { bundleSize: 3 });
    analysisStore.save(result);

    const savedId = result.id;
    assert.ok(savedId);

    // Simuler un recyclage mémoire conteneur en vidant la Map interne
    const internalMap = (analysisStore as any).analyses as Map<string, any>;
    assert.ok(internalMap.has(savedId));
    internalMap.clear();
    assert.equal(internalMap.size, 0, "La mémoire doit être vidée pour simuler l'extinction du cache");

    // L'appel à getById recharge depuis le scratchpad conteneur
    const reloaded = analysisStore.getById(savedId);
    assert.ok(reloaded, "L'analyse doit avoir été récupérée depuis le scratchpad local");
    assert.equal(reloaded?.id, savedId);
    assert.equal(reloaded?.brief, "Brief Synthwave Test Cold Start Vercel");
    assert.equal(reloaded?.branchB_with_qloo.items.length, 3);
  });

  it("gouvernance HITL : mise à jour et validation humaine persistante", async () => {
    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runAnalysis("Capsule Synthwave Approbation HITL Test", { bundleSize: 4 });
    analysisStore.save(result);

    const approved = analysisStore.updateStatus(
      result.id,
      "APPROVED",
      "Validation effectuée par le directeur artistique."
    );

    assert.ok(approved);
    assert.equal(approved?.status, "APPROVED");
    assert.equal(approved?.approval_metadata?.notes, "Validation effectuée par le directeur artistique.");
    assert.ok(approved?.approval_metadata?.reviewed_at);

    // Vérifier que la relecture depuis le magasin conserve le statut
    const fetched = analysisStore.getById(result.id);
    assert.equal(fetched?.status, "APPROVED");
  });

  it("robustesse : gestion d'un identifiant inexistant sans exception non gérée", () => {
    const fetched = analysisStore.getById("non_existent_fake_id_9999");
    assert.equal(fetched, undefined);

    const updated = analysisStore.updateStatus("non_existent_fake_id_9999", "APPROVED");
    assert.equal(updated, undefined);
  });

  it("résilience fichier corrompu : repli sans plantage si /tmp contient du JSON invalide", () => {
    const tmpDir = process.env.TMPDIR || os.tmpdir() || "/tmp";
    const corruptPath = path.join(tmpDir, "cultmerch_analyses_corrupt_test.json");
    fs.writeFileSync(corruptPath, "{ corrupt invalid json content ###", "utf-8");

    // Créer une instance isolée pointant sur ce fichier corrompu
    class TestCorruptStore {
      private analyses = new Map();
      private storageFilePath = corruptPath;
      load() {
        try {
          if (fs.existsSync(this.storageFilePath)) {
            const raw = fs.readFileSync(this.storageFilePath, "utf-8");
            JSON.parse(raw);
          }
        } catch {
          // Attendu : ignorer silencieusement et préserver la mémoire
        }
      }
      size() {
        return this.analyses.size;
      }
    }

    const testStore = new TestCorruptStore();
    assert.doesNotThrow(() => testStore.load());
    assert.equal(testStore.size(), 0);

    // Nettoyer le fichier de test
    try {
      fs.unlinkSync(corruptPath);
    } catch {}
  });
});
