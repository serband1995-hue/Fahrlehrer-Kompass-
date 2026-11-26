/* Kompass Büro – Zahlungsaufforderung per Mail (Werkstatt 11, 🗣 Serband 23.11.2026)
   1. Einstellungen: Abschnitt „Zahlungsdaten für Mails“ (Kontoinhaber, IBAN, BIC, PayPal, Impressum, Test/Echt, Test-Adresse).
   2. Schüler-Akte: Block „Zahlung per Mail“ mit bis zu drei Knöpfen (Prüfung, Reaktivierung, Zahlung offen) und Haken nach dem Senden.
   Versendet wird nur von der Edge-Funktion „zahlungs-mail“ (Server prüft Rolle, Betrag, Limit und bestimmt den Empfänger selbst:
   im Test-Modus geht jede Mail nur an die Test-Adresse). Der Browser schickt Schüler, Art, Betrag und „wofür“.
   Tabellen: fahrschule_zahlungsdaten, zahlungs_mails (supabase/migrations/20261124_zm_01_zahlungsmail.sql).
   Fehlt eine Tabelle (alte Datenbank), ist S.zmFehlt = true: Einstellungs-Abschnitt sagt „noch nicht eingerichtet“, der Akten-Block fehlt.
   3. W15 S5: Block „Erinnerung per Mail“ (Fristen ohne Zahlung, Edge-Funktion „erinnerungs-mail“, Spur erinnerungs_mails).
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
  modus_geaendert: null, // Text hängt vom neuen Modus ab (zmModusText)
  empfaenger_geaendert: "Die Empfänger wurden inzwischen geändert (z. B. an einem anderen PC). Es wurde nichts gesendet. Bitte prüfen und noch einmal senden.",
  nicht_gesperrt: null, // Text mit Namen in zmSende
  keine_email: "Keine E-Mail-Adresse in der Akte.",
  keine_testadresse: "Es ist keine Test-Adresse hinterlegt. Bitte unter Einstellungen eine eintragen.",
  // W15 S4: der Server prüft, ob die Reaktivierung wirklich ansteht (gleiche Regel wie hier im Büro)
  reakt_befreit: "Der Schüler ist von der Reaktivierung befreit. Es wurde nichts gesendet.",
  reakt_entfaellt: "Die Reaktivierung entfällt laut Preisliste. Es wurde nichts gesendet.",
  reakt_ohne_datum: "In der Akte fehlt das Vertragsdatum. Es wurde nichts gesendet.",
  reakt_nicht_faellig: "Die Reaktivierung ist noch nicht fällig (noch vor der Vorwarnzeit). Es wurde nichts gesendet.",
};
const ZM_NICHT_MOEGLICH = ZM_NICHT_MOEGLICH_TEXT;
const LADEFEHLER_TEXT = "Zahlungsdaten konnten nicht geladen werden. Bitte Seite neu laden.";
// laeuft: Schlüssel „schueler|art“ solange Warten oder Senden läuft (nur EINE Mail gleichzeitig); offen: aufgeklappte Formulare; entwurf: Betrag/Wofür je Schlüssel
const ZM = { laeuft: new Set(), offen: new Set(), entwurf: {}, lokal: [], fokus: null };
window.addEventListener("hashchange", () => { ZM.fokus = null; });

// Wer darf? Büro, Leitung, Super-Admin (wie prDarf); Fahrlehrer sehen nichts davon
function zmDarf() { return !!(S.profil && ["buero", "fahrschule_admin", "super_admin"].includes(S.profil.rolle)); }
function zmTabelleFehlt(err) { return !!err && (["42P01", "PGRST205"].includes(err.code) || /does not exist|could not find the table/i.test(String(err.message || ""))); }
// Aufruf aus ladeDaten: Netzfehler behalten den letzten Stand, fehlende Tabelle = „nicht eingerichtet“
function zmLaden(zd, zm, t0) {
  const fehlt = zmTabelleFehlt(zd && zd.error) || zmTabelleFehlt(zm && zm.error);
  S.zmFehlt = fehlt;
  if (fehlt) { S.zahlungsdaten = null; S.zahlungsMails = []; S.zmLadefehler = false; S.zmGeladen = false; S.zmVerlaufFehler = false; return; }
  if (zd && !zd.error) { S.zahlungsdaten = zd.data || null; S.zmGeladen = true; S.zmLadefehler = false; }
  else if (!S.zmGeladen) { S.zahlungsdaten = null; S.zmLadefehler = true; } // nie geladen: „konnte nicht geladen werden“; ein früherer Erfolg behält den Stand
  if (zm && !zm.error) {
    const liste = (zm.data || []).slice();
    // eine Mail, die nach Beginn dieses Ladens gesendet wurde, steht noch nicht in der Antwort: nicht verlieren
    const jetzt = Date.now();
    ZM.lokal = ZM.lokal.filter((l) => jetzt - l.t < 3600000);
    if (t0) for (const l of ZM.lokal) if (l.t > t0 && !liste.some((m) => m.id === l.row.id)) liste.unshift(l.row);
    S.zahlungsMails = liste; S.zmMailsGeladen = true; S.zmVerlaufFehler = false;
  } else {
    if (!Array.isArray(S.zahlungsMails)) S.zahlungsMails = [];
    if (!S.zmMailsGeladen) S.zmVerlaufFehler = true; // früherer Erfolg: letzten Stand behalten
  }
  zmBloeckAktualisieren();
}
function zmLeeren() { S.zahlungsdaten = null; S.zahlungsMails = []; S.zmFehlt = false; S.zmLadefehler = false; S.zmGeladen = false; S.zmMailsGeladen = false; S.zmVerlaufFehler = false; S.zmEntwurf = null; ZM.offen.clear(); ZM.entwurf = {}; ZM.lokal = []; }
// Offene Akten: Block nach jedem Laden neu zeichnen, wenn sich etwas geändert hat (z. B. der Modus); Entwurf und Fokus bleiben
function zmBloeckAktualisieren() { document.querySelectorAll("#zmBlock").forEach((b) => { if (b.dataset.zmsid) zmNeuZeichnen(b.dataset.zmsid, null, null, true); }); }
// W15 S5 (Prüf-Team): Zahlungs- und Erinnerungs-Mail sperren sich gegenseitig – nach jeder Änderung an einer Sperre alle offenen Blöcke neu zeichnen
function mailBloeckeAktualisieren() { zmBloeckAktualisieren(); if (typeof emBloeckAktualisieren === "function") emBloeckAktualisieren(); }
function zmStand() { return S.zahlungsdaten ? String(S.zahlungsdaten.geaendert_am || "") : ""; }
function zmModus() { return zmEcht() ? "echt" : "test"; }
function zmModusText(m) { return m === "echt" ? "Echt" : m === "test" ? "Test" : null; }

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
  const kopf = `<div class="karte nicht-drucken" id="zmEinst"><div class="karte-kopf"><h2>Zahlungsdaten für Mails</h2></div>`;
  if (S.zmFehlt) return kopf + `<p class="leer">Noch nicht eingerichtet. Sobald das Datenbank-Update da ist, erscheint hier der Abschnitt.</p></div>`;
  if (S.zmLadefehler) return kopf + `<p class="zm-hinweis" data-zmladefehler>${esc(LADEFEHLER_TEXT)}</p></div>`;
  const z0 = S.zahlungsdaten || {};
  const d = S.zmEntwurf || {}; // ungespeicherte Eingaben überstehen das Neuzeichnen
  const wert = (k) => (k in d ? d[k] : k === "iban" ? zmIbanZeigen(z0.iban) : (z0[k] || ""));
  const modus = (d.modus || z0.modus) === "echt" ? "echt" : "test";
  const wann = z0.geaendert_am ? `<p class="voll leise klein" data-zmzuletzt>Zuletzt geändert am ${esc(zmZeit(z0.geaendert_am))}${z0.bearbeiter ? " von " + esc(z0.bearbeiter) : ""}.</p>` : `<p class="voll leise klein" data-zmzuletzt>Noch nichts eingetragen.</p>`;
  const aktuell = z0.modus === "echt"
    ? `<p class="voll zm-aktuell echt" data-zmaktuell>Aktuell: ECHT. Mails gehen an die Schüler.</p>`
    : `<p class="voll zm-aktuell test" data-zmaktuell>Aktuell: TEST. Mails gehen nur an ${z0.test_email ? esc(z0.test_email) : "die Adresse des Betreibers"}.</p>`;
  return kopf + `
    <form id="zmForm" class="formular" novalidate>
      ${S.zmEntwurf && S.zmEntwurf.basis !== zmStand() ? `<p class="voll zm-hinweis" data-zmneuer>Die Zahlungsdaten wurden inzwischen von jemand anderem geändert. Deine Eingaben stehen noch hier, gespeichert wird aber erst nach „Seite neu laden“.</p>` : ""}
      ${aktuell}
      <fieldset class="voll zm-modus-wahl"><legend>Wohin gehen die Mails?</legend>
        <label class="zm-wahl"><input type="radio" name="modus" value="test"${modus === "test" ? " checked" : ""}><span><b>Test</b><span class="leise klein">Alle Mails gehen nur an die Test-Adresse. Kein Schüler bekommt etwas.</span></span></label>
        <label class="zm-wahl"><input type="radio" name="modus" value="echt"${modus === "echt" ? " checked" : ""}><span><b>Echt</b><span class="leise klein">Die Mails gehen an die Schüler. Geht erst mit Kontoinhaber und gültiger IBAN.</span></span></label>
        <span class="zm-fehler" data-zmmodus role="alert" hidden></span>
      </fieldset>
      <label class="voll">Test-Adresse<input type="email" name="test_email" maxlength="200" autocomplete="off" value="${esc(wert("test_email"))}"><span class="leise klein">Leer = Adresse des Betreibers.</span></label>
      <p class="voll leise klein">Diese Angaben stehen in der Zahlungsaufforderung an den Schüler (Überweisung oder PayPal).</p>
      <label>Kontoinhaber<input type="text" name="kontoinhaber" maxlength="70" autocomplete="off" value="${esc(wert("kontoinhaber"))}"></label>
      <label>IBAN<input type="text" name="iban" maxlength="42" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(wert("iban"))}"><span class="zm-fehler" data-zmiban role="alert" hidden></span></label>
      <label>BIC (freiwillig)<input type="text" name="bic" maxlength="11" autocomplete="off" autocapitalize="characters" value="${esc(wert("bic"))}"></label>
      <label>PayPal.me-Name oder -Link<input type="text" name="paypal" maxlength="60" autocomplete="off" value="${esc(wert("paypal"))}"></label>
      <label class="voll">Impressum/Kontakt für Mails<textarea name="impressum" rows="4" maxlength="1000">${esc(wert("impressum"))}</textarea><span class="leise klein">Name, Anschrift, Telefon, E-Mail. Steht unten in jeder Mail.</span></label>
      <div class="voll knopfreihe"><button class="knopf haupt" type="submit" id="zmSpeichern">Zahlungsdaten speichern</button></div>
      <p class="zm-fehler voll" data-zmspeicher role="alert" hidden></p>
      ${wann}
    </form></div>`;
}
function zmBindeEinstellungen(ziel) {
  const f = ziel.querySelector("#zmForm");
  if (!f) return;
  const ibanFehler = f.querySelector("[data-zmiban]"), modusFehler = f.querySelector("[data-zmmodus]"), speicherFehler = f.querySelector("[data-zmspeicher]");
  const zeige = (el, text) => { el.textContent = text || ""; el.hidden = !text; };
  const pruefeIban = () => {
    const v = f.iban.value.trim();
    zeige(ibanFehler, v && !zmIbanOk(v) ? "Diese IBAN stimmt nicht (Prüfziffer). Bitte mit dem Kontoauszug vergleichen." : "");
    return !v || zmIbanOk(v);
  };
  // basis = Stand (geaendert_am), auf dem die Eingaben beruhen; beim Speichern wird gegen sie geprüft, nicht gegen den inzwischen neu geladenen Stand
  const merke = () => { const basis = S.zmEntwurf && "basis" in S.zmEntwurf ? S.zmEntwurf.basis : zmStand(); S.zmEntwurf = { kontoinhaber: f.kontoinhaber.value, iban: f.iban.value, bic: f.bic.value, paypal: f.paypal.value, impressum: f.impressum.value, modus: f.modus.value, test_email: f.test_email.value, basis }; };
  // aktives Feld und Cursor überstehen das Neuzeichnen
  const fokusMerken = (e) => { const t = e.target; if (t && t.name && f.contains(t)) ZM.fokus = { name: t.name, a: t.selectionStart, b: t.selectionEnd }; };
  ["focusin", "input", "keyup", "click", "select"].forEach((ev) => f.addEventListener(ev, fokusMerken));
  f.addEventListener("focusout", () => setTimeout(() => { if (f.isConnected && !f.contains(document.activeElement)) ZM.fokus = null; }, 0));
  if (ZM.fokus && (!document.activeElement || document.activeElement === document.body)) {
    const el = f.elements[ZM.fokus.name], von = ZM.fokus.a, bis = ZM.fokus.b; // vorher kopieren: focus() löst den Merker aus
    if (el && el.tagName && el.focus) { el.focus({ preventScroll: true }); try { el.setSelectionRange(von, bis); } catch (e) { /* Feldart ohne Cursor */ } }
  }
  f.addEventListener("input", merke);
  f.addEventListener("change", () => { merke(); zeige(modusFehler, ""); });
  f.iban.addEventListener("blur", pruefeIban);
  f.iban.addEventListener("input", () => { if (!ibanFehler.hidden) pruefeIban(); });
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const knopf = f.querySelector("#zmSpeichern");
    if (knopf.disabled) return;
    zeige(speicherFehler, "");
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
      // nicht blind überschreiben: hat inzwischen jemand anderes gespeichert?
      const frisch = await supa.from("fahrschule_zahlungsdaten").select("geaendert_am").eq("fahrschule_id", S.fsId).maybeSingle();
      if (frisch.error) { zeige(speicherFehler, zmTabelleFehlt(frisch.error) ? "Noch nicht eingerichtet (Datenbank-Update fehlt)." : "Nicht gespeichert: Der Stand konnte nicht geprüft werden. Bitte Seite neu laden."); return; }
      const jetzt = frisch.data ? String(frisch.data.geaendert_am || "") : "", geladen = S.zmEntwurf && "basis" in S.zmEntwurf ? S.zmEntwurf.basis : zmStand();
      if (jetzt !== geladen) { zeige(speicherFehler, "Die Zahlungsdaten wurden inzwischen von jemand anderem geändert. Bitte Seite neu laden."); return; }
      const res = await supa.from("fahrschule_zahlungsdaten").upsert(zeile, { onConflict: "fahrschule_id" }).select("*");
      if (res.error) { toast(zmTabelleFehlt(res.error) ? "Noch nicht eingerichtet (Datenbank-Update fehlt)." : "Nicht gespeichert: " + dbFehlerText(res.error), true); return; }
      if (!res.data || !res.data.length) { toast("Nicht gespeichert: keine Berechtigung", true); return; }
      S.zahlungsdaten = res.data[0]; S.zmGeladen = true; S.zmLadefehler = false; S.zmEntwurf = null;
      toast("Zahlungsdaten gespeichert");
      zeichne();
    } finally { knopf.disabled = false; }
  });
}

/* ---------- 2. Schüler-Akte: Block „Zahlung per Mail“ ---------- */
function zmMailAdresse(x) { return String((x && x.email) || "").trim() || String(((x && x.ausbildung) || {}).email || "").trim(); }
// W14: an wen die echte Mail geht – gleiche Regel wie der Server (zahlungs_mail_vorbereiten): Wahl in der Akte
// (Schüler, Eltern, beide; Vorgabe beide), ohne Eltern-Adresse nur der Schüler. Liste von [wer, adresse].
function zmEmpfaenger(x) {
  const s = zmMailAdresse(x), el = (S.eltern && x && S.eltern[x.id]) || null, e = el && el.email ? String(el.email).trim() : "";
  const wahl = e ? (["schueler", "eltern", "beide"].includes(el.mail_an) ? el.mail_an : "beide") : "schueler";
  const liste = [];
  if ((wahl === "schueler" || wahl === "beide") && s) liste.push(["Schüler", s]);
  if ((wahl === "eltern" || wahl === "beide") && e && !liste.some(([, a]) => a.toLowerCase() === e.toLowerCase())) liste.push(["Eltern", e]);
  return liste;
}
function zmEmpfaengerText(liste) {
  if (liste.length === 1 && liste[0][0] === "Schüler") return liste[0][1]; // wie bisher: nur die Adresse
  return liste.map(([w, a]) => `${w} (${a})`).join(" und ");
}
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
    // W15 S4: auch vor der Fälligkeit (gelb/blau wie in „Läuft bald ab“) als Erinnerung; der Server prüft dieselbe Regel
    const r = KR.reaktInfo(x), bald = r.stufe === "bald" || r.stufe === "demnaechst";
    if (r.gesperrt || r.stufe === "pruefen_faellig" || bald) liste.push({ art: "reaktivierung", betrag: zmBetragFeld(reaktBetrag(x)), wofuer: "Reaktivierung", bald, faellig: r.faellig });
  }
  const z = zahlungSperre(x);
  if (z && istAktiv(x)) liste.push({ art: "zahlung_offen", betrag: "", wofuer: (z.grund || "Offene Zahlung").slice(0, 80) });
  return liste;
}
// letzte erfolgreich gesendete Mail dieser Art IM AKTUELLEN MODUS (Test-Haken zählen im Echt-Modus nicht und umgekehrt)
function zmLetzte(sid, art) {
  const modus = zmModus();
  let best = null;
  for (const m of S.zahlungsMails || []) {
    if (m.schueler_id !== sid || m.art !== art || m.status !== "gesendet" || m.modus !== modus) continue;
    const t = Date.parse(m.gesendet_am || m.angelegt_am || "") || 0;
    if (!best || t > best.t) best = { m, t };
  }
  return best && best.m;
}
function zmFinde(sid) { return [...document.querySelectorAll("#zmBlock")].find((b) => b.dataset.zmsid === sid) || null; }
function zmBlockHTML(sid) {
  if (!zmDarf() || S.zmFehlt) return "";
  const x = S.schueler.find((y) => y.id === sid);
  if (!x) return "";
  const angebote = zmAngebote(x);
  if (!angebote.length) return `<div class="voll" id="zmBlock" data-zmsid="${esc(sid)}" hidden></div>`; // leerer Platz: ein späteres „Zahlung offen“ kann den Block füllen
  const echt = zmEcht(), daten = zmDatenDa(), empf = zmEmpfaenger(x), ladefehler = !!S.zmLadefehler;
  const ohneMail = echt && !empf.length;
  const hinweise = [];
  if (ladefehler) hinweise.push(`<p class="zm-hinweis" data-zmladefehler>${esc(LADEFEHLER_TEXT)}</p>`);
  else if (!daten) hinweise.push(`<p class="zm-hinweis" data-zmohnedaten>Bitte zuerst unter <a href="#einstellungen?thema=zahlungen" data-zmeinst>Einstellungen</a> die Zahlungsdaten eintragen.</p>`);
  else if (echt) hinweise.push(`<p class="zm-echt" data-zmecht>Echt: Mail geht an ${empf.length ? esc(zmEmpfaengerText(empf)) : "den Schüler (E-Mail fehlt)"}</p>`);
  else hinweise.push(`<p class="zm-modus-zeile zm-test" data-zmtest>Test-Modus: Mail geht an die Test-Adresse</p>`);
  if (S.zmVerlaufFehler) hinweise.push(`<p class="zm-hinweis" data-zmverlauf>Verlauf konnte nicht geladen werden. Haken können fehlen.</p>`);
  if (ohneMail && daten && !ladefehler) hinweise.push(`<p class="zm-hinweis" data-zmkeinemail>Keine E-Mail-Adresse in der Akte.</p>`);
  const zeilen = angebote.map((a) => {
    const k = ZM_ARTEN[a.art], letzte = zmLetzte(sid, a.art), schluessel = sid + "|" + a.art;
    const eigene = ZM.laeuft.has(schluessel), andere = (ZM.laeuft.size > 0 || EM.laeuft.size > 0) && !eigene;
    const grund = ladefehler ? "Zahlungsdaten konnten nicht geladen werden" : echt && S.elternFehler ? "Eltern-Angaben konnten nicht geladen werden" : !daten ? "Zahlungsdaten fehlen" : ohneMail ? "E-Mail fehlt" : eigene ? "Gerade wird gesendet" : andere ? "Erst die laufende Mail abwarten" : "";
    const e = ZM.entwurf[schluessel] || {};
    const betrag = "betrag" in e ? e.betrag : a.betrag, wofuer = "wofuer" in e ? e.wofuer : a.wofuer;
    const offen = ZM.offen.has(schluessel);
    const haken = letzte ? `<p class="zm-haken" data-zmhaken="${esc(a.art)}">✓ gesendet am ${esc(zmZeit(letzte.gesendet_am || letzte.angelegt_am))} · ${esc(zmEuroText(letzte.betrag_cent))} · ${esc(letzte.wofuer || "")}${letzte.modus === "test" ? ` <span class="zm-pill-test">Test</span>` : ""}</p>` : "";
    return `<div class="zm-art" data-zmart="${esc(a.art)}">
      <div class="zm-art-kopf"><b>${esc(k.titel)}</b>${a.faellig ? `<span class="leise klein" data-zmfaellig> · ${a.bald ? "fällig am" : "fällig seit"} ${esc(datumDE(a.faellig))}</span>` : ""}${haken}</div>
      <button type="button" class="knopf" data-zmoeffne="${esc(a.art)}"${grund ? " disabled" : ""}>${esc(letzte || a.bald ? "Erinnerung schicken" : k.knopf)}</button>
      ${grund ? `<p class="leise klein zm-grund" data-zmgrund>${esc(grund)}</p>` : ""}
      <div class="zm-form" data-zmform${offen ? "" : " hidden"}>
        <label>Betrag in €<input type="text" inputmode="decimal" maxlength="10" autocomplete="off" data-zmbetrag value="${esc(betrag)}" placeholder="z. B. 120,00"></label>
        <label>Wofür<input type="text" maxlength="80" autocomplete="off" data-zmwofuer value="${esc(wofuer)}"><span class="leise klein">Erscheint in der Mail und im Verwendungszweck, der Name wird automatisch ergänzt. Bitte keine weiteren Namen eintragen.</span></label>
        <p class="zm-fehler" data-zmmeldung role="alert" hidden></p>
        <div class="knopfreihe"><button type="button" class="knopf haupt" data-zmsenden="${esc(a.art)}"${grund ? " disabled" : ""}>${echt ? `Mail an ${empf.length ? empf.map(([w]) => w).join(" und ") : "Schüler"} senden` : "Test-Mail senden"}</button></div>
        ${grund ? `<p class="leise klein zm-grund" data-zmgrund>${esc(grund)}</p>` : ""}
      </div>
    </div>`;
  }).join("");
  return `<div class="voll zm-block" id="zmBlock" data-zmsid="${esc(sid)}" data-zmmodus="${zmModus()}" data-entwurf><h3>Zahlung per Mail</h3>${hinweise.join("")}${zeilen}</div>`;
}
// Block neu zeichnen (immer über die Schüler-Nummer gefunden: die Akte kann inzwischen zu und wieder offen sein)
function zmNeuZeichnen(sid, meldungArt, meldung, nurWennGeaendert) {
  const alt = zmFinde(sid);
  if (!alt) return null;
  const html = zmBlockHTML(sid);
  if (!html) { alt.remove(); return null; }
  if (nurWennGeaendert && alt._zmHtml === html && !meldung) return alt;
  const dlg = alt.closest("dialog");
  // aktives Feld und Cursor merken
  const ak = document.activeElement; let fok = null;
  if (ak && alt.contains(ak) && (ak.hasAttribute("data-zmbetrag") || ak.hasAttribute("data-zmwofuer"))) fok = { art: ak.closest("[data-zmart]").dataset.zmart, feld: ak.hasAttribute("data-zmbetrag") ? "data-zmbetrag" : "data-zmwofuer", a: ak.selectionStart, b: ak.selectionEnd };
  const t = document.createElement("div");
  t.innerHTML = html;
  const frisch = t.firstElementChild;
  frisch._zmHtml = html;
  alt.replaceWith(frisch);
  zmBinde(frisch, dlg, sid);
  if (fok) { const el = frisch.querySelector(`[data-zmart="${fok.art}"] [${fok.feld}]`); if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(fok.a, fok.b); } catch (e) { /* egal */ } } }
  if (meldungArt && meldung) {
    const z = frisch.querySelector(`[data-zmart="${meldungArt}"]`);
    if (z) { const m = z.querySelector("[data-zmmeldung]"); m.textContent = meldung; m.hidden = false; if (!z.querySelector("[data-zmform]").hidden && m.scrollIntoView) m.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }
  return frisch;
}
function zmBindeBlock(dlg, sid) { const b = dlg.querySelector("#zmBlock"); if (b) { b._zmHtml = zmBlockHTML(sid); zmBinde(b, dlg, sid); } }
function zmBinde(block, dlg, sid) {
  block.querySelectorAll("[data-zmeinst]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    versucheSchliessen(dlg).then((ok) => { if (ok) location.hash = "#einstellungen?thema=zahlungen"; });
  }));
  block.querySelectorAll("[data-zmart]").forEach((zeile) => {
    const art = zeile.dataset.zmart, schluessel = sid + "|" + art, melde = zeile.querySelector("[data-zmmeldung]");
    const zeigeFehler = (t) => { melde.textContent = t; melde.hidden = !t; };
    const form = zeile.querySelector("[data-zmform]"), betragFeld = zeile.querySelector("[data-zmbetrag]"), wofuerFeld = zeile.querySelector("[data-zmwofuer]");
    const senden = zeile.querySelector("[data-zmsenden]");
    zeile.querySelector("[data-zmoeffne]").addEventListener("click", () => {
      form.hidden = !form.hidden;
      if (form.hidden) ZM.offen.delete(schluessel); else { ZM.offen.add(schluessel); (betragFeld.value ? wofuerFeld : betragFeld).focus(); }
    });
    [betragFeld, wofuerFeld].forEach((i) => {
      i.addEventListener("input", () => { zeigeFehler(""); ZM.entwurf[schluessel] = { betrag: betragFeld.value, wofuer: wofuerFeld.value }; });
      // Enter darf nicht die ganze Akte speichern: er sendet nur diese Mail
      i.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); senden.click(); } });
    });
    senden.addEventListener("click", async () => {
      if (senden.disabled || ZM.laeuft.size || EM.laeuft.size) return;
      const cent = zmBetragCent(betragFeld.value), wofuer = wofuerFeld.value.trim();
      if (cent == null) { zeigeFehler("Bitte einen Betrag zwischen 1 und 10.000 € eintragen."); betragFeld.focus(); return; }
      if (!wofuer || wofuer.length > 80) { zeigeFehler("Bitte eintragen, wofür gezahlt werden soll (höchstens 80 Zeichen)."); wofuerFeld.focus(); return; }
      zeigeFehler("");
      const x = S.schueler.find((y) => y.id === sid) || {}, name = x.name || "Schüler";
      const modus = block.dataset.zmmodus; // genau der Modus, den dieser Bildschirm zeigt (nicht der aus S: der Block kann älter sein); der Server prüft ebenfalls
      ZM.entwurf[schluessel] = { betrag: betragFeld.value, wofuer: wofuerFeld.value }; ZM.offen.add(schluessel);
      if (modus !== zmModus()) { zmNeuZeichnen(sid, art, `Mail an ${name}: Der Modus wurde inzwischen auf ${zmModusText(zmModus())} umgestellt. Es wurde nichts gesendet. Bitte prüfen und noch einmal senden.`); return; }
      senden.disabled = true;
      zmVersand(sid, art, cent, wofuer, modus);
    });
  });
}
/* ---------- 2b. Karte direkt nach dem Eintragen einer Prüfung (W15c, 🗣 Serband 26.11.2026: „ein Tipp direkt beim Eintragen“) ----------
   Nach dem Speichern einer NEUEN Prüfung (Tafel „Prüfung planen“) steht unten eine Karte: Betrag aus der Preisliste und der Knopf
   „Zahlungsaufforderung senden“. Derselbe Versand wie in der Akte (zmVersand: Test/Echt, Empfänger wie dort, 5 Sekunden „Rückgängig“).
   Nie automatisch. Fehlt etwas (Preis, Zahlungsdaten, E-Mail), sagt die Karte, was fehlt. Schon gesendet: Haken statt Knopf. */
const ZM_KARTE_MS = 20000;
// Wurde für DIESE Prüfung schon eine Zahlungsaufforderung geschickt (im aktuellen Modus)? = nach der letzten früheren Prüfung des Schülers
function zmFuerPruefungGesendet(p) {
  const m = zmLetzte(p.schueler_id, "pruefung");
  if (!m) return null;
  let grenze = "";
  for (const q of S.pruefungstermine || []) if (q.id !== p.id && q.schueler_id === p.schueler_id && q.status !== "abgesagt" && q.datum < p.datum && q.datum > grenze) grenze = q.datum;
  const am = String(m.gesendet_am || m.angelegt_am || "").slice(0, 10);
  return !grenze || am > grenze ? m : null;
}
// Was die Karte zeigt: { betrag, wofuer, grund, link, gesendet } oder null (keine Karte)
function zmKarteDaten(p) {
  if (!zmDarf() || S.zmFehlt || !p || p.status !== "geplant" || !p.datum || p.datum < KR.todayISO()) return null;
  const x = S.schueler.find((y) => y.id === p.schueler_id);
  if (!x || (typeof istAktiv === "function" && !istAktiv(x))) return null;
  const klasse = p.klasse || klasseVon(x);
  const wofuer = ((p.art === "theorie" ? "Theorieprüfung" : "Praktische Prüfung") + (klasse ? " Klasse " + klasse : "")).slice(0, 80);
  const preis = typeof preisAm === "function" ? preisAm(p.art === "theorie" ? "pruefung_theorie" : "pruefung_praxis", klasse || null, null, KR.todayISO()) : undefined;
  const cent = zmBetragCent(zmBetragFeld(preis));
  const gesendet = zmFuerPruefungGesendet(p);
  const echt = zmEcht();
  let grund = "", link = null;
  if (S.zmLadefehler) grund = "Zahlungsdaten konnten nicht geladen werden";
  else if (!zmDatenDa()) { grund = "Zahlungsdaten fehlen"; link = ["#einstellungen?thema=zahlungen", "Zahlungsdaten eintragen"]; }
  else if (cent == null) { grund = "Kein Preis für diese Prüfung in der Preisliste"; link = ["#einstellungen?thema=preise", "Preis eintragen"]; }
  else if (echt && S.elternFehler) grund = "Eltern-Angaben konnten nicht geladen werden";
  else if (echt && !zmEmpfaenger(x).length) grund = "Keine E-Mail-Adresse in der Akte";
  return { x, cent, wofuer, grund, link, gesendet, echt };
}
function zmKarteZu() { const k = document.getElementById("zmKarte"); if (k) { clearTimeout(k._timer); k.remove(); } }
function zmNachPruefung(p) {
  zmKarteZu();
  const d = zmKarteDaten(p);
  if (!d) return false;
  const el = document.createElement("div");
  el.id = "zmKarte"; el.className = "toast toast-undo zeigen zm-karte"; el.setAttribute("role", "status");
  el.dataset.zmmodus = zmModus();
  const name = d.x.name || "Schüler";
  const kopf = `<span class="toast-text"><b>Prüfung gespeichert</b> · ${esc(name)}</span>`;
  let rest;
  if (d.gesendet) rest = `<span class="zm-karte-haken" data-zmkhaken>✓ Zahlungsaufforderung gesendet am ${esc(zmZeit(d.gesendet.gesendet_am || d.gesendet.angelegt_am))}${d.gesendet.modus === "test" ? " (Test)" : ""}</span>`;
  else if (d.grund) rest = `<span class="zm-karte-grund" data-zmkgrund>Zahlung anfordern: ${esc(d.grund)}</span>${d.link ? `<a class="toast-knopf" href="${esc(d.link[0])}" data-zmklink>${esc(d.link[1])}</a>` : ""}`;
  else rest = `<button type="button" class="toast-knopf" data-zmksenden>${d.echt ? "Zahlungsaufforderung senden" : "Zahlungsaufforderung senden (Test)"} · ${esc(zmEuroText(d.cent))}</button>`;
  el.innerHTML = kopf + `<button type="button" class="toast-knopf zm-karte-zu" data-zmkzu aria-label="Schließen">×</button>` + rest;
  el.querySelector("[data-zmkzu]").addEventListener("click", zmKarteZu);
  const l = el.querySelector("[data-zmklink]");
  if (l) l.addEventListener("click", () => zmKarteZu());
  const b = el.querySelector("[data-zmksenden]");
  if (b) b.addEventListener("click", () => {
    if (b.disabled) return;
    if (ZM.laeuft.size || (typeof EM !== "undefined" && EM.laeuft.size)) { toast("Erst die laufende Mail abwarten.", true); return; }
    const modus = el.dataset.zmmodus;
    if (modus !== zmModus()) { zmKarteZu(); toast(`Der Modus wurde inzwischen auf ${zmModusText(zmModus())} umgestellt. Es wurde nichts gesendet. Bitte in der Akte senden.`, true); return; }
    b.disabled = true; zmKarteZu();
    zmVersand(p.schueler_id, "pruefung", d.cent, d.wofuer, modus, { unten: true }); // Rückgängig-Hinweis am selben Ort wie die Karte (Design-Kritiker)
  });
  document.body.appendChild(el);
  el._timer = setTimeout(zmKarteZu, Number(window.ZM_KARTE_MS) > 0 ? Number(window.ZM_KARTE_MS) : ZM_KARTE_MS);
  return true;
}
window.addEventListener("hashchange", zmKarteZu);
// Escape schließt die Karte (nur wenn kein Fenster offen ist: dort schließt Escape das Fenster)
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.getElementById("zmKarte") && !document.querySelector("dialog[open]")) zmKarteZu(); });

// Versand mit 5 Sekunden „Rückgängig“ (Akte und Karte nach dem Eintragen einer Prüfung, W15c): erst danach geht die Mail los.
// modus = der Modus, den der Bildschirm gezeigt hat (der Server prüft ebenfalls).
async function zmVersand(sid, art, cent, wofuer, modus, opt) {
  const schluessel = sid + "|" + art;
  const x = S.schueler.find((y) => y.id === sid) || {}, name = x.name || "Schüler";
  ZM.laeuft.add(schluessel); mailBloeckeAktualisieren();
  const fs0 = S.fsId; // Fahrschule beim Klick: wird inzwischen gewechselt, geht nichts los
  const sitz = await zmSitzung(); // Token und PIN-Sitzung jetzt merken, nicht erst nach der Wartezeit
  zmNeuZeichnen(sid);
  // 5 Sekunden „Rückgängig“; erst danach geht die Mail wirklich los (Zeit um oder nächster Rückgängig-Hinweis)
  const anWen = zmEmpfaenger(x).map(([w]) => w === "Schüler" ? "den Schüler" : "die Eltern").join(" und ") || "den Schüler";
  const empfAdr = zmEmpfaenger(x).map(([, a]) => a.toLowerCase()); // W14: der Server sendet nur, wenn er dieselben Empfänger bestimmt
  const u = toastUndo(`${modus === "echt" ? "Wird an " + anWen + " gesendet" : "Test-Mail wird gesendet"} · ${zmEuroText(cent)} · ${name}`, async () => {
    ZM.laeuft.delete(schluessel); mailBloeckeAktualisieren();
    zmNeuZeichnen(sid);
    toast(`Abgebrochen, an ${name} wurde nichts gesendet`);
  }, {
    ms: Number(window.ZM_WARTE_MS) > 0 ? Number(window.ZM_WARTE_MS) : 5000, // Vorgabe 5 Sekunden; Tests setzen window.ZM_WARTE_MS
    nachAblauf: async (verlassen) => {
      if (verlassen) { ZM.laeuft.delete(schluessel); mailBloeckeAktualisieren(); return; } // Seite wird verlassen: lieber nichts senden (Knopf frei, falls die Seite zurückkommt)
      if (S.fsId !== fs0) { ZM.laeuft.delete(schluessel); mailBloeckeAktualisieren(); toast(`Fahrschule gewechselt, an ${name} wurde nichts gesendet`, true); return; }
      let erg;
      try { erg = await zmSende(sid, art, cent, wofuer, modus, sitz, name, empfAdr, fs0); }
      catch (e) { erg = { ok: false, code: null, text: ZM_NICHT_MOEGLICH }; } // unerwarteter Fehler: Sperre trotzdem lösen (Richter W15 PR 2)
      finally { ZM.laeuft.delete(schluessel); mailBloeckeAktualisieren(); }
      if (erg.ok) { delete ZM.entwurf[schluessel]; ZM.offen.delete(schluessel); zmNeuZeichnen(sid); return; }
      if (erg.code === "modus_geaendert") await zmDatenNeuLaden();
      if ((erg.code === "nicht_gesperrt" || erg.code === "empfaenger_geaendert" || /^reakt_/.test(erg.code || "")) && typeof ladeDaten === "function") ladeDaten(); // Stand der Schüler (und Eltern-Wahl) auffrischen
      const text = erg.code === "nicht_gesperrt" ? erg.text : `Mail an ${name}: ${erg.text}`;
      const b = zmFinde(sid), sichtbar = !!(b && b.closest("dialog") && b.closest("dialog").open);
      if (sichtbar && erg.code !== "nicht_gesperrt") zmNeuZeichnen(sid, art, text); // Fehler nur einmal: im offenen Formular, sonst als Hinweis oben
      else { zmNeuZeichnen(sid); toast(text, true); }
    },
  });
  if (u && u.el && !(opt && opt.unten)) u.el.classList.add("zm-toast");
}
async function zmSitzung() {
  let token = null;
  try { const { data: sd } = await supa.auth.getSession(); token = sd && sd.session ? sd.session.access_token : null; } catch (e) { /* ohne Token: der Server sagt nicht_angemeldet */ }
  return { token, sitzung: S.sitzung ? S.sitzung.token : undefined };
}
// Zahlungsdaten frisch holen (nach „Modus geändert“): Bildschirm und Server sind danach wieder gleich
async function zmDatenNeuLaden() {
  try {
    const r = await supa.from("fahrschule_zahlungsdaten").select("*").eq("fahrschule_id", S.fsId).maybeSingle();
    if (!r.error) { S.zahlungsdaten = r.data || null; S.zmGeladen = true; S.zmLadefehler = false; S.zmEntwurf = null; }
  } catch (e) { /* bleibt beim alten Stand */ }
  if ($("zmEinst")) zeichne();
}

// W15 S4: „Erinnerung schicken“ aus „Läuft bald ab“ – Akte öffnen, Formular der Reaktivierung aufgeklappt (derselbe Weg mit
// 5 Sekunden „Rückgängig“ wie in der Akte, kein zweiter Weg zum Senden)
function zmErinnernKann(x) {
  if (!zmDarf() || S.zmFehlt || !x || !istAktiv(x)) return false;
  return zmAngebote(x).some((a) => a.art === "reaktivierung");
}
function zmErinnern(sid) {
  ZM.offen.add(sid + "|reaktivierung");
  schuelerDialog(sid);
  requestAnimationFrame(() => {
    const z = document.querySelector(`#zmBlock[data-zmsid="${CSS.escape(sid)}"] [data-zmart="reaktivierung"]`);
    if (!z) return;
    z.scrollIntoView({ block: "center" });
    const f = z.querySelector("[data-zmbetrag]");
    if (f && !f.disabled) f.focus({ preventScroll: true });
  });
}
/* ---------- 3. W15 S5: Erinnerung an eine Frist per Mail, ohne Zahlung (🗣 Serband 24.11.2026) ----------
   Theorie (Unterricht oder Praxis nach bestandener Theorie), Führerscheinantrag, Frist der Führerscheinstelle, Umschreiber.
   Angeboten wird genau das, was „Läuft bald ab“ zeigt (gleiche Regeln und Warnzeiten, kompass-rechnen.js); der Server
   (erinnerungs_mail_vorbereiten) rechnet dieselbe Frist selbst und bestimmt den Empfänger. Gesendet wird über die Edge-Funktion
   „erinnerungs-mail“ nach 5 Sekunden „Rückgängig“, wie die Zahlungs-Mail. S.erinnerungsMails = null: Spur-Tabelle fehlt
   (Datenbank-Update noch nicht da) → keine Knöpfe. */
const EM_FEHLER = Object.assign({}, ZM_FEHLER, {
  ohne_datum: "In der Akte fehlt das Datum dieser Frist. Es wurde nichts gesendet.",
  abgelaufen: "Die Frist ist schon abgelaufen. Es wurde nichts gesendet.",
  nicht_faellig: "Die Frist ist noch nicht in der Warnzeit. Es wurde nichts gesendet.",
  erledigt: "Die Theorieprüfung ist schon bestanden. Es wurde nichts gesendet.",
  keine_frist: "Für diesen Schüler gibt es diese Frist nicht (z. B. Führerschein aus der EU). Es wurde nichts gesendet.",
  nicht_aktiv: "Der Schüler ist im Archiv. Es wurde nichts gesendet.",
});
const EM = { laeuft: new Set(), lokal: [] };
function emBereit() { return zmDarf() && !S.zmFehlt && Array.isArray(S.erinnerungsMails); }
// Was steht für diesen Schüler an? [{ art, titel, frist, tage }] – wie laeuftBaldListe (nur noch nicht abgelaufen)
function emAngebote(x) {
  if (!emBereit() || !x || !istAktiv(x)) return [];
  const heute = KR.todayISO(), t = KR.theorieInfo(x, heute), a = KR.antragInfo(x, heute), tf = KR.theorieFristInfo(x, heute), u = KR.umschreibInfo(x, heute);
  const liste = [];
  if (t.stufe === "bald" || t.stufe === "demnaechst") liste.push({ art: "theorie", titel: t.grund === "praxis" ? "Praktische Prüfung bestehen bis" : "Theorieunterricht gilt bis", frist: t.ablauf, tage: t.tage, stufe: t.stufe });
  if (a.stufe === "bald" && a.tage >= 0) liste.push({ art: "antrag", titel: "Führerscheinantrag gilt bis", frist: a.ablauf, tage: a.tage, stufe: "bald" });
  if (tf.stufe === "bald" || tf.stufe === "demnaechst") liste.push({ art: "behoerde", titel: "Theorieprüfung bestehen bis (Frist der Behörde)", frist: tf.ablauf, tage: tf.tage, stufe: tf.stufe });
  if (u.stufe === "bald") liste.push({ art: "umschreiber", titel: "Ausländischer Führerschein gilt bis", frist: u.bis, tage: u.tage, stufe: "bald" });
  return liste;
}
function emKann(x, art) { return emAngebote(x).some((a) => a.art === art); }
// letzte gesendete Erinnerung dieser Art im aktuellen Modus (Test-Haken zählen im Echt-Modus nicht)
function emLetzte(sid, art) {
  const modus = zmModus();
  let best = null;
  for (const m of S.erinnerungsMails || []) {
    if (m.schueler_id !== sid || m.art !== art || m.status !== "gesendet" || m.modus !== modus) continue;
    const t = Date.parse(m.gesendet_am || m.angelegt_am || "") || 0;
    if (!best || t > best.t) best = { m, t };
  }
  return best && best.m;
}
function emLaden(res) {
  if (res && !res.error) {
    const liste = (res.data || []).slice(), jetzt = Date.now();
    EM.lokal = EM.lokal.filter((l) => jetzt - l.t < 3600000);
    for (const l of EM.lokal) if (!liste.some((m) => m.id === l.row.id)) liste.unshift(l.row); // gerade gesendet, noch nicht in der Antwort
    S.erinnerungsMails = liste;
  } else if (!res || zmTabelleFehlt(res.error)) S.erinnerungsMails = null; // Tabelle fehlt: keine Knöpfe
  // anderer Ladefehler: letzten Stand behalten
  emBloeckAktualisieren(); // wie zmLaden: offene Akten zeigen z. B. einen Moduswechsel an einem anderen PC gleich (Richter W15 PR 2)
}
function emBloeckAktualisieren() { document.querySelectorAll("#emBlock").forEach((b) => { if (b.dataset.emsid) emNeuZeichnen(b.dataset.emsid, null, null, true); }); }
function emFinde(sid) { return [...document.querySelectorAll("#emBlock")].find((b) => b.dataset.emsid === sid) || null; }
function emBlockHTML(sid) {
  const x = S.schueler.find((y) => y.id === sid);
  const angebote = emAngebote(x);
  if (!angebote.length) return "";
  const echt = zmEcht(), empf = zmEmpfaenger(x), ohneMail = echt && !empf.length;
  const kopf = echt ? `<p class="zm-echt" data-emecht>Echt: Mail geht an ${empf.length ? esc(zmEmpfaengerText(empf)) : "den Schüler (E-Mail fehlt)"}</p>`
    : `<p class="zm-modus-zeile zm-test" data-emtest>Test-Modus: Mail geht an die Test-Adresse</p>`;
  const zeilen = angebote.map((a) => {
    const letzte = emLetzte(sid, a.art), eigene = EM.laeuft.has(sid + "|" + a.art), andere = (EM.laeuft.size > 0 || ZM.laeuft.size > 0) && !eigene;
    const grund = ohneMail ? "E-Mail fehlt" : echt && S.elternFehler ? "Eltern-Angaben konnten nicht geladen werden" : eigene ? "Gerade wird gesendet" : andere ? "Erst die laufende Mail abwarten" : "";
    const haken = letzte ? `<p class="zm-haken" data-emhaken="${esc(a.art)}">✓ erinnert am ${esc(zmZeit(letzte.gesendet_am || letzte.angelegt_am))}${letzte.modus === "test" ? ` <span class="zm-pill-test">Test</span>` : ""}</p>` : "";
    return `<div class="zm-art" data-emart="${esc(a.art)}">
      <div class="zm-art-kopf"><b>${esc(a.titel)} ${esc(datumDE(a.frist))}</b><span class="leise klein"> · ${esc(noch(a.tage))}</span>${haken}</div>
      <button type="button" class="knopf" data-emsenden="${esc(a.art)}"${grund ? " disabled" : ""}>${echt ? "Erinnerung schicken" : "Test-Erinnerung schicken"}</button>
      ${grund ? `<p class="leise klein zm-grund">${esc(grund)}</p>` : ""}
      <p class="zm-fehler" data-emmeldung role="alert" hidden></p>
    </div>`;
  }).join("");
  return `<div class="voll zm-block" id="emBlock" data-emsid="${esc(sid)}" data-emmodus="${zmModus()}"><h3>Erinnerung per Mail</h3>${kopf}${ohneMail ? `<p class="zm-hinweis">Keine E-Mail-Adresse in der Akte.</p>` : ""}${zeilen}</div>`;
}
function emNeuZeichnen(sid, art, meldung, nurWennGeaendert) {
  const alt = emFinde(sid);
  if (!alt) return;
  const html = emBlockHTML(sid);
  if (!html) { if (alt.hidden && !alt.firstChild) return; const leer = Object.assign(document.createElement("div"), { id: "emBlock", hidden: true }); leer.dataset.emsid = sid; alt.replaceWith(leer); return; } // Schüler-Nummer bleibt: der Block kann später wieder gefüllt werden
  if (nurWennGeaendert && alt._emHtml === html && !meldung) return;
  const t = document.createElement("div"); t.innerHTML = html;
  const frisch = t.firstElementChild; frisch._emHtml = html; alt.replaceWith(frisch); emBinde(frisch, sid);
  if (art && meldung) { const m = frisch.querySelector(`[data-emart="${art}"] [data-emmeldung]`); if (m) { m.textContent = meldung; m.hidden = false; } }
}
function emBindeBlock(dlg, sid) { const b = dlg.querySelector("#emBlock"); if (b && b.dataset.emsid) { b._emHtml = emBlockHTML(sid); emBinde(b, sid); } }
function emBinde(block, sid) {
  block.querySelectorAll("[data-emsenden]").forEach((knopf) => knopf.addEventListener("click", async () => {
    const art = knopf.dataset.emsenden, schluessel = sid + "|" + art;
    if (knopf.disabled || EM.laeuft.size || ZM.laeuft.size) return;
    const x = S.schueler.find((y) => y.id === sid) || {}, name = x.name || "Schüler";
    const modus = block.dataset.emmodus; // genau der Modus, den dieser Bildschirm zeigt; der Server prüft ebenfalls
    if (modus !== zmModus()) { emNeuZeichnen(sid, art, `Der Modus wurde inzwischen auf ${zmModusText(zmModus())} umgestellt. Es wurde nichts gesendet. Bitte prüfen und noch einmal senden.`); return; }
    EM.laeuft.add(schluessel); mailBloeckeAktualisieren();
    const fs0 = S.fsId; // Fahrschule beim Klick: wird inzwischen gewechselt, geht nichts los
    const sitz = await zmSitzung();
    emNeuZeichnen(sid);
    const anWen = zmEmpfaenger(x).map(([w]) => (w === "Schüler" ? "den Schüler" : "die Eltern")).join(" und ") || "den Schüler";
    const empfAdr = zmEmpfaenger(x).map(([, a]) => a.toLowerCase());
    const u = toastUndo(`${modus === "echt" ? "Erinnerung wird an " + anWen + " gesendet" : "Test-Erinnerung wird gesendet"} · ${name}`, async () => {
      EM.laeuft.delete(schluessel); mailBloeckeAktualisieren(); emNeuZeichnen(sid); toast(`Abgebrochen, an ${name} wurde nichts gesendet`);
    }, {
      ms: Number(window.ZM_WARTE_MS) > 0 ? Number(window.ZM_WARTE_MS) : 5000,
      nachAblauf: async (verlassen) => {
        if (verlassen) { EM.laeuft.delete(schluessel); mailBloeckeAktualisieren(); return; }
        if (S.fsId !== fs0) { EM.laeuft.delete(schluessel); mailBloeckeAktualisieren(); toast(`Fahrschule gewechselt, an ${name} wurde nichts gesendet`, true); return; }
        let erg;
        try { erg = await emSende(sid, art, modus, sitz, name, empfAdr, fs0); }
        catch (e) { erg = { ok: false, code: null, text: ZM_NICHT_MOEGLICH }; } // unerwarteter Fehler: Sperre trotzdem lösen (Richter W15 PR 2)
        finally { EM.laeuft.delete(schluessel); mailBloeckeAktualisieren(); }
        if (erg.ok) { emNeuZeichnen(sid); if (typeof zeichne === "function" && /#fristen/.test(location.hash)) zeichne(); return; }
        if (erg.code === "modus_geaendert") await zmDatenNeuLaden();
        if ((erg.code === "empfaenger_geaendert" || EM_FEHLER[erg.code] && !ZM_FEHLER[erg.code]) && typeof ladeDaten === "function") ladeDaten(); // Stand auffrischen
        const b = emFinde(sid), sichtbar = !!(b && b.closest("dialog") && b.closest("dialog").open);
        if (sichtbar) emNeuZeichnen(sid, art, `Erinnerung an ${name}: ${erg.text}`); else { emNeuZeichnen(sid); toast(`Erinnerung an ${name}: ${erg.text}`, true); }
      },
    });
    if (u && u.el) u.el.classList.add("zm-toast");
  }));
}
async function emSende(sid, art, erwarteterModus, sitz, name, empfAdr, fs0) {
  let data = null, error = null;
  try {
    ({ data, error } = await supa.functions.invoke("erinnerungs-mail", { body: { requester_token: sitz.token, buero_sitzung: sitz.sitzung, schueler_id: sid, art, erwartete_empfaenger: erwarteterModus === "echt" && Array.isArray(empfAdr) ? empfAdr : undefined, erwarteter_modus: erwarteterModus } }));
  } catch (e) { error = e || new Error("Netz"); }
  let code = (data && data.fehler) || null, neuerModus = data && data.modus;
  if (!code && error) {
    try { const b = await error.context.json(); code = (b && (b.fehler || b.error)) || null; neuerModus = b && b.modus; } catch (e) { /* keine Erklärung */ }
    if (!code && error.message && EM_FEHLER[error.message] !== undefined) code = error.message;
  }
  if (code === "modus_geaendert") { const m = zmModusText(neuerModus); return { ok: false, code, text: `Der Modus wurde inzwischen ${m ? "auf " + m + " " : ""}umgestellt. Es wurde nichts gesendet. Bitte prüfen und noch einmal senden.` }; }
  if (code) return { ok: false, code, text: EM_FEHLER[code] || ZM_NICHT_MOEGLICH };
  if (error || !data || data.ok === false) return { ok: false, code: null, text: ZM_NICHT_MOEGLICH };
  const jetzt = data.gesendet_am || new Date().toISOString();
  const person = (typeof PIN !== "undefined" && PIN && PIN.person && PIN.person.name) || (S.profil && S.profil.name) || null;
  const fs = fs0 || S.fsId;
  const zeile = { id: data.id || "lokal-" + Date.now(), fahrschule_id: fs, schueler_id: sid, art, frist_am: data.frist_am || null, modus: data.modus || erwarteterModus,
    empfaenger_kurz: data.empfaenger_kurz || null, status: "gesendet", bearbeiter: person, angelegt_am: jetzt, gesendet_am: jetzt };
  if (fs === S.fsId) { // inzwischen andere Fahrschule gewählt: die Zeile gehört nicht in deren Liste (Richter W15 PR 2)
    if (!Array.isArray(S.erinnerungsMails)) S.erinnerungsMails = [];
    S.erinnerungsMails.unshift(zeile); EM.lokal.push({ t: Date.now(), row: zeile });
  }
  const nichtAn = Array.isArray(data.nicht_an) ? data.nicht_an.filter((w) => w === "Eltern" || w === "Schüler") : [];
  if (nichtAn.length) toast(`Erinnerung gesendet, aber nicht an ${nichtAn.map((w) => (w === "Eltern" ? "die Eltern" : "den Schüler")).join(" und ")}.`, true);
  else toast(`Erinnerung gesendet an ${name} ✓${data.modus === "test" ? " (Test: an die Test-Adresse)" : ""}`);
  return { ok: true };
}
// „Erinnerung schicken“ aus „Läuft bald ab“: Akte öffnen und zur Zeile der Frist springen (Empfänger sichtbar, dann senden)
function emErinnern(sid, art) {
  schuelerDialog(sid);
  requestAnimationFrame(() => {
    const z = document.querySelector(`#emBlock[data-emsid="${CSS.escape(sid)}"] [data-emart="${CSS.escape(art)}"]`);
    if (!z) return;
    z.scrollIntoView({ block: "center" });
    const k = z.querySelector("[data-emsenden]");
    if (k && !k.disabled) k.focus({ preventScroll: true });
  });
}
// Aufruf der Edge-Funktion; Rückgabe { ok } oder { ok:false, code, text }
async function zmSende(sid, art, betragCent, wofuer, erwarteterModus, sitz, name, empfAdr, fs0) {
  let data = null, error = null;
  try {
    ({ data, error } = await supa.functions.invoke("zahlungs-mail", { body: { requester_token: sitz.token, buero_sitzung: sitz.sitzung, schueler_id: sid, art, betrag_cent: betragCent, wofuer, erwartete_empfaenger: erwarteterModus === "echt" && Array.isArray(empfAdr) ? empfAdr : undefined, erwarteter_modus: erwarteterModus } }));
  } catch (e) { error = e || new Error("Netz"); }
  let code = (data && data.fehler) || null, neuerModus = data && data.modus;
  if (!code && error) {
    // Die Funktion schickt bei Fehlern einen Code mit (z. B. 409 modus_geaendert); ohne Antwort (Netz, Funktion nicht da) bleibt es beim allgemeinen Text
    try { const b = await error.context.json(); code = (b && (b.fehler || b.error)) || null; neuerModus = b && b.modus; } catch (e) { /* keine Erklärung */ }
    if (!code && error.message && ZM_FEHLER[error.message] !== undefined) code = error.message;
  }
  if (code === "modus_geaendert") {
    const m = zmModusText(neuerModus);
    return { ok: false, code, text: `Der Modus wurde inzwischen ${m ? "auf " + m + " " : ""}umgestellt. Es wurde nichts gesendet. Bitte prüfen und noch einmal senden.` };
  }
  if (code === "nicht_gesperrt") return { ok: false, code, text: `Für ${name} ist keine Zahlung mehr offen. Es wurde nichts gesendet.` };
  if (code) return { ok: false, code, text: ZM_FEHLER[code] || ZM_NICHT_MOEGLICH };
  if (error || !data || data.ok === false) return { ok: false, code: null, text: ZM_NICHT_MOEGLICH };
  const jetzt = data.gesendet_am || new Date().toISOString();
  const person = (typeof PIN !== "undefined" && PIN && PIN.person && PIN.person.name) || (S.profil && S.profil.name) || null;
  if (!Array.isArray(S.zahlungsMails)) S.zahlungsMails = [];
  const fs = fs0 || S.fsId;
  const zeile = { id: data.id || "lokal-" + Date.now(), fahrschule_id: fs, schueler_id: sid, art, betrag_cent: betragCent, wofuer, modus: data.modus || erwarteterModus,
    empfaenger_kurz: data.empfaenger_kurz || null, status: "gesendet", bearbeiter: person, angelegt_am: jetzt, gesendet_am: jetzt };
  if (fs === S.fsId) { S.zahlungsMails.unshift(zeile); ZM.lokal.push({ t: Date.now(), row: zeile }); } // ein gerade laufendes Laden darf den Eintrag nicht verlieren; andere Fahrschule: nicht in deren Liste
  // W14: je Empfänger eine eigene Mail; ging eine davon nicht raus, deutlich sagen (die andere ist gesendet)
  const nichtAn = Array.isArray(data.nicht_an) ? data.nicht_an.filter((w) => w === "Eltern" || w === "Schüler") : [];
  if (nichtAn.length) toast(`Gesendet, aber nicht an ${nichtAn.map((w) => w === "Eltern" ? "die Eltern" : "den Schüler").join(" und ")}. Die andere Mail ist angekommen. Zum Nachsenden in der Akte „${nichtAn[0] === "Eltern" ? "nur Eltern" : "nur Schüler"}“ wählen, sonst bekommt sie der andere doppelt.`, true);
  else toast(`Gesendet an ${name} ✓${data.modus === "test" ? " (Test: an die Test-Adresse)" : ""}`);
  return { ok: true };
}
