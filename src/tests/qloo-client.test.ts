import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { QlooClient } from "../lib/qloo-client.js";

// Charger .env.local pour les tests d'intégration en direct
const envPath = path.resolve(".env.local");
if (process.env.QLOO_LIVE_TESTS === "1" && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/QLOO_API_KEY=([^\r\n]+)/);
  if (match && !process.env.QLOO_API_KEY) {
    process.env.QLOO_API_KEY = match[1].trim();
  }
}

describe("🔌 Client API Qloo v2 (Hackathon Sandbox)", () => {
  it("en mode auto sans clé API, bascule sur MOCK_SIMULATED en développement", async () => {
    const oldKey = process.env.QLOO_API_KEY;
    delete process.env.QLOO_API_KEY;
    try {
      const client = new QlooClient({ mode: "auto" });
      const res = await client.search("Synthwave");
      assert.strictEqual(res.state, "MOCK_SIMULATED");
      assert.ok(res.data.results.length > 0);
    } finally {
      if (oldKey === undefined) delete process.env.QLOO_API_KEY;
      else process.env.QLOO_API_KEY = oldKey;
    }
  });

  it("bloque strictement le basculement silencieux en MOCK en environnement de production", () => {
    const oldEnv = process.env.NODE_ENV;
    const oldKey = process.env.QLOO_API_KEY;
    delete process.env.QLOO_API_KEY;
    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      assert.throws(
        () => {
          new QlooClient({ mode: "auto", apiKey: undefined });
        },
        /En production, l'absence de QLOO_API_KEY est interdite/
      );
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = oldEnv;
      if (oldKey === undefined) delete process.env.QLOO_API_KEY;
      else process.env.QLOO_API_KEY = oldKey;
    }
  });

  it("gère l'extraction d'affinités de tags culturels en mode mock", async () => {
    const client = new QlooClient({ mode: "mock_only" });
    const insights = await client.getInsights("ent_daft_punk_001", "urn:tag");

    assert.strictEqual(insights.state, "MOCK_SIMULATED");
    assert.strictEqual(insights.filter_type, "urn:tag");
    assert.ok(insights.items.length >= 3);

    for (const item of insights.items) {
      assert.ok(item.affinity_score >= 0 && item.affinity_score <= 1, "Le score d'affinité doit être dans [0, 1]");
      assert.strictEqual(item.type, "urn:tag");
    }
  });

  it("gère l'extraction d'affinités de marques (urn:entity:brand) en mode mock", async () => {
    const client = new QlooClient({ mode: "mock_only" });
    const insights = await client.getInsights("ent_daft_punk_001", "urn:entity:brand");

    assert.strictEqual(insights.filter_type, "urn:entity:brand");
    assert.ok(insights.items.some((i) => i.name === "Teenage Engineering"));
  });

  it("lève une erreur explicite si la requête de recherche est vide", async () => {
    const client = new QlooClient({ mode: "auto" });
    await assert.rejects(
      async () => {
        await client.search("");
      },
      /paramètre query ne peut pas être vide/
    );
  });

  it("statut de l'intégration en direct (Live Sandbox)", { skip: process.env.QLOO_LIVE_TESTS !== "1" ? "NOT_VERIFIED: opt-in QLOO_LIVE_TESTS=1 requis" : false }, async () => {
    const apiKey = process.env.QLOO_API_KEY;
    if (!apiKey) {
      assert.fail("QLOO_LIVE_TESTS=1 exige une clé QLOO_API_KEY configurée.");
    }

    const liveClient = new QlooClient({ apiKey, mode: "live_only" });
    const res = await liveClient.search("Daft Punk");
    assert.strictEqual(res.state, "LIVE_QLOO");
  });
});
