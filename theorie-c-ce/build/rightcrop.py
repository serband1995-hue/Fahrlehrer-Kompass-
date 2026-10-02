# rightcrop.py name bgX [xstart] → art/name_r.jpg (rechter Ausschnitt mit Seitenverhältnis (13.333-bgX)/7.5, weicher linker Rand)
import sys
from PIL import Image
n,bx=sys.argv[1],float(sys.argv[2]); xs=float(sys.argv[3]) if len(sys.argv)>3 else None
im=Image.open(f'art/{n}.jpg').convert('RGB'); w,h=im.size; cw=round(h*(13.333-bx)/7.5)
x0=int(xs*w) if xs is not None else w-cw
im=im.crop((x0,0,x0+cw,h)); bg=Image.new('RGB',im.size,(9,13,22)); m=Image.new('L',im.size,255); fw=int(cw*0.2)
for x in range(fw): m.paste(int(255*(x/fw)**1.4),(x,0,x+1,h))
Image.composite(im,bg,m).save(f'art/{n}_r.jpg',quality=88)
