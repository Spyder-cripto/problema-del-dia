"""Puzle 4 — El gran circo"""
import math, sys
import sympy as sp
from lib import *

b, u, t, p, g, x = sp.symbols("bolo pelota tambor pesa globo x", positive=True)
FLOOR = 800

# ---------- objetos ----------
def draw_bolo(cx, top):
    s = [f'<circle cx="{cx}" cy="{top+4}" r="4" fill="none" stroke="{OUT}" stroke-width="2.5"/>',
         f'<path d="M{cx-4},{top+8} L{cx+4},{top+8} L{cx+5},{top+22} C{cx+15},{top+30} {cx+14},{top+52} {cx},{top+56} C{cx-14},{top+52} {cx-15},{top+30} {cx-5},{top+22} Z" fill="#fffaf2" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<path d="M{cx-5},{top+16} L{cx+5},{top+16}" stroke="#e63946" stroke-width="5"/>',
         f'<path d="M{cx-9},{top+28} L{cx+9},{top+28}" stroke="#e63946" stroke-width="5"/>',
         f'<ellipse cx="{cx-5}" cy="{top+40}" rx="3" ry="7" fill="#fff" opacity=".9"/>']
    return "".join(s)

def draw_pelota(cx, top):
    cy = top + 26
    R = 20
    s = [f'<circle cx="{cx}" cy="{top+3}" r="3.5" fill="none" stroke="{OUT}" stroke-width="2.5"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="#ffd23f" stroke="{OUT}" stroke-width="3"/>',
         f'<path d="M{cx},{cy-R} Q{cx-16},{cy} {cx},{cy+R} Q{cx-26},{cy} {cx},{cy-R} Z" fill="#e63946"/>',
         f'<path d="M{cx},{cy-R} Q{cx+16},{cy} {cx},{cy+R} Q{cx+26},{cy} {cx},{cy-R} Z" fill="#1d7fd8"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="{OUT}" stroke-width="3"/>',
         f'<ellipse cx="{cx-8}" cy="{cy-9}" rx="4" ry="6" fill="#fff" opacity=".7" transform="rotate(35 {cx-8} {cy-9})"/>']
    return "".join(s)

def draw_tambor(cx, top, ring=True):
    w, h = 56, 44
    l, r_ = cx - w / 2, cx + w / 2
    yt = top + 12
    s = []
    if ring:
        s.append(f'<path d="M{cx-12},{yt+2} Q{cx},{top-6} {cx+12},{yt+2}" fill="none" stroke="{OUT}" stroke-width="3"/>')
    s.append(f'<path d="M{l},{yt} L{l},{yt+h} A{w/2},8 0 0 0 {r_},{yt+h} L{r_},{yt} Z" fill="#e63946" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
    zz = " ".join(f"L{l + i*w/6:.1f},{yt + (h if i % 2 else 4)}" for i in range(7))
    s.append(f'<path d="M{l},{yt+4} {zz}" fill="none" stroke="#ffd23f" stroke-width="3" stroke-linejoin="round"/>')
    s.append(f'<ellipse cx="{cx}" cy="{yt}" rx="{w/2}" ry="8" fill="#fffaf2" stroke="{OUT}" stroke-width="3"/>')
    s.append(f'<rect x="{l-2}" y="{yt+h-4}" width="{w+4}" height="6" rx="3" fill="#1d7fd8" stroke="{OUT}" stroke-width="2.5"/>')
    return "".join(s)

def draw_pesa(cx, top, cuerda=True):
    yb = top + 22
    s = [f'<path d="M{cx},{top} L{cx},{yb}" stroke="{OUT}" stroke-width="3"/>' if cuerda else "",
         f'<rect x="{cx-26}" y="{yb-4}" width="52" height="8" rx="3" fill="#9aa5b0" stroke="{OUT}" stroke-width="3"/>']
    for sg in (-1, 1):
        s.append(f'<rect x="{cx+sg*30-9}" y="{yb-22}" width="18" height="44" rx="6" fill="#2b2d33" stroke="{OUT}" stroke-width="3"/>')
        s.append(f'<rect x="{cx+sg*30-5}" y="{yb-17}" width="5" height="22" rx="2" fill="#fff" opacity=".35"/>')
    return "".join(s)

def draw_baul(cx, top):
    w, h = 92, 60
    l = cx - w / 2
    yb = top + 16
    s = [f'<path d="M{cx-12},{yb+2} Q{cx},{top-6} {cx+12},{yb+2}" fill="none" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{l}" y="{yb}" width="{w}" height="{h}" rx="6" fill="#3a56c5" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{l}" y="{yb}" width="{w}" height="16" rx="6" fill="#2c44a6" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{l+8}" y="{yb}" width="8" height="{h}" fill="#ffd23f" stroke="{OUT}" stroke-width="2"/>',
         f'<rect x="{l+w-16}" y="{yb}" width="8" height="{h}" fill="#ffd23f" stroke="{OUT}" stroke-width="2"/>',
         text(cx, yb + 38, "?", 36, 900, col="#ffd23f", extra=f'stroke="{OUT}" stroke-width="2.2" paint-order="stroke"')]
    return "".join(s)

BOLO = Kind("bolo", b, 58, 30, draw_bolo, ring=4)
PELOTA = Kind("pelota", u, 48, 42, draw_pelota, ring=3)
TAMBOR = Kind("tambor", t, 66, 58, draw_tambor, ring=4)
PESA = Kind("pesa", p, 46, 80, draw_pesa, ring=2)
BAUL = Kind("baúl", x * b, 78, 92, draw_baul, ring=4)
TAMBOR_PIE = Kind("tambor", t, 58, 58, lambda cx, top: draw_tambor(cx, top - 8, ring=False))

BEAM = dict(col="#ffd23f", hl="#fff3b0")

def estrella(cx, cy, R, col="#ffd23f", k=0.45):
    pts = []
    for i in range(10):
        rr = R if i % 2 == 0 else R * k
        a = -math.pi / 2 + i * math.pi / 5
        pts.append(f"{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="{col}" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>'

def foca(cx, base):
    return (f'<path d="M{cx-48},{base} Q{cx-60},{base-30} {cx-30},{base-40} Q{cx-6},{base-60} {cx+8},{base-96} Q{cx+16},{base-112} {cx+30},{base-104} Q{cx+40},{base-96} {cx+28},{base-84} Q{cx+16},{base-50} {cx+30},{base} Z" fill="#5d6b7a" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>'
            f'<circle cx="{cx+22}" cy="{base-100}" r="2.6" fill="{OUT}"/><circle cx="{cx+38}" cy="{base-96}" r="3.4" fill="{OUT}"/>'
            f'<path d="M{cx+6},{base-40} q14,6 10,22" fill="none" stroke="{OUT}" stroke-width="3"/>'
            + draw_pelota(cx + 36, base - 150).replace(f'<circle cx="{cx+36}" cy="{base-147}" r="3.5" fill="none" stroke="{OUT}" stroke-width="2.5"/>', ""))

def build():
    sc = Scene(1400, 900)
    # ----- carpa -----
    sc.add('<rect width="1400" height="900" fill="#fff1d6"/>', 0)
    cxs = 700
    for i in range(-9, 10):
        if i % 2:
            continue
        x1, x2 = cxs + i * 110, cxs + (i + 1) * 110
        sc.add(f'<path d="M{cxs},-60 L{x1*1.0 + (x1-cxs)*0.9:.0f},{FLOOR} L{x2 + (x2-cxs)*0.9:.0f},{FLOOR} Z" fill="#e8434f" opacity=".85"/>', 0)
    sc.add(f'<rect x="0" y="0" width="1400" height="900" fill="#3b1d5a" opacity=".08"/>', 0)
    # banderines
    pts = []
    for i in range(15):
        x0 = i * 100
        cols = ["#ffd23f", "#1d7fd8", "#2bb673", "#e63946"]
        sc.add(f'<path d="M{x0+8},{38 + 10*math.sin(i)} L{x0+48},{40 + 10*math.sin(i)} L{x0+28},{78 + 10*math.sin(i)} Z" fill="{cols[i%4]}" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>', 3)
    sc.add(f'<path d="M0,36 ' + " ".join(f"L{i*100+50},{40 + 10*math.sin(i)}" for i in range(15)) + '" fill="none" stroke="{OUT}" stroke-width="2.5"/>', 3)
    # pista y suelo
    sc.add(f'<rect x="0" y="{FLOOR}" width="1400" height="100" fill="#f6a03c"/>'
           f'<ellipse cx="700" cy="{FLOOR+70}" rx="760" ry="70" fill="#f8b65e"/>'
           f'<path d="M-20,{FLOOR+12} Q700,{FLOOR-28} 1420,{FLOOR+12}" fill="none" stroke="#c0283a" stroke-width="18"/>'
           f'<path d="M-20,{FLOOR+12} Q700,{FLOOR-28} 1420,{FLOOR+12}" fill="none" stroke="#ffd23f" stroke-width="5" stroke-dasharray="14 18"/>', 4)
    sc.add(foca(1250, FLOOR + 10), 8)
    # bolos tirados en el suelo (no cuentan)
    for (bx_, rot) in ((392, 84), (430, 100)):
        sc.add(f'<g transform="rotate({rot} {bx_} {FLOOR-6})">' + draw_bolo(bx_, FLOOR - 34) + '</g>', 9)

    # ================= VIGA PRINCIPAL A, colgada del techo =================
    A = Beam(sc, "A", 700, 180, 70, -4, 4, **BEAM)
    sc.rope(A.px, 0, A.px, A.y, z=29, w=5, col=OUT)
    sc.add(f'<circle cx="{A.px}" cy="{A.y-14}" r="6" fill="none" stroke="{OUT}" stroke-width="3"/>', 51)
    # ---- S: viga colgante con globo (de A en -4) ----
    S_ = Beam(sc, "S", A.X(-4), 320, 50, -3, 3, **BEAM)
    S_.hang(-3, PELOTA)
    S_.hang(0, [BOLO, BOLO], gap=2)
    S_.hang(3, BOLO)
    xx = S_.X(-1)
    sc.add(globo_svg(xx, S_.y, xx - 22, S_.y - 96, col="#2bb673"), 62)
    S_.force(-1, -g, "globo")
    S_.draw()
    hang_beam(A, -4, S_)
    A.stand(-2, TAMBOR_PIE)
    A.hang(-3, PESA, drop=14)
    A.hang(2, BAUL, drop=14)
    A.hang(4, PELOTA, drop=18)
    A.draw()

    # ================= P y Q en postes, con el trapecio entre ambas =================
    P = Beam(sc, "P", 300, 500, 60, -4, 3, **BEAM)
    Q = Beam(sc, "Q", 1100, 500, 60, -3, 4, **BEAM)
    for B_ in (P, Q):
        sc.add(poste(B_.px, B_.y, FLOOR + 6, w=22, col="#c0283a", hl="#f07a85"), 20)
        sc.add(estrella(B_.px, FLOOR - 40, 12), 21)
    # trapecio: cuelga de P(+3) y Q(-3)
    xl, xr = P.X(3), Q.X(-3)
    TY = 650
    T = Beam(sc, "T", xl, TY, (xr - xl) / 4, 0, 4, balance=False, col="#1d7fd8", hl="#7fb8f0", margin=12)
    sc.rope(xl, P.y, xl, TY, z=29, w=3.5)
    sc.rope(xr, Q.y, xr, TY, z=29, w=3.5)
    T.hang(1, TAMBOR)
    T.hang(3, PELOTA)
    xb = T.X(2)
    sc.add(globo_svg(xb, T.y, xb + 16, T.y - 110, col="#2bb673"), 62)
    T.force(2, -g, "globo")
    T.draw(mark=False)
    span = 4
    TL = sp.expand(sum(w * (span - k) for k, w, _ in T.loads) / span)
    TR = sp.expand(sum(w * k for k, w, _ in T.loads) / span)
    P.force(3, TL, "trapecio (izq)")
    Q.force(-3, TR, "trapecio (der)")

    # contrapeso: cuerda de P(-3) sube a una polea fija y baja a una pesa
    Rp = 22
    pcx, pcy = P.X(-3) + Rp, 150
    sc.add(f'<rect x="{pcx-60}" y="{pcy-58}" width="120" height="16" rx="4" fill="#7b4a2a" stroke="{OUT}" stroke-width="3"/>'
           f'<line x1="{pcx}" y1="{pcy-42}" x2="{pcx}" y2="{pcy}" stroke="{OUT}" stroke-width="5"/>', 22)
    sc.add(polea(pcx, pcy, Rp, "#e9dcc4"), 34)
    sc.path(f'M{P.X(-3)},{P.y} L{P.X(-3)},{pcy} A{Rp},{Rp} 0 0 1 {pcx+Rp},{pcy} L{pcx+Rp},{pcy+84}', z=30, w=3.5)
    sc.add(draw_pesa(pcx + Rp, pcy + 80), 40)
    P.force(-3, -p, "contrapeso")

    P.hang(-2, [TAMBOR, TAMBOR], gap=2)
    P.hang(-4, [BOLO, BOLO], gap=2)
    P.draw()
    Q.hang(3, BOLO)
    Q.draw()

    # ================= R: viga colgada del techo (arriba a la derecha) =================
    R = Beam(sc, "R", 1180, 300, 55, -2, 3, col="#2bb673", hl="#8fe0b6")
    sc.rope(R.px, 0, R.px, R.y, z=29, w=4, col=OUT)
    R.hang(-2, PESA, drop=14)
    R.hang(3, TAMBOR)
    R.draw()
    return sc, dict(A=A, S=S_, P=P, Q=Q, R=R, T=T)

if __name__ == "__main__":
    sc, B = build()
    for nme, bm in B.items():
        print(nme, "eq:", bm.eq(), " total:", bm.total())
    print("solución:", sc.solve([b, u, t, p, g, x], b))
    open(sys.argv[1] if len(sys.argv) > 1 else "p4.svg", "w", encoding="utf-8").write(
        sc.svg("Acertijo del circo: ¿cuántos bolos hay en el baúl?"))
