/* W15 Schritt 6 / PR 3 (🗣 Serband 24.11.2026): Thema „Nachrichten-Vorlagen“ in den Einstellungen (Büro, Leitung, Super-Admin).
   „vorgefertigte Nachrichten … diese kann man vorschreiben in den Einstellungen … der Einstellungsbereich darf nicht
   unübersichtlich sein … unterteilt in Themen.“
   Aufbau: Liste der 9 Vorlagen in zwei Gruppen (Zahlungen, Erinnerungen an Fristen), eine Vorlage ist aufgeklappt. Dort zwei
   Texte (an den Schüler, an die Eltern), Knöpfe für die Platzhalter, Vorschau wie der Anfang der Mail, Knopf „Standard“.
   Speichern wie bei „Fristen“: ein Knopf unten, danach „Rückgängig“ (kein Bestätigen-Fenster).
   Texte und Regeln: kompass-vorlagen.js (window.KV), Ablage: KE (kompass-einstellungen.js), Schlüssel „vorlagen.<art>“,
   Wert { text, text_eltern }. Nur was vom Standard abweicht, steht in der Datenbank; wieder genau der Standard = Zeile weg.
   Nutzertext kommt nur über textContent in die Seite (nie als HTML). */
(function () {
  "use strict";
  const KV = window.KV, KE = window.KE;
  if (!KV || !KV.VORLAGEN || !KE) return; // alte Dateien: Thema erst nach dem Neuladen
  const GRUPPEN = [
    { id: "zahlungen", titel: "Zahlungen", arten: ["pruefung", "reaktivierung_bald", "reaktivierung", "zahlung_offen"] },
    { id: "erinnerungen", titel: "Erinnerungen an Fristen", arten: KV.ARTEN.filter((a) => /^erinnerung_/.test(a)) },
  ];
  const ARTEN = GRUPPEN.flatMap((g) => g.arten).filter((a) => KV.VORLAGEN[a]);
  // Zeile mit dem Datum, die bei Erinnerungen automatisch unter dem Satz steht (wie supabase/functions/erinnerungs-mail/mail.js)
  const FRIST_TEXT = {
    erinnerung_theorie: "Theorieunterricht gilt bis", erinnerung_praxis: "Praktische Prüfung bestehen bis", erinnerung_antrag: "Antrag gilt bis",
    erinnerung_behoerde: "Theorieprüfung bestehen bis", erinnerung_umschreiber: "Ausländischer Führerschein gilt bis",
  };
  const FELDER = [
    { feld: "text", name: "Text an den Schüler", an: "schueler" },
    { feld: "text_eltern", name: "Text an die Eltern (wenn Eltern mitlesen)", an: "eltern", hinweis: "Hier steht {Vorname} für den Namen des Schülers." },
  ];

  function stil() {
    if (document.getElementById("esv-stil")) return;
    const s = document.createElement("style");
    s.id = "esv-stil";
    s.textContent = `
[data-esv]{min-width:0;}
h3.esv-gruppe{font-size:20px;margin:24px 0 4px;padding:0;}
.esv-liste{list-style:none;margin:0;padding:0;border-top:1px solid var(--line-soft);}
.esv-eintrag{border-bottom:1px solid var(--line-soft);min-width:0;}
.esv-ueb{margin:0;font:inherit;}
.esv-kopf{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;min-height:60px;padding:10px 0;border:0;background:transparent;color:var(--txt);font:inherit;text-align:left;cursor:pointer;border-radius:var(--r-klein);}
.esv-kopf:focus-visible{outline:3px solid var(--fokus);outline-offset:2px;}
.esv-text{flex:1 1 auto;min-width:0;display:block;}
.esv-titel{display:block;font-size:18px;font-weight:600;line-height:1.3;overflow-wrap:anywhere;}
.esv-wann{display:block;font-size:14px;color:var(--muted);line-height:1.35;margin-top:2px;}
.esv-marken{flex:0 0 auto;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px;max-width:45%;}
.esv-marke{display:inline-block;padding:2px 10px;border-radius:999px;background:var(--surface-2);color:var(--muted);font-size:12px;font-weight:700;white-space:nowrap;}
.esv-marke.neu{background:var(--gelb-soft);color:var(--txt);}
.esv-marke.fehler{background:var(--rot-soft);color:var(--rot);}
.esv-pfeil{flex:0 0 auto;color:var(--muted);transition:transform .18s cubic-bezier(.2,.8,.2,1);}
.esv-kopf[aria-expanded=true] .esv-pfeil{transform:rotate(90deg);}
.esv-editor{padding:2px 0 20px;min-width:0;}
.esv-label{display:block;font-weight:600;margin:16px 0 4px;}
.esv-hilfe{font-size:14px;color:var(--muted);line-height:1.35;margin:0 0 6px;}
.esv-feld{display:block;width:100%;box-sizing:border-box;min-height:132px;padding:10px 12px;font:inherit;font-size:16px;line-height:1.45;border:1px solid var(--feld);border-radius:var(--r-klein);background:var(--surface);color:var(--txt);resize:vertical;}
.esv-feld:focus-visible{outline:3px solid var(--fokus);outline-offset:1px;}
.esv-feld[aria-invalid=true]{border-color:var(--rot);border-width:2px;}
.esv-feld:disabled{background:var(--surface-2);color:var(--muted);resize:none;}
.esv-zaehler{font-size:13px;color:var(--muted);text-align:right;margin:2px 0 0;}
.esv-fehler{color:var(--rot);font-size:14px;line-height:1.35;margin:4px 0 0;font-weight:600;}
.esv-fehler[hidden],.esv-warn[hidden]{display:none;}
.esv-warn{font-size:14px;line-height:1.35;margin:6px 0 0;padding:6px 10px;border-left:4px solid var(--gelb);background:var(--gelb-soft);color:var(--txt);border-radius:0 var(--r-klein) var(--r-klein) 0;}
.esv-warn div+div{margin-top:2px;}
.esv-platz{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:16px 0 0;}
.esv-platz-name{font-size:14px;color:var(--muted);flex:0 0 100%;}
.esv-platz button{min-height:44px;min-width:44px;padding:0 14px;border:1px solid var(--feld);border-radius:var(--r-klein);background:var(--surface);color:var(--txt);font:inherit;font-size:15px;cursor:pointer;}
.esv-platz button:focus-visible,.esv-schalter button:focus-visible{outline:3px solid var(--fokus);outline-offset:2px;}
.esv-vorschau-kopf{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:20px 0 8px;}
.esv-vorschau-kopf b{font-size:16px;}
.esv-schalter{display:flex;flex-wrap:wrap;gap:6px;}
.esv-schalter button{min-height:44px;padding:0 14px;border:1px solid var(--feld);border-radius:var(--r-klein);background:var(--surface);color:var(--txt);font:inherit;font-size:15px;cursor:pointer;}
.esv-schalter button[aria-pressed=true]{background:var(--surface-2);border:2px solid var(--fokus);font-weight:700;}
.esv-mail{border:1px solid var(--line);border-radius:var(--r-klein);background:var(--bg);padding:14px 16px;overflow-wrap:anywhere;word-break:break-word;}
.esv-mail p{margin:0;}
.esv-mail p+p{margin-top:12px;}
.esv-mail .esv-satz{white-space:pre-line;}
.esv-auto{color:var(--muted);font-size:14px;border-top:1px dashed var(--line);padding-top:8px;}
.esv-unten{display:flex;flex-wrap:wrap;gap:8px 12px;margin-top:14px;align-items:center;}
.esv-unten .knopf{min-height:44px;min-width:44px;}
.esv-unten .knopf:disabled{opacity:.5;}
[data-esv] .es-fuss{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:10px 14px;padding-top:18px;}
.esv-fuss-text{font-size:13px;color:var(--muted);}
@media (max-width:520px){.esv-kopf{flex-wrap:wrap;}.esv-text{flex:1 1 0;}.esv-pfeil{order:1;}.esv-marken{order:2;flex:1 0 100%;max-width:none;justify-content:flex-start;}.esv-marken:empty{display:none;}.esv-titel{font-size:17px;}}`;
    document.head.appendChild(s);
  }

  const norm = (t) => KV.saeubere(t);
  const std = (art) => ({ text: KV.VORLAGEN[art].text, text_eltern: KV.VORLAGEN[art].text_eltern });
  const gleichVl = (a, b) => norm(a.text) === norm(b.text) && norm(a.text_eltern) === norm(b.text_eltern);
  const istStandard = (art, v) => gleichVl(v, std(art));
  const chevron = '<svg class="esv-pfeil" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  function el(tag, klasse, text) { const e = document.createElement(tag); if (klasse) e.className = klasse; if (text != null) e.textContent = text; return e; }

  // Gespeicherter Stand aus den Einstellungen (leer oder fehlend = Standard)
  function ladeStand() {
    const s = {};
    for (const art of ARTEN) s[art] = KV.vorlageAus(art, KE.wert("vorlagen." + art, {}));
    return s;
  }
  // Beispielwerte, aber nur die, die in dieser Mail wirklich einen Wert haben (wie auf dem Server)
  function beispielFuer(art) {
    const erlaubt = KV.VORLAGEN[art].platzhalter, w = {};
    for (const k of Object.keys(KV.BEISPIEL)) if (erlaubt.includes(k)) w[k] = KV.BEISPIEL[k];
    return w;
  }
  function vorschau(art, an, text) {
    const satz = KV.fuelle(text, beispielFuer(art));
    const anrede = an === "eltern" ? "Guten Tag," : "Hallo " + KV.BEISPIEL.Vorname + ",";
    const auto = /^erinnerung_/.test(art)
      ? (FRIST_TEXT[art] || "Frist") + ": " + KV.datumText(KV.BEISPIEL.Datum) + ". Das steht danach automatisch in der Mail."
      : "Danach folgen automatisch Betrag, Konto und QR-Code zum Bezahlen.";
    return { anrede, satz, auto };
  }

  const thema = {
    id: "vorlagen", titel: "Nachrichten-Vorlagen", reihenfolge: 50, rollen: ["leitung", "buero", "superadmin"],
    _el: null, _ctx: null, _stand: null, _ent: {}, _fs: undefined, _offen: null, _an: "schueler", _letztes: "text", _fokus: null, _laeuft: false,
    render(el0, ctx) {
      stil();
      this._el = el0; this._ctx = ctx || {};
      if (this._fs !== this._ctx.fahrschuleId) { this._ent = {}; this._offen = null; this._fokus = null; this._fs = this._ctx.fahrschuleId; } // Entwürfe gehören zu einer Fahrschule
      this._stand = ladeStand();
      this.zeichne();
    },
    // aktueller Text eines Feldes: Entwurf, sonst gespeicherter Stand
    wert(art) { return Object.assign({}, this._stand[art], this._ent[art] || {}); },
    geaendertArten() { return ARTEN.filter((a) => this._ent[a] && !gleichVl(this._ent[a], this._stand[a])); },
    pruefAlle() {
      const fehler = {}, hinweise = {};
      for (const art of ARTEN) {
        if (!this._ent[art]) continue;
        const w = this.wert(art), f = [], h = [];
        for (const fd of FELDER) { const p = KV.pruefe(w[fd.feld], art); if (!p.ok) f.push(...p.fehler.map((x) => fd.an === "eltern" ? "Text an die Eltern: " + x : "Text an den Schüler: " + x)); h.push(...p.hinweise); }
        if (f.length) fehler[art] = f;
        if (h.length) hinweise[art] = h;
      }
      return { fehler, hinweise };
    },
    zeichne() {
      const root = this._el, ctx = this._ctx, darf = !!ctx.darfSchreiben;
      root.textContent = "";
      const h2 = el("h2", "es-abschnitt es-doppelt", "Nachrichten-Vorlagen"); // Themenname steht schon oben (Rahmen), auch nach eigenem Neuzeichnen
      const sec = el("section"); sec.setAttribute("data-esv", "");
      sec.appendChild(el("p", "es-hinweis", "Die Texte der Mails an Schüler und Eltern. Tippe auf eine Vorlage, um sie zu ändern. Betrag, Konto und Datum hängen wir bei Bedarf automatisch an."));
      for (const g of GRUPPEN) {
        if (!g.arten.length) continue;
        const gh = el("h3", "es-abschnitt esv-gruppe", g.titel); gh.setAttribute("data-esv-gruppe", g.id);
        const ul = el("ul", "esv-liste"); ul.setAttribute("data-esv-liste", g.id);
        for (const art of g.arten) if (KV.VORLAGEN[art]) ul.appendChild(this.eintrag(art, darf));
        sec.append(gh, ul);
      }
      const fuss = el("div", "es-fuss");
      if (darf) {
        const b = el("button", "btn-primary knopf haupt", "Speichern"); b.type = "button"; b.disabled = true; b.setAttribute("data-esv-speichern", "");
        const st = el("span", "esv-fuss-text", "Nichts geändert."); st.setAttribute("data-esv-status", ""); st.setAttribute("role", "status");
        fuss.append(b, st);
        b.addEventListener("click", () => this.speichern());
      } else fuss.appendChild(el("span", "esv-fuss-text", "Ändern dürfen Büro, Leitung und Super-Admin."));
      sec.appendChild(fuss);
      root.append(h2, sec);
      sec.querySelectorAll("[data-esv-kopf]").forEach((b) => b.addEventListener("click", () => this.umschalten(b.dataset.esvKopf)));
      if (this._offen) this.binde(sec, this._offen, darf);
      this.aktualisiere();
      // Fokus und Cursor überstehen das Neuzeichnen (sonst klappt die Tastatur am Handy zu)
      const f = this._fokus;
      if (f && (!document.activeElement || document.activeElement === document.body)) {
        const ziel = f.feld ? root.querySelector(`[data-esv-feld="${f.feld}"]`) : root.querySelector(`[data-esv-kopf="${f.kopf}"]`);
        if (ziel && !ziel.disabled) { ziel.focus({ preventScroll: true }); if (f.a != null) try { ziel.setSelectionRange(f.a, f.b); } catch (e) { /* Feld ohne Cursor */ } }
      }
    },
    eintrag(art, darf) {
      const v = KV.VORLAGEN[art], offen = this._offen === art;
      const li = el("li", "esv-eintrag"); li.setAttribute("data-esv-art", art);
      const h4 = el("h4", "esv-ueb");
      const k = el("button", "esv-kopf"); k.type = "button"; k.setAttribute("data-esv-kopf", art);
      k.setAttribute("aria-expanded", offen ? "true" : "false"); k.setAttribute("aria-controls", "esv-ed-" + art);
      const t = el("span", "esv-text"); t.append(el("span", "esv-titel", v.titel), el("span", "esv-wann", v.wann));
      const m = el("span", "esv-marken"); m.setAttribute("data-esv-marken", art);
      k.append(t, m); k.insertAdjacentHTML("beforeend", chevron);
      h4.appendChild(k); li.appendChild(h4);
      if (offen) li.appendChild(this.editor(art, darf));
      return li;
    },
    editor(art, darf) {
      const v = KV.VORLAGEN[art], w = this.wert(art);
      const ed = el("div", "esv-editor"); ed.id = "esv-ed-" + art; ed.setAttribute("role", "group"); ed.setAttribute("aria-label", v.titel);
      for (const fd of FELDER) {
        const id = `esv-${art}-${fd.feld}`;
        const lb = el("label", "esv-label", fd.name); lb.htmlFor = id;
        ed.appendChild(lb);
        if (fd.hinweis) ed.appendChild(el("p", "esv-hilfe", fd.hinweis));
        const ta = el("textarea", "esv-feld"); ta.id = id; ta.rows = 5; ta.value = w[fd.feld]; ta.autocomplete = "off"; ta.spellcheck = true;
        ta.setAttribute("data-esv-feld", fd.feld); ta.setAttribute("data-art", art); ta.setAttribute("aria-describedby", id + "-meld");
        if (!darf) ta.disabled = true;
        const zaehler = el("p", "esv-zaehler"); zaehler.setAttribute("data-esv-zaehler", fd.feld);
        const meld = el("div"); meld.id = id + "-meld";
        const fe = el("p", "esv-fehler"); fe.setAttribute("data-esv-fehler", fd.feld); fe.setAttribute("role", "alert"); fe.hidden = true;
        const wa = el("div", "esv-warn"); wa.setAttribute("data-esv-warn", fd.feld); wa.hidden = true;
        meld.append(fe, wa);
        ed.append(ta, zaehler, meld);
      }
      if (darf) {
        const pl = el("div", "esv-platz"); pl.setAttribute("role", "group"); pl.setAttribute("aria-label", "Platzhalter einfügen");
        pl.appendChild(el("span", "esv-platz-name", "Platzhalter einfügen (wird beim Versenden durch den echten Wert ersetzt):"));
        for (const p of v.platzhalter) {
          const b = el("button", null, "{" + p + "}"); b.type = "button"; b.setAttribute("data-esv-platz", p); b.setAttribute("aria-label", "Platzhalter " + p + " einfügen");
          pl.appendChild(b);
        }
        ed.appendChild(pl);
      }
      const kopf = el("div", "esv-vorschau-kopf"); kopf.appendChild(el("b", null, "So sieht der Anfang der Mail aus"));
      const sw = el("div", "esv-schalter"); sw.setAttribute("role", "group"); sw.setAttribute("aria-label", "Vorschau für");
      for (const [an, name] of [["schueler", "An den Schüler"], ["eltern", "An die Eltern"]]) {
        const b = el("button", null, name); b.type = "button"; b.setAttribute("data-esv-an", an); b.setAttribute("aria-pressed", String(this._an === an)); sw.appendChild(b);
      }
      kopf.appendChild(sw);
      const mail = el("div", "esv-mail"); mail.setAttribute("data-esv-vorschau", ""); mail.setAttribute("aria-live", "polite");
      mail.append(el("p", "esv-anrede"), el("p", "esv-satz"), el("p", "esv-auto"));
      ed.append(kopf, mail);
      if (darf) {
        const un = el("div", "esv-unten");
        const sb = el("button", "knopf klein", "Standard"); sb.type = "button"; sb.setAttribute("data-esv-standard", art); sb.title = "Beide Texte zurück auf den Standard (Speichern nicht vergessen)";
        un.appendChild(sb); ed.appendChild(un);
      }
      return ed;
    },
    binde(sec, art, darf) {
      const ed = sec.querySelector("#esv-ed-" + art); if (!ed) return;
      const merke = (ev) => { const t = ev.target; if (t && t.dataset && t.dataset.esvFeld && ed.contains(t)) { this._letztes = t.dataset.esvFeld; this._fokus = { feld: t.dataset.esvFeld, a: t.selectionStart, b: t.selectionEnd }; } };
      ["focusin", "input", "keyup", "click", "select"].forEach((e) => ed.addEventListener(e, merke));
      ed.addEventListener("focusin", (ev) => { const t = ev.target; if (t && t.dataset && t.dataset.esvFeld) { this._an = t.dataset.esvFeld === "text_eltern" ? "eltern" : "schueler"; this.zeigeVorschau(); } });
      ed.addEventListener("focusout", () => setTimeout(() => { if (this._el && this._el.isConnected && !this._el.contains(document.activeElement) && this._fokus && this._fokus.feld) this._fokus = null; }, 0));
      ed.querySelectorAll("[data-esv-an]").forEach((b) => b.addEventListener("click", () => { this._an = b.dataset.esvAn; this.zeigeVorschau(); }));
      if (!darf) return;
      ed.querySelectorAll("textarea[data-esv-feld]").forEach((ta) => ta.addEventListener("input", () => {
        const d = this._ent[art] = Object.assign({}, this.wert(art), this._ent[art] || {});
        d[ta.dataset.esvFeld] = ta.value;
        this.aktualisiere();
      }));
      ed.querySelectorAll("[data-esv-platz]").forEach((b) => {
        b.addEventListener("pointerdown", (e) => e.preventDefault()); // Fokus bleibt im Textfeld (Tastatur bleibt offen)
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", () => this.einfuegen(ed, "{" + b.dataset.esvPlatz + "}"));
      });
      const sb = ed.querySelector("[data-esv-standard]");
      if (sb) sb.addEventListener("click", () => {
        const s = std(art);
        this._ent[art] = Object.assign({}, s);
        for (const fd of FELDER) { const ta = ed.querySelector(`[data-esv-feld="${fd.feld}"]`); if (ta) ta.value = s[fd.feld]; }
        this.aktualisiere();
        const ta = ed.querySelector('[data-esv-feld="text"]'); if (ta) ta.focus({ preventScroll: true });
      });
    },
    einfuegen(ed, text) {
      const ta = ed.querySelector(`[data-esv-feld="${this._letztes}"]`) || ed.querySelector("[data-esv-feld]");
      if (!ta || ta.disabled) return;
      const a = ta.selectionStart == null ? ta.value.length : ta.selectionStart, b = ta.selectionEnd == null ? a : ta.selectionEnd;
      ta.setRangeText(text, a, b, "end");
      ta.focus({ preventScroll: true });
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    },
    umschalten(art) {
      this._offen = this._offen === art ? null : art;
      this._fokus = { kopf: art };
      this.zeichne();
      const k = this._el.querySelector(`[data-esv-kopf="${art}"]`);
      if (k) { k.focus({ preventScroll: true }); try { k.scrollIntoView({ block: "nearest" }); } catch (e) { /* alter Browser */ } }
      this._fokus = null;
    },
    zeigeVorschau() {
      const art = this._offen, root = this._el; if (!art || !root) return;
      const box = root.querySelector("[data-esv-vorschau]"); if (!box) return;
      const w = this.wert(art), an = this._an === "eltern" ? "eltern" : "schueler";
      const v = vorschau(art, an, an === "eltern" ? w.text_eltern : w.text);
      box.querySelector(".esv-anrede").textContent = v.anrede;
      box.querySelector(".esv-satz").textContent = v.satz;
      box.querySelector(".esv-auto").textContent = v.auto;
      root.querySelectorAll("[data-esv-an]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.esvAn === an)));
    },
    // Alles, was vom Eingabestand abhängt: Meldungen, Zähler, Marken, Vorschau, Speichern-Knopf
    aktualisiere() {
      const root = this._el; if (!root) return;
      const { fehler, hinweise } = this.pruefAlle(), geaendert = this.geaendertArten();
      const art = this._offen;
      if (art) {
        const w = this.wert(art);
        for (const fd of FELDER) {
          const ta = root.querySelector(`[data-esv-feld="${fd.feld}"]`); if (!ta) continue;
          const p = KV.pruefe(ta.value, art), fe = root.querySelector(`[data-esv-fehler="${fd.feld}"]`), wa = root.querySelector(`[data-esv-warn="${fd.feld}"]`);
          const roh = Array.from(ta.value.replace(/\r\n?/g, "\n")).length;
          ta.setAttribute("aria-invalid", p.ok ? "false" : "true");
          fe.hidden = p.ok; fe.textContent = p.ok ? "" : p.fehler.join(" ");
          wa.hidden = !p.hinweise.length; wa.textContent = "";
          p.hinweise.forEach((h) => wa.appendChild(el("div", null, h)));
          const z = root.querySelector(`[data-esv-zaehler="${fd.feld}"]`); if (z) z.textContent = roh + " von " + KV.MAX_ZEICHEN + " Zeichen";
        }
        const sb = root.querySelector("[data-esv-standard]"); if (sb) sb.disabled = istStandard(art, w);
        this.zeigeVorschau();
      }
      for (const a of ARTEN) {
        const m = root.querySelector(`[data-esv-marken="${a}"]`); if (!m) continue;
        m.textContent = "";
        const gespeichert = !istStandard(a, this._stand[a]);
        if (fehler[a]) m.appendChild(el("span", "esv-marke fehler", "Fehler"));
        else if (geaendert.includes(a)) m.appendChild(el("span", "esv-marke neu", "nicht gespeichert"));
        else if (gespeichert) m.appendChild(el("span", "esv-marke", "geändert"));
      }
      const knopf = root.querySelector("[data-esv-speichern]"), status = root.querySelector("[data-esv-status]");
      const nf = Object.keys(fehler).length;
      if (knopf) knopf.disabled = this._laeuft || nf > 0 || !geaendert.length;
      if (status) status.textContent = nf ? "Bitte die Fehler prüfen." : geaendert.length ? `${geaendert.length} ${geaendert.length === 1 ? "Vorlage" : "Vorlagen"} geändert, noch nicht gespeichert.` : "Nichts geändert.";
      return { fehler, geaendert };
    },
    // Eine Vorlage schreiben: wieder genau der Standard = Zeile löschen, sonst { text, text_eltern }
    async schreibe(art, wert, ctx) {
      const schluessel = "vorlagen." + art, s = std(art), obj = {};
      for (const k of ["text", "text_eltern"]) if (norm(wert[k]) !== norm(s[k])) obj[k] = norm(wert[k]); // gleich dem Standard = weglassen
      if (!Object.keys(obj).length) await KE.zuruecksetzen(ctx.sb, ctx.fahrschuleId, schluessel);
      else await KE.setze(ctx.sb, ctx.fahrschuleId, schluessel, obj);
    },
    gleicheSchule(ctx) { return !!(this._ctx && ctx && this._ctx.fahrschuleId === ctx.fahrschuleId); },
    async speichern() {
      const { fehler, geaendert } = this.aktualisiere();
      if (this._laeuft || Object.keys(fehler).length || !geaendert.length) return;
      const ctx = this._ctx, vorher = this._stand, werte = {};
      for (const a of geaendert) werte[a] = this.wert(a);
      this._laeuft = true; this.aktualisiere();
      const geschrieben = [];
      try {
        for (const a of geaendert) { await this.schreibe(a, werte[a], ctx); geschrieben.push(a); }
      } catch (e) {
        this._laeuft = false;
        if (!this.gleicheSchule(ctx)) { melde(this._ctx, "Speichern in der vorigen Fahrschule ging nicht: " + (e && e.message ? e.message : "Fehler") + ".", "fehler"); return; }
        for (const a of geschrieben) delete this._ent[a]; // Gespeichertes gilt, der Rest bleibt als Eingabe stehen
        this._stand = ladeStand();
        this.zeichne();
        melde(ctx, "Speichern ging nicht" + (geschrieben.length ? " (nur ein Teil ist gespeichert)" : "") + ": " + (e && e.message ? e.message : "Fehler") + ". Bitte noch einmal.", "fehler");
        return;
      }
      this._laeuft = false;
      if (!this.gleicheSchule(ctx)) { melde(this._ctx, "Vorlagen der vorigen Fahrschule gespeichert.", "ok"); return; } // Entwürfe gehören schon der neuen Fahrschule
      for (const a of geaendert) delete this._ent[a];
      this._stand = ladeStand();
      if (this._el && this._el.isConnected) this.zeichne();
      const text = geaendert.length === 1 ? `Vorlage „${KV.VORLAGEN[geaendert[0]].titel}“ gespeichert` : `${geaendert.length} Vorlagen gespeichert`;
      const zurueck = async () => {
        for (const a of geaendert) await this.schreibe(a, vorher[a], ctx); // in die Fahrschule, in der gespeichert wurde
        if (!this.gleicheSchule(ctx)) { melde(this._ctx, "Vorlagen der vorigen Fahrschule wie vorher.", "ok"); return; }
        this._stand = ladeStand();
        if (this._el && this._el.isConnected) this.zeichne();
        melde(this._ctx, "Vorlagen wie vorher", "ok");
      };
      if (typeof window.toastUndo === "function") window.toastUndo(text, zurueck);
      else melde(ctx, text, "ok");
    },
    verlassen() {
      if (!this._el || !this._el.isConnected || !this._ctx || !this._ctx.darfSchreiben) return true;
      return !this.geaendertArten().length;
    },
    verwerfen() { this._ent = {}; },
    // Einstellungen neu geladen (andere Person hat gespeichert, Fahrschulwechsel): Stand übernehmen, ohne Eingabe neu zeichnen
    geladen() {
      if (this._laeuft || !this._el || !this._el.isConnected || !this._ctx) return;
      const neu = ladeStand();
      if (JSON.stringify(neu) === JSON.stringify(this._stand)) return;
      this._stand = neu;
      if (Object.keys(this._ent).length) this.aktualisiere(); // Eingabe nicht antasten, nur Marken und Knopf
      else this.zeichne();
    },
  };
  function melde(ctx, text, art) {
    if (ctx && typeof ctx.meldung === "function") ctx.meldung(text, art);
    else if (typeof window.toast === "function") window.toast(text, art === "fehler");
  }
  (window.BUERO_EINSTELLUNGEN_THEMEN = window.BUERO_EINSTELLUNGEN_THEMEN || []).push(thema);
  window.addEventListener("ke:geladen", () => { try { thema.geladen(); } catch (e) { console.error(e); } });
})();
