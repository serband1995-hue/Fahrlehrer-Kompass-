# layoutcheck.py NAME [render-dir]  → Liste von Layout-Problemen je Folie (Textüberlauf, Überlappung, kleine Schrift, Kontrast, Rand)
# Misst mit Carlito (metrisch gleich wie Calibri) – so rechnen auch PowerPoint und LibreOffice.
import sys, re, zipfile, os, json
from xml.etree import ElementTree as ET
from PIL import Image, ImageFont

NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main', 'p': 'http://schemas.openxmlformats.org/presentationml/2006/main'}
EMU = 914400
SW, SH = 13.333, 7.5
FD = '/usr/share/fonts/truetype/crosextra/'
_fc = {}
def font(sz, b, i):
    k = (sz, b, i)
    if k not in _fc:
        f = 'Carlito-' + ('BoldItalic' if b and i else 'Bold' if b else 'Italic' if i else 'Regular') + '.ttf'
        _fc[k] = ImageFont.truetype(FD + f, size=max(1, int(round(sz * 10))))  # 10 px je pt → genaue Breiten
    return _fc[k]
def tw(txt, sz, b, i, spc):  # Textbreite in Zoll
    if not txt: return 0
    w = font(sz, b, i).getlength(txt) / 10 / 72
    return w + len(txt) * spc / 100 / 72

def lum(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])
def contrast(c1, c2):
    a, b = lum(c1), lum(c2)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)

def paras(tx):
    out = []
    for p in tx.findall('a:p', NS):
        ppr = p.find('a:pPr', NS)
        ls = 1.0; aft = 0; algn = 'l'
        if ppr is not None:
            algn = ppr.get('algn', 'l')
            sp = ppr.find('a:lnSpc/a:spcPct', NS)
            if sp is not None: ls = int(sp.get('val')) / 100000
            sa = ppr.find('a:spcAft/a:spcPts', NS)
            if sa is not None: aft = int(sa.get('val')) / 100 / 72
        runs = []  # Liste von Zeilen (durch a:br getrennt), je Zeile Liste von (text, sz, b, i, spc, col)
        cur = []
        for el in p:
            tag = el.tag.split('}')[1]
            if tag == 'r':
                rp = el.find('a:rPr', NS); t = el.find('a:t', NS)
                sz = int(rp.get('sz', '1800')) / 100 if rp is not None else 18
                b = rp is not None and rp.get('b') == '1'; i = rp is not None and rp.get('i') == '1'
                spc = int(rp.get('spc', '0')) if rp is not None else 0
                col = None
                if rp is not None:
                    c = rp.find('a:solidFill/a:srgbClr', NS)
                    if c is not None: col = c.get('val')
                cur.append((t.text or '' if t is not None else '', sz, b, i, spc, col))
            elif tag == 'br':
                runs.append(cur); cur = []
        runs.append(cur)
        end = p.find('a:endParaRPr', NS)
        esz = int(end.get('sz', '1800')) / 100 if end is not None and end.get('sz') else None
        out.append(dict(lines=runs, ls=ls, aft=aft, algn=algn, esz=esz))
    return out

def layout(ps, width, wrap=True):
    """Bricht Text um. Gibt (Höhe, max. Zeilenbreite, Zeilen[(breite, höhe, text)]) zurück."""
    H = 0; maxw = 0; L = []
    for p in ps:
        for line in p['lines']:
            # Wörter mit Format
            words = []
            for (t, sz, b, i, spc, col) in line:
                for k, w in enumerate(re.split(r'(\s+)', t)):
                    if w: words.append((w, sz, b, i, spc))
            szs = [w[1] for w in words] or [p['esz'] or 18]
            lh = max(szs) * 1.22 / 72 * p['ls']
            if not words:
                H += lh; L.append((0, lh, '')); continue
            cw = 0; ct = ''
            for (w, sz, b, i, spc) in words:
                ww = tw(w, sz, b, i, spc)
                if wrap and cw + ww > width + 0.005 and ct.strip() and not w.isspace():
                    L.append((cw, lh, ct)); H += lh; maxw = max(maxw, cw)
                    cw = 0 if w.isspace() else ww; ct = '' if w.isspace() else w
                else:
                    cw += ww; ct += w
            L.append((cw, lh, ct)); H += lh; maxw = max(maxw, cw)
        H += p['aft']
    return H, maxw, L

def shapes(x):
    root = ET.fromstring(x)
    tree = root.find('p:cSld/p:spTree', NS)
    out = []
    for el in tree.iter():
        tag = el.tag.split('}')[-1]
        if tag not in ('sp', 'pic'): continue
        nv = el.find('.//p:cNvPr', NS)
        xf = el.find('p:spPr/a:xfrm', NS)
        if xf is None: continue
        off = xf.find('a:off', NS); ext = xf.find('a:ext', NS)
        if off is None or ext is None: continue
        d = dict(kind=tag, name=nv.get('name', '') if nv is not None else '', x=int(off.get('x')) / EMU, y=int(off.get('y')) / EMU,
                 w=int(ext.get('cx')) / EMU, h=int(ext.get('cy')) / EMU, rot=int(xf.get('rot', '0')) / 60000)
        if tag == 'sp':
            tx = el.find('p:txBody', NS)
            if tx is not None:
                txt = ''.join(t.text or '' for t in tx.iter('{%s}t' % NS['a']))
                if txt.strip():
                    bp = tx.find('a:bodyPr', NS)
                    d['ins'] = [int(bp.get(k, dflt)) / EMU for k, dflt in (('lIns', 91440), ('tIns', 45720), ('rIns', 91440), ('bIns', 45720))]
                    d['anchor'] = bp.get('anchor', 't'); d['wrap'] = bp.get('wrap', 'square') != 'none'
                    d['paras'] = paras(tx); d['text'] = txt
                    fill = el.find('p:spPr/a:solidFill/a:srgbClr', NS)
                    d['fill'] = fill.get('val') if fill is not None else None
        out.append(d)
    return out

def check(name, rdir=None):
    z = zipfile.ZipFile(name + '.pptx')
    slides = sorted([n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)], key=lambda n: int(re.findall(r'\d+', n)[0]))
    issues = []
    for si, n in enumerate(slides, 1):
        sh = shapes(z.read(n).decode('utf-8'))
        img = None
        if rdir:
            f = os.path.join(rdir, 's-%03d.jpg' % si)
            if not os.path.exists(f): f = os.path.join(rdir, 's-%02d.jpg' % si)
            if os.path.exists(f): img = Image.open(f).convert('RGB')
        boxes = []
        for d in sh:
            if 'paras' not in d: continue
            l, t, r, b = d['ins']
            iw, ih = d['w'] - l - r, d['h'] - t - b
            H, maxw, L = layout(d['paras'], iw, d['wrap'])
            nm = d['name']; txt = d['text'].strip().replace('\n', ' ')[:70]
            sizes = [run[1] for p in d['paras'] for line in p['lines'] for run in line if run[0].strip()]
            mins = min(sizes) if sizes else 18
            rot = d['rot'] % 360
            # Text-Ausdehnung (nur ungedreht genau)
            if d['anchor'] == 'ctr': ty = d['y'] + t + (ih - H) / 2
            elif d['anchor'] == 'b': ty = d['y'] + d['h'] - b - H
            else: ty = d['y'] + t
            algn = d['paras'][0]['algn']
            tx0 = d['x'] + l + ((iw - maxw) / 2 if algn == 'ctr' else (iw - maxw) if algn == 'r' else 0)
            ext = (tx0, ty, tx0 + maxw, ty + H)
            if rot < 1 or rot > 359:
                if H > ih * 1.04 + 0.03:
                    issues.append(dict(s=si, typ='Textüberlauf', name=nm, txt=txt, info='braucht %.2f Zoll, Kasten %.2f' % (H, ih)))
                if not d['wrap'] and maxw > iw + 0.05:
                    issues.append(dict(s=si, typ='zu breit', name=nm, txt=txt, info='%.2f > %.2f' % (maxw, iw)))
                boxes.append((ext, nm, txt, mins))
                # Rand
                if ext[0] < -0.01 or ext[1] < -0.01 or ext[2] > SW + 0.01 or ext[3] > SH + 0.01:
                    issues.append(dict(s=si, typ='außerhalb der Folie', name=nm, txt=txt, info='%.2f,%.2f–%.2f,%.2f' % ext))
            if mins < 11.5 and not nm.startswith('!!ft') and nm != '!!leg':
                issues.append(dict(s=si, typ='kleine Schrift', name=nm, txt=txt, info='%.1f pt' % mins))
            # Kontrast am gerenderten Bild
            if img is not None and (rot < 1 or rot > 359):
                cols = [run[5] for p in d['paras'] for line in p['lines'] for run in line if run[0].strip() and run[5]]
                if cols and maxw > 0.05 and H > 0.05:
                    sx, sy = img.size[0] / SW, img.size[1] / SH
                    box = (int(max(0, ext[0]) * sx), int(max(0, ext[1]) * sy), int(min(SW, ext[2]) * sx), int(min(SH, ext[3]) * sy))
                    if box[2] - box[0] > 3 and box[3] - box[1] > 3:
                        reg = img.crop(box).resize((max(1, (box[2] - box[0]) // 2), max(1, (box[3] - box[1]) // 2)))
                        px = list(reg.get_flattened_data()) if hasattr(reg, "get_flattened_data") else list(reg.getdata())
                        for c in set(cols):
                            tc = tuple(int(c[k:k + 2], 16) for k in (0, 2, 4))
                            far = [q for q in px if sum(abs(q[k] - tc[k]) for k in range(3)) > 90]
                            if len(far) < len(px) * 0.3: continue
                            far.sort(key=lambda q: sum(q))
                            bg = far[len(far) // 2]
                            cr = contrast(tc, bg)
                            lim = 3.0 if mins >= 18 else 4.0
                            if cr < lim:
                                issues.append(dict(s=si, typ='schwacher Kontrast', name=nm, txt=txt, info='Farbe %s auf ~%02X%02X%02X: %.1f:1' % (c, *bg, cr)))
        # Überlappung von Text mit Text
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b_ = boxes[i][0], boxes[j][0]
                ox = min(a[2], b_[2]) - max(a[0], b_[0]); oy = min(a[3], b_[3]) - max(a[1], b_[1])
                if ox > 0.04 and oy > 0.04:
                    issues.append(dict(s=si, typ='Text überlappt Text', name=boxes[i][1] + ' / ' + boxes[j][1], txt=boxes[i][2][:35] + ' ⟂ ' + boxes[j][2][:35], info='%.2f×%.2f Zoll' % (ox, oy)))
    return issues

if __name__ == '__main__':
    name = sys.argv[1]; rdir = sys.argv[2] if len(sys.argv) > 2 else None
    iss = check(name, rdir)
    # Gleiche Befunde über Morph-Folien zusammenfassen
    grp = {}
    for d in iss:
        k = (d['typ'], d['name'], d['txt'])
        grp.setdefault(k, []).append(d)
    print('%s: %d Befunde (%d verschiedene)' % (name, len(iss), len(grp)))
    for k, v in sorted(grp.items(), key=lambda kv: kv[1][0]['s']):
        ss = sorted(set(d['s'] for d in v))
        sl = ','.join(map(str, ss[:6])) + ('…' if len(ss) > 6 else '')
        print('  Folie %-14s %-20s %-12s „%s“  [%s]' % (sl, k[0], k[1][:12], k[2], v[0]['info']))
