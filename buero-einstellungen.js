/* Büro-Einstellungen nach Themen (Werkstatt 11 Schritt 2, 🗣 Serband)
   Seite #einstellungen: links die Themen, rechts die Felder als Zeilen. Der Rahmen liegt hier, die Themen kommen aus der Warteliste:

     window.BUERO_EINSTELLUNGEN_THEMEN.push({ id, titel, reihenfolge, rollen?: ['leitung','buero','superadmin'],
                                              render(el, ctx), verlassen?() , verwerfen?() })

   - Die Liste darf vor oder nach dem Laden dieser Datei gefüllt werden. Gleiche id: der spätere Eintrag ersetzt den früheren.
   - ctx = { sb, fahrschuleId, rolle, darfSchreiben, meldung(text, art) }, art = 'ok' | 'fehler' | 'info'.
   - rolle: 'leitung' = fahrschule_admin, 'buero' = buero, 'superadmin' = super_admin.
   - render zeichnet bei jedem Neuzeichnen neu (z. B. nach dem Auffrischen der Daten). Wer Eingaben hat, merkt sie sich selbst.
   - verlassen() gibt false zurück, wenn noch ungespeicherte Eingaben da sind: dann kommt die Rückfrage „Änderungen verwerfen?“.
     Nach „Ja“ wird verwerfen() (falls vorhanden) aufgerufen.
   - CSS-Klassen (buero.css): .es-abschnitt, .es-zeile (.es-name, .es-hinweis, .es-wert, .es-einheit), .es-fuss, .es-neu, .es-leer, .es-text.
   Speichern bleibt dort, wo es vorher war (fahrschulen.konfiguration, fahrschule_zahlungsdaten). */
(function () {
  "use strict";
  const W = window;
  if (!Array.isArray(W.BUERO_EINSTELLUNGEN_THEMEN)) W.BUERO_EINSTELLUNGEN_THEMEN = [];
  const LISTE = W.BUERO_EINSTELLUNGEN_THEMEN;
  const ROLLEN_KURZ = { fahrschule_admin: "leitung", buero: "buero", super_admin: "superadmin" };
  const Z = { id: null, el: null, key: undefined, frei: false, entwurf: {}, melde: null };

  const meineRolle = () => ROLLEN_KURZ[S.profil && S.profil.rolle] || "";
  const darfSeite = () => !!meineRolle();
  const istSuper = () => !!(S.profil && S.profil.rolle === "super_admin");
  const schmal = () => W.matchMedia && W.matchMedia("(max-width:900px)").matches;
  const hashThema = () => { const m = location.hash.match(/[?&]thema=([a-z0-9_-]*)/i); return m ? m[1] : ""; };
  const themaHash = (id) => "#einstellungen" + (id ? "?thema=" + id : "");

  // Wartelistenpunkt, den noch niemand angemeldet hat, wird hier eingetragen (ein späterer Eintrag mit gleicher id ersetzt ihn)
  function themen() {
    const rolle = meineRolle(), karte = new Map();
    LISTE.forEach((t) => { if (t && t.id && typeof t.render === "function") karte.set(t.id, t); });
    return [...karte.values()].filter((t) => !Array.isArray(t.rollen) || t.rollen.includes(rolle))
      .sort((a, b) => (Number(a.reihenfolge) || 0) - (Number(b.reihenfolge) || 0));
  }

  /* ---------- Hinweiszeile ---------- */
  function meldung(text, art) {
    const m = document.getElementById("esMeldung");
    if (!m) return;
    clearTimeout(Z.melde);
    m.className = "es-meldung " + (["ok", "fehler", "info"].includes(art) ? art : "info");
    m.textContent = text || "";
    m.hidden = !text;
    if (text && art === "ok") Z.melde = setTimeout(() => { m.hidden = true; }, 5000);
  }
  function kontext() {
    return { sb: supa, fahrschuleId: S.fsId, rolle: meineRolle(), darfSchreiben: darfSeite(), meldung };
  }

  /* ---------- Bausteine für Zeilen ---------- */
  const zeile = (name, wert, o = {}) => `<div class="es-zeile"><div class="es-name">${o.fuer ? `<label for="${o.fuer}">${esc(name)}</label>` : `<span>${esc(name)}</span>`}${o.hinweis ? `<div class="es-hinweis">${o.hinweis}</div>` : ""}</div>${o.neu ? '<span class="es-neu">neu</span>' : ""}${wert}</div>`;
  const abschnitt = (t) => `<h2 class="es-abschnitt">${esc(t)}</h2>`;
  const link = (href, text) => `<a class="knopf es-knopf" href="${href}">${esc(text)}</a>`;
  const leer = (text) => `<p class="es-leer">${esc(text)}</p>`;

  // Eingaben eines eigenen Themas überstehen das Neuzeichnen (Auffrischen im Hintergrund) und den Themenwechsel
  function entwurfBinden(el, id) {
    const e = Z.entwurf[id] || {};
    el.querySelectorAll("input[name]").forEach((i) => { if (i.name in e && !i.disabled) i.value = e[i.name]; });
    el.addEventListener("input", (ev) => {
      const i = ev.target; if (!i || !i.name || i.disabled) return;
      const d = (Z.entwurf[id] = Z.entwurf[id] || {});
      if (i.value === i.defaultValue) delete d[i.name]; else d[i.name] = i.value; // zurück auf den alten Wert = keine Änderung mehr
    });
  }
  const entwurfDa = (id) => !!(Z.entwurf[id] && Object.keys(Z.entwurf[id]).length);
  const entwurfWeg = (id) => { delete Z.entwurf[id]; };

  // Eine Zahl in fahrschulen.konfiguration speichern: gleicher Weg wie vorher auf der Fristen-Seite
  async function konfigSpeichern(feld, wert, ctx, thema) {
    const neu = Object.assign({}, (S.fs && S.fs.konfiguration) || {}, { [feld]: wert });
    const res = await supa.from("fahrschulen").update({ konfiguration: neu }).eq("id", S.fsId).select("id");
    if (res.error || !res.data || !res.data.length) { ctx.meldung("Nicht gespeichert: " + (res.error ? dbFehlerText(res.error) : "keine Berechtigung"), "fehler"); return false; }
    S.fs.konfiguration = neu;
    entwurfWeg(thema);
    toast("Einstellungen gespeichert");
    zeichne();
    ctx.meldung("Gespeichert.", "ok");
    return true;
  }
  const nurSuper = (was) => `<span class="leise klein">${was} ändert der Super-Admin.</span>`;

  /* ---------- Eigene Themen ---------- */
  const EIGENE = [
    { id: "fahrschule", titel: "Fahrschule", reihenfolge: 10,
      verlassen: () => !entwurfDa("fahrschule"), verwerfen: () => entwurfWeg("fahrschule"),
      render(el, ctx) {
        const fs = S.fs || {}, darf = istSuper();
        const adresse = fs.adresse || [fs.strasse, [fs.plz, fs.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
        const lesen = (n, v) => (v ? zeile(n, `<div class="es-wert es-text">${esc(v)}</div>`) : "");
        const stamm = lesen("Name", fs.name) + lesen("Telefon", fs.telefon) + lesen("E-Mail", fs.email) + lesen("Adresse", adresse);
        el.innerHTML = `${abschnitt("Fahrschule")}${stamm || leer("Name und Kontakt der Fahrschule stehen hier, sobald sie eingetragen sind.")}
          ${abschnitt("Planung")}
          <form id="esFahrschuleForm" autocomplete="off">
            ${zeile("Unterrichtseinheiten pro Fahrlehrer und Woche", `<label class="es-wert"><input id="esUe" type="number" name="ue" inputmode="numeric" min="1" max="200" step="1" value="${esc(ueProWoche())}"${darf ? "" : " disabled"}><span class="es-einheit">UE</span></label>`, { fuer: "esUe", hinweis: "12 UE pro Tag × 5 Tage = 60. Danach rechnet „Wer hat Platz?“." })}
            <div class="es-fuss">${darf ? `<button class="knopf haupt" type="submit">Speichern</button>` : nurSuper("Das")}</div>
          </form>`;
        const f = el.querySelector("#esFahrschuleForm");
        if (!darf) return;
        entwurfBinden(f, "fahrschule");
        f.addEventListener("submit", async (e) => {
          e.preventDefault();
          const ue = Number(f.ue.value);
          if (!(ue >= 1)) { ctx.meldung("Bitte die Unterrichtseinheiten pro Woche eintragen.", "fehler"); return; }
          await konfigSpeichern("ueProWoche", ue, ctx, "fahrschule");
        });
      } },
    { id: "preise", titel: "Preise & Pakete", reihenfolge: 20,
      verlassen: () => !entwurfDa("preise"), verwerfen: () => entwurfWeg("preise"),
      render(el, ctx) {
        const k = (S.fs && S.fs.konfiguration) || {}, darf = istSuper(), inListe = reaktInPreisliste();
        const pakete = typeof bkDa === "function" && bkDa();
        el.innerHTML = `${abschnitt("Preise")}
          ${zeile("Preisliste", link("#zahlungen?reiter=preise", "Preisliste öffnen"), { hinweis: "Alle Preise (Fahrstunden, Prüfungen, Reaktivierung …) stehen dort, jeder mit „gültig ab“." })}
          ${pakete ? zeile("Pakete", link("#zahlungen?reiter=pakete", "Pakete öffnen"), { hinweis: "Paketpreise und Stunden." }) : ""}
          ${abschnitt("Reaktivierung")}
          <form id="esPreiseForm" autocomplete="off">
            ${inListe ? `<p class="es-hinweis es-satz">Reaktivierung heute: <b>${esc(reaktHeuteText())}</b>. Das steht in der Preisliste (dort mit „gültig ab“ ändern).</p>` : ""}
            ${zeile(inListe ? "Reaktivierung für Verträge vor dem ersten Eintrag der Preisliste" : "Standardbetrag Reaktivierung", `<label class="es-wert"><input id="esReakt" type="number" name="betrag" inputmode="decimal" min="1" max="9999" step="0.01" value="${esc(k.reaktivierungBetrag || REAKT_STANDARD)}"${darf ? "" : " disabled"}><span class="es-einheit">€</span></label>`, { fuer: "esReakt", hinweis: "Gilt, solange die Preisliste keinen Eintrag dafür hat." })}
            <div class="es-fuss">${darf ? `<button class="knopf haupt" type="submit">Speichern</button>` : nurSuper("Diesen Betrag")}</div>
          </form>`;
        const f = el.querySelector("#esPreiseForm");
        if (!darf) return;
        entwurfBinden(f, "preise");
        f.addEventListener("submit", async (e) => {
          e.preventDefault();
          const betrag = Number(String(f.betrag.value).replace(",", "."));
          if (!(betrag > 0)) { ctx.meldung("Bitte einen Betrag eintragen.", "fehler"); return; }
          await konfigSpeichern("reaktivierungBetrag", betrag, ctx, "preise");
        });
      } },
    { id: "zahlungen", titel: "Zahlungen & Mails", reihenfolge: 30,
      verlassen: () => !S.zmEntwurf, verwerfen: () => { S.zmEntwurf = null; },
      render(el) {
        // Dasselbe Formular wie bisher (buero-zahlungsmail.js): gleiche Darstellung, gleiche Bindung, gleicher Speicherweg
        const html = typeof zmEinstellungenHTML === "function" ? zmEinstellungenHTML() : "";
        el.innerHTML = html || leer("Hier kommt bald: Zahlungsdaten für die Mails an Schüler.");
        if (html && typeof zmBindeEinstellungen === "function") zmBindeEinstellungen(el);
      } },
    { id: "vorlagen", titel: "Nachrichten-Vorlagen", reihenfolge: 50,
      render(el) { el.innerHTML = abschnitt("Nachrichten-Vorlagen") + leer("Hier kommt bald: die Texte der Mails und Nachrichten an Schüler selbst anpassen."); } },
    { id: "kalender", titel: "Fahrstunden & Kalender", reihenfolge: 60,
      render(el) {
        el.innerHTML = `${abschnitt("Fahrstunden & Kalender")}
          ${zeile("Arbeitszeiten", `<div class="es-wert es-text">in der App</div>`, { hinweis: "Arbeitszeiten stellt jeder Fahrlehrer in der App ein (Kalender, Zahnrad)." })}
          ${leer("Hier kommt bald: die Länge einer Sonderfahrt.")}`;
      } },
    { id: "team", titel: "Team & Zugänge", reihenfolge: 70,
      render(el) {
        const aktiv = (S.personen || []).filter((p) => p.aktiv !== false).length;
        el.innerHTML = `${abschnitt("Team & Zugänge")}
          ${zeile("Fahrlehrer & Büro", link("#team", "Öffnen"), { hinweis: "Zugänge anlegen, ändern oder sperren." })}
          ${zeile("Büro-Personen und PIN", link("#team", "Öffnen"), { hinweis: `Namen und PIN je Person (${aktiv} aktiv). Steht auf der Seite „Fahrlehrer & Büro“ weiter unten.` })}`;
      } },
    { id: "sicherheit", titel: "Sicherheit (PIN)", reihenfolge: 80,
      render(el) {
        const zeile0 = document.getElementById("werZeile"), da = !!(zeile0 && !zeile0.hidden && S.sitzung);
        el.innerHTML = `${abschnitt("Sicherheit (PIN)")}
          ${da ? `${zeile("PIN ändern", `<button class="knopf es-knopf" type="button" data-es-pin>PIN ändern</button>`, { hinweis: "Deine eigene 4-stellige PIN." })}
          ${zeile("Platz sperren", `<button class="knopf es-knopf" type="button" data-es-sperren>Sperren</button>`, { hinweis: "Beim Zurückkommen gibst du deine PIN ein." })}`
          : leer("PIN ändern und Sperren geht, sobald du mit deinem Namen und deiner PIN angemeldet bist.")}`;
        const klick = (sel, id) => { const b = el.querySelector(sel); if (b) b.addEventListener("click", () => document.getElementById(id).click()); }; // vorhandene Funktionen der Fußzeile
        klick("[data-es-pin]", "werPinAendern"); klick("[data-es-sperren]", "werSperren");
      } },
    { id: "darstellung", titel: "Darstellung & Start", reihenfolge: 90,
      render(el) {
        el.innerHTML = `${abschnitt("Darstellung & Start")}
          ${zeile("Hell oder dunkel", `<div class="es-wert es-text">folgt dem Gerät</div>`, { hinweis: "Die Büro-Seite richtet sich nach der Einstellung deines Geräts." })}`;
        const kasten = document.createElement("div"); kasten.className = "es-kasten";
        el.appendChild(kasten);
        if (typeof KS_START !== "undefined") KS_START.einbauen(kasten, S.profil);
      } },
  ];
  EIGENE.forEach((t) => { if (!LISTE.some((x) => x && x.id === t.id)) LISTE.push(t); }); // schon angemeldeter Eintrag (W15b) geht vor

  /* ---------- Seite ---------- */
  const chevron = '<svg class="es-pfeil" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const listeHTML = (T, aktivId) => T.map((t) => `<a class="es-thema" href="${themaHash(t.id)}" data-es-thema="${esc(t.id)}"${t.id === aktivId ? ' aria-current="page"' : ""}><span>${esc(t.titel)}</span>${chevron}</a>`).join("");
  function darfVerlassen(t) { try { return !(t && typeof t.verlassen === "function") || t.verlassen() !== false; } catch (e) { return true; } }
  function rueckfrage(alt, hash) {
    bestaetige("Änderungen verwerfen?", "Was du hier geändert hast, ist noch nicht gespeichert.", "Ja, verwerfen", "Weiter bearbeiten", true).then((ok) => {
      if (!ok) return;
      if (typeof alt.verwerfen === "function") { try { alt.verwerfen(); } catch (e) { /* weiter */ } }
      Z.frei = true;
      if (location.hash === hash) { zeichne(); Z.frei = false; } else location.hash = hash;
    });
  }

  function renderEinstellungenSeite() {
    const T = themen();
    if (!Z.el || !Z.el.isConnected) { Z.key = undefined; Z.halte = null; } // Seite wurde verlassen: beim Zurückkommen kein Einblenden
    const wunsch = hashThema();
    let aktiv = T.find((t) => t.id === wunsch) || T[0] || null;
    const alt = Z.el && Z.el.isConnected ? T.find((t) => t.id === Z.id) : null;
    Z.halte = null;
    if (alt && aktiv && alt.id !== aktiv.id) {
      if (Z.frei) Z.frei = false;
      else if (!darfVerlassen(alt)) { // Zurück-Taste oder Adresse: beim alten Thema bleiben und fragen
        Z.halte = alt; const neuHash = location.hash;
        history.replaceState(null, "", themaHash(alt.id));
        aktiv = alt;
        rueckfrage(alt, neuHash);
      }
    } else Z.frei = false;
    Z.aktiv = aktiv;
    if (!aktiv) return `<div class="es"><p class="es-leer">Hier kommt bald etwas zum Einstellen.</p></div>`;
    return `<div class="es" data-ansicht="${wunsch && T.some((t) => t.id === wunsch) ? "thema" : "liste"}">
      <nav class="es-themen" aria-label="Themen">${listeHTML(T, aktiv.id)}</nav>
      <section class="es-inhalt" aria-label="${esc(aktiv.titel)}">
        <a class="es-zurueck" href="${themaHash("")}" data-es-thema="">‹ Alle Themen</a>
        <div class="es-meldung" id="esMeldung" role="status" aria-live="polite" hidden></div>
        <div class="es-box" id="esBox" data-thema="${esc(aktiv.id)}"></div>
      </section>
    </div>`;
  }

  function bindeEinstellungenSeite(ziel) {
    const aktiv = Z.aktiv, box = ziel.querySelector("#esBox");
    if (!aktiv || !box) return;
    if (Z.halte && Z.el && Z.el.isConnected === false) { box.replaceWith(Z.el); }
    else {
      try { aktiv.render(box, kontext()); }
      catch (e) { console.error(e); box.innerHTML = leer("Dieses Thema konnte nicht geöffnet werden. Bitte die Seite neu laden."); }
      if (!box.firstElementChild && !box.textContent.trim()) box.innerHTML = leer("Hier kommt bald etwas zum Einstellen.");
      // sanft einblenden nur beim Wechsel des Themas (nicht beim ersten Zeichnen, nicht beim Neuzeichnen desselben Themas)
      const key = schmal() ? hashThema() : aktiv.id;
      if (Z.key !== undefined && Z.key !== key) { void box.offsetWidth; box.classList.add("es-ein"); }
      Z.key = key; Z.el = box; Z.id = aktiv.id;
    }
    if (Z.halte) Z.halte = null;
  }

  // Klick auf ein Thema: bei ungespeicherten Änderungen erst fragen, ohne einen Eintrag im Verlauf anzulegen
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[data-es-thema]");
    if (!a || !Z.el || !Z.el.isConnected) return;
    const alt = themen().find((t) => t.id === Z.id), hash = a.getAttribute("href");
    if (!alt || darfVerlassen(alt)) return;
    const neu = a.dataset.esThema;
    if (neu === Z.id && !schmal()) return;
    e.preventDefault();
    rueckfrage(alt, hash);
  });

  // Ein Thema kommt nach dem Laden dazu: Liste links nachziehen, ein gewünschtes Thema aus der Adresse jetzt öffnen
  const push0 = LISTE.push;
  LISTE.push = function () {
    const r = push0.apply(this, arguments);
    if (document.body && document.body.dataset.bereich === "einstellungen" && S.geladenAm) {
      const T = themen(), nav = document.querySelector(".es-themen"), w = hashThema();
      if (w && T.some((t) => t.id === w) && Z.id !== w) zeichne();
      else if (nav) nav.innerHTML = listeHTML(T, Z.id);
    }
    return r;
  };

  W.renderEinstellungenSeite = renderEinstellungenSeite;
  W.bindeEinstellungenSeite = bindeEinstellungenSeite;
  W.bueroEinstellungenDarf = darfSeite;

  // Lädt diese Datei erst nach dem ersten Zeichnen (schnelle Verbindung), Leiste und Seite einmal nachziehen
  try {
    if (typeof zeichneNav === "function" && S.profil) {
      zeichneNav();
      if (document.body.dataset.bereich && document.body.dataset.bereich !== aktuellerBereich().id) {
        const a = document.getElementById("ansicht"); if (a) delete a.dataset.seite; // kein Einblenden beim ersten Zeichnen
        zeichne();
      }
    }
  } catch (e) { console.error(e); }
})();
