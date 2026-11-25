/* Fahrlehrer-Kompass – Nachrichten-Vorlagen (W15 Schritt 4, 🗣 Serband 24.11.2026: „vorgefertigte Nachrichten … diese kann man
   vorschreiben in den Einstellungen“). EINE Datei für Büro und Server:
   - Büro: Thema „Nachrichten-Vorlagen“ in den Einstellungen (Vorschau) – geladen als <script>, danach window.KV.
   - Server: Edge-Funktionen zahlungs-mail und erinnerungs-mail füllen die Vorlage (Kopien supabase/functions/<name>/vorlagen.js,
     geladen mit import "./vorlagen.js", danach globalThis.KV). Alle Dateien müssen Byte für Byte gleich sein
     (scripts/vorlagen-test.mjs prüft das) – so zeigt die Vorschau genau den Text der Mail.
   Ablage: Einstellungen der Fahrschule (fahrschule_einstellungen, Werkstatt 11), Schlüssel „vorlagen.<art>“,
   Wert { text, text_eltern }. Fehlt ein Text oder ist er leer, gilt der Standard (= die Sätze von vorher).
   Platzhalter: {Vorname} {Datum} {Betrag} {Tage} {Fahrschule} (Groß/klein egal). Unbekannte bleiben stehen (Vorschau warnt).
   Sicherheit (Fable-Hinweis W11): Vorlagen sind freier Text des Büros, alle Fahrlehrer der Fahrschule können ihn lesen →
   nichts Geheimes hinein. Ergebnis ist reiner Text: Steuerzeichen raus (Zeilenumbruch bleibt), höchstens 1000 Zeichen,
   höchstens eine Leerzeile am Stück. HTML maskiert erst die Mail (mail.js, esc). Der Betreff ist NICHT einstellbar
   (nie Name, Betrag oder IBAN im Betreff). Keine Netz-, Browser- oder Deno-Funktionen: läuft überall. */
(function (root) {
  "use strict";
  const MAX_ZEICHEN = 1000;
  const PLATZHALTER = ["Vorname", "Datum", "Betrag", "Tage", "Fahrschule"];
  // reihenfolge = Reihenfolge im Thema; platzhalter = welche in dieser Mail einen Wert haben
  const VORLAGEN = {
    reaktivierung_bald: {
      titel: "Reaktivierung wird bald fällig", wann: "Erinnerung, bevor die Reaktivierung fällig wird (Knopf „Erinnerung schicken“).",
      platzhalter: ["Vorname", "Datum", "Tage", "Betrag", "Fahrschule"],
      text: "Ihre Reaktivierung wird am {Datum} fällig. Damit es danach ohne Pause weitergeht, zahlen Sie bitte rechtzeitig:",
      text_eltern: "die Reaktivierung von {Vorname} wird am {Datum} fällig. Damit es danach ohne Pause weitergeht, zahlen Sie bitte rechtzeitig:",
    },
    reaktivierung: {
      titel: "Reaktivierung ist fällig", wann: "Die Reaktivierung ist fällig oder überfällig.",
      platzhalter: ["Vorname", "Datum", "Betrag", "Fahrschule"],
      text: "Ihre Reaktivierung ist fällig. Bitte zahlen Sie:",
      text_eltern: "die Reaktivierung von {Vorname} ist fällig. Bitte zahlen Sie:",
    },
    pruefung: {
      titel: "Prüfung bezahlen", wann: "Zahlungsaufforderung vor einer Prüfung.",
      platzhalter: ["Vorname", "Betrag", "Fahrschule"],
      text: "für Ihre Prüfung bitten wir um folgende Zahlung:",
      text_eltern: "für die Prüfung von {Vorname} bitten wir um folgende Zahlung:",
    },
    zahlung_offen: {
      titel: "Zahlung offen", wann: "Das Büro hat „Zahlung ausstehend“ gedrückt, neue Termine sind gesperrt.",
      platzhalter: ["Vorname", "Betrag", "Fahrschule"],
      text: "bei Ihnen ist noch eine Zahlung offen. Bis zum Eingang können keine neuen Fahrstunden gebucht werden.",
      text_eltern: "für die Ausbildung von {Vorname} ist noch eine Zahlung offen. Bis zum Eingang können keine neuen Fahrstunden gebucht werden.",
    },
    // W15 S5: Erinnerungen ohne Zahlung (Edge-Funktion erinnerungs-mail). Datum = Ende der Frist, Tage = bis dahin.
    erinnerung_theorie: {
      titel: "Theorieunterricht läuft ab", wann: "Der Theorieunterricht gilt nicht mehr lange, die Theorieprüfung ist noch nicht bestanden.",
      platzhalter: ["Vorname", "Datum", "Tage", "Fahrschule"],
      text: "Ihr Theorieunterricht gilt bis zum {Datum}. Bis dahin sollte die Theorieprüfung bestanden sein. Bitte melden Sie sich bei uns, damit wir einen Termin finden.",
      text_eltern: "der Theorieunterricht von {Vorname} gilt bis zum {Datum}. Bis dahin sollte die Theorieprüfung bestanden sein. Bitte melden Sie sich bei uns, damit wir einen Termin finden.",
    },
    erinnerung_praxis: {
      titel: "Theorieprüfung läuft ab (Praxisprüfung)", wann: "Die bestandene Theorieprüfung gilt 12 Monate (§ 18 FeV), bis dahin muss die praktische Prüfung bestanden sein.",
      platzhalter: ["Vorname", "Datum", "Tage", "Fahrschule"],
      text: "Ihre bestandene Theorieprüfung gilt bis zum {Datum}. Bis dahin muss die praktische Prüfung bestanden sein, sonst muss die Theorieprüfung wiederholt werden. Bitte melden Sie sich bei uns, damit wir die nächsten Fahrstunden und die Prüfung planen.",
      text_eltern: "die bestandene Theorieprüfung von {Vorname} gilt bis zum {Datum}. Bis dahin muss die praktische Prüfung bestanden sein, sonst muss die Theorieprüfung wiederholt werden. Bitte melden Sie sich bei uns, damit wir die nächsten Fahrstunden und die Prüfung planen.",
    },
    erinnerung_antrag: {
      titel: "Führerscheinantrag läuft ab", wann: "Der Antrag bei der Führerscheinstelle gilt nicht mehr lange.",
      platzhalter: ["Vorname", "Datum", "Tage", "Fahrschule"],
      text: "Ihr Führerscheinantrag bei der Führerscheinstelle gilt bis zum {Datum}. Danach muss er neu gestellt werden. Bitte melden Sie sich bei uns.",
      text_eltern: "der Führerscheinantrag von {Vorname} bei der Führerscheinstelle gilt bis zum {Datum}. Danach muss er neu gestellt werden. Bitte melden Sie sich bei uns.",
    },
    erinnerung_behoerde: {
      titel: "Frist der Führerscheinstelle", wann: "Die Führerscheinstelle hat eine Frist für die Theorieprüfung gesetzt.",
      platzhalter: ["Vorname", "Datum", "Tage", "Fahrschule"],
      text: "die Führerscheinstelle hat eine Frist gesetzt: Bis zum {Datum} muss die Theorieprüfung bestanden sein. Bitte melden Sie sich bei uns, damit wir einen Termin finden.",
      text_eltern: "die Führerscheinstelle hat für {Vorname} eine Frist gesetzt: Bis zum {Datum} muss die Theorieprüfung bestanden sein. Bitte melden Sie sich bei uns, damit wir einen Termin finden.",
    },
    erinnerung_umschreiber: {
      titel: "Ausländischer Führerschein läuft ab", wann: "Umschreiber mit Führerschein aus einem Land außerhalb der EU: 6 Monate ab Wohnsitz (§ 29 FeV).",
      platzhalter: ["Vorname", "Datum", "Tage", "Fahrschule"],
      text: "Ihr ausländischer Führerschein gilt in Deutschland nur noch bis zum {Datum}. Danach dürfen Sie damit nicht mehr selbst fahren. Bitte melden Sie sich bei uns, damit wir die Umschreibung rechtzeitig abschließen.",
      text_eltern: "der ausländische Führerschein von {Vorname} gilt in Deutschland nur noch bis zum {Datum}. Danach darf {Vorname} damit nicht mehr selbst fahren. Bitte melden Sie sich bei uns, damit wir die Umschreibung rechtzeitig abschließen.",
    },
  };
  const ARTEN = Object.keys(VORLAGEN);
  // Beispielwerte für die Vorschau im Büro (erfunden)
  const BEISPIEL = { Vorname: "Lena", Datum: "2026-12-15", Betrag: 24000, Tage: 20, Fahrschule: "Fahrschule Muster" };

  function zeichen(s) { return Array.from(String(s)); }
  // Freien Text säubern: Steuerzeichen raus, Zeilenumbrüche vereinheitlichen, höchstens eine Leerzeile, Länge begrenzen
  function saeubere(text) {
    let t = String(text == null ? "" : text).replace(/\r\n?/g, "\n").replace(/[\u0085\u2028\u2029]/g, "\n").replace(/\t/g, " ");
    t = t.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");
    t = t.split("\n").map((z) => z.replace(/ {2,}/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    const a = zeichen(t);
    return a.length > MAX_ZEICHEN ? a.slice(0, MAX_ZEICHEN).join("").trim() : t;
  }
  // Ein Wert für einen Platzhalter: einzeilig, ohne Steuerzeichen, kurz
  function einzeilig(s, n) {
    const t = saeubere(s).replace(/\n+/g, " ");
    const a = zeichen(t);
    return a.length > n ? a.slice(0, n).join("") : t;
  }
  function datumText(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    return m ? m[3] + "." + m[2] + "." + m[1] : "";
  }
  function betragText(cent) {
    const c = Math.round(Number(cent));
    if (!Number.isFinite(c) || c <= 0) return "";
    return String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + String(c % 100).padStart(2, "0") + " €";
  }
  function werteText(w) {
    w = w || {};
    const tage = Number(w.Tage);
    return {
      vorname: einzeilig(w.Vorname || "", 40),
      datum: datumText(w.Datum),
      betrag: betragText(w.Betrag),
      tage: Number.isInteger(tage) ? String(Math.max(0, tage)) : "",
      fahrschule: einzeilig(w.Fahrschule || "", 60),
    };
  }
  const MUSTER = /\{\s*(vorname|datum|betrag|tage|fahrschule)\s*\}/gi;
  // Vorlage füllen → reiner Text (noch nicht HTML-maskiert). werte: { Vorname, Datum (JJJJ-MM-TT), Betrag (Cent), Tage, Fahrschule }
  function fuelle(text, werte) {
    const v = werteText(werte);
    return saeubere(text).replace(MUSTER, (_, name) => v[name.toLowerCase()]);
  }
  // Prüfung für das Thema im Büro: leer, zu lang, unbekannte oder in dieser Mail leere Platzhalter
  function pruefe(text, art) {
    const roh = String(text == null ? "" : text), t = saeubere(roh), fehler = [], hinweise = [];
    if (!t) fehler.push("Der Text ist leer.");
    if (zeichen(roh.replace(/\r\n?/g, "\n")).length > MAX_ZEICHEN) fehler.push("Höchstens " + MAX_ZEICHEN + " Zeichen.");
    const erlaubt = (VORLAGEN[art] && VORLAGEN[art].platzhalter) || PLATZHALTER;
    const gefunden = t.match(/\{[^{}\n]{0,30}\}/g) || [];
    for (const g of gefunden) {
      const name = g.slice(1, -1).trim().toLowerCase(), echt = PLATZHALTER.find((p) => p.toLowerCase() === name);
      if (!echt) hinweise.push(g + " gibt es nicht und bleibt so stehen.");
      else if (!erlaubt.includes(echt)) hinweise.push("{" + echt + "} hat in dieser Mail keinen Wert und bleibt leer.");
    }
    return { ok: !fehler.length, fehler, hinweise: [...new Set(hinweise)] };
  }
  // Wert aus den Einstellungen → { text, text_eltern }; leer oder kein Text = Standard
  function vorlageAus(art, wert) {
    const std = VORLAGEN[art];
    if (!std) return null;
    const w = wert && typeof wert === "object" ? wert : {};
    const nimm = (k) => (typeof w[k] === "string" && saeubere(w[k]) ? w[k] : std[k]);
    return { text: nimm("text"), text_eltern: nimm("text_eltern") };
  }
  // Text für einen Empfänger: an = "schueler" | "eltern" | "beide" (Eltern lesen mit). Eltern-Text braucht den Vornamen:
  // fehlt er, gilt der Text an den Schüler (wie vorher).
  function textFuer(vorlage, an, vorname) {
    if (!vorlage) return "";
    if ((an === "eltern" || an === "beide") && vorlage.text_eltern) {
      if (!/\{\s*vorname\s*\}/i.test(vorlage.text_eltern) || einzeilig(vorname || "", 40)) return vorlage.text_eltern;
    }
    return vorlage.text;
  }
  const api = { MAX_ZEICHEN, PLATZHALTER, VORLAGEN, ARTEN, BEISPIEL, saeubere, fuelle, pruefe, vorlageAus, textFuer, datumText, betragText };
  // immer global (Büro: window.KV, Deno und Node: globalThis.KV), in Node zusätzlich als Modul
  if (root) root.KV = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this);
