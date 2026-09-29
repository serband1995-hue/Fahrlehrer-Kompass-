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

  // Hintergrund pro Kapitel: ein Video quer (Computer, Tablet quer) und eins hoch (Handy).
  // Die Videos werden beim Scrollen gespult, deshalb kurzer Keyframe-Abstand (ffmpeg -g 4).
  //   video / videoHandy: [MP4, WebM]
  //   bild / bildHandy: Standbild = erstes Bild des Videos (wird gezeigt, bis das Video geladen ist)
  //   fokus / fokusHandy: Bildausschnitt, wenn das Seitenverhältnis nicht genau passt
  //   weich / weichHandy: unscharfe Fassung für den Tiefeneffekt (nur „Mein Versprechen“)
  //   fahrt: zusätzliche seitliche Bewegung (-1 … 1), bei Videos meist 0
  szenen: {
    standard: { bild: "img/hero.jpg", bildHandy: "img/hero-mobile.jpg", fokus: "70% 50%" },
    prolog: { video: ["img/szene-prolog.mp4", "img/szene-prolog.webm"], videoHandy: ["img/szene-prolog-hoch.mp4", "img/szene-prolog-hoch.webm"], bild: "img/szene-prolog.jpg", bildHandy: "img/szene-prolog-hoch.jpg", fokus: "68% 50%", fokusHandy: "50% 50%" },
    ruhe: { video: ["img/szene-ruhe.mp4", "img/szene-ruhe.webm"], videoHandy: ["img/szene-ruhe-hoch.mp4", "img/szene-ruhe-hoch.webm"], bild: "img/szene-ruhe.jpg", bildHandy: "img/szene-ruhe-hoch.jpg", fokus: "68% 50%", fokusHandy: "50% 50%" },
    typ: { video: ["img/szene-typ.mp4", "img/szene-typ.webm"], videoHandy: ["img/szene-typ-hoch.mp4", "img/szene-typ-hoch.webm"], bild: "img/szene-typ.jpg", bildHandy: "img/szene-typ-hoch.jpg", fokus: "60% 50%", fokusHandy: "40% 50%" },
    versprechen: { video: ["img/szene-versprechen.mp4", "img/szene-versprechen.webm"], videoHandy: ["img/szene-versprechen-hoch.mp4", "img/szene-versprechen-hoch.webm"], bild: "img/szene-versprechen.jpg", bildHandy: "img/szene-versprechen-hoch.jpg", weich: "img/szene-versprechen-weich.jpg", weichHandy: "img/szene-versprechen-hoch-weich.jpg", fokus: "68% 50%", fokusHandy: "50% 50%" },
    werkzeuge: { video: ["img/szene-werkzeuge.mp4", "img/szene-werkzeuge.webm"], videoHandy: ["img/szene-werkzeuge-hoch.mp4", "img/szene-werkzeuge-hoch.webm"], bild: "img/szene-werkzeuge.jpg", bildHandy: "img/szene-werkzeuge-hoch.jpg", fokus: "50% 50%", fokusHandy: "50% 50%" },
    weg: { video: ["img/szene-weg.mp4", "img/szene-weg.webm"], videoHandy: ["img/szene-weg-hoch.mp4", "img/szene-weg-hoch.webm"], bild: "img/szene-weg.jpg", bildHandy: "img/szene-weg-hoch.jpg", fokus: "58% 50%", fokusHandy: "50% 50%" },
    los: { video: ["img/szene-los.mp4", "img/szene-los.webm"], videoHandy: ["img/szene-los-hoch.mp4", "img/szene-los-hoch.webm"], bild: "img/szene-los.jpg", bildHandy: "img/szene-los-hoch.jpg", fokus: "65% 50%", fokusHandy: "50% 50%" },
    epilog: { video: ["img/szene-prolog.mp4", "img/szene-prolog.webm"], videoHandy: ["img/szene-prolog-hoch.mp4", "img/szene-prolog-hoch.webm"], bild: "img/szene-prolog.jpg", bildHandy: "img/szene-prolog-hoch.jpg", fokus: "68% 50%", fokusHandy: "50% 50%" }
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

  // Fotos: jeweils groß (src) und klein fürs Handy. Leer ("") = Foto wird ausgeblendet.
  //   portrait:   „Mein Versprechen“ (Kapitel III)
  //   unterricht: Theorieunterricht (Kapitel I) – alle erkennbaren Personen haben eingewilligt
  fotos: {
    portrait: { src: "img/serband-portrait-1000.jpg", klein: "img/serband-portrait-640.jpg", breite: 1000, kleinBreite: 640 },
    unterricht: { src: "img/serband-unterricht-1600.jpg", klein: "img/serband-unterricht-900.jpg", breite: 1600, kleinBreite: 900 }
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
