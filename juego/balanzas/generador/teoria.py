"""Página de teoría de «Balanzas imposibles», con ilustraciones en el estilo de las láminas.

Se genera con generar.py en juego/balanzas/teoria/index.html. Los ejemplos usan números
distintos de los de los acertijos para no destripar ninguna solución.
"""
import html
import math

import p1_puerto as P1
from lib import OUT, ROPE, FONT, arrow_head, text

AZUL = "#1d6fd8"
ROJO = "#d62839"
VERDE = "#2a9d55"
CIELO = "#dff3fb"
ARENA = "#f1d9a0"


# ---------------------------------------------------------------- utilidades
def lienzo(body, h=380, label=""):
    return (f'<svg viewBox="0 0 760 {h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{html.escape(label)}">'
            f'<rect width="760" height="{h}" fill="{CIELO}"/>'
            f'<rect x="0" y="{h-40}" width="760" height="40" fill="{ARENA}"/>'
            f'<line x1="0" y1="{h-40}" x2="760" y2="{h-40}" stroke="#c9a55f" stroke-width="3"/>'
            + body +
            f'<rect x="2.5" y="2.5" width="755" height="{h-5}" rx="4" fill="none" stroke="{OUT}" stroke-width="5"/></svg>')


def cuerda(x1, y1, x2, y2, w=3, col=ROPE):
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>'


def flecha(x1, y1, x2, y2, col=ROJO, w=5):
    L = math.hypot(x2 - x1, y2 - y1)
    ux, uy = (x2 - x1) / L, (y2 - y1) / L
    k = 15
    p1 = (x2 - ux * k - uy * k * 0.6, y2 - uy * k + ux * k * 0.6)
    p2 = (x2 - ux * k + uy * k * 0.6, y2 - uy * k - ux * k * 0.6)
    return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2 - ux*8:.1f}" y2="{y2 - uy*8:.1f}" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>'
            f'<polygon points="{x2:.1f},{y2:.1f} {p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}" fill="{col}"/>')


def etiqueta(x, y, txt, col=OUT, size=21, fondo="#ffffff"):
    w = 0.56 * size * len(txt) + 24
    return (f'<rect x="{x - w/2:.1f}" y="{y - size*0.8:.1f}" width="{w:.1f}" height="{size*1.6:.1f}" rx="10" fill="{fondo}" stroke="{col}" stroke-width="2.5"/>'
            + text(x, y + 1, html.escape(txt), size, 800, col=col))


def cota(x1, x2, y, lab, col=AZUL):
    a, b = min(x1, x2), max(x1, x2)
    return (f'<g stroke="{col}" stroke-width="2.6" fill="none" stroke-linecap="round">'
            f'<line x1="{a}" y1="{y}" x2="{b}" y2="{y}"/><line x1="{a}" y1="{y-8}" x2="{a}" y2="{y+8}"/><line x1="{b}" y1="{y-8}" x2="{b}" y2="{y+8}"/></g>'
            + etiqueta((a + b) / 2, y - 18, lab, col, 19))


def pesa(cx, top, n, anilla=True):
    """pesa de hierro con su valor escrito (en balas); `top` es el arranque de la anilla"""
    yb = top + 12
    s = []
    if anilla:
        s.append(f'<path d="M{cx-9},{yb+2} Q{cx-9},{top-4} {cx},{top-4} Q{cx+9},{top-4} {cx+9},{yb+2}" fill="none" stroke="{OUT}" stroke-width="5"/>')
    s.append(f'<path d="M{cx-18},{yb} L{cx+18},{yb} L{cx+27},{yb+40} Q{cx+28},{yb+46} {cx+22},{yb+46} L{cx-22},{yb+46} Q{cx-28},{yb+46} {cx-27},{yb+40} Z" fill="#4a4f59" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
    s.append(text(cx, yb + 25, str(n), 24, 900, col="#fff"))
    return "".join(s)


def colgar_pesa(x, y, n, drop=16):
    return cuerda(x, y, x, y + drop) + pesa(x, y + drop, n)


def suelo_poste(x, ytop, h):
    return P1.poste(x, ytop, h - 34)


# ---------------------------------------------------------------- figuras
def fig_palanca():
    h = 380
    px, y, u = 380, 150, 60
    pegs = [px + u * k for k in range(-4, 5)]
    b = [suelo_poste(px, y, h),
         P1.balas_colgando(px - 2 * u, y, 3), P1.balas_colgando(px + 3 * u, y, 2),
         P1.viga(px - 4 * u - 20, px + 4 * u + 20, y, pegs, px),
         cota(px, px - 2 * u, 102, "2"), cota(px, px + 3 * u, 102, "3"),
         etiqueta(px - 2 * u, 322, "3 × 2 = 6"), etiqueta(px + 3 * u, 322, "2 × 3 = 6")]
    return lienzo("".join(b), h, "Palanca: tres balas a 2 puntos equilibran dos balas a 3 puntos")


def fig_colgantes():
    h = 430
    Mx, My, u = 470, 100, 60
    pegsM = [Mx + u * k for k in range(-3, 4)]
    Sx, Sy, us = Mx - 3 * u, 236, 50
    pegsS = [Sx + us * k for k in range(-2, 3)]
    b = [suelo_poste(Mx, My, h),
         cuerda(Sx, My, Sx, Sy - 12), f'<circle cx="{Sx}" cy="{Sy-14}" r="5" fill="none" stroke="{OUT}" stroke-width="3"/>',
         P1.balas_colgando(Sx - 2 * us, Sy, 1), P1.balas_colgando(Sx, Sy, 1), P1.balas_colgando(Sx + us, Sy, 2),
         P1.viga(Sx - 2 * us - 20, Sx + 2 * us + 20, Sy, pegsS, Sx),
         P1.balas_colgando(Mx + 3 * u, My, 4),
         P1.viga(Mx - 3 * u - 20, Mx + 3 * u + 20, My, pegsM, Mx),
         f'<rect x="{Sx-2*us-34}" y="{Sy-46}" width="{4*us+68}" height="152" rx="16" fill="none" stroke="{AZUL}" stroke-width="3" stroke-dasharray="9 7"/>',
         etiqueta(Sx, Sy - 70, "esta viga pesa 1 + 1 + 2 = 4", AZUL, 19),
         flecha(Sx - 70, 372, Sx - 14, 304, ROJO, 4),
         etiqueta(Sx - 92, 392, "en el eje: no la inclina", ROJO, 18),
         etiqueta(Mx + 3 * u - 10, 392, "4 × 3 = 4 × 3", OUT, 19)]
    return lienzo("".join(b), h, "Viga colgante con una bala en su eje: no la inclina, pero cuenta en su peso total")


def fig_globos():
    h = 380
    px, y, u = 400, 180, 60
    pegs = [px + u * k for k in range(-3, 4)]
    gx = px - 2 * u
    b = [suelo_poste(px, y, h),
         P1.globo(gx, y, gx - 30, 70),
         colgar_pesa(px - u, y, 4),
         P1.balas_colgando(px + u, y, 2),
         P1.viga(px - 3 * u - 20, px + 3 * u + 20, y, pegs, px),
         flecha(gx - 120, 130, gx - 120, 62, VERDE, 5), etiqueta(gx - 120, 156, "tira 1 hacia arriba", VERDE, 17),
         etiqueta(px - u - 110, 322, "4 × 1 − 1 × 2 = 2"), etiqueta(px + u + 90, 322, "2 × 1 = 2")]
    return lienzo("".join(b), h, "Globo que tira hacia arriba: resta en su lado de la balanza")


def fig_plano():
    h = 400
    u = 30
    A = (60, h - 40); B = (60 + 8 * u, h - 40); C = (60 + 8 * u, h - 40 - 6 * u)
    d = (0.8, -0.6); nup = (-0.6, -0.8); ndn = (0.6, 0.8)
    h_att, R = 30, 16
    xdesc = C[0] + 36
    t = (xdesc - R - (A[0] + h_att * nup[0] + R * ndn[0])) / d[0]
    PC = (A[0] + h_att * nup[0] + t * d[0] + R * ndn[0], A[1] + h_att * nup[1] + t * d[1] + R * ndn[1])
    T1 = (PC[0] - R * ndn[0], PC[1] - R * ndn[1])
    s_c = 120
    P0 = (A[0] + s_c * d[0], A[1] + s_c * d[1])
    ang = math.degrees(math.atan2(-0.6, 0.8))
    carro = (f'<rect x="-34" y="-26" width="68" height="16" rx="4" fill="#c98a4b" stroke="{OUT}" stroke-width="3"/>'
             f'<circle cx="-20" cy="-8" r="8" fill="#5b5f6b" stroke="{OUT}" stroke-width="3"/><circle cx="20" cy="-8" r="8" fill="#5b5f6b" stroke="{OUT}" stroke-width="3"/>'
             + pesa(0, -26 - 58, 10, anilla=False).replace(f'<path d="M-18,{-26-58+12}', f'<path d="M-18,{-26-58+12}'))
    att = (P0[0] + 38 * d[0] + h_att * nup[0], P0[1] + 38 * d[1] + h_att * nup[1])
    DIM = f'stroke="{OUT}" stroke-width="2.4" fill="none" stroke-linecap="round"'
    q1 = (A[0] + 50 * d[0] + 20 * ndn[0], A[1] + 50 * d[1] + 20 * ndn[1])
    q2 = (A[0] + 270 * d[0] + 20 * ndn[0], A[1] + 270 * d[1] + 20 * ndn[1])
    tm = (A[0] + 160 * d[0] + 46 * ndn[0], A[1] + 160 * d[1] + 46 * ndn[1])
    b = [f'<path d="M{A[0]},{A[1]} L{B[0]},{B[1]} L{C[0]},{C[1]} Z" fill="#cfd5dc" stroke="{OUT}" stroke-width="3.5" stroke-linejoin="round"/>',
         f'<g {DIM}><line x1="{q1[0]:.1f}" y1="{q1[1]:.1f}" x2="{q2[0]:.1f}" y2="{q2[1]:.1f}"/>' + arrow_head(q1[0], q1[1], -0.8, 0.6, 9) + arrow_head(q2[0], q2[1], 0.8, -0.6, 9) + '</g>',
         text(tm[0], tm[1], "10", 26, rot=ang),
         f'<g {DIM}><line x1="{B[0]-16}" y1="{C[1]+34}" x2="{B[0]-16}" y2="{B[1]-8}"/>' + arrow_head(B[0] - 16, C[1] + 34, 0, -1, 9) + arrow_head(B[0] - 16, B[1] - 8, 0, 1, 9) + '</g>',
         text(B[0] - 30, B[1] - 60, "6", 26, anchor="end"),
         f'<path d="M{C[0]-6},{C[1]+4} L{PC[0]:.1f},{PC[1]:.1f}" stroke="{OUT}" stroke-width="11" stroke-linecap="round"/>'
         f'<path d="M{C[0]-6},{C[1]+4} L{PC[0]:.1f},{PC[1]:.1f}" stroke="#c08a4c" stroke-width="6" stroke-linecap="round"/>',
         f'<g transform="translate({P0[0]:.1f},{P0[1]:.1f}) rotate({ang:.3f})">{carro}</g>',
         f'<path d="M{att[0]:.1f},{att[1]:.1f} L{T1[0]:.1f},{T1[1]:.1f} A{R},{R} 0 0 1 {PC[0]+R:.1f},{PC[1]:.1f} L{PC[0]+R:.1f},{PC[1]+70:.1f}" fill="none" stroke="{ROPE}" stroke-width="3" stroke-linecap="round"/>',
         P1.polea(PC[0], PC[1], R),
         pesa(PC[0] + R, PC[1] + 70, 6),
         flecha(att[0] + 30 * d[0] - 6, att[1] + 30 * d[1] - 16, att[0] + 110 * d[0] - 6, att[1] + 110 * d[1] - 16, VERDE, 5),
         etiqueta(560, 120, "la vagoneta tira con", OUT, 19),
         etiqueta(560, 160, "10 × 6 ÷ 10 = 6", ROJO, 22),
         etiqueta(560, 222, "peso × altura ÷ cuesta", AZUL, 19)]
    return lienzo("".join(b), h, "Plano inclinado de 10 de cuesta y 6 de altura: una vagoneta de 10 tira con 6")


def fig_polea_fija():
    h = 380
    cx, cy, R = 380, 120, 34
    b = [f'<rect x="250" y="26" width="260" height="20" rx="4" fill="#9c6644" stroke="{OUT}" stroke-width="3"/>',
         f'<line x1="{cx}" y1="46" x2="{cx}" y2="{cy}" stroke="{OUT}" stroke-width="6"/>',
         cuerda(cx - R, cy, cx - R, 236), cuerda(cx + R, cy, cx + R, 196),
         f'<path d="M{cx-R},{cy} A{R},{R} 0 0 1 {cx+R},{cy}" fill="none" stroke="{ROPE}" stroke-width="3.5"/>',
         P1.polea(cx, cy, R), pesa(cx - R, 236, 3), pesa(cx + R, 196, 3),
         etiqueta(cx - 190, 260, "la cuerda tira igual", OUT, 19), etiqueta(cx - 190, 296, "a los dos lados: 3 = 3", OUT, 19),
         flecha(cx + 110, 140, cx + 110, 60, VERDE, 5), etiqueta(cx + 200, 170, "el soporte aguanta", VERDE, 18),
         etiqueta(cx + 200, 206, "3 + 3 = 6", VERDE, 21)]
    return lienzo("".join(b), h, "Polea fija: la cuerda tira igual a los dos lados y el soporte aguanta los dos")


def fig_polea_movil():
    h = 420
    # --- polea móvil (izquierda)
    cx, cy, R = 190, 236, 30
    b = [f'<rect x="60" y="26" width="260" height="20" rx="4" fill="#9c6644" stroke="{OUT}" stroke-width="3"/>',
         cuerda(cx - R, 46, cx - R, cy), cuerda(cx + R, 46, cx + R, cy),
         f'<path d="M{cx-R},{cy} A{R},{R} 0 0 0 {cx+R},{cy}" fill="none" stroke="{ROPE}" stroke-width="3.5"/>',
         f'<path d="M{cx-12},{cy} L{cx},{cy+R+14} L{cx+12},{cy}" fill="none" stroke="{OUT}" stroke-width="4" stroke-linejoin="round"/>',
         P1.polea(cx, cy, R), pesa(cx, cy + R + 16, 8),
         etiqueta(cx - R - 34, 120, "4", VERDE, 22), etiqueta(cx + R + 34, 120, "4", VERDE, 22),
         etiqueta(cx, 358, "2 tramos: 8 ÷ 2 = 4", OUT, 19)]
    # --- polipasto de 4 tramos (derecha)
    rr = 14
    free_x = 420
    UY, LY = 110, 220
    U2 = free_x + rr; L2 = free_x + 3 * rr; U1 = free_x + 5 * rr; L1 = free_x + 7 * rr; hook = free_x + 8 * rr
    rope = (f'M{hook},{UY-14} L{hook},{LY} A{rr},{rr} 0 0 1 {L1-rr},{LY} L{L1-rr},{UY} A{rr},{rr} 0 0 0 {U1-rr},{UY} '
            f'L{U1-rr},{LY} A{rr},{rr} 0 0 1 {L2-rr},{LY} L{L2-rr},{UY} A{rr},{rr} 0 0 0 {free_x},{UY} L{free_x},{300}')
    b += [f'<rect x="{free_x-30}" y="26" width="{hook-free_x+80}" height="20" rx="4" fill="#9c6644" stroke="{OUT}" stroke-width="3"/>',
          f'<line x1="{(U2+hook)/2}" y1="46" x2="{(U2+hook)/2}" y2="{UY-26}" stroke="{OUT}" stroke-width="5"/>',
          f'<rect x="{U2-rr-6}" y="{UY-28}" width="{hook-U2+rr+12}" height="16" rx="5" fill="#6c757d" stroke="{OUT}" stroke-width="3"/>',
          f'<rect x="{L2-rr-6}" y="{LY+6}" width="{L1-L2+2*rr+12}" height="16" rx="5" fill="#6c757d" stroke="{OUT}" stroke-width="3"/>',
          f'<path d="{rope}" fill="none" stroke="{ROPE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>']
    for (px_, py_) in ((U1, UY), (U2, UY), (L1, LY), (L2, LY)):
        b.append(P1.polea(px_, py_, rr))
    lx = (L1 + L2) / 2
    b += [cuerda(lx, LY + 22, lx, LY + 34), pesa(lx, LY + 34, 8),
          etiqueta(650, 150, "4 tramos sujetan", OUT, 18), etiqueta(650, 184, "el bloque de abajo", OUT, 18),
          etiqueta(free_x - 6, 324, "8 ÷ 4 = 2", ROJO, 21)]
    return lienzo("".join(b), h, "Polea móvil: cada tramo aguanta la mitad. Polipasto de 4 tramos: un cuarto")


def fig_torno():
    h = 380
    cx, cy, r1, r3 = 250, 150, 30, 90
    b = [f'<rect x="{cx-26}" y="{cy-26}" width="52" height="52" rx="8" fill="#7b8794" stroke="{OUT}" stroke-width="3"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{r3}" fill="#ffcf4d" stroke="{OUT}" stroke-width="3.5"/>']
    for a in (30, 150, 210, 330):
        b.append(f'<line x1="{cx}" y1="{cy}" x2="{cx + (r3-10)*math.cos(math.radians(a)):.1f}" y2="{cy + (r3-10)*math.sin(math.radians(a)):.1f}" stroke="{OUT}" stroke-width="6" stroke-linecap="round"/>')
    b += [f'<circle cx="{cx}" cy="{cy}" r="{r1}" fill="#e2483d" stroke="{OUT}" stroke-width="3.5"/>',
          f'<line x1="{cx}" y1="{cy}" x2="{cx}" y2="{cy-r3}" stroke="{OUT}" stroke-width="7" stroke-linecap="round"/>'
          f'<line x1="{cx}" y1="{cy}" x2="{cx}" y2="{cy-r3}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>']
    b += [f'<circle cx="{cx}" cy="{cy - r1*k}" r="4.2" fill="{OUT}"/>' for k in (1, 2, 3)]
    b += [f'<circle cx="{cx}" cy="{cy}" r="8.5" fill="#fff" stroke="{OUT}" stroke-width="3"/><circle cx="{cx}" cy="{cy}" r="3" fill="{OUT}"/>',
          f'<path d="M{cx},{cy-r1} A{r1},{r1} 0 0 0 {cx-r1},{cy} L{cx-r1},{cy+120}" fill="none" stroke="{ROPE}" stroke-width="3.5"/>',
          f'<path d="M{cx+r3},{cy} L{cx+r3},{cy+100}" fill="none" stroke="{ROPE}" stroke-width="3.5"/>',
          pesa(cx - r1, cy + 120, 6), pesa(cx + r3, cy + 100, 2),
          etiqueta(cx - 140, cy - 62, "radio 1", ROJO, 18), etiqueta(cx + 96, cy - 104, "radio 3", AZUL, 18),
          etiqueta(560, 150, "peso × radio igual", OUT, 19), etiqueta(560, 190, "a los dos lados:", OUT, 19),
          etiqueta(560, 236, "6 × 1 = 2 × 3", ROJO, 23)]
    return lienzo("".join(b), h, "Torno de radios 1 y 3: 6 en el eje se sujeta con 2 en la rueda")


def fig_engranajes():
    h = 380
    U = 30
    A_c, rA = (170, 150), 2 * U
    B_c, rB = (170 + 5 * U, 150), 3 * U

    def gear(c, r, teeth, col, phase):
        pts = []
        for k in range(teeth):
            a0 = 2 * math.pi * k / teeth + phase
            da = 2 * math.pi / teeth
            for (fa, rr) in ((0.0, r - 7), (0.18, r - 7), (0.28, r + 7), (0.52, r + 7), (0.62, r - 7), (1.0, r - 7)):
                a = a0 + fa * da
                pts.append(f"{c[0] + rr*math.cos(a):.1f},{c[1] + rr*math.sin(a):.1f}")
        return f'<polygon points="{" ".join(pts)}" fill="{col}" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>'

    b = [gear(B_c, rB, 18, "#5fb7ff", math.pi / 18), gear(A_c, rA, 12, "#ffd23f", 0.0)]
    for (c, r) in ((A_c, rA), (B_c, rB)):
        b.append(f'<circle cx="{c[0]}" cy="{c[1]}" r="{r}" fill="none" stroke="{OUT}" stroke-width="2" stroke-dasharray="5 6" opacity=".55"/>')
        b.append(f'<circle cx="{c[0]}" cy="{c[1]}" r="{U}" fill="#e63946" stroke="{OUT}" stroke-width="3"/>')
        b.append(f'<line x1="{c[0]}" y1="{c[1]}" x2="{c[0]}" y2="{c[1]-r}" stroke="{OUT}" stroke-width="7" stroke-linecap="round"/>'
                 f'<line x1="{c[0]}" y1="{c[1]}" x2="{c[0]}" y2="{c[1]-r}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>')
        b += [f'<circle cx="{c[0]}" cy="{c[1]-U*k}" r="4.2" fill="{OUT}"/>' for k in range(1, r // U + 1)]
        b.append(f'<circle cx="{c[0]}" cy="{c[1]}" r="8.5" fill="#fff" stroke="{OUT}" stroke-width="3"/><circle cx="{c[0]}" cy="{c[1]}" r="3" fill="{OUT}"/>')
    b += [f'<path d="M{A_c[0]},{A_c[1]-U} A{U},{U} 0 0 0 {A_c[0]-U},{A_c[1]} L{A_c[0]-U},{A_c[1]+120}" fill="none" stroke="{ROPE}" stroke-width="3.5"/>',
          f'<path d="M{B_c[0]},{B_c[1]-U} A{U},{U} 0 0 0 {B_c[0]-U},{B_c[1]} L{B_c[0]-U},{B_c[1]+120}" fill="none" stroke="{ROPE}" stroke-width="3.5"/>',
          pesa(A_c[0] - U, A_c[1] + 120, 4), pesa(B_c[0] - U, B_c[1] + 120, 6),
          etiqueta(590, 100, "amarillo: 4 × 1 = F × 2", OUT, 18), etiqueta(590, 136, "F = 2 en los dientes", ROJO, 18),
          etiqueta(590, 190, "azul: 2 × 3 = 6 × 1", OUT, 18), etiqueta(590, 226, "su tambor aguanta 6", AZUL, 18)]
    return lienzo("".join(b), h, "Engranajes: la fuerza en los dientes es la misma; cada rueda la multiplica por su radio")


def fig_acodada():
    h = 380
    px, py, u = 380, 120, 60
    grid = "".join(f'<line x1="{px + u*k}" y1="40" x2="{px + u*k}" y2="{h-40}" stroke="#a9cfe0" stroke-width="2" stroke-dasharray="6 6"/>' for k in range(-5, 6))
    xL, yL, xR, yR = px - 2 * u, py + 90, px + 3 * u, py + 60
    arm = f'M{xL},{yL} L{px},{py} L{xR},{yR}'
    b = [grid,
         colgar_pesa(xL, yL, 3), colgar_pesa(xR, yR, 2),
         f'<path d="{arm}" fill="none" stroke="{OUT}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>'
         f'<path d="{arm}" fill="none" stroke="#f0832a" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>',
         f'<circle cx="{px}" cy="{py}" r="8.5" fill="#fff" stroke="{OUT}" stroke-width="3"/><circle cx="{px}" cy="{py}" r="3" fill="{OUT}"/>',
         f'<circle cx="{xL}" cy="{yL}" r="3.6" fill="{OUT}"/><circle cx="{xR}" cy="{yR}" r="3.6" fill="{OUT}"/>',
         cota(px, xL, 300, "2"), cota(px, xR, 300, "3"),
         etiqueta(px, 62, "solo cuenta la distancia horizontal: 3 × 2 = 2 × 3", OUT, 18)]
    return lienzo("".join(b), h, "Palanca acodada: las distancias se miden en horizontal")


def fig_dinamometro():
    h = 380
    hx, hy, u = 70, 220, 80
    xd = hx + 4 * u
    pegs = [hx + u * k for k in range(0, 5)]
    b = [f'<rect x="10" y="40" width="40" height="{h-80}" fill="#bcc6d3" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{xd-120}" y="26" width="240" height="20" rx="4" fill="#9c6644" stroke="{OUT}" stroke-width="3"/>',
         colgar_pesa(hx + 2 * u, hy, 6),
         P1.viga(hx - 8, xd + 18, hy, pegs[1:], None),
         f'<circle cx="{hx}" cy="{hy}" r="13" fill="#ffd166" stroke="{OUT}" stroke-width="3"/><circle cx="{hx}" cy="{hy}" r="4" fill="{OUT}"/>',
         f'<line x1="{xd}" y1="46" x2="{xd}" y2="80" stroke="{OUT}" stroke-width="4"/>',
         f'<rect x="{xd-30}" y="80" width="60" height="100" rx="14" fill="#ffd166" stroke="{OUT}" stroke-width="3.5"/>',
         f'<rect x="{xd-20}" y="90" width="40" height="60" rx="6" fill="#fffaf0" stroke="{OUT}" stroke-width="2.5"/>',
         text(xd, 121, "3", 34, 900, col=ROJO),
         f'<line x1="{xd}" y1="180" x2="{xd}" y2="{hy-6}" stroke="{OUT}" stroke-width="4"/>',
         cota(hx, hx + 2 * u, 196, "2"), cota(hx, xd, 150, "4"),
         etiqueta(600, 150, "gira en la bisagra:", OUT, 19), etiqueta(600, 190, "6 × 2 = 3 × 4", ROJO, 23),
         etiqueta(600, 236, "el dinamómetro marca 3", AZUL, 18)]
    return lienzo("".join(b), h, "Palanca con bisagra sostenida por un dinamómetro que marca 3")


def fig_trapecio():
    h = 380
    xl, xr, y = 180, 580, 230
    u = (xr - xl) / 4
    pegs = [xl + u * k for k in range(0, 5)]
    b = [f'<rect x="{xl-60}" y="26" width="120" height="20" rx="4" fill="#9c6644" stroke="{OUT}" stroke-width="3"/>',
         f'<rect x="{xr-60}" y="26" width="120" height="20" rx="4" fill="#9c6644" stroke="{OUT}" stroke-width="3"/>',
         cuerda(xl, 46, xl, y, 3.5), cuerda(xr, 46, xr, y, 3.5),
         colgar_pesa(xl + u, y, 8),
         f'<rect x="{xl-14}" y="{y-8}" width="{xr-xl+28}" height="16" rx="8" fill="#3b9be0" stroke="{OUT}" stroke-width="3"/>'
         + "".join(f'<circle cx="{px_:.1f}" cy="{y}" r="3.6" fill="{OUT}"/>' for px_ in pegs),
         flecha(xl - 40, 200, xl - 40, 120, VERDE, 5), etiqueta(xl - 40, 226, "6", VERDE, 24),
         flecha(xr + 40, 200, xr + 40, 120, VERDE, 5), etiqueta(xr + 40, 226, "2", VERDE, 24),
         cota(xl, xl + u, 196, "1"), cota(xl + u, xr, 196, "3"),
         etiqueta(380, 324, "8 × 3/4 = 6   ·   8 × 1/4 = 2", ROJO, 19)]
    return lienzo("".join(b), h, "Barra colgada de dos cuerdas: el peso se reparte según la distancia")


def fig_compartida():
    h = 380
    R = 30
    pcx, pcy = 380, 100
    u = 45
    xA, xB = pcx - R, pcx + R
    b = [f'<rect x="{pcx-60}" y="26" width="120" height="20" rx="4" fill="#9c6644" stroke="{OUT}" stroke-width="3"/>',
         f'<line x1="{pcx}" y1="46" x2="{pcx}" y2="{pcy}" stroke="{OUT}" stroke-width="6"/>']
    # viga izquierda: su extremo derecho en xA ; viga derecha: su extremo izquierdo en xB
    yl, yr = 240, 210
    lp = xA - 3 * u
    rp = xB + 3 * u
    b += [suelo_poste(lp, yl, h), suelo_poste(rp, yr, h),
          cuerda(xA, pcy, xA, yl), cuerda(xB, pcy, xB, yr),
          f'<path d="M{xA},{pcy} A{R},{R} 0 0 1 {xB},{pcy}" fill="none" stroke="{ROPE}" stroke-width="3.5"/>',
          P1.polea(pcx, pcy, R),
          P1.balas_colgando(lp - 3 * u, yl, 2),
          P1.balas_colgando(rp + 2 * u, yr, 3),
          P1.viga(lp - 3 * u - 16, xA + 16, yl, [lp + u * k for k in range(-3, 4)], lp),
          P1.viga(xB - 16, rp + 3 * u + 16, yr, [rp + u * k for k in range(-3, 4)], rp),
          flecha(xA - 22, 200, xA - 22, 150, VERDE, 4), etiqueta(xA - 52, 176, "T", VERDE, 22),
          flecha(xB + 22, 180, xB + 22, 130, VERDE, 4), etiqueta(xB + 52, 156, "T", VERDE, 22),
          etiqueta(380, 361, "la misma fuerza T tira de las dos vigas", OUT, 17)]
    return lienzo("".join(b), h, "Dos vigas unidas por la misma cuerda: tira igual de las dos")


# ---------------------------------------------------------------- contenido
SECCIONES = [
    dict(id="palanca", titulo="La palanca: peso por distancia", fig=fig_palanca,
         texto=["Cada viga gira sobre su eje (el círculo blanco). Un objeto la hace girar más cuanto más pesa y cuanto más lejos del eje está: lo que cuenta es <b>peso × distancia</b>.",
                "La distancia se mide en puntos: todos los puntos de una viga están igual de separados. Está en equilibrio cuando la suma de un lado es igual a la del otro."],
         regla="Izquierda: suma de peso × distancia = Derecha: suma de peso × distancia"),
    dict(id="colgantes", titulo="Objetos en el eje y vigas colgantes", fig=fig_colgantes,
         texto=["Lo que cuelga <b>justo del eje</b> está a distancia 0: no inclina esa viga hacia ningún lado.",
                "Pero cuando una viga cuelga de otra, la de arriba nota <b>todo su peso</b>, también lo que cuelga de su eje. Por eso se resuelven de abajo arriba: primero el equilibrio de la viga colgante y luego su peso total como un objeto más."],
         regla="Una viga colgante pesa la suma de todo lo que lleva (sumando también lo del eje)"),
    dict(id="globos", titulo="Globos y boyas: pesos que tiran hacia arriba", fig=fig_globos,
         texto=["Un globo de helio (o una boya bajo el agua) tira <b>hacia arriba</b>: cuenta como un peso negativo en su lado.",
                "Otra forma de verlo: un tirón hacia arriba en un lado hace lo mismo que un peso en el otro lado, a la misma distancia. Cuando una viga colgante lleva globos, su peso total también resta lo que levantan."],
         regla="Globo = peso negativo · Tirón hacia arriba a un lado = peso al otro lado"),
    dict(id="plano-inclinado", titulo="El plano inclinado", fig=fig_plano,
         texto=["En una rampa sin rozamiento, un objeto con ruedas no tira con todo su peso: tira con <b>peso × altura ÷ longitud de la cuesta</b>. Aquí la cuesta mide 10 y sube 6, así que la vagoneta de 10 tira con 6.",
                "La base de la rampa no hace falta. Si dos objetos están en dos laderas de la misma altura unidos por una cuerda, la ladera más larga aguanta más peso con la misma fuerza."],
         regla="Fuerza en la cuerda = peso × altura ÷ cuesta (la cuerda, paralela a la rampa)"),
    dict(id="polea-fija", titulo="La polea fija", fig=fig_polea_fija,
         texto=["Una polea fija solo <b>cambia la dirección</b> de la cuerda: tira con la misma fuerza a los dos lados. Si de sus dos lados cuelgan cosas y está quieta, los dos lados pesan igual.",
                "Lo que sujeta la polea aguanta los dos tramos: si la polea cuelga de una viga, esa viga nota la suma. Y si un tramo baja hasta el suelo, también tira."],
         regla="Misma fuerza a los dos lados · El soporte aguanta la suma de los dos tramos"),
    dict(id="polea-movil", titulo="La polea móvil y el polipasto", fig=fig_polea_movil,
         texto=["Una polea móvil sube y baja con su carga, que se reparte entre los dos tramos de cuerda: <b>cada tramo aguanta la mitad</b>. Si encadenas dos poleas móviles, un cuarto.",
                "En un polipasto, cuenta cuántos tramos de cuerda sujetan el bloque de abajo: la cuerda tira con el peso dividido entre ese número."],
         regla="Fuerza en la cuerda = peso ÷ número de tramos que sujetan la carga"),
    dict(id="torno", titulo="El torno: una rueda y su eje", fig=fig_torno,
         texto=["La rueda grande y su eje pequeño giran juntos. Lo que cuenta es <b>peso × radio</b>, como en la palanca: una carga en el eje pequeño se sujeta con menos fuerza en la rueda grande.",
                "Los puntos del radio sirven para medirlo: aquí el eje tiene radio 1 y la rueda, radio 3."],
         regla="Peso en el eje × radio del eje = fuerza en la rueda × radio de la rueda"),
    dict(id="engranajes", titulo="Los engranajes", fig=fig_engranajes,
         texto=["Dos engranajes se empujan en sus dientes con <b>la misma fuerza</b>. Cada uno la multiplica por su radio, y su tambor pequeño la convierte en tirón de cuerda.",
                "Se resuelve como dos tornos seguidos: primero el engranaje que lleva el peso, luego el otro."],
         regla="En cada engranaje: peso × radio del tambor = fuerza en los dientes × radio del engranaje"),
    dict(id="palanca-acodada", titulo="Palanca acodada y viga inclinada", fig=fig_acodada,
         texto=["Si la palanca está doblada o torcida, lo que cuenta es la <b>distancia horizontal</b> al eje, no la longitud del brazo. Los azulejos o las tablas de una valla sirven para medirla.",
                "Una viga recta pero inclinada se equilibra igual que si estuviera recta: todas sus distancias horizontales se encogen en la misma proporción."],
         regla="Distancia = separación horizontal entre el eje y la cuerda del objeto"),
    dict(id="dinamometro", titulo="Bisagra y dinamómetro", fig=fig_dinamometro,
         texto=["Una viga sujeta a la pared con una bisagra gira alrededor de ella, y algo la sostiene al otro lado (un dinamómetro, una cadena…). Las distancias se miden desde la bisagra.",
                "El dinamómetro marca la fuerza que hace. La bisagra también hace fuerza, pero está a distancia 0 y no hace falta calcularla."],
         regla="Peso × distancia a la bisagra = lectura del dinamómetro × su distancia"),
    dict(id="trapecio", titulo="Una barra colgada de dos cuerdas", fig=fig_trapecio,
         texto=["Una barra sin eje, colgada de dos cuerdas, reparte cada peso entre ellas: <b>más carga para la cuerda que está más cerca</b>.",
                "Con las cuerdas a 4 puntos, un peso a 1 punto de la izquierda manda 3/4 a la cuerda izquierda y 1/4 a la derecha. Cada cuerda tira de su viga con su parte."],
         regla="Parte de una cuerda = peso × (distancia a la otra cuerda) ÷ (separación entre cuerdas)"),
    dict(id="cuerda-compartida", titulo="Dos vigas con la misma cuerda", fig=fig_compartida,
         texto=["Cuando una sola cuerda une dos vigas pasando por una polea, tira de las dos con <b>la misma fuerza</b>, que no conoces.",
                "No hace falta saberla: escribe la ecuación de cada viga con esa fuerza (por ejemplo T) y combínalas para que desaparezca."],
         regla="Misma T en las dos vigas: plantea las dos ecuaciones y elimina T"),
]

METODO = [
    "Toma un objeto como unidad (el que hay en la caja vale 1) y pon una letra a cada peso desconocido.",
    "Ignora lo que no cuelga de una viga: lo que está en el suelo, lo que vuela o lo que cuelga de algo fijo no cuenta.",
    "Escribe una ecuación por viga: peso × distancia a un lado = peso × distancia al otro.",
    "Sustituye cada mecanismo por la fuerza que hace en su viga (polea móvil, rampa, torno, globo…).",
    "Resuelve el sistema: en estos acertijos casi nunca basta una ecuación sola.",
    "Termina por la viga de la caja, con el peso total de lo que cuelga de ella.",
]

TRAMPAS = [
    "Olvidar lo que cuelga justo del eje de una viga colgante: no la inclina, pero pesa para la de arriba.",
    "Contar el peso entero en una polea móvil, o solo un tramo en una polea fija que cuelga de una viga.",
    "Usar la base de la rampa en vez de la altura, o la mitad del peso en una rampa que no es de 30°.",
    "Sumar un globo como si pesara, en vez de restarlo.",
    "Medir el brazo inclinado de una palanca acodada en vez de la distancia horizontal.",
]

ETIQUETAS = {
    "palanca": "Palanca", "colgantes": "Vigas colgantes", "globos": "Globos", "plano-inclinado": "Plano inclinado",
    "polea-fija": "Polea fija", "polea-movil": "Polea móvil", "torno": "Torno", "engranajes": "Engranajes",
    "palanca-acodada": "Palanca acodada", "dinamometro": "Bisagra y dinamómetro", "trapecio": "Barra con dos cuerdas",
    "cuerda-compartida": "Cuerda compartida",
}

TEO_CSS = """
.indice { display: flex; flex-wrap: wrap; gap: 8px; }
.indice a { text-decoration: none; padding: 5px 12px; border-radius: 999px; border: 2px solid var(--line); background: var(--card); color: var(--ink); font-weight: 700; font-size: .9rem; }
.indice a:hover { border-color: var(--sea); }
section.teo { display: grid; gap: 12px; scroll-margin-top: 16px; }
section.teo h2 { margin: 0; font-family: var(--display); font-weight: 800; font-size: clamp(1.45rem, 4vw, 1.9rem); line-height: 1.1; text-wrap: balance; }
section.teo p { margin: 0; max-width: 70ch; }
.regla { background: var(--rope-soft); border-left: 4px solid var(--rope); border-radius: 8px; padding: 10px 14px; max-width: 70ch; }
.lista { margin: 0; padding-left: 1.3em; display: grid; gap: 6px; max-width: 70ch; }
.lista li::marker { font-family: var(--display); font-weight: 800; color: var(--rope); }
#atras { background: none; border: 0; padding: 0; font: inherit; font-weight: 700; color: var(--sea); cursor: pointer; }
"""


def build(out):
    import json
    import build_page as BP
    url = BP.URL + "teoria/"
    desc = ("Palanca, vigas colgantes, globos, plano inclinado, poleas, polipasto, torno, engranajes y más: "
            "la teoría para resolver los acertijos de balanzas, con dibujos y ejemplos.")
    head = BP.head_web("Cómo se resuelven las balanzas · El problema del día", desc, url,
                       "Cómo se resuelven las balanzas", "Dibujo de una palanca en equilibrio con sus cuentas")
    indice = "".join(f'<a href="#{s["id"]}">{html.escape(ETIQUETAS[s["id"]])}</a>' for s in SECCIONES)
    indice += '<a href="#metodo">El método</a><a href="#trampas">Trampas típicas</a>'
    secciones = []
    for s in SECCIONES:
        parrafos = "".join(f"<p>{t}</p>" for t in s["texto"])
        secciones.append(f'''
  <section class="teo" id="{s["id"]}" aria-labelledby="h-{s["id"]}">
    <h2 id="h-{s["id"]}">{html.escape(s["titulo"])}</h2>
    {parrafos}
    <figure class="lamina">{s["fig"]()}</figure>
    <p class="regla"><b>Regla:</b> {html.escape(s["regla"])}</p>
  </section>''')
    metodo = "".join(f"<li>{html.escape(t)}</li>" for t in METODO)
    trampas = "".join(f"<li>{html.escape(t)}</li>" for t in TRAMPAS)
    page = (head + BP.FONTS + f"\n<style>{BP.CSS}{BP.WEB_EXTRA_CSS}{TEO_CSS}</style>\n</head>\n<body>\n<main class=\"wrap\">\n"
            '  <nav class="volver" aria-label="Volver"><button type="button" id="atras" hidden>← Volver al acertijo</button>'
            '<a href="../../../">El problema del día</a></nav>\n'
            '  <div class="cabecera">\n    <p class="serie">Balanzas imposibles · Teoría</p>\n'
            '    <h1>Cómo se resuelven las balanzas</h1>\n'
            '    <p class="intro">Todo lo que hace falta para resolver los acertijos de balanzas, con dibujos. '
            'Los números de los ejemplos no son los de los acertijos: aquí no hay soluciones.</p>\n  </div>\n'
            f'  <nav class="indice" aria-label="Apartados">{indice}</nav>\n'
            + "".join(secciones) +
            f'''
  <section class="teo" id="metodo" aria-labelledby="h-metodo">
    <h2 id="h-metodo">El método, paso a paso</h2>
    <ol class="lista">{metodo}</ol>
  </section>
  <section class="teo" id="trampas" aria-labelledby="h-trampas">
    <h2 id="h-trampas">Trampas típicas</h2>
    <ul class="lista">{trampas}</ul>
  </section>
  <footer class="pie">Teoría de <a href="../../../">El problema del día</a> para los acertijos de balanzas.</footer>
</main>
<script>
(function () {{
  var b = document.getElementById('atras');
  var r = document.referrer || '';
  if (r.indexOf('/juego/balanzas/') >= 0 && r.indexOf('/teoria/') < 0 && history.length > 1) {{
    b.hidden = false;
    b.addEventListener('click', function () {{ history.back(); }});
  }}
}})();
</script>
</body>
</html>
''')
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(page)
    return out
