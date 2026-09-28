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
    impressum: "https://fahrschule-boost.de/impressum/",   // TODO: eigenes Impressum klären
    datenschutz: "https://fahrschule-boost.de/datenschutz/"
  },

  // Das große Kinobild im Hintergrund.
  // TODO: Bild in voller Größe ohne Schrift (Querformat) und optional eine Hochformat-Version fürs Handy.
  // scheinwerfer: Position der Scheinwerfer im Bild (0 = links/oben, 1 = rechts/unten) für das Aufblenden.
  kino: {
    bild: "img/hero.jpg",
    bildHandy: "",
    scheinwerfer: [[0.67, 0.617], [0.445, 0.612]],
    strasse: [0.8, 1.0], // Bereich (von oben nach unten), in dem die Lichtstreifen über die Straße ziehen
    regen: true
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
