# -*- coding: utf-8 -*-
"""Tarjeta especial "Mes de la Matemática Recreativa".

Reutiliza la identidad visual de las tarjetas de "El problema del día"
(crema + rejilla + barra oro->azul + serif + URL azul) y dibuja una
frieze de glifos de los juegos (dado, montones de Nim, hexágono, dominó)
directamente con PIL, sin depender de cairosvg.

Uso:
  python generate_mes.py        -> mes-recreativa.png (1200x630) + mes-recreativa-sq.png (1080x1080)
"""
from PIL import Image, ImageDraw, ImageFont

# ---- paleta (idéntica a generate_preview.py) ----
CREAM=(243,239,230); INK=(43,38,32); MUTED=(133,124,110)
GOLD=(154,111,46); BLUE=(31,95,166); GRID=(233,227,214)
GREEN=(46,125,79); PURPLE=(122,78,166); WHITE=(255,255,255)

URL="spyder-cripto.github.io/problema-del-dia"

def font(paths, size):
    for p in paths:
        try: return ImageFont.truetype(p, size)
        except Exception: pass
    return ImageFont.load_default()
SERIF =["C:/Windows/Fonts/georgia.ttf","/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"]
SERIFB=["C:/Windows/Fonts/georgiab.ttf","/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"]
SERIFI=["C:/Windows/Fonts/georgiai.ttf","/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf"]

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
    return x

def tracked_w(draw,text,fnt,track):
    return sum(draw.textlength(c,font=fnt)+track for c in text)-track

def grid_bg(W,H):
    img=Image.new("RGB",(W,H),CREAM); d=ImageDraw.Draw(img)
    for x in range(0,W,42): d.line([(x,0),(x,H)],fill=GRID)
    for y in range(0,H,42): d.line([(0,y),(W,y)],fill=GRID)
    bar=14 if W==H else 12
    for x in range(W):
        t=x/W; c=tuple(int(GOLD[i]+(BLUE[i]-GOLD[i])*t) for i in range(3))
        d.line([(x,0),(x,bar)],fill=c)
    return img,d

# ---------- glifos de juego (dibujados con PIL) ----------
def g_die(d,cx,cy,s,body=BLUE,pip=CREAM):
    """Dado con 5 puntos, cuadrado redondeado de lado s centrado en (cx,cy)."""
    x0,y0=cx-s/2,cy-s/2
    d.rounded_rectangle((x0,y0,x0+s,y0+s),radius=s*0.16,fill=body)
    r=s*0.075
    for fx,fy in [(0.27,0.27),(0.73,0.27),(0.5,0.5),(0.27,0.73),(0.73,0.73)]:
        px,py=x0+fx*s,y0+fy*s
        d.ellipse((px-r,py-r,px+r,py+r),fill=pip)

def g_hex(d,cx,cy,r,color=GREEN,w=7):
    """Hexágono (Hex) con punta arriba, contorno."""
    import math
    pts=[(cx+r*math.sin(math.radians(60*k)),cy-r*math.cos(math.radians(60*k))) for k in range(6)]
    d.polygon(pts,outline=color,width=w)
    d.ellipse((cx-r*0.18,cy-r*0.18,cx+r*0.18,cy+r*0.18),fill=color)

def g_heaps(d,cx,cy,color=GOLD):
    """Montones de Nim: columnas de 4,2,3 fichas centradas en (cx,cy)."""
    cols=[4,2,3]; r=9; gap=26; colgap=46
    totalw=(len(cols)-1)*colgap
    x=cx-totalw/2
    for n in cols:
        toth=(n-1)*gap
        y=cy+toth/2
        for _ in range(n):
            d.ellipse((x-r,y-r,x+r,y+r),fill=color); y-=gap
        x+=colgap

def g_domino(d,cx,cy,cell=34,color=PURPLE,line=GRID):
    """Mini-tablero 3x3 con un dominó vertical (Domineering)."""
    n=3; x0,y0=cx-n*cell/2,cy-n*cell/2
    # ficha de dominó (1x2) coloreada
    d.rounded_rectangle((x0+cell,y0,x0+2*cell,y0+2*cell),radius=6,fill=color)
    # rejilla
    for k in range(n+1):
        d.line([(x0+k*cell,y0),(x0+k*cell,y0+n*cell)],fill=INK,width=2)
        d.line([(x0,y0+k*cell),(x0+n*cell,y0+k*cell)],fill=INK,width=2)

# ---------- composición ----------
KICK="EL PROBLEMA DEL DÍA"
TITLE="Mes de la Matemática Recreativa"
TAG1="Un acertijo nuevo cada día"
TAG2="y 9 juegos matemáticos para jugar"

def frieze(d,cx,cy,scale=1.0):
    """Fila de 4 glifos centrada en (cx,cy)."""
    step=int(150*scale)
    xs=[cx-1.5*step,cx-0.5*step,cx+0.5*step,cx+1.5*step]
    g_die(d,xs[0],cy,int(96*scale))
    g_heaps(d,xs[1],cy,GOLD)
    g_hex(d,xs[2],cy,int(58*scale),GREEN,max(5,int(7*scale)))
    g_domino(d,xs[3],cy,int(34*scale),PURPLE)

def make_square():
    SW=1080
    img,d=grid_bg(SW,SW)
    def cx_text(y,text,fnt,fill):
        d.text(((SW-d.textlength(text,font=fnt))/2,y),text,font=fnt,fill=fill)
    # kicker
    fk=font(SERIFB,32)
    w=tracked_w(d,KICK,fk,7); tracked(d,((SW-w)/2,70),KICK,fk,GOLD,7)
    # título
    ft=font(SERIFB,98)
    lines=wrap(d,TITLE,ft,SW-150)
    ty=180
    for ln in lines:
        cx_text(ty,ln,ft,INK); ty+=112
    # regla
    title_bottom=ty+6
    d.line([((SW-220)/2,title_bottom),((SW+220)/2,title_bottom)],fill=GOLD,width=4)
    # taglines
    fm=font(SERIF,40); fi=font(SERIFI,38)
    cx_text(title_bottom+34,TAG1,fm,INK)
    cx_text(title_bottom+92,TAG2,fi,MUTED)
    # frieze de glifos
    frieze(d,SW/2,815,1.0)
    # url
    fu=font(SERIF,30)
    cx_text(1012,URL,fu,BLUE)
    return img

def make_horizontal():
    W,H=1200,630
    img,d=grid_bg(W,H)
    LX=82; RIGHTW=690
    fk=font(SERIFB,26)
    tracked(d,(LX,82),KICK,fk,GOLD,6)
    ft=font(SERIFB,82)
    lines=wrap(d,TITLE,ft,RIGHTW)
    ty=150
    for ln in lines:
        d.text((LX-2,ty),ln,font=ft,fill=INK); ty+=92
    # regla
    d.line([(LX,ty+8),(LX+200,ty+8)],fill=GOLD,width=4)
    # taglines
    fm=font(SERIF,32); fi=font(SERIFI,30)
    d.text((LX,ty+30),TAG1,font=fm,fill=INK)
    d.text((LX,ty+78),TAG2,font=fi,fill=MUTED)
    # url
    fu=font(SERIF,28)
    d.text((LX,560),URL,font=fu,fill=BLUE)
    # cluster de glifos a la derecha (composición en diagonal)
    g_die(d,975,185,150)
    g_hex(d,1085,345,66,GREEN,8)
    g_domino(d,955,420,40,PURPLE)
    g_heaps(d,838,300,GOLD)
    return img

if __name__=="__main__":
    make_horizontal().save("mes-recreativa.png","PNG")
    make_square().save("mes-recreativa-sq.png","PNG")
    print("Generadas: mes-recreativa.png (1200x630) y mes-recreativa-sq.png (1080x1080)")
