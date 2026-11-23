// Fahrlehrer-Kompass – Zahlungsaufforderung per Mail (Auftrag 4, Werkstatt 11, 24.11.2026).
// Büro drückt „Zahlungsaufforderung verschicken“ -> diese Funktion ruft rpc zahlungs_mail_vorbereiten (prüft ALLES:
// Rolle, Fahrschule, Betrag, Zahlungsdaten, Limit, bestimmt den Empfänger selbst) und verschickt dann über Resend.
// Deploy mit verify_jwt = false (die Funktion prüft den Anmelde-Token über die Datenbank-Funktion selbst).
// Nie die volle Empfänger-Adresse zurückgeben. Im Testmodus: [TEST] im Betreff und gelber Kasten in der Mail.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { absender, base64, betreff, epcText, mailHtml, mailText, qrPng } from "./mail.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ fehler: "nur_post" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ fehler: "ungueltige_anfrage" }, 400); }
  const { requester_token, buero_sitzung, schueler_id, art, betrag_cent, wofuer } = body || {};
  if (!requester_token) return json({ fehler: "nicht_angemeldet" }, 401);
  if (!schueler_id || !art || !Number.isInteger(betrag_cent)) return json({ fehler: "ungueltige_anfrage" }, 400);

  const headers: Record<string, string> = { Authorization: "Bearer " + requester_token };
  if (buero_sitzung) headers["x-buero-sitzung"] = String(buero_sitzung);
  const user = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { global: { headers }, auth: { persistSession: false } });
  const service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const { data: d, error: rpcErr } = await user.rpc("zahlungs_mail_vorbereiten", {
    p_schueler: String(schueler_id), p_art: String(art), p_betrag_cent: betrag_cent, p_wofuer: String(wofuer ?? ""),
  });
  if (rpcErr) return json({ fehler: "vorbereiten_fehlgeschlagen" }, 400);
  if (!d || d.fehler || !d.ok) return json({ fehler: d?.fehler || "unbekannt" }, 400);

  const merke = async (felder: Record<string, unknown>) => {
    const { error } = await service.from("zahlungs_mails").update(felder).eq("id", d.id);
    if (error) console.warn("zahlungs_mails update:", error.message);
  };
  const scheitern = async (kurz: string, status = 500) => {
    await merke({ status: "fehler", fehler: kurz.slice(0, 200) });
    return json({ fehler: "versand_fehlgeschlagen", grund: kurz.split(":")[0].slice(0, 40) }, status);
  };

  try {
    const { data: key, error: keyErr } = await service.rpc("get_decrypted_secret", { secret_name: "resend_api_key" });
    if (keyErr || !key) return await scheitern("Resend-Schluessel fehlt");

    // Sichere Seite: alles außer „echt“ gilt als Test
    if (d.modus !== "echt") d.modus = "test";
    let betrf = betreff(d);
    if (d.modus === "test" && !betrf.startsWith("[TEST] ")) betrf = "[TEST] " + betrf;
    const png = await qrPng(epcText(d));

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: absender(d),
        to: [d.empfaenger],
        subject: betrf,
        html: mailHtml(d),
        text: mailText(d),
        attachments: [{ filename: "girocode.png", content: base64(png), content_type: "image/png", content_id: "girocode" }],
      }),
    });
    const antwort: any = await res.json().catch(() => ({}));
    if (!res.ok) return await scheitern("Resend " + res.status + ": " + String(antwort?.message || antwort?.name || "").slice(0, 120), 502);

    const gesendetAm = new Date().toISOString();
    await merke({ status: "gesendet", resend_id: antwort?.id ?? null, gesendet_am: gesendetAm, fehler: null });
    const e = String(d.empfaenger);
    return json({ ok: true, id: d.id, modus: d.modus, gesendet_am: gesendetAm, empfaenger_kurz: e.slice(0, 1) + "***@" + e.split("@")[1] });
  } catch (e) {
    console.warn("zahlungs-mail:", String(e).slice(0, 200));
    return await scheitern("Fehler beim Versand");
  }
});
