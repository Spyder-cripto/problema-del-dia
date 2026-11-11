"""Puzle 9 — El fondo del mar"""
import math, sys, random
import sympy as sp
from lib import *

e, c, b, a, f, T, x = sp.symbols("estrella concha botella anfora boya T x", positive=True)
SEA = 790

# ---------- objetos ----------
def draw_estrella(cx, top):
    cy = top + 24
    pts = []
    for i in range(10):
        rr = 20 if i % 2 == 0 else 9
        ang = -math.pi / 2 + i * math.pi / 5
        pts.append(f"{cx + rr*math.cos(ang):.1f},{cy + rr*math.sin(ang):.1f}")
    s = [f'<polygon points="{" ".join(pts)}" fill="#ff8c42" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>']
    for i in range(5):
        ang = -math.pi / 2 + i * 2 * math.pi / 5
        s.append(f'<circle cx="{cx + 9*math.cos(ang):.1f}" cy="{cy + 9*math.sin(ang):.1f}" r="1.8" fill="#ffd6a5"/>')
    return "".join(s)

def draw_concha(cx, top):
    yb = top + 6
    s = [f'<circle cx="{cx}" cy="{top+2}" r="3" fill="none" stroke="{OUT}" stroke-width="2.4"/>',
         f'<path d="M{cx-6},{yb+32} L{cx-10},{yb+38} L{cx+10},{yb+38} L{cx+6},{yb+32} Z" fill="#ffafcc" stroke="{OUT}" stroke-width="2.4" stroke-linejoin="round"/>',
         f'<path d="M{cx},{yb+34} L{cx-22},{yb+12} Q{cx},{yb-8} {cx+22},{yb+12} Z" fill="#ffc8dd" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>']
    for dx in (-13, -6, 0, 6, 13):
        s.append(f'<line x1="{cx}" y1="{yb+32}" x2="{cx+dx*1.4:.1f}" y2="{yb+5 + abs(dx)*0.5:.1f}" stroke="#e5809f" stroke-width="2"/>')
    return "".join(s)

def draw_botella(cx, top):
    s = [f'<rect x="{cx-5}" y="{top}" width="10" height="8" rx="2" fill="#b07a45" stroke="{OUT}" stroke-width="2.4"/>',
         f'<path d="M{cx-6},{top+8} L{cx-6},{top+18} Q{cx-14},{top+22} {cx-14},{top+32} L{cx-14},{top+58} Q{cx-14},{top+62} {cx-10},{top+62} L{cx+10},{top+62} Q{cx+14},{top+62} {cx+14},{top+58} L{cx+14},{top+32} Q{cx+14},{top+22} {cx+6},{top+18} L{cx+6},{top+8} Z" fill="#7bd389" fill-opacity=".85" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<rect x="{cx-7}" y="{top+32}" width="14" height="22" rx="3" fill="#fff6d5" stroke="{OUT}" stroke-width="2" transform="rotate(-8 {cx} {top+43})"/>',
         f'<line x1="{cx-4}" y1="{top+38}" x2="{cx+4}" y2="{top+37}" stroke="#c9a35a" stroke-width="1.8"/><line x1="{cx-4}" y1="{top+44}" x2="{cx+4}" y2="{top+43}" stroke="#c9a35a" stroke-width="1.8"/>']
    return "".join(s)

def draw_anfora(cx, top):
    s = [f'<rect x="{cx-7}" y="{top}" width="14" height="6" rx="2" fill="#c8553d" stroke="{OUT}" stroke-width="2.4"/>',
         f'<path d="M{cx-6},{top+10} Q{cx-20},{top+8} {cx-16},{top+26}" fill="none" stroke="{OUT}" stroke-width="7"/><path d="M{cx-6},{top+10} Q{cx-20},{top+8} {cx-16},{top+26}" fill="none" stroke="#e07a5f" stroke-width="3"/>',
         f'<path d="M{cx+6},{top+10} Q{cx+20},{top+8} {cx+16},{top+26}" fill="none" stroke="{OUT}" stroke-width="7"/><path d="M{cx+6},{top+10} Q{cx+20},{top+8} {cx+16},{top+26}" fill="none" stroke="#e07a5f" stroke-width="3"/>',
         f'<path d="M{cx-6},{top+6} L{cx-6},{top+16} Q{cx-24},{top+28} {cx-20},{top+48} Q{cx-14},{top+64} {cx},{top+72} Q{cx+14},{top+64} {cx+20},{top+48} Q{cx+24},{top+28} {cx+6},{top+16} L{cx+6},{top+6} Z" fill="#e07a5f" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<path d="M{cx-18},{top+36} Q{cx},{top+42} {cx+18},{top+36}" fill="none" stroke="#3d2c2e" stroke-width="2.5"/>',
         f'<path d="M{cx-17},{top+46} Q{cx},{top+52} {cx+17},{top+46}" fill="none" stroke="#3d2c2e" stroke-width="2.5"/>']
    return "".join(s)

def draw_red(cx, top):
    s = [f'<circle cx="{cx}" cy="{top+6}" r="6" fill="none" stroke="{OUT}" stroke-width="3"/>',
         f'<path d="M{cx-8},{top+14} Q{cx-48},{top+40} {cx-38},{top+78} Q{cx},{top+100} {cx+38},{top+78} Q{cx+48},{top+40} {cx+8},{top+14} Z" fill="#ffd166" fill-opacity=".35" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>']
    for i in range(-3, 4):
        s.append(f'<path d="M{cx+i*4},{top+14} Q{cx+i*14},{top+50} {cx+i*11},{top+90}" fill="none" stroke="#c0392b" stroke-width="2"/>')
    for j in range(1, 5):
        yy = top + 14 + j * 17
        w_ = 10 + j * 8 if j < 4 else 34
        s.append(f'<path d="M{cx-w_},{yy} Q{cx},{yy+6} {cx+w_},{yy}" fill="none" stroke="#c0392b" stroke-width="2"/>')
    s.append(f'<circle cx="{cx}" cy="{top+58}" r="16" fill="#fff" stroke="{OUT}" stroke-width="2.5"/>')
    s.append(text(cx, top + 59, "?", 26, 900, col="#c0392b"))
    return "".join(s)

def boya_svg(tx, ty, bx, by):
    r = 24
    return (f'<path d="M{tx},{ty} Q{(tx+bx)/2+8:.1f},{(ty+by)/2:.1f} {bx},{by+r}" fill="none" stroke="{OUT}" stroke-width="2"/>'
            f'<circle cx="{bx}" cy="{by}" r="{r}" fill="#fff" stroke="{OUT}" stroke-width="3"/>'
            f'<path d="M{bx-r},{by} A{r},{r} 0 0 1 {bx+r},{by} Z" fill="#e63946"/>'
            f'<rect x="{bx-r}" y="{by-4}" width="{2*r}" height="8" fill="#fff"/>'
            f'<circle cx="{bx}" cy="{by}" r="{r}" fill="none" stroke="{OUT}" stroke-width="3"/>'
            f'<ellipse cx="{bx-9}" cy="{by-12}" rx="5" ry="3" fill="#fff" opacity=".7"/>')

ESTRELLA = Kind("estrella", e, 46, 42, draw_estrella, ring=4)
CONCHA = Kind("concha", c, 46, 46, draw_concha, ring=2)
BOTELLA = Kind("botella", b, 62, 30, draw_botella, ring=2)
ANFORA = Kind("ánfora", a, 72, 48, draw_anfora, ring=2)
RED = Kind("red", x * e, 96, 96, draw_red, ring=6)

BEAM = dict(col="#ffd166", hl="#fff0b8")

def pez(cx, cy, col, k=1.0, flip=False):
    sx = -1 if flip else 1
    return (f'<g transform="translate({cx},{cy}) scale({sx*k},{k})">'
            f'<path d="M-26,0 Q-6,-20 18,0 Q-6,20 -26,0 Z" fill="{col}" stroke="{OUT}" stroke-width="2.6"/>'
            f'<path d="M18,0 L34,-12 L32,0 L34,12 Z" fill="{col}" stroke="{OUT}" stroke-width="2.6" stroke-linejoin="round"/>'
            f'<circle cx="-14" cy="-3" r="3" fill="{OUT}"/></g>')

def medusa(cx, cy):
    s = [f'<path d="M{cx-26},{cy} Q{cx-26},{cy-30} {cx},{cy-30} Q{cx+26},{cy-30} {cx+26},{cy} Q{cx+13},{cy-6} {cx},{cy} Q{cx-13},{cy-6} {cx-26},{cy} Z" fill="#cdb4db" fill-opacity=".9" stroke="{OUT}" stroke-width="2.6"/>']
    for dx in (-16, -6, 4, 14):
        s.append(f'<path d="M{cx+dx},{cy-2} q6,14 0,26 q-6,12 2,24" fill="none" stroke="#9d7ab8" stroke-width="2.5"/>')
    return "".join(s)

def pulpo(cx, base):
    s = [f'<ellipse cx="{cx}" cy="{base-58}" rx="34" ry="32" fill="#ff70a6" stroke="{OUT}" stroke-width="3"/>']
    for i, dx in enumerate((-30, -14, 2, 18, 32)):
        s.append(f'<path d="M{cx+dx*0.6},{base-34} Q{cx+dx},{base-14} {cx+dx*1.2+(8 if i%2 else -8)},{base}" fill="none" stroke="{OUT}" stroke-width="11" stroke-linecap="round"/>'
                 f'<path d="M{cx+dx*0.6},{base-34} Q{cx+dx},{base-14} {cx+dx*1.2+(8 if i%2 else -8)},{base}" fill="none" stroke="#ff70a6" stroke-width="6" stroke-linecap="round"/>')
    s.append(f'<circle cx="{cx-11}" cy="{base-62}" r="6" fill="#fff" stroke="{OUT}" stroke-width="2"/><circle cx="{cx+11}" cy="{base-62}" r="6" fill="#fff" stroke="{OUT}" stroke-width="2"/>'
             f'<circle cx="{cx-10}" cy="{base-61}" r="2.6" fill="{OUT}"/><circle cx="{cx+12}" cy="{base-61}" r="2.6" fill="{OUT}"/>')
    return "".join(s)

def build():
    sc = Scene(1400, 900)
    rnd = random.Random(11)
    sc.add('<defs><linearGradient id="agua9" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#48cae4"/><stop offset="1" stop-color="#0077b6"/></linearGradient></defs>', 0)
    sc.add('<rect width="1400" height="900" fill="url(#agua9)"/>', 0)
    sc.add('<rect width="1400" height="58" fill="#caf0f8"/>', 0)
    sc.add('<path d="M0,58 ' + " ".join(f"Q{i*70+35},{50 if i%2 else 66} {i*70+70},58" for i in range(20)) + ' L1400,72 L0,72 Z" fill="#90e0ef" opacity=".8"/>', 1)
    for _ in range(26):
        bx, by = rnd.uniform(30, 1370), rnd.uniform(120, 740)
        sc.add(f'<circle cx="{bx:.0f}" cy="{by:.0f}" r="{rnd.choice([3,4,6])}" fill="none" stroke="#e0fbfc" stroke-width="2" opacity=".7"/>', 2)
    # rayos de luz
    for x0 in (180, 520, 900, 1220):
        sc.add(f'<path d="M{x0},58 L{x0+60},58 L{x0+180},{SEA} L{x0+80},{SEA} Z" fill="#fff" opacity=".07"/>', 2)
    # muelle de madera arriba (fijo)
    sc.add(f'<rect x="380" y="20" width="700" height="34" rx="4" fill="#9c6644" stroke="{OUT}" stroke-width="3"/>'
           + "".join(f'<line x1="{xx}" y1="22" x2="{xx}" y2="52" stroke="#7f5539" stroke-width="2.5"/>' for xx in range(420, 1080, 60))
           + "".join(f'<rect x="{xx}" y="40" width="22" height="70" fill="#7f5539" stroke="{OUT}" stroke-width="3"/>' for xx in (400, 1040)), 15)
    # fondo marino
    sc.add(f'<path d="M0,{SEA} Q200,{SEA-16} 420,{SEA-2} T860,{SEA-4} T1400,{SEA-10} L1400,900 L0,900 Z" fill="#f6d6a8" stroke="{OUT}" stroke-width="3"/>', 5)
    for (sx, h_, col) in ((40, 150, "#2a9d8f"), (90, 110, "#52b788"), (690, 120, "#2a9d8f"), (1385, 140, "#52b788")):
        sc.add(f'<path d="M{sx},{SEA+4} q-14,-{h_*0.3:.0f} 0,-{h_*0.5:.0f} q14,-{h_*0.2:.0f} 0,-{h_*0.5:.0f}" fill="none" stroke="{col}" stroke-width="9" stroke-linecap="round"/>', 6)
    sc.add(pez(140, 200, "#ffd166", 1.0), 70)
    sc.add(pez(1260, 300, "#ef476f", 0.9, flip=True), 70)
    sc.add(pez(560, 690, "#06d6a0", 0.8, flip=True), 70)
    sc.add(medusa(1180, 150), 70)
    sc.add(pulpo(560, SEA + 4), 7)

    # ================= M, S, S2 =================
    M = Beam(sc, "M", 700, 190, 60, -4, 4, **BEAM)
    sc.rope(M.px, 54, M.px, M.y, z=29, w=5, col=OUT)
    S = Beam(sc, "S", M.X(-4), 350, 45, -3, 3, **BEAM)
    S2 = Beam(sc, "S2", S.X(3), 492, 45, -2, 2, **BEAM)
    S2.hang(-2, BOTELLA, drop=14)
    S2.hang(0, ESTRELLA, drop=14)
    xb = S2.X(1)
    sc.add(boya_svg(xb, S2.y, xb + 16, S2.y - 92), 62); S2.force(1, -f, "boya")
    S2.hang(2, ANFORA, drop=14)
    S2.draw()
    hang_beam(S, 3, S2)
    S.hang(-3, CONCHA, drop=14)
    S.hang(-1, ANFORA, drop=14)
    xb = S.X(1)
    sc.add(boya_svg(xb, S.y, xb - 10, S.y - 92), 62); S.force(1, -f, "boya")
    S.draw()
    hang_beam(M, -4, S)
    M.hang(-1, BOTELLA, drop=14)
    M.hang(1, CONCHA, drop=14)
    M.hang(3, RED, drop=12)
    M.draw()

    # ================= X e Y: cuerda compartida por una polea anclada en el fondo =================
    Rq = 26
    PQ = (1050, 742)
    X = Beam(sc, "X", PQ[0] - Rq - 3 * 45, 560, 45, -3, 3, margin=14, **BEAM)
    Y = Beam(sc, "Y", PQ[0] + Rq + 3 * 45, 560, 45, -3, 3, margin=14, **BEAM)
    for B_ in (X, Y):
        sc.add(f'<path d="M{B_.px-14},{SEA+4} L{B_.px-9},{B_.y} L{B_.px+9},{B_.y} L{B_.px+14},{SEA+4} Z" fill="#ff8fa3" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>'
               f'<circle cx="{B_.px-4}" cy="{B_.y+60}" r="3" fill="#c9184a"/><circle cx="{B_.px+3}" cy="{B_.y+130}" r="3" fill="#c9184a"/><circle cx="{B_.px-2}" cy="{B_.y+190}" r="3" fill="#c9184a"/>', 20)
    sc.add(f'<rect x="{PQ[0]-30}" y="{PQ[1]+18}" width="60" height="34" rx="6" fill="#6c757d" stroke="{OUT}" stroke-width="3"/>'
           f'<line x1="{PQ[0]}" y1="{PQ[1]}" x2="{PQ[0]}" y2="{PQ[1]+20}" stroke="{OUT}" stroke-width="6"/>', 33)
    sc.path(f'M{X.X(3)},{X.y} L{X.X(3)},{PQ[1]} A{Rq},{Rq} 0 0 0 {Y.X(-3)},{PQ[1]} L{Y.X(-3)},{Y.y}', z=30, w=3)
    sc.add(polea(PQ[0], PQ[1], Rq, "#e9ecef"), 34)
    X.force(3, T, "cuerda (abajo)")
    Y.force(-3, T, "cuerda (abajo)")
    X.hang(-2, ANFORA, drop=14)
    X.hang(-1, BOTELLA, drop=14)
    X.hang(1, ESTRELLA, drop=14)
    Y.hang(-2, BOTELLA, drop=14)
    Y.hang(3, [ESTRELLA, ANFORA], drop=14, gap=2)
    X.draw(); Y.draw()

    # ================= R: viga inclinada sobre una roca =================
    Rpx, Rpy, ur, th = 230, 612, 58, math.radians(20)
    dx_, dy_ = math.cos(th), -math.sin(th)
    R = Beam(sc, "R", Rpx, Rpy, ur, -3, 3, balance=True)
    def P(k_):
        return (Rpx + k_ * ur * dx_, Rpy + k_ * ur * dy_)
    sc.add(f'<path d="M{Rpx-30},{SEA+4} L{Rpx-16},{Rpy+40} Q{Rpx-12},{Rpy+8} {Rpx},{Rpy+8} Q{Rpx+12},{Rpy+8} {Rpx+16},{Rpy+40} L{Rpx+30},{SEA+4} Z" fill="#8d99ae" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>'
           f'<path d="M{Rpx-8},{Rpy+60} q10,10 4,30 M{Rpx+6},{Rpy+110} q-8,12 0,26" fill="none" stroke="#6c7689" stroke-width="2.5"/>', 20)
    p1, p2 = P(-3.35), P(3.35)
    sc.add(f'<line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" y2="{p2[1]:.1f}" stroke="{OUT}" stroke-width="19" stroke-linecap="round"/>'
           f'<line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" y2="{p2[1]:.1f}" stroke="#ffd166" stroke-width="13" stroke-linecap="round"/>', 50)
    for k_ in range(-3, 4):
        if k_ == 0: continue
        q = P(k_)
        sc.add(f'<circle cx="{q[0]:.1f}" cy="{q[1]:.1f}" r="3.6" fill="{OUT}"/>', 51)
    sc.add(f'<circle cx="{Rpx}" cy="{Rpy}" r="8.5" fill="#fff" stroke="{OUT}" stroke-width="3"/><circle cx="{Rpx}" cy="{Rpy}" r="3" fill="{OUT}"/>', 52)
    def hang_t(k_, kind):
        q = P(k_)
        sc.rope(q[0], q[1], q[0], q[1] + 14 + kind.ring, z=30)
        sc.add(kind.draw(q[0], q[1] + 14), 40)
        R.force(k_, kind.w, kind.name)
    hang_t(-1, CONCHA)
    hang_t(2, BOTELLA)
    q = P(1)
    sc.add(boya_svg(q[0], q[1], q[0] + 12, q[1] - 96), 62); R.force(1, -f, "boya")
    return sc, dict(M=M, S=S, S2=S2, X=X, Y=Y, R=R)

if __name__ == "__main__":
    sc, BB = build()
    for nme, bm in BB.items():
        print(nme, "eq:", bm.eq(), " total:", bm.total())
    print("solución:", sc.solve([e, c, b, a, f, T, x], e))
    open(sys.argv[1] if len(sys.argv) > 1 else "p9.svg", "w", encoding="utf-8").write(
        sc.svg("Acertijo del fondo del mar: ¿cuántas estrellas de mar hay en la red?"))
