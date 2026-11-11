"""Puzle 3 — Noche de nieve"""
import math, sys
import sympy as sp
import lib
from lib import *

r, o, S, g, x = sp.symbols("regalo bola muneco globo x", positive=True)
ROPE_L = "#f1e3c2"   # cuerda clara para cielo oscuro
GROUND = 792

def rope(sc, x1, y1, x2, y2, z=30, w=3):
    sc.rope(x1, y1, x2, y2, z=z, w=w, col=ROPE_L)

# ---------- objetos ----------
def draw_regalo(cx, top, ring=True):
    w = 36; h = 34
    yb = top + 8
    s = []
    if ring:
        s.append(f'<path d="M{cx-9},{yb+2} Q{cx-14},{top-4} {cx},{yb} Q{cx+14},{top-4} {cx+9},{yb+2}" fill="#ffd23f" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>')
    s.append(f'<rect x="{cx-w/2}" y="{yb}" width="{w}" height="{h}" rx="3" fill="#e63946" stroke="{OUT}" stroke-width="3"/>')
    s.append(f'<rect x="{cx-4}" y="{yb}" width="8" height="{h}" fill="#ffd23f" stroke="{OUT}" stroke-width="2"/>')
    s.append(f'<rect x="{cx-w/2}" y="{yb+h/2-4}" width="{w}" height="8" fill="#ffd23f" stroke="{OUT}" stroke-width="2"/>')
    return "".join(s)

def draw_bola(cx, top):
    cy = top + 30
    return (f'<circle cx="{cx}" cy="{top+4}" r="4" fill="none" stroke="#ffd23f" stroke-width="2.5"/>'
            f'<rect x="{cx-7}" y="{top+7}" width="14" height="8" rx="2" fill="#ffd23f" stroke="{OUT}" stroke-width="2.5"/>'
            f'<circle cx="{cx}" cy="{cy}" r="18" fill="#8e44ec" stroke="{OUT}" stroke-width="3"/>'
            f'<path d="M{cx-17},{cy+2} Q{cx},{cy+10} {cx+17},{cy+2}" fill="none" stroke="#f6c1ff" stroke-width="3"/>'
            f'<ellipse cx="{cx-7}" cy="{cy-7}" rx="5" ry="7" fill="#fff" opacity=".6" transform="rotate(35 {cx-7} {cy-7})"/>')

def draw_muneco(cx, top, hook=True):
    s = []
    if hook:
        s.append(f'<circle cx="{cx}" cy="{top+4}" r="4.5" fill="none" stroke="{OUT}" stroke-width="3"/>')
    hy = top + 8
    s.append(f'<rect x="{cx-12}" y="{hy}" width="24" height="16" fill="#26324f" stroke="{OUT}" stroke-width="3"/>'
             f'<rect x="{cx-17}" y="{hy+14}" width="34" height="6" rx="2" fill="#26324f" stroke="{OUT}" stroke-width="3"/>'
             f'<rect x="{cx-12}" y="{hy+9}" width="24" height="4" fill="#e63946"/>')
    s.append(f'<circle cx="{cx}" cy="{hy+50}" r="25" fill="#fbfdff" stroke="{OUT}" stroke-width="3"/>')
    s.append(f'<circle cx="{cx}" cy="{hy+33}" r="16" fill="#fbfdff" stroke="{OUT}" stroke-width="3"/>')
    s.append(f'<path d="M{cx-14},{hy+44} Q{cx},{hy+52} {cx+14},{hy+44} L{cx+16},{hy+50} L{cx+8},{hy+64} L{cx+2},{hy+62} L{cx+4},{hy+50} Q{cx},{hy+52} {cx-14},{hy+50} Z" fill="#2a9d8f" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>')
    s.append(f'<circle cx="{cx-6}" cy="{hy+30}" r="2.3" fill="{OUT}"/><circle cx="{cx+6}" cy="{hy+30}" r="2.3" fill="{OUT}"/>'
             f'<path d="M{cx},{hy+34} L{cx+15},{hy+37} L{cx},{hy+38} Z" fill="#ff8c1a" stroke="{OUT}" stroke-width="1.6" stroke-linejoin="round"/>')
    for dy in (58, 68):
        s.append(f'<circle cx="{cx}" cy="{hy+dy}" r="2.6" fill="{OUT}"/>')
    return "".join(s)

def draw_saco(cx, top):
    s = [f'<path d="M{cx-10},{top+20} Q{cx-16},{top+4} {cx},{top+2} Q{cx+16},{top+4} {cx+10},{top+20}" fill="none" stroke="{OUT}" stroke-width="3"/>',
         f'<path d="M{cx-12},{top+20} Q{cx-46},{top+40} {cx-42},{top+76} Q{cx},{top+92} {cx+42},{top+76} Q{cx+46},{top+40} {cx+12},{top+20} Z" fill="#b5651d" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>',
         f'<path d="M{cx-14},{top+18} L{cx+14},{top+18} L{cx+11},{top+26} L{cx-11},{top+26} Z" fill="#e63946" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>',
         f'<path d="M{cx-26},{top+48} q4,-3 8,0 M{cx+18},{top+66} q4,-3 8,0" stroke="#8a4a14" stroke-width="2" fill="none"/>',
         text(cx, top + 60, "?", 38, 900, col="#ffd23f", extra=f'stroke="{OUT}" stroke-width="2.2" paint-order="stroke"')]
    return "".join(s)

REGALO = Kind("regalo", r, 42, 36, draw_regalo, ring=6)
BOLA = Kind("bola", o, 48, 36, draw_bola, ring=4)
MUNECO = Kind("muñeco", S, 82, 50, draw_muneco, ring=4)
SACO = Kind("saco", x * r, 90, 92, draw_saco, ring=4)

BEAM = dict(col="#9fd8f5", hl="#e6f7ff")

def estrella(cx, cy, R, col="#ffe066", k=0.45):
    pts = []
    for i in range(10):
        rr = R if i % 2 == 0 else R * k
        a = -math.pi / 2 + i * math.pi / 5
        pts.append(f"{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="{col}" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>'

def pino(cx, base, h=200, w=120):
    s = [f'<rect x="{cx-10}" y="{base-24}" width="20" height="26" fill="#7a4a24" stroke="{OUT}" stroke-width="3"/>']
    for i, (fy, fw) in enumerate([(0.0, 1.0), (0.3, 0.8), (0.55, 0.6)]):
        yb = base - 20 - h * fy * 0.9
        yt = yb - h * 0.45
        s.append(f'<path d="M{cx-w*fw/2:.1f},{yb:.1f} L{cx},{yt:.1f} L{cx+w*fw/2:.1f},{yb:.1f} Z" fill="#1f8a5b" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
        s.append(f'<path d="M{cx-w*fw/2+6:.1f},{yb-2:.1f} Q{cx-w*fw/4:.1f},{yb-10:.1f} {cx:.1f},{yb-4:.1f} Q{cx+w*fw/4:.1f},{yb-12:.1f} {cx+w*fw/2-6:.1f},{yb-2:.1f}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>')
    return "".join(s)

def pinguino(cx, base):
    return (f'<ellipse cx="{cx}" cy="{base-30}" rx="22" ry="30" fill="#1e2433" stroke="{OUT}" stroke-width="3"/>'
            f'<ellipse cx="{cx+4}" cy="{base-26}" rx="14" ry="22" fill="#fbfdff"/>'
            f'<circle cx="{cx+6}" cy="{base-46}" r="2.6" fill="{OUT}"/>'
            f'<path d="M{cx+14},{base-44} L{cx+28},{base-40} L{cx+14},{base-36} Z" fill="#ff9f1c" stroke="{OUT}" stroke-width="2" stroke-linejoin="round"/>'
            f'<path d="M{cx-12},{base+1} l10,-6 l4,6 Z M{cx+4},{base+1} l10,-6 l4,6 Z" fill="#ff9f1c" stroke="{OUT}" stroke-width="2" stroke-linejoin="round"/>'
            f'<path d="M{cx-20},{base-36} Q{cx-34},{base-20} {cx-24},{base-10}" fill="#1e2433" stroke="{OUT}" stroke-width="3"/>')

def trineo_local(L=118):
    h = L / 2
    return (f'<path d="M{-h},0 L{h-10},0 Q{h+6},0 {h+4},-14" fill="none" stroke="{OUT}" stroke-width="7" stroke-linecap="round"/>'
            f'<path d="M{-h},0 L{h-10},0 Q{h+6},0 {h+4},-14" fill="none" stroke="#c0392b" stroke-width="3.5" stroke-linecap="round"/>'
            f'<line x1="{-h+14}" y1="0" x2="{-h+14}" y2="-10" stroke="{OUT}" stroke-width="4"/><line x1="{h-20}" y1="0" x2="{h-20}" y2="-10" stroke="{OUT}" stroke-width="4"/>'
            f'<rect x="{-h+2}" y="-18" width="{L-14}" height="9" rx="3" fill="#d9954a" stroke="{OUT}" stroke-width="3"/>')

def build():
    sc = Scene(1400, 900)
    sc.rope_col = ROPE_L
    # ----- cielo nocturno -----
    sc.add('<defs><linearGradient id="noche" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14204a"/><stop offset=".7" stop-color="#3a2f78"/><stop offset="1" stop-color="#5b4b9a"/></linearGradient>'
           '<linearGradient id="aurora" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3cf2a6" stop-opacity="0"/><stop offset=".4" stop-color="#3cf2a6" stop-opacity=".45"/><stop offset=".8" stop-color="#7bd5ff" stop-opacity=".3"/><stop offset="1" stop-color="#7bd5ff" stop-opacity="0"/></linearGradient></defs>', 0)
    sc.add('<rect width="1400" height="900" fill="url(#noche)"/>', 0)
    sc.add('<path d="M0,250 C250,140 520,300 820,170 S1260,120 1400,210 L1400,290 C1200,220 1020,300 820,250 S300,250 0,330 Z" fill="url(#aurora)"/>', 1)
    import random
    rnd = random.Random(7)
    for _ in range(70):
        sx, sy = rnd.uniform(20, 1380), rnd.uniform(30, 520)
        sc.add(f'<circle cx="{sx:.0f}" cy="{sy:.0f}" r="{rnd.choice([1.2,1.6,2.2])}" fill="#fff" opacity="{rnd.uniform(.5,1):.2f}"/>', 1)
    sc.add('<circle cx="1260" cy="110" r="52" fill="#fff6c9" stroke="#e8d892" stroke-width="3"/><circle cx="1284" cy="96" r="46" fill="#25306a"/>', 2)
    # suelo nevado
    sc.add(f'<path d="M0,{GROUND-6} Q200,{GROUND-24} 420,{GROUND-4} T860,{GROUND-8} T1400,{GROUND-10} L1400,900 L0,900 Z" fill="#eef6ff" stroke="#b9d3ee" stroke-width="3"/>', 4)
    sc.add(pino(70, GROUND + 4, 260, 130), 6)
    sc.add(pino(1340, GROUND + 4, 220, 110), 6)
    sc.add(draw_muneco(190, GROUND - 82, hook=False), 7)   # muñeco en el suelo: distractor
    sc.add(pinguino(662, GROUND + 4), 70)

    # ================= VIGA PRINCIPAL M en un farol =================
    M = Beam(sc, "M", 560, 380, 60, -4, 4, **BEAM)
    sc.add(poste(M.px, M.y, GROUND + 4, w=20, col="#2d3a66", hl="#5a6aa6"), 20)
    sc.add(f'<rect x="{M.px-22}" y="{GROUND-14}" width="44" height="20" rx="4" fill="#2d3a66" stroke="{OUT}" stroke-width="3"/>', 21)
    sc.add(estrella(M.px, M.y - 34, 22), 61)
    sc.add(f'<rect x="{M.px-4}" y="{M.y-16}" width="8" height="12" fill="#2d3a66" stroke="{OUT}" stroke-width="2"/>', 59)

    # ---- máquina de Atwood colgada de M en -3 ----
    ka = -3
    ax = M.X(ka)
    RA = 30
    py = M.y + 58
    sc.add(f'<line x1="{ax}" y1="{M.y}" x2="{ax}" y2="{py-RA-2}" stroke="{OUT}" stroke-width="5"/>', 32)
    sc.add(polea(ax, py, RA, "#cfe3f2"), 34)
    lx, rx_ = ax - RA, ax + RA
    rope(sc, lx, py, lx, py + 70, z=31)
    rope(sc, rx_, py, rx_, py + 40, z=31)
    sc.add(f'<path d="M{lx},{py} A{RA},{RA} 0 0 1 {rx_},{py}" fill="none" stroke="{ROPE_L}" stroke-width="3.5"/>', 35)
    sc.add(draw_muneco(lx, py + 66), 40)
    yy = py + 36
    for kd in (BOLA, BOLA, REGALO):
        sc.add(kd.draw(rx_, yy), 40)
        rope(sc, rx_, yy - 6, rx_, yy + 6, z=31)
        yy += kd.h + 2
    rope(sc, rx_, py + 36, rx_, yy - 30, z=31)
    # equilibrio de la polea: tensión igual a ambos lados
    sc.extra_eqs.append(S - (2 * o + r))
    M.force(ka, S + 2 * o + r, "polea de Atwood")

    M.hang(-1, REGALO, drop=20)

    # ---- viga flotante F, atada a M en +2 ----
    kf = 2
    F = Beam(sc, "F", M.X(kf), 196, 50, -3, 2, **BEAM)
    rope(sc, F.px, F.y, F.px, M.y, z=29)
    sc.add(f'<circle cx="{F.px}" cy="{M.y-8}" r="4" fill="{OUT}"/>', 61)
    def globo(beam, k, dx=0, h=96):
        xx = beam.X(k)
        sc.add(globo_svg(xx, beam.y, xx + dx, beam.y - h), 62)
        beam.force(k, -g, "globo")
    globo(F, -3, -14)
    globo(F, 2, 14)
    F.hang(-1, [BOLA, REGALO], drop=16)
    F.stand(0, REGALO)
    F.draw()
    M.force(kf, F.total(), "viga flotante")

    M.hang(3, SACO, drop=16)
    M.hang(4, BOLA, drop=120)
    M.draw()

    # ================= COLINA DE HIELO CON DOS TRINEOS =================
    U = 60
    hU, L1U, L2U = 2, 6, 4
    hh, L1, L2 = hU * U, L1U * U, L2U * U
    apex = (1062, GROUND - hh)
    bL, bR = math.sqrt(L1**2 - hh**2), math.sqrt(L2**2 - hh**2)
    FL = (apex[0] - bL, GROUND); FR = (apex[0] + bR, GROUND)
    sc.add(f'<path d="M{FL[0]:.1f},{GROUND} L{apex[0]},{apex[1]} L{FR[0]:.1f},{GROUND} Z" fill="#cfeaff" stroke="{OUT}" stroke-width="3.5" stroke-linejoin="round"/>', 10)
    sc.add(f'<path d="M{FL[0]+40:.1f},{GROUND-8} L{apex[0]-20},{apex[1]+22}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>', 11)
    dL = ((apex[0] - FL[0]) / L1, (apex[1] - GROUND) / L1)
    dR = ((apex[0] - FR[0]) / L2, (apex[1] - GROUND) / L2)
    nL = (dL[1], -dL[0])     # normal hacia fuera (arriba-izquierda)
    nR = (-dR[1], dR[0])     # normal hacia fuera (arriba-derecha)
    if nL[1] > 0: nL = (-nL[0], -nL[1])
    if nR[1] > 0: nR = (-nR[0], -nR[1])
    h_att, Rp = 28, 15
    delta = h_att - Rp
    # C: distancia delta por encima de ambas laderas
    a11, a12, a21, a22 = nL[0], nL[1], nR[0], nR[1]
    det = a11 * a22 - a12 * a21
    cx_ = (delta * a22 - a12 * delta) / det
    cy_ = (a11 * delta - delta * a21) / det
    C = (apex[0] + cx_, apex[1] + cy_)
    TL = (C[0] + Rp * nL[0], C[1] + Rp * nL[1])
    TR = (C[0] + Rp * nR[0], C[1] + Rp * nR[1])
    # soporte y polea
    sc.add(f'<path d="M{apex[0]-10},{apex[1]+14} L{C[0]:.1f},{C[1]:.1f} L{apex[0]+10},{apex[1]+14}" fill="none" stroke="{OUT}" stroke-width="5" stroke-linejoin="round"/>', 33)
    # trineo izquierdo con 3 regalos
    sL = 130
    PLs = (FL[0] + sL * dL[0], GROUND + sL * dL[1])
    angL = math.degrees(math.atan2(dL[1], dL[0]))
    gifts = "".join(draw_regalo(xx, -18 - 42, ring=False).replace(f'y="{-18-42+8}"', f'y="{-18-34}"') for xx in (-38, 0, 38))
    gifts = "".join(f'<g transform="translate({xx},0)">' + draw_regalo(0, -18 - 42, ring=False) + '</g>' for xx in (-38, 0, 38))
    sc.add(f'<g transform="translate({PLs[0]:.1f},{PLs[1]:.1f}) rotate({angL:.2f})">{trineo_local()}<g transform="translate(0,8)">{gifts}</g></g>', 40)
    attL = (PLs[0] + 64 * dL[0] + h_att * nL[0], PLs[1] + 64 * dL[1] + h_att * nL[1])
    # trineo derecho con muñeco y globo
    sR = 96
    PRs = (FR[0] + sR * dR[0], GROUND + sR * dR[1])
    angR = math.degrees(math.atan2(-dR[1], -dR[0]))
    sc.add(f'<g transform="translate({PRs[0]:.1f},{PRs[1]:.1f}) rotate({angR:.2f})">{trineo_local()}'
           f'<g transform="scale(-1,1)"></g>{draw_muneco(0, -18 - 82 + 4, hook=False)}</g>', 40)
    attR = (PRs[0] - 64 * (-dR[0]) + h_att * nR[0], PRs[1] - 64 * (-dR[1]) + h_att * nR[1])
    # globo atado al sombrero del muñeco (vertical en el mundo)
    hat_local = (0, -18 - 82 + 12)
    ca, sa = math.cos(math.radians(angR)), math.sin(math.radians(angR))
    hat = (PRs[0] + hat_local[0] * ca - hat_local[1] * sa, PRs[1] + hat_local[0] * sa + hat_local[1] * ca)
    sc.add(globo_svg(hat[0], hat[1], hat[0] + 18, hat[1] - 110), 62)
    # cuerda: trineo izq -> polea -> trineo der (paralela a cada ladera)
    sc.add(f'<path d="M{attL[0]:.1f},{attL[1]:.1f} L{TL[0]:.1f},{TL[1]:.1f} A{Rp},{Rp} 0 0 1 {TR[0]:.1f},{TR[1]:.1f} L{attR[0]:.1f},{attR[1]:.1f}" fill="none" stroke="{OUT}" stroke-width="3" stroke-linecap="round"/>', 36)
    sc.add(polea(C[0], C[1], Rp, "#cfe3f2"), 37)
    for p in (attL, attR):
        sc.add(f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="3.5" fill="{OUT}"/>', 41)
    # cotas
    DIM = f'stroke="{OUT}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"'
    def on_slope(F0, d, n, s, off):
        return (F0[0] + s * d[0] - off * n[0], F0[1] + s * d[1] - off * n[1])
    for (F0, d, n, Ls, lab) in ((FL, dL, nL, L1, "6"), (FR, dR, nR, L2, "4")):
        q1 = on_slope(F0, d, n, 18 / math.tan(math.asin(hU / (Ls / U))) + 22, 18); q2 = on_slope(F0, d, n, Ls - 30, 18)
        sc.add(f'<g {DIM}><line x1="{q1[0]:.1f}" y1="{q1[1]:.1f}" x2="{q2[0]:.1f}" y2="{q2[1]:.1f}"/>'
               + arrow_head(q1[0], q1[1], -d[0], -d[1], 9) + arrow_head(q2[0], q2[1], d[0], d[1], 9) + '</g>', 12)
        tm = on_slope(F0, d, n, Ls / 2, 40)
        ang = math.degrees(math.atan2(d[1], d[0]))
        if ang < -90: ang += 180
        sc.add(text(tm[0], tm[1], lab, 26, rot=ang), 12)
    vx = apex[0]
    sc.add(f'<g {DIM} stroke-dasharray="6 6"><line x1="{vx}" y1="{apex[1]+30}" x2="{vx}" y2="{GROUND-6}"/></g>'
           f'<g {DIM}>' + arrow_head(vx, apex[1] + 30, 0, -1, 9) + arrow_head(vx, GROUND - 6, 0, 1, 9) + '</g>', 12)
    sc.add(text(vx + 14, GROUND - 32, "2", 26, anchor="start"), 12)
    # equilibrio de la cuerda: 3 regalos · (2/6) = (muñeco − globo) · (2/4)
    sc.extra_eqs.append(3 * r * sp.Rational(hU, L1U) - (S - g) * sp.Rational(hU, L2U))
    return sc, dict(M=M, F=F)

if __name__ == "__main__":
    sc, B = build()
    for nme, b in B.items():
        print(nme, "eq:", b.eq(), " total:", b.total())
    print("extra:", sc.extra_eqs)
    print("solución:", sc.solve([r, o, S, g, x], r))
    open(sys.argv[1] if len(sys.argv) > 1 else "p3.svg", "w", encoding="utf-8").write(
        sc.svg("Acertijo de invierno: ¿cuántos regalos hay en el saco?"))
