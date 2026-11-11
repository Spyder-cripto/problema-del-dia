"""Genera balanza.svg: acertijo de balanzas con tema portuario/pirata."""
import math, sys

W, H = 1400, 900
GROUND = 812
OUT = "#1f1d1b"
ROPE = "#5a4128"
WOOD = "#e3aa60"
WOOD_D = "#b97a38"
IRON = "#3b4047"
FONT = "'Baloo 2', Inter, Arial, sans-serif"

parts = []
def add(s):
    parts.append(s)

def rope(x1, y1, x2, y2, w=3):
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{ROPE}" stroke-width="{w}" stroke-linecap="round"/>'

# ---------- objetos ----------
def bala(cx, cy, r=20):
    return (f'<g><circle cx="{cx}" cy="{cy}" r="{r}" fill="#2c2f34" stroke="{OUT}" stroke-width="3"/>'
            f'<ellipse cx="{cx-r*0.38:.1f}" cy="{cy-r*0.4:.1f}" rx="{r*0.28:.1f}" ry="{r*0.18:.1f}" fill="#fff" opacity=".55" transform="rotate(-35 {cx-r*0.38:.1f} {cy-r*0.4:.1f})"/></g>')

def balas_colgando(x, y, n, gap=22, r=20):
    """cadena vertical de n balas colgando de (x,y)"""
    s = []
    first = y + gap + r
    last = first + (n - 1) * (2 * r + 2)
    s.append(rope(x, y, x, last))
    for i in range(n):
        s.append(bala(x, first + i * (2 * r + 2), r))
    return "".join(s)

def barril(cx, top, w=46, h=58, ring=False):
    """barril de pie con la tapa en `top`"""
    hw = w / 2
    bot = top + h
    s = []
    if ring:
        s.append(f'<path d="M{cx-9},{top+2} Q{cx},{top-14} {cx+9},{top+2}" fill="none" stroke="{OUT}" stroke-width="3"/>')
    body = (f'M{cx-hw+3},{top+5} Q{cx-hw-5},{top+h/2} {cx-hw+3},{bot-4} '
            f'Q{cx},{bot+5} {cx+hw-3},{bot-4} Q{cx+hw+5},{top+h/2} {cx+hw-3},{top+5} Z')
    s.append(f'<path d="{body}" fill="#c9843f" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
    # duelas
    for dx in (-hw * 0.45, 0, hw * 0.45):
        s.append(f'<path d="M{cx+dx:.1f},{top+6} Q{cx+dx*1.18:.1f},{top+h/2} {cx+dx:.1f},{bot-3}" fill="none" stroke="#8a5424" stroke-width="1.6"/>')
    # aros
    for fy in (0.24, 0.76):
        yy = top + h * fy
        s.append(f'<path d="M{cx-hw-1:.1f},{yy:.1f} Q{cx},{yy+6:.1f} {cx+hw+1:.1f},{yy:.1f}" fill="none" stroke="{OUT}" stroke-width="5"/>')
        s.append(f'<path d="M{cx-hw-1:.1f},{yy:.1f} Q{cx},{yy+6:.1f} {cx+hw+1:.1f},{yy:.1f}" fill="none" stroke="#7d8790" stroke-width="2.4"/>')
    s.append(f'<ellipse cx="{cx}" cy="{top+5}" rx="{hw-3}" ry="5.5" fill="#e0a05e" stroke="{OUT}" stroke-width="3"/>')
    return "".join(s)

def ancla(cx, top, k=1.0):
    """ancla colgando de la anilla en (cx, top)"""
    def P(x, y):
        return f'{cx + x * k:.1f},{top + y * k:.1f}'
    s = []
    arms = f'M{P(-27,42)} Q{P(-24,66)} {P(0,68)} Q{P(24,66)} {P(27,42)}'
    for col, wdt in ((OUT, 13), ("#5d6873", 7.5)):
        s.append(f'<path d="{arms}" fill="none" stroke="{col}" stroke-width="{wdt*k:.1f}" stroke-linecap="round"/>')
    # uñas
    for sgn in (-1, 1):
        s.append(f'<path d="M{P(sgn*20,40)} L{P(sgn*33,32)} L{P(sgn*32,50)} Z" fill="#5d6873" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
    # caña
    s.append(f'<rect x="{cx-5*k:.1f}" y="{top+11*k:.1f}" width="{10*k:.1f}" height="{56*k:.1f}" rx="4" fill="#5d6873" stroke="{OUT}" stroke-width="3"/>')
    # cepo
    s.append(f'<rect x="{cx-19*k:.1f}" y="{top+19*k:.1f}" width="{38*k:.1f}" height="{8*k:.1f}" rx="4" fill="#5d6873" stroke="{OUT}" stroke-width="3"/>')
    # arganeo
    s.append(f'<circle cx="{cx}" cy="{top+6*k:.1f}" r="{6.5*k:.1f}" fill="none" stroke="{OUT}" stroke-width="{6*k:.1f}"/>')
    s.append(f'<circle cx="{cx}" cy="{top+6*k:.1f}" r="{6.5*k:.1f}" fill="none" stroke="#5d6873" stroke-width="{2.5*k:.1f}"/>')
    return "".join(s)

def canon_local(hook=False, flip=False):
    """cañón sobre cureña; origen = punto medio inferior (ruedas), mirando a la derecha"""
    s = []
    # cureña
    s.append(f'<path d="M-40,-13 L38,-13 L38,-26 L16,-26 L16,-36 L-30,-36 L-40,-26 Z" fill="#a8652c" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
    s.append(f'<line x1="-38" y1="-20" x2="36" y2="-20" stroke="#7b4519" stroke-width="1.6"/>')
    # tubo
    s.append(f'<path d="M-38,-58 Q-50,-47 -38,-37 L46,-43 L46,-55 Z" fill="{IRON}" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
    s.append(f'<circle cx="-47" cy="-47" r="5.5" fill="{IRON}" stroke="{OUT}" stroke-width="3"/>')
    s.append(f'<rect x="42" y="-58" width="10" height="18" rx="3" fill="{IRON}" stroke="{OUT}" stroke-width="3"/>')
    s.append(f'<line x1="-14" y1="-56" x2="-14" y2="-39" stroke="#62686f" stroke-width="2.5"/>')
    s.append(f'<line x1="14" y1="-54" x2="14" y2="-41" stroke="#62686f" stroke-width="2.5"/>')
    s.append(f'<ellipse cx="-20" cy="-53" rx="10" ry="2.2" fill="#fff" opacity=".35"/>')
    # ruedas
    for wx in (-24, 22):
        s.append(f'<circle cx="{wx}" cy="-13" r="13" fill="#6e4220" stroke="{OUT}" stroke-width="3"/>')
        s.append(f'<circle cx="{wx}" cy="-13" r="4.5" fill="#c79a5a" stroke="{OUT}" stroke-width="2"/>')
    if hook:
        s.append(f'<circle cx="0" cy="-64" r="6" fill="none" stroke="{OUT}" stroke-width="3.5"/>')
        s.append(f'<line x1="0" y1="-58" x2="0" y2="-53" stroke="{OUT}" stroke-width="3.5"/>')
    g = "".join(s)
    if flip:
        g = f'<g transform="scale(-1,1)">{g}</g>'
    return g

def canon(x, y, rot=0, hook=False, flip=False):
    return f'<g transform="translate({x:.1f},{y:.1f}) rotate({rot:.3f})">{canon_local(hook, flip)}</g>'

def globo(tx, ty, bx, by, col="#f3c53f"):
    """globo de helio atado en (tx,ty), centro del globo en (bx,by)"""
    rx, ry = 25, 30
    knot_y = by + ry
    mx = (tx + bx) / 2 + 12
    s = [f'<path d="M{tx},{ty} Q{mx:.1f},{(ty+knot_y)/2:.1f} {bx},{knot_y+5}" fill="none" stroke="{OUT}" stroke-width="2"/>',
         f'<path d="M{bx-5},{knot_y+7} L{bx},{knot_y-1} L{bx+5},{knot_y+7} Z" fill="{col}" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>',
         f'<ellipse cx="{bx}" cy="{by}" rx="{rx}" ry="{ry}" fill="{col}" stroke="{OUT}" stroke-width="3"/>',
         f'<ellipse cx="{bx-10}" cy="{by-13}" rx="6" ry="9" fill="#fff" opacity=".55" transform="rotate(25 {bx-10} {by-13})"/>',
         f'<text x="{bx}" y="{by+8}" text-anchor="middle" font-family="{FONT}" font-weight="800" font-size="21" fill="{OUT}">He</text>']
    return "".join(s)

def cofre(x, hang_y):
    """cofre con ? colgado de (x, hang_y)"""
    w, h = 90, 66
    apex = hang_y + 26
    top = apex + 22
    l, r_ = x - w / 2, x + w / 2
    s = [rope(x, hang_y, x, apex),
         rope(x, apex, l + 8, top + 6, 2.6), rope(x, apex, r_ - 8, top + 6, 2.6),
         f'<circle cx="{x}" cy="{apex}" r="4" fill="{OUT}"/>']
    # cuerpo
    s.append(f'<rect x="{l}" y="{top+18}" width="{w}" height="{h-18}" rx="4" fill="#9a5a26" stroke="{OUT}" stroke-width="3"/>')
    # tapa abombada
    s.append(f'<path d="M{l},{top+20} L{l},{top+10} Q{x},{top-14} {r_},{top+10} L{r_},{top+20} Z" fill="#b06a2e" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
    # herrajes
    for fx in (l + 12, r_ - 12):
        s.append(f'<rect x="{fx-5}" y="{top+1}" width="10" height="{h-1}" fill="#e2b53e" stroke="{OUT}" stroke-width="2.5"/>')
    s.append(f'<rect x="{x-9}" y="{top+12}" width="18" height="16" rx="3" fill="#e2b53e" stroke="{OUT}" stroke-width="2.5"/>')
    s.append(f'<circle cx="{x}" cy="{top+19}" r="2.6" fill="{OUT}"/>')
    s.append(f'<text x="{x}" y="{top+h-4}" text-anchor="middle" font-family="{FONT}" font-weight="900" font-size="34" fill="#ffe08a" stroke="{OUT}" stroke-width="2.2" paint-order="stroke">?</text>')
    return "".join(s)

def loro(x, base):
    """loro posado en (x, base) mirando a la derecha"""
    s = []
    # cola
    s.append(f'<path d="M{x-6},{base-14} L{x-34},{base+40} L{x-22},{base+44} L{x+2},{base-6} Z" fill="#2f7fd8" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
    s.append(f'<path d="M{x-4},{base-12} L{x-18},{base+46} L{x-8},{base+46} L{x+4},{base-6} Z" fill="#f2c230" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
    # cuerpo
    s.append(f'<ellipse cx="{x}" cy="{base-27}" rx="16" ry="23" fill="#e2392b" stroke="{OUT}" stroke-width="3"/>')
    # ala
    s.append(f'<path d="M{x-14},{base-36} Q{x-2},{base-40} {x+4},{base-26} Q{x+2},{base-6} {x-14},{base-4} Q{x-20},{base-20} {x-14},{base-36} Z" fill="#33a55a" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
    s.append(f'<path d="M{x-12},{base-14} L{x-2},{base-16} M{x-13},{base-22} L{x+1},{base-24}" stroke="#2f7fd8" stroke-width="3"/>')
    # cabeza
    s.append(f'<circle cx="{x+5}" cy="{base-54}" r="14" fill="#e2392b" stroke="{OUT}" stroke-width="3"/>')
    s.append(f'<ellipse cx="{x+10}" cy="{base-55}" rx="7" ry="6" fill="#fff" stroke="{OUT}" stroke-width="2"/>')
    s.append(f'<circle cx="{x+11}" cy="{base-55}" r="2.6" fill="{OUT}"/>')
    # pico
    s.append(f'<path d="M{x+16},{base-60} Q{x+32},{base-60} {x+27},{base-42} Q{x+24},{base-48} {x+17},{base-47} Z" fill="#f3e2b0" stroke="{OUT}" stroke-width="2.6" stroke-linejoin="round"/>')
    # patas
    s.append(f'<path d="M{x-5},{base-4} l-3,6 M{x-5},{base-4} l3,6 M{x+6},{base-5} l-3,6 M{x+6},{base-5} l3,6" stroke="#7a7f86" stroke-width="3" stroke-linecap="round"/>')
    return "".join(s)

def gaviota(x, y, k=1.0):
    return (f'<path d="M{x-20*k:.1f},{y:.1f} Q{x-10*k:.1f},{y-12*k:.1f} {x:.1f},{y:.1f} Q{x+10*k:.1f},{y-12*k:.1f} {x+20*k:.1f},{y:.1f}" '
            f'fill="none" stroke="{OUT}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')

def nube(x, y, k=1.0):
    return (f'<g transform="translate({x},{y}) scale({k})" fill="#fff" stroke="#cfe3ee" stroke-width="2">'
            f'<ellipse cx="0" cy="0" rx="46" ry="20"/><ellipse cx="-22" cy="-10" rx="22" ry="18"/>'
            f'<ellipse cx="14" cy="-16" rx="26" ry="22"/></g>')

def cangrejo(x, y):
    s = [f'<g stroke="{OUT}" stroke-width="3" stroke-linecap="round">']
    for sgn in (-1, 1):
        for i in range(3):
            s.append(f'<line x1="{x+sgn*14}" y1="{y+2+i*4}" x2="{x+sgn*(28+i*2)}" y2="{y+10+i*5}"/>')
        s.append(f'<line x1="{x+sgn*16}" y1="{y-6}" x2="{x+sgn*28}" y2="{y-18}"/>')
        s.append(f'<path d="M{x+sgn*24},{y-20} q{sgn*10},-12 {sgn*16},2 q{-sgn*6},-2 {-sgn*10},4 z" fill="#e4572e"/>')
        s.append(f'<line x1="{x+sgn*6}" y1="{y-10}" x2="{x+sgn*8}" y2="{y-22}"/>')
        s.append(f'<circle cx="{x+sgn*8}" cy="{y-25}" r="4" fill="#fff"/>')
    s.append(f'<ellipse cx="{x}" cy="{y}" rx="22" ry="13" fill="#e4572e"/>')
    s.append('</g>')
    s.append(f'<circle cx="{x-8}" cy="{y-25}" r="1.8" fill="{OUT}"/><circle cx="{x+8}" cy="{y-25}" r="1.8" fill="{OUT}"/>')
    return "".join(s)

def salvavidas(x, y):
    r = 27
    circ = 2 * math.pi * r
    seg = circ / 8
    return (f'<g><line x1="{x}" y1="{y-r-12}" x2="{x}" y2="{y-r+2}" stroke="{ROPE}" stroke-width="3"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{OUT}" stroke-width="18"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="#fff" stroke-width="12"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="#e23b2e" stroke-width="12" stroke-dasharray="{seg:.2f} {seg:.2f}" transform="rotate(22 {x} {y})"/>'
            f'</g>')

def velero(x, y, k=1.0):
    return (f'<g transform="translate({x},{y}) scale({k})" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round">'
            f'<path d="M-30,0 L30,0 L22,10 L-22,10 Z" fill="#8b5a2b"/>'
            f'<line x1="0" y1="0" x2="0" y2="-50"/>'
            f'<path d="M2,-48 L26,-6 L2,-6 Z" fill="#fff"/><path d="M-2,-42 L-22,-6 L-2,-6 Z" fill="#f3efe4"/>'
            f'<path d="M0,-50 L12,-46 L0,-42" fill="#e23b2e"/></g>')

def palmera(x, y):
    s = [f'<path d="M{x-8},{y} Q{x-2},{y-140} {x-26},{y-250} L{x-12},{y-252} Q{x+12},{y-140} {x+10},{y} Z" fill="#a8743f" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>']
    for i in range(7):
        yy = y - 30 - i * 32
        s.append(f'<path d="M{x-6+ (i*-1.6):.1f},{yy} q8,-6 15,-2" fill="none" stroke="#7a4f24" stroke-width="2"/>')
    cx, cy = x - 20, y - 252
    leaves = [(-70, 30), (-60, -20), (-10, -50), (50, -36), (70, 18), (30, 46)]
    for lx, ly in leaves:
        s.append(f'<path d="M{cx},{cy} Q{cx+lx*0.5-ly*0.25:.1f},{cy+ly*0.5-abs(lx)*0.3:.1f} {cx+lx},{cy+ly} Q{cx+lx*0.5+ly*0.1:.1f},{cy+ly*0.5+6:.1f} {cx},{cy} Z" fill="#3fa75a" stroke="{OUT}" stroke-width="3" stroke-linejoin="round"/>')
    s.append(f'<circle cx="{cx-6}" cy="{cy+8}" r="7" fill="#6b4a2a" stroke="{OUT}" stroke-width="2.5"/><circle cx="{cx+7}" cy="{cy+9}" r="7" fill="#6b4a2a" stroke="{OUT}" stroke-width="2.5"/>')
    return "".join(s)

# ---------- vigas ----------
def viga(x1, x2, y, pegs, pivot=None, h=16):
    s = [f'<rect x="{x1}" y="{y-h/2}" width="{x2-x1}" height="{h}" rx="{h/2}" fill="{WOOD}" stroke="{OUT}" stroke-width="3"/>',
         f'<line x1="{x1+10}" y1="{y-2}" x2="{x2-10}" y2="{y-2}" stroke="#f3c88c" stroke-width="2.5" stroke-linecap="round"/>']
    for px in pegs:
        if pivot is not None and abs(px - pivot) < 0.1:
            continue
        s.append(f'<circle cx="{px}" cy="{y}" r="3.6" fill="{OUT}"/>')
    if pivot is not None:
        s.append(f'<circle cx="{pivot}" cy="{y}" r="8.5" fill="#fff" stroke="{OUT}" stroke-width="3"/><circle cx="{pivot}" cy="{y}" r="3" fill="{OUT}"/>')
    return "".join(s)

def poste(x, ytop, ybot, w=18, col="#c08a4c"):
    return (f'<rect x="{x-w/2}" y="{ytop}" width="{w}" height="{ybot-ytop}" fill="{col}" stroke="{OUT}" stroke-width="3"/>'
            f'<line x1="{x-w/2+5}" y1="{ytop+8}" x2="{x-w/2+5}" y2="{ybot-6}" stroke="#dcae74" stroke-width="2"/>')

def polea(cx, cy, R=20):
    return (f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R}" fill="#aab6c2" stroke="{OUT}" stroke-width="3"/>'
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R-6}" fill="none" stroke="#7d8a97" stroke-width="2"/>'
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="4.5" fill="{OUT}"/>')

def build():
    # ---------- fondo ----------
    add(f'<defs><linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="#9fd6f2"/><stop offset="1" stop-color="#dff2fb"/></linearGradient>'
        f'<linearGradient id="mar" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="#3fa3c9"/><stop offset="1" stop-color="#7fcbe0"/></linearGradient></defs>')
    add(f'<rect width="{W}" height="{H}" fill="url(#cielo)"/>')
    add(nube(170, 150, 1.0))
    add(nube(1010, 72, 0.85))
    add(nube(1290, 250, 0.7))
    add(f'<rect x="0" y="600" width="{W}" height="220" fill="url(#mar)"/>')
    add(f'<line x1="0" y1="600" x2="{W}" y2="600" stroke="#2b7fa6" stroke-width="2.5"/>')
    for (wx, wy) in [(90, 640), (420, 660), (640, 628), (820, 770), (1180, 650), (1010, 720), (230, 600 + 70), (1330, 700)]:
        add(f'<path d="M{wx-16},{wy} q8,-7 16,0 q8,-7 16,0" fill="none" stroke="#e6f6fb" stroke-width="2.5" stroke-linecap="round"/>')
    add(velero(470, 598, 0.8))
    # arena
    add(f'<path d="M0,792 Q120,780 260,792 T560,790 T880,794 T1180,788 T1400,792 L1400,{H} L0,{H} Z" fill="#f1d9a0" stroke="#c9a55f" stroke-width="3"/>')
    for (sx, sy) in [(120, 850), (340, 870), (610, 845), (780, 878), (920, 852), (1180, 866), (1300, 845), (460, 880)]:
        add(f'<circle cx="{sx}" cy="{sy}" r="2.2" fill="#c9a55f"/><circle cx="{sx+9}" cy="{sy+5}" r="1.6" fill="#c9a55f"/>')

    add(gaviota(140, 70, 1.0))
    add(gaviota(205, 100, 0.8))
    add(gaviota(1200, 130, 0.9))
    add(palmera(1350, 830))

    # ================= RAMPA (delta) =================
    U = 32
    A = (30, GROUND); B = (30 + 8 * U, GROUND); C = (30 + 8 * U, GROUND - 6 * U)
    d = (0.8, -0.6); nup = (-0.6, -0.8); ndn = (0.6, 0.8)
    h_att = 30; R = 20
    XL = 380  # extremo izq de delta
    t = (XL - R - (A[0] + h_att * nup[0] + R * ndn[0])) / d[0]
    PC = (A[0] + h_att * nup[0] + t * d[0] + R * ndn[0], A[1] + h_att * nup[1] + t * d[1] + R * ndn[1])
    T1 = (PC[0] - R * ndn[0], PC[1] - R * ndn[1])
    ang = math.degrees(math.atan2(-0.6, 0.8))
    add(f'<path d="M{A[0]},{A[1]} L{B[0]},{B[1]} L{C[0]},{C[1]} Z" fill="#cfd5dc" stroke="{OUT}" stroke-width="3.5" stroke-linejoin="round"/>')
    # sillares
    for (x1, y1, x2, y2) in [(150, 770, 286, 770), (210, 725, 286, 725), (240, 680, 286, 680), (200, 812, 200, 770), (250, 770, 250, 725), (120, 812, 120, 790)]:
        add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#aab3bd" stroke-width="2"/>')
    def on(s, off):
        return (A[0] + s * d[0] + off * ndn[0], A[1] + s * d[1] + off * ndn[1])
    def arrow_head(px, py, ux, uy, k=11):
        # punta en (px,py) apuntando en dirección (ux,uy)
        lx, ly = -ux * k - uy * k * 0.55, -uy * k + ux * k * 0.55
        rx, ry = -ux * k + uy * k * 0.55, -uy * k - ux * k * 0.55
        return f'<path d="M{px+lx:.1f},{py+ly:.1f} L{px:.1f},{py:.1f} L{px+rx:.1f},{py+ry:.1f}" fill="none"/>'
    DIM = f'stroke="{OUT}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"'
    # hipotenusa: 10
    q1 = on(48, 24); q2 = on(262, 24)
    add(f'<g {DIM}><line x1="{q1[0]:.1f}" y1="{q1[1]:.1f}" x2="{q2[0]:.1f}" y2="{q2[1]:.1f}"/>'
        + arrow_head(q1[0], q1[1], -d[0], -d[1]) + arrow_head(q2[0], q2[1], d[0], d[1]) + '</g>')
    tm = on(150, 52)
    add(f'<text x="{tm[0]:.1f}" y="{tm[1]:.1f}" transform="rotate({ang:.2f} {tm[0]:.1f} {tm[1]:.1f})" text-anchor="middle" dominant-baseline="middle" font-family="{FONT}" font-weight="800" font-size="28" fill="{OUT}">10</text>')
    # vertical: 6
    vx = B[0] - 16
    add(f'<g {DIM}><line x1="{vx}" y1="{C[1]+44}" x2="{vx}" y2="{B[1]-8}"/>'
        + arrow_head(vx, C[1] + 44, 0, -1) + arrow_head(vx, B[1] - 8, 0, 1) + '</g>')
    add(f'<text x="{vx-12}" y="{B[1]-56}" text-anchor="end" dominant-baseline="middle" font-family="{FONT}" font-weight="800" font-size="28" fill="{OUT}">6</text>')
    # base: 8 (sobre la arena)
    by_ = GROUND + 26
    add(f'<g {DIM}><line x1="{A[0]+4}" y1="{by_}" x2="{B[0]-4}" y2="{by_}"/>'
        + arrow_head(A[0] + 4, by_, -1, 0) + arrow_head(B[0] - 4, by_, 1, 0)
        + f'<line x1="{A[0]}" y1="{GROUND+12}" x2="{A[0]}" y2="{GROUND+38}"/><line x1="{B[0]}" y1="{GROUND+12}" x2="{B[0]}" y2="{GROUND+38}"/></g>')
    add(f'<text x="{(A[0]+B[0])/2}" y="{by_+30}" text-anchor="middle" font-family="{FONT}" font-weight="800" font-size="28" fill="{OUT}">8</text>')

    # brazo que sujeta la polea (fijo a la rampa)
    add(f'<path d="M{C[0]-6},{C[1]+4} L{PC[0]:.1f},{PC[1]:.1f}" stroke="{OUT}" stroke-width="13" stroke-linecap="round"/>')
    add(f'<path d="M{C[0]-6},{C[1]+4} L{PC[0]:.1f},{PC[1]:.1f}" stroke="#c08a4c" stroke-width="7" stroke-linecap="round"/>')

    # cañón sobre la rampa
    s_c = 140
    P0 = (A[0] + s_c * d[0], A[1] + s_c * d[1])
    add(canon(P0[0], P0[1], ang))
    att = (P0[0] + 42 * d[0] + h_att * nup[0], P0[1] + 42 * d[1] + h_att * nup[1])
    # cuerda: cañón -> polea -> baja
    beam_d_y = 690
    canon_d_top = beam_d_y - 8 - 64 + 6
    add(f'<path d="M{att[0]:.1f},{att[1]:.1f} L{T1[0]:.1f},{T1[1]:.1f} A{R},{R} 0 0 1 {PC[0]+R:.1f},{PC[1]:.1f} L{PC[0]+R:.1f},{canon_d_top}" fill="none" stroke="{ROPE}" stroke-width="3" stroke-linecap="round"/>')
    add(f'<circle cx="{att[0]:.1f}" cy="{att[1]:.1f}" r="3.5" fill="{OUT}"/>')
    add(polea(PC[0], PC[1], R))

    # viga delta
    u_d = 50
    piv_d = XL + 4 * u_d
    pegs_d = [XL + k * u_d for k in range(0, 7)]
    add(poste(piv_d, beam_d_y, GROUND + 6))
    add(rope(XL + 6 * u_d, beam_d_y, XL + 6 * u_d, beam_d_y + 18))
    add(ancla(XL + 6 * u_d, beam_d_y + 18, 0.95))
    add(viga(XL - 22, XL + 6 * u_d + 22, beam_d_y, pegs_d, piv_d))
    add(canon(XL, beam_d_y - 8, 0, hook=True))
    # pirámide de balas en el suelo (distractor)
    for (bx, by) in [(462, GROUND - 20), (503, GROUND - 20), (482.5, GROUND - 55)]:
        add(bala(bx, by, 20))

    # ================= MÁSTIL + epsilon =================
    MX = 740; EY = 170; u_e = 80
    add(poste(MX, EY, GROUND + 8, w=20))
    add(salvavidas(MX, 470))
    # brazo fijo para la polea móvil (gamma)
    ARM_Y = 572
    hook_x = 860
    add(f'<path d="M{MX+10},{ARM_Y+58} L{hook_x-36},{ARM_Y+4}" stroke="{OUT}" stroke-width="11" stroke-linecap="round"/>'
        f'<path d="M{MX+10},{ARM_Y+58} L{hook_x-36},{ARM_Y+4}" stroke="#c08a4c" stroke-width="5" stroke-linecap="round"/>')
    add(f'<rect x="{MX+8}" y="{ARM_Y-8}" width="{hook_x-MX+6}" height="14" rx="3" fill="#c08a4c" stroke="{OUT}" stroke-width="3"/>')

    pegs_e = [MX + k * u_e for k in range(-4, 5)]
    EL, ER = MX - 4 * u_e, MX + 4 * u_e

    # ---- alfa (cuelga del extremo izq de epsilon) ----
    AY = 330; u_a = 50
    pegs_a = [EL + k * u_a for k in range(-3, 4)]
    add(rope(EL, EY, EL, AY - 12))
    add(f'<circle cx="{EL}" cy="{AY-14}" r="5" fill="none" stroke="{OUT}" stroke-width="3"/>')
    add(rope(EL - 3 * u_a, AY, EL - 3 * u_a, AY + 20))
    add(barril(EL - 3 * u_a, AY + 20, ring=True))
    add(balas_colgando(EL, AY, 2))
    add(balas_colgando(EL + 2 * u_a, AY, 3))
    add(globo(EL - 1 * u_a, AY, EL - 1 * u_a - 26, AY - 92))
    add(viga(EL - 3 * u_a - 20, EL + 3 * u_a + 20, AY, pegs_a, EL))

    # ---- beta (cuelga del extremo der de epsilon) ----
    BY = 330; u_b = 50
    pegs_b = [ER + k * u_b for k in range(-2, 5)]
    add(rope(ER, EY, ER, BY - 12))
    add(f'<circle cx="{ER}" cy="{BY-14}" r="5" fill="none" stroke="{OUT}" stroke-width="3"/>')
    add(balas_colgando(ER - 2 * u_b, BY, 3))
    add(balas_colgando(ER + 4 * u_b, BY, 1))
    add(globo(ER + 2 * u_b, BY - 8 - 58 + 2, ER + 2 * u_b + 28, BY - 150))
    add(barril(ER + 2 * u_b, BY - 8 - 58))
    add(viga(ER - 2 * u_b - 20, ER + 4 * u_b + 20, BY, pegs_b, ER))

    # ---- objetos en epsilon ----
    add(rope(MX - u_e, EY, MX - u_e, EY + 24))
    add(ancla(MX - u_e, EY + 24, 0.95))
    add(cofre(MX + 2 * u_e, EY))
    add(viga(EL - 22, ER + 22, EY, pegs_e, MX))
    add(canon(MX - 2 * u_e, EY - 8, 0))
    add(loro(MX, EY - 8))

    # ================= gamma (polea móvil) =================
    GY = 620; u_g = 52
    GL = hook_x + 2 * R  # extremo izq gamma
    piv_g = GL + 4 * u_g
    pegs_g = [GL + k * u_g for k in range(0, 8)]
    PMC = (hook_x + R, 708)
    add(poste(piv_g, GY, GROUND + 6))
    add(f'<path d="M{hook_x},{ARM_Y} L{hook_x},{PMC[1]} A{R},{R} 0 0 0 {GL},{PMC[1]} L{GL},{GY}" fill="none" stroke="{ROPE}" stroke-width="3" stroke-linecap="round"/>')
    add(f'<circle cx="{hook_x}" cy="{ARM_Y}" r="4" fill="{OUT}"/>')
    # soporte de la polea móvil + ancla
    add(f'<path d="M{PMC[0]-12},{PMC[1]} L{PMC[0]},{PMC[1]+30} L{PMC[0]+12},{PMC[1]}" fill="none" stroke="{OUT}" stroke-width="4" stroke-linejoin="round"/>')
    add(polea(PMC[0], PMC[1], R))
    add(ancla(PMC[0], PMC[1] + 30, 0.95))
    add(rope(GL + 6 * u_g, GY, GL + 6 * u_g, GY + 18))
    add(barril(GL + 6 * u_g, GY + 18, ring=True))
    add(balas_colgando(GL + 7 * u_g, GY, 1))
    add(viga(GL - 20, GL + 7 * u_g + 20, GY, pegs_g, piv_g))

    add(cangrejo(1040, 846))

    # marco
    add(f'<rect x="3" y="3" width="{W-6}" height="{H-6}" fill="none" stroke="{OUT}" stroke-width="6" rx="4"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'role="img" aria-label="Acertijo de balanzas en un puerto: ¿cuántas balas de cañón hay en el cofre?">'
            + "".join(parts) + '</svg>')

if __name__ == "__main__":
    svg = build()
    out = sys.argv[1] if len(sys.argv) > 1 else "balanza.svg"
    open(out, "w", encoding="utf-8").write(svg)
    print("ok", len(svg))
