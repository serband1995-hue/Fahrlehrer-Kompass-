// Gemeinsame Geometrie für Szenen (art5.js) und Choreografie (build5.js). Einheit: Zoll auf der Folie.
const W = 13.333, H = 7.5;

// Kreuzung / Einmündung / Ampelkreuzung (Maßstab 0,30 Zoll pro Meter)
const X = { cx: 8.6, cy: 3.75, k: 0.30 };
X.L = 3.25 * X.k;                 // Fahrstreifenbreite
X.x0 = X.cx - X.L; X.x1 = X.cx + X.L; X.y0 = X.cy - X.L; X.y1 = X.cy + X.L;
X.walk = 0.45;
// Fahrstreifenmitten (Rechtsverkehr)
X.nb = X.cx + X.L / 2;  // nach Norden fahrend
X.sb = X.cx - X.L / 2;  // nach Süden fahrend
X.eb = X.cy + X.L / 2;  // nach Osten fahrend
X.wb = X.cy - X.L / 2;  // nach Westen fahrend

// Straße waagerecht mit Öffnungen nach Süden (Bordstein, verkehrsberuhigter Bereich), Maßstab 0,30
const R = { k: 0.30, y0: 2.75 };
R.L = 3.25 * R.k; R.y1 = R.y0 + 2 * R.L; R.cy = R.y0 + R.L; R.eb = R.cy + R.L / 2; R.wb = R.cy - R.L / 2;
R.walk = 0.5;
R.aX0 = 5.7; R.aX1 = R.aX0 + 2 * R.L;           // echte Einmündung
R.bX0 = 9.7; R.bX1 = 11.5;                       // Grundstückszufahrt mit abgesenktem Bordstein
R.vX0 = 7.7; R.vX1 = R.vX0 + 2 * R.L;            // verkehrsberuhigter Bereich

// Kreisverkehr (Maßstab 0,22)
const K = { cx: 8.9, cy: 3.75, k: 0.22 };
K.L = 3.25 * K.k; K.rIsl = 0.82; K.rApr = 1.0; K.rOut = 1.72; K.rm = 1.38;

// Sprite-Maße in Metern (wie art.js)
const CAR = { w: 1.8, l: 4.5, pad: 0.45 };
const BIKE = { w: 0.7, l: 1.9, pad: 0.3 };
const PED = { w: 0.6, l: 0.45, pad: 0.25 };
const TRUCK = { w: 2.55, l: 12, pad: 0.5 };
const COP = { w: 2.2, l: 0.9, pad: 0.3 };
module.exports = { W, H, X, R, K, CAR, BIKE, PED, TRUCK, COP };
