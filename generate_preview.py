# -*- coding: utf-8 -*-
"""Genera preview.png con el problema del día (título, categoría, dificultad y dibujo).
Lee los datos directamente de index.html para no duplicarlos.
Uso: python generate_preview.py [salida.png]
"""
import re, io, sys, datetime
from zoneinfo import ZoneInfo
from PIL import Image, ImageDraw, ImageFont
try:
    import cairosvg
except Exception:
    cairosvg = None  # en local puede no estar; en el runner sí

OUT = sys.argv[1] if len(sys.argv) > 1 else "preview.png"
HTML = open("index.html", encoding="utf-8").read()

def grab(pat):
    m = re.search(pat, HTML, re.S)
    return m.group(1) if m else None

INICIO    = grab(r'const INICIO = "([^"]+)"')
ORDEN     = eval(grab(r'const ORDEN = (\[[^\]]+\]);'))
EXCLUIDOS = eval(grab(r'const EXCLUIDOS = (\[[^\]]*\]);') or "[]")
TITULOS   = re.findall(r'titulo:"([^"]*)"', HTML)
TIPO      = eval("{" + grab(r'const TIPO = \{([^}]+)\};') + "}")
DIF       = eval("{" + grab(r'const DIF = \{([^}]+)\};') + "}")
PAPEL     = grab(r'const PAPEL = "([^"]*)";')
DIB_BLOCK = grab(r'const DIBUJOS = \{(.*?)\n\};')
DIBUJOS   = {int(k): v for k, v in re.findall(r'(\d+):"([^"]*)"', DIB_BLOCK)}

# ---- problema de HOY (fecha de Madrid) ----
inicio = datetime.date.fromisoformat(INICIO)
hoy = datetime.datetime.now(ZoneInfo("Europe/Madrid")).date()
dayidx = max(0, (hoy - inicio).days)
seq = list(ORDEN) + [i for i in range(len(TITULOS)) if i not in ORDEN and i not in EXCLUIDOS]
idx = seq[dayidx % len(seq)]
titulo, tipo, dif = TITULOS[idx], TIPO.get(idx, ""), DIF.get(idx, 2)
print(f"Día {dayidx+1}: idx={idx} · {titulo} · {tipo} · dif {dif}")

# ---- colores ----
CREAM=(243,239,230); INK=(43,38,32); MUTED=(133,124,110)
GOLD=(154,111,46); BLUE=(31,95,166); GRID=(233,227,214)
OK=(46,125,79); HARD=(192,67,47)
TIPO_COL={"Geometría":(31,95,166),"Números":(46,125,79),"Lógica":(122,78,166),
          "Probabilidad":(196,106,31),"Combinatoria":(176,58,110),"Ingenio":(154,111,46)}
DIF_COL={1:OK,2:GOLD,3:HARD}

def font(paths, size):
    for p in paths:
        try: return ImageFont.truetype(p, size)
        except Exception: pass
    return ImageFont.load_default()
SERIF =["/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf","C:/Windows/Fonts/georgia.ttf"]
SERIFB=["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf","C:/Windows/Fonts/georgiab.ttf"]
f_kick=font(SERIFB,26); f_title=font(SERIFB,74); f_meta=font(SERIF,30); f_url=font(SERIF,28)

W,H=1200,630
img=Image.new("RGB",(W,H),CREAM); d=ImageDraw.Draw(img)
for x in range(0,W,42): d.line([(x,0),(x,H)],fill=GRID)
for y in range(0,H,42): d.line([(0,y),(W,y)],fill=GRID)
for x in range(W):
    t=x/W; c=tuple(int(GOLD[i]+(BLUE[i]-GOLD[i])*t) for i in range(3))
    d.line([(x,0),(x,12)],fill=c)

def tracked(draw,xy,text,fnt,fill,track):
    x,y=xy
    for ch in text:
        draw.text((x,y),ch,font=fnt,fill=fill); x+=draw.textlength(ch,font=fnt)+track

def wrap(draw,text,fnt,maxw):
    out=[]; cur=""
    for w in text.split():
        t=(cur+" "+w).strip()
        if draw.textlength(t,font=fnt)<=maxw: cur=t
        else:
            if cur: out.append(cur)
            cur=w
    if cur: out.append(cur)
    return out

LX=82; RIGHTW=640
tracked(d,(LX,84),"EL PROBLEMA DEL DÍA",f_kick,GOLD,6)
lines=wrap(d,titulo,f_title,RIGHTW)
block_h=len(lines)*86+68                       # títulos + hueco + fila de etiquetas
ty=int((120+540)/2 - block_h/2)                # centrado entre kicker (~120) y enlace (~540)
for ln in lines:
    d.text((LX-2,ty),ln,font=f_title,fill=INK); ty+=86
my=ty+22
pcol=TIPO_COL.get(tipo,GOLD)
pw=d.textlength(tipo,font=f_meta)+34
d.rounded_rectangle((LX,my,LX+pw,my+46),radius=23,fill=pcol)
d.text((LX+17,my+6),tipo,font=f_meta,fill=(255,255,255))
dx=LX+pw+24
d.text((dx,my+6),"Dificultad:",font=f_meta,fill=MUTED)
dx+=d.textlength("Dificultad:",font=f_meta)+16
for k in range(3):
    cx=dx+k*30; cy=my+23; col=DIF_COL.get(dif,GOLD)
    if k<dif: d.ellipse((cx-9,cy-9,cx+9,cy+9),fill=col)
    else:     d.ellipse((cx-9,cy-9,cx+9,cy+9),outline=col,width=2)
d.text((LX,552),"spyder-cripto.github.io/problema-del-dia",font=f_url,fill=BLUE)

# ---- dibujo del día (SVG -> PNG) ----
if cairosvg and idx in DIBUJOS:
    try:
        svg="<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>"+PAPEL+DIBUJOS[idx]+"</svg>"
        png=cairosvg.svg2png(bytestring=svg.encode("utf-8"),output_width=370,output_height=370)
        draw_img=Image.open(io.BytesIO(png)).convert("RGBA").rotate(-5,expand=True,resample=Image.BICUBIC)
        img.paste(draw_img,(772,128),draw_img)
        print("dibujo incrustado")
    except Exception as e:
        print("Aviso: no se pudo renderizar el dibujo:",e)
else:
    print("Aviso: sin cairosvg o sin dibujo; tarjeta sin dibujo")

img.save(OUT,"PNG")
print("Generado", OUT, img.size)

# ---- cache-buster en las etiquetas og:image / twitter:image ----
if OUT == "preview.png":
    vparam = hoy.strftime("%Y%m%d")
    newhtml = re.sub(r'preview\.png(?:\?v=\d+)?"', f'preview.png?v={vparam}"', HTML)
    if newhtml != HTML:
        open("index.html","w",encoding="utf-8").write(newhtml)
        print("index.html: og:image -> ?v=" + vparam)

# ===== versión CUADRADA (1080x1080) para estados de WhatsApp =====
SW=1080
sq=Image.new("RGB",(SW,SW),CREAM); sd=ImageDraw.Draw(sq)
for x in range(0,SW,42): sd.line([(x,0),(x,SW)],fill=GRID)
for y in range(0,SW,42): sd.line([(0,y),(SW,y)],fill=GRID)
for x in range(SW):
    t=x/SW; c=tuple(int(GOLD[i]+(BLUE[i]-GOLD[i])*t) for i in range(3))
    sd.line([(x,0),(x,14)],fill=c)
f_kS=font(SERIFB,30); f_tS=font(SERIFB,88); f_mS=font(SERIF,36); f_uS=font(SERIF,30)
def cx_text(y,text,fnt,fill):
    sd.text(((SW-sd.textlength(text,font=fnt))/2,y),text,font=fnt,fill=fill)
def cx_tracked(y,text,fnt,fill,tr):
    w=sum(sd.textlength(c,font=fnt)+tr for c in text)-tr; x=(SW-w)/2
    for c in text: sd.text((x,y),c,font=fnt,fill=fill); x+=sd.textlength(c,font=fnt)+tr
cx_tracked(66,"EL PROBLEMA DEL DÍA",f_kS,GOLD,7)
if cairosvg and idx in DIBUJOS:
    try:
        svg2="<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>"+PAPEL+DIBUJOS[idx]+"</svg>"
        png2=cairosvg.svg2png(bytestring=svg2.encode("utf-8"),output_width=400,output_height=400)
        di=Image.open(io.BytesIO(png2)).convert("RGBA").rotate(-5,expand=True,resample=Image.BICUBIC)
        sq.paste(di,(int((SW-di.width)/2),130),di)
    except Exception as e:
        print("sq: sin dibujo:",e)
slines=wrap(sd,titulo,f_tS,SW-150)
block_h=len(slines)*104+72
ty=int(790-block_h/2)
for ln in slines:
    cx_text(ty,ln,f_tS,INK); ty+=104
my=ty+18
pcol=TIPO_COL.get(tipo,GOLD); pw=sd.textlength(tipo,font=f_mS)+40
dlab="Dificultad:"; dl=sd.textlength(dlab,font=f_mS)
group=pw+28+dl+18+3*34; gx=(SW-group)/2
sd.rounded_rectangle((gx,my,gx+pw,my+54),radius=27,fill=pcol)
sd.text((gx+20,my+8),tipo,font=f_mS,fill=(255,255,255))
tx=gx+pw+28; sd.text((tx,my+8),dlab,font=f_mS,fill=MUTED); tx+=dl+18
for k in range(3):
    cxx=tx+k*34+11; cyy=my+27; col=DIF_COL.get(dif,GOLD)
    if k<dif: sd.ellipse((cxx-11,cyy-11,cxx+11,cyy+11),fill=col)
    else:     sd.ellipse((cxx-11,cyy-11,cxx+11,cyy+11),outline=col,width=3)
cx_text(1012,"spyder-cripto.github.io/problema-del-dia",f_uS,BLUE)
sq.save("preview_sq.png","PNG")
print("Generado preview_sq.png", sq.size)
