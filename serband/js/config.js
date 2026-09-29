/* ============================================================
   INHALTE DER SEITE – hier änderst du Texte, Links und Bilder.
   Alles, was mit  TODO  markiert ist, fehlt noch von Serband.
   ============================================================ */

export const CONFIG = {
  name: "Serband",
  rolle: "Fahrlehrer",
  schule: "Fahrschule Boost",
  ort: "Offenbach am Main",

  links: {
    // Die beiden Buchungskalender
    kalenderSchalter: "https://service.fahrschule-boost.de/widget/bookings/fahrlehrer-serband",
    kalenderAutomatik: "https://service.fahrschule-boost.de/widget/bookings/geteilter-kalender-1",
    // Die Fahr-Akademie (Lern-App mit Videos)
    akademie: "https://serband1995-hue.github.io/Fahr-Akademie-/",
    // TODO: direkter Link "Rezension schreiben" aus deinem Google-Profil
    bewerten: "https://www.google.com/maps/search/?api=1&query=Fahrschule+Boost+Offenbach",
    schule: "https://fahrschule-boost.de/",
    preise: "https://fahrschule-boost.de/",
    telefon: "+496936605670",
    telefonAnzeige: "069 · 36 60 56 70",
    whatsapp: "https://wa.me/496936605670",
    instagram: "", // TODO: z. B. "https://instagram.com/deinname"
    tiktok: "",    // TODO
    impressum: "impressum.html",     // TODO: markierte Stellen in impressum.html ausfüllen
    datenschutz: "datenschutz.html"  // TODO: markierte Stellen in datenschutz.html ausfüllen
  },

  // Hintergrund pro Kapitel. Sobald die neuen Videos da sind, hier eintragen:
  //   video: ["img/szene-….mp4", "img/szene-….webm"]  (wird beim Scrollen gespult)
  //   bild / bildHandy: Standbild (Quer / Hoch), fokus: Bildausschnitt
  //   fahrt: seitliche Kamerabewegung (-1 … 1)
  szenen: {
    standard: { bild: "img/hero.jpg", bildHandy: "img/hero-mobile.jpg", fokus: "70% 50%" },
    prolog: { video: ["img/szene-prolog.mp4", "img/szene-prolog.webm"], bild: "img/hero-drive-poster.jpg", bildHandy: "img/hero-mobile.jpg", fokus: "72% 50%", fokusHandy: "62% 50%" },
    ruhe: { bild: "img/hero.jpg", bildHandy: "img/hero-mobile.jpg", fokus: "30% 40%", fokusHandy: "50% 30%", fahrt: 0.4 },
    typ: { bild: "img/hero.jpg", bildHandy: "img/hero-mobile.jpg", fokus: "85% 20%", fokusHandy: "80% 40%", fahrt: -0.4 },
    versprechen: { bild: "img/hero.jpg", bildHandy: "img/hero-mobile.jpg", fokus: "60% 30%", fokusHandy: "55% 45%", fahrt: 0.3 },
    werkzeuge: { bild: "img/hero.jpg", bildHandy: "img/hero-mobile.jpg", fokus: "72% 70%", fokusHandy: "45% 75%", fahrt: -0.3 },
    weg: { bild: "img/hero.jpg", bildHandy: "img/hero-mobile.jpg", fokus: "40% 95%", fokusHandy: "50% 95%", fahrt: 0.5 },
    los: { bild: "img/hero.jpg", bildHandy: "img/hero-mobile.jpg", fokus: "70% 55%", fokusHandy: "45% 70%", fahrt: -0.2 },
    epilog: { video: ["img/szene-prolog.mp4", "img/szene-prolog.webm"], bild: "img/hero-drive-poster.jpg", bildHandy: "img/hero-mobile.jpg", fokus: "72% 50%", fokusHandy: "62% 50%" }
  },

  // TODO: echte Screenshots (Schülernamen unkenntlich!). Leer = Beispielansicht.
  screenshots: {
    kompass: "",          // z. B. "img/app-kompass.jpg" (Querformat)
    "akademie-lernen": "",
    "akademie-video": "",
    "akademie-szenen": ""
  },

  // Bestenliste des Reaktionstests (Supabase-Projekt „fahr-akademie“, getrennte Tabelle).
  // Öffentlicher Schlüssel (für Webseiten gedacht). Was er darf, regeln die Datenbankregeln:
  // Besucher können nur die Top 5 lesen und eine Zeit eintragen, sonst nichts.
  bestenliste: {
    url: "https://fxgljvhpikjcejhghgbp.supabase.co",
    key: "sb_publishable_XiBZufRB7XMpxhJwfWxKFA_PmtFC6ly"
  },

  // TODO: eigene Fotos in den Ordner serband/img legen und hier eintragen,
  // z. B. "img/serband-portrait.jpg". Leer = eleganter Platzhalter.
  fotos: {
    portrait: "",
    imAuto: ""
  },

  // TODO: Videos aus der Ausbildung (mp4 in serband/img oder leer lassen).
  // Leer = es läuft eine Animation an dieser Stelle.
  videos: {
    theorie: "",
    fahrstunde: "",
    pruefung: ""
  },

  // TODO: echte Zahlen. Einträge mit wert: null werden nicht angezeigt.
  zahlen: [
    { wert: null, suffix: "+", label: "bestandene Prüfungen" },
    { wert: null, suffix: "", label: "Jahre am Steuer" },
    { wert: null, suffix: "", label: "Sterne bei Google", dezimal: 1, stern: true },
    { wert: 90, suffix: " Min", label: "pro Doppelstunde" }
  ],

  // TODO: deine echten Bewertungen. Solange platzhalter: true gesetzt ist,
  // sieht man deutlich, dass hier noch echte Texte fehlen.
  bewertungen: [
    { platzhalter: true, name: "Name", quelle: "Google", sterne: 5, text: "Hier kommt deine echte Bewertung Nr. 1 hin, Wort für Wort aus Google übernommen." },
    { platzhalter: true, name: "Name", quelle: "Google", sterne: 5, text: "Hier kommt deine echte Bewertung Nr. 2 hin." },
    { platzhalter: true, name: "Name", quelle: "Google", sterne: 5, text: "Hier kommt deine echte Bewertung Nr. 3 hin." },
    { platzhalter: true, name: "Name", quelle: "Google", sterne: 5, text: "Hier kommt deine echte Bewertung Nr. 4 hin." },
    { platzhalter: true, name: "Name", quelle: "Google", sterne: 5, text: "Hier kommt deine echte Bewertung Nr. 5 hin." }
  ]
};
