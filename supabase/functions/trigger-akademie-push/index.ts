// Fahrlehrer-Kompass: sichere Zwischenstation zur Fahr-Akademie (Push nach dem Video-Tipp).
// Läuft nur für angemeldete Kompass-Nutzer (verify_jwt: true) und hält das gemeinsame Geheimnis
// auf dem Server. Es landet nie im Code der App.
//
// K1 (11.11.2026), Funde KD2, KA2, BR2:
//  · Der Aufrufer braucht ein aktives Profil mit Fahrschule. Ein Konto ohne Fahrschule
//    (so entsteht jedes selbst registrierte Konto) oder ein gesperrtes Konto wird abgewiesen.
//  · Der freie Text "nachricht" wird nicht mehr angenommen. Die App hat ihn nie geschickt;
//    die Akademie nimmt dann ihren festen Text.
//  · tag_id und stufe werden nur als kurze Kennungen durchgereicht.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AKADEMIE_FUNCTION_URL = "https://fxgljvhpikjcejhghgbp.supabase.co/functions/v1/academy-send-notification";

function svc() {
  return createClient(SUPA_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getSecret(name: string): Promise<string | null> {
  const { data, error } = await svc().rpc("get_decrypted_secret", { secret_name: name });
  if (error) return null;
  return data || null;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders() } });
}

// Kurze Kennung (Buchstaben, Ziffern, _ . : -), sonst nichts. Kein freier Text.
function kennung(v: unknown): string | undefined {
  if (typeof v !== "string" && typeof v !== "number") return undefined;
  const s = String(v).trim();
  return /^[A-Za-z0-9_.:\-]{1,80}$/.test(s) ? s : undefined;
}
// Telefonnummer: kurzer Text mit mindestens 4 Ziffern. Die Akademie vereinheitlicht die Schreibweise selbst;
// hier wird nur abgewiesen, was sicher keine Nummer ist (kein Text, zu lang, kaum Ziffern).
function telefonnummer(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).trim();
  if (s.length > 60 || (s.match(/[0-9]/g) || []).length < 4) return null;
  return s;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    // Angemeldeten Nutzer aus dem Authorization-Kopf ermitteln. Name und Kürzel kommen aus dem Profil,
    // nie aus der Anfrage, damit sie im Akademie-Protokoll nicht gefälscht werden können.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supa = svc();
    const { data: userData, error: userErr } = await supa.auth.getUser(token);
    if (userErr || !userData?.user) return json({ ok: false, error: "nicht_eingeloggt" }, 401);

    const { data: profil, error: profilErr } = await supa
      .from("profiles")
      .select("name, slug, email, aktiv, rolle, fahrschule_id")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profilErr) return json({ ok: false, error: "profil_nicht_lesbar" }, 500);
    if (!profil || profil.aktiv !== true) return json({ ok: false, error: "konto_gesperrt" }, 403);
    if (!profil.fahrschule_id) return json({ ok: false, error: "keine_fahrschule" }, 403);

    const body = await req.json().catch(() => null);
    const telefon = telefonnummer(body?.telefon);
    if (!telefon) return json({ ok: false, error: "telefon_fehlt" }, 400);

    const bridgeSecret = await getSecret("akademie_bridge_secret");
    if (!bridgeSecret) return json({ ok: false, error: "secret_nicht_konfiguriert" }, 500);

    const ausgeloestVon = (profil.name || profil.email || "Fahrlehrer (Kompass)") as string;

    const res = await fetch(AKADEMIE_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bridge-secret": bridgeSecret },
      body: JSON.stringify({
        telefon,
        tag_id: kennung(body?.tag_id),
        stufe: kennung(body?.stufe),
        ausgeloest_von: ausgeloestVon,
        fahrlehrer_slug: profil.slug || undefined,
      }),
    });

    const akademieAntwort = await res.json().catch(() => ({ ok: false, error: "ungueltige_antwort_von_akademie" }));
    return json(akademieAntwort, res.status);
  } catch (e) {
    console.error("trigger-akademie-push:", e instanceof Error ? e.message : String(e));
    return json({ ok: false, error: "serverfehler" }, 500);
  }
});
