"""Puzle 8 — El castillo"""
import math, sys
import sympy as sp
from lib import *

c, k, e, s_, y, x = sp.symbols("corona caliz escudo espada yelmo x", positive=True)
FLOOR = 800
GOLD = "#ffc83d"

# ---------- objetos ----------
def draw_corona(cx, top):
    yb = top + 8
    s = [f'<circle cx="{cx}" cy="{top+3}" r="3.5" fill="none" stroke="{OUT}" stroke-width="2.5"/>',
         f'<path d="M{cx-20},{yb+26} L{cx-20},{yb+4} L{cx-10},{yb+14} L{cx},{yb} L{cx+10},{yb+14} L{cx+20},{yb+4} L{cx+20},{yb+26} Z" fill="{GOLD}" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<rect x="{cx-20}" y="{yb+19}" width="40" height="7" fill="#f0a500" stroke="{OUT}" stroke-width="2.5"/>',
         f'<circle cx="{cx}" cy="{yb+13}" r="3.5" fill="#e63946" stroke="{OUT}" stroke-width="1.8"/>']
    return "".join(s)

def draw_caliz(cx, top):
    s = [f'<circle cx="{cx}" cy="{top+3}" r="3.5" fill="none" stroke="{OUT}" stroke-width="2.5"/>',
         f'<path d="M{cx-16},{top+8} L{cx+16},{top+8} Q{cx+16},{top+30} {cx+3},{top+32} L{cx+3},{top+42} L{cx+11},{top+48} L{cx-11},{top+48} L{cx-3},{top+42} L{cx-3},{top+32} Q{cx-16},{top+30} {cx-16},{top+8} Z" fill="{GOLD}" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<circle cx="{cx}" cy="{top+18}" r="3.2" fill="#3a86ff" stroke="{OUT}" stroke-width="1.8"/>',
         f'<path d="M{cx-11},{top+12} Q{cx-11},{top+24} {cx-5},{top+27}" fill="none" stroke="#fff3c4" stroke-width="2.5" stroke-linecap="round"/>']
    return "".join(s)

def draw_escudo(cx, top):
    yb = top + 8
    s = [f'<circle cx="{cx}" cy="{top+3}" r="3.5" fill="none" stroke="{OUT}" stroke-width="2.5"/>',
         f'<path d="M{cx-22},{yb} L{cx+22},{yb} L{cx+22},{yb+20} Q{cx+20},{yb+40} {cx},{yb+50} Q{cx-20},{yb+40} {cx-22},{yb+20} Z" fill="#e63946" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<path d="M{cx-5},{yb} L{cx+5},{yb} L{cx+5},{yb+48} L{cx-5},{yb+48} Z" fill="{GOLD}"/>',
         f'<path d="M{cx-22},{yb+15} L{cx+22},{yb+15} L{cx+22},{yb+24} L{cx-21},{yb+24} Z" fill="{GOLD}"/>',
         f'<path d="M{cx-22},{yb} L{cx+22},{yb} L{cx+22},{yb+20} Q{cx+20},{yb+40} {cx},{yb+50} Q{cx-20},{yb+40} {cx-22},{yb+20} Z" fill="none" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>']
    return "".join(s)

def espada_local():
    # vertical, punta hacia abajo; origen en el pomo (arriba)
    return (f'<circle cx="0" cy="4" r="5" fill="{GOLD}" stroke="{OUT}" stroke-width="2.5"/>'
            f'<rect x="-4" y="8" width="8" height="15" rx="2" fill="#8b5a2b" stroke="{OUT}" stroke-width="2.5"/>'
            f'<rect x="-17" y="22" width="34" height="7" rx="3" fill="{GOLD}" stroke="{OUT}" stroke-width="2.5"/>'
            f'<path d="M-5,29 L5,29 L5,64 L0,74 L-5,64 Z" fill="#dfe6ee" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>'
            f'<line x1="0" y1="31" x2="0" y2="64" stroke="#9aa7b4" stroke-width="2"/>')

def draw_espada(cx, top):
    return f'<line x1="{cx}" y1="{top-2}" x2="{cx}" y2="{top+1}" stroke="{OUT}" stroke-width="2"/><g transform="translate({cx},{top})">{espada_local()}</g>'

def draw_yelmo(cx, top):
    yb = top + 12
    s = [f'<circle cx="{cx}" cy="{top+4}" r="4" fill="none" stroke="{OUT}" stroke-width="2.5"/>',
         f'<path d="M{cx+4},{yb+2} Q{cx+30},{yb-14} {cx+32},{yb+16} Q{cx+22},{yb+2} {cx+8},{yb+8} Z" fill="#e63946" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>',
         f'<path d="M{cx-22},{yb+48} L{cx-22},{yb+20} Q{cx-22},{yb} {cx},{yb} Q{cx+22},{yb} {cx+22},{yb+20} L{cx+22},{yb+48} Z" fill="#c9d3dd" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<rect x="{cx-16}" y="{yb+20}" width="32" height="5" rx="2" fill="{OUT}"/>',
         f'<rect x="{cx-16}" y="{yb+30}" width="32" height="4" rx="2" fill="{OUT}"/>',
         f'<line x1="{cx}" y1="{yb+2}" x2="{cx}" y2="{yb+48}" stroke="#8d99a6" stroke-width="2.5"/>',
         f'<path d="M{cx-17},{yb+8} Q{cx-12},{yb+3} {cx-6},{yb+3}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>']
    return "".join(s)

def draw_caldero(cx, top):
    s = [f'<path d="M{cx-34},{top+30} Q{cx-34},{top} {cx},{top} Q{cx+34},{top} {cx+34},{top+30}" fill="none" stroke="{OUT}" stroke-width="4"/>',
         f'<ellipse cx="{cx}" cy="{top+60}" rx="44" ry="34" fill="#2b2d33" stroke="{OUT}" stroke-width="3"/>',
         f'<ellipse cx="{cx}" cy="{top+32}" rx="40" ry="9" fill="#4a4e57" stroke="{OUT}" stroke-width="3"/>',
         f'<path d="M{cx-28},{top+90} l-6,10 M{cx+28},{top+90} l6,10" stroke="{OUT}" stroke-width="5" stroke-linecap="round"/>',
         text(cx, top + 64, "?", 36, 900, col=GOLD, extra=f'stroke="{OUT}" stroke-width="2.2" paint-order="stroke"')]
    return "".join(s)

CORONA = Kind("corona", c, 42, 40, draw_corona, ring=3)
CALIZ = Kind("cáliz", k, 50, 34, draw_caliz, ring=3)
ESCUDO = Kind("escudo", e, 60, 46, draw_escudo, ring=3)
ESPADA = Kind("espada", s_, 74, 34, draw_espada, ring=4)
YELMO = Kind("yelmo", y, 62, 56, draw_yelmo, ring=4)
CALDERO = Kind("caldero", x * c, 96, 90, draw_caldero, ring=2)

BEAM = dict(col="#b07a45", hl="#e0b07a")

def cadena(x1, y1, x2, y2, z=30):
    return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{OUT}" stroke-width="6" stroke-dasharray="7 4"/>'
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#9aa5b0" stroke-width="3" stroke-dasharray="7 4"/>')

def bandera(x0, y0, col):
    return (f'<line x1="{x0}" y1="{y0}" x2="{x0}" y2="{y0-60}" stroke="{OUT}" stroke-width="4"/>'
            f'<path d="M{x0},{y0-60} Q{x0+22},{y0-66} {x0+44},{y0-56} L{x0+38},{y0-44} Q{x0+20},{y0-50} {x0},{y0-40} Z" fill="{col}" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>')

def antorcha(x0, y0):
    return (f'<rect x="{x0-4}" y="{y0}" width="8" height="30" fill="#8b5a2b" stroke="{OUT}" stroke-width="2.5"/>'
            f'<path d="M{x0},{y0-26} Q{x0+12},{y0-10} {x0+6},{y0} L{x0-6},{y0} Q{x0-12},{y0-10} {x0},{y0-26} Z" fill="#ff9f1c" stroke="{OUT}" stroke-width="2.5"/>'
            f'<path d="M{x0},{y0-14} Q{x0+5},{y0-6} {x0+2},{y0} L{x0-2},{y0} Q{x0-5},{y0-6} {x0},{y0-14} Z" fill="#ffe066"/>')

def cuervo(cx, base):
    return (f'<ellipse cx="{cx}" cy="{base-14}" rx="16" ry="12" fill="#2b2d42" stroke="{OUT}" stroke-width="2.5"/>'
            f'<circle cx="{cx+13}" cy="{base-26}" r="8" fill="#2b2d42" stroke="{OUT}" stroke-width="2.5"/>'
            f'<path d="M{cx+20},{base-28} L{cx+30},{base-25} L{cx+20},{base-22} Z" fill="#ffb703" stroke="{OUT}" stroke-width="2"/>'
            f'<circle cx="{cx+15}" cy="{base-28}" r="2" fill="#fff"/>'
            f'<path d="M{cx-14},{base-12} L{cx-28},{base-4} L{cx-14},{base-6}" fill="#2b2d42" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>'
            f'<path d="M{cx-2},{base-2} l-2,6 M{cx+4},{base-2} l2,6" stroke="#ffb703" stroke-width="2.5"/>')

def build():
    sc = Scene(1400, 900)
    # ----- fondo: cielo, muralla, suelo -----
    sc.add('<defs><linearGradient id="cielo8" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb4a2"/><stop offset="1" stop-color="#ffe5d9"/></linearGradient></defs>', 0)
    sc.add('<rect width="1400" height="900" fill="url(#cielo8)"/>', 0)
    sc.add('<circle cx="700" cy="120" r="60" fill="#fff1c1" opacity=".8"/>', 0)
    # muralla del fondo con almenas
    WY = 300
    merlons = "".join(f'<rect x="{xx}" y="{WY-34}" width="44" height="36" fill="#a9b4c2" stroke="{OUT}" stroke-width="3"/>' for xx in range(0, 1400, 88))
    sc.add(merlons + f'<rect x="-10" y="{WY}" width="1420" height="{FLOOR-WY}" fill="#a9b4c2" stroke="{OUT}" stroke-width="3"/>', 1)
    bricks = []
    for j, yy in enumerate(range(WY + 20, FLOOR, 40)):
        off = 0 if j % 2 == 0 else 45
        bricks.append(f'<line x1="0" y1="{yy}" x2="1400" y2="{yy}"/>')
        for xx in range(off, 1400, 90):
            bricks.append(f'<line x1="{xx}" y1="{yy}" x2="{xx}" y2="{yy+40}"/>')
    sc.add(f'<g stroke="#8d98a8" stroke-width="2">{"".join(bricks)}</g>', 2)
    # torres laterales
    for tx in (0, 1310):
        sc.add(f'<rect x="{tx-10}" y="150" width="100" height="{FLOOR-150}" fill="#bcc6d3" stroke="{OUT}" stroke-width="3"/>'
               + "".join(f'<rect x="{tx-10+i*36}" y="122" width="24" height="30" fill="#bcc6d3" stroke="{OUT}" stroke-width="3"/>' for i in range(3))
               + f'<path d="M{tx+30},{260} Q{tx+40},{240} {tx+50},{260} L{tx+50},{300} L{tx+30},{300} Z" fill="#2b2d42" stroke="{OUT}" stroke-width="2.5"/>', 3)
    sc.add(bandera(40, 122, "#3a86ff"), 4)
    sc.add(bandera(1350, 122, "#2bb673"), 4)
    sc.add(antorcha(640, 380), 5)
    sc.add(antorcha(1240, 380), 5)
    sc.add(cuervo(420, WY - 34), 6)
    # suelo empedrado y foso
    sc.add(f'<rect x="0" y="{FLOOR}" width="1400" height="100" fill="#c8b08a" stroke="{OUT}" stroke-width="3"/>'
           + "".join(f'<ellipse cx="{xx}" cy="{FLOOR+22+((xx//60)%2)*36}" rx="22" ry="11" fill="#b39a74" stroke="#9c8462" stroke-width="2"/>' for xx in range(30, 1400, 60)), 5)
    # viga de madera del adarve (fija) de la que cuelga M
    sc.add(f'<rect x="560" y="40" width="760" height="22" rx="4" fill="#8b5a2b" stroke="{OUT}" stroke-width="3"/>'
           f'<rect x="1280" y="40" width="30" height="120" fill="#8b5a2b" stroke="{OUT}" stroke-width="3"/>', 15)

    # ================= M, N, O (móvil en tres pisos) =================
    M = Beam(sc, "M", 960, 160, 60, -4, 4, **BEAM)
    sc.rope(M.px, 62, M.px, M.y, z=29, w=5, col=OUT)
    N = Beam(sc, "N", M.X(-1), 300, 45, -3, 3, **BEAM)
    O = Beam(sc, "O", N.X(-3), 440, 45, -2, 2, **BEAM)
    # O (abajo del todo)
    O.hang(2, ESCUDO, drop=14)
    O.hang(1, CALIZ, drop=14)
    O.hang(0, CORONA, drop=14)
    O.hang(-2, ESPADA, drop=14)
    O.draw()
    # N
    hang_beam(N, -3, O)
    N.hang(0, CORONA, drop=14)
    N.hang(2, YELMO, drop=14)
    N.hang(3, [CALIZ, ESPADA], drop=14, gap=2)
    N.draw()
    # M
    hang_beam(M, -1, N)
    M.hang(-4, CALIZ, drop=14)
    M.hang(1, CORONA, drop=14)
    M.hang(3, CALDERO, drop=14)
    M.draw()

    # ================= POLIPASTO + Q (abajo a la izquierda) =================
    Q = Beam(sc, "Q", 230, 668, 55, -3, 3, margin=14, **BEAM)
    sc.add(poste(Q.px, Q.y, FLOOR + 4, w=22, col="#8b5a2b", hl="#b07a45"), 20)
    rr = 11
    free_x = Q.X(3)
    UY, LY = 420, 500
    # orden de izquierda a derecha: libre(U2 izq) U2 · L2 · U1 · L1 · gancho
    U2 = free_x + rr; L2 = free_x + 3 * rr; U1 = free_x + 5 * rr; L1 = free_x + 7 * rr; hook = free_x + 8 * rr
    # bloque superior fijo colgado de un brazo de la torre izquierda
    sc.add(f'<rect x="80" y="{UY-58}" width="{hook-60}" height="18" rx="4" fill="#8b5a2b" stroke="{OUT}" stroke-width="3"/>'
           f'<line x1="{(U2+hook)/2}" y1="{UY-40}" x2="{(U2+hook)/2}" y2="{UY-24}" stroke="{OUT}" stroke-width="5"/>'
           f'<rect x="{U2-rr-6}" y="{UY-24}" width="{hook-U2+rr+12}" height="14" rx="5" fill="#6c757d" stroke="{OUT}" stroke-width="3"/>', 33)
    sc.add(f'<rect x="{L2-rr-6}" y="{LY+4}" width="{L1-L2+2*rr+12}" height="14" rx="5" fill="#6c757d" stroke="{OUT}" stroke-width="3"/>', 33)
    rope = (f'M{hook},{UY-12} L{hook},{LY} A{rr},{rr} 0 0 1 {L1-rr},{LY} L{L1-rr},{UY} A{rr},{rr} 0 0 0 {U1-rr},{UY} '
            f'L{U1-rr},{LY} A{rr},{rr} 0 0 1 {L2-rr},{LY} L{L2-rr},{UY} A{rr},{rr} 0 0 0 {free_x},{UY} L{free_x},{Q.y}')
    sc.path(rope, z=36, w=3)
    for (px_, py_) in ((U1, UY), (U2, UY), (L1, LY), (L2, LY)):
        sc.add(polea(px_, py_, rr, "#d7dde3"), 35)
    load_x = (L1 + L2) / 2
    sc.add(f'<line x1="{load_x}" y1="{LY+18}" x2="{load_x}" y2="{LY+30}" stroke="{OUT}" stroke-width="3"/>', 33)
    sc.add(draw_yelmo(load_x, LY + 28), 40)
    sc.add(f'<line x1="{load_x}" y1="{LY+28+60}" x2="{load_x}" y2="{LY+28+66}" stroke="{OUT}" stroke-width="3"/>', 33)
    sc.add(draw_caliz(load_x, LY + 28 + 64), 40)
    Q.force(3, -(y + k) / 4, "polipasto")
    Q.hang(2, YELMO, drop=14)
    Q.hang(-2, ESCUDO, drop=14)
    Q.draw()

    # ================= PUENTE LEVADIZO (abajo a la derecha) =================
    HX, HY, ub = 1310, 712, 55
    D = Beam(sc, "D", HX, HY, -ub, 0, 6, margin=10, col="#c98a4b", hl="#e9b77d", thick=18)
    # foso
    sc.add(f'<rect x="{D.X(6)-30}" y="{HY+12}" width="{HX-D.X(6)+30}" height="{FLOOR-HY+20}" fill="#4cc9f0" stroke="{OUT}" stroke-width="3"/>'
           + "".join(f'<path d="M{xx},{HY+50+((xx//50)%2)*30} q10,-7 20,0 q10,-7 20,0" fill="none" stroke="#e0f7ff" stroke-width="2.5"/>' for xx in range(int(D.X(6)) - 10, HX - 40, 70)), 6)
    # portón
    sc.add(f'<path d="M{HX-10},{HY-10} L{HX-10},{HY-150} Q{HX+40},{HY-200} {HX+90},{HY-150} L{HX+90},{HY-10} Z" fill="#5a3a1f" stroke="{OUT}" stroke-width="3"/>', 9)
    # espadas tumbadas sobre el puente en 4 y 5
    for kk in (4, 5):
        xx = D.X(kk)
        sc.add(f'<g transform="translate({xx},{HY-9-66})">{espada_local()}</g>', 45)
        D.force(kk, s_, "espada")
    D.draw(mark=False)
    for kk in range(0, 7):
        sc.add(f'<line x1="{D.X(kk)+ub/2}" y1="{HY-8}" x2="{D.X(kk)+ub/2}" y2="{HY+8}" stroke="#9c6a35" stroke-width="2"/>' if kk < 6 else "", 50)
    sc.add(f'<circle cx="{HX}" cy="{HY}" r="13" fill="{GOLD}" stroke="{OUT}" stroke-width="3"/><circle cx="{HX}" cy="{HY}" r="4" fill="{OUT}"/>', 53)
    # cadena: del extremo (6) sube a una polea en un poste y baja al contrapeso (yelmo)
    Rp = 18
    xe = D.X(6)
    PC = (xe - Rp, 520)
    sc.add(f'<rect x="{PC[0]-20}" y="{PC[1]-20}" width="40" height="40" rx="7" fill="#6c757d" stroke="{OUT}" stroke-width="3"/>'
           + "".join(f'<circle cx="{PC[0]+dx}" cy="{PC[1]+dy}" r="2.6" fill="{OUT}"/>' for dx in (-13, 13) for dy in (-13, 13)), 18)
    sc.add(cadena(xe, HY - 8, xe, PC[1]) + cadena(xe - 2 * Rp, PC[1], xe - 2 * Rp, PC[1] + 70), 30)
    sc.add(f'<path d="M{xe-2*Rp},{PC[1]} A{Rp},{Rp} 0 0 1 {xe},{PC[1]}" fill="none" stroke="{OUT}" stroke-width="6"/>', 36)
    sc.add(polea(PC[0], PC[1], Rp, "#d7dde3"), 37)
    sc.add(draw_yelmo(xe - 2 * Rp, PC[1] + 66), 40)
    D.force(6, -y, "contrapeso")
    return sc, dict(M=M, N=N, O=O, Q=Q, D=D)

if __name__ == "__main__":
    sc, BB = build()
    for nme, bm in BB.items():
        print(nme, "eq:", bm.eq(), " total:", bm.total())
    print("solución:", sc.solve([c, k, e, s_, y, x], c))
    open(sys.argv[1] if len(sys.argv) > 1 else "p8.svg", "w", encoding="utf-8").write(
        sc.svg("Acertijo del castillo: ¿cuántas coronas hay en el caldero?"))
