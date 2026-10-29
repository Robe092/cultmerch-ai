import { describe, it } from "node:test";
import assert from "node:assert";
import { LLMService } from "../lib/llm-service.js";

describe("🤖 Service LLM & Raisonneur Sémantique", () => {
  it("en l'absence de clé live, le raisonneur déterministe extrait l'ancre et les outils pertinents", async () => {
    const service = new LLMService(); // Sans clé
    assert.strictEqual(service.hasLiveKey(), false);

    const analysis = await service.analyzeBrief("Fans de Blade Runner et de musique Synthwave");
    assert.strictEqual(analysis.anchor_entity, "Kavinsky");
    assert.ok(analysis.cultural_tools.includes("urn:tag"));
    assert.ok(analysis.inferred_vibe_tags.includes("synthwave"));
    assert.ok(analysis.strategic_reasoning.length > 0);
  });

  it("sélectionne dynamiquement les outils de marques et artistes si mentionnés", async () => {
    const service = new LLMService();
    const analysis = await service.analyzeBrief("Marques de mode et groupes de rock underground");

    assert.ok(analysis.cultural_tools.includes("urn:entity:brand"), "urn:entity:brand doit être sélectionné");
    assert.ok(analysis.cultural_tools.includes("urn:entity:artist"), "urn:entity:artist doit être sélectionné");
  });

  it("génère une structure de présentation commerciale avec justifications par SKU", async () => {
    const service = new LLMService();
    const copy = await service.generateCapsuleCopy({
      brief: "Audience Indie Folk & Gastronomie Bio",
      culturalTags: ["indie-folk", "craft", "organic"],
      products: [
        { sku: "SKU-001", name: "Vin Naturel Syrah", category: "epicurien" },
        { sku: "SKU-002", name: "Plaid Laine Mérinos", category: "decoration" },
      ],
    });

    assert.ok(copy.title.length > 0);
    assert.ok(copy.pitch.length > 0);
    assert.ok(copy.sku_justifications["SKU-001"]);
    assert.ok(copy.sku_justifications["SKU-002"]);
  });
});
