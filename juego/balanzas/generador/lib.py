"""Mini-motor para acertijos de balanzas.

Cada viga registra sus cargas (distancia con signo, fuerza simbólica) a la vez
que se dibuja, así que las ecuaciones salen del mismo código que el dibujo.
"""
import math
import sympy as sp

OUT = "#1f1d1b"
ROPE = "#5a4128"
FONT = "'Baloo 2', Inter, Arial, sans-serif"


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".") if isinstance(v, float) else str(v)


class Scene:
    def __init__(self, W=1400, H=900):
        self.W, self.H = W, H
        self.els = []
        self.beams = []
        self.extra_eqs = []
        self.rope_col = ROPE

    def add(self, svg, z=50):
        self.els.append((z, len(self.els), svg))

    def rope(self, x1, y1, x2, y2, z=30, w=3, col=None):
        col = col or self.rope_col
        self.add(f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>', z)

    def path(self, d, z=30, w=3, col=None):
        col = col or self.rope_col
        self.add(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>', z)

    def svg(self, label=""):
        body = "".join(s for _, _, s in sorted(self.els, key=lambda e: (e[0], e[1])))
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.W} {self.H}" width="{self.W}" height="{self.H}" '
                f'role="img" aria-label="{label}">{body}'
                f'<rect x="3" y="3" width="{self.W-6}" height="{self.H-6}" fill="none" stroke="{OUT}" stroke-width="6" rx="4"/></svg>')

    # ----- resolución -----
    def equations(self):
        return [b.eq() for b in self.beams if b.balance] + list(self.extra_eqs)

    def solve(self, unknowns, unit):
        eqs = [sp.Eq(e, 0) for e in self.equations()]
        eqs.append(sp.Eq(unit, 1))
        sol = sp.solve(eqs, unknowns, dict=True)
        return sol


class Kind:
    """Tipo de objeto: peso (expresión), alto, ancho y función de dibujo draw(cx, top)->svg"""

    def __init__(self, name, w, h, width, draw, ring=10):
        self.name, self.w, self.h, self.width, self.draw, self.ring = name, w, h, width, draw, ring


class Beam:
    def __init__(self, sc, name, px, y, unit, kmin, kmax, style="pin", balance=True,
                 col="#e3aa60", hl="#f3c88c", thick=16, margin=20):
        self.sc, self.name, self.px, self.y, self.unit = sc, name, px, y, unit
        self.kmin, self.kmax, self.style, self.balance = kmin, kmax, style, balance
        self.col, self.hl, self.thick, self.margin = col, hl, thick, margin
        self.loads = []
        sc.beams.append(self)

    def X(self, k):
        return self.px + k * self.unit

    # ---- cargas ----
    def force(self, k, expr, note=""):
        self.loads.append((k, expr, note))

    def hang(self, k, kinds, drop=18, gap=4, z=40):
        """cuelga una cadena de objetos (lista de Kind, de arriba abajo) del punto k"""
        if isinstance(kinds, Kind):
            kinds = [kinds]
        x = self.X(k)
        y = self.y + drop
        tops = []
        for kd in kinds:
            tops.append(y)
            y += kd.h + gap
        self.sc.rope(x, self.y, x, tops[-1] + min(kinds[-1].ring, kinds[-1].h / 2), z=z - 10)
        for kd, t in zip(kinds, tops):
            self.sc.add(kd.draw(x, t), z)
            self.force(k, kd.w, kd.name)
        return y

    def stand(self, k, kinds, z=60):
        """apila objetos sobre la viga en k (lista de abajo arriba)"""
        if isinstance(kinds, Kind):
            kinds = [kinds]
        x = self.X(k)
        y = self.y - self.thick / 2
        tops = []
        for kd in kinds:
            y -= kd.h
            self.sc.add(kd.draw(x, y), z)
            self.force(k, kd.w, kd.name)
            tops.append(y)
        return tops

    def eq(self):
        return sp.expand(sum(k * w for k, w, _ in self.loads))

    def total(self):
        return sp.expand(sum(w for _, w, _ in self.loads))

    def draw(self, z=50, mark=True):
        sc = self.sc
        x1, x2 = sorted([self.X(self.kmin), self.X(self.kmax)])
        x1 -= self.margin
        x2 += self.margin
        h = self.thick
        sc.add(f'<rect x="{f(x1)}" y="{f(self.y-h/2)}" width="{f(x2-x1)}" height="{h}" rx="{h/2}" fill="{self.col}" stroke="{OUT}" stroke-width="3"/>'
               f'<line x1="{f(x1+10)}" y1="{f(self.y-2)}" x2="{f(x2-10)}" y2="{f(self.y-2)}" stroke="{self.hl}" stroke-width="2.5" stroke-linecap="round"/>', z)
        for k in range(self.kmin, self.kmax + 1):
            if k == 0 and mark:
                continue
            sc.add(f'<circle cx="{f(self.X(k))}" cy="{self.y}" r="3.6" fill="{OUT}"/>', z)
        if mark:
                sc.add(f'<circle cx="{f(self.px)}" cy="{self.y}" r="8.5" fill="#fff" stroke="{OUT}" stroke-width="3"/>'
                   f'<circle cx="{f(self.px)}" cy="{self.y}" r="3" fill="{OUT}"/>', z + 1)


def hang_beam(parent, k, child, z=30):
    """cuelga `child` (viga colgante) del punto k de `parent`; su peso total pasa al padre"""
    x = parent.X(k)
    sc = parent.sc
    sc.rope(x, parent.y, x, child.y - 14, z=z)
    sc.add(f'<circle cx="{f(x)}" cy="{f(child.y-15)}" r="5" fill="none" stroke="{OUT}" stroke-width="3"/>', z + 1)
    parent.force(k, child.total(), f"viga {child.name}")


# ---------- utilidades de dibujo ----------
def polea(cx, cy, R=20, col="#aab6c2"):
    return (f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{R}" fill="{col}" stroke="{OUT}" stroke-width="3"/>'
            f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{R-6}" fill="none" stroke="#7d8a97" stroke-width="2"/>'
            f'<circle cx="{f(cx)}" cy="{f(cy)}" r="4.5" fill="{OUT}"/>')


def poste(x, ytop, ybot, w=18, col="#c08a4c", hl="#dcae74"):
    return (f'<rect x="{f(x-w/2)}" y="{f(ytop)}" width="{w}" height="{f(ybot-ytop)}" fill="{col}" stroke="{OUT}" stroke-width="3"/>'
            f'<line x1="{f(x-w/2+5)}" y1="{f(ytop+8)}" x2="{f(x-w/2+5)}" y2="{f(ybot-6)}" stroke="{hl}" stroke-width="2"/>')


def arrow_head(px, py, ux, uy, k=11):
    lx, ly = -ux * k - uy * k * 0.55, -uy * k + ux * k * 0.55
    rx, ry = -ux * k + uy * k * 0.55, -uy * k - ux * k * 0.55
    return f'<path d="M{px+lx:.1f},{py+ly:.1f} L{px:.1f},{py:.1f} L{px+rx:.1f},{py+ry:.1f}" fill="none"/>'


def text(x, y, s, size=26, weight=800, anchor="middle", col=OUT, rot=None, extra=""):
    tr = f' transform="rotate({rot:.2f} {x:.1f} {y:.1f})"' if rot is not None else ""
    return (f'<text x="{x:.1f}" y="{y:.1f}"{tr} text-anchor="{anchor}" dominant-baseline="middle" '
            f'font-family="{FONT}" font-weight="{weight}" font-size="{size}" fill="{col}" {extra}>{s}</text>')


def globo_svg(tx, ty, bx, by, col="#f3c53f", label="He"):
    rx, ry = 25, 30
    knot_y = by + ry
    mx = (tx + bx) / 2 + 10
    return (f'<path d="M{f(tx)},{f(ty)} Q{mx:.1f},{(ty+knot_y)/2:.1f} {f(bx)},{f(knot_y+5)}" fill="none" stroke="{OUT}" stroke-width="2"/>'
            f'<path d="M{f(bx-5)},{f(knot_y+7)} L{f(bx)},{f(knot_y-1)} L{f(bx+5)},{f(knot_y+7)} Z" fill="{col}" stroke="{OUT}" stroke-width="2.5" stroke-linejoin="round"/>'
            f'<ellipse cx="{f(bx)}" cy="{f(by)}" rx="{rx}" ry="{ry}" fill="{col}" stroke="{OUT}" stroke-width="3"/>'
            f'<ellipse cx="{f(bx-10)}" cy="{f(by-13)}" rx="6" ry="9" fill="#fff" opacity=".55" transform="rotate(25 {f(bx-10)} {f(by-13)})"/>'
            + text(bx, by + 2, label, 21))
