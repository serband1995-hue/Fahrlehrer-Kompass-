#!/usr/bin/env python3
"""Stimme „Serband 2“ für die Lernszenen erzeugen und per Speech-to-Text zurückhören.

Aufruf:  python3 scripts/stimme-erzeugen.py TEXTE.json [--sprache de|en] [--nur ID,ID] [--budget 60000] [--bericht BERICHT.json] [--erzaehler 4.2]
--erzaehler S: ruhiger Erzähler (Stabilität 0,7) und gleiches Sprechtempo S Silben/s für alle Sätze.
TEXTE.json: Liste [{id, phasen:[{text}]}] (Ausgabe von dump.mjs bzw. die neuen Texte).
Für jede Phase: Ton erzeugen (ElevenLabs, eleven_multilingual_v2), mit Scribe zurückhören, Wörter vergleichen.
Weicht die Abschrift ab, wird neu erzeugt (bis 4 Versuche). Schreibt stimme/<sprache-Präfix><id>-<i>-<stand>.mp3 und stimme/index.json.
Schlüssel: keiner im Skript – der Proxy der Sitzung setzt ihn für api.elevenlabs.io ein.
"""
import sys; sys.dont_write_bytecode = True
import json, os, re, subprocess, sys, time, unicodedata, urllib.request, uuid

STIMME_ID = "wbfCCbblStaYTE0JMoci"   # Serband 2
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
DIR = os.path.join(ROOT, "stimme")
API = "https://api.elevenlabs.io/v1"
STABIL = 0.5          # --erzaehler: 0.7 (ruhiger, gleichmäßiger)
ZIEL = None           # --erzaehler: Ziel-Sprechtempo in Silben pro Sekunde (gleichmäßiger Erzähler)
HDR = {"xi-api-key": "dummy"}

# Sprech-Fassung nur für die Stimme (angezeigt bleibt der Text): Notruf wird Ziffer für Ziffer gesprochen
SPRICH = {"de": [(r"\b112\b", "eins eins zwei")], "en": [(r"\b112\b", "one one two")]}
def sprich(t, sprache):
    for a, b in SPRICH.get(sprache, []): t = re.sub(a, b, t)
    return t

def stand(t):
    # gleicher Hash wie stimmeStand() in lernszenen.js (UTF-16-Codeeinheiten)
    h = 5381
    b = t.encode("utf-16-le")
    for i in range(0, len(b), 2):
        c = b[i] | (b[i + 1] << 8)
        h = ((h << 5) + h + c) & 0xFFFFFFFF
    n = h; s = ""
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0: return "0"
    while n: s = digits[n % 36] + s; n //= 36
    return s

def post(url, body, ctype="application/json", tries=4):
    for k in range(tries):
        try:
            r = urllib.request.Request(url, body, {**HDR, "Content-Type": ctype})
            return urllib.request.urlopen(r, timeout=120).read()
        except Exception as e:
            if k == tries - 1: raise
            time.sleep(3 * (k + 1))

def tts(text, sprache, prev, nxt):
    body = {"text": text, "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": STABIL, "similarity_boost": 0.8, "style": 0.0, "use_speaker_boost": True}}
    if prev: body["previous_text"] = prev
    if nxt: body["next_text"] = nxt
    return post(f"{API}/text-to-speech/{STIMME_ID}?output_format=mp3_44100_64", json.dumps(body).encode())

def stt(mp3, sprache):
    grenze = "----lz" + uuid.uuid4().hex
    teile = []
    for k, v in (("model_id", "scribe_v1"), ("language_code", "deu" if sprache == "de" else "eng"), ("tag_audio_events", "false")):
        teile.append(f"--{grenze}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    teile.append(f"--{grenze}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n".encode() + mp3 + b"\r\n")
    teile.append(f"--{grenze}--\r\n".encode())
    r = post(f"{API}/speech-to-text", b"".join(teile), f"multipart/form-data; boundary={grenze}")
    j = json.loads(r)
    # gedehnte Wörter (z. B. ein lang gezogenes „L“): Wortdauer je Buchstabe auffällig hoch
    gedehnt = [f"{w['text']}:{w['end']-w['start']:.2f}s" for w in j.get("words", []) if w.get("type") == "word"
               and (w["end"] - w["start"]) > 0.8 and (w["end"] - w["start"]) / max(1, len(w["text"].strip(".,?!"))) > 0.17]
    return j.get("text", ""), gedehnt

ZAHL_DE = {"0": "null", "1": "eins", "2": "zwei", "3": "drei", "4": "vier", "5": "fünf", "6": "sechs", "7": "sieben", "8": "acht", "9": "neun", "10": "zehn", "11": "elf", "12": "zwölf",
           "15": "fünfzehn", "20": "zwanzig", "30": "dreißig", "40": "vierzig", "50": "fünfzig", "60": "sechzig", "70": "siebzig", "80": "achtzig", "90": "neunzig", "100": "hundert", "120": "hundertzwanzig", "130": "hundertdreißig", "1000": "tausend", "500": "fünfhundert"}
ZAHL_EN = {"0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten", "12": "twelve", "15": "fifteen",
           "20": "twenty", "30": "thirty", "40": "forty", "50": "fifty", "60": "sixty", "70": "seventy", "80": "eighty", "90": "ninety", "100": "hundred", "1000": "thousand", "500": "five hundred"}

EIN = ["null", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"]
ZEHN = {2: "zwanzig", 3: "dreißig", 4: "vierzig", 5: "fünfzig", 6: "sechzig", 7: "siebzig", 8: "achtzig", 9: "neunzig"}
def zahl_de(n):
    if n < 20: return "eins" if n == 1 else EIN[n]
    if n < 100: e, z = n % 10, n // 10; return (EIN[e] + "und" if e else "") + ZEHN[z]
    if n < 1000: h, r = divmod(n, 100); return ("" if h == 1 else EIN[h]) + "hundert" + (zahl_de(r) if r else "")
    if n < 1000000: t, r = divmod(n, 1000); return ("" if t == 1 else zahl_de(t)) + "tausend" + (zahl_de(r) if r else "")
    return str(n)

EN1 = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
EN10 = {2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety"}
def zahl_en(n):
    if n < 20: return EN1[n]
    if n < 100: z, e = divmod(n, 10); return EN10[z] + (" " + EN1[e] if e else "")
    if n < 1000: h, r = divmod(n, 100); return EN1[h] + " hundred" + (" and " + zahl_en(r) if r else "")
    if n < 1000000: t, r = divmod(n, 1000); return zahl_en(t) + " thousand" + ((" and " if r < 100 else " ") + zahl_en(r) if r else "")
    return str(n)

def woerter(t, sprache):
    t = unicodedata.normalize("NFC", t.lower()).replace("ß", "ss")
    t = re.sub(r"(\d)\.(\d{3})", r"\1\2", t)
    t = re.sub(r"[^\w\s]", " ", t)
    z = ZAHL_DE if sprache == "de" else ZAHL_EN
    out = []
    for w in t.split():
        if sprache == "de" and w.isdigit(): w = zahl_de(int(w)).replace("ß", "ss")
        elif sprache == "en" and w.isdigit(): w = zahl_en(int(w))
        elif sprache == "en": w = re.sub(r"tre(s|d)?$", r"ter\1", re.sub(r"our(s|ing|hood)?$", r"or\1", {"kerb": "curb", "kerbs": "curbs", "practise": "practice"}.get(w, w)))   # britisch = amerikanisch (Scribe schreibt amerikanisch)
        else: w = z.get(w, w).replace("ß", "ss")
        if sprache == "de": w = {"einhundert": "hundert", "eintausend": "tausend", "eins": "ein", "eine": "ein", "einen": "ein", "einem": "ein", "einer": "ein", "eines": "ein"}.get(w, w)
        out.extend(w.split())
    return out

def abweichung(soll, ist, sprache):
    a, b = woerter(soll, sprache), woerter(ist, sprache)
    # Levenshtein auf Wortebene + Liste der Unterschiede
    n, m = len(a), len(b)
    D = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1): D[i][0] = i
    for j in range(m + 1): D[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i][j] = min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (0 if a[i - 1] == b[j - 1] else 1))
    i, j, diff = n, m, []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and D[i][j] == D[i - 1][j - 1] + (0 if a[i - 1] == b[j - 1] else 1):
            if a[i - 1] != b[j - 1]: diff.append(f"{a[i-1]}→{b[j-1]}")
            i, j = i - 1, j - 1
        elif i > 0 and D[i][j] == D[i - 1][j] + 1: diff.append(f"{a[i-1]}→∅"); i -= 1
        else: diff.append(f"∅→{b[j-1]}"); j -= 1
    if D[n][m] and sprache == "en" and [w for w in a if w != "and"] == [w for w in b if w != "and"]:
        return 0, []
    if D[n][m] and "".join(a).replace("s", "") == "".join(b).replace("s", ""):
        return 0, []   # nur Schreibweise einer Zusammensetzung („noch mal“/„nochmal“, „Vorfahrtsstraße“)
    return D[n][m], list(reversed(diff))

def silben(t): return len(re.findall(r"[aeiouäöüy]+", t.lower()))

def sprechzeit(pfad):
    # Anfang und Ende der Sprache (Stille unter -40 dB, mind. 0,12 s, wird abgeschnitten)
    o = subprocess.run(["ffmpeg", "-hide_banner", "-i", pfad, "-af", "silencedetect=n=-40dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", o); d = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    s = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", o)]; e = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", o)]
    a = e[0] if s and s[0] < 0.05 and e else 0.0
    b = s[-1] if s and len(e) < len(s) else d
    return a, b

def tempo_angleichen(mp3, text, ziel):
    """Gleichmäßiges Erzähltempo: Stille vorn kürzen, Tempo auf ziel Silben/s bringen (Tonhöhe bleibt), 0,3 s Ruhe am Ende.
    Gibt (neue mp3-Bytes, Faktor) zurück; Faktor außerhalb 0,85–1,15 → None (lieber neu erzeugen)."""
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        ein, aus = os.path.join(d, "a.mp3"), os.path.join(d, "b.mp3")
        open(ein, "wb").write(mp3)
        a, b = sprechzeit(ein)
        f = ziel / (silben(text) / max(0.5, b - a))
        if not 0.85 <= f <= 1.15: return None, f
        start = max(0.0, a - 0.08)
        subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-i", ein, "-af", f"atrim=start={start:.3f}:end={b + 0.05:.3f},asetpts=PTS-STARTPTS,atempo={f:.4f},apad=pad_dur=0.3",
                        "-ar", "44100", "-b:a", "64k", aus], check=True)
        return open(aus, "rb").read(), f

def dauer(pfad):
    return round(float(subprocess.check_output(["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", pfad])), 2)

def main():
    a = sys.argv[1:]
    texte = json.load(open(a[0], encoding="utf-8"))
    opt = {a[i]: a[i + 1] for i in range(1, len(a) - 1, 2)}
    global STABIL, ZIEL
    if "--erzaehler" in opt: ZIEL = float(opt["--erzaehler"]); STABIL = 0.7
    sprache = opt.get("--sprache", "de"); nur = set(filter(None, opt.get("--nur", "").split(",")))
    budget = int(opt.get("--budget", "60000")); bericht_pfad = opt.get("--bericht", os.path.join(ROOT, "stimme", f"bericht-{sprache}.json"))
    idx_pfad = os.path.join(DIR, "index.json" if sprache == "de" else f"index-{sprache}.json")
    idx = json.load(open(idx_pfad, encoding="utf-8")) if os.path.exists(idx_pfad) else {}
    bericht = json.load(open(bericht_pfad, encoding="utf-8")) if os.path.exists(bericht_pfad) else {"zeichen": 0, "eintraege": {}}
    praefix = "" if sprache == "de" else sprache + "-"
    for sz in texte:
        if nur and sz["id"] not in nur: continue
        neu = {}
        ph = sz["phasen"]
        for i, p in enumerate(ph):
            t = p["text"]; st = stand(t); f = f"{praefix}{sz['id']}-{i}-{st}.mp3"; pf = os.path.join(DIR, f)
            key = f"{sz['id']}/{i}"
            alt = bericht["eintraege"].get(key)
            if alt and alt.get("stand") == st and alt.get("ok") and alt.get("sprich", t) == sprich(t, sprache) and os.path.exists(pf):
                neu[st] = {"f": f, "d": dauer(pf)}; continue
            versuche = []
            ok = False; bester = None
            for k in range(4):
                if bericht["zeichen"] + len(t) > budget: print("BUDGET erreicht", file=sys.stderr); break
                ts = sprich(t, sprache)
                mp3 = tts(ts, sprache, sprich(ph[i - 1]["text"], sprache) if i else None, sprich(ph[i + 1]["text"], sprache) if i + 1 < len(ph) else None)
                bericht["zeichen"] += len(t)
                ist, gedehnt = stt(mp3, sprache)
                fehler, diff = abweichung(ts, ist, sprache)
                fehler += len(gedehnt); diff += ["gedehnt " + g for g in gedehnt]
                versuche.append({"ist": ist, "fehler": fehler, "diff": diff})
                if bester is None or fehler < bester[0]: bester = (fehler, mp3)
                print(f"{key} Versuch {k+1}: {fehler} Abweichung(en) {diff}", flush=True)
                if fehler == 0 and ZIEL:
                    neu_mp3, fak = tempo_angleichen(mp3, ts, ZIEL)
                    versuche[-1]["tempo"] = round(fak, 3)
                    if neu_mp3 is None:
                        print(f"{key} Tempo-Faktor {fak:.2f} zu weit weg, neuer Versuch", flush=True)
                        if bester[1] is mp3: bester = (1, mp3)
                        if k < 3: continue
                        fehler = 1; diff.append(f"Tempo-Faktor {fak:.2f} nicht angeglichen")   # letzter Versuch: Datei bleibt, Bericht sagt nicht ok
                    else: mp3 = neu_mp3
                if fehler == 0:
                    open(pf, "wb").write(mp3); ok = fehler == 0; break
                if k == 3: open(pf, "wb").write(bester[1]); ok = False   # bester Versuch bleibt, Satz steht im Bericht
            bericht["eintraege"][key] = {"stand": st, "text": t, "sprich": sprich(t, sprache), "ok": ok, "versuche": versuche}
            if os.path.exists(pf): neu[st] = {"f": f, "d": dauer(pf)}
            json.dump(bericht, open(bericht_pfad, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        idx[sz["id"]] = neu
        json.dump(idx, open(idx_pfad, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Zeichen verbraucht (gesamt laut Bericht):", bericht["zeichen"])

if __name__ == "__main__":
    main()
