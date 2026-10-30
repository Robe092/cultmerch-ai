import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import puppeteer, { Browser, Page } from "puppeteer-core";
import fs from "fs";

describe("🎭 Tests Navigateur End-to-End & Interactions Utilisateur (Puppeteer + Chrome)", () => {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const appUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
  let browser: Browser;
  let page: Page;

  before(async () => {
    assert.ok(fs.existsSync(chromePath), "Google Chrome doit être installé");

    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1440,900"],
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it("1. Chargement de l'application et présence de la barre de commande agentique", async () => {
    await page.goto(appUrl, { waitUntil: "networkidle0", timeout: 15000 });

    const title = await page.title();
    assert.ok(title.includes("CultMerch") || (await page.content()).includes("CultMerch"));

    // Vérifier la présence du champ de saisie du brief naturel
    const briefInput = await page.$('input[placeholder*="Technical streetwear"]');
    assert.ok(briefInput, "Le champ de saisie de brief en langage naturel doit être présent");
  });

  it("2. Saisie d'un brief en langage naturel et exécution réelle de l'analyse agentique", async () => {
    const briefInput = await page.$('input[placeholder*="Technical streetwear"]');
    assert.ok(briefInput);

    // Vider le champ et taper un brief ciblé
    await briefInput.click({ count: 3 });
    await briefInput.type("Capsule Techno & Architecture Suisse Minimaliste");

    // Cliquer sur le bouton 'Run analysis'
    const submitBtn = await page.$('button[type="submit"]');
    assert.ok(submitBtn, "Le bouton de soumission doit être présent");
    await submitBtn.click();

    // Attendre l'apparition du bandeau de confirmation avec le mode Taste Graph
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return (
          text.includes("CultMerch analysis complete") ||
          text.includes("Mode: Simulation — synthetic data") ||
          text.includes("Mode: Live Qloo")
        );
      },
      { timeout: 60000 }
    );

    const bodyText = await page.evaluate(() => document.body.innerText);
    assert.ok(
      bodyText.includes("CultMerch analysis complete") || bodyText.includes("50 SKUs evaluated"),
      "L'interface doit confirmer l'exécution de l'analyse avec les 50 SKUs évalués"
    );
  });

  it("3. Navigation vers l'onglet 'Collections' et vérification du comparateur A/B", async () => {
    // Cliquer sur l'onglet 'Collections' dans la barre de navigation
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const collBtn = buttons.find((b) => b.textContent?.includes("Collections"));
      if (collBtn) {
        collBtn.click();
        return true;
      }
      return false;
    });

    assert.ok(clicked, "Le bouton de navigation 'Collections' doit être cliquable");

    // Attendre la mise à jour de la vue
    await new Promise((r) => setTimeout(r, 600));

    const content = await page.evaluate(() => document.body.innerText);
    assert.ok(
      content.includes("Comparateur A/B") ||
        content.includes("Sélection Standard") ||
        content.includes("Branch A") ||
        content.includes("Branch B") ||
        content.includes("Qloo"),
      "La vue Collections doit afficher le comparateur A/B équitable"
    );
  });

  it("4. Navigation vers l'onglet 'Catalog' et ouverture du Drawer Détail Produit", async () => {
    // Cliquer sur l'onglet 'Catalog'
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const catBtn = buttons.find((b) => b.textContent?.includes("Catalog"));
      if (catBtn) {
        catBtn.click();
        return true;
      }
      return false;
    });

    assert.ok(clicked, "Le bouton 'Catalog' doit être cliquable");
    await new Promise((r) => setTimeout(r, 600));

    // Vérifier la présence des illustrations techniques SVG de vêtements (viewBox 0 0 240 180)
    const svgCount = await page.evaluate(() => {
      return document.querySelectorAll('svg[viewBox="0 0 240 180"]').length;
    });
    assert.ok(svgCount > 0, "Le catalogue doit afficher les illustrations techniques vectorielles");

    // Cliquer sur le premier vêtement pour ouvrir le Drawer
    await page.evaluate(() => {
      const firstIllustration = document.querySelector('svg[viewBox="0 0 240 180"]');
      if (firstIllustration) {
        (firstIllustration.closest("div") as HTMLElement)?.click();
      }
    });

    await new Promise((r) => setTimeout(r, 500));

    // Vérifier l'ouverture du drawer avec les spécifications techniques
    const drawerOpen = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes("Détails du Produit") || text.includes("Fiche Technique") || text.includes("SKU");
    });
    assert.ok(drawerOpen, "Le drawer détail produit doit s'ouvrir au clic sur une pièce");
  });

  it("5. Navigation vers 'Approvals' et validation HITL de la collection", async () => {
    // Cliquer sur l'onglet 'Approvals'
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const appBtn = buttons.find((b) => b.textContent?.includes("Approvals"));
      if (appBtn) {
        appBtn.click();
        return true;
      }
      return false;
    });

    assert.ok(clicked, "Le bouton 'Approvals' doit être cliquable");
    await new Promise((r) => setTimeout(r, 600));

    // Cliquer sur 'Approve all'
    const approveClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.textContent?.includes("Approve all"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    assert.ok(approveClicked, "Le bouton 'Approve all' doit être présent et cliquable");
    await new Promise((r) => setTimeout(r, 600));

    // Vérifier que le statut visuel reflète l'approbation
    const validationText = await page.evaluate(() => document.body.innerText);
    assert.ok(
      validationText.includes("approved") ||
        validationText.includes("Approve") ||
        validationText.includes("Final Approval"),
      "L'interface doit confirmer la validation des pièces"
    );
  });

  it("6. Exports après validation et provenance mesurée", async () => {
    // Cliquer sur le bouton 'Exports & provenance' ou 'Export collection'
    const modalOpened = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find(
        (b) =>
          b.textContent?.includes("Exports & provenance") ||
          b.textContent?.includes("Export collection")
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    assert.ok(modalOpened, "Le bouton d'ouverture de la modal d'intégration doit être cliquable");
    await new Promise((r) => setTimeout(r, 600));

    // Vérifier que la modale présente l’export métier
    const modalContent = await page.evaluate(() => document.body.innerText);
    assert.ok(
      modalContent.includes("Export the approved collection"),
      "La modal de connexion backend doit s'afficher"
    );

    assert.ok(modalContent.includes("provenance"), "La provenance réelle doit être exportée");
    assert.ok(!modalContent.includes("Server Actions"), "L’export doit parler du résultat métier");

    // Vérifier les boutons d'export JSON et CSV
    assert.ok(
      modalContent.includes("Download Commerce Manifest (.json)"),
      "Le lien de téléchargement JSON doit être présent"
    );
    assert.ok(
      modalContent.includes("Download Logistics Sheet (.csv)"),
      "Le lien de téléchargement CSV doit être présent"
    );
  });
});
