/* Büro-Einstellungen nach Themen (Werkstatt 11 Schritt 2, 🗣 Serband)
   Seite #einstellungen: links die Themen, rechts die Felder als Zeilen. Der Rahmen liegt hier, die Themen kommen aus der Warteliste:

     window.BUERO_EINSTELLUNGEN_THEMEN.push({ id, titel, reihenfolge, rollen?: ['leitung','buero','superadmin'],
                                              render(el, ctx), verlassen?() , verwerfen?() })

   - Die Liste darf vor oder nach dem Laden dieser Datei gefüllt werden. Gleiche id: der spätere Eintrag ersetzt den früheren.
     Bitte push verwenden (unshift und ein neues Array werden beim nächsten Zeichnen auch gelesen, die Liste links aktualisiert sich dann erst dort).
     Ersetzt ein push das gerade offene Thema, wird es neu gezeichnet. render darf ein Promise zurückgeben (lehnt es ab, erscheint eine Fehlerzeile).
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
    const ROLLEN_KURZ = { fahrschule_admin: "leitung", buero: "buero", super_admin: "superadmin" };
  let LISTE = W.BUERO_EINSTELLUNGEN_THEMEN;
  const Z = { id: null, el: null, key: undefined, frei: false, entwurf: {}, melde: null, fs: undefined, fokus: null, nr: null, behalte: false };
  W.addEventListener("hashchange", () => { Z.fokus = null; });
  // KE kommt später an (Netz) oder ändert sich: offene Zahl-Karten zeigen sofort den richtigen Wert (Entwürfe bleiben)
  W.addEventListener("ke:geladen", () => {
    if (document.body && document.body.dataset.bereich === "einstellungen" && S.geladenAm && (Z.id === "kalender" || Z.id === "loeschen") && Z.el && Z.el.isConnected) zeichne();
  });

  const meineRolle = () => ROLLEN_KURZ[S.profil && S.profil.rolle] || "";
  const darfSeite = () => !!meineRolle();
  const istSuper = () => !!(S.profil && S.profil.rolle === "super_admin");
  const schmal = () => W.matchMedia && W.matchMedia("(max-width:900px)").matches;
  const hashThema = () => { const m = location.hash.match(/[?&]thema=([a-z0-9_-]*)/i); return m ? m[1] : ""; };
  const themaHash = (id) => "#einstellungen" + (id ? "?thema=" + id : "");

  // Wartelistenpunkt, den noch niemand angemeldet hat, wird hier eingetragen (ein späterer Eintrag mit gleicher id ersetzt ihn)
  function themen() {
    const rolle = meineRolle(), karte = new Map();
    if (Array.isArray(W.BUERO_EINSTELLUNGEN_THEMEN) && W.BUERO_EINSTELLUNGEN_THEMEN !== LISTE) { LISTE = W.BUERO_EINSTELLUNGEN_THEMEN; patche(LISTE); } // neues Array nach dem Laden
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
  const linkZeile = (href, name, hinweis) => `<a class="es-link" href="${href}"><span class="es-name"><span>${esc(name)}</span>${hinweis ? `<span class="es-hinweis">${hinweis}</span>` : ""}</span><svg class="es-pfeil" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></a>`;
  const leer = (text) => `<p class="es-leer">${esc(text)}</p>`;

  // Eingaben eines eigenen Themas überstehen das Neuzeichnen (Auffrischen im Hintergrund) und den Themenwechsel.
  // Der Entwurf gehört zu Fahrschule UND Thema (Schulwechsel des Super-Admins nimmt nichts mit).
  const ek = (id) => (S.fsId || "") + "|" + id;
  function entwurfBinden(el, id) {
    const k = ek(id), e = Z.entwurf[k] || {};
    el.querySelectorAll("input[name]").forEach((i) => { if (i.name in e && !i.disabled) i.value = e[i.name]; });
    el.addEventListener("input", (ev) => {
      const i = ev.target; if (!i || !i.name || i.disabled) return;
      const d = (Z.entwurf[k] = Z.entwurf[k] || {});
      if (i.value === i.defaultValue) delete d[i.name]; else d[i.name] = i.value; // zurück auf den alten Wert = keine Änderung mehr
    });
    // aktives Feld und Cursor überstehen das Neuzeichnen (sonst klappt die Tastatur am Handy zu)
    const merke = (ev) => { const t = ev.target; if (t && t.name && el.contains(t)) Z.fokus = { k, name: t.name, a: t.selectionStart, b: t.selectionEnd }; };
    ["focusin", "input", "keyup", "click", "select"].forEach((ev) => el.addEventListener(ev, merke));
    el.addEventListener("focusout", () => setTimeout(() => { if (el.isConnected && !el.contains(document.activeElement)) Z.fokus = null; }, 0));
    if (Z.fokus && Z.fokus.k === k && (!document.activeElement || document.activeElement === document.body)) {
      const f = el.elements ? el.elements[Z.fokus.name] : el.querySelector(`[name="${Z.fokus.name}"]`), von = Z.fokus.a, bis = Z.fokus.b; // vorher kopieren: focus() löst den Merker aus
      if (f && f.focus) { f.focus({ preventScroll: true }); try { f.setSelectionRange(von, bis); } catch (e2) { /* Feldart ohne Cursor */ } }
    }
  }
  const entwurfDa = (id) => !!(Z.entwurf[ek(id)] && Object.keys(Z.entwurf[ek(id)]).length);
  const entwurfWeg = (id) => { delete Z.entwurf[ek(id)]; };
  const entwurfFeldWeg = (id, name) => { const d = Z.entwurf[ek(id)]; if (d) { delete d[name]; if (!Object.keys(d).length) entwurfWeg(id); } };

  // Eine Zahl in fahrschulen.konfiguration speichern: gleicher Weg wie vorher auf der Fristen-Seite
  async function konfigSpeichern(feld, wert, ctx, thema) {
    // frisch holen und nur das eigene Feld ergänzen: zwei PCs überschreiben einander nicht (wie in der App)
    const fsId = S.fsId;
    const cur = await supa.from("fahrschulen").select("konfiguration").eq("id", fsId).single();
    if (cur.error || !cur.data) { ctx.meldung("Nicht gespeichert: Die Einstellungen konnten nicht geladen werden.", "fehler"); return false; }
    const neu = Object.assign({}, cur.data.konfiguration || {}, { [feld]: wert });
    const res = await supa.from("fahrschulen").update({ konfiguration: neu }).eq("id", fsId).select("id");
    if (res.error || !res.data || !res.data.length) { ctx.meldung("Nicht gespeichert: " + (res.error ? dbFehlerText(res.error) : "keine Berechtigung"), "fehler"); return false; }
    if (S.fsId === fsId && S.fs) S.fs.konfiguration = neu;
    entwurfWeg(thema);
    toast("Einstellungen gespeichert");
    zeichne();
    ctx.meldung("Gespeichert.", "ok");
    return true;
  }
  /* ---------- Einstellungen je Fahrschule (fahrschule_einstellungen über KE): eine Zahl je Karte ---------- */
  const keDa = () => !!(W.KE && typeof KE.zahl === "function");
  const keGespeichert = (o) => keDa() && Object.prototype.hasOwnProperty.call(KE.wert(o.schluessel, {}), o.feld);
  const keZahl = (o) => (keDa() ? KE.zahl(o.schluessel, o.feld, o.std, o.min, o.max) : o.std);
  // KE.setze/zuruecksetzen werfen bei Fehlern einen Error mit deutschem Text (oder liefern {ok:false, fehler}): beides wird zu {ok, fehler}
  async function keAufruf(f) {
    try { const r = await f(); return r && r.ok === false ? { ok: false, fehler: r.fehler || "Nicht gespeichert" } : { ok: true }; }
    catch (e) { return { ok: false, fehler: (e && e.message) || "Nicht gespeichert" }; }
  }
  // Rückmeldung sitzt an der Karte (am Handy ist das Band oben außerhalb des Bildes): Fehler unter dem Feld, „Gespeichert“ im Kartenfuß
  Z.erfolg = null; Z.erfolgZeit = null;
  function keKarteHTML(o, darf) {
    const wert = keZahl(o), id = "es" + o.feld.charAt(0).toUpperCase() + o.feld.slice(1), eigen = keGespeichert(o);
    const std = !eigen ? `<span class="es-standardzahl">Standard: ${o.std}</span>` : "";
    return `<form class="es-keform" data-es-ke="${o.feld}" autocomplete="off" novalidate>
      ${zeile(o.name, `<label class="es-wert"><input id="${id}" type="number" name="${o.feld}" inputmode="numeric" min="${o.min}" max="${o.max}" step="1" value="${wert}"${darf ? "" : " disabled"} aria-describedby="${id}Fehler"><span class="es-einheit">${esc(o.einheit)}</span></label>`, { fuer: id, hinweis: o.hinweis + std })}
      <div class="es-kefehler" id="${id}Fehler" role="alert" hidden></div>
      <div class="es-keok" role="status"${Z.erfolg === o.feld ? "" : " hidden"}>${Z.erfolg === o.feld ? esc(Z.erfolgText || "Gespeichert.") : ""}</div>
      <div class="es-fuss">${darf ? `${eigen ? `<button class="knopf es-std" type="button" data-es-std>Auf Standard zurück (${o.std})</button>` : ""}<button class="knopf haupt" type="submit">Speichern</button>` : `<span class="leise klein">Das darfst du nicht ändern.</span>`}</div>
    </form>`;
  }
  function keKarteBinden(el, ctx, thema, o) {
    const f = el.querySelector(`form[data-es-ke="${o.feld}"]`);
    if (!f || !ctx.darfSchreiben) return;
    const feld = f[o.feld], kasten = f.querySelector(".es-kefehler"), wertKasten = f.querySelector(".es-wert");
    const fehlerWeg = () => { kasten.hidden = true; kasten.textContent = ""; wertKasten.removeAttribute("data-fehler"); feld.removeAttribute("aria-invalid"); };
    const fehler = (text) => { // Fehler direkt an der Karte: Feld rot, Fokus, in den Sichtbereich
      kasten.textContent = text; kasten.hidden = false; wertKasten.setAttribute("data-fehler", ""); feld.setAttribute("aria-invalid", "true");
      try { feld.focus({ preventScroll: true }); kasten.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { /* alter Browser */ }
    };
    entwurfBinden(f, thema);
    feld.addEventListener("input", () => { fehlerWeg(); const ok = f.querySelector(".es-keok"); if (ok) ok.hidden = true; Z.erfolg = null; });
    const fertig = (text) => { entwurfFeldWeg(thema, o.feld); if (o.nach) o.nach(keZahl(o)); Z.erfolg = o.feld; Z.erfolgText = text; clearTimeout(Z.erfolgZeit); Z.erfolgZeit = setTimeout(() => { Z.erfolg = null; document.querySelectorAll(".es-keok").forEach((k) => { k.hidden = true; }); }, 6000); zeichne(); };
    const sperren = (an) => f.querySelectorAll("button").forEach((b) => { b.disabled = an; });
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const roh = String(feld.value).trim(), n = Number(roh);
      if (!/^[0-9]{1,3}$/.test(roh) || n < o.min || n > o.max) { fehler(`${o.kurz}: bitte eine ganze Zahl von ${o.min} bis ${o.max} eintragen.`); return; }
      fehlerWeg(); sperren(true);
      const r = await keAufruf(() => KE.setze(ctx.sb, ctx.fahrschuleId, o.schluessel, { [o.feld]: n }));
      if (r.ok) { fertig("Gespeichert."); return; }
      if (f.isConnected) { sperren(false); fehler(`${o.kurz}: ${r.fehler}`); } else ctx.meldung(`${o.kurz}: ${r.fehler}`, "fehler"); // Seite inzwischen neu gezeichnet: Fehler trotzdem zeigen
    });
    const std = f.querySelector("[data-es-std]");
    if (std) std.addEventListener("click", async () => {
      fehlerWeg(); sperren(true);
      const r = await keAufruf(() => KE.zuruecksetzen(ctx.sb, ctx.fahrschuleId, o.schluessel));
      if (r.ok) { fertig(`Wieder der Standard (${o.std}).`); return; }
      if (f.isConnected) { sperren(false); fehler(`${o.kurz}: ${r.fehler}`); } else ctx.meldung(`${o.kurz}: ${r.fehler}`, "fehler"); // Seite inzwischen neu gezeichnet: Fehler trotzdem zeigen
    });
  }
  const KE_SONDER = { schluessel: "fahrstunden.sonderfahrt", feld: "minuten", std: 45, min: 30, max: 90, einheit: "Min.", name: "Länge", kurz: "Sonderfahrt",
    hinweis: "So lang ist eine Sonderfahrt (Überland, Autobahn, Nacht) im Ausbildungsplan und im Nachweis. Fahrchecks und Unterricht bleiben bei 45 Min. Gilt auch für ältere Termine im Nachweis.",
    nach: (n) => { if (typeof KR !== "undefined" && KR.setzeSonderMinuten) KR.setzeSonderMinuten(n); } };
  const KE_PAPIERKORB = { schluessel: "papierkorb.tage", feld: "tage", std: 30, min: 7, max: 90, einheit: "Tage", name: "Aufbewahrung", kurz: "Papierkorb",
    hinweis: "Gelöschte Termine bleiben so lange im Papierkorb, danach sind sie endgültig weg. Unterschriebene und stornierte Stunden bleiben immer.<div class=\"es-fett\">Kürzer stellen wirkt sofort auf alles, was schon im Papierkorb liegt.</div>" };
  const KE_RUECK = { schluessel: "rueckgaengig.sekunden", feld: "sekunden", std: 6, min: 4, max: 30, einheit: "Sek.", name: "Anzeigedauer", kurz: "Rückgängig",
    hinweis: "So lange kann man nach dem Löschen oder Ändern noch „Rückgängig“ tippen. Absage-Mails gehen erst danach raus." };
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
          ${linkZeile("#zahlungen?reiter=preise", "Preisliste", "Alle Preise (Fahrstunden, Prüfungen, Reaktivierung …) stehen dort, jeder mit „gültig ab“.")}
          ${pakete ? linkZeile("#zahlungen?reiter=pakete", "Pakete", "Paketpreise und Stunden.") : ""}
          <p class="es-hinweis es-satz">Eine abweichende Zahlung (z. B. Sonderangebot) trägst du direkt beim Eintragen der Zahlung ein.</p>
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
        const hinw = el.querySelector("#zmForm p.voll.leise.klein:not([data-zmzuletzt])"); // „Diese Angaben stehen in der Zahlungsaufforderung …“
        if (hinw) hinw.insertAdjacentHTML("beforebegin", `<h3 class="es-abschnitt">Zahlungsdaten</h3>`);
        if (html && typeof zmBindeEinstellungen === "function") zmBindeEinstellungen(el);
      } },
    { id: "vorlagen", titel: "Nachrichten-Vorlagen", reihenfolge: 50,
      render(el) { el.innerHTML = abschnitt("Nachrichten-Vorlagen") + leer("Hier kommt bald: die Texte der Mails und Nachrichten an Schüler selbst anpassen."); } },
    { id: "kalender", titel: "Fahrstunden & Kalender", reihenfolge: 60,
      verlassen: () => !entwurfDa("kalender"), verwerfen: () => entwurfWeg("kalender"),
      render(el, ctx) {
        el.innerHTML = `${abschnitt("Fahrstunden & Kalender")}
          <p class="es-hinweis es-satz">Arbeitszeiten stellt jeder Fahrlehrer in der App ein (Kalender, Zahnrad).</p>
          ${abschnitt("Sonderfahrt")}${keKarteHTML(KE_SONDER, ctx.darfSchreiben)}`;
        keKarteBinden(el, ctx, "kalender", KE_SONDER);
      } },
    { id: "loeschen", titel: "Löschen & Rückgängig", reihenfolge: 65,
      verlassen: () => !entwurfDa("loeschen"), verwerfen: () => entwurfWeg("loeschen"),
      render(el, ctx) {
        el.innerHTML = `${abschnitt("Papierkorb")}${keKarteHTML(KE_PAPIERKORB, ctx.darfSchreiben)}
          ${abschnitt("Rückgängig")}${keKarteHTML(KE_RUECK, ctx.darfSchreiben)}`;
        keKarteBinden(el, ctx, "loeschen", KE_PAPIERKORB);
        keKarteBinden(el, ctx, "loeschen", KE_RUECK);
      } },
    { id: "team", titel: "Team & Zugänge", reihenfolge: 70,
      render(el) {
        const aktiv = (S.personen || []).filter((p) => p.aktiv !== false).length;
        el.innerHTML = `${abschnitt("Team & Zugänge")}
          ${linkZeile("#team", "Fahrlehrer & Büro", "Zugänge anlegen, ändern oder sperren.")}
          ${linkZeile("#team", "Büro-Personen und PIN", `Namen und PIN je Person (${aktiv} aktiv). Steht auf der Seite „Fahrlehrer & Büro“ weiter unten.`)}`;
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
    { id: "backups", titel: "Backups", reihenfolge: 85,
      render(el) {
        el.innerHTML = `${abschnitt("Backups")}
          ${typeof W.renderBackups === "function" ? linkZeile("#backups", "Backups ansehen und sichern", "Läuft jeden Sonntag von selbst. Hier sicherst du zusätzlich oder lädst eine Sicherung herunter.")
            : leer("Backups sind gerade nicht verfügbar. Bitte die Seite neu laden.")}`; // alter Zwischenspeicher ohne buero-verwaltung.js
      } },
    { id: "darstellung", get titel() { return meineRolle() === "buero" ? "Darstellung" : "Darstellung & Start"; }, reihenfolge: 90,
      render(el) {
        const buero = meineRolle() === "buero"; // das Büro wählt keine Startseite: es arbeitet nur auf der Büro-Seite (W16 Teil 3 B)
        el.innerHTML = `${abschnitt(this.titel)}
          ${zeile("Hell oder dunkel", `<div class="es-wert es-text">folgt dem Gerät</div>`, { hinweis: "Die Büro-Seite richtet sich nach der Einstellung deines Geräts." })}
          ${buero ? `<p class="es-hinweis es-satz">Das Büro arbeitet nur auf der Büro-Seite.</p>` : ""}`;
        if (buero) return;
        const kasten = document.createElement("div"); kasten.className = "es-kasten";
        el.appendChild(kasten);
        if (typeof KS_START !== "undefined") KS_START.einbauen(kasten, S.profil);
      } },
  ];
  EIGENE.forEach((t) => { if (!LISTE.some((x) => x && x.id === t.id)) LISTE.push(t); }); // schon angemeldeter Eintrag (W15b) geht vor

  /* ---------- Seite ---------- */
  const chevron = '<svg class="es-pfeil" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const zurueckPfeil = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const listeHTML = (T, aktivId) => T.map((t) => `<a class="es-thema" href="${themaHash(t.id)}" data-es-thema="${esc(t.id)}"${t.id === aktivId ? ' aria-current="page"' : ""}><span>${esc(t.titel)}</span>${chevron}</a>`).join("");
  function darfVerlassen(t) { try { return !(t && typeof t.verlassen === "function") || t.verlassen() !== false; } catch (e) { return true; } }
  // weg: "klick" (Tipp auf ein Thema: neuer Eintrag im Verlauf), "back"/"forward" (so wollte der Nutzer springen: noch einmal so springen),
  // "ersatz" (kein Sprung möglich: den Eintrag ersetzen). Nach der Zurück-Taste entsteht so nie ein zusätzlicher Verlaufseintrag.
  function rueckfrage(alt, hash, weg) {
    Z.fragt = true; // solange die Frage offen ist, löst ein Neuzeichnen keine zweite aus
    bestaetige("Änderungen verwerfen?", "Was du hier geändert hast, ist noch nicht gespeichert.", "Ja, verwerfen", "Weiter bearbeiten", true).then((ok) => {
      // das Rückfrage-Fenster hat einen eigenen Verlaufseintrag: erst wenn er weg ist, am Verlauf arbeiten
      let n = 0;
      const los = () => {
        if (history.state && history.state.fenster != null && n++ < 20) { setTimeout(los, 30); return; }
        Z.fragt = false;
        if (!ok) { // „Weiter bearbeiten“ nach Ersatzweg: die Adresse steht noch beim Ziel; das alte Thema bekommt einen neuen Eintrag, so fragt ein weiteres Zurück wieder
          if (weg === "ersatz" && location.hash !== themaHash(alt.id)) { history.pushState(null, "", themaHash(alt.id)); }
          return;
        }
        if (typeof alt.verwerfen === "function") { try { alt.verwerfen(); } catch (e) { /* weiter */ } }
        Z.frei = true;
        if (location.hash === hash) { zeichne(); Z.frei = false; return; }
        if (weg === "back" || weg === "forward") {
          if (weg === "back") history.back(); else history.forward();
          setTimeout(() => { if (Z.frei) { Z.frei = false; history.replaceState(null, "", hash); zeichne(); } }, 400); // kam kein Sprung an
        } else if (weg === "ersatz") { history.replaceState(null, "", hash); zeichne(); Z.frei = false; }
        else location.hash = hash;
      };
      los();
    });
  }

  function renderEinstellungenSeite() {
    const T = themen();
    if (Z.fs !== S.fsId) { Z.entwurf = {}; Z.fokus = null; Z.fs = S.fsId; } // andere Fahrschule: keine Entwürfe der vorigen
    if (!Z.el || !Z.el.isConnected) { Z.key = undefined; Z.halte = null; Z.behalte = false; } // Seite wurde verlassen: beim Zurückkommen kein Einblenden
    const wunsch = hashThema();
    const alt = Z.el && Z.el.isConnected ? T.find((t) => t.id === Z.id) || null : null;
    let aktiv = T.find((t) => t.id === wunsch) || (wunsch === "" && schmal() && alt) || T[0] || null;
    Z.halte = null;
    const dirty = !!alt && !darfVerlassen(alt);
    const kommtAusListe = Z.inListe; Z.inListe = false; // Handy: das Thema lag zuletzt hinter der Liste
    const zuListe = dirty && wunsch === "" && schmal(); // Handy: von der Eingabe zurück zur Liste
    let ausListeOk = false;
    if (alt && aktiv && (alt.id !== aktiv.id || zuListe)) {
      if (Z.frei) Z.frei = false;
      else if (zuListe && (Z.listeOk || kommtAusListe)) { Z.listeOk = false; Z.halte = alt; ausListeOk = true; Z.inListe = true; } // Pfeil „Alle Themen“: ohne Frage, Eingabe bleibt im Hintergrund
      else if (dirty && Z.fragt) { Z.halte = alt; aktiv = alt; } // Frage ist schon offen
      else if (dirty) { // Zurück-Taste oder Adresse: beim alten Thema bleiben und fragen
        Z.halte = alt; const neuHash = location.hash;
        const jetzt = typeof buNr === "function" ? buNr() : null;
        // Richtung nur aus den Verlaufsnummern ableiten, wenn die Seite dieser Sitzung bekannt ist (nach F5 sind alte Nummern fremd: dann gleich ersetzen)
        const bekannt = jetzt != null && Z.nr != null && !(typeof buUnbekannt !== "undefined" && buUnbekannt);
        aktiv = alt;
        if (bekannt && jetzt !== Z.nr) {
          // erst zurückspringen, dann fragen (der Sprung schließt offene Fenster); kommt kein Sprung an, wird nach 0,4 s ersatzweise umgeschrieben
          const wollte = jetzt < Z.nr ? "back" : "forward";
          Z.behalte = true; Z.frage = { alt, hash: neuHash, weg: wollte };
          if (wollte === "back") history.forward(); else history.back();
          setTimeout(() => { if (Z.frage) { const q = Z.frage; Z.frage = null; Z.behalte = false; rueckfrage(q.alt, q.hash, "ersatz"); } }, 400);
        } else { rueckfrage(alt, neuHash, "ersatz"); }
      }
    } else {
      Z.frei = false;
      if (alt && aktiv && alt.id === aktiv.id && kommtAusListe && wunsch !== "" && dirty) { Z.halte = alt; } // zurück aus der Liste ins selbe Thema: Eingabe behalten
      else if (alt && aktiv && alt.id === aktiv.id && Z.behalte) { // Rückgängig-Sprung: das Feld samt Eingabe behalten, dann fragen
        if (typeof buNr === "function") Z.nr = buNr();
        Z.behalte = false; Z.halte = alt;
        if (Z.frage) { const q = Z.frage; Z.frage = null; setTimeout(() => rueckfrage(q.alt, q.hash, q.weg), 0); }
      }
    }
    Z.aktiv = aktiv;
    if (!aktiv) return `<div class="es"><p class="es-leer">Hier kommt bald etwas zum Einstellen.</p></div>`;
    const imThema = (!!Z.halte && !ausListeOk) || !!(wunsch && T.some((t) => t.id === wunsch));
    return `<div class="es" data-ansicht="${imThema ? "thema" : "liste"}">
      <nav class="es-themen" aria-label="Themen">${listeHTML(T, aktiv.id)}</nav>
      <section class="es-inhalt" aria-label="${esc(aktiv.titel)}">
        <div class="es-kopfzeile"><a class="es-zurueck" href="${themaHash("")}" data-es-thema="" aria-label="Zurück zu allen Themen">${zurueckPfeil}</a><h2 class="es-titel">${esc(aktiv.titel)}</h2></div>
        <div class="es-meldung" id="esMeldung" role="status" aria-live="polite" hidden></div>
        <div class="es-box" id="esBox" data-thema="${esc(aktiv.id)}"></div>
      </section>
    </div>`;
  }

  function bindeEinstellungenSeite(ziel) {
    const aktiv = Z.aktiv, box = ziel.querySelector("#esBox");
    if (!aktiv || !box) return;
    const es = ziel.querySelector(".es"); if (es) document.body.dataset.esAnsicht = es.dataset.ansicht; // Handy: im Thema steht der Themenname statt „Einstellungen“ oben
    if (Z.halte && Z.el && !Z.el.isConnected) { box.replaceWith(Z.el); if (!Z.behalte && !Z.frage && typeof buNr === "function") Z.nr = buNr(); }
    else {
      const ctx = kontext();
      const fehler = (e) => { console.error(e); box.innerHTML = leer("Dieses Thema konnte nicht geöffnet werden. Bitte die Seite neu laden."); ctx.meldung("Dieses Thema konnte nicht geladen werden.", "fehler"); };
      try {
        const r = aktiv.render(box, ctx);
        if (r && typeof r.then === "function") r.then(null, (e) => { if (box.isConnected) fehler(e); else console.error(e); }); // async render: Ablehnung abfangen
      } catch (e) { fehler(e); }
      if (!box.firstElementChild && !box.textContent.trim()) box.innerHTML = leer("Hier kommt bald etwas zum Einstellen.");
      const h = box.firstElementChild; // Überschrift = Themenname: am Handy steht der Name schon oben
      if (h && h.classList.contains("es-abschnitt") && h.textContent.trim() === aktiv.titel) h.classList.add("es-doppelt");
      // sanft einblenden nur beim Wechsel des Themas (nicht beim ersten Zeichnen, nicht beim Neuzeichnen desselben Themas)
      const key = schmal() ? hashThema() : aktiv.id;
      if (Z.key !== undefined && Z.key !== key) { void box.offsetWidth; box.classList.add("es-ein"); }
      Z.key = key; Z.el = box; Z.id = aktiv.id; Z.nr = typeof buNr === "function" ? buNr() : null;
    }
    Z.halte = null;
  }

  // Klick auf ein Thema: bei ungespeicherten Änderungen erst fragen, ohne einen Eintrag im Verlauf anzulegen
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[data-es-thema]");
    if (!a || !Z.el || !Z.el.isConnected) return;
    const neu = a.dataset.esThema;
    if (neu === "") { Z.listeOk = true; setTimeout(() => { Z.listeOk = false; }, 1000); return; } // „Alle Themen“: die Eingabe bleibt, es wird nicht gefragt
    if (neu === Z.id) return; // dasselbe Thema verlässt nichts
    const alt = themen().find((t) => t.id === Z.id), hash = a.getAttribute("href");
    if (!alt || darfVerlassen(alt)) return;
    e.preventDefault();
    rueckfrage(alt, hash);
  });

  // Ein Thema kommt nach dem Laden dazu: Liste links nachziehen, ein gewünschtes Thema aus der Adresse jetzt öffnen,
  // ein ersetztes offenes Thema neu zeichnen
  function angemeldet(ids) {
    if (!(document.body && document.body.dataset.bereich === "einstellungen" && S.geladenAm)) return;
    const T = themen(), nav = document.querySelector(".es-themen"), w = hashThema();
    if ((w && T.some((t) => t.id === w) && Z.id !== w) || ids.includes(Z.id)) zeichne();
    else if (nav) nav.innerHTML = listeHTML(T, Z.id);
  }
  function patche(arr) {
    if (arr.__es) return;
    Object.defineProperty(arr, "__es", { value: true });
    ["push", "unshift"].forEach((m) => {
      const o = arr[m];
      Object.defineProperty(arr, m, { configurable: true, writable: true, value: function () { const ids = [...arguments].map((x) => x && x.id); const r = o.apply(this, arguments); angemeldet(ids); return r; } });
    });
  }
  patche(LISTE);

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
