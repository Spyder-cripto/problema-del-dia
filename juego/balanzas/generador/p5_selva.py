"""Puzle 5 — La selva"""
import math, sys
import sympy as sp
from lib import *

c, pl, n, m, T, x = sp.symbols("coco platanos pina mango T x", positive=True)
GROUND = 805

# ---------- objetos ----------
def draw_coco(cx, top):
    cy = top + 22
    s = [f'<circle cx="{cx}" cy="{top+3}" r="3.5" fill="none" stroke="{OUT}" stroke-width="2.5"/>',
         f'<circle cx="{cx}" cy="{cy}" r="18" fill="#8b5a2b" stroke="{OUT}" stroke-width="3"/>']
    for a in range(0, 360, 40):
        x1 = cx + 9 * math.cos(math.radians(a)); y1 = cy + 9 * math.sin(math.radians(a))
        x2 = cx + 15 * math.cos(math.radians(a + 12)); y2 = cy + 15 * math.sin(math.radians(a + 12))
        s.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#5e3a17" stroke-width="2"/>')
    s.append(f'<circle cx="{cx-5}" cy="{cy-8}" r="2.6" fill="#3a220c"/><circle cx="{cx+5}" cy="{cy-8}" r="2.6" fill="#3a220c"/><circle cx="{cx}" cy="{cy-2}" r="2.6" fill="#3a220c"/>')
    return "".join(s)

def draw_platanos(cx, top):
    s = [f'<path d="M{cx-4},{top} L{cx+4},{top} L{cx+3},{top+14} L{cx-3},{top+14} Z" fill="#6b8e23" stroke="{OUT}" stroke-width="2.5"/>']
    for dx, rot in ((-12, 18), (12, -18), (0, 0)):
        s.append(f'<g transform="rotate({rot} {cx} {top+14})"><path d="M{cx+dx-5},{top+14} C{cx+dx-14},{top+30} {cx+dx-10},{top+50} {cx+dx+4},{top+56} C{cx+dx-2},{top+46} {cx+dx},{top+30} {cx+dx+5},{top+14} Z" fill="#ffd93b" stroke="{OUT}" stroke-width="2.6" stroke-linejoin="round"/>'
                 f'<circle cx="{cx+dx+4}" cy="{top+55}" r="2.2" fill="#5e3a17"/></g>')
    return "".join(s)

def draw_pina(cx, top):
    s = []
    for dx, h_ in ((-10, 16), (-4, 22), (4, 22), (10, 16), (0, 26)):
        s.append(f'<path d="M{cx+dx*0.4-4},{top+26} L{cx+dx},{top+26-h_} L{cx+dx*0.4+4},{top+26} Z" fill="#2fa84f" stroke="{OUT}" stroke-width="2.4" stroke-linejoin="round"/>')
    s.append(f'<ellipse cx="{cx}" cy="{top+48}" rx="19" ry="24" fill="#f6a623" stroke="{OUT}" stroke-width="3"/>')
    for (dx, dy) in ((-8, 34), (6, 34), (-13, 46), (0, 46), (13, 46), (-8, 58), (6, 58)):
        s.append(f'<path d="M{cx+dx-4},{top+dy-3} L{cx+dx},{top+dy+2} L{cx+dx+4},{top+dy-3}" fill="none" stroke="#b76e12" stroke-width="2" stroke-linecap="round"/>')
    s.append(f'<ellipse cx="{cx}" cy="{top+48}" rx="19" ry="24" fill="none" stroke="{OUT}" stroke-width="3"/>')
    return "".join(s)

def draw_mango(cx, top):
    cy = top + 24
    return (f'<line x1="{cx}" y1="{top}" x2="{cx}" y2="{top+8}" stroke="#5e3a17" stroke-width="3"/>'
            f'<path d="M{cx},{top+6} q14,-10 22,-2 q-12,8 -22,2 Z" fill="#2fa84f" stroke="{OUT}" stroke-width="2.2" stroke-linejoin="round"/>'
            f'<path d="M{cx},{top+8} C{cx+22},{top+6} {cx+26},{top+34} {cx+6},{top+44} C{cx-14},{top+52} {cx-24},{top+30} {cx-14},{top+16} C{cx-10},{top+10} {cx-5},{top+8} {cx},{top+8} Z" fill="#ff7a3d" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>'
            f'<path d="M{cx+4},{top+12} C{cx+18},{top+14} {cx+18},{top+30} {cx+8},{top+38}" fill="none" stroke="#ffc94d" stroke-width="5" stroke-linecap="round" opacity=".8"/>')

def draw_cesta(cx, top):
    w, h = 92, 58
    l = cx - w / 2
    yb = top + 26
    s = [f'<path d="M{l+12},{yb} Q{cx},{top-6} {l+w-12},{yb}" fill="none" stroke="{OUT}" stroke-width="8"/>',
         f'<path d="M{l+12},{yb} Q{cx},{top-6} {l+w-12},{yb}" fill="none" stroke="#c98a3f" stroke-width="4"/>',
         f'<path d="M{l},{yb} L{l+w},{yb} L{l+w-10},{yb+h} L{l+10},{yb+h} Z" fill="#d99b4e" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>']
    for i in range(1, 4):
        s.append(f'<line x1="{l+3+i*0}" y1="{yb+i*h/4:.1f}" x2="{l+w-3}" y2="{yb+i*h/4:.1f}" stroke="#a8692a" stroke-width="2"/>')
    s.append(f'<rect x="{l-3}" y="{yb-5}" width="{w+6}" height="10" rx="4" fill="#c98a3f" stroke="{OUT}" stroke-width="3"/>')
    s.append(text(cx, yb + 34, "?", 36, 900, col="#fff", extra=f'stroke="{OUT}" stroke-width="2.2" paint-order="stroke"'))
    return "".join(s)

COCO = Kind("coco", c, 42, 36, draw_coco, ring=3)
PLATANOS = Kind("plátanos", pl, 58, 44, draw_platanos, ring=2)
PINA = Kind("piña", n, 74, 40, draw_pina, ring=4)
MANGO = Kind("mango", m, 52, 44, draw_mango, ring=2)
CESTA = Kind("cesta", x * c, 84, 92, draw_cesta, ring=4)

BEAM = dict(col="#c98a3f", hl="#f0c389")

def bambu(x, ytop, ybot, w=18):
    s = [f'<rect x="{x-w/2}" y="{ytop}" width="{w}" height="{ybot-ytop}" rx="5" fill="#7cc242" stroke="{OUT}" stroke-width="3"/>']
    y = ytop + 40
    while y < ybot - 10:
        s.append(f'<line x1="{x-w/2}" y1="{y}" x2="{x+w/2}" y2="{y}" stroke="{OUT}" stroke-width="2.5"/>')
        y += 46
    s.append(f'<line x1="{x-w/2+5}" y1="{ytop+6}" x2="{x-w/2+5}" y2="{ybot-6}" stroke="#b7e58c" stroke-width="2.5"/>')
    return "".join(s)

def hoja(cx, cy, L, rot, col="#2e8b57"):
    return (f'<g transform="rotate({rot} {cx} {cy})"><path d="M{cx},{cy} Q{cx+L*0.5},{cy-L*0.35} {cx+L},{cy} Q{cx+L*0.5},{cy+L*0.35} {cx},{cy} Z" fill="{col}" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>'
            f'<line x1="{cx}" y1="{cy}" x2="{cx+L*0.9}" y2="{cy}" stroke="#1d5e3a" stroke-width="2"/></g>')

def rana(cx, base):
    return (f'<ellipse cx="{cx}" cy="{base-14}" rx="22" ry="14" fill="#56c271" stroke="{OUT}" stroke-width="3"/>'
            f'<circle cx="{cx-10}" cy="{base-28}" r="8" fill="#56c271" stroke="{OUT}" stroke-width="3"/><circle cx="{cx+10}" cy="{base-28}" r="8" fill="#56c271" stroke="{OUT}" stroke-width="3"/>'
            f'<circle cx="{cx-10}" cy="{base-28}" r="3.5" fill="{OUT}"/><circle cx="{cx+10}" cy="{base-28}" r="3.5" fill="{OUT}"/>'
            f'<path d="M{cx-10},{base-12} Q{cx},{base-6} {cx+10},{base-12}" fill="none" stroke="{OUT}" stroke-width="2.5"/>')

def mariposa(cx, cy, col):
    return (f'<g transform="rotate(-12 {cx} {cy})"><ellipse cx="{cx-10}" cy="{cy-6}" rx="11" ry="9" fill="{col}" stroke="{OUT}" stroke-width="2.5"/>'
            f'<ellipse cx="{cx+10}" cy="{cy-6}" rx="11" ry="9" fill="{col}" stroke="{OUT}" stroke-width="2.5"/>'
            f'<ellipse cx="{cx-7}" cy="{cy+7}" rx="7" ry="6" fill="{col}" stroke="{OUT}" stroke-width="2.5"/>'
            f'<ellipse cx="{cx+7}" cy="{cy+7}" rx="7" ry="6" fill="{col}" stroke="{OUT}" stroke-width="2.5"/>'
            f'<line x1="{cx}" y1="{cy-12}" x2="{cx}" y2="{cy+12}" stroke="{OUT}" stroke-width="4" stroke-linecap="round"/></g>')

def build():
    sc = Scene(1400, 900)
    # ----- fondo -----
    sc.add('<defs><linearGradient id="selva" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9f7c8"/><stop offset="1" stop-color="#93d8a6"/></linearGradient>'
           '</defs>', 0)
    sc.add('<rect width="1400" height="900" fill="url(#selva)"/>', 0)
    sc.add('<path d="M0,560 Q120,470 260,540 T520,520 T820,540 T1100,500 T1400,540 L1400,900 L0,900 Z" fill="#6cc08a" opacity=".55"/>', 1)
    sc.add('<path d="M0,650 Q180,590 380,640 T780,620 T1150,640 T1400,610 L1400,900 L0,900 Z" fill="#4fae73" opacity=".5"/>', 1)
    # matorrales de fondo
    for (bx_, by_, r_) in ((820, 790, 60), (880, 800, 44), (1290, 792, 56), (60, 800, 40)):
        sc.add(f'<circle cx="{bx_}" cy="{by_}" r="{r_}" fill="#3f9e63" stroke="#1f1d1b" stroke-width="3"/>', 4)
    # suelo
    sc.add(f'<path d="M0,{GROUND} Q350,{GROUND-14} 700,{GROUND} T1400,{GROUND-6} L1400,900 L0,900 Z" fill="#7a5230" stroke="{OUT}" stroke-width="3"/>', 5)
    for gx in range(20, 1400, 46):
        sc.add(f'<path d="M{gx},{GROUND+2} l6,-16 l4,14 l6,-12 l3,14" fill="none" stroke="#3d9a5a" stroke-width="3" stroke-linejoin="round"/>', 6)
    # gran rama superior (fija)
    sc.add('<path d="M-10,20 L-10,120 Q40,100 120,96 L1300,74 Q1340,72 1346,60 Q1340,46 1300,48 L120,52 Q40,50 -10,20 Z" fill="#8b5a2b" stroke="#1f1d1b" stroke-width="3.5" stroke-linejoin="round"/>'
           '<path d="M140,68 L1280,60" stroke="#b07a45" stroke-width="3" stroke-linecap="round"/>', 15)
    for (hx, hy, L, rot) in [(1300, 54, 70, -30), (1310, 66, 60, 20), (40, 60, 80, -150), (60, 90, 70, 150), (420, 56, 50, -70), (980, 50, 50, -110)]:
        sc.add(hoja(hx, hy, L, rot), 16)
    # serpiente en la rama (no cuenta)
    sc.add('<path d="M240,52 C260,30 290,30 300,50 S340,70 360,50 S400,30 420,52" fill="none" stroke="#1f1d1b" stroke-width="13" stroke-linecap="round"/>'
           '<path d="M240,52 C260,30 290,30 300,50 S340,70 360,50 S400,30 420,52" fill="none" stroke="#e8c33b" stroke-width="8" stroke-linecap="round"/>'
           '<circle cx="424" cy="50" r="9" fill="#e8c33b" stroke="#1f1d1b" stroke-width="3"/><circle cx="427" cy="47" r="2.2" fill="#1f1d1b"/>', 17)
    sc.add(mariposa(1080, 300, "#ff6fb5"), 70)
    sc.add(mariposa(140, 380, "#5aa9ff"), 70)
    # cocos caídos en el suelo (no cuentan)
    for (gx, gy) in ((1330, GROUND - 16), (1366, GROUND - 14)):
        sc.add(f'<circle cx="{gx}" cy="{gy}" r="16" fill="#8b5a2b" stroke="{OUT}" stroke-width="3"/>', 8)

    # ================= M: cuelga de la rama =================
    M = Beam(sc, "M", 790, 190, 60, -4, 4, **BEAM)
    sc.rope(M.px, 64, M.px, M.y, z=29, w=5, col="#3d6b2a")
    # ---- polea móvil con la viga W ----
    R = 24
    kp = -4
    xs = M.X(kp)
    pc = (xs - R, 298)
    fixed_x = pc[0] - R
    sc.path(f'M{fixed_x},{70} L{fixed_x},{pc[1]} A{R},{R} 0 0 0 {xs},{pc[1]} L{xs},{M.y}', z=30, w=3)
    sc.add(f'<circle cx="{fixed_x}" cy="74" r="4" fill="{OUT}"/>', 31)
    sc.add(f'<path d="M{pc[0]-11},{pc[1]} L{pc[0]},{pc[1]+R+14} L{pc[0]+11},{pc[1]}" fill="none" stroke="{OUT}" stroke-width="4" stroke-linejoin="round"/>', 33)
    sc.add(polea(pc[0], pc[1], R, "#e3d3b5"), 34)
    W = Beam(sc, "W", pc[0], 370, 50, -3, 2, **BEAM)
    sc.rope(W.px, pc[1] + R + 14, W.px, W.y - 12, z=31, w=3)
    sc.add(f'<circle cx="{W.px}" cy="{W.y-14}" r="5" fill="none" stroke="{OUT}" stroke-width="3"/>', 51)
    W.hang(-3, MANGO)
    W.hang(0, PLATANOS)
    W.hang(2, [PINA, COCO])
    W.draw()
    M.force(kp, W.total() / 2, "polea móvil con W")
    M.hang(-3, COCO)
    M.hang(-2, PINA)
    M.hang(1, MANGO)
    M.hang(3, CESTA, drop=16)
    M.draw()

    # ================= X e Y comparten cuerda por una polea =================
    Rq = 30
    PQ = (400, 500)
    X = Beam(sc, "X", PQ[0] - Rq - 4 * 50, 630, 50, -2, 4, margin=14, **BEAM)
    Y = Beam(sc, "Y", PQ[0] + Rq + 3 * 50, 592, 50, -3, 3, margin=14, **BEAM)
    sc.add(bambu(PQ[0], PQ[1], GROUND + 4, 16), 20)
    sc.add(bambu(X.px, X.y, GROUND + 4), 20)
    sc.add(bambu(Y.px, Y.y, GROUND + 4), 20)
    sc.path(f'M{X.X(4)},{X.y} L{X.X(4)},{PQ[1]} A{Rq},{Rq} 0 0 1 {Y.X(-3)},{PQ[1]} L{Y.X(-3)},{Y.y}', z=30, w=3)
    sc.add(polea(PQ[0], PQ[1], Rq, "#e3d3b5"), 34)
    X.force(4, -T, "cuerda compartida")
    Y.force(-3, -T, "cuerda compartida")
    X.hang(-2, COCO)
    X.hang(2, [PINA, PLATANOS], drop=14, gap=2)
    Y.hang(-2, PLATANOS)
    Y.hang(-1, PINA)
    X.draw(); Y.draw()

    # ================= Z: polea montada en la viga, anclada al suelo =================
    Z = Beam(sc, "Z", 1000, 640, 50, -2, 3, **BEAM)
    sc.add(bambu(Z.px, Z.y, GROUND + 4), 20)
    Rz = 20
    zx = Z.X(3)
    zc = (zx, 704)
    sc.add(f'<line x1="{zx}" y1="{Z.y}" x2="{zx}" y2="{zc[1]}" stroke="{OUT}" stroke-width="6"/>', 33)
    stake_y = GROUND - 4
    sc.path(f'M{zx-Rz},{stake_y} L{zx-Rz},{zc[1]} A{Rz},{Rz} 0 0 1 {zx+Rz},{zc[1]} L{zx+Rz},{zc[1]+30}', z=30, w=3)
    sc.add(f'<path d="M{zx-Rz-8},{GROUND+14} L{zx-Rz},{stake_y-6} L{zx-Rz+8},{GROUND+14} Z" fill="#c98a3f" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>', 36)
    sc.add(polea(zc[0], zc[1], Rz, "#e3d3b5"), 34)
    sc.add(draw_platanos(zx + Rz, zc[1] + 28), 40)
    Z.force(3, 2 * pl, "polea sobre la viga")
    Z.hang(-2, [PINA, COCO])
    Z.draw()

    sc.add(rana(486, GROUND + 2), 70)
    return sc, dict(M=M, W=W, X=X, Y=Y, Z=Z)

if __name__ == "__main__":
    sc, B = build()
    for nme, bm in B.items():
        print(nme, "eq:", bm.eq(), " total:", bm.total())
    print("solución:", sc.solve([c, pl, n, m, T, x], c))
    open(sys.argv[1] if len(sys.argv) > 1 else "p5.svg", "w", encoding="utf-8").write(
        sc.svg("Acertijo de la selva: ¿cuántos cocos hay en la cesta?"))
