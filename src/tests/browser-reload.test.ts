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
      if (await button.evaluate(b => b.textContent?.includes('Approvals'))) { await button.click(); break; }
    }
    await page.waitForFunction(() => document.body.innerText.includes('Approval progress'));
    const text = await page.evaluate(() => document.body.innerText);
    assert.match(text,/Approval progress\s*:\s*4\s*of\s*4/);
    assert.ok(!text.includes('Settings changed'));
    assert.equal(await page.$$eval('input', els => els.filter(t => t.value === 'Saved audit approval').length),4);
  });
  it("un identifiant manquant affiche une erreur sans ouvrir une autre analyse", async () => {
    await page.goto(`${base}/?analysisId=does-not-exist`,{waitUntil:"networkidle0"});
    const text = await page.evaluate(() => document.body.innerText);
    assert.ok(text.includes('Analysis not found'));
    assert.ok(text.includes('Illustrative preview'));
  });
  it("une nouvelle visite ne charge pas la dernière analyse d’un autre onglet", async () => {
    await page.goto(base,{waitUntil:"networkidle0"});
    const text = await page.evaluate(() => document.body.innerText);
    assert.ok(text.includes('Illustrative preview'));
  });
  it("locks JSON preview and copying after revision, then copies exactly the approved preview", async () => {
    const saved = await (await fetch(`${base}/api/analysis/${id}`)).json();
    const sku=saved.data.branchB_with_qloo.items[0].product.sku;
    const revise=await fetch(`${base}/api/collection/${id}/approve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'REQUEST_REVISION',productSku:sku})});
    assert.equal(revise.status,200);
    const click=async (label:string)=>{
      for(const button of await page.$$('button')) if((await button.evaluate(b=>b.textContent||'')).trim()===label){await button.click();return;}
      throw new Error('Missing button '+label);
    };
    await page.goto(`${base}/?analysisId=${id}`,{waitUntil:'networkidle0'});
    await click('Exports & provenance');
    assert.equal(await page.$('pre'),null);
    assert.equal(await page.$$eval('button',buttons=>buttons.filter(b=>b.textContent?.trim()==='Copy JSON').length),0);
    assert.ok((await page.evaluate(()=>document.body.innerText)).includes('JSON preview and copying remain locked'));
    assert.equal((await fetch(`${base}/api/export/${id}?format=json`)).status,409);
    const approve=await fetch(`${base}/api/collection/${id}/approve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'APPROVE'})});
    assert.equal(approve.status,200);
    await page.reload({waitUntil:'networkidle0'});await click('Exports & provenance');
    const shown=await page.$eval('pre',el=>el.textContent);
    await page.evaluate("Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:function(text){window.__testCopied=text; return Promise.resolve();}}})");
    await click('Copy JSON');
    assert.equal(await page.evaluate(()=>(window as any).__testCopied),shown);
    assert.equal((await fetch(`${base}/api/export/${id}?format=json`)).status,200);
  });

});
