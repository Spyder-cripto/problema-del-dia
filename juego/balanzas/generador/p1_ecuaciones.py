"""Ecuaciones del puzle 1 (Balanza del puerto), escritas a mano.

El dibujo de este puzle (p1_puerto.py) es anterior al motor de lib.py, así que sus
ecuaciones se comprueban aquí con fracciones exactas.
"""
from fractions import Fraction as F


def resolver():
    # pesos en balas
    b = F(1); g = F(3, 2); r = F(5, 2); a = F(4); c = F(5)
    sen = F(6, 10)
    # viga colgante izquierda: barril a 3 y globo a 1 contra 3 balas a 2 (2 balas en el eje)
    assert 3 * r - 1 * g == 2 * 3 * b
    w_izq = r - g + 3 * b + 2 * b
    # viga colgante derecha: 3 balas a 2 contra barril+globo a 2 y bala a 4
    assert 2 * 3 * b == 2 * (r - g) + 4 * b
    w_der = 3 * b + (r - g) + b
    # polea móvil: el ancla tira con a/2 a 4; barril a 2 y bala a 3
    assert 4 * (a / 2) == 2 * r + 3 * b
    # rampa 6/10: el cañón de la viga apoya c - 0,6c a 4; ancla a 2
    assert 4 * (c - c * sen) == 2 * a
    # viga del mástil
    x = (4 * w_izq + 2 * c + 1 * a - 4 * w_der) / 2
    # unicidad: las dos colgantes dan un sistema 2x2 con determinante no nulo
    assert 3 * (-1) - (-1) * 1 != 0   # 3r − g = 6 y r − g = 1
    return x


if __name__ == "__main__":
    print("x =", resolver())
