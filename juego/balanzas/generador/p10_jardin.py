"""Puzle 10 — El jardín"""
import math, sys
import sympy as sp
from lib import *

z, m, r, k, g, x = sp.symbols("zanahoria maceta regadera calabaza globo x", positive=True)
GROUND = 812
SLAT = 50

# ---------- objetos ----------
def draw_zanahoria(cx, top):
    s = []
    for dx, rot in ((-6, -25), (0, 0), (6, 25)):
        s.append(f'<path d="M{cx},{top+16} Q{cx+dx-6},{top+4} {cx+dx},{top} Q{cx+dx+6},{top+4} {cx},{top+16} Z" fill="#52b788" stroke="{OUT}" stroke-width="2.2" stroke-linejoin="round" transform="rotate({rot} {cx} {top+16})"/>')
    s.append(f'<path d="M{cx-11},{top+16} Q{cx},{top+12} {cx+11},{top+16} L{cx+2},{top+58} Q{cx},{top+61} {cx-2},{top+58} Z" fill="#ff8c1a" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
    for yy, w_ in ((top + 26, 6), (top + 36, 5), (top + 46, 3)):
        s.append(f'<line x1="{cx-w_}" y1="{yy}" x2="{cx+1}" y2="{yy+1}" stroke="#c65f00" stroke-width="2"/>')
    return "".join(s)

def draw_maceta(cx, top):
    yb = top + 22
    s = [f'<path d="M{cx},{top} L{cx-18},{yb+4} M{cx},{top} L{cx+18},{yb+4}" stroke="{ROPE}" stroke-width="2.4"/>',
         f'<circle cx="{cx}" cy="{top}" r="3" fill="{OUT}"/>',
         f'<path d="M{cx},{yb} L{cx},{yb-12}" stroke="#2d6a4f" stroke-width="3"/>',
         f'<path d="M{cx},{yb-6} q-10,-2 -12,-10 q10,0 12,10 Z" fill="#52b788" stroke="{OUT}" stroke-width="2"/>',
         f'<circle cx="{cx}" cy="{yb-16}" r="7" fill="#ef476f" stroke="{OUT}" stroke-width="2.2"/><circle cx="{cx}" cy="{yb-16}" r="2.6" fill="#ffd166"/>',
         f'<rect x="{cx-22}" y="{yb}" width="44" height="9" rx="2" fill="#d96c3c" stroke="{OUT}" stroke-width="2.8"/>',
         f'<path d="M{cx-18},{yb+9} L{cx+18},{yb+9} L{cx+13},{yb+36} L{cx-13},{yb+36} Z" fill="#e07a4f" stroke="{OUT}" stroke-width="2.8" stroke-linejoin="round"/>']
    return "".join(s)

def draw_regadera(cx, top):
    yb = top + 14
    s = [f'<path d="M{cx-12},{yb+6} Q{cx},{top-4} {cx+12},{yb+6}" fill="none" stroke="{OUT}" stroke-width="7"/>',
         f'<path d="M{cx-12},{yb+6} Q{cx},{top-4} {cx+12},{yb+6}" fill="none" stroke="#2a9d8f" stroke-width="3"/>',
         f'<path d="M{cx+14},{yb+30} L{cx+38},{yb+10} L{cx+42},{yb+16} L{cx+18},{yb+36} Z" fill="#2a9d8f" stroke="{OUT}" stroke-width="2.6" stroke-linejoin="round"/>',
         f'<rect x="{cx+36}" y="{yb+4}" width="10" height="14" rx="3" fill="#2a9d8f" stroke="{OUT}" stroke-width="2.4" transform="rotate(-40 {cx+41} {yb+11})"/>',
         f'<rect x="{cx-18}" y="{yb+6}" width="36" height="36" rx="6" fill="#2a9d8f" stroke="{OUT}" stroke-width="3"/>',
         f'<path d="M{cx-18},{yb+14} Q{cx-32},{yb+18} {cx-18},{yb+32}" fill="none" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{cx-12}" y="{yb+12}" width="5" height="22" rx="2" fill="#fff" opacity=".4"/>']
    return "".join(s)

def draw_calabaza(cx, top):
    cy = top + 32
    return (f'<path d="M{cx},{top+10} q2,-8 8,-10" fill="none" stroke="#6b4423" stroke-width="5" stroke-linecap="round"/>'
            f'<circle cx="{cx}" cy="{top+3}" r="3.5" fill="none" stroke="{OUT}" stroke-width="2.4"/>'
            f'<ellipse cx="{cx-14}" cy="{cy}" rx="14" ry="20" fill="#f77f00" stroke="{OUT}" stroke-width="2.6"/>'
            f'<ellipse cx="{cx+14}" cy="{cy}" rx="14" ry="20" fill="#f77f00" stroke="{OUT}" stroke-width="2.6"/>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="13" ry="22" fill="#fb8b24" stroke="{OUT}" stroke-width="2.6"/>'
            f'<path d="M{cx-4},{top+12} L{cx+4},{top+12} L{cx+3},{top+16} L{cx-3},{top+16} Z" fill="#6b4423"/>')

def draw_cubo(cx, top):
    s = [f'<path d="M{cx-30},{top+26} Q{cx},{top-6} {cx+30},{top+26}" fill="none" stroke="{OUT}" stroke-width="4"/>',
         f'<path d="M{cx-34},{top+24} L{cx+34},{top+24} L{cx+26},{top+84} L{cx-26},{top+84} Z" fill="#4895ef" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<ellipse cx="{cx}" cy="{top+24}" rx="34" ry="7" fill="#3a7bd5" stroke="{OUT}" stroke-width="3"/>',
         f'<line x1="{cx-31}" y1="{top+40}" x2="{cx+31}" y2="{top+40}" stroke="#bde0fe" stroke-width="3"/>',
         text(cx, top + 62, "?", 34, 900, col="#fff", extra=f'stroke="{OUT}" stroke-width="2.2" paint-order="stroke"')]
    return "".join(s)

ZANAHORIA = Kind("zanahoria", z, 60, 26, draw_zanahoria, ring=0)
MACETA = Kind("maceta", m, 58, 44, draw_maceta, ring=0)
REGADERA = Kind("regadera", r, 56, 66, draw_regadera, ring=4)
CALABAZA = Kind("calabaza", k, 54, 58, draw_calabaza, ring=3)
CUBO = Kind("cubo", x * z, 86, 68, draw_cubo, ring=2)

BEAM = dict(col="#d4a373", hl="#f1d1a8")
GCOL = "#f15bb5"

def gnomo(cx, base):
    return (f'<path d="M{cx-16},{base-40} L{cx},{base-96} L{cx+16},{base-40} Z" fill="#e63946" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>'
            f'<circle cx="{cx}" cy="{base-38}" r="12" fill="#ffd6a5" stroke="{OUT}" stroke-width="2.6"/>'
            f'<path d="M{cx-14},{base-34} Q{cx},{base-6} {cx+14},{base-34} Q{cx},{base-26} {cx-14},{base-34} Z" fill="#fff" stroke="{OUT}" stroke-width="2.4"/>'
            f'<rect x="{cx-16}" y="{base-22}" width="32" height="22" rx="6" fill="#3a86ff" stroke="{OUT}" stroke-width="2.6"/>'
            f'<circle cx="{cx-4}" cy="{base-41}" r="1.8" fill="{OUT}"/><circle cx="{cx+4}" cy="{base-41}" r="1.8" fill="{OUT}"/>')

def caracol(cx, base):
    return (f'<path d="M{cx-26},{base} Q{cx-10},{base-6} {cx+18},{base} L{cx+22},{base-12} Q{cx+24},{base-18} {cx+20},{base-20}" fill="#cdb4db" stroke="{OUT}" stroke-width="2.6"/>'
            f'<circle cx="{cx-4}" cy="{base-16}" r="15" fill="#ffb703" stroke="{OUT}" stroke-width="2.6"/>'
            f'<path d="M{cx-4},{base-16} m-8,0 a8,8 0 1,0 16,0 a5,5 0 1,0 -10,0" fill="none" stroke="{OUT}" stroke-width="2"/>'
            f'<line x1="{cx+20}" y1="{base-18}" x2="{cx+26}" y2="{base-30}" stroke="{OUT}" stroke-width="2"/><circle cx="{cx+26}" cy="{base-31}" r="2.4" fill="{OUT}"/>')

def abeja(cx, cy):
    return (f'<ellipse cx="{cx-4}" cy="{cy-10}" rx="7" ry="5" fill="#fff" stroke="{OUT}" stroke-width="2" opacity=".9"/>'
            f'<ellipse cx="{cx+4}" cy="{cy-11}" rx="7" ry="5" fill="#fff" stroke="{OUT}" stroke-width="2" opacity=".9"/>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="12" ry="8" fill="#ffd60a" stroke="{OUT}" stroke-width="2.4"/>'
            f'<line x1="{cx-3}" y1="{cy-7}" x2="{cx-3}" y2="{cy+7}" stroke="{OUT}" stroke-width="3"/><line x1="{cx+4}" y1="{cy-7}" x2="{cx+4}" y2="{cy+7}" stroke="{OUT}" stroke-width="3"/>')

def flor(cx, base, col):
    return (f'<line x1="{cx}" y1="{base}" x2="{cx}" y2="{base-34}" stroke="#2d6a4f" stroke-width="3"/>'
            + "".join(f'<circle cx="{cx + 7*math.cos(a):.1f}" cy="{base-38 + 7*math.sin(a):.1f}" r="5" fill="{col}" stroke="{OUT}" stroke-width="1.6"/>' for a in [i*math.pi/3 for i in range(6)])
            + f'<circle cx="{cx}" cy="{base-38}" r="4" fill="#ffd166" stroke="{OUT}" stroke-width="1.6"/>')

def build():
    sc = Scene(1400, 900)
    sc.add('<defs><linearGradient id="cielo10" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ecae6"/><stop offset="1" stop-color="#e0f4ff"/></linearGradient></defs>', 0)
    sc.add('<rect width="1400" height="900" fill="url(#cielo10)"/>', 0)
    sc.add('<circle cx="1300" cy="110" r="46" fill="#ffd60a" stroke="#f9c74f" stroke-width="6"/>', 1)
    # valla de tablas iguales (sirve para medir distancias horizontales)
    FY0, FY1 = 548, GROUND
    slats = []
    for i in range(0, 1400 // SLAT):
        x0 = i * SLAT
        slats.append(f'<path d="M{x0+3},{FY1} L{x0+3},{FY0+14} L{x0+SLAT/2},{FY0} L{x0+SLAT-3},{FY0+14} L{x0+SLAT-3},{FY1} Z" fill="#fff4e0" stroke="#c9ad8a" stroke-width="2.5" stroke-linejoin="round"/>')
    sc.add("".join(slats), 2)
    sc.add(f'<rect x="0" y="{FY0+40}" width="1400" height="14" fill="#f2e2c4" stroke="#c9ad8a" stroke-width="2.5"/>'
           f'<rect x="0" y="{FY1-62}" width="1400" height="14" fill="#f2e2c4" stroke="#c9ad8a" stroke-width="2.5"/>', 3)
    # césped
    sc.add(f'<path d="M0,{GROUND} Q350,{GROUND-10} 700,{GROUND} T1400,{GROUND-4} L1400,900 L0,900 Z" fill="#74c69d" stroke="{OUT}" stroke-width="3"/>', 5)
    for (fx, col) in ((40, "#ef476f"), (300, "#ffd166"), (470, "#9b5de5"), (1160, "#ef476f"), (930, "#00bbf9")):
        sc.add(flor(fx, GROUND + 4, col), 6)
    sc.add(gnomo(110, GROUND + 6), 70)
    sc.add(draw_regadera(1336, GROUND - 56), 70)        # regadera en el suelo: no cuenta
    sc.add(caracol(330, FY0 + 40), 8)
    sc.add(abeja(1080, 300), 70)
    sc.add(abeja(1140, 270), 70)
    # pérgola (fija)
    sc.add(f'<rect x="300" y="40" width="1000" height="24" rx="4" fill="#9c6644" stroke="{OUT}" stroke-width="3"/>'
           f'<rect x="1262" y="40" width="26" height="{FY0-40}" fill="#9c6644" stroke="{OUT}" stroke-width="3"/>', 15)
    for vx in range(330, 1260, 90):
        sc.add(f'<path d="M{vx},64 q8,14 0,28" fill="none" stroke="#52b788" stroke-width="4"/><ellipse cx="{vx+6}" cy="80" rx="6" ry="4" fill="#52b788" stroke="{OUT}" stroke-width="1.5"/>', 16)

    def globo(beam, kk, dx, h=96):
        xx = beam.X(kk)
        sc.add(globo_svg(xx, beam.y, xx + dx, beam.y - h, col=GCOL), 62)
        beam.force(kk, -g, "globo")

    # ================= M y S =================
    M = Beam(sc, "M", 800, 180, 60, -4, 4, **BEAM)
    sc.rope(M.px, 64, M.px, M.y, z=29, w=5, col=OUT)
    S = Beam(sc, "S", M.X(-4), 324, 50, -2, 2, **BEAM)
    S.hang(-2, REGADERA, drop=14)
    globo(S, -1, -22, 86)
    S.hang(0, ZANAHORIA, drop=14)
    S.hang(1, MACETA, drop=10)
    S.draw()
    hang_beam(M, -4, S)
    M.hang(-3, CALABAZA, drop=14)
    M.hang(-1, ZANAHORIA, drop=14)
    M.hang(1, REGADERA, drop=14)
    M.hang(2, CUBO, drop=64)
    M.draw()

    # ================= TORNO (radios 1 y 2) + viga A =================
    U = 30
    TX, TY = 170, 190
    A = Beam(sc, "A", TX + 2 * U + 3 * 55, 450, 55, -3, 3, **BEAM)
    sc.add(f'<rect x="{TX-24}" y="{TY-24}" width="48" height="48" rx="8" fill="#6c757d" stroke="{OUT}" stroke-width="3"/>', 20)
    sc.add(f'<circle cx="{TX}" cy="{TY}" r="{2*U}" fill="#ffd166" stroke="{OUT}" stroke-width="3.5"/>'
           + "".join(f'<line x1="{TX}" y1="{TY}" x2="{TX + (2*U-6)*math.cos(math.radians(a)):.1f}" y2="{TY + (2*U-6)*math.sin(math.radians(a)):.1f}" stroke="{OUT}" stroke-width="5"/>' for a in (30, 150, 210, 330)), 45)
    sc.add(f'<circle cx="{TX}" cy="{TY}" r="{U}" fill="#06d6a0" stroke="{OUT}" stroke-width="3.5"/>', 47)
    sc.add(f'<line x1="{TX}" y1="{TY}" x2="{TX}" y2="{TY-2*U}" stroke="{OUT}" stroke-width="7" stroke-linecap="round"/>'
           f'<line x1="{TX}" y1="{TY}" x2="{TX}" y2="{TY-2*U}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>', 48)
    for kk in (1, 2):
        sc.add(f'<circle cx="{TX}" cy="{TY-U*kk}" r="4.2" fill="{OUT}"/>', 49)
    sc.add(f'<circle cx="{TX}" cy="{TY}" r="8.5" fill="#fff" stroke="{OUT}" stroke-width="3"/><circle cx="{TX}" cy="{TY}" r="3" fill="{OUT}"/>', 49)
    sc.path(f'M{TX},{TY-U} A{U},{U} 0 0 0 {TX-U},{TY} L{TX-U},{TY+110}', z=48, w=3.5)
    sc.add(draw_calabaza(TX - U, TY + 108), 40)
    sc.path(f'M{TX},{TY-2*U} A{2*U},{2*U} 0 0 1 {TX+2*U},{TY} L{TX+2*U},{A.y}', z=44, w=3.5)
    assert abs(A.X(-3) - (TX + 2 * U)) < 0.1
    A.force(-3, -k / 2, "cuerda del torno")
    sc.add(poste(A.px, A.y, GROUND + 4, w=20, col="#9c6644", hl="#c08552"), 20)
    A.hang(-2, REGADERA, drop=14)
    A.hang(-1, CALABAZA, drop=14)
    A.hang(1, REGADERA, drop=14)
    A.draw()

    # ================= viga B con polea móvil (a la derecha) =================
    B = Beam(sc, "B", 1050, 470, 50, -3, 3, **BEAM)
    sc.add(poste(B.px, B.y, GROUND + 4, w=20, col="#9c6644", hl="#c08552"), 20)
    R2 = 20
    xs = B.X(3)
    pc = (xs + R2, 566)
    fixx = pc[0] + R2
    FIXY = 400
    sc.add(f'<rect x="{fixx-8}" y="{FIXY-9}" width="{1262-fixx+10}" height="16" rx="3" fill="#6c757d" stroke="{OUT}" stroke-width="3"/>', 22)
    sc.path(f'M{fixx},{FIXY} L{fixx},{pc[1]} A{R2},{R2} 0 0 1 {xs},{pc[1]} L{xs},{B.y}', z=30, w=3)
    sc.add(f'<path d="M{pc[0]-10},{pc[1]} L{pc[0]},{pc[1]+R2+12} L{pc[0]+10},{pc[1]}" fill="none" stroke="{OUT}" stroke-width="4" stroke-linejoin="round"/>', 33)
    sc.add(polea(pc[0], pc[1], R2, "#e9ecef"), 34)
    sc.add(draw_regadera(pc[0], pc[1] + R2 + 10), 40)
    sc.add(f'<line x1="{pc[0]}" y1="{pc[1]+R2+10+56}" x2="{pc[0]}" y2="{pc[1]+R2+10+62}" stroke="{OUT}" stroke-width="3"/>', 33)
    sc.add(draw_zanahoria(pc[0], pc[1] + R2 + 10 + 60), 40)
    B.force(3, (r + z) / 2, "polea móvil")
    B.hang(2, ZANAHORIA, drop=14)
    B.hang(-1, MACETA, drop=10)
    B.hang(-3, MACETA, drop=10)
    B.draw()

    # ================= PALANCA ACODADA L delante de la valla =================
    L = Beam(sc, "L", 650, 600, SLAT, -2, 3)
    kL, kR = -2, 3
    yL, yR = L.y + 70, L.y + 50
    xL, xR = L.X(kL), L.X(kR)
    arm = f'M{xL},{yL} L{L.px},{L.y} L{xR},{yR}'
    sc.add(f'<path d="{arm}" fill="none" stroke="{OUT}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>'
           f'<path d="{arm}" fill="none" stroke="#9b5de5" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>', 50)
    sc.add(f'<circle cx="{L.px}" cy="{L.y}" r="8.5" fill="#fff" stroke="{OUT}" stroke-width="3"/><circle cx="{L.px}" cy="{L.y}" r="3" fill="{OUT}"/>', 51)
    for (xx, yy) in ((xL, yL), (xR, yR)):
        sc.add(f'<circle cx="{xx}" cy="{yy}" r="3.6" fill="{OUT}"/>', 51)
    def hang_at(xx, yy, kinds, kk):
        y_ = yy + 14
        tops = []
        for kd in kinds:
            tops.append(y_); y_ += kd.h + 2
        sc.rope(xx, yy, xx, tops[-1] + min(kinds[-1].ring, kinds[-1].h / 2), z=30)
        for kd, tp in zip(kinds, tops):
            sc.add(kd.draw(xx, tp), 40)
            L.force(kk, kd.w, kd.name)
    hang_at(xL, yL, [CALABAZA], kL)
    hang_at(xR, yR, [ZANAHORIA, REGADERA], kR)
    return sc, dict(M=M, S=S, A=A, B=B, L=L)

if __name__ == "__main__":
    sc, BB = build()
    for nme, bm in BB.items():
        print(nme, "eq:", bm.eq(), " total:", bm.total())
    print("solución:", sc.solve([z, m, r, k, g, x], z))
    open(sys.argv[1] if len(sys.argv) > 1 else "p10.svg", "w", encoding="utf-8").write(
        sc.svg("Acertijo del jardín: ¿cuántas zanahorias hay en el cubo?"))
