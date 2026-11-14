// Theorie-Test (14.11.2026): prüft theorie.html ohne echte Datenbank.
// Die Supabase-Bibliothek wird durch eine Attrappe mit erfundenen Daten ersetzt (keine Schülerdaten, keine Folieninhalte).
// Geprüft: Anmeldung, Bibliothek je Klasse (B mit Lektionen, A leer), Knöpfe, Folien im Browser mit Notizen,
// eigener Unterricht anlegen/Folien abwählen, Ausblenden in der PowerPoint-Datei (show="0"), eigene Dateien,
// keine Querlage bei 360/412 px (hoch und quer), keine Programmfehler.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/theorie-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const REPO = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".json": "application/json" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(REPO, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });

let fehler = 0, ok = 0;
async function punkt(name, fn) {
  try { const r = await fn(); if (r === undefined || r === true) { ok++; console.log("ok      " + name); } else { fehler++; console.log("FEHLER  " + name + " – " + r); } }
  catch (e) { fehler++; console.log("FEHLER  " + name + " – " + (e.message || e).split("\n")[0]); }
}

// Attrappe: Supabase-Client mit Speicher im Browser.
const ATTRAPPE = `
(function(){
  const svg = (t) => "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#223"/><text x="80" y="380" font-size="90" fill="#fff">' + t + '</text></svg>');
  const lek = [];
  [["B01","B",1,"Lektion 1","Persönliche Voraussetzungen",1,"Grundstoff"],["B02","B",2,"Lektion 2","Risikofaktor Mensch",1,"Grundstoff"],
   ["C01","C",1,"C1","Persönliche Voraussetzungen und Arbeitsplatz",1,"Zusatzstoff C"]].forEach(([id,k,nr,code,titel,abend,ber]) =>
    lek.push({ id, klasse:k, nr, code, titel, abend, bereich:ber, datei_pfad:"bibliothek/"+k+"/"+id+".pptx", datei_bytes:3000000, folien_anzahl:5, quiz_lektion: k==="B"?nr:null, aktiv:true }));
  const fol = []; lek.forEach(l => { for (let i=1;i<=5;i++) fol.push({ lektion_id:l.id, nr:i, titel:"Folie "+i, notiz: i===2 ? "Notiz Muster zu Folie 2" : null, bild_pfad:"bibliothek/"+l.klasse+"/"+l.id+"/f00"+i+".webp" }); });
  const DB = {
    profiles: [{ id:"u1", name:"Max Muster", email:"max@muster.test", aktiv:true }],
    theorie_klassen: [["A","Klasse A","Motorrad – Folien folgen",10],["B","Klasse B","Grundstoff",20],["BE","Klasse BE","folgen",30],["C","Klasse C","Zusatzstoff C",40],["CE","Klasse CE","Zusatzstoff CE",50],["D","Klasse D","Bus – Folien folgen",60]].map(([klasse,titel,beschreibung,sort])=>({klasse,titel,beschreibung,sort})),
    theorie_lektionen: lek, theorie_folien: fol, theorie_unterrichte: [], theorie_dateien: []
  };
  window.__DB = DB; window.__dateien = {};
  let session = null;
  function q(table) {
    let rows = null, filt = [], op = "select", payload = null, single = false;
    const api = {
      select(){ return api; }, order(){ return api; },
      eq(k,v){ filt.push([k,v]); return api; },
      maybeSingle(){ single = true; return api; },
      insert(p){ op = "insert"; payload = p; return api; },
      update(p){ op = "update"; payload = p; return api; },
      delete(){ op = "delete"; return api; },
      then(res, rej){ return Promise.resolve(run()).then(res, rej); }
    };
    function run(){
      const t = DB[table] || [];
      const m = (r) => filt.every(([k,v]) => r[k] === v);
      if (op === "insert") { (Array.isArray(payload)?payload:[payload]).forEach(p => t.push(Object.assign({ id: p.id || ("id"+Math.random().toString(36).slice(2)), erstellt:new Date().toISOString(), geaendert:new Date().toISOString(), teile:[] }, p))); return { data:null, error:null }; }
      if (op === "update") { t.filter(m).forEach(r => Object.assign(r, payload)); return { data:null, error:null }; }
      if (op === "delete") { DB[table] = t.filter(r => !m(r)); return { data:null, error:null }; }
      let d = t.filter(m); if (table === "profiles") d = d.map(x => x);
      return { data: single ? (d[0]||null) : JSON.parse(JSON.stringify(d)), error:null };
    }
    return api;
  }
  window.supabase = { createClient(){ return {
    auth: {
      async getSession(){ return { data:{ session } }; },
      async signInWithPassword({ email, password }){ if (password !== "richtig") return { error:{ message:"falsch" } }; session = { user:{ id:"u1", email } }; return { data:{ session }, error:null }; },
      async signOut(){ session = null; return {}; }
    },
    from: q,
    async rpc(name){ return { data: name === "theorie_darf_bibliothek" ? true : null, error:null }; },
    storage: { from(){ return {
      async createSignedUrl(p){ return { data:{ signedUrl: p.endsWith(".webp") ? svg(p.split("/").pop()) : "https://speicher.muster.test/" + p }, error:null }; },
      async createSignedUrls(ps){ return { data: ps.map(p => ({ path:p, signedUrl: svg(p.split("/").slice(-2).join(" ")) })), error:null }; },
      async upload(p, f){ window.__dateien[p] = f.size; return { data:{}, error:null }; },
      async remove(ps){ ps.forEach(p => delete window.__dateien[p]); return { data:{}, error:null }; }
    }; } }
  }; } };
  sessionStorage.getItem("eingeloggt") && (session = { user:{ id:"u1", email:"max@muster.test" } });
})();`;

async function neueSeite(breite = 1280, hoehe = 800, eingeloggt = true) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, acceptDownloads: true });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: "text/javascript", body: ATTRAPPE }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: "" }));
  if (eingeloggt) await ctx.addInitScript(() => sessionStorage.setItem("eingeloggt", "1"));
  const page = await ctx.newPage();
  const js = []; page.on("pageerror", e => js.push(e.message));
  await page.goto(basis + "theorie.html"); await page.waitForTimeout(400);
  return { ctx, page, js };
}
const quer = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// 1 Anmeldung
{
  const { ctx, page, js } = await neueSeite(412, 860, false);
  await punkt("T1 ohne Anmeldung: Anmeldeformular, keine Folien", async () => (await page.locator("#lf").count()) === 1 && (await page.locator(".card").count()) === 0 || "kein Formular");
  await punkt("T2 falsches Passwort: Fehlermeldung", async () => { await page.fill("#lm","max@muster.test"); await page.fill("#lp","falsch"); await page.click("#lf button"); await page.waitForTimeout(150); return /fehlgeschlagen/.test(await page.textContent("#le")) || "keine Meldung"; });
  await punkt("T3 richtiges Passwort: Bibliothek erscheint", async () => { await page.fill("#lp","richtig"); await page.click("#lf button"); await page.waitForTimeout(400); return (await page.locator(".card").count()) > 0 || "keine Karten"; });
  await punkt("T4 keine Programmfehler (Anmeldung)", async () => js.length === 0 || js.join(" | "));
  await ctx.close();
}
// 2 Bibliothek und Ansicht
{
  const { ctx, page, js } = await neueSeite();
  await punkt("T5 Klasse B zeigt 2 Lektionen mit Abend-Überschrift", async () => { await page.click('.chip[data-k="B"]'); const n = await page.locator(".card").count(); const a = await page.textContent(".abend"); return (n === 2 && /Abend 1/.test(a)) || `Karten ${n}, ${a}`; });
  await punkt("T6 Klassen A und D da, leer mit Hinweis", async () => { await page.click('.chip[data-k="A"]'); const t = await page.textContent("#pane"); await page.click('.chip[data-k="D"]'); const t2 = await page.textContent("#pane"); return (/noch keine Folien/.test(t) && /noch keine Folien/.test(t2)) || "kein Hinweis"; });
  await punkt("T7 Karte hat PowerPoint, Browser, Herunterladen, Lernzielkontrolle, Unterricht", async () => { await page.click('.chip[data-k="B"]'); const a = await page.locator('.card').first().locator("[data-a]").evaluateAll(b => b.map(x => x.dataset.a).join(",")); return a === "ppt,browser,dl,quiz,add" || a; });
  await punkt("T8 C-Lektion ohne Lernzielkontrolle-Knopf", async () => { await page.click('.chip[data-k="C"]'); return (await page.locator('.card [data-a="quiz"]').count()) === 0 || "Knopf da"; });
  await punkt("T9 In PowerPoint starten: Office-Adresse ms-powerpoint:ofs|u|…", async () => {
    await page.click('.chip[data-k="B"]');
    await page.evaluate(() => { window.__href = null; const o = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function(){ window.__href = this.href || this.getAttribute("href"); }; });
    await page.locator('.card').first().locator('[data-a="ppt"]').click(); await page.waitForTimeout(150);
    const h = await page.evaluate(() => window.__href); return (h && h.startsWith("ms-powerpoint:ofs|u|https://speicher.muster.test/bibliothek/B/B01.pptx")) || h;
  });
  await punkt("T10 Im Browser: Folie 1 von 5, Pfeil weiter, Notiz auf Folie 2", async () => {
    await page.locator('.card').first().locator('[data-a="browser"]').click(); await page.waitForTimeout(300);
    const c1 = await page.textContent("#vCount"); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(100);
    const c2 = await page.textContent("#vCount"); const n = await page.textContent("#vNotes"); const sicht = await page.isVisible("#vNotes");
    return (c1 === "Folie 1 von 5" && c2 === "Folie 2 von 5" && /Notiz Muster/.test(n) && sicht) || `${c1}/${c2}/${n}/${sicht}`;
  });
  await punkt("T11 Esc schließt die Ansicht", async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(100); return (await page.locator("#viewer").count()) === 0 || "noch offen"; });
  await punkt("T12 Neuer Unterricht über Karte, Folien 2 und 4 abwählen, gespeichert", async () => {
    await page.locator('.card').first().locator('[data-a="add"]').click(); await page.click("#zNeu"); await page.waitForTimeout(300);
    await page.click('[data-a="edit"]'); await page.waitForTimeout(200);
    await page.fill("#eT", "Abend 1 Muster"); await page.click('[data-a="folien"]'); await page.waitForTimeout(300);
    await page.click('.pick input[data-nr="2"]'); await page.click('.pick input[data-nr="4"]');
    const z = await page.textContent("#fz"); await page.click("#fok"); await page.waitForTimeout(100);
    await page.click("#eSave"); await page.waitForTimeout(300);
    const u = await page.evaluate(() => window.__DB.theorie_unterrichte[0]);
    return (z === "3 von 5 Folien" && u.titel === "Abend 1 Muster" && JSON.stringify(u.teile[0].aus) === "[2,4]") || JSON.stringify({ z, u });
  });
  await punkt("T13 Starten im Browser zeigt nur 3 Folien", async () => {
    await page.click('[data-a="start"]'); await page.waitForTimeout(200); await page.click('.modal [data-a="browser"]'); await page.waitForTimeout(300);
    const c = await page.textContent("#vCount"); await page.keyboard.press("Escape"); return c === "Folie 1 von 3" || c;
  });
  await punkt("T14 Ausblenden in der PowerPoint-Datei: Folien 2 und 4 bekommen show=\"0\", Rest unverändert", async () => {
    const erg = await page.evaluate(async () => {
      const z = new JSZip();
      const slide = (n) => `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a" xmlns:r="r"><p:cSld><p:spTree/></p:cSld></p:sld>`;
      z.file("ppt/presentation.xml", `<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rId7"/><p:sldId id="257" r:id="rId3"/><p:sldId id="258" r:id="rId5"/><p:sldId id="259" r:id="rId4"/><p:sldId id="260" r:id="rId6"/></p:sldIdLst></p:presentation>`);
      z.file("ppt/_rels/presentation.xml.rels", `<Relationships><Relationship Id="rId7" Target="slides/slide5.xml"/><Relationship Id="rId3" Target="slides/slide1.xml"/><Relationship Id="rId5" Target="slides/slide3.xml"/><Relationship Id="rId4" Target="slides/slide2.xml"/><Relationship Id="rId6" Target="slides/slide4.xml"/></Relationships>`);
      for (let i=1;i<=5;i++) z.file(`ppt/slides/slide${i}.xml`, slide(i));
      const buf = await z.generateAsync({ type:"arraybuffer" });
      const altFetch = window.fetch; window.fetch = async () => new Response(buf);
      let blob = null; const altURL = URL.createObjectURL; URL.createObjectURL = (b) => { blob = b; return "blob:muster"; };
      const altClick = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function(){};
      await ladeAngepasst({ datei_pfad:"bibliothek/B/B01.pptx", code:"Lektion 1", titel:"Muster" }, [2,4]);
      window.fetch = altFetch; URL.createObjectURL = altURL; HTMLAnchorElement.prototype.click = altClick;
      const z2 = await JSZip.loadAsync(await blob.arrayBuffer()); const out = {};
      for (let i=1;i<=5;i++) out[i] = /show="0"/.test(await z2.file(`ppt/slides/slide${i}.xml`).async("string"));
      return out;
    });
    // Reihenfolge: 1=slide5, 2=slide1, 3=slide3, 4=slide2, 5=slide4 → ausgeblendet: slide1 (Folie 2) und slide2 (Folie 4)
    const soll = { 1:true, 2:true, 3:false, 4:false, 5:false };
    return JSON.stringify(erg) === JSON.stringify(soll) || JSON.stringify(erg);
  });
  await punkt("T15 Eigene Datei hochladen (PDF), Rechte-Haken Pflicht, erscheint in der Liste", async () => {
    await page.click('.tab[data-tab="dat"]');
    await page.setInputFiles("#uF", { name: "Meine Folien.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 Muster") });
    await page.click("#uGo"); await page.waitForTimeout(100); const e1 = await page.textContent("#uE");
    await page.check("#uR"); await page.click("#uGo"); await page.waitForTimeout(300);
    const d = await page.evaluate(() => window.__DB.theorie_dateien[0]);
    return (/bestätigen/.test(e1) && d && d.name === "Meine Folien" && /^eigene\/u1\/.+\.pdf$/.test(d.pfad)) || JSON.stringify({ e1, d });
  });
  await punkt("T16 Falsche Dateiart (.ppt) wird abgelehnt", async () => {
    await page.setInputFiles("#uF", { name: "alt.ppt", mimeType: "application/vnd.ms-powerpoint", buffer: Buffer.from("x") });
    await page.check("#uR"); await page.click("#uGo"); await page.waitForTimeout(100); return /Nur \.pptx/.test(await page.textContent("#uE")) || "nicht abgelehnt";
  });
  await punkt("T17 Titel mit HTML wird als Text gezeigt (kein eingeschleuster Code)", async () => {
    await page.evaluate(() => { window.__DB.theorie_unterrichte.push({ id:"x1", titel:'<img src=x onerror="window.__boom=1">', teile:[], geaendert:new Date().toISOString() }); });
    await page.evaluate(async () => { await ladeUnterrichte(); S.tab = "unt"; render(); }); await page.waitForTimeout(200);
    return (await page.evaluate(() => window.__boom)) === undefined || "Code lief";
  });
  await punkt("T18 keine Programmfehler (Bibliothek)", async () => js.length === 0 || js.join(" | "));
  await ctx.close();
}
// 3 Handy-Größen
for (const [b, h, name] of [[360, 780, "360 hoch"], [412, 915, "412 hoch"], [780, 360, "360 quer"], [915, 412, "412 quer"]]) {
  const { ctx, page, js } = await neueSeite(b, h);
  await punkt(`T19 ${name}: nichts ragt seitlich heraus (Bibliothek, Dateien, Ansicht)`, async () => {
    const q1 = await quer(page); await page.click('.tab[data-tab="dat"]'); const q2 = await quer(page);
    await page.click('.tab[data-tab="bib"]'); await page.locator('.card').first().locator('[data-a="browser"]').click(); await page.waitForTimeout(250);
    const q3 = await quer(page); const bar = await page.evaluate(() => { const r = document.querySelector(".viewer .bar").getBoundingClientRect(); return r.bottom <= window.innerHeight + 1; });
    return (q1 <= 0 && q2 <= 0 && q3 <= 0 && bar) || `quer ${q1}/${q2}/${q3}, Leiste sichtbar ${bar}`;
  });
  await punkt(`T20 ${name}: Knöpfe mindestens 36 px hoch`, async () => {
    await page.keyboard.press("Escape");
    const klein = await page.evaluate(() => [...document.querySelectorAll("#app button")].filter(b => b.offsetParent && b.getBoundingClientRect().height < 35.5).map(b => b.textContent.trim()).slice(0,5));
    return klein.length === 0 || klein.join(", ");
  });
  await punkt(`T21 ${name}: keine Programmfehler`, async () => js.length === 0 || js.join(" | "));
  await ctx.close();
}
await browser.close(); server.close();
console.log(`\n${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
