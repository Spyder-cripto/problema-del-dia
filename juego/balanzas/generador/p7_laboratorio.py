"""Puzle 7 — El laboratorio"""
import math, sys
import sympy as sp
from lib import *

i_, p, m, b, g, x = sp.symbols("iman pila matraz libro globo x", positive=True)
FLOOR = 800

# ---------- objetos ----------
def draw_iman(cx, top):
    s = [f'<circle cx="{cx}" cy="{top+3}" r="3.5" fill="none" stroke="{OUT}" stroke-width="2.5"/>',
         f'<path d="M{cx-18},{top+44} L{cx-18},{top+22} A18,16 0 0 1 {cx+18},{top+22} L{cx+18},{top+44} L{cx+8},{top+44} L{cx+8},{top+22} A8,7 0 0 0 {cx-8},{top+22} L{cx-8},{top+44} Z" fill="#e63946" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<rect x="{cx-18}" y="{top+36}" width="10" height="9" fill="#d7dde3" stroke="{OUT}" stroke-width="2.5"/>',
         f'<rect x="{cx+8}" y="{top+36}" width="10" height="9" fill="#d7dde3" stroke="{OUT}" stroke-width="2.5"/>']
    return "".join(s)

def draw_pila(cx, top):
    s = [f'<rect x="{cx-5}" y="{top}" width="10" height="7" rx="2" fill="#c9cfd6" stroke="{OUT}" stroke-width="2.5"/>',
         f'<rect x="{cx-14}" y="{top+6}" width="28" height="44" rx="5" fill="#2fbf71" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{cx-14}" y="{top+6}" width="28" height="13" rx="5" fill="#ffd23f" stroke="{OUT}" stroke-width="3"/>',
         f'<path d="M{cx-5},{top+33} L{cx+5},{top+33} M{cx},{top+28} L{cx},{top+38}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>']
    return "".join(s)

def draw_matraz(cx, top):
    s = [f'<rect x="{cx-7}" y="{top}" width="14" height="6" rx="2" fill="#c98a5a" stroke="{OUT}" stroke-width="2.5"/>',
         f'<path d="M{cx-6},{top+6} L{cx-6},{top+20} L{cx-23},{top+52} Q{cx-24},{top+58} {cx-17},{top+58} L{cx+17},{top+58} Q{cx+24},{top+58} {cx+23},{top+52} L{cx+6},{top+20} L{cx+6},{top+6} Z" fill="#eef8ff" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<path d="M{cx-15},{top+36} L{cx+15},{top+36} L{cx+22},{top+52} Q{cx+23},{top+56} {cx+17},{top+56} L{cx-17},{top+56} Q{cx-23},{top+56} {cx-22},{top+52} Z" fill="#57e389"/>',
         f'<circle cx="{cx-4}" cy="{top+46}" r="3" fill="#fff" opacity=".8"/><circle cx="{cx+6}" cy="{top+41}" r="2" fill="#fff" opacity=".8"/><circle cx="{cx+2}" cy="{top+29}" r="2.4" fill="#57e389" stroke="{OUT}" stroke-width="1.2"/>',
         f'<path d="M{cx-6},{top+6} L{cx-6},{top+20} L{cx-23},{top+52} Q{cx-24},{top+58} {cx-17},{top+58} L{cx+17},{top+58} Q{cx+24},{top+58} {cx+23},{top+52} L{cx+6},{top+20} L{cx+6},{top+6} Z" fill="none" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>']
    return "".join(s)

def draw_libro(cx, top):
    w, h = 58, 36
    yb = top + 10
    s = [f'<path d="M{cx},{top} L{cx},{yb}" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{cx-w/2}" y="{yb}" width="{w}" height="{h}" rx="4" fill="#7b4cc2" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{cx-w/2+4}" y="{yb+h-9}" width="{w-6}" height="6" fill="#fffaf0" stroke="{OUT}" stroke-width="2"/>',
         f'<rect x="{cx-w/2}" y="{yb}" width="10" height="{h}" rx="3" fill="#5b2f9c" stroke="{OUT}" stroke-width="3"/>',
         f'<line x1="{cx-8}" y1="{yb+12}" x2="{cx+18}" y2="{yb+12}" stroke="#ffd23f" stroke-width="3"/>',
         f'<path d="M{cx-w/2-2},{yb+h/2-2} L{cx+w/2+2},{yb+h/2-2}" stroke="{ROPE}" stroke-width="2.5"/>']
    return "".join(s)

def draw_maletin(cx, top):
    w, h = 92, 60
    l = cx - w / 2
    yb = top + 18
    s = [f'<path d="M{cx-16},{yb} L{cx-16},{top+4} Q{cx-16},{top} {cx-12},{top} L{cx+12},{top} Q{cx+16},{top} {cx+16},{top+4} L{cx+16},{yb}" fill="none" stroke="{OUT}" stroke-width="7"/>',
         f'<path d="M{cx-16},{yb} L{cx-16},{top+4} Q{cx-16},{top} {cx-12},{top} L{cx+12},{top} Q{cx+16},{top} {cx+16},{top+4} L{cx+16},{yb}" fill="none" stroke="#9aa5b0" stroke-width="3"/>',
         f'<rect x="{l}" y="{yb}" width="{w}" height="{h}" rx="8" fill="#3d7dd8" stroke="{OUT}" stroke-width="3"/>',
         f'<line x1="{l}" y1="{yb+18}" x2="{l+w}" y2="{yb+18}" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{l+10}" y="{yb+12}" width="12" height="12" rx="2" fill="#ffd23f" stroke="{OUT}" stroke-width="2.5"/>',
         f'<rect x="{l+w-22}" y="{yb+12}" width="12" height="12" rx="2" fill="#ffd23f" stroke="{OUT}" stroke-width="2.5"/>',
         text(cx, yb + 40, "?", 34, 900, col="#fff", extra=f'stroke="{OUT}" stroke-width="2.2" paint-order="stroke"')]
    return "".join(s)

IMAN = Kind("imán", i_, 46, 36, draw_iman, ring=3)
PILA = Kind("pila", p, 50, 28, draw_pila, ring=2)
MATRAZ = Kind("matraz", m, 58, 48, draw_matraz, ring=2)
LIBRO = Kind("libro", b, 46, 60, draw_libro, ring=2)
MALETIN = Kind("maletín", x * i_, 78, 92, draw_maletin, ring=2)

BEAM = dict(col="#f4a340", hl="#ffd59a")
GLOBO_COL = "#ff8fab"

def gear(cx, cy, r, teeth, col, phase=0.0):
    pts = []
    for k in range(teeth):
        a0 = 2 * math.pi * k / teeth + phase
        da = 2 * math.pi / teeth
        for (fa, rr) in ((0.0, r - 7), (0.18, r - 7), (0.28, r + 7), (0.52, r + 7), (0.62, r - 7), (1.0, r - 7)):
            a = a0 + fa * da
            pts.append(f"{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="{col}" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>'

def build():
    sc = Scene(1400, 900)
    # ----- fondo -----
    sc.add('<rect width="1400" height="900" fill="#e9e4ff"/>', 0)
    for yy in range(0, FLOOR, 56):
        sc.add(f'<line x1="0" y1="{yy}" x2="1400" y2="{yy}" stroke="#d9d1fb" stroke-width="2"/>', 0)
    sc.add(f'<rect x="0" y="{FLOOR}" width="1400" height="100" fill="#4b4f7a"/>'
           + "".join(f'<line x1="{xx}" y1="{FLOOR}" x2="{xx-40}" y2="900" stroke="#3c4068" stroke-width="3"/>' for xx in range(40, 1460, 90))
           + f'<line x1="0" y1="{FLOOR}" x2="1400" y2="{FLOOR}" stroke="{OUT}" stroke-width="3"/>', 3)
    sc.add(f'<rect x="0" y="0" width="1400" height="36" fill="#6c63c9" stroke="{OUT}" stroke-width="3"/>', 15)
    # pizarra
    sc.add(f'<rect x="1150" y="70" width="226" height="170" rx="6" fill="#2f5d50" stroke="#8a5a2b" stroke-width="10"/>'
           f'<ellipse cx="1220" cy="150" rx="40" ry="14" fill="none" stroke="#e8f5e9" stroke-width="2.5"/>'
           f'<ellipse cx="1220" cy="150" rx="40" ry="14" fill="none" stroke="#e8f5e9" stroke-width="2.5" transform="rotate(60 1220 150)"/>'
           f'<ellipse cx="1220" cy="150" rx="40" ry="14" fill="none" stroke="#e8f5e9" stroke-width="2.5" transform="rotate(-60 1220 150)"/>'
           f'<circle cx="1220" cy="150" r="5" fill="#ffd23f"/>'
           + text(1318, 128, "E=mc", 24, 700, col="#e8f5e9") + text(1352, 116, "2", 14, 700, col="#e8f5e9")
           + f'<path d="M1282,190 q12,-18 24,0 t24,0" fill="none" stroke="#e8f5e9" stroke-width="2.5"/>', 5)
    # estantería con matraces (fijos: no cuentan)
    sc.add(f'<rect x="1160" y="380" width="210" height="14" rx="3" fill="#a0673a" stroke="{OUT}" stroke-width="3"/>'
           f'<path d="M1176,394 L1176,420 L1200,394 Z M1350,394 L1350,420 L1326,394 Z" fill="#a0673a" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>', 6)
    sc.add(draw_matraz(1200, 380 - 58).replace(f'<rect x="{1200-7}" y="{380-58}" width="14" height="6" rx="2" fill="#c98a5a" stroke="{OUT}" stroke-width="2.5"/>', ''), 7)
    sc.add(draw_pila(1262, 380 - 50), 7)
    sc.add(draw_matraz(1324, 380 - 58).replace(f'<rect x="{1324-7}" y="{380-58}" width="14" height="6" rx="2" fill="#c98a5a" stroke="{OUT}" stroke-width="2.5"/>', ''), 7)
    # pecera con pez en el suelo (no cuenta)
    sc.add(f'<ellipse cx="520" cy="{FLOOR-42}" rx="50" ry="44" fill="#bfe9ff" stroke="{OUT}" stroke-width="3" opacity=".9"/>'
           f'<path d="M500,{FLOOR-44} q14,-14 30,0 q-16,14 -30,0 Z M530,{FLOOR-44} l12,-9 l0,18 Z" fill="#ff9f1c" stroke="{OUT}" stroke-width="2.4" stroke-linejoin="round"/>'
           f'<circle cx="508" cy="{FLOOR-47}" r="2" fill="{OUT}"/>', 8)

    def globo(beam, kk, dx, h=96):
        xx = beam.X(kk)
        sc.add(globo_svg(xx, beam.y, xx + dx, beam.y - h, col=GLOBO_COL), 62)
        beam.force(kk, -g, "globo")

    # ================= ENGRANAJES =================
    U = 30
    A_c, rA = (130, 196), 2 * U
    B_c, rB = (130 + 2 * U + 3 * U, 196), 3 * U
    sc.add(gear(B_c[0], B_c[1], rB, 18, "#5fb7ff", phase=math.pi / 18), 44)
    sc.add(gear(A_c[0], A_c[1], rA, 12, "#ffd23f", phase=0.0), 45)
    for (cc, rr) in ((A_c, rA), (B_c, rB)):
        sc.add(f'<circle cx="{cc[0]}" cy="{cc[1]}" r="{rr}" fill="none" stroke="{OUT}" stroke-width="2" stroke-dasharray="5 6" opacity=".55"/>', 46)
        sc.add(f'<circle cx="{cc[0]}" cy="{cc[1]}" r="{U}" fill="#e63946" stroke="{OUT}" stroke-width="3"/>', 47)
        sc.add(f'<line x1="{cc[0]}" y1="{cc[1]}" x2="{cc[0]}" y2="{cc[1]-rr}" stroke="{OUT}" stroke-width="7" stroke-linecap="round"/>'
               f'<line x1="{cc[0]}" y1="{cc[1]}" x2="{cc[0]}" y2="{cc[1]-rr}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>', 48)
        for k in range(1, rr // U + 1):
            sc.add(f'<circle cx="{cc[0]}" cy="{cc[1]-U*k}" r="4.2" fill="{OUT}"/>', 49)
        sc.add(f'<circle cx="{cc[0]}" cy="{cc[1]}" r="8.5" fill="#fff" stroke="{OUT}" stroke-width="3"/><circle cx="{cc[0]}" cy="{cc[1]}" r="3" fill="{OUT}"/>', 49)
    # libro colgado del tambor del engranaje A (lado izquierdo)
    sc.path(f'M{A_c[0]},{A_c[1]-U} A{U},{U} 0 0 0 {A_c[0]-U},{A_c[1]} L{A_c[0]-U},{A_c[1]+140}', z=48, w=3.5)
    sc.add(draw_libro(A_c[0] - U, A_c[1] + 136), 40)
    # cuerda del tambor de B (lado izquierdo) baja a la viga G y tira hacia arriba
    G = Beam(sc, "G", B_c[0] - U + 2 * 55, 470, 55, -3, 3, **BEAM)
    assert abs(G.X(-2) - (B_c[0] - U)) < 0.1
    sc.path(f'M{B_c[0]},{B_c[1]-U} A{U},{U} 0 0 0 {B_c[0]-U},{B_c[1]} L{B_c[0]-U},{G.y}', z=48, w=3.5)
    # par: libro·1 = F·2 (A) ; F·3 = T·1 (B)  => T = 3/2·libro
    G.force(-2, -sp.Rational(3, 2) * b, "tambor del engranaje")
    sc.add(poste(G.px, G.y, FLOOR + 4, w=20, col="#6c63c9", hl="#a59ef0"), 20)
    G.hang(-3, [MATRAZ, PILA], drop=14, gap=2)
    G.hang(3, IMAN, drop=16)
    G.draw()

    # ================= M (techo) con S colgante =================
    M = Beam(sc, "M", 860, 170, 60, -4, 4, **BEAM)
    sc.rope(M.px, 36, M.px, M.y, z=29, w=5, col=OUT)
    S = Beam(sc, "S", M.X(-4), 312, 50, -3, 3, **BEAM)
    S.hang(-2, LIBRO, drop=14)
    globo(S, -1, -22)
    S.hang(0, PILA, drop=14)
    S.hang(1, MATRAZ, drop=14)
    S.draw()
    hang_beam(M, -4, S)
    M.hang(-3, LIBRO, drop=14)
    M.hang(-1, MATRAZ, drop=14)
    M.hang(1, IMAN, drop=16)
    M.hang(3, MALETIN, drop=14)
    M.draw()

    # ================= H en un poste =================
    H = Beam(sc, "H", 730, 600, 55, -3, 3, **BEAM)
    sc.add(poste(H.px, H.y, FLOOR + 4, w=20, col="#6c63c9", hl="#a59ef0"), 20)
    H.hang(-2, MATRAZ, drop=14)
    H.hang(3, PILA, drop=14)
    H.draw()

    # ================= RAMPA 2/5 con vagoneta y polea móvil =================
    Ur = 60
    hR, LR = 2 * Ur, 5 * Ur
    base = math.sqrt(LR**2 - hR**2)
    apex = (1036, FLOOR - hR)
    foot = (apex[0] + base, FLOOR)
    dd = ((apex[0] - foot[0]) / LR, (apex[1] - foot[1]) / LR)   # hacia arriba-izquierda
    nup = (dd[1], -dd[0])
    if nup[1] > 0: nup = (-nup[0], -nup[1])
    ndn = (-nup[0], -nup[1])
    sc.add(f'<path d="M{apex[0]},{FLOOR} L{apex[0]},{apex[1]} L{foot[0]:.1f},{FLOOR} Z" fill="#b8f2e6" stroke="{OUT}" stroke-width="3.5" stroke-linejoin="round"/>', 10)
    h_att, R1 = 28, 15
    # polea fija en la cima: cuerda paralela a la ladera, baja por la izquierda
    xdesc = apex[0] - 26
    # centro = foot + h_att*nup + t*dd + R1*ndn ; x del tramo que baja = centro.x - R1
    tt = (xdesc + R1 - (foot[0] + h_att * nup[0] + R1 * ndn[0])) / dd[0]
    P1 = (foot[0] + h_att * nup[0] + tt * dd[0] + R1 * ndn[0], foot[1] + h_att * nup[1] + tt * dd[1] + R1 * ndn[1])
    T1 = (P1[0] - R1 * ndn[0], P1[1] - R1 * ndn[1])
    sc.add(f'<path d="M{apex[0]+4},{apex[1]+8} L{P1[0]:.1f},{P1[1]:.1f}" stroke="{OUT}" stroke-width="10" stroke-linecap="round"/>'
           f'<path d="M{apex[0]+4},{apex[1]+8} L{P1[0]:.1f},{P1[1]:.1f}" stroke="#6c63c9" stroke-width="5" stroke-linecap="round"/>', 33)
    # vagoneta con matraz + pila
    s_c = 150
    P0 = (foot[0] + s_c * dd[0], foot[1] + s_c * dd[1])
    ang = math.degrees(math.atan2(-dd[1], -dd[0]))   # dibujada mirando hacia abajo de la cuesta
    cart = (f'<rect x="-40" y="-30" width="80" height="22" rx="4" fill="#ff8fab" stroke="{OUT}" stroke-width="3"/>'
            f'<circle cx="-24" cy="-7" r="8" fill="#4b4f7a" stroke="{OUT}" stroke-width="3"/><circle cx="24" cy="-7" r="8" fill="#4b4f7a" stroke="{OUT}" stroke-width="3"/>'
            + draw_matraz(-16, -30 - 56) + draw_pila(20, -30 - 48))
    sc.add(f'<g transform="translate({P0[0]:.1f},{P0[1]:.1f}) rotate({ang:.3f})">{cart}</g>', 40)
    att = (P0[0] + 44 * dd[0] + h_att * nup[0], P0[1] + 44 * dd[1] + h_att * nup[1])
    # polea móvil bajo la cima
    R2 = 18
    P2 = (xdesc - R2, FLOOR - 92)
    fix_x = P2[0] - R2
    FIXY = apex[1] - 40
    sc.add(f'<rect x="{fix_x-30}" y="{FIXY-8}" width="42" height="14" rx="3" fill="#9aa5b0" stroke="{OUT}" stroke-width="3"/>'
           f'<rect x="{fix_x-36}" y="{FIXY-30}" width="12" height="56" rx="3" fill="#9aa5b0" stroke="{OUT}" stroke-width="3"/>', 22)
    sc.add(f'<path d="M{att[0]:.1f},{att[1]:.1f} L{T1[0]:.1f},{T1[1]:.1f} A{R1},{R1} 0 0 0 {xdesc:.1f},{P1[1]:.1f} L{xdesc:.1f},{P2[1]} '
           f'A{R2},{R2} 0 0 1 {fix_x:.1f},{P2[1]} L{fix_x:.1f},{FIXY}" fill="none" stroke="{OUT}" stroke-width="3" stroke-linecap="round"/>', 36)
    sc.add(polea(P1[0], P1[1], R1, "#ffe8a3"), 37)
    sc.add(f'<path d="M{P2[0]-9},{P2[1]} L{P2[0]},{P2[1]+R2+12} L{P2[0]+9},{P2[1]}" fill="none" stroke="{OUT}" stroke-width="4" stroke-linejoin="round"/>', 37)
    sc.add(polea(P2[0], P2[1], R2, "#ffe8a3"), 38)
    sc.add(draw_libro(P2[0], P2[1] + R2 + 10), 40)
    # cotas
    DIM = f'stroke="{OUT}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"'
    def on(s_, off):
        return (foot[0] + s_ * dd[0] + off * ndn[0], foot[1] + s_ * dd[1] + off * ndn[1])
    q1, q2 = on(18 / math.tan(math.asin(2 / 5)) + 24, 18), on(LR - 34, 18)
    sc.add(f'<g {DIM}><line x1="{q1[0]:.1f}" y1="{q1[1]:.1f}" x2="{q2[0]:.1f}" y2="{q2[1]:.1f}"/>' + arrow_head(q1[0], q1[1], -dd[0], -dd[1], 9) + arrow_head(q2[0], q2[1], dd[0], dd[1], 9) + '</g>', 12)
    tm = on(LR * 0.55, 40)
    sc.add(text(tm[0], tm[1], "5", 26, rot=math.degrees(math.atan2(-dd[1], -dd[0]))), 12)
    vx = apex[0] + 14
    sc.add(f'<g {DIM}><line x1="{vx}" y1="{apex[1]+28}" x2="{vx}" y2="{FLOOR-8}"/>' + arrow_head(vx, apex[1] + 28, 0, -1, 9) + arrow_head(vx, FLOOR - 8, 0, 1, 9) + '</g>', 12)
    sc.add(text(vx + 12, FLOOR - 50, "2", 26, anchor="start"), 12)
    # cuerda con tensión libro/2 = (matraz+pila)·2/5
    sc.extra_eqs.append((m + p) * sp.Rational(2, 5) - b / 2)
    return sc, dict(M=M, S=S, G=G, H=H)

if __name__ == "__main__":
    sc, BB = build()
    for nme, bm in BB.items():
        print(nme, "eq:", bm.eq(), " total:", bm.total())
    print("extra:", sc.extra_eqs)
    print("solución:", sc.solve([i_, p, m, b, g, x], i_))
    open(sys.argv[1] if len(sys.argv) > 1 else "p7.svg", "w", encoding="utf-8").write(
        sc.svg("Acertijo del laboratorio: ¿cuántos imanes hay en el maletín?"))
