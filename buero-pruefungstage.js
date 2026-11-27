/* Büro: Prüfungstage mit festen 55-Minuten-Fenstern (Werkstatt W21, 🗣 Serband 26.11.2026)
   Gleiche Zeiten und Logik wie die App: alles Rechnen steckt in kompass-pruefungstage.js (window.PT), der Server prüft nochmal.
   Dieser Teil zeichnet nur: Ansicht „Tage“ in der Prüfungstafel, Tag anlegen/ändern, „+ Schüler“, „Mehrere einplanen“,
   Ziehen (Drag-and-drop, nur am PC), Hinweise (neue Prüfungen aus der App, Uhrzeit geändert) und die Felder im Dialog „Prüfung planen“.
   Wird von buero.js aufgerufen (renderPruefungen, bindePruefungen, pruefungDialog, ladeDaten, abgleichKalender). Nutzt dessen Globale (S, esc, toast …).
   Fehlt die Migration (RPC pruefungstage_belegung gibt Fehler): S.ptFehlt = true → alte Tafel wie bisher. */

const PT_TAGE_FRUEHER = 14;   // „Tage“ zeigt standardmäßig ab 14 Tage zurück
const ptMerkOhneZahlung = new Set(); // Prüfungen, die das Büro in dieser Sitzung per „Mehrere einplanen“ angelegt hat (Hinweis „Zahlungsaufforderung offen“)

function ptAktiv() { return typeof PT !== "undefined" && Array.isArray(S.pruefungstage) && !S.ptFehlt; }
function ptFehler(e) { return typeof PT !== "undefined" ? PT.fehlerText(e) : dbFehlerText(e); }
function ptWochentag(iso) { return KR.parseISO(iso).toLocaleDateString("de-DE", { weekday: "short" }).replace(".", ""); }
function ptTagTitel(tag) { return `${ptWochentag(tag.datum)}, ${datumDE(tag.datum)}`; }
function ptTagTermine(tag) { return S.pruefungstermine.filter((p) => p.pruefungstag_id === tag.id && p.status !== "abgesagt"); }
function ptTag(id) { return (S.pruefungstage || []).find((t) => t.id === id); }
// Uhrzeit einer Prüfung: im Fenster „08:00–08:55“ (Lkw: zwei Fenster), sonst die freie Uhrzeit
function ptZeitText(p) {
  const von = PT.hm(p.von);
  if (!von) return "–";
  if (!p.pruefungstag_id) return von;
  return von + "–" + PT.min2hm(PT.hm2min(von) + (Number(p.fenster_anzahl) || 1) * PT.FENSTER_MIN);
}
function ptStatusKlasse(p) { return " pt-st-" + PT.statusInfo(p.status).farbe; }

/* ---------- Laden ---------- */
// Wirft nie: null = Migration fehlt oder Ladefehler (dann alte Tafel)
async function ptLaden() {
  try {
    if (typeof PT === "undefined") return null;
    const heute = KR.todayISO();
    return await PT.ladeBelegung(supa, KR.addDaysISO(heute, -60), KR.addDaysISO(heute, 180));
  } catch (e) { console.warn("Prüfungstage nicht geladen:", e && e.message); return null; }
}
// Nach jedem Schreiben: Prüfungen und Tage frisch holen (der Server rechnet Datum/Uhrzeit und Kalender) und zeichnen
async function ptNeuLaden(ohneZeichnen) {
  const fs = S.fsId;
  try {
    const [tage, pt] = await Promise.all([
      ptLaden(),
      supa.from("pruefungstermine").select("*").eq("fahrschule_id", fs).gte("datum", KR.addDaysISO(KR.todayISO(), -DATEN_TAGE)).order("datum").order("von"),
    ]);
    if (fs !== S.fsId) return;
    if (pt && !pt.error && pt.data) S.pruefungstermine = pt.data;
    if (tage) { S.pruefungstage = tage; S.ptFehlt = false; }
  } catch (e) { console.warn(e); }
  if (!ohneZeichnen) zeichne();
}
function ptNimmZeile(z) {
  if (!z || !z.id) return;
  const i = S.pruefungstermine.findIndex((x) => x.id === z.id);
  if (i >= 0) S.pruefungstermine[i] = z; else S.pruefungstermine.push(z);
}
// Hat der Server den Kalender-Eintrag des Fahrlehrers nicht geschafft? Dann einfacher Hinweis (Rückgabe true = alles gut)
function ptKalenderHinweis(z) {
  if (!z || !z.kalender_fehler) return true;
  const t = "Prüfung gespeichert, aber nicht im Kalender des Fahrlehrers: " + z.kalender_fehler;
  window.buKalenderFehler = t;
  toast(t, true);
  return false;
}

/* ---------- Ansicht „Tage“ ---------- */
function ptHakenMerker(tag) { return "ptStartInfo:" + tag.id + ":" + (tag.start_geaendert_am || ""); }
function ptMerkerGesetzt(tag) { try { return localStorage.getItem(ptHakenMerker(tag)) === "1"; } catch (e) { return false; } }
function ptMerkerSetzen(tag) { try { localStorage.setItem(ptHakenMerker(tag), "1"); } catch (e) { /* ohne Speicher: Hinweis bleibt */ } }

function ptLehrerAuswahl(p) {
  return `<select class="pt-fl" data-ptfl="${esc(p.id)}" aria-label="Fahrlehrer für ${esc((S.schueler.find((x) => x.id === p.schueler_id) || {}).name || "Prüfung")}">${lehrerOptionen(p.fahrlehrer_id, false, p.klasse)}</select>`;
}
function ptBelegtZeile(tag, p, f) {
  const s = S.schueler.find((x) => x.id === p.schueler_id) || {};
  const heute = KR.todayISO();
  const info = PT.statusInfo(p.status);
  const rueck = ERGEBNIS_RUECK[p.id];
  const offenPast = p.status === "geplant" && p.datum <= heute;
  const erg = p.status === "geplant"
    ? `<span class="marke-pill gelb">${p.datum < heute ? "Ergebnis fehlt" : info.text}</span>${offenPast ? `<span class="ergebnis-knoepfe pt-erg"><button class="knopf klein ergebnis-ja" data-eja="${esc(p.id)}" type="button" aria-label="Bestanden" title="Bestanden">✓</button><button class="knopf klein ergebnis-nein" data-enein="${esc(p.id)}" type="button" aria-label="Nicht bestanden" title="Nicht bestanden">✗</button></span>` : ""}`
    : `<span class="marke-pill ${info.farbe}">${esc(info.text)}</span>${wiederholungHinweis(p)}${rueck ? `<span class="ergebnis-knoepfe"><button class="knopf klein" data-erueck="${esc(p.id)}" type="button">Rückgängig</button></span>` : ""}`;
  const lkw = PT.istLkwKlasse(p.klasse);
  return `<tr class="pt-zeile pt-belegt${ptStatusKlasse(p)}" draggable="true" data-pttag="${esc(tag.id)}" data-ptfenster="${f.i}" data-ptid="${esc(p.id)}">
    <td class="zeitspalte">${esc(ptZeitText(p))}</td>
    <td><span class="pt-griff" aria-hidden="true" title="Zum Verschieben ziehen">⋮⋮</span> <b>${esc(s.name || "(Schüler gelöscht)")}</b>${p.klasse ? ` <span class="leise klein">${esc(p.klasse)}${lkw ? " · 2 Fenster" : ""}</span>` : ""}${p.notiz ? `<div class="unter">${esc(p.notiz)}</div>` : ""}</td>
    <td>${ptLehrerAuswahl(p)}</td>
    <td class="pt-status">${erg}</td>
    <td>${hakenHTML(p, false)}</td>
    <td class="aktionen"><div class="aktionen-box"><button class="knopf klein" data-pbearb="${esc(p.id)}" type="button">Bearbeiten</button></div></td>
  </tr>`;
}
function ptFreiZeile(tag, f) {
  return `<tr class="pt-zeile pt-frei" data-pttag="${esc(tag.id)}" data-ptfenster="${f.i}">
    <td class="zeitspalte">${esc(f.von)}–${esc(f.bis)}</td>
    <td colspan="5"><span class="leise">frei</span> <button class="knopf klein" data-ptplus="${esc(tag.id)}|${f.i}" type="button">+ Schüler</button></td>
  </tr>`;
}
function ptFolgeZeile(tag, p, f) {
  return `<tr class="pt-zeile pt-folge${ptStatusKlasse(p)}" data-pttag="${esc(tag.id)}" data-ptfenster="${f.i}" data-ptid="${esc(p.id)}">
    <td class="zeitspalte">${esc(f.von)}–${esc(f.bis)}</td><td colspan="5" class="leise">↑ gehört zur Prüfung darüber (Lkw: zwei Fenster)</td></tr>`;
}
// Prüfungen mit freier Uhrzeit (ohne Prüfungstag): kompakte Zeile
function ptFreieUhrzeitZeile(p) {
  const s = S.schueler.find((x) => x.id === p.schueler_id) || {};
  const info = PT.statusInfo(p.status);
  const heute = KR.todayISO();
  const erg = p.status === "geplant"
    ? `<span class="marke-pill gelb">${p.datum < heute ? "Ergebnis fehlt" : info.text}</span>${p.datum <= heute ? `<span class="ergebnis-knoepfe pt-erg"><button class="knopf klein ergebnis-ja" data-eja="${esc(p.id)}" type="button" aria-label="Bestanden" title="Bestanden">✓</button><button class="knopf klein ergebnis-nein" data-enein="${esc(p.id)}" type="button" aria-label="Nicht bestanden" title="Nicht bestanden">✗</button></span>` : ""}`
    : `<span class="marke-pill ${info.farbe}">${esc(info.text)}</span>${ERGEBNIS_RUECK[p.id] ? `<span class="ergebnis-knoepfe"><button class="knopf klein" data-erueck="${esc(p.id)}" type="button">Rückgängig</button></span>` : ""}`;
  const frei = p.pruefungstag_id ? "" : ` draggable="true" data-ptid="${esc(p.id)}"`;
  return `<tr class="pt-zeile pt-belegt${ptStatusKlasse(p)}"${frei}>
    <td class="zeitspalte">${esc(p.von ? PT.hm(p.von) : "–")}</td>
    <td><b>${esc(s.name || "(Schüler gelöscht)")}</b> <span class="marke-pill ${p.art === "praxis" ? "gruen" : "blau"}">${p.art === "praxis" ? "Praxis" : "Theorie"}</span>${p.klasse ? ` <span class="leise klein">${esc(p.klasse)}</span>` : ""}</td>
    <td>${esc(p.fahrlehrer_id ? lehrerName(p.fahrlehrer_id) : "–")}</td>
    <td class="pt-status">${erg}</td>
    <td>${p.art === "praxis" ? hakenHTML(p, false) : ""}</td>
    <td class="aktionen"><div class="aktionen-box"><button class="knopf klein" data-pbearb="${esc(p.id)}" type="button">Bearbeiten</button></div></td>
  </tr>`;
}
const PT_KOPF_SPALTEN = `<thead><tr><th>Zeit</th><th>Schüler</th><th>Fahrlehrer</th><th>Stand</th><th>Entgelt · TÜV · AS</th><th></th></tr></thead>`;
function ptTagKarte(tag, ohneFenster) {
  const heute = KR.todayISO();
  const T = ptTagTermine(tag), B = PT.belegung(tag, T), liste = PT.fensterListe(tag);
  const zeilen = liste.map((f) => {
    const b = B[f.i];
    if (!b) return ptFreiZeile(tag, f);
    return b.erstes ? ptBelegtZeile(tag, b.t, f) : ptFolgeZeile(tag, b.t, f);
  }).join("");
  const z = PT.zaehle(tag, T);
  // Hinweis F: Uhrzeit geändert, Schüler informieren (14 Tage lang, bis „Erledigt“)
  const geaendert = tag.start_geaendert_am && String(tag.start_geaendert_am).slice(0, 10) >= KR.addDaysISO(heute, -14) && T.length && tag.datum >= heute && !ptMerkerGesetzt(tag);
  const hinweisF = geaendert
    ? `<div class="pt-hinweis" role="status"><span><b>Uhrzeit geändert – Schüler informieren.</b> Alle Zeiten dieses Tages sind jetzt ab ${esc(PT.tagStart(tag))}.</span><button class="knopf klein" data-ptinfo="${esc(tag.id)}" type="button">Erledigt</button></div>` : "";
  const leer = !T.length && !ohneFenster.length;
  const mehr = ohneFenster.length
    ? `<h4 class="pt-unterkopf">Ohne Fenster (freie Uhrzeit)</h4><table class="tabelle pt-tabelle pt-uhrzeit">${PT_KOPF_SPALTEN}<tbody>${ohneFenster.map(ptFreieUhrzeitZeile).join("")}</tbody></table>` : "";
  return `<section class="karte pt-karte${tag.datum === heute ? " heute" : ""}" data-pttagkarte="${esc(tag.id)}" aria-label="Prüfungstag ${esc(ptTagTitel(tag))}">
    <div class="pt-kopf">
      <div><h3>${esc(ptTagTitel(tag))}</h3><div class="pt-kopf-info">${tag.pruefer ? "Prüfer " + esc(tag.pruefer) : "Prüfer nicht eingetragen"} · Start ${esc(PT.tagStart(tag))} · <b class="pt-zahl">${esc(PT.zaehlText(tag, T))}</b></div></div>
      <div class="knopfreihe"><button class="knopf klein" data-ptbearb="${esc(tag.id)}" type="button">Startzeit/Prüfer ändern</button><button class="knopf klein haupt" data-ptmehrere="${esc(tag.id)}" type="button"${z.frei ? "" : " disabled"}>Mehrere einplanen</button>${leer ? `<button class="knopf klein" data-ptloesch="${esc(tag.id)}" type="button">Tag löschen</button>` : ""}</div>
    </div>
    ${hinweisF}
    <table class="tabelle pt-tabelle" data-pttabelle="${esc(tag.id)}">${PT_KOPF_SPALTEN}<tbody>${zeilen}</tbody></table>
    ${mehr}
  </section>`;
}
// Hinweis D: neue Prüfungen (aus der App, oder eben vom Büro per „Mehrere einplanen“), für die noch keine Zahlungsaufforderung raus ist
function ptOffeneZahlung() {
  if (typeof zmKarteDaten !== "function" || typeof zmFuerPruefungGesendet !== "function") return [];
  const heute = KR.todayISO(), aus = [];
  for (const p of S.pruefungstermine) {
    if (p.status !== "geplant" || p.art !== "praxis" || p.datum < heute) continue;
    if (p.quelle !== "app" && !ptMerkOhneZahlung.has(p.id)) continue;
    let d = null;
    try { d = zmKarteDaten(p); } catch (e) { d = null; }
    if (!d || d.gesendet) continue;
    aus.push({ p, d });
  }
  aus.sort((a, b) => (a.p.datum + (a.p.von || "")).localeCompare(b.p.datum + (b.p.von || "")));
  return aus;
}
function ptZahlungsHinweisHTML() {
  const l = ptOffeneZahlung();
  if (!l.length) return "";
  const alleApp = l.every(({ p }) => p.quelle === "app");
  return `<div class="karte pt-hinweis-karte" data-pthinweisd><div class="karte-kopf"><h2>${l.length} neue Prüfung${l.length === 1 ? "" : "en"}${alleApp ? " aus der App" : ""} – Zahlungsaufforderung offen</h2></div>
    <ul class="pt-liste">${l.map(({ p, d }) => `<li><span><b>${esc(d.x.name || "Schüler")}</b> · ${esc(datumDE(p.datum))}${p.von ? " " + esc(PT.hm(p.von)) : ""}${p.quelle === "app" ? ` <span class="leise klein">aus der App</span>` : ""}${d.grund ? ` <span class="leise klein">(${esc(d.grund)})</span>` : ""}</span><button class="knopf klein haupt" data-ptzm="${esc(p.id)}" type="button">Zahlungsaufforderung ansehen</button></li>`).join("")}</ul>
    <p class="leise klein">Es wird nichts automatisch verschickt. Der Knopf öffnet die Karte, dort sendest du mit einem Tipp.</p></div>`;
}
function ptTageHTML(frueher) {
  const heute = KR.todayISO(), ab = frueher ? "0000-00-00" : KR.addDaysISO(heute, -PT_TAGE_FRUEHER);
  const tage = (S.pruefungstage || []).filter((t) => t.datum >= ab).slice().sort((a, b) => (a.datum + PT.tagStart(a)).localeCompare(b.datum + PT.tagStart(b)));
  // Freie Uhrzeit: am Datum eines Tages unter der Karte, sonst in einer eigenen Karte
  const datumMitTag = new Set(tage.map((t) => t.datum));
  const frei = S.pruefungstermine.filter((p) => !p.pruefungstag_id && p.status !== "abgesagt" && p.art === "praxis" && p.datum >= ab);
  const naheTag = (p) => tage.find((t) => t.datum === p.datum);
  const karten = tage.map((t) => ptTagKarte(t, frei.filter((p) => naheTag(p) === t)));
  const ohneTag = frei.filter((p) => !datumMitTag.has(p.datum)).sort((a, b) => (a.datum + (a.von || "")).localeCompare(b.datum + (b.von || "")));
  const sonst = ohneTag.length ? `<section class="karte pt-karte"><div class="pt-kopf"><div><h3>Prüfungen mit freier Uhrzeit</h3><div class="pt-kopf-info">Ohne Prüfungstag. Zum Einordnen in ein Fenster: Zeile auf ein freies Fenster ziehen.</div></div></div>
    <table class="tabelle pt-tabelle pt-uhrzeit">${PT_KOPF_SPALTEN.replace("<th>Zeit</th>", "<th>Datum, Zeit</th>")}<tbody>${ohneTag.map((p) => ptFreieUhrzeitZeile(p).replace('<td class="zeitspalte">', `<td class="zeitspalte">${esc(ptWochentag(p.datum))} ${esc(datumDE(p.datum))} `)).join("")}</tbody></table></section>` : "";
  const frueherLink = `<p class="leise klein"><a href="${pLink({ ansicht: "", frueher: frueher ? "" : "1" })}">${frueher ? "Nur die letzten 2 Wochen zeigen" : "Frühere Tage zeigen"}</a></p>`;
  if (!karten.length && !sonst) return `<p class="leer">Noch kein Prüfungstag. Mit „+ Prüfungstag“ legst du einen an (neun Fenster à 55 Minuten, Start 08:00).</p>${frueherLink}`;
  return `<p class="leise klein pt-tipp">Zeile auf ein freies Fenster ziehen = verschieben, auf ein belegtes Fenster ziehen = tauschen. Ohne Maus: „Bearbeiten“.</p>${karten.join("")}${sonst}${frueherLink}`;
}

/* ---------- Bedienung ---------- */
function ptBinde(ziel) {
  const neuTag = ziel.querySelector("#ptNeu");
  if (neuTag) neuTag.addEventListener("click", () => ptTagDialog(null));
  ziel.querySelectorAll("[data-ptbearb]").forEach((b) => b.addEventListener("click", () => ptTagDialog(b.dataset.ptbearb)));
  ziel.querySelectorAll("[data-ptmehrere]").forEach((b) => b.addEventListener("click", () => ptMehrereDialog(b.dataset.ptmehrere)));
  ziel.querySelectorAll("[data-ptloesch]").forEach((b) => b.addEventListener("click", () => ptTagLoeschen(b.dataset.ptloesch)));
  ziel.querySelectorAll("[data-ptplus]").forEach((b) => b.addEventListener("click", () => { const [t, i] = b.dataset.ptplus.split("|"); ptPlusDialog(t, Number(i)); }));
  ziel.querySelectorAll("[data-ptinfo]").forEach((b) => b.addEventListener("click", () => { const t = ptTag(b.dataset.ptinfo); if (t) { ptMerkerSetzen(t); zeichne(); } }));
  ziel.querySelectorAll("[data-ptzm]").forEach((b) => b.addEventListener("click", () => {
    const p = S.pruefungstermine.find((x) => x.id === b.dataset.ptzm);
    if (p && typeof zmNachPruefung === "function" && !zmNachPruefung(p, "")) toast("Hier ist keine Zahlungsaufforderung möglich. Bitte in der Akte nachsehen.", true);
  }));
  ziel.querySelectorAll("select[data-ptfl]").forEach((sel) => {
    sel.addEventListener("mousedown", (e) => e.stopPropagation());
    sel.addEventListener("change", () => ptFahrlehrerWechsel(sel.dataset.ptfl, sel.value, sel));
  });
  // Ziehen (nur Maus am PC): belegte Zeile → freies Fenster = verschieben, belegtes Fenster = tauschen
  let ziehId = null;
  const zeilen = ziel.querySelectorAll("tr.pt-zeile");
  zeilen.forEach((tr) => {
    if (tr.draggable) {
      tr.addEventListener("dragstart", (e) => {
        ziehId = tr.dataset.ptid;
        try { e.dataTransfer.setData("text/plain", ziehId); e.dataTransfer.effectAllowed = "move"; } catch (x) { /* ältere Browser */ }
        tr.classList.add("zieht");
      });
      tr.addEventListener("dragend", () => { tr.classList.remove("zieht"); ziehId = null; ziel.querySelectorAll(".pt-ziel").forEach((x) => x.classList.remove("pt-ziel")); });
    }
    if (tr.dataset.pttag) {
      tr.addEventListener("dragover", (e) => { if (!ziehId) return; e.preventDefault(); tr.classList.add("pt-ziel"); });
      tr.addEventListener("dragleave", () => tr.classList.remove("pt-ziel"));
      tr.addEventListener("drop", (e) => {
        e.preventDefault(); tr.classList.remove("pt-ziel");
        const id = ziehId || (e.dataTransfer && e.dataTransfer.getData("text/plain"));
        ziehId = null;
        if (id) ptAblegen(id, tr.dataset.pttag, Number(tr.dataset.ptfenster));
      });
    }
  });
}
async function ptAblegen(id, tagId, fenster) {
  const p = S.pruefungstermine.find((x) => x.id === id), tag = ptTag(tagId);
  if (!p || !tag) return;
  if (p.status !== "geplant") { toast("Nur ausstehende Prüfungen lassen sich verschieben.", true); return; }
  const T = ptTagTermine(tag), B = PT.belegung(tag, T), ziel = B[fenster];
  if (ziel && ziel.t.id === id) return;
  try {
    if (!ziel) {
      const anzahl = p.pruefungstag_id ? (Number(p.fenster_anzahl) || 1) : PT.fensterAnzahlFuer(p.klasse);
      if (!PT.passt(tag, T, fenster, anzahl, id)) { toast(anzahl > 1 ? "Hier ist nicht genug Platz (Lkw braucht zwei Fenster hintereinander)." : "Dieses Fenster ist nicht frei.", true); return; }
      if (p.fahrlehrer_id && p.datum !== tag.datum && typeof vwUrlaubWarnen === "function" && !(await vwUrlaubWarnen(p.fahrlehrer_id, tag.datum))) return;
      const z = p.pruefungstag_id
        ? await PT.verschieben(supa, id, tagId, fenster)
        : await PT.aendern(supa, id, { pruefungstag_id: tagId, fenster, fenster_anzahl: anzahl });
      ptNimmZeile(z);
      if (ptKalenderHinweis(z)) toast("Verschoben auf " + ptZeitText(z) + " am " + datumDE(tag.datum));
    } else {
      if (ziel.t.status !== "geplant") { toast("Hier steht eine Prüfung mit Ergebnis. Tauschen geht nur mit ausstehenden.", true); return; }
      await PT.tauschen(supa, id, ziel.t.id);
      toast("Getauscht");
    }
  } catch (e) { toast(ptFehler(e), true); }
  await ptNeuLaden();
}
async function ptFahrlehrerWechsel(id, fl, sel) {
  const p = S.pruefungstermine.find((x) => x.id === id);
  if (!p) return;
  try {
    if (fl && p.datum >= KR.todayISO() && typeof vwUrlaubWarnen === "function" && !(await vwUrlaubWarnen(fl, p.datum))) { zeichne(); return; }
    const z = await PT.fahrlehrerAendern(supa, id, fl || null);
    ptNimmZeile(z);
    if (ptKalenderHinweis(z)) toast(fl ? "Fahrlehrer geändert: " + lehrerName(fl) : "Fahrlehrer entfernt");
  } catch (e) { toast(ptFehler(e), true); if (sel) sel.value = p.fahrlehrer_id || ""; }
  await ptNeuLaden();
}

// Prüfungstag anlegen / Startzeit, Datum und Prüfer ändern
function ptTagDialog(id) {
  const tag = id ? ptTag(id) : null;
  if (id && !tag) return;
  const T = tag ? ptTagTermine(tag) : [];
  const standard = tag || { datum: KR.addDaysISO(KR.todayISO(), 7), start: PT.START, pruefer: "" };
  const body = `<div class="formular">
      <label>Datum<input type="date" name="datum" required value="${esc(standard.datum)}"></label>
      <label>Start (erstes Fenster)<input type="time" name="start" required step="300" value="${esc(PT.tagStart(standard))}"></label>
      <label class="voll">Prüfer (nur Initialen)<input type="text" name="pruefer" maxlength="10" value="${esc(standard.pruefer || "")}"></label>
    </div>
    <p class="leise klein">${PT.FENSTER_ZAHL} Fenster à ${PT.FENSTER_MIN} Minuten.${tag && T.length ? " Ändert sich der Start, rücken alle Zeiten des Tages mit und die Schüler sollten informiert werden." : ""}</p>`;
  oeffneDialog(tag ? "Prüfungstag ändern" : "Prüfungstag anlegen", body, async (form) => {
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.datum || !d.start) { toast("Bitte Datum und Start eintragen.", true); return false; }
    const werte = { datum: d.datum, start: d.start, pruefer: (d.pruefer || "").trim().toUpperCase() || null };
    try {
      if (tag) {
        await PT.tagAendern(supa, tag.id, werte);
        const startNeu = PT.hm(werte.start) !== PT.tagStart(tag);
        toast(startNeu && T.length ? "Zeiten gerückt. Bitte die Schüler informieren." : "Prüfungstag gespeichert");
      } else {
        const gleich = (S.pruefungstage || []).some((t) => t.datum === werte.datum && (t.pruefer || "") === (werte.pruefer || ""));
        if (gleich && !(await bestaetige("Gibt es diesen Prüfungstag schon?", "An diesem Datum gibt es schon einen Tag mit demselben Prüfer. Trotzdem noch einen anlegen?", "Ja, noch einen"))) return false;
        await PT.tagAnlegen(supa, { fahrschule_id: S.fsId, erstellt_von: S.user && S.user.id, datum: werte.datum, start: werte.start, pruefer: werte.pruefer });
        toast("Prüfungstag angelegt");
      }
    } catch (e) { toast(ptFehler(e), true); return false; }
    await ptNeuLaden();
    return true;
  });
}
async function ptTagLoeschen(id) {
  const tag = ptTag(id);
  if (!tag) return;
  if (ptTagTermine(tag).length) { toast(PT.fehlerText("W21:tag_nicht_leer"), true); return; }
  if (!(await bestaetige(`Prüfungstag ${ptTagTitel(tag)} löschen?`, "Der Tag ist leer. Er verschwindet aus der Tafel und aus der App.", "Ja, löschen"))) return;
  try { await PT.tagLoeschen(supa, id); toast("Prüfungstag gelöscht"); } catch (e) { toast(ptFehler(e), true); }
  await ptNeuLaden();
}

// „+ Schüler“ in einem freien Fenster
function ptPlusDialog(tagId, fenster) {
  const tag = ptTag(tagId);
  if (!tag) return;
  const von = PT.fensterVon(tag, fenster);
  const body = `<p>Fenster <b>${esc(von)}–${esc(PT.fensterBis(tag, fenster, 1))}</b> am ${esc(ptTagTitel(tag))}.</p>
    <div class="formular">
      <label class="voll">Schüler<select name="schueler_id" required><option value="">– bitte wählen –</option>${schuelerOptionen("")}</select></label>
      <label>Klasse<select name="klasse">${klassenOptionen("")}</select></label>
      <label>Fahrlehrer<select name="fahrlehrer_id">${lehrerOptionen("", false, "")}</select></label>
    </div>
    <p class="leise klein" id="ptPlusHinweis">Fahrlehrer und Klasse kommen vom Schüler. Lkw-Klassen brauchen zwei Fenster hintereinander.</p>`;
  const dlg = oeffneDialog("Schüler einplanen", body, async (form) => {
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.schueler_id) { toast("Bitte einen Schüler wählen.", true); return false; }
    const sx = S.schueler.find((x) => x.id === d.schueler_id);
    const anzahl = PT.fensterAnzahlFuer(d.klasse || null);
    const T = ptTagTermine(tag);
    if (!PT.passt(tag, T, fenster, anzahl)) { toast(anzahl > 1 ? "Für diese Klasse braucht es zwei freie Fenster hintereinander." : "Dieses Fenster ist inzwischen belegt.", true); return false; }
    if (sx && d.fahrlehrer_id && tag.datum >= KR.todayISO() && bueroGesperrt(sx)) { toast(ZAHLUNG_MELDUNG, true); return false; }
    if (d.fahrlehrer_id && typeof vwUrlaubWarnen === "function" && !(await vwUrlaubWarnen(d.fahrlehrer_id, tag.datum))) return false;
    let z;
    try {
      z = await PT.einplanen(supa, { fahrschule_id: S.fsId, schueler_id: d.schueler_id, art: "praxis", klasse: d.klasse || null, fahrlehrer_id: d.fahrlehrer_id || null,
        pruefungstag_id: tag.id, fenster, fenster_anzahl: anzahl, quelle: "buero", pruefer: tag.pruefer || null });
    } catch (e) { toast(ptFehler(e), true); return false; }
    ptNimmZeile(z);
    window.buKalenderFehler = "";
    const kalenderOk = ptKalenderHinweis(z);
    await ptNeuLaden();
    const karte = typeof zmNachPruefung === "function" && zmNachPruefung(z, kalenderOk ? "" : window.buKalenderFehler);
    if (kalenderOk && !karte) toast("Eingeplant: " + ((sx && sx.name) || "Schüler") + ", " + ptZeitText(z));
    return true;
  }, "Einplanen");
  const sel = dlg.querySelector("select[name=schueler_id]");
  sel.addEventListener("change", () => {
    const s = S.schueler.find((x) => x.id === sel.value);
    if (!s) return;
    if (s.fahrlehrer_id) dlg.querySelector("select[name=fahrlehrer_id]").value = s.fahrlehrer_id;
    const k = s.klasse || (typeof klasseVon === "function" ? klasseVon(s) : "");
    if (k) dlg.querySelector("select[name=klasse]").value = k;
  });
}

// Schüler für „Mehrere einplanen“: wer bereit ist (Theorie bestanden, noch keine Praxis) und noch keine Prüfung hat, steht vorne
function ptSchuelerGruppen() {
  const heute = KR.todayISO();
  const hat = new Set();
  for (const p of S.pruefungstermine) if (p.art === "praxis" && p.status === "geplant" && p.datum >= heute) hat.add(p.schueler_id);
  const l = S.schueler.filter(istAktiv).map((s) => {
    let g = 2;
    if (hat.has(s.id)) g = 3;
    else if (!s.praxis_bestanden_am && (s.theorie_bestanden_am || (typeof wartetArt === "function" && wartetArt(s) === "praxis"))) g = 1;
    return { s, g, hat: hat.has(s.id) };
  });
  l.sort((a, b) => a.g - b.g || String(a.s.name).localeCompare(String(b.s.name), "de"));
  return l;
}
function ptMehrereDialog(tagId) {
  const tag = ptTag(tagId);
  if (!tag) return;
  const T0 = ptTagTermine(tag), frei = PT.freieFenster(tag, T0, 1).length;
  if (!frei) { toast("Dieser Tag ist voll.", true); return; }
  const liste = ptSchuelerGruppen();
  let vorn = 0;
  const kopfG = { 1: "Bereit für die Praxisprüfung", 2: "Weitere Schüler", 3: "Haben schon eine Prüfung geplant" };
  let letzteG = 0;
  const zeilen = liste.map(({ s, g, hat }) => {
    const gesperrt = bueroGesperrt(s);
    const an = g === 1 && !gesperrt && vorn < frei; if (an) vorn++;
    const kopf = g !== letzteG ? `<div class="pt-gruppe">${kopfG[g]}</div>` : ""; letzteG = g;
    return `${kopf}<label class="wahl pt-wahl" data-ptname="${esc(String(s.name || "").toLowerCase())}"><input type="checkbox" name="sid" value="${esc(s.id)}"${an ? " checked" : ""}${gesperrt ? " disabled" : ""}> <b>${esc(s.name)}</b> <span class="leise klein">${esc(s.klasse || "")}${s.fahrlehrer_id ? " · " + esc(lehrerName(s.fahrlehrer_id)) : ""}${gesperrt ? " · Zahlung ausstehend" : ""}${hat ? " · hat schon eine Prüfung" : ""}</span></label>`;
  }).join("");
  const body = `<p><b>${esc(ptTagTitel(tag))}</b>: ${esc(PT.zaehlText(tag, T0))}. Haken setzen: Die Schüler kommen der Reihe nach in die freien Fenster.</p>
    <input type="search" class="suche pt-suche" id="ptSuche" placeholder="Schüler suchen" aria-label="Schüler suchen">
    <div class="pt-wahlliste" id="ptWahlliste">${zeilen || '<p class="leer">Keine aktiven Schüler.</p>'}</div>
    <p class="leise klein" id="ptZaehl" aria-live="polite"></p>
    <p class="leise klein">Fahrlehrer und Klasse kommen vom Schüler und lassen sich danach in der Zeile ändern. Es wird nichts verschickt.</p>`;
  const dlg = oeffneDialog("Mehrere einplanen", body, async (form) => {
    const ids = new FormData(form).getAll("sid");
    if (!ids.length) { toast("Bitte mindestens einen Schüler ankreuzen.", true); return false; }
    const T = ptTagTermine(tag);
    if (ids.length > PT.freieFenster(tag, T, 1).length) { toast(`Es sind nur ${PT.freieFenster(tag, T, 1).length} Fenster frei. Bitte weniger Schüler ankreuzen.`, true); return false; }
    const schueler = ids.map((i) => S.schueler.find((x) => x.id === i)).filter(Boolean)
      .map((s) => ({ id: s.id, name: s.name, klasse: s.klasse || (typeof klasseVon === "function" ? klasseVon(s) : null) || null, fahrlehrer_id: s.fahrlehrer_id || null }));
    let res;
    try { res = await PT.mehrereEinplanen(supa, tag, T, schueler, { fahrschule_id: S.fsId, art: "praxis", quelle: "buero", pruefer: tag.pruefer || null }); }
    catch (e) { toast(ptFehler(e), true); return false; }
    res.ok.forEach((z) => { ptNimmZeile(z); ptMerkOhneZahlung.add(z.id); });
    await ptNeuLaden();
    const name = (sid) => (S.schueler.find((x) => x.id === sid) || {}).name || "Schüler";
    const teile = [];
    if (res.ok.length) teile.push(`${res.ok.length} Schüler eingeplant`);
    if (res.fehler.length) teile.push("Nicht eingeplant: " + res.fehler.map((f) => `${name(f.sid)} (${f.text})`).join("; "));
    toast(teile.join(". "), res.fehler.length > 0);
    return true;
  }, "Einplanen");
  const zaehl = () => {
    const n = dlg.querySelectorAll("input[name=sid]:checked").length;
    dlg.querySelector("#ptZaehl").textContent = `${n} ausgewählt, ${frei} Fenster frei${n > frei ? " – zu viele" : ""}`;
  };
  dlg.addEventListener("change", (e) => { if (e.target && e.target.name === "sid") zaehl(); });
  const such = dlg.querySelector("#ptSuche");
  such.addEventListener("input", () => {
    const q = such.value.trim().toLowerCase();
    dlg.querySelectorAll(".pt-wahl").forEach((l) => { l.hidden = !!q && !l.dataset.ptname.includes(q); });
  });
  zaehl();
}

/* ---------- Felder im Dialog „Prüfung planen / bearbeiten“ ---------- */
function ptZeitFeldHTML(p, id) {
  if (!ptAktiv()) return "";
  const heute = KR.todayISO();
  const hatTag = !!(p && p.pruefungstag_id);
  const tage = S.pruefungstage.filter((t) => t.datum >= heute || t.id === (p && p.pruefungstag_id));
  const start = hatTag || (!id && tage.length) ? "fenster" : "frei";
  const tagOpt = tage.length
    ? tage.map((t) => `<option value="${esc(t.id)}"${t.id === (p && p.pruefungstag_id) ? " selected" : ""}>${esc(ptTagTitel(t))}${t.pruefer ? " · " + esc(t.pruefer) : ""} · ${esc(PT.zaehlText(t, ptTagTermine(t)))}</option>`).join("")
    : `<option value="">– noch kein Prüfungstag –</option>`;
  // Tauschen ohne Maus: mit einer anderen ausstehenden Prüfung auf einem Tag
  const tausch = id && hatTag && p.status === "geplant"
    ? `<label class="voll" data-pt="fenster">Mit einem anderen Schüler tauschen<select name="tauschen_mit"><option value="">– nicht tauschen –</option>${S.pruefungstermine
      .filter((q) => q.id !== id && q.pruefungstag_id && q.status === "geplant" && q.datum >= heute)
      .sort((a, b) => (a.datum + (a.von || "")).localeCompare(b.datum + (b.von || "")))
      .map((q) => `<option value="${esc(q.id)}">${esc(ptWochentag(q.datum))} ${esc(datumDE(q.datum))} ${esc(ptZeitText(q))} – ${esc((S.schueler.find((x) => x.id === q.schueler_id) || {}).name || "Schüler")}</option>`).join("")}</select></label>` : "";
  return `<label class="voll" data-ptzeitart>Zeit<select name="zeitart"><option value="fenster"${start === "fenster" ? " selected" : ""}>Zeitfenster an einem Prüfungstag</option><option value="frei"${start === "frei" ? " selected" : ""}>Freie Uhrzeit</option></select></label>
    <label data-pt="fenster">Prüfungstag<select name="tag_id">${tagOpt}</select></label>
    <label data-pt="fenster">Fenster<select name="fenster"></select></label>${tausch}`;
}
function ptZeitFeldBinden(dlg, p, id) {
  if (!ptAktiv()) return;
  const f = (n) => dlg.querySelector(`[name=${n}]`);
  const fuelleFenster = () => {
    const tag = ptTag(f("tag_id").value), sel = f("fenster"), alt = sel.value;
    if (!tag) { sel.innerHTML = `<option value="">–</option>`; return; }
    const anzahl = PT.fensterAnzahlFuer(f("klasse").value || null);
    const frei = PT.freieFenster(tag, ptTagTermine(tag), anzahl, id || null);
    sel.innerHTML = frei.length ? frei.map((i) => `<option value="${i}">${esc(PT.fensterVon(tag, i))}–${esc(PT.fensterBis(tag, i, anzahl))}</option>`).join("") : `<option value="">– kein Fenster frei –</option>`;
    const wunsch = alt !== "" && alt != null ? alt : (p && p.pruefungstag_id === tag.id && p.fenster != null ? String(p.fenster) : "");
    if (wunsch !== "" && frei.includes(Number(wunsch))) sel.value = String(wunsch);
  };
  let wunsch = f("zeitart").value;
  const umschalten = () => {
    const praxis = f("art").value === "praxis";
    const za = f("zeitart");
    za.querySelector("option[value=fenster]").disabled = !praxis;
    za.value = praxis ? wunsch : "frei"; // Theorie: nur freie Uhrzeit; zurück zu Praxis: wieder die gewählte Art
    const fenster = za.value === "fenster";
    dlg.querySelectorAll("[data-pt=fenster]").forEach((l) => { l.hidden = !fenster; l.querySelectorAll("select").forEach((s) => { s.disabled = !fenster; }); });
    dlg.querySelectorAll("[data-pt=frei]").forEach((l) => { l.hidden = fenster; l.querySelectorAll("input").forEach((i) => { i.disabled = fenster; }); });
    const dat = f("datum"); if (dat) dat.required = !fenster;
    if (fenster) fuelleFenster();
  };
  f("zeitart").addEventListener("change", () => { wunsch = f("zeitart").value; umschalten(); });
  f("art").addEventListener("change", umschalten);
  f("tag_id").addEventListener("change", () => { f("fenster").value = ""; fuelleFenster(); });
  f("klasse").addEventListener("change", fuelleFenster);
  umschalten();
}
// Auswertung beim Speichern. Gibt null zurück (freie Uhrzeit) oder { tag, fenster, anzahl, datum, von, tauschen } oder { fehler }
function ptZeitFeldAuswerten(d, p, id) {
  if (!ptAktiv() || d.zeitart !== "fenster" || d.art !== "praxis") return null;
  if (d.tauschen_mit) return { tauschen: d.tauschen_mit };
  const tag = ptTag(d.tag_id);
  if (!tag) return { fehler: "Bitte einen Prüfungstag wählen (oder „Freie Uhrzeit“)." };
  if (d.fenster === "" || d.fenster == null) return { fehler: "An diesem Tag ist kein Fenster frei. Bitte einen anderen Tag wählen." };
  const i = Number(d.fenster), anzahl = PT.fensterAnzahlFuer(d.klasse || null);
  if (!PT.passt(tag, ptTagTermine(tag), i, anzahl, id || null)) return { fehler: "Dieses Fenster ist inzwischen belegt." };
  return { tag, fenster: i, anzahl, datum: tag.datum, von: PT.fensterVon(tag, i) };
}
// Felder, die statt Datum/Uhrzeit gespeichert werden
function ptZeitWerte(pz, p, id) {
  if (!ptAktiv()) return null;
  if (pz && pz.tag) {
    const gleich = id && p.pruefungstag_id === pz.tag.id && p.fenster === pz.fenster && (Number(p.fenster_anzahl) || 1) === pz.anzahl;
    return gleich ? { weg: ["datum", "von"] } : { weg: ["datum", "von"], setze: { pruefungstag_id: pz.tag.id, fenster: pz.fenster, fenster_anzahl: pz.anzahl }, neu: !id };
  }
  if (pz && pz.tauschen) return { weg: ["datum", "von"] };
  // freie Uhrzeit: eine Prüfung, die im Fenster war, löst sich davon
  if (id && p.pruefungstag_id) return { setze: { pruefungstag_id: null, fenster: null, fenster_anzahl: 1 } };
  return null;
}
