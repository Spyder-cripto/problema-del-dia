"""Puzle 2 — El taller del inventor"""
import math, sys
import sympy as sp
from lib import *

n, l, t, d, x = sp.symbols("tuerca bombilla tetera despertador x", positive=True)
TILE = 60
GX = lambda i: 20 + TILE * i  # líneas de azulejo
BENCH = 832

# ---------- objetos ----------
def draw_tuerca(cx, top):
    r = 17
    cy = top + 15
    pts = " ".join(f"{cx + r*math.cos(math.radians(a)):.1f},{cy + r*math.sin(math.radians(a))*0.9:.1f}" for a in range(0, 360, 60))
    return (f'<polygon points="{pts}" fill="#b9c3cd" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>'
            f'<circle cx="{cx}" cy="{cy}" r="7" fill="#6f7b86" stroke="{OUT}" stroke-width="2.5"/>'
            f'<line x1="{cx}" y1="{cy-7}" x2="{cx}" y2="{cy+7}" stroke="{ROPE}" stroke-width="3"/>'
            f'<path d="M{cx-12},{cy-8} L{cx-4},{cy-13}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>')

def draw_bombilla(cx, top):
    s = [f'<rect x="{cx-9}" y="{top}" width="18" height="16" rx="3" fill="#a3adb7" stroke="{OUT}" stroke-width="3"/>',
         f'<line x1="{cx-9}" y1="{top+5.5}" x2="{cx+9}" y2="{top+5.5}" stroke="{OUT}" stroke-width="1.8"/>',
         f'<line x1="{cx-9}" y1="{top+10.5}" x2="{cx+9}" y2="{top+10.5}" stroke="{OUT}" stroke-width="1.8"/>',
         f'<path d="M{cx-8},{top+16} C{cx-8},{top+22} {cx-19},{top+24} {cx-19},{top+36} A19,19 0 0 0 {cx+19},{top+36} C{cx+19},{top+24} {cx+8},{top+22} {cx+8},{top+16} Z" fill="#ffd84a" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<path d="M{cx-6},{top+20} L{cx-6},{top+32} L{cx-2},{top+38} L{cx+2},{top+32} L{cx+6},{top+38} L{cx+6},{top+20}" fill="none" stroke="#c9741a" stroke-width="2"/>',
         f'<ellipse cx="{cx-9}" cy="{top+36}" rx="4" ry="7" fill="#fff" opacity=".6"/>']
    return "".join(s)

def draw_despertador(cx, top):
    cy = top + 38
    s = [f'<circle cx="{cx}" cy="{top+5}" r="5" fill="none" stroke="{OUT}" stroke-width="3"/>',
         f'<line x1="{cx}" y1="{top+10}" x2="{cx}" y2="{top+16}" stroke="{OUT}" stroke-width="3"/>']
    for sg in (-1, 1):
        bx, by = cx + sg * 17, top + 18
        s.append(f'<path d="M{bx-11},{by+5} A11,11 0 0 1 {bx+11},{by+5} Z" fill="#ffc63b" stroke="{OUT}" stroke-width="3" stroke-linejoin="round" transform="rotate({sg*28} {bx} {by+5})"/>')
        s.append(f'<line x1="{cx+sg*14}" y1="{cy+20}" x2="{cx+sg*20}" y2="{cy+28}" stroke="{OUT}" stroke-width="4" stroke-linecap="round"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="25" fill="#ec4b3c" stroke="{OUT}" stroke-width="3"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="17" fill="#fffaf0" stroke="{OUT}" stroke-width="2.5"/>')
    for a in range(0, 360, 90):
        s.append(f'<circle cx="{cx+13*math.cos(math.radians(a)):.1f}" cy="{cy+13*math.sin(math.radians(a)):.1f}" r="1.6" fill="{OUT}"/>')
    s.append(f'<path d="M{cx},{cy} L{cx},{cy-11} M{cx},{cy} L{cx+8},{cy+4}" stroke="{OUT}" stroke-width="2.6" stroke-linecap="round"/>')
    return "".join(s)

def draw_tetera(cx, top):
    by = top + 42
    s = [f'<path d="M{cx-22},{top+24} Q{cx-22},{top} {cx},{top} Q{cx+22},{top} {cx+22},{top+24}" fill="none" stroke="{OUT}" stroke-width="9" stroke-linecap="round"/>',
         f'<path d="M{cx-22},{top+24} Q{cx-22},{top} {cx},{top} Q{cx+22},{top} {cx+22},{top+24}" fill="none" stroke="#1b7f73" stroke-width="4" stroke-linecap="round"/>',
         f'<path d="M{cx-26},{by+2} Q{cx-44},{by-2} {cx-46},{by-20} L{cx-38},{by-22} Q{cx-36},{by-10} {cx-24},{by-6} Z" fill="#30b5a2" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<path d="M{cx+27},{by-10} Q{cx+44},{by-8} {cx+36},{by+12}" fill="none" stroke="{OUT}" stroke-width="3"/>',
         f'<ellipse cx="{cx}" cy="{by}" rx="30" ry="22" fill="#30b5a2" stroke="{OUT}" stroke-width="3"/>',
         f'<path d="M{cx-17},{by-19} Q{cx},{by-26} {cx+17},{by-19}" fill="#ffd84a" stroke="{OUT}" stroke-width="3"/>',
         f'<circle cx="{cx}" cy="{by-24}" r="4" fill="#ffd84a" stroke="{OUT}" stroke-width="2.5"/>',
         f'<path d="M{cx-22},{by+4} Q{cx},{by+12} {cx+22},{by+4}" fill="none" stroke="#ffd84a" stroke-width="4"/>',
         f'<ellipse cx="{cx-14}" cy="{by-6}" rx="5" ry="8" fill="#fff" opacity=".45" transform="rotate(30 {cx-14} {by-6})"/>']
    return "".join(s)

def draw_caja(cx, top):
    w, h = 88, 62
    l_, r_ = cx - w / 2, cx + w / 2
    yb = top + 18
    s = [f'<path d="M{cx-22},{yb} L{cx-22},{top+4} Q{cx-22},{top} {cx-18},{top} L{cx+18},{top} Q{cx+22},{top} {cx+22},{top+4} L{cx+22},{yb}" fill="none" stroke="{OUT}" stroke-width="8" stroke-linejoin="round"/>',
         f'<path d="M{cx-22},{yb} L{cx-22},{top+4} Q{cx-22},{top} {cx-18},{top} L{cx+18},{top} Q{cx+22},{top} {cx+22},{top+4} L{cx+22},{yb}" fill="none" stroke="#9aa5b0" stroke-width="3.5" stroke-linejoin="round"/>',
         f'<rect x="{l_}" y="{yb}" width="{w}" height="{h}" rx="6" fill="#e84a3d" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{l_}" y="{yb}" width="{w}" height="16" rx="6" fill="#c7372c" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{cx-8}" y="{yb+10}" width="16" height="12" rx="2" fill="#ffd84a" stroke="{OUT}" stroke-width="2.5"/>',
         text(cx, yb + 42, "?", 36, 900, col="#fff", extra=f'stroke="{OUT}" stroke-width="2.2" paint-order="stroke"')]
    return "".join(s)

TUERCA = Kind("tuerca", n, 30, 34, draw_tuerca, ring=15)
BOMBILLA = Kind("bombilla", l, 56, 38, draw_bombilla)
DESPERTADOR = Kind("despertador", d, 72, 60, draw_despertador)
TETERA = Kind("tetera", t, 64, 90, draw_tetera, ring=2)
CAJA = Kind("caja", x * n, 80, 88, draw_caja, ring=2)

BEAM = dict(col="#3b9be0", hl="#9ad0f5")

def bolt_plate(sc, x, y, s=30, z=20):
    sc.add(f'<rect x="{x-s/2}" y="{y-s/2}" width="{s}" height="{s}" rx="6" fill="#7b8794" stroke="{OUT}" stroke-width="3"/>'
           + "".join(f'<circle cx="{x+dx}" cy="{y+dy}" r="2.6" fill="{OUT}"/>' for dx in (-s/2+6, s/2-6) for dy in (-s/2+6, s/2-6)), z)

def build():
    sc = Scene(1400, 900)
    # ----- fondo: azulejos -----
    sc.add(f'<rect width="1400" height="900" fill="#e4f3f7"/>', 0)
    acc = {(2, 9): "#ffe08a", (5, 3): "#ffc9c2", (9, 11): "#bfeadf", (14, 2): "#ffe08a", (17, 10): "#ffc9c2",
           (20, 5): "#bfeadf", (12, 7): "#ffe08a", (3, 6): "#bfeadf", (22, 9): "#ffe08a"}
    for (i, j), c in acc.items():
        sc.add(f'<rect x="{GX(i)}" y="{GX(j)}" width="{TILE}" height="{TILE}" fill="{c}"/>', 0)
    g = []
    for i in range(0, 24):
        g.append(f'<line x1="{GX(i)}" y1="0" x2="{GX(i)}" y2="{BENCH}" />')
    for j in range(0, 14):
        g.append(f'<line x1="0" y1="{GX(j)}" x2="1400" y2="{GX(j)}" />')
    sc.add(f'<g stroke="#b7d6df" stroke-width="2">{"".join(g)}</g>', 1)
    # techo
    sc.add(f'<rect x="0" y="0" width="1400" height="22" fill="#8a5a34" stroke="{OUT}" stroke-width="3"/>', 2)
    # banco de trabajo
    sc.add(f'<rect x="-10" y="{BENCH}" width="1420" height="22" fill="#c98a4b" stroke="{OUT}" stroke-width="3"/>'
           f'<rect x="-10" y="{BENCH+22}" width="1420" height="60" fill="#9a6232" stroke="{OUT}" stroke-width="3"/>'
           f'<line x1="0" y1="{BENCH+8}" x2="1400" y2="{BENCH+8}" stroke="#e3ab6d" stroke-width="2.5"/>', 5)

    # ----- distractores de fondo -----
    # engranajes fijos en la pared
    def gear(cx, cy, r, teeth, col, z=8):
        pts = []
        for i in range(teeth * 2):
            a = math.pi * i / teeth
            rr = r if i % 2 == 0 else r - 9
            for da in (-0.18, 0.18):
                pts.append(f"{cx + rr*math.cos(a+da*math.pi/teeth*2):.1f},{cy + rr*math.sin(a+da*math.pi/teeth*2):.1f}")
        sc.add(f'<polygon points="{" ".join(pts)}" fill="{col}" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>'
               f'<circle cx="{cx}" cy="{cy}" r="{r*0.45:.1f}" fill="#e4f3f7" stroke="{OUT}" stroke-width="3"/>'
               f'<circle cx="{cx}" cy="{cy}" r="6" fill="{OUT}"/>', z)
    gear(1190, 330, 52, 10, "#f4a340")
    gear(1268, 392, 34, 8, "#9b7fd4")
    # lámpara colgada del techo (fija: no cuenta)
    sc.rope(1330, 22, 1330, 96, z=9, col=OUT, w=2.5)
    sc.add(f'<path d="M1306,120 L1312,96 L1348,96 L1354,120 Z" fill="#2f6f9e" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>', 10)
    sc.add(draw_bombilla(1330, 104), 9)

    # ================= TORNO =================
    TX, TY = 230, 170
    ra, Rb = 30, 90
    sc.add(f'<rect x="{TX-26}" y="{TY-26}" width="52" height="52" rx="8" fill="#7b8794" stroke="{OUT}" stroke-width="3"/>', 20)
    sc.add(f'<circle cx="{TX}" cy="{TY}" r="{Rb}" fill="#ffcf4d" stroke="{OUT}" stroke-width="3.5"/>'
           f'<circle cx="{TX}" cy="{TY}" r="{Rb-10}" fill="none" stroke="#e0a92a" stroke-width="3"/>', 45)
    for a in (30, 150, 210, 330):
        sc.add(f'<line x1="{TX}" y1="{TY}" x2="{TX + (Rb-10)*math.cos(math.radians(a)):.1f}" y2="{TY + (Rb-10)*math.sin(math.radians(a)):.1f}" stroke="{OUT}" stroke-width="7" stroke-linecap="round"/>'
               f'<line x1="{TX}" y1="{TY}" x2="{TX + (Rb-10)*math.cos(math.radians(a)):.1f}" y2="{TY + (Rb-10)*math.sin(math.radians(a)):.1f}" stroke="#ffcf4d" stroke-width="3" stroke-linecap="round"/>', 46)
    sc.add(f'<circle cx="{TX}" cy="{TY}" r="{ra}" fill="#e2483d" stroke="{OUT}" stroke-width="3.5"/>'
           f'<circle cx="{TX}" cy="{TY}" r="{ra-8}" fill="none" stroke="#b5352c" stroke-width="2.5"/>', 47)
    # radio marcado con puntos: 1 (eje) y 3 (rueda)
    sc.add(f'<line x1="{TX}" y1="{TY}" x2="{TX}" y2="{TY-Rb}" stroke="{OUT}" stroke-width="7" stroke-linecap="round"/>'
           f'<line x1="{TX}" y1="{TY}" x2="{TX}" y2="{TY-Rb}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>', 48)
    for k in (1, 2, 3):
        sc.add(f'<circle cx="{TX}" cy="{TY-ra*k}" r="4.2" fill="{OUT}"/>', 49)
    sc.add(f'<circle cx="{TX}" cy="{TY}" r="8.5" fill="#fff" stroke="{OUT}" stroke-width="3"/><circle cx="{TX}" cy="{TY}" r="3" fill="{OUT}"/>', 49)
    # cuerda del eje (tetera, a la izquierda) y de la rueda (derecha, sube la viga R)
    sc.path(f'M{TX},{TY-ra} A{ra},{ra} 0 0 0 {TX-ra},{TY} L{TX-ra},{TY+118}', z=48, w=3.5)
    sc.add(draw_tetera(TX - ra, TY + 118), 40)

    # ================= VIGA M (pared) =================
    M = Beam(sc, "M", GX(12), GX(3), TILE, -4, 4, **BEAM)
    bolt_plate(sc, M.px, M.y)
    # ================= VIGA R (cuelga de M en -4) =================
    R = Beam(sc, "R", M.X(-4), GX(6), TILE, -3, 3, style="hang", **BEAM)
    # cuerda del torno al punto -3 de R: tira hacia ARRIBA con tetera/3
    sc.path(f'M{TX},{TY-Rb} A{Rb},{Rb} 0 0 1 {TX+Rb},{TY} L{TX+Rb},{R.y}', z=44, w=3.5)
    assert abs(TX + Rb - R.X(-3)) < 0.1
    R.force(-3, -t * ra / Rb, "cuerda del torno")
    R.hang(-2, [TUERCA, TUERCA])
    R.hang(-1, BOMBILLA)
    R.hang(0, [TUERCA, TUERCA])
    R.hang(1, TUERCA)
    R.draw()
    hang_beam(M, -4, R)
    M.hang(-3, BOMBILLA)
    M.hang(-2, DESPERTADOR)
    M.hang(1, TUERCA)
    M.hang(2, CAJA, drop=58)
    M.hang(4, TETERA, drop=14)
    M.draw()

    # ================= VIGA Q + doble polea móvil =================
    Q = Beam(sc, "Q", GX(6), GX(9) - 10, TILE, -4, 2, margin=14, **BEAM)
    bolt_plate(sc, Q.px, Q.y)
    Q.hang(1, TETERA, drop=14)
    Q.hang(2, TUERCA)
    # poleas
    R2, R1 = 18, 34
    xs = Q.X(-4)              # tramo que tira de Q
    P2 = (xs - R2, Q.y + 64)  # polea pequeña
    P1 = (P2[0] - R1, Q.y + 140)
    FIX_Y = Q.y - 64
    fix_l, fix_r = 28, P2[0] - R2 + 10
    sc.add(f'<rect x="{fix_l-4}" y="{FIX_Y-9}" width="{fix_r-fix_l+8}" height="16" rx="4" fill="#7b8794" stroke="{OUT}" stroke-width="3"/>'
           f'<circle cx="{fix_l+6}" cy="{FIX_Y-1}" r="2.6" fill="{OUT}"/><circle cx="{fix_r-6}" cy="{FIX_Y-1}" r="2.6" fill="{OUT}"/>', 22)
    # cuerda 2: fijo -> baja por la izquierda de P2 -> sube a Q
    sc.path(f'M{P2[0]-R2},{FIX_Y} L{P2[0]-R2},{P2[1]} A{R2},{R2} 0 0 0 {xs},{P2[1]} L{xs},{Q.y}', z=30, w=3)
    # cuerda 1: fijo -> baja por la izquierda de P1 -> sube al gancho de P2
    hookP2 = P2[1] + R2 + 14
    sc.path(f'M{P1[0]-R1},{FIX_Y} L{P1[0]-R1},{P1[1]} A{R1},{R1} 0 0 0 {P1[0]+R1},{P1[1]} L{P1[0]+R1},{hookP2}', z=30, w=3)
    for (pc, rr) in ((P2, R2), (P1, R1)):
        sc.add(f'<path d="M{pc[0]-10},{pc[1]} L{pc[0]},{pc[1]+rr+14} L{pc[0]+10},{pc[1]}" fill="none" stroke="{OUT}" stroke-width="4" stroke-linejoin="round"/>'
               f'<circle cx="{pc[0]}" cy="{pc[1]+rr+14}" r="4" fill="none" stroke="{OUT}" stroke-width="3"/>', 33)
        sc.add(polea(pc[0], pc[1], rr, "#cfd7df"), 34)
    sc.add(draw_despertador(P1[0], P1[1] + R1 + 14), 40)
    Q.force(-4, d / 4, "doble polea")
    Q.draw()

    # ================= PALANCA ACODADA K =================
    K = Beam(sc, "K", GX(18), GX(8), TILE, -2, 4)
    kL, kR = -2, 4
    yL, yR = K.y + 90, K.y + 60
    xL, xR = K.X(kL), K.X(kR)
    arm = f'M{xL},{yL} L{K.px},{K.y} L{xR},{yR}'
    sc.add(f'<path d="{arm}" fill="none" stroke="{OUT}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>'
           f'<path d="{arm}" fill="none" stroke="#f0832a" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>', 50)
    bolt_plate(sc, K.px, K.y)
    sc.add(f'<circle cx="{K.px}" cy="{K.y}" r="8.5" fill="#fff" stroke="{OUT}" stroke-width="3"/><circle cx="{K.px}" cy="{K.y}" r="3" fill="{OUT}"/>', 51)
    for (xx, yy) in ((xL, yL), (xR, yR)):
        sc.add(f'<circle cx="{xx}" cy="{yy}" r="3.6" fill="{OUT}"/>', 51)
    # colgar desde los extremos (usa y propia)
    def hang_at(xx, yy, kinds, k):
        y = yy + 18
        tops = []
        for kd in kinds:
            tops.append(y); y += kd.h + 4
        sc.rope(xx, yy, xx, tops[-1] + min(kinds[-1].ring, kinds[-1].h / 2), z=30)
        for kd, tp in zip(kinds, tops):
            sc.add(kd.draw(xx, tp), 40)
            K.force(k, kd.w, kd.name)
    hang_at(xL, yL, [DESPERTADOR], kL)
    hang_at(xR, yR, [BOMBILLA, TUERCA], kR)

    # ----- más distractores -----
    # ratón en el banco
    mx, my = 760, BENCH
    sc.add(f'<path d="M{mx+22},{my-6} q24,-2 30,-16" fill="none" stroke="{OUT}" stroke-width="2.5"/>'
           f'<ellipse cx="{mx}" cy="{my-12}" rx="24" ry="13" fill="#a9a2b3" stroke="{OUT}" stroke-width="3"/>'
           f'<circle cx="{mx-16}" cy="{my-26}" r="8" fill="#e8b4c4" stroke="{OUT}" stroke-width="3"/>'
           f'<circle cx="{mx-24}" cy="{my-10}" r="2.2" fill="{OUT}"/><circle cx="{mx-32}" cy="{my-6}" r="2.6" fill="#e8798f"/>', 70)
    # destornillador en el banco
    sc.add(f'<rect x="980" y="{BENCH-14}" width="54" height="14" rx="6" fill="#ffd84a" stroke="{OUT}" stroke-width="3"/>'
           f'<rect x="1034" y="{BENCH-9}" width="58" height="5" fill="#a3adb7" stroke="{OUT}" stroke-width="2"/>', 70)
    return sc, dict(M=M, R=R, Q=Q, K=K)

if __name__ == "__main__":
    sc, B = build()
    for name, b in B.items():
        print(name, "eq:", b.eq(), " total:", b.total())
    sol = sc.solve([n, l, t, d, x], n)
    print("solución:", sol)
    open(sys.argv[1] if len(sys.argv) > 1 else "p2.svg", "w", encoding="utf-8").write(
        sc.svg("Acertijo del taller: ¿cuántas tuercas hay en la caja de herramientas?"))
