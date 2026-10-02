# sheet.py DIR start end → DIR/sheet_start.jpg (2 Spalten, große Vorschau)
import sys,glob
from PIL import Image,ImageDraw
d,a,b=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
fs=sorted(glob.glob(d+'/s-*.jpg'))[a-1:b]
W=800;H=450;cols=2;rows=(len(fs)+1)//2
sh=Image.new('RGB',(cols*W+10,rows*(H+24)),'white');dr=ImageDraw.Draw(sh)
for i,f in enumerate(fs):
  im=Image.open(f).resize((W,H));x=(i%cols)*(W+10);y=(i//cols)*(H+24)
  sh.paste(im,(x,y+22));dr.text((x+4,y+4),'Folie %d'%(a+i),fill='black')
sh.save(d+'/sheet_%d.jpg'%a,quality=85)
