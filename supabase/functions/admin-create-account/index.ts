// Fahrlehrer-Kompass – Konten anlegen, Passwort neu erzeugen, Einladung per E-Mail senden.
// Kopie der in Supabase laufenden Funktion (Projekt oectrvkjunntzsggyhxv, verify_jwt = false:
// die Funktion prüft den Anmelde-Token und die Rolle selbst). Version 7 (30.10.2026): Einladungs-Mail.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const APP_URL = "https://serband1995-hue.github.io/Fahrlehrer-Kompass-/";
const ABSENDER = "Fahrlehrer-Kompass <termine@fahr-akademie.info>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function randomPassword(n = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function klassenListe(k: unknown): string[] {
  if (!Array.isArray(k)) return [];
  return [...new Set(k.map((x) => String(x)).filter((x) => /^[A-Z0-9+]{1,6}$/.test(x)))].sort();
}

function esc(s: string): string {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// ---------- Einladungs-Mail ----------
// Der Link führt über eine feste Seite (einladung.html). Erst ein Klick dort löst den Passwort-Link aus,
// damit Virenscanner von Mail-Programmen den einmaligen Link nicht vorab verbrauchen.
async function einladungsLink(supa: any, email: string): Promise<string | null> {
  const { data, error } = await supa.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: APP_URL } });
  const aktion = data?.properties?.action_link;
  if (error || !aktion) { console.warn("Einladungslink fehlgeschlagen:", error?.message); return null; }
  return APP_URL + "einladung.html#" + encodeURIComponent(aktion);
}

async function sendEmail(supa: any, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const { data: key, error } = await supa.rpc("get_decrypted_secret", { secret_name: "resend_api_key" });
    if (error || !key) { console.warn("Kein Resend-Key, Einladung nicht gesendet."); return false; }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: ABSENDER, to: [to], subject, html }),
    });
    if (!res.ok) console.warn("Resend Fehler:", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.warn("E-Mail-Versand fehlgeschlagen:", String(e));
    return false;
  }
}

function einladungsHtml(name: string, rolle: string, link: string, vonName: string): string {
  const vorname = esc(String(name || "").trim().split(" ")[0] || "");
  const knopf = `display:inline-block;background:#3a7350;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px;font-size:16px;`;
  const schritt = `margin:22px 0 6px;font-size:16px;font-weight:700;color:#2a2a24;`;
  const buero = rolle === "buero" || rolle === "fahrschule_admin";
  const geraete = buero
    ? `<p style="${schritt}">2. Büro-Seite öffnen</p>
       <p>Die Büro-Seite ist für den PC gemacht. Öffne diese Adresse im Browser und melde dich mit deiner E-Mail und dem neuen Passwort an:</p>
       <p><a href="${APP_URL}buero.html" style="color:#3a7350;">${APP_URL}buero.html</a></p>
       <p>Beim ersten Mal wählst du deinen Namen und legst eine eigene 4-stellige PIN fest. Wenn das nicht geht, bitte Serband oder Murat, die PIN für dich freizugeben.</p>
       <p style="font-size:14px;color:#5a5a50;">Tipp: Im Browser kannst du die Seite als App installieren (Symbol in der Adresszeile oder Menü „App installieren“).</p>`
    : `<p style="${schritt}">2. App aufs Handy legen</p>
       <p><b>Android (Chrome):</b> Öffne <a href="${APP_URL}" style="color:#3a7350;">${APP_URL}</a>, tippe oben rechts auf die drei Punkte und dann auf „App installieren“.<br>
       <b>iPhone (Safari):</b> Öffne die Adresse, tippe auf das Teilen-Symbol und dann auf „Zum Home-Bildschirm“.</p>
       <p style="font-size:14px;color:#5a5a50;">Bei Samsung bitte Chrome nehmen, nicht „Samsung Internet“.</p>`;
  return `<div style="font-family:-apple-system,Arial,sans-serif;max-width:520px;margin:0 auto;padding:22px;background:#f3f1e9;color:#2a2a24;line-height:1.5;">
    <h2 style="color:#3a7350;margin:0 0 14px;">Willkommen im Fahrlehrer-Kompass</h2>
    <p>Hallo ${vorname},</p>
    <p>${esc(vonName || "Die Fahrschul-Leitung")} hat für dich einen Zugang angelegt. Es sind nur zwei Schritte:</p>
    <p style="${schritt}">1. Passwort festlegen</p>
    <p><a href="${esc(link)}" style="${knopf}">Passwort festlegen</a></p>
    <p style="font-size:14px;color:#5a5a50;">Der Link funktioniert nur einmal und nur eine begrenzte Zeit. Ist er abgelaufen, tippe in der Anmeldung auf „Passwort vergessen?“ und gib diese E-Mail-Adresse ein. Beim ersten Anmelden bestätigst du die Nutzungsbedingungen.</p>
    ${geraete}
    <p style="font-size:12.5px;color:#8a8a80;margin-top:26px;">Diese Mail ging nur an dich. Wenn du sie nicht erwartet hast, antworte bitte nicht darauf, sondern sag der Fahrschul-Leitung Bescheid.</p>
  </div>`;
}

async function sendeEinladung(supa: any, email: string, name: string, rolle: string, vonName: string): Promise<boolean> {
  const link = await einladungsLink(supa, email);
  if (!link) return false;
  return await sendEmail(supa, email, "Dein Zugang zum Fahrlehrer-Kompass", einladungsHtml(name, rolle, link, vonName));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, requester_token } = body;
    if (!requester_token) return json({ error: "Nicht angemeldet" }, 401);

    const supa = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

    const { data: userData, error: userErr } = await supa.auth.getUser(requester_token);
    if (userErr || !userData?.user) return json({ error: "Session ungueltig: " + (userErr?.message || "kein User") }, 401);
    const { data: requesterProfile, error: profErr } = await supa.from("profiles").select("id, rolle, fahrschule_id, aktiv, name").eq("id", userData.user.id).maybeSingle();
    if (profErr) return json({ error: "Profil-Lookup fehlgeschlagen: " + profErr.message }, 500);
    if (!requesterProfile || !requesterProfile.aktiv) return json({ error: "Kein aktiver Zugang" }, 403);

    const isSuperAdmin = requesterProfile.rolle === "super_admin";
    const isFahrschuleAdmin = requesterProfile.rolle === "fahrschule_admin";

    // Gemeinsames Büro-Konto: Büro-Person mit Verwalten-Recht (PIN-Sitzung) darf Fahrlehrer anlegen
    let isBueroVerwalter = false;
    let bueroPersonName: string | null = null;
    if (requesterProfile.rolle === "buero" && typeof body.buero_sitzung === "string" && body.buero_sitzung.length >= 32) {
      const hash = await sha256Hex(body.buero_sitzung);
      const { data: sitzung } = await supa.from("buero_sitzungen").select("person_id, fahrschule_id, user_id, laeuft_ab, nur_pin_aendern").eq("token_hash", hash).maybeSingle();
      if (sitzung && sitzung.user_id === requesterProfile.id && !sitzung.nur_pin_aendern && new Date(sitzung.laeuft_ab) > new Date() && sitzung.fahrschule_id === requesterProfile.fahrschule_id) {
        const { data: person } = await supa.from("buero_personen").select("aktiv, darf_verwalten, name").eq("id", sitzung.person_id).maybeSingle();
        isBueroVerwalter = !!(person && person.aktiv && person.darf_verwalten);
        if (isBueroVerwalter) bueroPersonName = person?.name || null;
      }
    }
    const vonName = bueroPersonName || requesterProfile.name || "Die Fahrschul-Leitung";

    if (action === "create_account") {
      const { name, rolle, fahrschule_id } = body;
      const ohneApp = body.ohne_app === true;
      let email = body.email;
      if (!rolle) return json({ error: "rolle erforderlich" }, 400);
      if (ohneApp && rolle !== "fahrlehrer") return json({ error: "Ohne App geht nur bei Fahrlehrern" }, 400);
      if (ohneApp && !(name && String(name).trim())) return json({ error: "Bitte einen Namen eintragen" }, 400);
      if (ohneApp) email = `ohne-app-${crypto.randomUUID()}@ohne-app.invalid`;
      if (!email) return json({ error: "email und rolle erforderlich" }, 400);
      const erlaubteRollenFuerFsAdmin = ["fahrlehrer", "buero"];

      let zielFahrschuleId = fahrschule_id;
      if (isSuperAdmin) {
        if (!zielFahrschuleId) return json({ error: "fahrschule_id erforderlich" }, 400);
      } else if (isFahrschuleAdmin) {
        if (!erlaubteRollenFuerFsAdmin.includes(rolle)) return json({ error: "Fahrschule-Admins duerfen nur Fahrlehrer oder Buero-Zugaenge anlegen" }, 403);
        zielFahrschuleId = requesterProfile.fahrschule_id;
      } else if (isBueroVerwalter) {
        if (rolle !== "fahrlehrer") return json({ error: "Das Büro darf nur Fahrlehrer anlegen" }, 403);
        zielFahrschuleId = requesterProfile.fahrschule_id;
      } else {
        return json({ error: "Keine Berechtigung" }, 403);
      }

      // Ohne App: langes Zufallspasswort, das niemand erfährt (Anmeldung ist so nicht möglich)
      const passwort = randomPassword(ohneApp ? 32 : 12);
      const { data: neuerUser, error: createErr } = await supa.auth.admin.createUser({
        email, password: passwort, email_confirm: true,
      });
      if (createErr || !neuerUser?.user) return json({ error: createErr?.message || "Anlegen fehlgeschlagen" }, 500);

      const { error: profilErr } = await supa.from("profiles").insert({
        id: neuerUser.user.id, email, name: name || null, rolle, fahrschule_id: zielFahrschuleId, aktiv: true,
        ohne_app: ohneApp, klassen: klassenListe(body.klassen),
      });
      if (profilErr) return json({ error: profilErr.message }, 500);

      if (ohneApp) return json({ ohne_app: true, id: neuerUser.user.id, rolle, fahrschule_id: zielFahrschuleId });

      // Einladung per E-Mail (nur wenn die App das ausdrücklich will). Klappt der Versand, bleibt das
      // Passwort unbekannt: die Person legt sich selbst eines fest. Sonst bekommt die Verwaltung es angezeigt.
      const mailGesendet = body.einladung_senden === true ? await sendeEinladung(supa, email, name || "", rolle, vonName) : false;
      if (mailGesendet) return json({ email, rolle, fahrschule_id: zielFahrschuleId, mail_gesendet: true });
      return json({ email, passwort, rolle, fahrschule_id: zielFahrschuleId, mail_gesendet: false });
    }

    if (action === "reset_password") {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: "target_user_id erforderlich" }, 400);

      const { data: zielProfil } = await supa.from("profiles").select("id, rolle, fahrschule_id, ohne_app").eq("id", target_user_id).maybeSingle();
      if (!zielProfil) return json({ error: "Zugang nicht gefunden" }, 404);
      if (zielProfil.ohne_app) return json({ error: "Dieser Fahrlehrer hat keinen App-Zugang" }, 400);

      const darfAendern = isSuperAdmin || (isFahrschuleAdmin && ["fahrlehrer","buero"].includes(zielProfil.rolle) && zielProfil.fahrschule_id === requesterProfile.fahrschule_id);
      if (!darfAendern) return json({ error: "Keine Berechtigung" }, 403);

      const neuesPasswort = randomPassword();
      const { error: pwErr } = await supa.auth.admin.updateUserById(target_user_id, { password: neuesPasswort });
      if (pwErr) return json({ error: pwErr.message }, 500);

      return json({ passwort: neuesPasswort });
    }

    if (action === "send_invite") {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: "target_user_id erforderlich" }, 400);

      const { data: zielProfil } = await supa.from("profiles").select("id, rolle, fahrschule_id, ohne_app, email, name, aktiv").eq("id", target_user_id).maybeSingle();
      if (!zielProfil) return json({ error: "Zugang nicht gefunden" }, 404);
      if (zielProfil.ohne_app || !zielProfil.email) return json({ error: "Dieser Zugang hat keine E-Mail-Adresse" }, 400);
      if (zielProfil.rolle === "super_admin") return json({ error: "Für den Super-Admin gibt es keine Einladung" }, 403);
      if (!zielProfil.aktiv) return json({ error: "Dieser Zugang ist gesperrt" }, 400);

      const gleicheSchule = zielProfil.fahrschule_id === requesterProfile.fahrschule_id;
      const darf = isSuperAdmin
        || (isFahrschuleAdmin && ["fahrlehrer", "buero"].includes(zielProfil.rolle) && gleicheSchule)
        || (isBueroVerwalter && zielProfil.rolle === "fahrlehrer" && gleicheSchule);
      if (!darf) return json({ error: "Keine Berechtigung" }, 403);

      const ok = await sendeEinladung(supa, zielProfil.email, zielProfil.name || "", zielProfil.rolle, vonName);
      if (!ok) return json({ error: "Die E-Mail konnte nicht verschickt werden. Bitte stattdessen ein neues Passwort erzeugen und weitergeben." }, 502);
      return json({ ok: true, email: zielProfil.email });
    }

    return json({ error: "Unbekannte action: " + action }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
