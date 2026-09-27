"""Hängt die Folien von Deck B hinten an Deck A an (beide mit pptxgenjs gebaut, gleiche Layouts).
Aufruf: python3 merge.py A.pptx B.pptx OUT.pptx"""
import sys, re, zipfile, hashlib, posixpath

a_path, b_path, out_path = sys.argv[1:4]
A = zipfile.ZipFile(a_path)
B = zipfile.ZipFile(b_path)
files = {n: A.read(n) for n in A.namelist()}
bfiles = {n: B.read(n) for n in B.namelist()}

def slide_nums(names, kind='slides/slide'):
    return sorted(int(m.group(1)) for n in names for m in [re.match(rf'ppt/{kind}(\d+)\.xml$', n)] if m)

a_slides = slide_nums(files)
b_slides = slide_nums(bfiles)
off = max(a_slides)
a_notes = slide_nums(files, 'notesSlides/notesSlide')
noff = max(a_notes) if a_notes else 0

# Medien: identische Dateien wiederverwenden, sonst neu benennen
hash_to_name = {hashlib.md5(v).hexdigest() + posixpath.splitext(n)[1]: n for n, v in files.items() if n.startswith('ppt/media/')}
media_map = {}
for n, v in bfiles.items():
    if not n.startswith('ppt/media/'):
        continue
    key = hashlib.md5(v).hexdigest() + posixpath.splitext(n)[1]
    if key in hash_to_name:
        media_map[n] = hash_to_name[key]
    else:
        new = 'ppt/media/l12_' + posixpath.basename(n)
        files[new] = v
        hash_to_name[key] = new
        media_map[n] = new

def remap_media(xml):
    return re.sub(r'Target="\.\./media/([^"]+)"', lambda m: f'Target="../{media_map["ppt/media/" + m.group(1)][4:]}"', xml)

ct = files['[Content_Types].xml'].decode()
bct = bfiles['[Content_Types].xml'].decode()
# fehlende Default-Endungen übernehmen
for m in re.finditer(r'<Default Extension="([^"]+)"[^>]*/>', bct):
    if f'Extension="{m.group(1)}"' not in ct:
        ct = ct.replace('</Types>', m.group(0) + '</Types>')

pres = files['ppt/presentation.xml'].decode()
prels = files['ppt/_rels/presentation.xml.rels'].decode()
max_id = max(int(x) for x in re.findall(r'<p:sldId id="(\d+)"', pres))
max_rid = max(int(x) for x in re.findall(r'Id="rId(\d+)"', prels))

bpres = bfiles['ppt/presentation.xml'].decode()
bprels = bfiles['ppt/_rels/presentation.xml.rels'].decode()
rid_target = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', bprels))
order = [int(re.search(r'slide(\d+)\.xml', rid_target[r]).group(1)) for r in re.findall(r'<p:sldId [^>]*r:id="(rId\d+)"', bpres)]

new_ids = ''
for k, sn in enumerate(order, 1):
    nn = off + k
    xml = bfiles[f'ppt/slides/slide{sn}.xml']
    files[f'ppt/slides/slide{nn}.xml'] = xml
    rels = bfiles[f'ppt/slides/_rels/slide{sn}.xml.rels'].decode()
    rels = remap_media(rels)
    # Notizen
    m = re.search(r'Target="\.\./notesSlides/notesSlide(\d+)\.xml"', rels)
    if m:
        on = int(m.group(1)); nnote = noff + k
        rels = rels.replace(f'notesSlide{on}.xml', f'notesSlide{nnote}.xml')
        files[f'ppt/notesSlides/notesSlide{nnote}.xml'] = bfiles[f'ppt/notesSlides/notesSlide{on}.xml']
        nrels = bfiles[f'ppt/notesSlides/_rels/notesSlide{on}.xml.rels'].decode()
        nrels = re.sub(r'slides/slide\d+\.xml', f'slides/slide{nn}.xml', nrels)
        files[f'ppt/notesSlides/_rels/notesSlide{nnote}.xml.rels'] = nrels.encode()
        ct = ct.replace('</Types>', f'<Override PartName="/ppt/notesSlides/notesSlide{nnote}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/></Types>')
    files[f'ppt/slides/_rels/slide{nn}.xml.rels'] = rels.encode()
    ct = ct.replace('</Types>', f'<Override PartName="/ppt/slides/slide{nn}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>')
    max_rid += 1; max_id += 1
    prels = prels.replace('</Relationships>', f'<Relationship Id="rId{max_rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{nn}.xml"/></Relationships>')
    new_ids += f'<p:sldId id="{max_id}" r:id="rId{max_rid}"/>'

pres = pres.replace('</p:sldIdLst>', new_ids + '</p:sldIdLst>')
files['ppt/presentation.xml'] = pres.encode()
files['ppt/_rels/presentation.xml.rels'] = prels.encode()
files['[Content_Types].xml'] = ct.encode()
# docProps/app.xml: Folienzahl anpassen
if 'docProps/app.xml' in files:
    app = files['docProps/app.xml'].decode()
    app = re.sub(r'<Slides>\d+</Slides>', f'<Slides>{off + len(order)}</Slides>', app)
    files['docProps/app.xml'] = app.encode()

with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', files.pop('[Content_Types].xml'))
    for n, v in files.items():
        z.writestr(n, v, compress_type=zipfile.ZIP_STORED if n.endswith(('.mp4', '.jpg', '.jpeg', '.png')) else zipfile.ZIP_DEFLATED)
print('Fertig:', out_path, off + len(order), 'Folien')
