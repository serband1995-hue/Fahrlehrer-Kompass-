/* Kompass Büro – Zahlungsaufforderung per Mail (Werkstatt 11, 🗣 Serband 23.11.2026)
   1. Einstellungen: Abschnitt „Zahlungsdaten für Mails“ (Kontoinhaber, IBAN, BIC, PayPal, Impressum, Test/Echt, Test-Adresse).
   2. Schüler-Akte: Block „Zahlung per Mail“ mit bis zu drei Knöpfen (Prüfung, Reaktivierung, Zahlung offen) und Haken nach dem Senden.
   Versendet wird nur von der Edge-Funktion „zahlungs-mail“ (Server prüft Rolle, Betrag, Limit und bestimmt den Empfänger selbst:
   im Test-Modus geht jede Mail nur an die Test-Adresse). Der Browser schickt Schüler, Art, Betrag und „wofür“.
   Tabellen: fahrschule_zahlungsdaten, zahlungs_mails (supabase/migrations/20261124_zm_01_zahlungsmail.sql).
   Fehlt eine Tabelle (alte Datenbank), ist S.zmFehlt = true: Einstellungs-Abschnitt sagt „noch nicht eingerichtet“, der Akten-Block fehlt.
   Wird VOR buero.js geladen (buero.js startet sofort und zeichnet); nutzt S, esc, toast, toastUndo usw. erst zur Laufzeit. */
"use strict";
const ZM_ARTEN = {
  pruefung: { titel: "Prüfung", knopf: "Zahlungsaufforderung verschicken" },
  reaktivierung: { titel: "Reaktivierung", knopf: "Reaktivierung fällig" },
  zahlung_offen: { titel: "Zahlung offen", knopf: "Zahlung ausstehend, Termine gesperrt" },
};
const ZM_NICHT_MOEGLICH_TEXT = "Versand gerade nicht möglich. Bitte später noch einmal versuchen.";
const ZM_FEHLER = {
  nicht_angemeldet: "Bitte neu anmelden.",
  keine_berechtigung: "Dafür fehlt die Berechtigung.",
  kein_schueler: "Der Schüler wurde nicht gefunden.",
  art_unbekannt: "Diese Art von Mail gibt es nicht.",
  betrag: "Der Betrag stimmt nicht (erlaubt: 1 bis 10.000 €).",
  wofuer: "Bitte angeben, wofür gezahlt werden soll (höchstens 80 Zeichen).",
  zahlungsdaten_fehlen: "Bitte zuerst unter Einstellungen die Zahlungsdaten eintragen.",
  zu_viele: "Heute schon 5 Mails an diesen Schüler.",
  zu_viele_schule: "Heute wurden schon 100 Mails verschickt. Morgen geht es wieder.",
  ungueltige_anfrage: ZM_NICHT_MOEGLICH_TEXT,
  keine_email: "Keine E-Mail-Adresse in der Akte.",
  keine_testadresse: "Es ist keine Test-Adresse hinterlegt. Bitte unter Einstellungen eine eintragen.",
};
const ZM_NICHT_MOEGLICH = ZM_NICHT_MOEGLICH_TEXT;
const ZM = { laeuft: new Set() }; // Schlüssel „schueler|art“ solange Warten oder Senden läuft

// Wer darf? Büro, Leitung, Super-Admin (wie prDarf); Fahrlehrer sehen nichts davon
function zmDarf() { return !!(S.profil && ["buero", "fahrschule_admin", "super_admin"].includes(S.profil.rolle)); }
function zmTabelleFehlt(err) { return !!err && (["42P01", "PGRST205"].includes(err.code) || /does not exist|could not find the table/i.test(String(err.message || ""))); }
// Aufruf aus ladeDaten: Netzfehler behalten den letzten Stand, fehlende Tabelle = „nicht eingerichtet“
function zmLaden(zd, zm) {
  const fehlt = zmTabelleFehlt(zd && zd.error) || zmTabelleFehlt(zm && zm.error);
  S.zmFehlt = fehlt;
  if (fehlt) { S.zahlungsdaten = null; S.zahlungsMails = []; return; }
  if (zd && !zd.error) S.zahlungsdaten = zd.data || null; else if (S.zahlungsdaten === undefined) S.zahlungsdaten = null;
  if (zm && !zm.error) S.zahlungsMails = zm.data || []; else if (!Array.isArray(S.zahlungsMails)) S.zahlungsMails = [];
}
function zmLeeren() { S.zahlungsdaten = null; S.zahlungsMails = []; S.zmFehlt = false; }

/* ---------- Hilfen ---------- */
// IBAN prüfen (ISO 13616, mod 97) – gleiche Regeln wie iban_gueltig() in der Datenbank
function zmIbanNorm(t) { return String(t || "").replace(/\s+/g, "").toUpperCase(); }
function zmIbanOk(t) {
  const s = zmIbanNorm(t);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  if (s.startsWith("DE") && s.length !== 22) return false;
  const r = s.slice(4) + s.slice(0, 4);
  let rest = 0;
  for (const c of r) rest = c >= "0" && c <= "9" ? (rest * 10 + Number(c)) % 97 : (rest * 100 + (c.charCodeAt(0) - 55)) % 97;
  return rest === 1;
}
function zmIbanZeigen(t) { return zmIbanNorm(t).replace(/(.{4})/g, "$1 ").trim(); }
function zmEuroText(cent) { return (Number(cent || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }); }
// „120“, „120,5“, „1.200,00“ → Cent; außerhalb 1 bis 10.000 € oder Unsinn → null
function zmBetragCent(text) {
  let t = String(text || "").replace(/[\s€]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const cent = Math.round(Number(t) * 100);
  return cent >= 100 && cent <= 1000000 ? cent : null;
}
function zmBetragFeld(euro) { return typeof euro === "number" && euro > 0 ? euro.toFixed(2).replace(".", ",") : ""; }
function zmZeit(iso) {
  const d = new Date(iso || "");
  if (isNaN(d)) return "";
  const z = (n) => String(n).padStart(2, "0");
  return `${z(d.getDate())}.${z(d.getMonth() + 1)}.${d.getFullYear()} ${z(d.getHours())}:${z(d.getMinutes())}`;
}
function zmDatenDa() { const z = S.zahlungsdaten; return !!(z && String(z.kontoinhaber || "").trim() && zmIbanOk(z.iban)); }
function zmEcht() { return !!(S.zahlungsdaten && S.zahlungsdaten.modus === "echt"); }

/* ---------- 1. Einstellungen ---------- */
function zmEinstellungenHTML() {
  if (!zmDarf()) return "";
  if (S.zmFehlt) return `<div class="karte nicht-drucken" id="zmEinst"><div class="karte-kopf"><h2>Zahlungsdaten für Mails</h2></div><p class="leer">Noch nicht eingerichtet. Sobald das Datenbank-Update da ist, erscheint hier der Abschnitt.</p></div>`;
  const z = S.zahlungsdaten || {};
  const modus = z.modus === "echt" ? "echt" : "test";
  const wann = z.geaendert_am ? `<p class="voll leise klein" data-zmzuletzt>Zuletzt geändert am ${esc(zmZeit(z.geaendert_am))}${z.bearbeiter ? " von " + esc(z.bearbeiter) : ""}.</p>` : `<p class="voll leise klein" data-zmzuletzt>Noch nichts eingetragen.</p>`;
  return `<div class="karte nicht-drucken" id="zmEinst"><div class="karte-kopf"><h2>Zahlungsdaten für Mails</h2></div>
    <form id="zmForm" class="formular" novalidate>
      <p class="voll leise klein">Diese Angaben stehen in der Zahlungsaufforderung an den Schüler (Überweisung oder PayPal).</p>
      <label>Kontoinhaber<input type="text" name="kontoinhaber" maxlength="70" autocomplete="off" value="${esc(z.kontoinhaber || "")}"></label>
      <label>IBAN<input type="text" name="iban" maxlength="42" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(zmIbanZeigen(z.iban))}"><span class="zm-fehler" data-zmiban role="alert" hidden></span></label>
      <label>BIC (freiwillig)<input type="text" name="bic" maxlength="11" autocomplete="off" autocapitalize="characters" value="${esc(z.bic || "")}"></label>
      <label>PayPal.me-Name oder -Link<input type="text" name="paypal" maxlength="60" autocomplete="off" value="${esc(z.paypal || "")}"></label>
      <label class="voll">Impressum/Kontakt für Mails<textarea name="impressum" rows="4" maxlength="1000">${esc(z.impressum || "")}</textarea><span class="leise klein">Name, Anschrift, Telefon, E-Mail. Steht unten in jeder Mail.</span></label>
      <fieldset class="voll zm-modus-wahl"><legend>Wohin gehen die Mails?</legend>
        <label class="zm-wahl"><input type="radio" name="modus" value="test"${modus === "test" ? " checked" : ""}><span><b>Test</b><span class="leise klein">Alle Mails gehen nur an die Test-Adresse. Kein Schüler bekommt etwas.</span></span></label>
        <label class="zm-wahl"><input type="radio" name="modus" value="echt"${modus === "echt" ? " checked" : ""}><span><b>Echt</b><span class="leise klein">Die Mails gehen an die Schüler. Geht erst mit Kontoinhaber und gültiger IBAN.</span></span></label>
        <span class="zm-fehler" data-zmmodus role="alert" hidden></span>
      </fieldset>
      <label class="voll">Test-Adresse<input type="email" name="test_email" maxlength="200" autocomplete="off" value="${esc(z.test_email || "")}"><span class="leise klein">Leer = Adresse des Betreibers.</span></label>
      <div class="voll knopfreihe"><button class="knopf haupt" type="submit" id="zmSpeichern">Zahlungsdaten speichern</button></div>
      ${wann}
    </form></div>`;
}
function zmBindeEinstellungen(ziel) {
  const f = ziel.querySelector("#zmForm");
  if (!f) return;
  const ibanFehler = f.querySelector("[data-zmiban]"), modusFehler = f.querySelector("[data-zmmodus]");
  const zeige = (el, text) => { el.textContent = text || ""; el.hidden = !text; };
  const pruefeIban = () => {
    const v = f.iban.value.trim();
    zeige(ibanFehler, v && !zmIbanOk(v) ? "Diese IBAN stimmt nicht (Prüfziffer). Bitte mit dem Kontoauszug vergleichen." : "");
    return !v || zmIbanOk(v);
  };
  f.iban.addEventListener("blur", pruefeIban);
  f.iban.addEventListener("input", () => { if (!ibanFehler.hidden) pruefeIban(); });
  f.addEventListener("change", () => zeige(modusFehler, ""));
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const knopf = f.querySelector("#zmSpeichern");
    if (knopf.disabled) return;
    if (!pruefeIban()) { f.iban.focus(); return; }
    const inhaber = f.kontoinhaber.value.trim(), iban = zmIbanNorm(f.iban.value), modus = f.modus.value === "echt" ? "echt" : "test";
    if (modus === "echt" && (!inhaber || !zmIbanOk(iban))) {
      zeige(modusFehler, "„Echt“ geht erst, wenn Kontoinhaber und eine gültige IBAN eingetragen sind.");
      return;
    }
    const zeile = {
      fahrschule_id: S.fsId, kontoinhaber: inhaber || null, iban: iban || null, bic: zmIbanNorm(f.bic.value) || null,
      paypal: f.paypal.value.trim() || null, impressum: f.impressum.value.trim() || null, modus, test_email: f.test_email.value.trim() || null,
    };
    knopf.disabled = true;
    try {
      const res = await supa.from("fahrschule_zahlungsdaten").upsert(zeile, { onConflict: "fahrschule_id" }).select("*");
      if (res.error) { toast(zmTabelleFehlt(res.error) ? "Noch nicht eingerichtet (Datenbank-Update fehlt)." : "Nicht gespeichert: " + dbFehlerText(res.error), true); return; }
      if (!res.data || !res.data.length) { toast("Nicht gespeichert: keine Berechtigung", true); return; }
      S.zahlungsdaten = res.data[0];
      toast("Zahlungsdaten gespeichert");
      zeichne();
    } finally { knopf.disabled = false; }
  });
}

/* ---------- 2. Schüler-Akte: Block „Zahlung per Mail“ ---------- */
function zmMailAdresse(x) { return String((x && x.email) || ((x && x.ausbildung) || {}).email || "").trim(); }
// Welche Knöpfe gibt es für diesen Schüler, mit vorbelegtem Betrag und „wofür“?
function zmAngebote(x) {
  const heute = KR.todayISO(), liste = [];
  // geplante Prüfung (Tafel oder Kalender der App), die früheste ab heute
  const geplant = [];
  const appErgebnis = (datum) => S.pruefungen.some((e) => e.schueler_id === x.id && e.datum === datum && (e.result === "pass" || e.result === "bestanden" || e.result === "fail" || e.result === "nicht_bestanden"));
  for (const p of S.pruefungstermine) if (p.schueler_id === x.id && p.status === "geplant" && p.datum >= heute && !(p.art === "praxis" && appErgebnis(p.datum))) geplant.push({ art: p.art === "theorie" ? "theorie" : "praxis", datum: p.datum, klasse: p.klasse || klasseVon(x) });
  for (const e of S.pruefungen) if (e.schueler_id === x.id && e.datum >= heute && !e.result && !geplant.some((g) => g.art === "praxis" && g.datum === e.datum)) geplant.push({ art: "praxis", datum: e.datum, klasse: klasseVon(x) });
  geplant.sort((a, b) => a.datum.localeCompare(b.datum));
  if (geplant.length && istAktiv(x)) {
    const p = geplant[0], klasse = p.klasse || klasseVon(x);
    const preis = typeof preisAm === "function" ? preisAm(p.art === "theorie" ? "pruefung_theorie" : "pruefung_praxis", klasse || null, null, heute) : undefined;
    const wofuer = (p.art === "theorie" ? "Theorieprüfung" : "Praktische Prüfung") + (klasse ? " Klasse " + klasse : "");
    liste.push({ art: "pruefung", betrag: zmBetragFeld(preis), wofuer: wofuer.slice(0, 80) });
  }
  if (istAktiv(x)) {
    const r = KR.reaktInfo(x);
    if (r.gesperrt || r.stufe === "pruefen_faellig") liste.push({ art: "reaktivierung", betrag: zmBetragFeld(reaktBetrag(x)), wofuer: "Reaktivierung" });
  }
  const z = zahlungSperre(x);
  if (z && istAktiv(x)) liste.push({ art: "zahlung_offen", betrag: "", wofuer: (z.grund || "Offene Zahlung").slice(0, 80) });
  return liste;
}
// letzte erfolgreich gesendete Mail dieser Art (S.zahlungsMails ist nach Anlegen absteigend, neue Einträge stehen vorn)
function zmLetzte(sid, art) {
  let best = null;
  for (const m of S.zahlungsMails || []) {
    if (m.schueler_id !== sid || m.art !== art || m.status !== "gesendet") continue;
    const t = Date.parse(m.gesendet_am || m.angelegt_am || "") || 0;
    if (!best || t > best.t) best = { m, t };
  }
  return best && best.m;
}
function zmBlockHTML(sid) {
  if (!zmDarf() || S.zmFehlt) return "";
  const x = S.schueler.find((y) => y.id === sid);
  if (!x) return "";
  const angebote = zmAngebote(x);
  if (!angebote.length) return "";
  const echt = zmEcht(), daten = zmDatenDa(), mail = zmMailAdresse(x);
  const ohneMail = echt && !mail;
  const hinweise = [];
  if (!daten) hinweise.push(`<p class="zm-hinweis" data-zmohnedaten>Bitte zuerst unter <a href="#fristen" data-zmeinst>Einstellungen</a> die Zahlungsdaten eintragen.</p>`);
  else if (echt) hinweise.push(`<p class="leise klein zm-modus-zeile">Echt-Modus: Die Mail geht an die E-Mail-Adresse des Schülers.</p>`);
  else hinweise.push(`<p class="zm-modus-zeile zm-test" data-zmtest>Test-Modus: Mail geht an die Test-Adresse</p>`);
  if (ohneMail) hinweise.push(`<p class="zm-hinweis" data-zmkeinemail>Keine E-Mail-Adresse in der Akte.</p>`);
  const zeilen = angebote.map((a) => {
    const k = ZM_ARTEN[a.art], letzte = zmLetzte(sid, a.art), schluessel = sid + "|" + a.art, laeuft = ZM.laeuft.has(schluessel);
    const sperre = !daten || ohneMail || laeuft;
    const haken = letzte ? `<p class="zm-haken" data-zmhaken="${esc(a.art)}">✓ gesendet am ${esc(zmZeit(letzte.gesendet_am || letzte.angelegt_am))} · ${esc(zmEuroText(letzte.betrag_cent))}${letzte.modus === "test" ? " · Test" : ""}</p>` : "";
    return `<div class="zm-art" data-zmart="${esc(a.art)}">
      <div class="zm-art-kopf"><b>${esc(k.titel)}</b>${haken}</div>
      <button type="button" class="knopf" data-zmoeffne="${esc(a.art)}"${sperre ? " disabled" : ""}>${esc(letzte ? "Erinnerung schicken" : k.knopf)}</button>
      <div class="zm-form" data-zmform hidden>
        <label>Betrag in €<input type="text" inputmode="decimal" maxlength="10" autocomplete="off" data-zmbetrag value="${esc(a.betrag)}" placeholder="z. B. 120,00"></label>
        <label>Wofür<input type="text" maxlength="80" autocomplete="off" data-zmwofuer value="${esc(a.wofuer)}"><span class="leise klein">Erscheint in der Mail und im Verwendungszweck, der Name wird automatisch ergänzt. Bitte keine weiteren Namen eintragen.</span></label>
        <div class="knopfreihe"><button type="button" class="knopf haupt" data-zmsenden="${esc(a.art)}"${laeuft ? " disabled" : ""}>Senden</button></div>
        <p class="zm-fehler" data-zmmeldung role="alert" hidden></p>
      </div>
    </div>`;
  }).join("");
  return `<div class="voll zm-block" id="zmBlock" data-entwurf><h3>Zahlung per Mail</h3>${hinweise.join("")}${zeilen}</div>`;
}
function zmBindeBlock(dlg, sid) {
  const block = dlg.querySelector("#zmBlock");
  if (!block) return;
  const neu = (oeffne, meldung) => {
    const alt = dlg.querySelector("#zmBlock");
    if (!alt) return;
    const t = document.createElement("div");
    t.innerHTML = zmBlockHTML(sid);
    const frisch = t.firstElementChild;
    if (!frisch) { alt.remove(); return; }
    alt.replaceWith(frisch);
    zmBindeBlock(dlg, sid);
    if (oeffne) {
      const z = dlg.querySelector(`[data-zmart="${oeffne}"]`);
      if (z) {
        z.querySelector("[data-zmform]").hidden = false;
        if (meldung) { const m = z.querySelector("[data-zmmeldung]"); m.textContent = meldung; m.hidden = false; }
      }
    }
  };
  block.querySelectorAll("[data-zmeinst]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    versucheSchliessen(dlg).then((ok) => { if (ok) location.hash = "#fristen"; });
  }));
  block.querySelectorAll("[data-zmoeffne]").forEach((b) => b.addEventListener("click", () => {
    const f = b.closest("[data-zmart]").querySelector("[data-zmform]");
    f.hidden = !f.hidden;
    if (!f.hidden) { const feld = f.querySelector("[data-zmbetrag]").value ? f.querySelector("[data-zmwofuer]") : f.querySelector("[data-zmbetrag]"); feld.focus(); }
  }));
  block.querySelectorAll("[data-zmart]").forEach((zeile) => {
    const art = zeile.dataset.zmart, melde = zeile.querySelector("[data-zmmeldung]");
    const zeigeFehler = (t) => { melde.textContent = t; melde.hidden = !t; };
    const senden = zeile.querySelector("[data-zmsenden]");
    zeile.querySelectorAll("input").forEach((i) => {
      i.addEventListener("input", () => zeigeFehler(""));
      // Enter darf nicht die ganze Akte speichern: er sendet nur diese Mail
      i.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); senden.click(); } });
    });
    senden.addEventListener("click", () => {
      if (senden.disabled) return;
      const cent = zmBetragCent(zeile.querySelector("[data-zmbetrag]").value);
      const wofuer = zeile.querySelector("[data-zmwofuer]").value.trim();
      if (cent == null) { zeigeFehler("Bitte einen Betrag zwischen 1 und 10.000 € eintragen."); zeile.querySelector("[data-zmbetrag]").focus(); return; }
      if (!wofuer || wofuer.length > 80) { zeigeFehler("Bitte eintragen, wofür gezahlt werden soll (höchstens 80 Zeichen)."); zeile.querySelector("[data-zmwofuer]").focus(); return; }
      zeigeFehler("");
      const schluessel = sid + "|" + art;
      ZM.laeuft.add(schluessel);
      neu(art);
      // 5 Sekunden „Rückgängig“; erst danach geht die Mail wirklich los (Zeit um oder nächster Rückgängig-Hinweis)
      toastUndo(`Mail wird gesendet … (${zmEuroText(cent)})`, async () => {
        ZM.laeuft.delete(schluessel);
        neu(art);
        toast("Abgebrochen, es wurde nichts gesendet");
      }, {
        ms: Number(window.ZM_WARTE_MS) > 0 ? Number(window.ZM_WARTE_MS) : 5000, // Vorgabe 5 Sekunden; Tests setzen window.ZM_WARTE_MS
        nachAblauf: async (verlassen) => {
          if (verlassen) { ZM.laeuft.delete(schluessel); return; } // Seite wird verlassen: lieber nichts senden
          const erg = await zmSende(sid, art, cent, wofuer);
          ZM.laeuft.delete(schluessel);
          if (erg.ok) { neu(null); return; }
          toast(erg.text, true);
          neu(art, erg.text);
        },
      });
    });
  });
}

// Aufruf der Edge-Funktion; Rückgabe { ok } oder { ok:false, text }
async function zmSende(sid, art, betragCent, wofuer) {
  let token = null;
  try { const { data: sd } = await supa.auth.getSession(); token = sd && sd.session ? sd.session.access_token : null; } catch (e) { /* ohne Token: der Server sagt nicht_angemeldet */ }
  let data = null, error = null;
  try {
    ({ data, error } = await supa.functions.invoke("zahlungs-mail", { body: { requester_token: token, buero_sitzung: S.sitzung ? S.sitzung.token : undefined, schueler_id: sid, art, betrag_cent: betragCent, wofuer } }));
  } catch (e) { error = e || new Error("Netz"); }
  let code = (data && data.fehler) || null;
  if (!code && error) {
    // Die Funktion schickt bei Fehlern einen Code mit; ohne Antwort (Netz, Funktion nicht da) bleibt es beim allgemeinen Text
    try { const b = await error.context.json(); code = (b && (b.fehler || b.error)) || null; } catch (e) { /* keine Erklärung */ }
    if (!code && error.message && ZM_FEHLER[error.message]) code = error.message;
  }
  if (code) return { ok: false, text: ZM_FEHLER[code] || ZM_NICHT_MOEGLICH };
  if (error || !data || data.ok === false) return { ok: false, text: ZM_NICHT_MOEGLICH };
  const jetzt = data.gesendet_am || new Date().toISOString();
  const person = (typeof PIN !== "undefined" && PIN && PIN.person && PIN.person.name) || (S.profil && S.profil.name) || null;
  if (!Array.isArray(S.zahlungsMails)) S.zahlungsMails = [];
  S.zahlungsMails.unshift({ id: data.id || "lokal-" + Date.now(), fahrschule_id: S.fsId, schueler_id: sid, art, betrag_cent: betragCent, wofuer, modus: data.modus || (zmEcht() ? "echt" : "test"),
    empfaenger_kurz: data.empfaenger_kurz || null, status: "gesendet", bearbeiter: person, angelegt_am: jetzt, gesendet_am: jetzt });
  toast(data.modus === "test" ? "Gesendet ✓ (Test: an die Test-Adresse)" : "Gesendet ✓");
  return { ok: true };
}
