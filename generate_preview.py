# -*- coding: utf-8 -*-
"""Genera las tarjetas (preview) de "El problema del día", leyendo index.html.

Uso:
  python generate_preview.py          -> preview.png + preview_sq.png del problema de HOY (+ cache-buster og)
  python generate_preview.py --todas  -> tarjetas/dia-NN.png y dia-NN-sq.png de TODOS los problemas
                                         en rotación + galería tarjetas/index.html
"""
import re, io, sys, os, datetime
from zoneinfo import ZoneInfo
from PIL import Image, ImageDraw, ImageFont
try:
    import cairosvg
except Exception:
    cairosvg = None  # en local puede no estar; en el runner sí

HTML = open("index.html", encoding="utf-8").read()
def grab(pat):
    m = re.search(pat, HTML, re.S); return m.group(1) if m else None

INICIO    = grab(r'const INICIO = "([^"]+)"')
ORDEN     = eval(grab(r'const ORDEN = (\[[^\]]+\]);'))
EXCLUIDOS = eval(grab(r'const EXCLUIDOS = (\[[^\]]*\]);') or "[]")
OVERRIDES = eval(grab(r'const OVERRIDES = (\{[^}]*\});') or "{}")  # fecha YYYY-MM-DD -> índice (prioridad sobre el ciclo)
TITULOS   = re.findall(r'titulo:"([^"]*)"', HTML)
TIPO      = eval("{" + grab(r'const TIPO = \{([^}]+)\};') + "}")
DIF       = eval("{" + grab(r'const DIF = \{([^}]+)\};') + "}")
PAPEL     = grab(r'const PAPEL = "([^"]*)";')
DIB_BLOCK = grab(r'const DIBUJOS = \{(.*?)\n\};')
DIBUJOS   = {int(k): v for k, v in re.findall(r'(\d+):"([^"]*)"', DIB_BLOCK)}

inicio = datetime.date.fromisoformat(INICIO)
SEQ = list(ORDEN) + [i for i in range(len(TITULOS)) if i not in ORDEN and i not in EXCLUIDOS]
URL = "spyder-cripto.github.io/problema-del-dia"

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
f_kS=font(SERIFB,30); f_tS=font(SERIFB,88); f_mS=font(SERIF,36); f_uS=font(SERIF,30)

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

def tracked(draw,xy,text,fnt,fill,track):
    x,y=xy
    for ch in text:
        draw.text((x,y),ch,font=fnt,fill=fill); x+=draw.textlength(ch,font=fnt)+track

def doodle(idx, px):
    """Devuelve el garabato como RGBA rotado -5°, o None."""
    if not (cairosvg and idx in DIBUJOS): return None
    try:
        svg="<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>"+PAPEL+DIBUJOS[idx]+"</svg>"
        png=cairosvg.svg2png(bytestring=svg.encode("utf-8"),output_width=px,output_height=px)
        return Image.open(io.BytesIO(png)).convert("RGBA").rotate(-5,expand=True,resample=Image.BICUBIC)
    except Exception as e:
        print("  aviso dibujo:",e); return None

def make_horizontal(idx):
    titulo, tipo, dif = TITULOS[idx], TIPO.get(idx,""), DIF.get(idx,2)
    W,H=1200,630
    img=Image.new("RGB",(W,H),CREAM); d=ImageDraw.Draw(img)
    for x in range(0,W,42): d.line([(x,0),(x,H)],fill=GRID)
    for y in range(0,H,42): d.line([(0,y),(W,y)],fill=GRID)
    for x in range(W):
        t=x/W; c=tuple(int(GOLD[i]+(BLUE[i]-GOLD[i])*t) for i in range(3))
        d.line([(x,0),(x,12)],fill=c)
    LX=82; RIGHTW=640
    tracked(d,(LX,84),"EL PROBLEMA DEL DÍA",f_kick,GOLD,6)
    lines=wrap(d,titulo,f_title,RIGHTW)
    block_h=len(lines)*86+68
    ty=int((120+540)/2 - block_h/2)
    for ln in lines:
        d.text((LX-2,ty),ln,font=f_title,fill=INK); ty+=86
    my=ty+22
    pcol=TIPO_COL.get(tipo,GOLD); pw=d.textlength(tipo,font=f_meta)+34
    d.rounded_rectangle((LX,my,LX+pw,my+46),radius=23,fill=pcol)
    d.text((LX+17,my+6),tipo,font=f_meta,fill=(255,255,255))
    dx=LX+pw+24
    d.text((dx,my+6),"Dificultad:",font=f_meta,fill=MUTED)
    dx+=d.textlength("Dificultad:",font=f_meta)+16
    for k in range(3):
        cx=dx+k*30; cy=my+23; col=DIF_COL.get(dif,GOLD)
        if k<dif: d.ellipse((cx-9,cy-9,cx+9,cy+9),fill=col)
        else:     d.ellipse((cx-9,cy-9,cx+9,cy+9),outline=col,width=2)
    d.text((LX,552),URL,font=f_url,fill=BLUE)
    di=doodle(idx,370)
    if di: img.paste(di,(772,128),di)
    return img

def make_square(idx):
    titulo, tipo, dif = TITULOS[idx], TIPO.get(idx,""), DIF.get(idx,2)
    SW=1080
    sq=Image.new("RGB",(SW,SW),CREAM); sd=ImageDraw.Draw(sq)
    for x in range(0,SW,42): sd.line([(x,0),(x,SW)],fill=GRID)
    for y in range(0,SW,42): sd.line([(0,y),(SW,y)],fill=GRID)
    for x in range(SW):
        t=x/SW; c=tuple(int(GOLD[i]+(BLUE[i]-GOLD[i])*t) for i in range(3))
        sd.line([(x,0),(x,14)],fill=c)
    def cx_text(y,text,fnt,fill):
        sd.text(((SW-sd.textlength(text,font=fnt))/2,y),text,font=fnt,fill=fill)
    w=sum(sd.textlength(c,font=f_kS)+7 for c in "EL PROBLEMA DEL DÍA")-7; x=(SW-w)/2
    for c in "EL PROBLEMA DEL DÍA": sd.text((x,66),c,font=f_kS,fill=GOLD); x+=sd.textlength(c,font=f_kS)+7
    slines=wrap(sd,titulo,f_tS,SW-150)
    ty=158
    for ln in slines:
        cx_text(ty,ln,f_tS,INK); ty+=104
    title_bottom=ty
    my=880
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
    di=doodle(idx,360)
    if di:
        py=int((title_bottom+24 + my-28)/2 - di.height/2); py=max(py,title_bottom+14)
        sq.paste(di,(int((SW-di.width)/2), py), di)
    cx_text(1014,URL,f_uS,BLUE)
    return sq

MESES=["","ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]

def galeria(rows):
    base="https://"+URL
    h=["<!doctype html><html lang='es'><head><meta charset='utf-8'>",
       "<meta name='viewport' content='width=device-width,initial-scale=1'>",
       "<title>Tarjetas · El problema del día</title>",
       "<style>body{font-family:Georgia,'Times New Roman',serif;background:#f3efe6;color:#2b2620;max-width:900px;margin:24px auto;padding:0 16px}",
       "h1{color:#9a6f2e}.n{color:#857c6e;font-size:.92em}",
       ".card{background:#fffdf8;border:1px solid #e4ddcd;border-radius:14px;padding:14px;margin:14px 0;display:flex;gap:16px;align-items:center;flex-wrap:wrap}",
       ".card img{width:200px;height:200px;border-radius:10px;border:1px solid #e4ddcd}",
       ".info{flex:1;min-width:240px}.t{font-size:1.3rem;margin:.1em 0}",
       "a{color:#1f5fa6;text-decoration:none}a:hover{text-decoration:underline}",
       ".b{display:inline-block;margin:4px 10px 0 0;font-size:.95rem}</style></head><body>",
       "<h1>Tarjetas para compartir</h1>",
       "<p class='n'>La imagen <b>cuadrada</b> es para tu estado de WhatsApp. Comparte la cuadrada + el enlace del problema. (También hay versión horizontal para enlaces.)</p>"]
    for n,fecha,idx,tit,tipo,dif in rows:
        nn=f"{n:02d}"; f=f"{fecha.day} {MESES[fecha.month]}"
        link=f"{base}/?ver={idx}"
        h.append(f"<div class='card'><a href='dia-{nn}-sq.png' target='_blank'><img src='dia-{nn}-sq.png' alt='{tit}'></a>"
                 f"<div class='info'><div class='n'>Día {n} · {f} · {tipo} · dif {dif}</div>"
                 f"<div class='t'>{tit}</div>"
                 f"<a class='b' href='dia-{nn}-sq.png' download>⬇ Cuadrada (estado)</a>"
                 f"<a class='b' href='dia-{nn}.png' download>⬇ Horizontal</a>"
                 f"<a class='b' href='{link}' target='_blank'>🔗 Enlace del problema</a></div></div>")
    h.append("</body></html>")
    open("tarjetas/index.html","w",encoding="utf-8").write("\n".join(h))

# ===================== MAIN =====================
if "--todas" in sys.argv:
    os.makedirs("tarjetas", exist_ok=True)
    rows=[]
    for d,idx in enumerate(SEQ):
        nn=f"{d+1:02d}"
        make_horizontal(idx).save(f"tarjetas/dia-{nn}.png","PNG")
        make_square(idx).save(f"tarjetas/dia-{nn}-sq.png","PNG")
        fecha=inicio+datetime.timedelta(days=d)
        rows.append((d+1,fecha,idx,TITULOS[idx],TIPO.get(idx,""),DIF.get(idx,2)))
        print(f"dia {nn}: {TITULOS[idx]}")
    galeria(rows)
    print(f"Generadas {len(SEQ)} tarjetas (x2) + galería en tarjetas/")
else:
    hoy = datetime.datetime.now(ZoneInfo("Europe/Madrid")).date()
    dayidx = max(0,(hoy-inicio).days)
    idx = OVERRIDES.get(hoy.isoformat(), SEQ[dayidx % len(SEQ)])
    print(f"HOY día {dayidx+1}: {TITULOS[idx]}" + (" [OVERRIDE]" if hoy.isoformat() in OVERRIDES else ""))
    make_horizontal(idx).save("preview.png","PNG")
    make_square(idx).save("preview_sq.png","PNG")
    vparam = hoy.strftime("%Y%m%d")
    newhtml = re.sub(r'preview\.png(?:\?v=\d+)?"', f'preview.png?v={vparam}"', HTML)
    if newhtml != HTML:
        open("index.html","w",encoding="utf-8").write(newhtml)
        print("index.html: og:image -> ?v="+vparam)
    print("Generadas preview.png y preview_sq.png")
