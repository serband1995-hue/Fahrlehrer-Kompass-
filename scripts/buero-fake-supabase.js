/* Nur für Tests: ersetzt supabase-js im Browser durch eine Attrappe mit Daten im Speicher.
   scripts/buero-test.mjs liefert diese Datei statt der echten Bibliothek aus.
   Die Testdaten setzt der Test über window.__FAKE (Tabellen, Sitzung). Alle Namen sind erfunden. */
(function () {
  "use strict";
  const F = window.__FAKE || { tabellen: {}, session: null };
  F.log = [];
  F.tabellen = F.tabellen || {};
  F.rpcs = F.rpcs || {};
  F.functions = F.functions || {};
  window.__FAKE = F;

  function kopie(x) { return JSON.parse(JSON.stringify(x)); }
  function tabelle(name) { if (!F.tabellen[name]) F.tabellen[name] = []; return F.tabellen[name]; }

  class Abfrage {
    constructor(name) { this.name = name; this.filter = []; this.art = "select"; this.einzeln = null; this.sort = []; this.grenze = null; this.nachher = false; }
    select() { if (this.art !== "select") this.nachher = true; return this; }
    eq(k, v) { this.filter.push((r) => r[k] === v); return this; }
    neq(k, v) { this.filter.push((r) => r[k] !== v); return this; }
    in(k, l) { this.filter.push((r) => l.includes(r[k])); return this; }
    gte(k, v) { this.filter.push((r) => r[k] != null && r[k] >= v); return this; }
    lte(k, v) { this.filter.push((r) => r[k] != null && r[k] <= v); return this; }
    lt(k, v) { this.filter.push((r) => r[k] != null && r[k] < v); return this; }
    gt(k, v) { this.filter.push((r) => r[k] != null && r[k] > v); return this; }
    is(k, v) { this.filter.push((r) => (r[k] == null ? null : r[k]) === v); return this; }
    not(k, op, v) { if (op === "is") this.filter.push((r) => (r[k] == null ? null : r[k]) !== v); return this; }
    order(k, o) { this.sort.push([k, !(o && o.ascending === false)]); return this; }
    limit(n) { this.grenze = n; return this; }
    single() { this.einzeln = "single"; return this; }
    maybeSingle() { this.einzeln = "maybe"; return this; }
    insert(rows) { this.art = "insert"; this.daten = Array.isArray(rows) ? rows : [rows]; return this; }
    upsert(rows, opt) { this.art = "upsert"; this.daten = Array.isArray(rows) ? rows : [rows]; this.konflikt = (opt && opt.onConflict) || "id"; return this; }
    update(werte) { this.art = "update"; this.werte = werte; return this; }
    delete() { this.art = "delete"; return this; }
    passt(r) { return this.filter.every((f) => f(r)); }
    ausfuehren() {
      const t = tabelle(this.name);
      if (F.fehler && F.fehler[this.name]) return { data: null, error: { message: F.fehler[this.name] } };
      let daten;
      if (this.art === "insert") {
        daten = this.daten.map((r) => Object.assign({ id: r.id || ("fake-" + Math.random().toString(36).slice(2, 10)), erstellt_am: new Date().toISOString() }, kopie(r)));
        t.push(...daten);
      } else if (this.art === "upsert") {
        const k = this.konflikt.split(",");
        daten = this.daten.map((r) => {
          const alt = t.find((x) => k.every((s) => x[s] === r[s]));
          if (alt) { Object.assign(alt, kopie(r)); return alt; }
          const neu = Object.assign({ id: r.id || ("fake-" + Math.random().toString(36).slice(2, 10)) }, kopie(r)); t.push(neu); return neu;
        });
      } else if (this.art === "update") {
        daten = t.filter((r) => this.passt(r));
        daten.forEach((r) => Object.assign(r, kopie(this.werte)));
      } else if (this.art === "delete") {
        daten = t.filter((r) => this.passt(r));
        F.tabellen[this.name] = t.filter((r) => !this.passt(r));
      } else {
        daten = t.filter((r) => this.passt(r));
        for (const [k, auf] of this.sort.slice().reverse()) {
          daten = daten.slice().sort((a, b) => { const x = a[k], y = b[k]; if (x == y) return 0; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : 1) * (auf ? 1 : -1); });
        }
        if (this.grenze != null) daten = daten.slice(0, this.grenze);
      }
      F.log.push({ tabelle: this.name, art: this.art, anzahl: daten.length, werte: this.werte || this.daten || null });
      daten = kopie(daten);
      if (this.einzeln) {
        if (daten.length === 0) return this.einzeln === "single" ? { data: null, error: { message: "keine Zeile" } } : { data: null, error: null };
        return { data: daten[0], error: null };
      }
      return { data: (this.art === "select" || this.nachher) ? daten : null, error: null };
    }
    then(ok, nein) { return Promise.resolve(this.ausfuehren()).then(ok, nein); }
  }

  window.supabase = {
    createClient() {
      return {
        from: (name) => new Abfrage(name),
        rpc: async (name, args) => {
          F.log.push({ rpc: name, args });
          const f = F.rpcs[name];
          if (!f) return { data: null, error: { message: "rpc fehlt: " + name } };
          try { return { data: await f(args, F), error: null }; } catch (e) { return { data: null, error: { message: e.message } }; }
        },
        functions: {
          invoke: async (name, opt) => {
            F.log.push({ function: name, body: opt && opt.body });
            const f = F.functions[name];
            if (!f) return { data: null, error: { message: "function fehlt: " + name } };
            try { return { data: await f(opt && opt.body, F), error: null }; } catch (e) { return { data: null, error: { message: e.message } }; }
          }
        },
        auth: {
          getSession: async () => ({ data: { session: F.session }, error: null }),
          getUser: async () => ({ data: { user: F.session && F.session.user }, error: null }),
          signInWithPassword: async ({ email, password }) => {
            const k = (F.konten || []).find((x) => x.email === email && x.password === password);
            if (!k) return { data: {}, error: { message: "Invalid login credentials" } };
            F.session = { user: { id: k.id, email } };
            return { data: { user: F.session.user, session: F.session }, error: null };
          },
          signOut: async () => { F.session = null; return { error: null }; },
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        },
      };
    },
  };
})();
