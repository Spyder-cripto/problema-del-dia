"""Puzle 6 — La fábrica de golosinas"""
import math, sys
import sympy as sp
from lib import *

c, l, d, k_, g, x = sp.symbols("caramelo piruleta donut cupcake globo x", positive=True)
FLOOR = 790
DINA = 7  # lectura del dinamómetro (en caramelos)

# ---------- objetos ----------
def draw_caramelo(cx, top):
    cy = top + 13
    return (f'<path d="M{cx-12},{cy} L{cx-24},{cy-10} L{cx-22},{cy} L{cx-24},{cy+10} Z" fill="#ff5d8f" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>'
            f'<path d="M{cx+12},{cy} L{cx+24},{cy-10} L{cx+22},{cy} L{cx+24},{cy+10} Z" fill="#ff5d8f" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="14" ry="11" fill="#ff5d8f" stroke="{OUT}" stroke-width="3"/>'
            f'<path d="M{cx-6},{cy-10} Q{cx-2},{cy} {cx-6},{cy+10} M{cx+4},{cy-10} Q{cx+8},{cy} {cx+4},{cy+10}" fill="none" stroke="#fff" stroke-width="3"/>')

def draw_piruleta(cx, top):
    cy = top + 42
    s = [f'<rect x="{cx-3}" y="{top}" width="6" height="26" rx="2" fill="#fffaf2" stroke="{OUT}" stroke-width="2.5"/>',
         f'<circle cx="{cx}" cy="{cy}" r="19" fill="#ffd166" stroke="{OUT}" stroke-width="3"/>']
    pts = []
    for i in range(60):
        a = i * 0.32
        rr = 1.2 + i * 0.27
        pts.append(f"{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}")
    s.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="#ef476f" stroke-width="3.5" stroke-linecap="round"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="19" fill="none" stroke="{OUT}" stroke-width="3"/>')
    return "".join(s)

def draw_donut(cx, top):
    cy = top + 24
    s = [f'<circle cx="{cx}" cy="{top+3}" r="3.5" fill="none" stroke="{OUT}" stroke-width="2.5"/>',
         f'<circle cx="{cx}" cy="{cy}" r="21" fill="#e0a25a" stroke="{OUT}" stroke-width="3"/>',
         f'<path d="M{cx-19},{cy-4} Q{cx-20},{cy-20} {cx},{cy-20} Q{cx+20},{cy-20} {cx+19},{cy-4} Q{cx+14},{cy+4} {cx+10},{cy+12} Q{cx},{cy+18} {cx-10},{cy+12} Q{cx-14},{cy+4} {cx-19},{cy-4} Z" fill="#ff8fc6" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>',
         f'<circle cx="{cx}" cy="{cy}" r="7" fill="#fff4f8" stroke="{OUT}" stroke-width="2.5"/>']
    for (dx, dy, col, rot) in ((-12, -10, "#3fd0c9", 30), (8, -14, "#ffd166", -20), (13, -2, "#7b6cff", 60), (-6, 9, "#3fd0c9", -40), (-15, 2, "#ffd166", 80)):
        s.append(f'<rect x="{cx+dx-3}" y="{cy+dy-1.5}" width="6" height="3" rx="1.5" fill="{col}" transform="rotate({rot} {cx+dx} {cy+dy})"/>')
    return "".join(s)

def draw_cupcake(cx, top):
    s = [f'<line x1="{cx+2}" y1="{top}" x2="{cx+1}" y2="{top+8}" stroke="#2e7d32" stroke-width="2.5"/>',
         f'<circle cx="{cx}" cy="{top+12}" r="6" fill="#e63946" stroke="{OUT}" stroke-width="2.5"/>',
         f'<path d="M{cx-22},{top+36} Q{cx-26},{top+24} {cx-14},{top+22} Q{cx-12},{top+12} {cx},{top+16} Q{cx+12},{top+12} {cx+14},{top+22} Q{cx+26},{top+24} {cx+22},{top+36} Z" fill="#c8f1ec" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<path d="M{cx-21},{top+36} L{cx+21},{top+36} L{cx+15},{top+60} L{cx-15},{top+60} Z" fill="#7b6cff" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>']
    for i in (-10, -3, 4, 11):
        s.append(f'<line x1="{cx+i*1.2:.1f}" y1="{top+37}" x2="{cx+i:.1f}" y2="{top+59}" stroke="#bdb6ff" stroke-width="2.5"/>')
    return "".join(s)

def draw_bote(cx, top):
    w, h = 76, 84
    l_ = cx - w / 2
    s = [f'<path d="M{cx-10},{top+10} Q{cx},{top-4} {cx+10},{top+10}" fill="none" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{l_+6}" y="{top+8}" width="{w-12}" height="14" rx="4" fill="#ef476f" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{l_}" y="{top+22}" width="{w}" height="{h-22}" rx="14" fill="#e6f8ff" stroke="{OUT}" stroke-width="3" opacity=".95"/>',
         f'<rect x="{l_+8}" y="{top+30}" width="8" height="{h-40}" rx="4" fill="#fff" opacity=".9"/>',
         text(cx, top + 56, "?", 38, 900, col="#ef476f", extra=f'stroke="{OUT}" stroke-width="2.2" paint-order="stroke"')]
    return "".join(s)

CARAMELO = Kind("caramelo", c, 28, 48, draw_caramelo, ring=0)
PIRULETA = Kind("piruleta", l, 62, 40, draw_piruleta, ring=0)
DONUT = Kind("donut", d, 46, 44, draw_donut, ring=3)
CUPCAKE = Kind("cupcake", k_, 60, 50, draw_cupcake, ring=2)
BOTE = Kind("bote", x * c, 84, 76, draw_bote, ring=4)

BEAM = dict(col="#7dd3c7", hl="#c9f2ec")
GLOBO_COL = "#b79cff"

def build():
    sc = Scene(1400, 900)
    # ----- fondo de fábrica -----
    sc.add('<rect width="1400" height="900" fill="#ffe6f0"/>', 0)
    for i in range(0, 1400, 70):
        sc.add(f'<rect x="{i}" y="0" width="35" height="{FLOOR}" fill="#ffd6e7"/>', 0)
    # suelo de baldosas
    for i in range(0, 1400, 50):
        for j, yy in enumerate(range(FLOOR, 900, 50)):
            col = "#ffffff" if ((i // 50) + j) % 2 == 0 else "#ffb3d1"
            sc.add(f'<rect x="{i}" y="{yy}" width="50" height="50" fill="{col}"/>', 3)
    sc.add(f'<line x1="0" y1="{FLOOR}" x2="1400" y2="{FLOOR}" stroke="{OUT}" stroke-width="3"/>', 4)
    # tuberías del techo
    sc.add(f'<rect x="-10" y="0" width="1420" height="34" fill="#7dd3c7" stroke="{OUT}" stroke-width="3"/>'
           f'<rect x="-10" y="34" width="1420" height="10" fill="#4fb3a6" stroke="{OUT}" stroke-width="3"/>', 15)
    for bx in range(60, 1400, 160):
        sc.add(f'<rect x="{bx-8}" y="26" width="16" height="22" rx="3" fill="#ffd166" stroke="{OUT}" stroke-width="2.5"/>', 16)
    # cinta transportadora con caramelos (decorado: no cuenta)
    sc.add(f'<rect x="860" y="{FLOOR-52}" width="520" height="26" rx="13" fill="#5b5f6b" stroke="{OUT}" stroke-width="3"/>'
           + "".join(f'<circle cx="{xx}" cy="{FLOOR-39}" r="9" fill="#9aa0ad" stroke="{OUT}" stroke-width="2.5"/>' for xx in range(880, 1380, 50))
           + f'<rect x="880" y="{FLOOR-26}" width="16" height="26" fill="#5b5f6b" stroke="{OUT}" stroke-width="3"/><rect x="1340" y="{FLOOR-26}" width="16" height="26" fill="#5b5f6b" stroke="{OUT}" stroke-width="3"/>', 8)
    for xx in (930, 1010, 1180):
        sc.add(draw_caramelo(xx, FLOOR - 78), 9)
    # bastón de caramelo apoyado (no cuenta)
    sc.add(f'<path d="M1388,{FLOOR} L1388,{FLOOR-150} Q1388,{FLOOR-182} 1360,{FLOOR-182} Q1334,{FLOOR-182} 1334,{FLOOR-156}" fill="none" stroke="{OUT}" stroke-width="16" stroke-linecap="round"/>'
           f'<path d="M1388,{FLOOR} L1388,{FLOOR-150} Q1388,{FLOOR-182} 1360,{FLOOR-182} Q1334,{FLOOR-182} 1334,{FLOOR-156}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>'
           f'<path d="M1388,{FLOOR} L1388,{FLOOR-150} Q1388,{FLOOR-182} 1360,{FLOOR-182} Q1334,{FLOOR-182} 1334,{FLOOR-156}" fill="none" stroke="#ef476f" stroke-width="10" stroke-dasharray="10 12"/>', 7)

    def globo(beam, kk, dx, h=96):
        xx = beam.X(kk)
        sc.add(globo_svg(xx, beam.y, xx + dx, beam.y - h, col=GLOBO_COL), 62)
        beam.force(kk, -g, "globo")

    # ================= A: viga principal, colgada del techo =================
    A = Beam(sc, "A", 760, 170, 60, -4, 4, **BEAM)
    sc.rope(A.px, 44, A.px, A.y, z=29, w=5, col=OUT)
    S = Beam(sc, "S", A.X(-4), 312, 50, -3, 3, **BEAM)
    S.hang(-2, CUPCAKE, drop=14)
    globo(S, -1, -20)
    S.hang(0, PIRULETA, drop=14)
    S.hang(2, DONUT, drop=14)
    S.draw()
    hang_beam(A, -4, S)
    A.hang(-2, PIRULETA, drop=14)
    A.hang(-1, DONUT, drop=14)
    A.hang(1, CARAMELO, drop=96)
    A.hang(2, BOTE, drop=14)
    A.hang(3, PIRULETA, drop=14)
    A.draw()

    # ================= B: palanca con bisagra y dinamómetro =================
    HX, HY, ub = 1352, 548, 50
    B = Beam(sc, "B", HX, HY, -ub, 0, 6, margin=16, **BEAM)   # unidad negativa: crece hacia la izquierda
    sc.add(f'<rect x="{HX-6}" y="{HY-46}" width="54" height="92" rx="6" fill="#9aa0ad" stroke="{OUT}" stroke-width="3"/>'
           + "".join(f'<circle cx="{HX+20+dx}" cy="{HY+dy}" r="3" fill="{OUT}"/>' for dx in (-12, 14) for dy in (-30, 30)), 20)
    B.hang(2, CUPCAKE, drop=14)
    B.hang(4, DONUT, drop=14)
    B.hang(5, [PIRULETA, CARAMELO, CARAMELO], drop=14, gap=2)
    B.draw(mark=False)
    # bisagra (no es el centro de una balanza)
    sc.add(f'<circle cx="{HX}" cy="{HY}" r="13" fill="#ffd166" stroke="{OUT}" stroke-width="3"/><circle cx="{HX}" cy="{HY}" r="4" fill="{OUT}"/>', 53)
    # dinamómetro en el punto 6
    xdn = B.X(6)
    sc.add(f'<line x1="{xdn}" y1="44" x2="{xdn}" y2="368" stroke="{OUT}" stroke-width="4"/>', 30)
    sc.add(f'<rect x="{xdn-30}" y="368" width="60" height="118" rx="14" fill="#ffd166" stroke="{OUT}" stroke-width="3.5"/>'
           f'<rect x="{xdn-20}" y="378" width="40" height="66" rx="6" fill="#fffaf0" stroke="{OUT}" stroke-width="2.5"/>'
           + "".join(f'<line x1="{xdn-20}" y1="{386+i*10}" x2="{xdn-12}" y2="{386+i*10}" stroke="{OUT}" stroke-width="2"/>' for i in range(6))
           + text(xdn + 4, 412, str(DINA), 34, 900, col="#ef476f")
           + f'<g transform="translate({xdn},466) scale(.55)">{draw_caramelo(0, -13)}</g>', 55)
    sc.add(f'<line x1="{xdn}" y1="486" x2="{xdn}" y2="{HY-10}" stroke="{OUT}" stroke-width="4"/>'
           f'<path d="M{xdn-7},{HY-16} Q{xdn-7},{HY-4} {xdn},{HY-4} Q{xdn+7},{HY-4} {xdn+7},{HY-12}" fill="none" stroke="{OUT}" stroke-width="3.5"/>', 54)
    B.force(6, -DINA * c, "dinamómetro")

    # ================= R: viga en un poste =================
    R = Beam(sc, "R", 620, 560, 60, -3, 3, **BEAM)
    sc.add(poste(R.px, R.y, FLOOR + 4, w=20, col="#ef476f", hl="#ff9bb8"), 20)
    R.hang(-3, PIRULETA, drop=14)
    globo(R, 1, 16)
    R.hang(2, [CARAMELO, CARAMELO], drop=16, gap=4)
    R.hang(3, [CARAMELO, CARAMELO], drop=16, gap=4)
    R.draw()

    # ================= RAMPA 3-4-5 con vagoneta y donut colgante =================
    U = 70
    Ar = (30, FLOOR); Br = (30 + 4 * U, FLOOR); Cr = (30 + 4 * U, FLOOR - 3 * U)
    dd = (0.8, -0.6); nup = (-0.6, -0.8); ndn = (0.6, 0.8)
    h_att, Rp = 30, 16
    xdesc = Cr[0] + 30
    tt = (xdesc - Rp - (Ar[0] + h_att * nup[0] + Rp * ndn[0])) / dd[0]
    PC = (Ar[0] + h_att * nup[0] + tt * dd[0] + Rp * ndn[0], Ar[1] + h_att * nup[1] + tt * dd[1] + Rp * ndn[1])
    T1 = (PC[0] - Rp * ndn[0], PC[1] - Rp * ndn[1])
    sc.add(f'<path d="M{Ar[0]},{Ar[1]} L{Br[0]},{Br[1]} L{Cr[0]},{Cr[1]} Z" fill="#ffd166" stroke="{OUT}" stroke-width="3.5" stroke-linejoin="round"/>', 10)
    for i in range(1, 4):
        sc.add(f'<line x1="{Ar[0]+i*U*4/3*0.98:.0f}" y1="{FLOOR}" x2="{Ar[0]+i*U*4/3*0.98:.0f}" y2="{FLOOR - i*U:.0f}" stroke="#e8b23f" stroke-width="2.5"/>', 11)
    DIM = f'stroke="{OUT}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"'
    def on(s_, off):
        return (Ar[0] + s_ * dd[0] + off * ndn[0], Ar[1] + s_ * dd[1] + off * ndn[1])
    q1, q2 = on(64, 22), on(5 * U - 30, 22)
    ang = math.degrees(math.atan2(-0.6, 0.8))
    sc.add(f'<g {DIM}><line x1="{q1[0]:.1f}" y1="{q1[1]:.1f}" x2="{q2[0]:.1f}" y2="{q2[1]:.1f}"/>' + arrow_head(q1[0], q1[1], -0.8, 0.6, 9) + arrow_head(q2[0], q2[1], 0.8, -0.6, 9) + '</g>', 12)
    tm = on(5 * U / 2 + 6, 46)
    sc.add(text(tm[0], tm[1], "5", 28, rot=ang), 12)
    vx = Br[0] - 14
    sc.add(f'<g {DIM}><line x1="{vx}" y1="{Cr[1]+40}" x2="{vx}" y2="{FLOOR-8}"/>' + arrow_head(vx, Cr[1] + 40, 0, -1, 9) + arrow_head(vx, FLOOR - 8, 0, 1, 9) + '</g>', 12)
    sc.add(text(vx - 14, FLOOR - 1.2 * U, "3", 28, anchor="end"), 12)
    by_ = FLOOR + 26
    sc.add(f'<g {DIM}><line x1="{Ar[0]+4}" y1="{by_}" x2="{Br[0]-4}" y2="{by_}"/>' + arrow_head(Ar[0] + 4, by_, -1, 0, 9) + arrow_head(Br[0] - 4, by_, 1, 0, 9) + '</g>', 12)
    sc.add(text((Ar[0] + Br[0]) / 2, by_ + 28, "4", 28), 12)
    # soporte de la polea
    sc.add(f'<path d="M{Cr[0]-4},{Cr[1]+6} L{PC[0]:.1f},{PC[1]:.1f}" stroke="{OUT}" stroke-width="10" stroke-linecap="round"/>'
           f'<path d="M{Cr[0]-4},{Cr[1]+6} L{PC[0]:.1f},{PC[1]:.1f}" stroke="#ef476f" stroke-width="5" stroke-linecap="round"/>', 33)
    # vagoneta con un cupcake
    s_c = 150
    P0 = (Ar[0] + s_c * dd[0], Ar[1] + s_c * dd[1])
    cart = (f'<rect x="-34" y="-34" width="68" height="24" rx="4" fill="#7b6cff" stroke="{OUT}" stroke-width="3"/>'
            f'<circle cx="-20" cy="-8" r="8" fill="#5b5f6b" stroke="{OUT}" stroke-width="3"/><circle cx="20" cy="-8" r="8" fill="#5b5f6b" stroke="{OUT}" stroke-width="3"/>'
            f'<line x1="34" y1="-30" x2="42" y2="-30" stroke="{OUT}" stroke-width="3"/>' + draw_cupcake(0, -34 - 56))
    sc.add(f'<g transform="translate({P0[0]:.1f},{P0[1]:.1f}) rotate({ang:.3f})">{cart}</g>', 40)
    att = (P0[0] + 42 * dd[0] + h_att * nup[0], P0[1] + 42 * dd[1] + h_att * nup[1])
    sc.add(f'<path d="M{att[0]:.1f},{att[1]:.1f} L{T1[0]:.1f},{T1[1]:.1f} A{Rp},{Rp} 0 0 1 {PC[0]+Rp:.1f},{PC[1]:.1f} L{PC[0]+Rp:.1f},{PC[1]+46:.1f}" fill="none" stroke="{OUT}" stroke-width="3" stroke-linecap="round"/>', 36)
    sc.add(polea(PC[0], PC[1], Rp, "#c9f2ec"), 37)
    sc.add(draw_donut(PC[0] + Rp, PC[1] + 44), 40)
    sc.extra_eqs.append(k_ * sp.Rational(3, 5) - d)
    return sc, dict(A=A, S=S, B=B, R=R)

if __name__ == "__main__":
    sc, BB = build()
    for nme, bm in BB.items():
        print(nme, "eq:", bm.eq(), " total:", bm.total())
    print("extra:", sc.extra_eqs)
    print("solución:", sc.solve([c, l, d, k_, g, x], c))
    open(sys.argv[1] if len(sys.argv) > 1 else "p6.svg", "w", encoding="utf-8").write(
        sc.svg("Acertijo de la fábrica de golosinas: ¿cuántos caramelos hay en el bote?"))
