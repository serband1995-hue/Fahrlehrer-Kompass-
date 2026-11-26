/* Kompass – Liste der Prüfungsfehler (Durchfallgründe), EINE Quelle für App (index.html) und Büro-Seite (buero.html).
   Die Kennungen (io_beob, …) stehen in der Datenbank (kalender_pruefungen.payload.faults); die Beschriftungen kommen nur von hier.
   Neue Fehler nur hier ergänzen, nie in index.html oder buero.js. */
const FAULTS=[
 {area:"Innerorts", items:[
   ["io_beob","Verkehrsbeobachtung (Schulterblick/Spiegel)"],
   ["io_vorfahrt","Vorfahrt missachtet (rechts vor links)"],
   ["io_stop","Stoppschild überfahren"],
   ["io_rot","Rotlichtverstoß"],
   ["io_abbieg","Doppelspuriges Abbiegen falsch"],
   ["io_einbahn","Falsch in Einbahnstraße eingefahren"],
   ["io_verbot","„Verbot der Einfahrt“ missachtet"],
   ["io_anlieger","„Anlieger frei“ missachtet"],
   ["io_fuss","Fußgänger/Zebrastreifen missachtet"],
   ["io_spur","Spurführung/Einordnen falsch"]]},
 {area:"30er-Zone / Tempo", items:[
   ["t_speed","Geschwindigkeit überschritten"],
   ["t_anpass","Tempo nicht angepasst (Schule/Spielstraße)"],
   ["t_langsam","Verkehrsfluss behindert (zu langsam)"]]},
 {area:"Außerorts", items:[
   ["ao_ueberhol","Überholen unsicher/falsch"],
   ["ao_kurve","Tempo in Kurven nicht angepasst"],
   ["ao_einmuend","Beobachtung beim Einmünden/Abbiegen"],
   ["ao_abstand","Seitenabstand zu gering"]]},
 {area:"Autobahn", items:[
   ["bab_rechts","Rechts überholt"],
   ["bab_auffahr","Zu langsam aufgefahren (Beschleunigungsstreifen)"],
   ["bab_spur","Einfädeln/Spurwechsel falsch"],
   ["bab_abstand","Sicherheitsabstand zu gering"]]},
 {area:"Grundfahraufgaben", items:[
   ["gf_park","Einparken ungenügend"],
   ["gf_brems","Gefahrenbremsung ungenügend"],
   ["gf_sonst","Sonstige Grundfahraufgabe falsch"]]},
 {area:"Bedienung / Sonstiges", items:[
   ["be_motor","Motor mehr als 3× abgewürgt"],
   ["be_schalt","Anfahren/Schalten/Kupplung"],
   ["be_anweis","Anweisung des Prüfers nicht umgesetzt"]]}
];
const FAULT_LABEL={};
FAULTS.forEach(g=>g.items.forEach(([id,lab])=>{FAULT_LABEL[id]=lab;}));

if (typeof module !== "undefined" && module.exports) module.exports = { FAULTS, FAULT_LABEL };
