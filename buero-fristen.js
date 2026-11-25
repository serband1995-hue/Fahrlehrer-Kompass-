/* W15 Schritt 3 (🗣 Serband 24.11.2026): Thema „Fristen“ in den Einstellungen (Büro, Leitung, Super-Admin).
   „Alles ist einstellbar … der Einstellungsbereich darf nicht unübersichtlich sein … unterteilt in Themen.“
   Eine Tabelle: Frist | Dauer | Warnung (gelb) | Vorwarnung (blau). Gesetzliche Fristen grau mit Paragraf, nur die Warnzeit
   ist einstellbar (Entscheidung 4a). Speichern mit „Rückgängig“, kein Bestätigen-Fenster.
   Rahmen und Ablage von Werkstatt 11: window.BUERO_EINSTELLUNGEN_THEMEN, KE (kompass-einstellungen.js),
   Tabelle fahrschule_einstellungen (Schlüssel „fristen.<art>“, Wert = Objekt). Rechenregeln: KR.setzeFristen (kompass-rechnen.js).
   Die Monate der Reaktivierung rechnet auch der Server (reakt_monate, Migration 20261127_w15_02): nach dem Speichern holt das
   Büro die Regel neu und meldet, falls der Server noch anders rechnet. */
(function () {
  "use strict";
  const KR = window.KR;
  if (!KR || !KR.normFristen) return; // alte kompass-rechnen.js: Thema erst nach dem Neuladen
  const STD = KR.FRISTEN_STANDARD, GR = KR.FRISTEN_GRENZEN;
  // art: Schlüssel in den Einstellungen; dauer: Feld „monate“ einstellbar | fest: gesetzlich | datum: kommt aus der Akte
  const ZEILEN = [
    { art: "reaktivierung", name: "Reaktivierung", hinweis: "fällig nach Vertragsabschluss, danach immer im gleichen Abstand. Ob sie etwas kostet, steht in der Preisliste.", dauer: true },
    { art: "theorie", name: "Theorieunterricht", hinweis: "gilt ab dem Abschluss des Unterrichts, bis die Theorieprüfung bestanden ist", dauer: true },
    { art: "theorie", nur: "anzeigen", name: "Praxisprüfung nach bestandener Theorieprüfung", hinweis: "Warnung wie beim Theorieunterricht", fest: "12 Monate", gesetz: "§ 18 FeV" },
    { art: "antrag", name: "Führerscheinantrag", hinweis: "gilt ab dem Antragsdatum. Nach bestandener Theorieprüfung gilt er 12 Monate ab der Prüfung (§ 18 FeV).", dauer: true },
    { art: "fc_zettel", name: "Fahrcheck-Zettel", hinweis: "gültig ab dem Datum der Stunde", dauer: true },
    { art: "behoerde", name: "Theorie-Frist der Behörde", hinweis: "Datum steht in der Akte des Schülers", datum: "Datum aus der Akte" },
    { art: "umschreiber", name: "Umschreiber (Führerschein aus einem Land außerhalb der EU)", hinweis: "darf ab dem Wohnsitz in Deutschland so lange selbst fahren", fest: "6 Monate", gesetz: "§ 29 FeV" },
    { art: "fahrlehrer", name: "Fristen der Fahrlehrer", hinweis: "eigener Führerschein C/D, Schlüsselzahl 95, Fortbildung", datum: "Datum aus der Fahrlehrer-Akte" },
  ];
  const ARTEN = [...new Set(ZEILEN.map((z) => z.art))];
  const FELD = { monate: "Dauer", bald_tage: "Warnung (gelb)", vorwarn_tage: "Vorwarnung (blau)" };
  const EINHEIT = { monate: "Monate", bald_tage: "Tage vorher", vorwarn_tage: "Tage vorher" };

  function stil() {
    if (document.getElementById("esf-stil")) return;
    const s = document.createElement("style");
    s.id = "esf-stil";
    s.textContent = `
[data-esf]{container-type:inline-size;}
.esf-tabelle{display:grid;gap:0;}
.esf-kopf,.esf-zeile{display:grid;grid-template-columns:minmax(0,1fr) 150px 160px 160px 104px;gap:10px 14px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line-soft);}
.esf-kopf{padding:4px 0 8px;font-size:13px;color:var(--muted);font-weight:600;}
.esf-zeile .es-name{font-weight:600;}
.esf-zeile .es-hinweis{font-size:13px;color:var(--muted);line-height:1.35;margin-top:2px;}
.esf-feld{display:flex;align-items:center;gap:6px;min-width:0;}
.esf-feld .esf-label{display:none;}
.esf-feld .esf-label small{display:none;}
.esf-feld input{width:4.2em;min-height:44px;font:inherit;font-size:16px;text-align:right;padding:0 10px;border:1px solid var(--feld);border-radius:var(--r-klein);background:var(--surface);color:var(--txt);}
.esf-feld input:focus-visible{outline:3px solid var(--fokus);outline-offset:1px;}
.esf-feld input[aria-invalid=true]{border-color:var(--rot);border-width:2px;}
.esf-feld input:disabled{background:var(--surface-2);color:var(--muted);}
.esf-feld .es-einheit{font-size:13px;color:var(--muted);}
.esf-leer{color:var(--faint);font-size:14px;}
.esf-fest{font-size:14px;color:var(--muted);}
.esf-fest b{color:var(--txt);font-weight:600;}
.esf-gesetz .es-name{color:var(--muted);}
.esf-par{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:999px;background:var(--surface-2);color:var(--muted);font-size:12px;font-weight:600;}
.esf-aktion{display:flex;justify-content:flex-end;}
.esf-aktion .knopf.klein{min-height:44px;min-width:44px;}
.esf-tabelle .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}
.esf-fehler{grid-column:1/-1;color:var(--rot);font-size:13px;margin:-4px 0 0;}
.esf-geaendert .es-name::after{content:" · geändert";font-weight:400;color:var(--muted);font-size:13px;}
.esf-fuss-text{font-size:13px;color:var(--muted);}
[data-esf] .es-fuss{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding-top:16px;}
.esf-aktion .knopf:disabled{visibility:hidden;}
/* Karten statt Tabelle, sobald der Kasten schmaler ist als die Tabelle braucht (Handy, Tablet mit Seitenleiste) */
@container (max-width:860px){
  .esf-kopf{display:none;}
  .esf-zeile{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 10px;padding:14px 0;align-items:end;}
  .esf-text{grid-column:1/-1;}
  .esf-feld{flex-direction:column;align-items:flex-start;gap:2px;}
  .esf-feld .esf-label{display:block;font-size:12px;color:var(--muted);font-weight:600;line-height:1.25;}
  .esf-feld .esf-label small{display:block;font-weight:400;font-size:12px;}
  .esf-feld .esf-eingabe{display:flex;align-items:center;gap:6px;}
  .esf-feld input{width:4em;}
  .esf-feld .es-einheit{display:none;}
  .esf-aktion{grid-column:1/-1;justify-content:flex-start;}
  .esf-aktion:has(.knopf:disabled),.esf-aktion:empty{display:none;}
  .esf-leer-zelle{display:none;}
}`;
    document.head.appendChild(s);
  }

  // Werte aus den Einstellungen (KE von Werkstatt 11), geprüft wie die Rechenregeln (ungültig = Standard)
  function geladen() { return KR.normFristen(KR.fristenAusKE ? KR.fristenAusKE(window.KE) : null); }
  const gleich = (a, b) => Object.keys(a).every((k) => a[k] === b[k]) && Object.keys(b).every((k) => a[k] === b[k]);
  const istStandard = (art, w) => gleich(w, STD[art]);
  const standardText = (art) => Object.keys(STD[art]).map((f) => `${FELD[f]} ${STD[art][f]}`).join(", ");

  function zelle(z, feld, wert, darf) {
    if (!(feld in STD[z.art]) || z.nur === "anzeigen") return `<div class="esf-leer-zelle"><span class="esf-leer" aria-hidden="true">–</span></div>`;
    const [min, max] = GR[feld];
    const id = `esf-${z.art}-${feld}`;
    return `<label class="esf-feld" for="${id}"><span class="esf-label">${FELD[feld]}<small>${EINHEIT[feld]}</small></span><span class="esf-eingabe es-wert">
      <input id="${id}" data-art="${z.art}" data-feld="${feld}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off"
        value="${wert}" aria-label="${z.name}: ${FELD[feld]} in ${EINHEIT[feld]} (${min} bis ${max})"${darf ? "" : " disabled"}>
      <span class="es-einheit">${EINHEIT[feld]}</span></span></label>`;
  }
  function dauerZelle(z, w, darf) {
    if (z.fest) return `<div class="esf-fest"><b>${z.fest}</b><span class="esf-par" title="gesetzlich festgelegt, nicht änderbar">${z.gesetz}</span></div>`;
    if (z.datum) return `<div class="esf-fest">${z.datum}</div>`;
    return zelle(z, "monate", w.monate, darf);
  }

  const thema = {
    id: "fristen", titel: "Fristen", reihenfolge: 40, rollen: ["leitung", "buero", "superadmin"],
    _el: null, _ctx: null, _stand: null, _laeuft: false,
    render(el, ctx) {
      stil();
      // Der Rahmen zeichnet bei jedem Auffrischen der Daten neu: ungespeicherte Eingaben (auch fehlerhafte) mitnehmen
      let roh = null;
      if (this._el && this._el !== el && this._ctx && this._ctx.darfSchreiben && this._stand && this._el.querySelector("[data-esf]")) {
        const { geaendert, fehler } = this.lesen();
        if (geaendert.length || Object.keys(fehler).length) roh = [...this._el.querySelectorAll("[data-esf] input")].map((i) => [i.id, i.value]);
      }
      this._el = el; this._ctx = ctx || {};
      this._stand = geladen();
      this.zeichne();
      if (roh && this._ctx.darfSchreiben) {
        for (const [id, v] of roh) { const i = el.querySelector("#" + CSS.escape(id)); if (i) i.value = v; }
        this.pruefen();
      }
    },
    zeichne(eingaben) {
      const el = this._el, ctx = this._ctx, darf = !!ctx.darfSchreiben;
      const w = eingaben || this._stand;
      el.innerHTML = `<h2 class="es-abschnitt">Fristen</h2><section data-esf>
        <p class="es-hinweis">Wie lange eine Frist gilt und wann sie in Gelb (bald) oder Blau (demnächst) erscheint, für die ganze Fahrschule. Das gilt im Büro und in der App aller Fahrlehrer. Grau = gesetzlich festgelegt.</p>
        <div class="esf-tabelle" role="table" aria-label="Fristen">
          <div class="esf-kopf" role="row"><span role="columnheader">Frist</span><span role="columnheader">Dauer</span><span role="columnheader">Warnung (gelb)</span><span role="columnheader">Vorwarnung (blau)</span><span role="columnheader"><span class="sr-only">Standard</span></span></div>
          ${ZEILEN.map((z) => {
            const wa = w[z.art], geaendert = !z.nur && !istStandard(z.art, this._stand[z.art]);
            return `<div class="es-zeile esf-zeile${z.gesetz ? " esf-gesetz" : ""}${geaendert ? " esf-geaendert" : ""}" role="row" data-esf-zeile="${z.art}${z.nur ? "-" + z.nur : ""}">
              <div class="esf-text" role="cell"><div class="es-name">${z.name}</div><div class="es-hinweis">${z.hinweis}</div></div>
              <div role="cell">${dauerZelle(z, wa, darf)}</div>
              <div role="cell">${zelle(z, "bald_tage", wa.bald_tage, darf)}</div>
              <div role="cell">${zelle(z, "vorwarn_tage", wa.vorwarn_tage, darf)}</div>
              <div class="esf-aktion" role="cell">${darf && !z.nur ? `<button type="button" class="knopf klein" data-esf-standard="${z.art}" title="Standard: ${standardText(z.art)}"${istStandard(z.art, wa) ? " disabled" : ""}>Standard</button>` : ""}</div>
              ${z.nur ? "" : `<p class="esf-fehler" data-esf-fehler="${z.art}" role="alert" hidden></p>`}
            </div>`;
          }).join("")}
        </div>
        <div class="es-fuss">${darf
          ? `<button type="button" class="btn-primary knopf haupt" data-esf-speichern disabled>Speichern</button><span class="esf-fuss-text" data-esf-status>Nichts geändert.</span>`
          : `<span class="esf-fuss-text">Ändern dürfen Büro, Leitung und Super-Admin.</span>`}</div>
      </section>`;
      if (!darf) return;
      el.querySelectorAll("[data-esf] input").forEach((i) => i.addEventListener("input", () => this.pruefen()));
      el.querySelectorAll("[data-esf-standard]").forEach((b) => b.addEventListener("click", () => {
        const art = b.dataset.esfStandard;
        for (const [f, v] of Object.entries(STD[art])) { const i = el.querySelector(`input[data-art="${art}"][data-feld="${f}"]`); if (i) i.value = v; }
        this.pruefen();
        const erstes = el.querySelector(`input[data-art="${art}"]`); if (erstes) erstes.focus();
      }));
      el.querySelector("[data-esf-speichern]").addEventListener("click", () => this.speichern());
      if (eingaben) this.pruefen();
    },
    // Eingaben lesen und prüfen → { werte, fehler, geaendert: [art] }
    lesen() {
      const el = this._el, werte = {}, fehler = {};
      for (const art of ARTEN) {
        werte[art] = Object.assign({}, this._stand[art]);
        for (const f of Object.keys(STD[art])) {
          const i = el.querySelector(`input[data-art="${art}"][data-feld="${f}"]`);
          if (!i) continue;
          const t = i.value.trim(), [min, max] = GR[f];
          const n = /^[0-9]{1,3}$/.test(t) ? Number(t) : NaN;
          const gut = n >= min && n <= max;
          i.setAttribute("aria-invalid", gut ? "false" : "true");
          if (!gut) { (fehler[art] = fehler[art] || []).push(`${FELD[f]}: bitte eine ganze Zahl von ${min} bis ${max}`); continue; }
          werte[art][f] = n;
        }
        const w = werte[art];
        if (!fehler[art] && w.vorwarn_tage !== undefined && w.vorwarn_tage < w.bald_tage)
          (fehler[art] = fehler[art] || []).push("Die Vorwarnung (blau) kommt vor der Warnung (gelb): bitte gleich viele oder mehr Tage");
      }
      const geaendert = ARTEN.filter((a) => !fehler[a] && !gleich(werte[a], this._stand[a]));
      return { werte, fehler, geaendert };
    },
    pruefen() {
      const el = this._el, { fehler, geaendert, werte } = this.lesen();
      for (const art of ARTEN) {
        const p = el.querySelector(`[data-esf-fehler="${art}"]`);
        if (p) { p.hidden = !fehler[art]; p.textContent = fehler[art] ? fehler[art].join(" · ") : ""; }
        const b = el.querySelector(`[data-esf-standard="${art}"]`);
        if (b) b.disabled = istStandard(art, werte[art]);
      }
      const n = Object.keys(fehler).length, knopf = el.querySelector("[data-esf-speichern]"), status = el.querySelector("[data-esf-status]");
      if (knopf) knopf.disabled = this._laeuft || n > 0 || !geaendert.length;
      if (status) status.textContent = n ? "Bitte die rot markierten Felder prüfen." : geaendert.length ? `${geaendert.length} ${geaendert.length === 1 ? "Frist" : "Fristen"} geändert, noch nicht gespeichert.` : "Nichts geändert.";
      return { fehler, geaendert, werte };
    },
    // Eine Frist schreiben: Standard = Eintrag löschen (zurück auf den eingebauten Wert), sonst das ganze Objekt
    async schreibe(art, wert) {
      const ke = window.KE, ctx = this._ctx, schluessel = "fristen." + art;
      const r = istStandard(art, wert) ? await ke.zuruecksetzen(ctx.sb, ctx.fahrschuleId, schluessel) : await ke.setze(ctx.sb, ctx.fahrschuleId, schluessel, Object.assign({}, wert));
      if (r && r.error) throw new Error(r.error.message || "Speichern ging nicht");
    },
    async speichern() {
      const { fehler, geaendert, werte } = this.pruefen();
      if (this._laeuft || Object.keys(fehler).length || !geaendert.length) return;
      const vorher = this._stand, ctx = this._ctx;
      this._laeuft = true; this.pruefen();
      const geschrieben = [];
      try {
        for (const art of geaendert) { await this.schreibe(art, werte[art]); geschrieben.push(art); }
      } catch (e) {
        this._laeuft = false;
        // Teilweise gespeichert: das Gespeicherte gilt, der Rest bleibt als Eingabe stehen
        const stand = Object.assign({}, vorher); for (const a of geschrieben) stand[a] = werte[a];
        this.uebernehmen(stand, vorher);
        this.zeichne(werte);
        melde(ctx, "Speichern ging nicht" + (geschrieben.length ? " (nur ein Teil ist gespeichert)" : "") + ": " + (e && e.message ? e.message : "Fehler") + ". Bitte noch einmal.", "fehler");
        return;
      }
      this._laeuft = false;
      const neu = Object.assign({}, vorher); for (const a of geaendert) neu[a] = werte[a];
      this.uebernehmen(neu, vorher);
      this.zeichne();
      const text = geaendert.length === 1 ? `Frist „${ZEILEN.find((z) => z.art === geaendert[0]).name}“ gespeichert` : `${geaendert.length} Fristen gespeichert`;
      const zurueck = async () => {
        for (const art of geaendert) await this.schreibe(art, vorher[art]);
        const jetzt = Object.assign({}, this._stand); for (const a of geaendert) jetzt[a] = vorher[a];
        this.uebernehmen(jetzt, this._stand);
        if (this._el && this._el.isConnected) this.zeichne();
        melde(ctx, "Fristen wie vorher", "ok");
      };
      if (typeof window.toastUndo === "function") window.toastUndo(text, zurueck);
      else melde(ctx, text, "ok");
    },
    // Neue Werte gelten sofort im ganzen Büro; die Monate der Reaktivierung zusätzlich vom Server holen und vergleichen
    uebernehmen(neu, vorher) {
      this._stand = KR.normFristen(neu);
      KR.setzeFristen(this._stand);
      if (vorher && neu.reaktivierung && vorher.reaktivierung && neu.reaktivierung.monate !== vorher.reaktivierung.monate) this.serverPruefen(this._stand.reaktivierung.monate);
      try { window.dispatchEvent(new CustomEvent("fristen:geaendert")); } catch (e) { /* nur Hinweis */ }
    },
    async serverPruefen(soll) {
      if (typeof window.ladeReaktRegelNeu !== "function") return;
      try { await window.ladeReaktRegelNeu(); } catch (e) { return; }
      const ist = KR.reaktMonate();
      if (KR.holeReaktRegel() && ist !== soll) melde(this._ctx, `Achtung: Die Datenbank rechnet die Reaktivierung noch mit ${ist} Monaten. Das Datenbank-Update fehlt noch, bitte Bescheid geben.`, "warnung");
    },
    verlassen() {
      if (!this._el || !this._el.isConnected || !this._ctx || !this._ctx.darfSchreiben || !this._el.querySelector("[data-esf]")) return true;
      const { geaendert, fehler } = this.lesen();
      return !geaendert.length && !Object.keys(fehler).length;
    },
    // „Änderungen verwerfen?“ → Ja: Eingaben weg, gespeicherter Stand (auch beim nächsten Neuzeichnen)
    verwerfen() { if (this._el && this._el.querySelector("[data-esf]")) this.zeichne(); },
  };
  function melde(ctx, text, art) {
    if (ctx && typeof ctx.meldung === "function") ctx.meldung(text, art);
    else if (typeof window.toast === "function") window.toast(text, art === "fehler");
  }
  (window.BUERO_EINSTELLUNGEN_THEMEN = window.BUERO_EINSTELLUNGEN_THEMEN || []).push(thema);
  // Einstellungen geladen (KE, auch nach einem Wechsel der Fahrschule): Fristen übernehmen, bei einer Änderung neu zeichnen
  // Beim eigenen Speichern kommt das Ereignis je Frist: dann zeichnet speichern() selbst am Ende.
  const ausKE = () => {
    const vorher = JSON.stringify(KR.holeFristen()), neu = KR.setzeFristen(KR.fristenAusKE(window.KE));
    if (!thema._laeuft && JSON.stringify(neu) !== vorher && typeof window.zeichne === "function" && typeof S !== "undefined" && S.geladenAm) window.zeichne();
  };
  window.addEventListener("ke:geladen", ausKE);
  if (window.KE) ausKE(); // KE kann schon geladen haben, bevor diese Datei läuft (dann kam das Ereignis zu früh)
})();
