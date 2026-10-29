import { before, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import puppeteer, { type Browser, type Page } from "puppeteer-core";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";
describe("Rechargement et isolation des analyses", () => {
  let browser: Browser;
  let page: Page;
  let id: string;
  before(async () => {
    const response = await fetch(`${base}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({brief: "Jazz denim ceramics", seeds: []}) });
    assert.equal(response.status, 201);
    const result = (await response.json()).data;
    id = result.id;
    assert.equal(result.branchB_with_qloo.items.length, 4);
    const approved = await fetch(`${base}/api/collection/${id}/approve`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({action:"APPROVE",notes:"Saved audit approval"}) });
    assert.equal(approved.status, 200);
    browser = await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true,args:["--no-sandbox"]});
    page = await browser.newPage();
    await page.setViewport({width:1440,height:900});
  });
  after(async () => { await browser?.close(); });
  it("restaure les quatre décisions, leurs notes et les références vides exactes", async () => {
    await page.goto(`${base}/?analysisId=${id}`,{waitUntil:"networkidle0"});
    for (const button of await page.$$('button')) {
      if (await button.evaluate(b => b.textContent?.includes('Approbations'))) { await button.click(); break; }
    }
    await page.waitForFunction(() => document.body.innerText.includes('Avancement des validations'));
    const text = await page.evaluate(() => document.body.innerText);
    assert.match(text,/Avancement des validations\s*:\s*4\s*sur\s*4/);
    assert.ok(!text.includes('Paramètres modifiés'));
    assert.equal(await page.$$eval('input', els => els.filter(t => t.value === 'Saved audit approval').length),4);
  });
  it("un identifiant manquant affiche une erreur sans ouvrir une autre analyse", async () => {
    await page.goto(`${base}/?analysisId=does-not-exist`,{waitUntil:"networkidle0"});
    const text = await page.evaluate(() => document.body.innerText);
    assert.ok(text.includes('Analyse introuvable'));
    assert.ok(text.includes('Aperçu illustratif'));
  });
  it("une nouvelle visite ne charge pas la dernière analyse d’un autre onglet", async () => {
    await page.goto(base,{waitUntil:"networkidle0"});
    const text = await page.evaluate(() => document.body.innerText);
    assert.ok(text.includes('Aperçu illustratif'));
  });
});
