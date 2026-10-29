import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "child_process";
import fs from "fs";

describe("🌐 Interface Navigateur & Audit DOM Headless Chrome", () => {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const url = process.env.TEST_BASE_URL || "http://localhost:3000";

  it("vérification présence binaire Google Chrome sur l'environnement mac", () => {
    assert.ok(fs.existsSync(chromePath), "Google Chrome doit être présent dans /Applications");
  });

  it("exécution headless Chrome : hydratation complète et intégrité du DOM", () => {
    // Exécuter Google Chrome en mode headless pour capturer le DOM rendu post-hydratation React 19
    const cmd = `"${chromePath}" --headless --disable-gpu --dump-dom "${url}"`;
    const domOutput = execSync(cmd, { encoding: "utf-8", timeout: 10000 });

    assert.ok(domOutput.length > 5000, "Le DOM rendu doit comporter un balisage riche");

    // 1. Navigation et Branding
    assert.ok(domOutput.includes("CultMerch"), "Le logo/titre CultMerch doit être présent");
    assert.ok(domOutput.includes("Cultural Retail OS"), "Le sous-titre de l'application doit être présent");
    assert.ok(domOutput.includes("Dashboard"), "L'onglet Dashboard doit être présent");
    assert.ok(domOutput.includes("Analyses"), "L'onglet Analyses doit être présent");
    assert.ok(domOutput.includes("Collections"), "L'onglet Collections doit être présent");
    assert.ok(domOutput.includes("Catalogue"), "L'onglet Catalogue doit être présent");
    assert.ok(domOutput.includes("Approbations"), "L'onglet Approbations doit être présent");

    // 2. Boîte de commande en langage naturel
    assert.ok(
      domOutput.includes("Commande de l&#39;Agent IA en Langage Naturel") ||
        domOutput.includes("Commande de l'Agent IA en Langage Naturel"),
      "La barre de commande agentique doit être rendue dans le DOM"
    );

    // 3. Présence des SVG d'icônes et interface vectorielle
    assert.ok(domOutput.includes("<svg"), "Des éléments vectoriels SVG doivent être rendus");
    assert.ok(
      domOutput.includes("viewBox=\"0 0 24 24\""),
      "Les icônes vectorielles du dashboard B2B doivent être injectées"
    );

    // 4. Absence d'erreurs critiques React
    assert.equal(
      domOutput.includes("Application error: a client-side exception has occurred"),
      false,
      "Aucune exception client-side React ne doit être présente"
    );
    assert.equal(
      domOutput.includes("Minified React error"),
      false,
      "Aucune erreur minifiée React ne doit apparaître"
    );
  });
});
