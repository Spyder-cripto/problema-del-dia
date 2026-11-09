#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
simulador_triplex.py - Simulación y análisis estadístico del sorteo del Tríplex
================================================================================

El Tríplex es un juego de lotería en el que cada sorteo produce un número de
tres cifras entre el 000 y el 999 (1000 combinaciones equiprobables).

En la simulación intervienen dos "jugadores":

  * Jugador 1 · El Azar ......... genera los resultados con un generador
                                  pseudoaleatorio moderno (numpy PCG64) y los
                                  va "cantando" por lotes. Con --trucar puede
                                  hacer trampa en secreto.
  * Jugador 2 · El Estadístico .. juega de la forma más inteligente posible:
                                  - conoce el valor esperado EXACTO de apostar a
                                    cada número con la tabla de premios real;
                                  - vigila con inferencia bayesiana jerárquica si
                                    la máquina está trucada (sin dejarse engañar
                                    por la "maldición del ganador");
                                  - solo apuesta cuando el valor esperado es
                                    positivo (en un sorteo justo, nunca);
                                  - no cae en falacias (números "calientes" o
                                    "atrasados").
                                  Además registra cada sorteo y elabora un
                                  informe estadístico exhaustivo.

Para comparar, cuatro rivales apuestan en todos los sorteos: un cazador de
números calientes, un cazador de atrasados, un supersticioso (siempre el 777)
y uno que elige al azar.

Todas las probabilidades teóricas se calculan de forma EXACTA enumerando el
universo de los 1000 números posibles, de modo que cada métrica observada se
acompaña de su valor esperado y de su margen de variación "normal" (IC 95 %).

Dependencias (Python 3.9 o superior):
    pip install numpy matplotlib seaborn

Uso:
    python simulador_triplex.py                  # pregunta el nº de sorteos
    python simulador_triplex.py -n 50000 -s 42   # sin preguntas, reproducible
    python simulador_triplex.py -n 50000 --trucar 10 --factor 3   # ¿lo descubrirá?
    python simulador_triplex.py --help           # todas las opciones
"""

from __future__ import annotations

import argparse
import math
import secrets
import sys
import textwrap
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, Iterator, List, Optional, Tuple

try:
    import numpy as np
    import matplotlib
    import matplotlib.pyplot as plt
    import seaborn as sns
    from matplotlib.colors import LinearSegmentedColormap, TwoSlopeNorm
    from matplotlib.gridspec import GridSpec
    from matplotlib.lines import Line2D
    from matplotlib.patches import Patch
    from matplotlib.ticker import FuncFormatter, MaxNLocator, PercentFormatter
except ImportError as error:  # pragma: no cover - mensaje amable si falta algo
    sys.exit(
        f"\nFalta la librería '{error.name}'. Instala las dependencias con:\n\n"
        "    pip install numpy matplotlib seaborn\n"
    )


# =============================================================================
# 1. CONSTANTES Y CONFIGURACIÓN
# =============================================================================

TOTAL_NUMEROS = 1000                      # del 000 al 999
UNIVERSO = np.arange(TOTAL_NUMEROS)       # todos los resultados posibles
LIMITES_TERCIOS = (334, 667)              # 000-333 | 334-666 | 667-999
ETIQUETAS_TERCIOS = ("000–333", "334–666", "667–999")
POSICIONES = ("Centenas", "Decenas", "Unidades")
Z95 = 1.959963984540054                   # cuantil normal para un IC del 95 %
EULER_GAMMA = 0.5772156649015329
MAX_SORTEOS = 20_000_000                  # tope razonable de memoria (~1 GB)
SORTEOS_POR_DEFECTO = 10_000
SORTEOS_NARRADOS = 10                     # sorteos que el Estadístico comenta uno a uno


@dataclass
class Configuracion:
    """Parámetros de una ejecución (vienen de la consola o de la línea de órdenes)."""

    n_sorteos: int
    semilla: int
    corte: int = 500                      # umbral alto/bajo: alto si número >= corte
    carpeta_salida: Path = Path("resultados_triplex")
    guardar_png: bool = True
    guardar_csv: bool = False
    mostrar: bool = True
    trucados: int = 0                     # nº de números que el Azar trucará en secreto
    factor: float = 3.0                   # cuántas veces más salen los números trucados


class Paleta:
    """Colores del panel: superficie clara, tinta neutra y pocos acentos.

    * SERIE_1 (azul) es el color de cualquier serie única (barras, líneas).
    * SERIE_2 (naranja) solo aparece cuando hay una segunda serie en el mismo
      gráfico, o para señalar lo que se sale del margen del azar.
    * El mapa divergente va de azul (sale MENOS de lo esperado) a rojo (sale
      MÁS), pasando por un gris neutro que significa "justo lo esperado".
    """

    FONDO = "#f9f9f7"
    SUPERFICIE = "#fcfcfb"
    TINTA = "#0b0b0b"
    TINTA_2 = "#52514e"
    TINTA_SUAVE = "#898781"
    REJILLA = "#e1e0d9"
    EJE = "#c3c2b7"
    SERIE_1 = "#2a78d6"
    SERIE_1_CLARO = "#b7d3f6"
    SERIE_2 = "#eb6834"
    BANDA = "#e7e6e0"
    DIVERGENTE = ("#184f95", "#3987e5", "#9ec5f4", "#f0efec",
                  "#f4b0af", "#e34948", "#a8292a")
    # Un color fijo por jugador de la partida (siempre en este orden)
    CATEGORICA = ("#2a78d6", "#eb6834", "#1baf7a", "#eda100",
                  "#e87ba4", "#008300", "#6250d6", "#e34948")
    # Rampa ordinal para las categorías de premio (de mayor a menor)
    RAMPA_GRIS = ("#3d3c39", "#6e6d68", "#a3a29b", "#d3d2cb")


P = Paleta
MAPA_DIVERGENTE = LinearSegmentedColormap.from_list("frio_caliente", P.DIVERGENTE)


# =============================================================================
# 2. UTILIDADES: FORMATO EN ESPAÑOL Y FUNCIONES ESTADÍSTICAS
# =============================================================================

def fmt_int(n: float) -> str:
    """12345 -> '12.345' (separador de miles español)."""
    return f"{int(round(n)):,}".replace(",", ".")


def fmt_dec(x: float, dec: int = 2) -> str:
    """1234.567 -> '1.234,57' (coma decimal, punto de miles)."""
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return "n/d"
    texto = f"{x:,.{dec}f}"
    return texto.replace(",", "\x00").replace(".", ",").replace("\x00", ".")


def fmt_pct(fraccion: float, dec: int = 2) -> str:
    """0.5012 -> '50,12 %'."""
    return f"{fmt_dec(100 * fraccion, dec)} %"


def fmt_p(p: float) -> str:
    """Formatea un p-valor."""
    if p is None or math.isnan(p):
        return "n/d"
    return "< 0,0001" if p < 1e-4 else fmt_dec(p, 4)


def fmt_euros(x: float, dec: int = 2) -> str:
    """-12.5 -> '-12,50 €'; 3 -> '+3,00 €' (con signo, salvo el cero)."""
    if x is None or math.isnan(x):
        return "n/d"
    if round(x, dec) == 0:
        return f"{fmt_dec(0.0, dec)} €"
    return f"{'+' if x > 0 else ''}{fmt_dec(x, dec)} €"


def fmt_num(n: int) -> str:
    """7 -> '007' (los números del Tríplex siempre tienen tres cifras)."""
    return f"{int(n):03d}"


def _gamma_p_serie(a: float, x: float) -> float:
    """Gamma incompleta regularizada inferior P(a, x) por desarrollo en serie."""
    termino = suma = 1.0 / a
    ap = a
    for _ in range(100_000):
        ap += 1.0
        termino *= x / ap
        suma += termino
        if abs(termino) < abs(suma) * 1e-15:
            break
    return suma * math.exp(-x + a * math.log(x) - math.lgamma(a))


def _gamma_q_fraccion(a: float, x: float) -> float:
    """Gamma incompleta regularizada superior Q(a, x) por fracción continua (Lentz)."""
    diminuto = 1e-300
    b = x + 1.0 - a
    c = 1.0 / diminuto
    d = 1.0 / b
    h = d
    for i in range(1, 100_000):
        an = -i * (i - a)
        b += 2.0
        d = an * d + b
        d = diminuto if abs(d) < diminuto else d
        c = b + an / c
        c = diminuto if abs(c) < diminuto else c
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < 1e-15:
            break
    return math.exp(-x + a * math.log(x) - math.lgamma(a)) * h


def chi2_cola_superior(estadistico: float, gl: int) -> float:
    """p-valor de una chi-cuadrado: P(X >= estadistico) con 'gl' grados de libertad.

    Se implementa a mano (gamma incompleta) para no depender de SciPy.
    """
    if gl <= 0 or math.isnan(estadistico):
        return float("nan")
    if estadistico <= 0:
        return 1.0
    a, x = gl / 2.0, estadistico / 2.0
    if x < a + 1.0:
        return max(0.0, 1.0 - _gamma_p_serie(a, x))
    return _gamma_q_fraccion(a, x)


def p_valor_normal(z: float) -> float:
    """p-valor bilateral de un estadístico z ~ N(0, 1)."""
    return math.erfc(abs(z) / math.sqrt(2.0))


@dataclass
class PruebaChi2:
    """Resultado de una prueba de bondad de ajuste chi-cuadrado."""

    estadistico: float
    gl: int
    p_valor: float
    fiable: bool              # False si alguna frecuencia esperada es < 5

    def veredicto(self) -> str:
        if math.isnan(self.p_valor):
            return "sin datos suficientes"
        texto = ("compatible con el azar" if self.p_valor >= 0.05
                 else "desviación significativa al 5 % (¿casualidad?)")
        return texto if self.fiable else texto + " [aprox. poco fiable: pocos datos]"

    def resumen(self) -> str:
        return (f"χ² = {fmt_dec(self.estadistico, 2)} (gl {self.gl}) → "
                f"p = {fmt_p(self.p_valor)} · {self.veredicto()}")


def prueba_chi2(observado: np.ndarray, probabilidades: np.ndarray) -> PruebaChi2:
    """Compara frecuencias observadas con las probabilidades teóricas."""
    obs = np.asarray(observado, dtype=float)
    n = obs.sum()
    esperado = n * np.asarray(probabilidades, dtype=float)
    validas = esperado > 0
    if n == 0 or validas.sum() < 2:
        return PruebaChi2(float("nan"), 0, float("nan"), False)
    chi2 = float((((obs - esperado) ** 2)[validas] / esperado[validas]).sum())
    gl = int(validas.sum()) - 1
    return PruebaChi2(chi2, gl, chi2_cola_superior(chi2, gl),
                      bool(esperado[validas].min() >= 5))


def codificar_rachas(x: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Run-length encoding vectorizado: [1,1,0,1] -> valores [1,0,1], longitudes [2,1,1]."""
    x = np.asarray(x)
    if x.size == 0:
        return x[:0], np.zeros(0, dtype=np.int64)
    cortes = np.flatnonzero(x[1:] != x[:-1]) + 1
    inicios = np.concatenate(([0], cortes))
    longitudes = np.diff(np.concatenate((inicios, [x.size])))
    return x[inicios], longitudes


def rachas_esperadas(n: int, p: float, k_max: int) -> np.ndarray:
    """Número esperado de rachas de longitud EXACTA k (k = 1..k_max) de un suceso
    de probabilidad p en n ensayos independientes.

    Una racha de longitud k puede estar al principio, al final (q·p^k cada una)
    o en el interior, rodeada de dos "fallos" (q²·p^k, en n-k-1 posiciones).
    """
    q = 1.0 - p
    k = np.arange(1, k_max + 1, dtype=float)
    esperado = np.where(
        k < n,
        (2 * q * p ** k + np.maximum(n - k - 1, 0) * q ** 2 * p ** k),
        np.where(k == n, p ** n, 0.0),
    )
    return esperado


def racha_maxima_esperada(n: int, p: float) -> float:
    """Aproximación de Schilling para la racha más larga de un suceso de prob. p."""
    q = 1.0 - p
    if n * q <= 1 or p <= 0 or p >= 1:
        return float("nan")
    return math.log(n * q, 1 / p) + EULER_GAMMA / math.log(1 / p) - 0.5


def entropia_bits(frecuencias: np.ndarray) -> float:
    """Entropía de Shannon (bits) de una distribución de frecuencias."""
    f = np.asarray(frecuencias, dtype=float)
    f = f[f > 0]
    if f.size == 0:
        return 0.0
    p = f / f.sum()
    return float(-(p * np.log2(p)).sum())


# =============================================================================
# 3. PROPIEDADES DE LOS NÚMEROS Y MODELO TEÓRICO EXACTO
# =============================================================================

def descomponer(x: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Devuelve (centenas, decenas, unidades) de cada número."""
    return x // 100, (x // 10) % 10, x % 10


def suma_cifras(x: np.ndarray) -> np.ndarray:
    c, d, u = descomponer(x)
    return c + d + u


def raiz_digital(x: np.ndarray) -> np.ndarray:
    """Suma reiterada de cifras hasta quedar una sola (0 solo para el 000)."""
    return np.where(x == 0, 0, 1 + (x - 1) % 9)


def tercio_de(x: np.ndarray) -> np.ndarray:
    """0 -> 000-333, 1 -> 334-666, 2 -> 667-999."""
    return np.digitize(x, LIMITES_TERCIOS)


def _criba_primos(n: int) -> np.ndarray:
    es_primo = np.ones(n, dtype=bool)
    es_primo[:2] = False
    for i in range(2, int(n ** 0.5) + 1):
        if es_primo[i]:
            es_primo[i * i::i] = False
    return es_primo


ES_PRIMO = _criba_primos(TOTAL_NUMEROS)
ES_CUADRADO = np.zeros(TOTAL_NUMEROS, dtype=bool)
ES_CUADRADO[np.arange(32) ** 2] = True     # 0, 1, 4, ..., 961


def catalogo_propiedades(corte: int) -> Dict[str, Callable[[np.ndarray], np.ndarray]]:
    """Propiedades 'curiosas' de un número de tres cifras.

    Cada función recibe un array de números y devuelve un array booleano; se usa
    tanto con los sorteos (frecuencia observada) como con el universo completo
    000-999 (probabilidad teórica exacta).
    """

    def distintas(x):
        c, d, u = descomponer(x)
        return (c != d) & (d != u) & (c != u)

    def trio(x):
        c, d, u = descomponer(x)
        return (c == d) & (d == u)

    def pareja(x):
        return ~distintas(x) & ~trio(x)

    def capicua(x):
        c, _, u = descomponer(x)
        return c == u

    def escalera(x):
        c, d, u = descomponer(x)
        return ((d - c == 1) & (u - d == 1)) | ((c - d == 1) & (d - u == 1))

    def creciente(x):
        c, d, u = descomponer(x)
        return (c < d) & (d < u)

    def contiene_siete(x):
        c, d, u = descomponer(x)
        return (c == 7) | (d == 7) | (u == 7)

    return {
        "Par": lambda x: x % 2 == 0,
        f"Alto (≥ {fmt_num(corte)})": lambda x: x >= corte,
        "Tres cifras distintas": distintas,
        "Pareja (dos cifras iguales)": pareja,
        "Trío (p. ej. 777)": trio,
        "Capicúa (p. ej. 121)": capicua,
        "Escalera (p. ej. 345, 876)": escalera,
        "Cifras crecientes (a<b<c)": creciente,
        "Contiene algún 7": contiene_siete,
        "Número primo": lambda x: ES_PRIMO[x],
        "Múltiplo de 3": lambda x: x % 3 == 0,
        "Cuadrado perfecto": lambda x: ES_CUADRADO[x],
    }


class ModeloTeorico:
    """Probabilidades exactas, obtenidas enumerando los 1000 resultados posibles."""

    def __init__(self, corte: int):
        u = UNIVERSO
        self.corte = corte
        self.p_terminacion = np.bincount(u % 10, minlength=10) / TOTAL_NUMEROS
        self.p_tercio = np.bincount(tercio_de(u), minlength=3) / TOTAL_NUMEROS
        self.p_suma = np.bincount(suma_cifras(u), minlength=28) / TOTAL_NUMEROS
        self.p_raiz = np.bincount(raiz_digital(u), minlength=10) / TOTAL_NUMEROS
        self.p_cifra = np.full(10, 0.1)                    # en cada posición
        self.p_numero = np.full(TOTAL_NUMEROS, 1 / TOTAL_NUMEROS)
        self.p_par = float((u % 2 == 0).mean())
        self.p_alto = float((u >= corte).mean())
        self.media = float(u.mean())                        # 499,5
        self.desviacion = float(u.std())                    # ≈ 288,67
        self.media_suma = float(suma_cifras(u).mean())      # 13,5
        # |x_t - x_{t-1}| entre dos sorteos independientes: distribución triangular
        d = np.arange(TOTAL_NUMEROS)
        self.p_distancia = np.where(d == 0, TOTAL_NUMEROS,
                                    2 * (TOTAL_NUMEROS - d)) / TOTAL_NUMEROS ** 2
        self.propiedades = {nombre: float(f(u).mean())
                            for nombre, f in catalogo_propiedades(corte).items()}
        # Problema del coleccionista: sorteos esperados hasta ver los 1000 números
        self.coleccion_completa = TOTAL_NUMEROS * sum(1 / k for k in range(1, TOTAL_NUMEROS + 1))

    def distintos_esperados(self, n: int) -> float:
        """Cantidad esperada de números distintos vistos tras n sorteos."""
        return TOTAL_NUMEROS * (1 - (1 - 1 / TOTAL_NUMEROS) ** n)


# =============================================================================
# 4. EL JUEGO: TABLA DE PREMIOS Y DETECTOR BAYESIANO DE TRAMPAS
# =============================================================================

# Tabla de premios del Tríplex de la ONCE para una apuesta de 0,50 € (según
# resuloto.com y statyr.com, consultados en noviembre de 2026; conviene
# comprobarla en juegosonce.es). Solo se cobra el premio MÁS ALTO de cada
# apuesta. Si las reglas cambian, basta con editar estos valores: el valor
# esperado de cada número y la estrategia del Estadístico se recalculan solos.
PRECIO_APUESTA = 0.50
TABLA_PREMIOS = {
    "exacto": 150.00,        # las tres cifras en su orden
    "otro_orden": 10.00,     # las tres cifras, en distinto orden
    "dos_primeras": 2.00,    # las dos primeras cifras, en su orden
    "dos_ultimas": 2.00,     # las dos últimas cifras, en su orden
    "primera": 0.50,         # la primera cifra
    "ultima": 0.50,          # la última cifra
}
CATEGORIAS_ACIERTO = ("Exacto", "Otro orden", "Dos cifras", "Una cifra", "Nada")
EJEMPLOS_TIPO = {"Tres cifras distintas": "123", "Pareja contigua": "112, 211",
                 "Pareja separada": "121", "Trío": "777"}


def tipo_de_numero(numero: int) -> str:
    """Clasifica un número según el patrón de sus cifras."""
    c, d, u = numero // 100, (numero // 10) % 10, numero % 10
    if c == d == u:
        return "Trío"
    if c == u:
        return "Pareja separada"
    if c == d or d == u:
        return "Pareja contigua"
    return "Tres cifras distintas"


class ReglasTriplex:
    """Premio de cada apuesta frente a cada resultado, y su valor esperado EXACTO.

    Se construye una matriz 1000 x 1000 en la que premio[i, j] son los euros que
    cobra quien apuesta al número i si sale el j. La media de cada fila es el
    premio esperado de apostar a i en un sorteo justo, sin aproximaciones.
    Los números con el mismo valor esperado forman un "grupo".
    """

    def __init__(self, precio: float = PRECIO_APUESTA,
                 premios: Optional[Dict[str, float]] = None):
        self.precio = precio
        self.premios = dict(TABLA_PREMIOS if premios is None else premios)
        c, d, u = descomponer(UNIVERSO)
        A, B, C = c[:, None], d[:, None], u[:, None]      # número apostado (filas)
        X, Y, Z = c[None, :], d[None, :], u[None, :]      # número premiado (columnas)
        firma = np.sort(np.stack([c, d, u], axis=1), axis=1) @ np.array([100, 10, 1])
        exacto = (A == X) & (B == Y) & (C == Z)
        otro_orden = (firma[:, None] == firma[None, :]) & ~exacto
        condiciones = (   # (categoría para el recuento, importe, condición)
            (3, self.premios["ultima"], C == Z),
            (3, self.premios["primera"], A == X),
            (2, self.premios["dos_ultimas"], (B == Y) & (C == Z)),
            (2, self.premios["dos_primeras"], (A == X) & (B == Y)),
            (1, self.premios["otro_orden"], otro_orden),
            (0, self.premios["exacto"], exacto),
        )
        self.premio = np.zeros((TOTAL_NUMEROS, TOTAL_NUMEROS), dtype=np.float32)
        self.categoria = np.full((TOTAL_NUMEROS, TOTAL_NUMEROS), 4, dtype=np.int8)
        for categoria, importe, cumple in condiciones:
            mejora = cumple & (importe > self.premio)     # solo cuenta el premio más alto
            self.premio[mejora] = importe
            self.categoria[mejora] = categoria
        self.premio_exacto = np.diag(self.premio).astype(np.float64)
        self.premio_esperado = self.premio.mean(axis=1, dtype=np.float64)
        self.varianza = ((self.premio.astype(np.float64) ** 2).mean(axis=1)
                         - self.premio_esperado ** 2)
        # Aportación de cada categoría al premio esperado: (1000, 4)
        self.contribucion = np.stack(
            [np.where(self.categoria == k, self.premio, 0).mean(axis=1, dtype=np.float64)
             for k in range(4)], axis=1)
        valores, grupo = np.unique(np.round(self.premio_esperado, 9), return_inverse=True)
        self.grupo = grupo.reshape(-1)
        self.premio_esperado_grupo = valores
        self.miembros = [np.flatnonzero(self.grupo == g) for g in range(len(valores))]
        self.representante = np.array([int(m[0]) for m in self.miembros])
        self.premio_exacto_grupo = np.array([self.premio_exacto[m].max() for m in self.miembros])

    @property
    def n_grupos(self) -> int:
        return len(self.miembros)

    def describir_grupo(self, g: int) -> str:
        tipos: List[str] = []
        for numero in self.miembros[g]:
            tipo = tipo_de_numero(int(numero))
            if tipo not in tipos:
                tipos.append(tipo)
        return " / ".join(f"{t} ({EJEMPLOS_TIPO[t]})" for t in tipos)

    def resumen_premios(self) -> str:
        nombres = {"exacto": "exacto", "otro_orden": "otro orden", "dos_primeras": "2 primeras",
                   "dos_ultimas": "2 últimas", "primera": "1.ª cifra", "ultima": "última"}
        return " · ".join(f"{nombres[k]} {fmt_dec(v, 2)} €" for k, v in self.premios.items())


def _sigmoide(x):
    return 1 / (1 + np.exp(-np.clip(x, -700, 700)))


class DetectorDeTrampas:
    """Inferencia bayesiana jerárquica: ¿está trucada la máquina? ¿qué números?

    Modelo en dos niveles:
      * La máquina está trucada con probabilidad ρ = 5 % (prior escéptico: las
        máquinas de sorteo están homologadas y auditadas).
      * Si lo está, cada número está trucado con probabilidad q = 1 %, y TODOS
        los trucados salen el mismo número de veces más, λ (log-uniforme entre
        1,25 y 5): el "factor" de la trampa es una propiedad de la máquina.
      * Un número honrado sale con p = 1/1000. La verosimilitud es binomial exacta.

    Por qué así:
      * Entre 1000 números siempre hay alguno que PARECE caliente por puro azar
        (la "maldición del ganador"). Un número aislado no basta para convencerle
        de que hay trampa; varios números desviados a la vez, sí.
      * λ se estima con TODOS los números sospechosos a la vez. Si se estimara
        con el más salido, se sobrestimaría (otra vez la maldición del ganador)
        y apostaría por números que, aun trucados, no compensan.
    """

    def __init__(self, prior_maquina: float = 0.05, prior_numero: float = 0.01,
                 lambda_min: float = 1.25, lambda_max: float = 5.0, puntos: int = 24):
        self.p0 = 1 / TOTAL_NUMEROS
        self.prior_maquina = prior_maquina
        self.prior_numero = prior_numero
        self.lambdas = np.geomspace(lambda_min, lambda_max, puntos)
        self._log_lambdas = np.log(self.lambdas)
        self._k = np.log1p(-self.lambdas * self.p0) - math.log1p(-self.p0)
        self._logit_numero = math.log(prior_numero / (1 - prior_numero))
        # P(máquina trucada y su factor es λ_k | datos); al principio, el prior
        self._pesos = np.full(puntos, prior_maquina / puntos)

    @property
    def prob_maquina(self) -> float:
        """Probabilidad a posteriori de que la máquina esté trucada."""
        return float(self._pesos.sum())

    @property
    def exceso_maximo(self) -> float:
        """Cota superior de (p - 1/1000)·1000 para CUALQUIER número con los datos
        actuales (se alcanzaría si fuera seguro que está trucado)."""
        return float((self._pesos * (self.lambdas - 1)).sum())

    @property
    def lambda_estimada(self) -> float:
        """Factor de la trampa estimado (media a posteriori, si está trucada)."""
        return float((self._pesos * self.lambdas).sum() / self._pesos.sum())

    def _log_razon(self, veces, n) -> np.ndarray:
        """log(L_trucado(λ_k) / L_honrado) de un número que ha salido 'veces'
        veces en 'n' sorteos, para cada λ_k de la rejilla (último eje)."""
        c = np.asarray(veces, dtype=np.float64)[..., None]
        resto = np.asarray(n, dtype=np.float64)[..., None] - c
        return c * self._log_lambdas + resto * self._k

    def revisar_maquina(self, frecuencias: np.ndarray, n: int) -> float:
        """Actualiza P(máquina trucada, λ | todos los recuentos) y devuelve
        la probabilidad de que la máquina esté trucada."""
        log_razon = self._log_razon(frecuencias, n)                         # (1000, K)
        log_verosimilitud = np.logaddexp(math.log1p(-self.prior_numero),
                                         math.log(self.prior_numero) + log_razon).sum(axis=0)
        log_trucada = math.log(self.prior_maquina / len(self.lambdas)) + log_verosimilitud
        log_justa = math.log1p(-self.prior_maquina)
        total = np.logaddexp(np.logaddexp.reduce(log_trucada), log_justa)
        self._pesos = np.exp(log_trucada - total)
        return self.prob_maquina

    def evaluar(self, veces, n) -> Tuple[np.ndarray, np.ndarray]:
        """Para un número que ha salido 'veces' veces en 'n' sorteos devuelve:
        (probabilidad predictiva de que salga en el próximo sorteo,
         probabilidad a posteriori de que ese número esté trucado). Admite arrays.

        P(trucado | datos) = Σ_k P(máquina trucada, λ_k | datos) · P(trucado | λ_k, datos)
        """
        condicionada = _sigmoide(self._logit_numero + self._log_razon(veces, n))
        prob = (condicionada * self._pesos).sum(axis=-1)
        exceso = (condicionada * self._pesos * (self.lambdas - 1)).sum(axis=-1)
        return self.p0 * (1 + exceso), prob


# =============================================================================
# 5. JUGADOR 1: EL AZAR
# =============================================================================

class JugadorAzar:
    """Genera sorteos del Tríplex independientes en [000, 999].

    Por defecto es un sorteo justo (los 1000 números equiprobables). Con
    'trucados' > 0 elige en secreto esa cantidad de números y los hace salir
    'factor' veces más, para comprobar si el Estadístico lo descubre.
    """

    nombre = "Jugador 1 · El Azar"

    def __init__(self, semilla: int, trucados: int = 0, factor: float = 3.0):
        self.semilla = semilla
        self.factor = factor
        self._rng = np.random.default_rng(semilla)
        self.trucados = np.array([], dtype=np.int64)
        self._cdf: Optional[np.ndarray] = None
        if trucados > 0:
            secreto = np.random.default_rng([semilla, 7])
            self.trucados = np.sort(secreto.choice(TOTAL_NUMEROS, size=trucados, replace=False))
            pesos = np.ones(TOTAL_NUMEROS)
            pesos[self.trucados] = factor
            self._cdf = np.cumsum(pesos / pesos.sum())
            self._cdf[-1] = 1.0

    @property
    def es_justo(self) -> bool:
        return self._cdf is None

    def sortear(self, n: int, tam_lote: int) -> Iterator[np.ndarray]:
        """Produce los n resultados en lotes de, como mucho, 'tam_lote' sorteos."""
        restantes = n
        while restantes > 0:
            k = min(tam_lote, restantes)
            if self._cdf is None:
                yield self._rng.integers(0, TOTAL_NUMEROS, size=k, dtype=np.int32)
            else:   # muestreo por inversión de la función de distribución
                indices = np.searchsorted(self._cdf, self._rng.random(k), side="right")
                yield np.minimum(indices, TOTAL_NUMEROS - 1).astype(np.int32)
            restantes -= k


# =============================================================================
# 6. JUGADOR 2: EL ESTADÍSTICO
# =============================================================================

@dataclass
class InfoRacha:
    """Racha más larga y racha en curso de un tipo de resultado (p. ej. 'Par')."""

    nombre: str
    maxima: int
    en_curso: int
    maxima_esperada: float


@dataclass
class Informe:
    """Todo lo que el Estadístico ha calculado. Lo consumen la consola y los gráficos."""

    # --- General ------------------------------------------------------------
    n: int
    corte: int
    teoria: ModeloTeorico
    media: float
    mediana: float
    desviacion: float
    minimo: int
    maximo: int
    frecuencias: np.ndarray            # 1000 valores
    chi2_numeros: PruebaChi2
    distintos_vistos: int
    sorteo_coleccion_completa: Optional[int]
    calientes: List[Tuple[int, int]]   # (número, veces)
    frios: List[Tuple[int, int]]
    entropia_numeros: float
    entropia_terminaciones: float
    # --- Categorías ---------------------------------------------------------
    terminaciones: np.ndarray
    chi2_terminaciones: PruebaChi2
    pares: int
    altos: int
    tercios: np.ndarray
    chi2_tercios: PruebaChi2
    sumas: np.ndarray                  # 0..27
    chi2_sumas: PruebaChi2
    media_suma: float
    raices: np.ndarray                 # 0..9
    chi2_raices: PruebaChi2
    posiciones: np.ndarray             # 3 x 10
    chi2_posiciones: List[PruebaChi2]
    # --- Secuencia ----------------------------------------------------------
    rachas: Dict[str, InfoRacha]
    rachas_paridad: np.ndarray         # nº de rachas de longitud k (índice k-1)
    rachas_umbral: np.ndarray
    racha_terminacion: Tuple[int, int]  # (longitud, cifra) de la racha de terminación
    repeticiones: int                  # mismo número dos sorteos seguidos
    prueba_rachas_z: float             # Wald-Wolfowitz sobre la paridad
    prueba_rachas_p: float
    autocorrelacion: float             # lag 1
    atraso_actual: np.ndarray          # sorteos desde la última aparición
    hueco_maximo: np.ndarray           # mayor ausencia de cada número
    distancias: np.ndarray             # |x_t - x_{t-1}| (0..999)
    # --- Evolución (submuestreada para dibujar) -----------------------------
    evo_indice: np.ndarray             # nº de sorteos acumulados
    evo_pares: np.ndarray
    evo_altos: np.ndarray
    evo_media: np.ndarray
    ultimos: np.ndarray                # últimos sorteos (para el trazado)
    # --- Propiedades curiosas: (nombre, observado, teórico, z) ---------------
    propiedades: List[Tuple[str, float, float, float]]
    # --- La partida (apuestas del Estadístico y de sus rivales) ---------------
    partida: Optional["ResultadoPartida"] = None

    @property
    def impares(self) -> int:
        return self.n - self.pares

    @property
    def bajos(self) -> int:
        return self.n - self.altos


class JugadorEstadistico:
    """Juega, registra los sorteos en tiempo real y produce el informe final.

    Cómo JUEGA (la estrategia más inteligente posible para un jugador que solo
    ve los resultados):
      1. Calcula el valor esperado EXACTO de apostar a cada número con la tabla
         de premios. En un sorteo justo el pasado no cambia nada, pero el número
         sí importa: los de tres cifras distintas devuelven un 64,1 % y un trío
         como el 777 solo un 54,3 % (por el premio "en otro orden").
      2. Antes de cada sorteo actualiza, con inferencia bayesiana, la
         probabilidad de que algún número esté trucado (DetectorDeTrampas).
      3. Apuesta 0,50 € SOLO si su mejor número tiene valor esperado positivo.
         En un sorteo justo eso no ocurre nunca: su mejor jugada es no jugar.
         No persigue números "calientes" ni "atrasados": sabe que son falacias.

    Cómo ANALIZA: mantiene contadores en vivo que se actualizan con cada lote
    y, al terminar, calcula la batería completa de métricas del historial.
    """

    nombre = "Jugador 2 · El Estadístico"

    def __init__(self, n_previstos: int, corte: int):
        self.corte = corte
        self.teoria = ModeloTeorico(corte)
        self.detector = DetectorDeTrampas()
        self._historial = np.empty(n_previstos, dtype=np.int32)
        self.n = 0
        self.frecuencias = np.zeros(TOTAL_NUMEROS, dtype=np.int64)
        self._suma = 0
        self._pares = 0
        self._altos = 0

    # ---- Decisión de apuesta (antes de conocer cada resultado) ---------------
    def decidir_apuestas(self, ctx: "ContextoLote",
                         reglas: "ReglasTriplex") -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Para cada sorteo del lote, usando solo los sorteos ANTERIORES, devuelve
        (número elegido, valor esperado estimado de apostarle en €, P(trucado)).

        Valor esperado de apostar al número i (aproximación de primer orden):
            VE_i = premio_esperado_justo_i + (p_i - 1/1000) · premio_exacto_i - precio
        donde p_i es la probabilidad predictiva bayesiana de que salga i. Dentro
        de un grupo de igual valor esperado, VE_i crece con las veces que ha
        salido i, así que basta comparar al número más salido de cada grupo.
        """
        tam = len(ctx.lote)
        mejor_ve = np.full(tam, -np.inf)
        mejor_numero = np.zeros(tam, dtype=np.int64)
        mejor_prob = np.zeros(tam)
        # Poda exacta: el VE de un grupo está entre su VE justo (cota inferior) y
        # ese valor más el máximo exceso posible (cota superior). Un grupo cuya
        # cota superior no alcanza la mejor cota inferior no puede ganar nunca.
        cota_inferior = reglas.premio_esperado_grupo - reglas.precio
        cota_superior = (cota_inferior + self.detector.p0 * reglas.premio_exacto_grupo
                         * self.detector.exceso_maximo)
        for g, (lider, veces) in enumerate(ctx.lideres_grupo):
            if cota_superior[g] < cota_inferior.max():
                continue
            p_predictiva, prob = self.detector.evaluar(veces, ctx.n)
            ve = (reglas.premio_esperado_grupo[g]
                  + (p_predictiva - self.detector.p0) * reglas.premio_exacto[lider]
                  - reglas.precio)
            mejora = ve > mejor_ve
            mejor_ve = np.where(mejora, ve, mejor_ve)
            mejor_numero = np.where(mejora, lider, mejor_numero)
            mejor_prob = np.where(mejora, prob, mejor_prob)
        return mejor_numero, mejor_ve, mejor_prob

    def sospechosos(self, umbral: float = 0.5) -> List[Tuple[int, float]]:
        """Números con probabilidad a posteriori de estar trucados > umbral."""
        self.detector.revisar_maquina(self.frecuencias, self.n)
        _, prob = self.detector.evaluar(self.frecuencias, self.n)
        orden = np.argsort(-prob, kind="stable")
        return [(int(i), float(prob[i])) for i in orden if prob[i] > umbral]

    # ---- Registro en tiempo real --------------------------------------------
    def registrar(self, lote: np.ndarray) -> None:
        """Anota un lote de resultados y actualiza los contadores en vivo."""
        k = len(lote)
        self._historial[self.n:self.n + k] = lote
        self.n += k
        self.frecuencias += np.bincount(lote, minlength=TOTAL_NUMEROS)
        self._suma += int(lote.sum(dtype=np.int64))
        self._pares += int(np.count_nonzero(lote % 2 == 0))
        self._altos += int(np.count_nonzero(lote >= self.corte))

    @property
    def historial(self) -> np.ndarray:
        return self._historial[:self.n]

    def estado_en_vivo(self) -> str:
        """Una línea con las métricas acumuladas hasta el momento."""
        if self.n == 0:
            return ""
        return (f"pares {fmt_pct(self._pares / self.n, 1)} · "
                f"media {fmt_dec(self._suma / self.n, 1)}")

    def comentar(self, numero: int, anterior: Optional[int]) -> str:
        """Comentario del Estadístico sobre un sorteo concreto (narración inicial)."""
        x = np.array([numero])
        rasgos = [
            "par" if numero % 2 == 0 else "impar",
            f"termina en {numero % 10}",
            f"suma {int(suma_cifras(x)[0])}",
            f"tercio {ETIQUETAS_TERCIOS[int(tercio_de(x)[0])]}",
            "alto" if numero >= self.corte else "bajo",
        ]
        props = catalogo_propiedades(self.corte)
        curiosidades = [nombre.split(" (")[0].lower()
                        for nombre in ("Trío (p. ej. 777)", "Capicúa (p. ej. 121)",
                                       "Escalera (p. ej. 345, 876)", "Número primo",
                                       "Cuadrado perfecto")
                        if props[nombre](x)[0]]
        if anterior is not None and anterior == numero:
            curiosidades.append("¡repite el anterior!")
        extra = f"  ★ {', '.join(curiosidades)}" if curiosidades else ""
        return f"→ sale el {fmt_num(numero)}: {' · '.join(rasgos)}{extra}"

    # ---- Análisis final -----------------------------------------------------
    def analizar(self) -> Informe:
        """Calcula la batería completa de estadísticas sobre todo el historial."""
        x = self.historial
        n = self.n
        t = self.teoria
        if n == 0:
            raise ValueError("No hay sorteos registrados.")

        frec = self.frecuencias
        c, d, u = descomponer(x)

        # Frecuencias de categorías -------------------------------------------
        terminaciones = np.bincount(u, minlength=10)
        tercios = np.bincount(tercio_de(x), minlength=3)
        sumas = np.bincount(c + d + u, minlength=28)
        raices = np.bincount(raiz_digital(x), minlength=10)
        posiciones = np.vstack([np.bincount(c, minlength=10),
                                np.bincount(d, minlength=10),
                                np.bincount(u, minlength=10)])

        # Calientes y fríos (empates por número ascendente) -------------------
        orden_desc = np.lexsort((UNIVERSO, -frec))
        orden_asc = np.lexsort((UNIVERSO, frec))
        calientes = [(int(i), int(frec[i])) for i in orden_desc[:10]]
        frios = [(int(i), int(frec[i])) for i in orden_asc[:10]]

        # Coleccionista: ¿en qué sorteo aparecieron ya los 1000 números? --------
        vistos, primera = np.unique(x, return_index=True)
        coleccion = int(primera.max()) + 1 if vistos.size == TOTAL_NUMEROS else None

        # Atrasos: sorteos transcurridos desde la última aparición -------------
        vistos_rev, idx_rev = np.unique(x[::-1], return_index=True)
        ultima = np.full(TOTAL_NUMEROS, -1, dtype=np.int64)
        ultima[vistos_rev] = n - 1 - idx_rev
        atraso_actual = np.where(ultima >= 0, n - 1 - ultima, n)

        # Hueco máximo: la mayor ausencia (cerrada o en curso) de cada número --
        orden = np.argsort(x, kind="stable")
        valores_ordenados = x[orden]
        mismo = valores_ordenados[1:] == valores_ordenados[:-1]
        hueco_maximo = atraso_actual.copy()
        if mismo.any():
            huecos = np.diff(orden)[mismo] - 1        # sorteos intermedios sin salir
            np.maximum.at(hueco_maximo, valores_ordenados[1:][mismo], huecos)
        primera_aparicion = np.full(TOTAL_NUMEROS, n, dtype=np.int64)
        primera_aparicion[vistos] = primera
        hueco_maximo = np.maximum(hueco_maximo, primera_aparicion)

        # Rachas -------------------------------------------------------------
        es_par = (x % 2 == 0)
        es_alto = (x >= self.corte)
        rachas: Dict[str, InfoRacha] = {}
        for marca, p, si, no in ((es_par, t.p_par, "Par", "Impar"),
                                 (es_alto, t.p_alto, "Alto", "Bajo")):
            valores, longitudes = codificar_rachas(marca)
            for tipo, objetivo, prob in ((si, True, p), (no, False, 1 - p)):
                propias = longitudes[valores == objetivo]
                en_curso = int(longitudes[-1]) if bool(valores[-1]) == objetivo else 0
                rachas[tipo] = InfoRacha(tipo, int(propias.max()) if propias.size else 0,
                                         en_curso, racha_maxima_esperada(n, prob))
        _, long_paridad = codificar_rachas(es_par)
        _, long_umbral = codificar_rachas(es_alto)
        k_max = int(max(long_paridad.max(), long_umbral.max()))
        rachas_paridad = np.bincount(long_paridad, minlength=k_max + 1)[1:]
        rachas_umbral = np.bincount(long_umbral, minlength=k_max + 1)[1:]

        valores_t, long_t = codificar_rachas(u)
        i_max = int(long_t.argmax())
        racha_terminacion = (int(long_t[i_max]), int(valores_t[i_max]))

        # Prueba de rachas de Wald-Wolfowitz sobre la paridad -------------------
        n1, n2 = int(es_par.sum()), int(n - es_par.sum())
        z_rachas, p_rachas = float("nan"), float("nan")
        if n1 > 0 and n2 > 0 and n > 2:
            mu = 2 * n1 * n2 / n + 1
            var = 2 * n1 * n2 * (2 * n1 * n2 - n) / (n ** 2 * (n - 1))
            if var > 0:
                z_rachas = (len(long_paridad) - mu) / math.sqrt(var)
                p_rachas = p_valor_normal(z_rachas)

        # Secuencia: repeticiones, autocorrelación y distancias -----------------
        repeticiones = int(np.count_nonzero(x[1:] == x[:-1]))
        autocorrelacion = float("nan")
        if n >= 3 and x[:-1].std() > 0 and x[1:].std() > 0:
            autocorrelacion = float(np.corrcoef(x[:-1], x[1:])[0, 1])
        distancias = np.bincount(np.abs(np.diff(x)), minlength=TOTAL_NUMEROS)

        # Evolución temporal (submuestreo logarítmico para dibujar) -------------
        indices = np.unique(np.geomspace(1, n, num=min(n, 2500)).astype(np.int64)) - 1
        cuenta = indices + 1
        evo_pares = np.cumsum(es_par, dtype=np.int64)[indices] / cuenta
        evo_altos = np.cumsum(es_alto, dtype=np.int64)[indices] / cuenta
        evo_media = np.cumsum(x, dtype=np.int64)[indices] / cuenta

        # Propiedades curiosas: observado vs teórico y puntuación z -------------
        propiedades = []
        for nombre, funcion in catalogo_propiedades(self.corte).items():
            p_teo = t.propiedades[nombre]
            p_obs = float(np.count_nonzero(funcion(x))) / n
            sd = math.sqrt(p_teo * (1 - p_teo) / n)
            z = (p_obs - p_teo) / sd if sd > 0 else 0.0
            propiedades.append((nombre, p_obs, p_teo, z))

        return Informe(
            n=n, corte=self.corte, teoria=t,
            media=float(x.mean()), mediana=float(np.median(x)),
            desviacion=float(x.std()), minimo=int(x.min()), maximo=int(x.max()),
            frecuencias=frec.copy(), chi2_numeros=prueba_chi2(frec, t.p_numero),
            distintos_vistos=int(vistos.size), sorteo_coleccion_completa=coleccion,
            calientes=calientes, frios=frios,
            entropia_numeros=entropia_bits(frec),
            entropia_terminaciones=entropia_bits(terminaciones),
            terminaciones=terminaciones,
            chi2_terminaciones=prueba_chi2(terminaciones, t.p_terminacion),
            pares=n1, altos=int(es_alto.sum()),
            tercios=tercios, chi2_tercios=prueba_chi2(tercios, t.p_tercio),
            sumas=sumas, chi2_sumas=prueba_chi2(sumas, t.p_suma),
            media_suma=float((c + d + u).mean()),
            raices=raices, chi2_raices=prueba_chi2(raices, t.p_raiz),
            posiciones=posiciones,
            chi2_posiciones=[prueba_chi2(fila, t.p_cifra) for fila in posiciones],
            rachas=rachas, rachas_paridad=rachas_paridad, rachas_umbral=rachas_umbral,
            racha_terminacion=racha_terminacion, repeticiones=repeticiones,
            prueba_rachas_z=z_rachas, prueba_rachas_p=p_rachas,
            autocorrelacion=autocorrelacion,
            atraso_actual=atraso_actual, hueco_maximo=hueco_maximo,
            distancias=distancias,
            evo_indice=cuenta, evo_pares=evo_pares, evo_altos=evo_altos,
            evo_media=evo_media, ultimos=x[-250:].copy(),
            propiedades=propiedades,
        )


# =============================================================================
# 7. LA PARTIDA: RIVALES, MESA DE JUEGO Y LIBRO DE CUENTAS
# =============================================================================

@dataclass
class ContextoLote:
    """Lo que puede saber cualquier jugador ANTES de cada sorteo de un lote.

    Todos los arrays tienen un elemento por sorteo del lote y se calculan solo
    con los resultados anteriores a ese sorteo (nadie mira el futuro). 'lote'
    son los resultados que van a salir y solo se usa para pagar los premios.
    """

    lote: np.ndarray
    n: np.ndarray                                      # sorteos ya celebrados
    lider: np.ndarray                                  # número más salido
    lideres_grupo: List[Tuple[np.ndarray, np.ndarray]]  # (número, veces) por grupo de VE
    atrasado: np.ndarray                               # el que más lleva sin salir


@dataclass
class Cuenta:
    """Libro de cuentas de un jugador."""

    nombre: str
    descripcion: str
    color: str
    apuestas: int = 0
    apostado: float = 0.0
    cobrado: float = 0.0
    cobro_esperado: float = 0.0     # lo que "debería" cobrar según los números elegidos
    aciertos: np.ndarray = field(default_factory=lambda: np.zeros(5, dtype=np.int64))

    @property
    def saldo(self) -> float:
        return self.cobrado - self.apostado

    @property
    def devuelto(self) -> float:
        """Fracción de lo apostado que ha vuelto en premios (1 = recupera todo)."""
        return self.cobrado / self.apostado if self.apostado else float("nan")

    @property
    def devuelto_esperado(self) -> float:
        """Lo que cabía esperar con los números elegidos, si el sorteo es justo."""
        return self.cobro_esperado / self.apostado if self.apostado else float("nan")


class Apostador:
    """Rival del Estadístico: apuesta 0,50 € en TODOS los sorteos con una regla fija."""

    nombre = "Apostador"
    descripcion = ""

    def elegir(self, ctx: ContextoLote) -> np.ndarray:
        raise NotImplementedError


class CazadorDeCalientes(Apostador):
    nombre = "Cazador de calientes"
    descripcion = "apuesta siempre al número que más ha salido"

    def elegir(self, ctx: ContextoLote) -> np.ndarray:
        return ctx.lider


class CazadorDeAtrasados(Apostador):
    nombre = "Cazador de atrasados"
    descripcion = "apuesta al que más tiempo lleva sin salir (falacia del jugador)"

    def elegir(self, ctx: ContextoLote) -> np.ndarray:
        return ctx.atrasado


class Supersticioso(Apostador):
    descripcion = "juega siempre su número de la suerte"

    def __init__(self, numero: int = 777):
        self.numero = numero
        self.nombre = f"Supersticioso ({fmt_num(numero)})"

    def elegir(self, ctx: ContextoLote) -> np.ndarray:
        return np.full(len(ctx.lote), self.numero, dtype=np.int64)


class ApostadorAleatorio(Apostador):
    nombre = "Aleatorio"
    descripcion = "elige un número al azar en cada sorteo"

    def __init__(self, semilla: int):
        self._rng = np.random.default_rng([semilla, 99])

    def elegir(self, ctx: ContextoLote) -> np.ndarray:
        return self._rng.integers(0, TOTAL_NUMEROS, size=len(ctx.lote))


@dataclass
class ResultadoPartida:
    """Resumen de la partida para la consola y los gráficos."""

    reglas: ReglasTriplex
    cuentas: List[Cuenta]           # [Estadístico, Estadístico obligado, rivales...]
    sorteos_saldo: np.ndarray       # nº de sorteo de cada muestra de saldo
    saldos: np.ndarray              # (jugadores, muestras)
    sorteos_mente: np.ndarray       # nº de sorteo de cada muestra de la "mente"
    mente_ve: np.ndarray            # VE estimado de su mejor apuesta en ese momento
    mente_prob: np.ndarray          # P(trucado) del número elegido en ese momento
    trucados: np.ndarray            # números que el Azar trucó (vacío si fue justo)
    factor: float
    sospechosos: List[Tuple[int, float]]
    prob_maquina: float             # P(máquina trucada) según el Estadístico, al final
    lambda_estimada: float          # factor de la trampa que estima (si la hay)

    @property
    def lambda_rentable(self) -> float:
        """Factor mínimo para que apostar a un número trucado tenga VE > 0."""
        r = self.reglas
        g = int(np.argmax(r.premio_esperado_grupo))
        i = int(r.representante[g])
        return 1 + (r.precio - r.premio_esperado[i]) / (r.premio_exacto[i] / TOTAL_NUMEROS)

    @property
    def estadistico(self) -> Cuenta:
        return self.cuentas[0]

    @property
    def rivales(self) -> List[Cuenta]:
        return self.cuentas[2:]


class MesaDeJuego:
    """Celebra la partida: antes de cada sorteo todos eligen número; luego se paga.

    Todo se calcula por lotes con numpy, pero cada decisión usa EXCLUSIVAMENTE
    los sorteos anteriores, igual que si se jugara uno a uno (lo comprueba
    test_simulador_triplex.py comparándolo con una versión sorteo a sorteo).
    """

    MUESTRAS = 1500
    PASO_REVISION = 100

    def __init__(self, reglas: ReglasTriplex, estadistico: JugadorEstadistico,
                 rivales: List[Apostador], n_total: int, azar: JugadorAzar):
        self.reglas = reglas
        self.estadistico = estadistico
        self.rivales = rivales
        self.azar = azar
        colores = P.CATEGORICA
        self.cuentas = [
            Cuenta("Estadístico", "apuesta solo si el valor esperado es positivo", colores[0]),
            Cuenta("Estadístico (obligado)", "si le obligan a jugar siempre, elige el número "
                   "de mayor valor esperado", colores[1]),
        ] + [Cuenta(r.nombre, r.descripcion, colores[2 + i]) for i, r in enumerate(rivales)]
        self.n = 0
        self._revision = 0                  # sorteo de la próxima revisión de la máquina
        self._lideres: Dict[object, Tuple[int, int]] = {"global": (0, 0)}
        for g in range(reglas.n_grupos):
            self._lideres[g] = (0, int(reglas.representante[g]))
        self._ultimo = np.full(TOTAL_NUMEROS, -1, dtype=np.int64)
        self._muestras_saldo = np.unique(
            np.linspace(0, n_total - 1, min(n_total, self.MUESTRAS)).astype(np.int64))
        self._saldos = np.zeros((len(self.cuentas), len(self._muestras_saldo)))
        self._muestras_mente = np.unique(
            np.geomspace(1, n_total, min(n_total, self.MUESTRAS)).astype(np.int64)) - 1
        self._mente_ve = np.zeros(len(self._muestras_mente))
        self._mente_prob = np.zeros(len(self._muestras_mente))

    # ---- un lote de sorteos --------------------------------------------------
    def proxima_revision(self, n: int) -> int:
        """Sorteo en el que el Estadístico vuelve a revisar si la máquina está
        trucada: cada 100 sorteos al principio y, después, cada vez que el
        historial ha crecido un 1 % (la sospecha cambia muy despacio)."""
        return n + max(self.PASO_REVISION, n // 100)

    def jugar_lote(self, lote: np.ndarray, frecuencias_antes: np.ndarray):
        """Todos apuestan antes de cada sorteo del lote y se liquidan los premios.
        Devuelve la decisión del Estadístico (número, VE estimado, P(trucado))."""
        frecuencias = frecuencias_antes.copy()
        salidas = []
        inicio = 0
        while inicio < len(lote):
            if self.n >= self._revision:
                self.estadistico.detector.revisar_maquina(frecuencias, self.n)
                self._revision = self.proxima_revision(self.n)
            fin = min(len(lote), inicio + self._revision - self.n)
            tramo = lote[inicio:fin]
            salidas.append(self._jugar_tramo(tramo, frecuencias))
            frecuencias += np.bincount(tramo, minlength=TOTAL_NUMEROS)
            inicio = fin
        return tuple(np.concatenate(partes) for partes in zip(*salidas))

    def _jugar_tramo(self, lote: np.ndarray, frecuencias_antes: np.ndarray):
        ctx = self._contexto(lote, frecuencias_antes)
        numero, ve, prob = self.estadistico.decidir_apuestas(ctx, self.reglas)
        decisiones = [(numero, ve > 0), (numero, None)]
        decisiones += [(r.elegir(ctx), None) for r in self.rivales]
        for fila, (numeros, apuesta) in enumerate(decisiones):
            self._liquidar(fila, np.asarray(numeros, dtype=np.int64), apuesta, lote)
        a, b = np.searchsorted(self._muestras_mente, [self.n, self.n + len(lote)])
        locales = self._muestras_mente[a:b] - self.n
        self._mente_ve[a:b] = ve[locales]
        self._mente_prob[a:b] = prob[locales]
        self.n += len(lote)
        return numero, ve, prob

    def _contexto(self, lote: np.ndarray, frecuencias_antes: np.ndarray) -> ContextoLote:
        tam = len(lote)
        # Nº de veces que ha salido lote[k] contando hasta el sorteo k inclusive
        orden = np.argsort(lote, kind="stable")
        ordenados = lote[orden]
        nuevo = np.ones(tam, dtype=bool)
        nuevo[1:] = ordenados[1:] != ordenados[:-1]
        inicio = np.maximum.accumulate(np.where(nuevo, np.arange(tam), 0))
        ocurrencia = np.empty(tam, dtype=np.int64)
        ocurrencia[orden] = np.arange(tam) - inicio + 1
        veces_tras = frecuencias_antes[lote] + ocurrencia

        lider, _ = self._avanzar_lider("global", lote, veces_tras)
        grupo_lote = self.reglas.grupo[lote]
        lideres_grupo = [self._avanzar_lider(g, lote, np.where(grupo_lote == g, veces_tras, 0))
                         for g in range(self.reglas.n_grupos)]
        atrasado = self._avanzar_atrasados(lote)
        return ContextoLote(lote, self.n + np.arange(tam), lider, lideres_grupo, atrasado)

    def _avanzar_lider(self, clave, lote: np.ndarray, veces: np.ndarray):
        """Número más salido (y sus veces) ANTES de cada sorteo; en caso de empate
        conserva el que llegó primero a esa cifra."""
        maximo, lider = self._lideres[clave]
        tam = len(lote)
        acumulado = np.maximum.accumulate(np.maximum(veces, maximo))
        antes = np.empty(tam, dtype=np.int64)
        antes[0] = maximo
        antes[1:] = acumulado[:-1]
        record = veces > antes
        posicion = np.maximum.accumulate(np.where(record, np.arange(tam), -1))
        lider_tras = np.where(posicion >= 0, lote[np.maximum(posicion, 0)], lider)
        lider_antes = np.empty(tam, dtype=np.int64)
        lider_antes[0] = lider
        lider_antes[1:] = lider_tras[:-1]
        self._lideres[clave] = (int(acumulado[-1]), int(lider_tras[-1]))
        return lider_antes, antes

    def _avanzar_atrasados(self, lote: np.ndarray) -> np.ndarray:
        """Número que más sorteos lleva sin salir ANTES de cada sorteo del lote
        (los que nunca han salido van primero, del menor al mayor).

        Truco vectorizado: se antepone un "evento virtual" por número, ordenado
        por su última aparición; el más atrasado en el instante τ es el primer
        evento cuya siguiente aparición es posterior a τ.
        """
        tam = len(lote)
        virtuales = np.lexsort((UNIVERSO, self._ultimo))
        eventos = np.concatenate([virtuales, lote])
        total = len(eventos)
        orden = np.argsort(eventos, kind="stable")
        ordenados = eventos[orden]
        siguiente = np.full(total, total, dtype=np.int64)
        mismo = ordenados[1:] == ordenados[:-1]
        siguiente[orden[:-1][mismo]] = orden[1:][mismo]
        techo = np.maximum.accumulate(siguiente)
        tau = TOTAL_NUMEROS - 1 + np.arange(tam)       # último evento visto antes del sorteo k
        atrasado = eventos[np.searchsorted(techo, tau, side="right")]
        vistos, desde_final = np.unique(lote[::-1], return_index=True)
        self._ultimo[vistos] = self.n + tam - 1 - desde_final
        return atrasado.astype(np.int64)

    def _liquidar(self, fila: int, numeros: np.ndarray, apuesta: Optional[np.ndarray],
                  lote: np.ndarray) -> None:
        cuenta = self.cuentas[fila]
        if apuesta is None:
            apuesta = np.ones(len(lote), dtype=bool)
        cobro = self.reglas.premio[numeros, lote].astype(np.float64) * apuesta
        movimiento = cobro - self.reglas.precio * apuesta
        a, b = np.searchsorted(self._muestras_saldo, [self.n, self.n + len(lote)])
        if b > a:
            acumulado = cuenta.saldo + np.cumsum(movimiento)
            self._saldos[fila, a:b] = acumulado[self._muestras_saldo[a:b] - self.n]
        k = int(apuesta.sum())
        cuenta.apuestas += k
        cuenta.apostado += self.reglas.precio * k
        cuenta.cobrado += float(cobro.sum())
        cuenta.cobro_esperado += float(self.reglas.premio_esperado[numeros][apuesta].sum())
        cuenta.aciertos += np.bincount(self.reglas.categoria[numeros, lote][apuesta],
                                       minlength=5)

    # ---- información ---------------------------------------------------------
    def estado_en_vivo(self) -> str:
        rivales = [c.saldo for c in self.cuentas[2:]]
        return (f"saldo Estadístico {fmt_euros(self.cuentas[0].saldo)} · "
                f"rivales {fmt_euros(sum(rivales) / len(rivales))} de media")

    def resultado(self) -> ResultadoPartida:
        return ResultadoPartida(
            reglas=self.reglas, cuentas=self.cuentas,
            sorteos_saldo=self._muestras_saldo + 1, saldos=self._saldos,
            sorteos_mente=self._muestras_mente + 1, mente_ve=self._mente_ve,
            mente_prob=self._mente_prob, trucados=self.azar.trucados,
            factor=self.azar.factor, sospechosos=self.estadistico.sospechosos(),
            prob_maquina=self.estadistico.detector.prob_maquina,
            lambda_estimada=self.estadistico.detector.lambda_estimada)


# =============================================================================
# 8. ORQUESTACIÓN DE LA SIMULACIÓN (con progreso en vivo)
# =============================================================================

def barra_progreso(fraccion: float, ancho: int = 24) -> str:
    llenos = int(round(fraccion * ancho))
    return "█" * llenos + "░" * (ancho - llenos)


def texto_decision(numero: int, ve: float, prob: float) -> str:
    """Cómo explica el Estadístico su decisión antes de un sorteo."""
    if ve > 0:
        return (f"apuesta 0,50 € al {fmt_num(numero)} (VE {fmt_euros(ve, 3)}, "
                f"P(trucado) {fmt_pct(prob, 0)})")
    return (f"no apuesta: su mejor opción, el {fmt_num(numero)}, "
            f"vale {fmt_euros(ve, 3)} por apuesta")


def simular(config: Configuracion) -> Tuple[JugadorEstadistico, MesaDeJuego, float]:
    """Pone a jugar al Azar, al Estadístico y a sus rivales."""
    azar = JugadorAzar(config.semilla, config.trucados, config.factor)
    estadistico = JugadorEstadistico(config.n_sorteos, config.corte)
    rivales = [CazadorDeCalientes(), CazadorDeAtrasados(), Supersticioso(777),
               ApostadorAleatorio(config.semilla)]
    n = config.n_sorteos
    mesa = MesaDeJuego(ReglasTriplex(), estadistico, rivales, n, azar)
    # ~60 actualizaciones de pantalla, con lotes de entre 1.000 y 250.000 sorteos
    tam_lote = int(min(max(n // 60, 1_000), 250_000))
    en_terminal = sys.stdout.isatty()

    print(f"\n▶ {azar.nombre} empieza a cantar números (semilla {config.semilla})")
    if not azar.es_justo:
        print(f"   (en secreto ha trucado {len(azar.trucados)} números para que salgan "
              f"{fmt_dec(azar.factor, 1)} veces más: ¿lo descubrirá el Estadístico?)")
    print(f"▶ {estadistico.nombre} decide antes de cada sorteo si apuesta y, "
          "después, lo analiza:\n")

    inicio = time.perf_counter()
    ultimo_refresco = 0.0
    for numero_lote, lote in enumerate(azar.sortear(n, tam_lote)):
        numeros_e, ve_e, prob_e = mesa.jugar_lote(lote, estadistico.frecuencias)
        if numero_lote == 0:
            anterior = None
            for i, numero in enumerate(lote[:SORTEOS_NARRADOS]):
                print(f"   #{i + 1:<3d} Estadístico: "
                      f"{texto_decision(int(numeros_e[i]), float(ve_e[i]), float(prob_e[i]))}")
                print("      " + estadistico.comentar(int(numero), anterior))
                anterior = int(numero)
            if n > SORTEOS_NARRADOS:
                print("   …")
            print()
        estadistico.registrar(lote)

        ahora = time.perf_counter()
        terminado = estadistico.n == n
        if en_terminal and (terminado or ahora - ultimo_refresco > 0.05):
            ultimo_refresco = ahora
            fraccion = estadistico.n / n
            linea = (f"\r   {barra_progreso(fraccion)} {100 * fraccion:5.1f} % · "
                     f"{fmt_int(estadistico.n)} sorteos · {estadistico.estado_en_vivo()} · "
                     f"{mesa.estado_en_vivo()}")
            print(linea.ljust(130), end="", flush=True)

    duracion = time.perf_counter() - inicio
    if en_terminal:
        print()
    else:
        print(f"   {fmt_int(estadistico.n)} sorteos · {estadistico.estado_en_vivo()} · "
              f"{mesa.estado_en_vivo()}")
    print(f"   Simulación completada en {fmt_dec(duracion, 3)} s.\n")
    return estadistico, mesa, duracion


# =============================================================================
# 9. INFORME POR CONSOLA
# =============================================================================

ANCHO_INFORME = 78


def _seccion(titulo: str) -> None:
    print("\n" + titulo)
    print("─" * ANCHO_INFORME)


def _tabla_categorias(etiquetas, observado, prob, n, cabecera="Valor") -> None:
    """Tabla: categoría · veces · % · esperado · desviación relativa."""
    print(f"   {cabecera:<10}{'Veces':>12}{'%':>10}{'Esperado':>14}{'Desv.':>10}")
    for etiqueta, obs, p in zip(etiquetas, observado, prob):
        esperado = n * p
        desv = (obs - esperado) / esperado if esperado > 0 else 0.0
        signo = "+" if desv >= 0 else ""
        print(f"   {str(etiqueta):<10}{fmt_int(obs):>12}{fmt_pct(obs / n):>10}"
              f"{fmt_dec(esperado, 1):>14}{signo + fmt_pct(desv, 1):>10}")


def imprimir_informe(inf: Informe, semilla: int) -> None:
    t = inf.teoria
    n = inf.n
    print("═" * ANCHO_INFORME)
    print(f" INFORME DEL ESTADÍSTICO · {fmt_int(n)} sorteos del Tríplex · semilla {semilla}")
    print("═" * ANCHO_INFORME)

    _seccion("[1] Resumen general")
    print(f"   Media ................ {fmt_dec(inf.media, 2):>10}   (teórica {fmt_dec(t.media, 2)})")
    print(f"   Mediana .............. {fmt_dec(inf.mediana, 1):>10}")
    print(f"   Desviación típica .... {fmt_dec(inf.desviacion, 2):>10}   (teórica {fmt_dec(t.desviacion, 2)})")
    print(f"   Mínimo / máximo ...... {fmt_num(inf.minimo) + ' / ' + fmt_num(inf.maximo):>10}")
    print(f"   Números distintos .... {fmt_int(inf.distintos_vistos):>10}   "
          f"(esperado {fmt_dec(t.distintos_esperados(n), 1)} de 1.000)")
    if inf.sorteo_coleccion_completa:
        print(f"   Colección completa ... sorteo #{fmt_int(inf.sorteo_coleccion_completa)}"
              f"   (esperado ≈ {fmt_int(t.coleccion_completa)}, problema del coleccionista)")
    else:
        print(f"   Colección completa ... aún faltan {fmt_int(1000 - inf.distintos_vistos)} números"
              f"   (en promedio hacen falta ≈ {fmt_int(t.coleccion_completa)} sorteos)")
    print("   Más salidos .......... " + ", ".join(f"{fmt_num(a)} (×{fmt_int(b)})" for a, b in inf.calientes[:5]))
    print("   Menos salidos ........ " + ", ".join(f"{fmt_num(a)} (×{fmt_int(b)})" for a, b in inf.frios[:5]))
    print(f"   Uniformidad 000-999 .. {inf.chi2_numeros.resumen()}")

    _seccion("[2] Terminaciones (última cifra)")
    _tabla_categorias(range(10), inf.terminaciones, t.p_terminacion, n, "Termina")
    print(f"   {inf.chi2_terminaciones.resumen()}")

    _seccion("[3] Paridad")
    print(f"   Pares ....... {fmt_int(inf.pares):>12}  {fmt_pct(inf.pares / n):>9}   (teórico 50,00 %)")
    print(f"   Impares ..... {fmt_int(inf.impares):>12}  {fmt_pct(inf.impares / n):>9}")
    print(f"   Prueba de rachas (Wald-Wolfowitz): z = {fmt_dec(inf.prueba_rachas_z, 3)}, "
          f"p = {fmt_p(inf.prueba_rachas_p)}")

    _seccion("[4] Intervalos (tercios)")
    _tabla_categorias(ETIQUETAS_TERCIOS, inf.tercios, t.p_tercio, n, "Tercio")
    print(f"   {inf.chi2_tercios.resumen()}")

    _seccion(f"[5] Umbral de corte: {fmt_num(inf.corte)}")
    print(f"   Bajos (< {fmt_num(inf.corte)}) . {fmt_int(inf.bajos):>12}  {fmt_pct(inf.bajos / n):>9}"
          f"   (teórico {fmt_pct(1 - t.p_alto)})")
    print(f"   Altos (≥ {fmt_num(inf.corte)}) . {fmt_int(inf.altos):>12}  {fmt_pct(inf.altos / n):>9}"
          f"   (teórico {fmt_pct(t.p_alto)})")

    _seccion("[6] Suma de las tres cifras (0-27)")
    moda = int(inf.sumas.argmax())
    print(f"   Suma media {fmt_dec(inf.media_suma, 3)} (teórica {fmt_dec(t.media_suma, 1)}) · "
          f"suma más frecuente: {moda} (×{fmt_int(inf.sumas[moda])})")
    filas = [range(0, 14), range(14, 28)]
    for fila in filas:
        print("   " + " ".join(f"{s:>5d}" for s in fila))
        print("   " + " ".join(f"{fmt_int(inf.sumas[s]):>5}" if inf.sumas[s] < 100_000
                                else f"{fmt_int(inf.sumas[s] // 1000) + 'k':>5}" for s in fila))
    print(f"   {inf.chi2_sumas.resumen()}")
    print(f"   Raíz digital: {inf.chi2_raices.resumen()}")

    _seccion("[7] Frecuencia de cada cifra por posición")
    print("   Posición  " + "".join(f"{c:>7d}" for c in range(10)) + "   χ² p-valor")
    for nombre, fila, prueba in zip(POSICIONES, inf.posiciones, inf.chi2_posiciones):
        celdas = "".join(f"{fmt_dec(100 * v / n, 1) + '%':>7}" for v in fila)
        print(f"   {nombre:<10}{celdas}   {fmt_p(prueba.p_valor)}")

    _seccion("[8] Rachas y secuencias")
    for clave in ("Par", "Impar", "Alto", "Bajo"):
        r = inf.rachas[clave]
        print(f"   {r.nombre:<6} · racha más larga {r.maxima:>3}  (esperada ≈ {fmt_dec(r.maxima_esperada, 1)})"
              f" · racha en curso {r.en_curso}")
    lt, cifra = inf.racha_terminacion
    print(f"   Misma terminación seguida: {lt} veces (terminación {cifra})")
    print(f"   Repeticiones inmediatas (mismo número dos veces seguidas): {fmt_int(inf.repeticiones)}"
          f" (esperado {fmt_dec(max(n - 1, 0) / 1000, 1)})")
    lim = Z95 / math.sqrt(n) if n > 0 else float("nan")
    print(f"   Autocorrelación (lag 1): r = {fmt_dec(inf.autocorrelacion, 4)}"
          f"  (margen del azar ± {fmt_dec(lim, 4)})")
    top_atraso = np.lexsort((UNIVERSO, -inf.atraso_actual))[:8]
    print("   Más atrasados: " + ", ".join(f"{fmt_num(i)} ({fmt_int(inf.atraso_actual[i])})" for i in top_atraso))
    record = int(np.lexsort((UNIVERSO, -inf.hueco_maximo))[0])
    print(f"   Récord de ausencia: el {fmt_num(record)} estuvo {fmt_int(inf.hueco_maximo[record])} sorteos sin salir"
          f" (hueco medio esperado: 999)")

    _seccion("[9] Propiedades curiosas: observado vs teórico")
    print(f"   {'Propiedad':<30}{'Observado':>11}{'Teórico':>11}{'z':>9}")
    for nombre, obs, teo, z in inf.propiedades:
        alerta = "  ←" if abs(z) > Z95 else ""
        print(f"   {nombre:<30}{fmt_pct(obs):>11}{fmt_pct(teo):>11}{fmt_dec(z, 2):>9}{alerta}")
    print("   (← fuera del margen del 95 %: con 12 propiedades, en ~1 de cada 2 simulaciones"
          "\n    alguna se sale por pura casualidad)")

    _seccion("[10] Calidad del azar")
    print(f"   Entropía de los números ....... {fmt_dec(inf.entropia_numeros, 4)} bits"
          f" (máximo {fmt_dec(math.log2(min(1000, n)), 4)})")
    print(f"   Entropía de las terminaciones . {fmt_dec(inf.entropia_terminaciones, 4)} bits"
          f" (máximo {fmt_dec(math.log2(min(10, n)), 4)})")
    pruebas = [inf.chi2_numeros, inf.chi2_terminaciones, inf.chi2_tercios,
               inf.chi2_sumas, inf.chi2_raices, *inf.chi2_posiciones]
    superadas = sum(1 for p in pruebas if not math.isnan(p.p_valor) and p.p_valor >= 0.05)
    print(f"   Pruebas χ² superadas al 5 % ... {superadas} de {len(pruebas)}")
    if inf.partida is not None:
        imprimir_partida(inf.partida)
    print("═" * ANCHO_INFORME)


def veredicto_partida(part: ResultadoPartida, breve: bool = False) -> List[str]:
    """Conclusión de la partida, en lenguaje llano ('breve' omite el apunte
    sobre la varianza, para que quepa en el gráfico)."""
    e = part.estadistico
    r = part.reglas
    mejor = r.premio_esperado_grupo.max() / r.precio
    perdida_rivales = -sum(c.saldo for c in part.rivales)
    lineas = []
    trampa_vista = part.prob_maquina > 0.5
    if e.apuestas == 0 and trampa_vista:
        lineas.append(f"El Estadístico ha descubierto la trampa (máquina trucada con un "
                      f"{fmt_pct(part.prob_maquina, 1)} de probabilidad; los trucados salen "
                      f"≈ {fmt_dec(part.lambda_estimada, 2)} veces más), pero NO apuesta: "
                      f"para ganar dinero haría falta que salieran más de "
                      f"{fmt_dec(part.lambda_rentable, 2)} veces más.")
    elif e.apuestas == 0:
        lineas.append(f"El Estadístico no ha apostado ni una vez: ningún número tenía valor "
                      f"esperado positivo (el mejor solo devuelve un {fmt_pct(mejor, 1)}).")
        lineas.append("Su mejor jugada era no jugar, y por eso no ha perdido nada.")
    elif e.saldo >= 0:
        lineas.append(f"El Estadístico ha descubierto la trampa (los trucados salen "
                      f"≈ {fmt_dec(part.lambda_estimada, 2)} veces más; compensa a partir de "
                      f"{fmt_dec(part.lambda_rentable, 2)}), ha apostado {fmt_int(e.apuestas)} "
                      f"veces y gana {fmt_euros(e.saldo)}.")
    else:
        lineas.append(f"El Estadístico ha apostado {fmt_int(e.apuestas)} veces porque creyó "
                      f"ver un sesgo, y pierde {fmt_euros(e.saldo)}.")
    # ¿Cuántos sorteos hacen falta para que elegir bien se note frente al peor número?
    mejor_g, peor_g = int(np.argmax(r.premio_esperado_grupo)), int(np.argmin(r.premio_esperado_grupo))
    mejor_i = int(r.representante[mejor_g])
    peor_i = 777 if r.grupo[777] == peor_g else int(r.representante[peor_g])
    diferencia = r.premio_esperado[mejor_i] - r.premio_esperado[peor_i]
    if diferencia > 0 and not breve:
        necesarios = (Z95 * math.sqrt(r.varianza[mejor_i] + r.varianza[peor_i]) / diferencia) ** 2
        lineas.append(f"Obligado a jugar, elige números de tipo «{r.describir_grupo(mejor_g)}» "
                      f"(devuelven {fmt_pct(r.premio_esperado[mejor_i] / r.precio, 1)} frente al "
                      f"{fmt_pct(r.premio_esperado[peor_i] / r.precio, 1)} de un {fmt_num(peor_i)}), "
                      f"pero la suerte pesa tanto que hacen falta unos {fmt_int(round(necesarios, -3))} "
                      f"sorteos para que esa ventaja se note con un 95 % de confianza.")
    if perdida_rivales > 0:
        lineas.append(f"Sus cuatro rivales, que apuestan siempre, pierden entre todos "
                      f"{fmt_dec(perdida_rivales, 2)} €.")
    else:
        lineas.append(f"Sus cuatro rivales, que apuestan siempre, ganan entre todos "
                      f"{fmt_dec(-perdida_rivales, 2)} € (pura suerte en una serie corta).")
    if len(part.trucados):
        trucados = ", ".join(fmt_num(t) for t in part.trucados)
        lineas.append(f"El Azar confiesa: había trucado {trucados} "
                      f"(salían {fmt_dec(part.factor, 1)} veces más).")
        sospechas = [num for num, _ in part.sospechosos]
        acertados = sorted(set(sospechas) & set(int(t) for t in part.trucados))
        falsos = sorted(set(sospechas) - set(int(t) for t in part.trucados))
        lineas.append(f"El Estadístico ha desenmascarado {len(acertados)} de {len(part.trucados)}"
                      + (f" ({', '.join(fmt_num(x) for x in acertados)})" if acertados else "")
                      + (f" y ha sospechado sin razón de {len(falsos)}" if falsos else "") + ".")
    elif part.sospechosos:
        lineas.append("El Estadístico sospecha de " + ", ".join(
            f"{fmt_num(num)} ({fmt_pct(p, 0)})" for num, p in part.sospechosos[:5])
            + ", pero el sorteo era justo: casualidad.")
    return lineas


def imprimir_partida(part: ResultadoPartida) -> None:
    r = part.reglas
    _seccion("[11] La partida: ¿puede el Estadístico ganar al Azar?")
    print(f"   Apuesta: {fmt_dec(r.precio, 2)} € por número · se cobra solo el premio más alto")
    print(f"   Premios: {r.resumen_premios()}")
    print("\n   Lo que devuelve, de media, cada tipo de número (sorteo justo):")
    for g in np.argsort(-r.premio_esperado_grupo):
        pe = r.premio_esperado_grupo[g]
        print(f"     {r.describir_grupo(g):<38}{len(r.miembros[g]):>5} núm.   devuelve "
              f"{fmt_pct(pe / r.precio):>8}   VE {fmt_euros(pe - r.precio, 4)} por apuesta")
    print("   → El pasado no cambia las probabilidades, pero el TIPO de número sí cambia el premio")
    print("     esperado. Aun así, todos pierden: la única forma de no perder es no jugar.")

    print(f"\n   {'Jugador':<26}{'Apuestas':>10}{'Apostado':>13}{'Cobrado':>13}{'Saldo':>14}"
          f"{'Devuelto':>10}{'Esperado':>10}{'Exactos':>9}")
    for c in part.cuentas:
        devuelto = fmt_pct(c.devuelto, 1) if c.apuestas else "—"
        esperado = fmt_pct(c.devuelto_esperado, 1) if c.apuestas else "—"
        print(f"   {c.nombre:<26}{fmt_int(c.apuestas):>10}{fmt_dec(c.apostado, 2) + ' €':>13}"
              f"{fmt_dec(c.cobrado, 2) + ' €':>13}{fmt_euros(c.saldo):>14}{devuelto:>10}"
              f"{esperado:>10}{fmt_int(c.aciertos[0]):>9}")
    print("   (Esperado = lo que cabía esperar con los números que eligió, si el sorteo es justo)")
    print()
    for linea in veredicto_partida(part):
        print(f"   ▸ {linea}")


# =============================================================================
# 10. VISUALIZACIÓN
# =============================================================================

def configurar_estilo() -> None:
    """Estilo sobrio: superficie clara, rejilla fina, tinta neutra."""
    plt.rcParams.update({
        "figure.facecolor": P.FONDO,
        "savefig.facecolor": P.FONDO,
        "axes.facecolor": P.SUPERFICIE,
        "axes.edgecolor": P.EJE,
        "axes.linewidth": 0.8,
        "axes.labelcolor": P.TINTA_2,
        "axes.labelsize": 8.5,
        "axes.titlecolor": P.TINTA,
        "axes.titlesize": 11,
        "axes.titleweight": "bold",
        "axes.titlelocation": "left",
        "axes.titlepad": 18,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "grid.color": P.REJILLA,
        "grid.linewidth": 0.7,
        "xtick.color": P.EJE,
        "ytick.color": P.EJE,
        "xtick.labelcolor": P.TINTA_2,
        "ytick.labelcolor": P.TINTA_2,
        "xtick.labelsize": 8,
        "ytick.labelsize": 8,
        "legend.frameon": False,
        "legend.fontsize": 8,
        "legend.labelcolor": P.TINTA_2,
        "font.family": "sans-serif",
        "font.sans-serif": ["Segoe UI", "Helvetica Neue", "Arial", "DejaVu Sans"],
    })


def _formato_miles(valor, _pos=None) -> str:
    """Etiqueta de eje: enteros con punto de miles; decimales con coma."""
    if float(valor).is_integer():
        return fmt_int(valor)
    return fmt_dec(valor, 1 if abs(valor) >= 1 else 2)


def norma_centrada(esperado: float, valores: np.ndarray) -> TwoSlopeNorm:
    """Escala divergente centrada en el valor esperado y que nunca baja de 0."""
    desv = max(float(np.abs(np.asarray(valores) - esperado).max()), 1e-9)
    return TwoSlopeNorm(vcenter=esperado, vmin=max(0.0, esperado - desv),
                        vmax=esperado + desv)


class VisualizadorTriplex:
    """Construye los dos paneles gráficos a partir de un Informe."""

    def __init__(self, informe: Informe, semilla: int):
        self.inf = informe
        self.semilla = semilla
        configurar_estilo()

    # ---- utilidades comunes -------------------------------------------------
    @staticmethod
    def _titulo(ax, titulo: str, subtitulo: str = "") -> None:
        ax.set_title(titulo)
        if subtitulo:
            ax.annotate(subtitulo, xy=(0, 1), xycoords="axes fraction",
                        xytext=(0, 5), textcoords="offset points",
                        fontsize=8, color=P.TINTA_2, va="bottom", ha="left")

    @staticmethod
    def _rejilla_y(ax) -> None:
        ax.yaxis.grid(True)
        ax.set_axisbelow(True)
        ax.yaxis.set_major_formatter(FuncFormatter(_formato_miles))
        ax.tick_params(axis="both", length=0)

    def _barras_vs_esperado(self, ax, x, observado, prob, n=None,
                            ancho=0.72, etiquetas=None) -> None:
        """Barras observadas + raya del valor esperado + margen del azar (IC 95 %)."""
        n = self.inf.n if n is None else n
        x = np.asarray(x, dtype=float)
        prob = np.asarray(prob, dtype=float)
        esperado = n * prob
        margen = Z95 * np.sqrt(n * prob * (1 - prob))
        ax.bar(x, observado, width=ancho, color=P.SERIE_1, linewidth=0, zorder=2)
        ax.vlines(x, np.maximum(esperado - margen, 0), esperado + margen,
                  color=P.TINTA_SUAVE, linewidth=1.3, zorder=3)
        ax.hlines(esperado, x - ancho / 2, x + ancho / 2,
                  color=P.TINTA, linewidth=1.8, zorder=4)
        tope = max(float(np.max(observado)), float(np.max(esperado + margen)))
        ax.set_ylim(0, tope * 1.08 if tope > 0 else 1)
        if etiquetas is not None:
            ax.set_xticks(x)
            ax.set_xticklabels(etiquetas)
        self._rejilla_y(ax)

    @staticmethod
    def _leyenda_barras() -> List:
        return [Patch(facecolor=P.SERIE_1, label="Observado"),
                Line2D([], [], color=P.TINTA, marker="_", linestyle="None",
                       markersize=14, markeredgewidth=1.8, label="Esperado por la teoría"),
                Line2D([], [], color=P.TINTA_SUAVE, marker="|", linestyle="None",
                       markersize=12, markeredgewidth=1.3,
                       label="Margen normal del azar (IC 95 %)")]

    def _meta(self) -> str:
        plural = "s" if self.inf.n != 1 else ""
        return (f"{fmt_int(self.inf.n)} sorteo{plural} · semilla {self.semilla} · "
                f"corte alto/bajo {fmt_num(self.inf.corte)}")

    # ---- PANEL 1: distribución ---------------------------------------------
    def figura_distribucion(self):
        fig = plt.figure(figsize=(20, 12.5), layout="constrained")
        fig.get_layout_engine().set(h_pad=0.12, w_pad=0.12, hspace=0.06, wspace=0.04)
        gs = GridSpec(3, 4, figure=fig, height_ratios=[1, 1, 0.82],
                      width_ratios=[1.15, 0.8, 1.05, 0.95])
        self._panel_terminaciones(fig.add_subplot(gs[0, 0]))
        self._panel_tercios(fig.add_subplot(gs[0, 1]))
        self._panel_paridad_umbral(fig.add_subplot(gs[0, 2]))
        self._panel_ficha(fig.add_subplot(gs[0:2, 3]))
        self._panel_suma(fig.add_subplot(gs[1, 0]))
        self._panel_raiz(fig.add_subplot(gs[1, 1]))
        self._panel_posiciones(fig.add_subplot(gs[1, 2]))
        self._panel_mapa_numeros(fig.add_subplot(gs[2, :]))
        fig.suptitle(f"Tríplex · Panel 1 — Distribución de resultados      ({self._meta()})",
                     x=0.006, ha="left", fontsize=15, fontweight="bold", color=P.TINTA)
        fig.legend(handles=self._leyenda_barras(), loc="outside upper right", ncols=3,
                   fontsize=9)
        return fig

    def _panel_terminaciones(self, ax) -> None:
        inf = self.inf
        self._barras_vs_esperado(ax, range(10), inf.terminaciones,
                                 inf.teoria.p_terminacion, etiquetas=[str(i) for i in range(10)])
        mas = int(inf.terminaciones.argmax())
        self._titulo(ax, "Terminaciones (última cifra)",
                     f"La más repetida: {mas} · {inf.chi2_terminaciones.veredicto()} "
                     f"(p = {fmt_p(inf.chi2_terminaciones.p_valor)})")
        ax.set_xlabel("Cifra final")
        ax.set_ylabel("Sorteos")

    def _panel_tercios(self, ax) -> None:
        inf = self.inf
        self._barras_vs_esperado(ax, range(3), inf.tercios, inf.teoria.p_tercio,
                                 ancho=0.62, etiquetas=ETIQUETAS_TERCIOS)
        self._titulo(ax, "Intervalos (tercios)",
                     f"χ² p = {fmt_p(inf.chi2_tercios.p_valor)} · "
                     f"{', '.join(fmt_pct(v / inf.n, 1) for v in inf.tercios)}")
        ax.set_ylabel("Sorteos")

    def _panel_paridad_umbral(self, ax) -> None:
        """Dos barras 100 %: pares/impares y bajos/altos, con el reparto teórico marcado."""
        inf = self.inf
        filas = [
            ("Paridad", inf.pares / inf.n, inf.teoria.p_par, ("Pares", "Impares"),
             (inf.pares, inf.impares)),
            (f"Umbral {fmt_num(inf.corte)}", inf.bajos / inf.n, 1 - inf.teoria.p_alto,
             (f"Bajos (< {fmt_num(inf.corte)})", f"Altos (≥ {fmt_num(inf.corte)})"),
             (inf.bajos, inf.altos)),
        ]
        for y, (_, frac, teorico, nombres, cuentas) in zip((1, 0), filas):
            ax.barh(y, frac, height=0.56, color=P.SERIE_1, edgecolor=P.SUPERFICIE, linewidth=2)
            ax.barh(y, 1 - frac, left=frac, height=0.56, color=P.SERIE_1_CLARO,
                    edgecolor=P.SUPERFICIE, linewidth=2)
            ax.vlines(teorico, y - 0.36, y + 0.36, color=P.TINTA, linewidth=1.8, zorder=4)
            for x0, ancho, nombre, cuenta, color, ha in (
                    (0, frac, nombres[0], cuentas[0], "white", "left"),
                    (frac, 1 - frac, nombres[1], cuentas[1], P.TINTA, "right")):
                texto = f"{nombre}\n{fmt_pct(ancho)} · {fmt_int(cuenta)}"
                if ancho >= 0.22:
                    xt = x0 + 0.02 if ha == "left" else x0 + ancho - 0.02
                    ax.text(xt, y, texto, ha=ha, va="center", fontsize=8.5, color=color)
                else:   # no cabe dentro: se escribe fuera del extremo de la barra
                    xt = -0.02 if ha == "left" else 1.02
                    ax.text(xt, y, texto, ha="right" if ha == "left" else "left",
                            va="center", fontsize=8, color=P.TINTA_2, clip_on=False)
        ax.set_yticks([1, 0])
        ax.set_yticklabels([f[0] for f in filas], fontsize=9, color=P.TINTA)
        ax.set_xlim(0, 1)
        ax.set_ylim(-0.6, 1.6)
        ax.xaxis.set_major_formatter(PercentFormatter(1.0, decimals=0))
        ax.xaxis.grid(True)
        ax.set_axisbelow(True)
        ax.tick_params(length=0)
        ax.spines["left"].set_visible(False)
        self._titulo(ax, "Paridad y umbral alto/bajo",
                     "Raya negra = reparto teórico · " +
                     f"z paridad = {fmt_dec(dict((p[0], p[3]) for p in inf.propiedades)['Par'], 2)}")

    def _panel_ficha(self, ax) -> None:
        """Ficha resumen del Estadístico (texto alineado)."""
        inf, t = self.inf, self.inf.teoria
        ax.axis("off")
        ax.set_facecolor(P.SUPERFICIE)
        r = inf.rachas
        record = int(np.lexsort((UNIVERSO, -inf.atraso_actual))[0])
        coleccion = (f"sorteo #{fmt_int(inf.sorteo_coleccion_completa)}"
                     if inf.sorteo_coleccion_completa
                     else f"faltan {fmt_int(1000 - inf.distintos_vistos)}")
        caliente, veces = inf.calientes[0]
        frio, veces_frio = inf.frios[0]
        lineas = [
            ("RESUMEN", None),
            ("Media", f"{fmt_dec(inf.media, 2)}  (teo. {fmt_dec(t.media, 1)})"),
            ("Mediana", fmt_dec(inf.mediana, 1)),
            ("Desv. típica", f"{fmt_dec(inf.desviacion, 1)}  (teo. {fmt_dec(t.desviacion, 1)})"),
            ("Distintos vistos", f"{fmt_int(inf.distintos_vistos)} / 1.000"),
            ("Colección 000-999", coleccion),
            ("Más salido", f"{fmt_num(caliente)}  ×{fmt_int(veces)}"),
            ("Menos salido", f"{fmt_num(frio)}  ×{fmt_int(veces_frio)}"),
            ("Más atrasado", f"{fmt_num(record)}  ({fmt_int(inf.atraso_actual[record])} sorteos)"),
            ("", None),
            ("RACHAS MÁS LARGAS", None),
            ("Pares / impares", f"{r['Par'].maxima} / {r['Impar'].maxima}"
                                f"  (≈{fmt_dec(r['Par'].maxima_esperada, 0)})"),
            ("Altos / bajos", f"{r['Alto'].maxima} / {r['Bajo'].maxima}"),
            ("Misma terminación", f"{inf.racha_terminacion[0]}  (el {inf.racha_terminacion[1]})"),
            ("Repite número", f"{fmt_int(inf.repeticiones)}  (esp. {fmt_dec(max(inf.n - 1, 0) / 1000, 1)})"),
            ("", None),
            ("PRUEBAS DE AZAR  (p-valor)", None),
            ("χ² 1000 números", fmt_p(inf.chi2_numeros.p_valor)),
            ("χ² terminaciones", fmt_p(inf.chi2_terminaciones.p_valor)),
            ("χ² tercios", fmt_p(inf.chi2_tercios.p_valor)),
            ("χ² suma de cifras", fmt_p(inf.chi2_sumas.p_valor)),
            ("Rachas paridad", fmt_p(inf.prueba_rachas_p)),
            ("Autocorrelación", f"r = {fmt_dec(inf.autocorrelacion, 4)}"),
            ("Entropía", f"{fmt_dec(inf.entropia_numeros, 3)} bits"),
        ]
        ax.text(0.0, 1.0, "Ficha del Estadístico", transform=ax.transAxes,
                fontsize=11, fontweight="bold", color=P.TINTA, va="top")
        ax.text(0.0, 0.965, "p ≥ 0,05 → compatible con un sorteo justo",
                transform=ax.transAxes, fontsize=8, color=P.TINTA_2, va="top")
        y = 0.915
        paso = 0.875 / len(lineas)
        for clave, valor in lineas:
            if valor is None:
                ax.text(0.0, y, clave, transform=ax.transAxes, fontsize=8,
                        fontweight="bold", color=P.TINTA_SUAVE, va="top")
            else:
                ax.text(0.0, y, clave, transform=ax.transAxes, fontsize=9,
                        color=P.TINTA_2, va="top")
                ax.text(1.0, y, valor, transform=ax.transAxes, fontsize=9,
                        color=P.TINTA, va="top", ha="right")
            y -= paso

    def _panel_suma(self, ax) -> None:
        inf = self.inf
        self._barras_vs_esperado(ax, range(28), inf.sumas, inf.teoria.p_suma, ancho=0.74)
        ax.set_xticks(range(0, 28, 3))
        ax.set_xlim(-0.8, 27.8)
        self._titulo(ax, "Suma de las tres cifras",
                     f"Media {fmt_dec(inf.media_suma, 2)} (teórica 13,5) · "
                     f"χ² p = {fmt_p(inf.chi2_sumas.p_valor)}")
        ax.set_xlabel("Suma (p. ej. 274 → 2+7+4 = 13)")
        ax.set_ylabel("Sorteos")

    def _panel_raiz(self, ax) -> None:
        inf = self.inf
        self._barras_vs_esperado(ax, range(10), inf.raices, inf.teoria.p_raiz,
                                 etiquetas=[str(i) for i in range(10)])
        self._titulo(ax, "Raíz digital",
                     f"Suma reiterada hasta 1 cifra · p = {fmt_p(inf.chi2_raices.p_valor)}")
        ax.set_xlabel("Raíz (0 solo para el 000)")

    def _panel_posiciones(self, ax) -> None:
        """Mapa de calor 3 x 10: % de cada cifra en cada posición (centro = 10 %)."""
        inf = self.inf
        pct = 100 * inf.posiciones / inf.n
        anotaciones = np.vectorize(lambda v: fmt_dec(v, 1))(pct)
        sns.heatmap(pct, ax=ax, cmap=MAPA_DIVERGENTE, norm=norma_centrada(10.0, pct),
                    annot=anotaciones, fmt="", annot_kws={"fontsize": 7.5},
                    linewidths=2, linecolor=P.SUPERFICIE, square=False,
                    cbar_kws={"label": "% de apariciones", "shrink": 0.85, "pad": 0.02},
                    xticklabels=list(range(10)), yticklabels=POSICIONES)
        ax.tick_params(length=0)
        ax.set_yticklabels(POSICIONES, rotation=0)
        ax.set_xlabel("Cifra")
        p_min = min(p.p_valor for p in inf.chi2_posiciones)
        self._titulo(ax, "Cifras por posición",
                     f"% de cada cifra · teórico 10 % · menor p = {fmt_p(p_min)}")
        barra = ax.collections[0].colorbar
        barra.outline.set_visible(False)
        barra.ax.tick_params(length=0, labelsize=7.5, labelcolor=P.TINTA_2)
        barra.ax.yaxis.label.set_color(P.TINTA_2)
        barra.ax.yaxis.label.set_fontsize(8)

    def _panel_mapa_numeros(self, ax) -> None:
        """Los 1000 números en una rejilla 10 x 100 coloreada por su desviación."""
        inf = self.inf
        matriz = inf.frecuencias.reshape(10, 100)
        esperado = inf.n / TOTAL_NUMEROS
        imagen = ax.imshow(matriz, aspect="auto", cmap=MAPA_DIVERGENTE,
                           norm=norma_centrada(esperado, matriz), interpolation="nearest")
        ax.set_yticks(range(10))
        ax.set_yticklabels([f"{c}xx" for c in range(10)])
        ax.set_xticks(range(0, 100, 5))
        ax.set_xticklabels([f"x{v:02d}" for v in range(0, 100, 5)])
        ax.tick_params(length=0)
        for lado in ax.spines.values():
            lado.set_visible(False)
        barra = plt.colorbar(imagen, ax=ax, pad=0.008, fraction=0.025, aspect=12)
        barra.outline.set_visible(False)
        barra.ax.tick_params(length=0, labelsize=7.5, labelcolor=P.TINTA_2)
        barra.set_label("Veces que ha salido", color=P.TINTA_2, fontsize=8)
        barra.ax.yaxis.set_major_formatter(FuncFormatter(_formato_miles))
        calientes = ", ".join(fmt_num(a) for a, _ in inf.calientes[:5])
        frios = ", ".join(fmt_num(a) for a, _ in inf.frios[:5])
        self._titulo(ax, "Mapa de los 1000 números",
                     f"Fila = centenas · columna = dos últimas cifras · rojo = sale más de lo esperado "
                     f"({fmt_dec(esperado, 1)} veces), azul = menos · "
                     f"Calientes: {calientes} · Fríos: {frios}")

    # ---- PANEL 2: dinámica, rachas y patrones --------------------------------
    def figura_dinamica(self):
        fig = plt.figure(figsize=(20, 12.5), layout="constrained")
        fig.get_layout_engine().set(h_pad=0.12, w_pad=0.12, hspace=0.07, wspace=0.05)
        # Cada fila es una sub-figura independiente: así las etiquetas largas del
        # detector de anomalías no desalinean las columnas de las filas de arriba.
        filas = fig.subfigures(3, 1, height_ratios=[0.9, 1, 1], hspace=0.04)
        fila_evolucion = filas[0].subplots(1, 3)
        fila_rachas = filas[1].subplots(1, 3)
        fila_patrones = filas[2].subplots(1, 2, width_ratios=[2, 1.05])
        inf, t = self.inf, self.inf.teoria
        self._panel_evolucion(fila_evolucion[0], inf.evo_pares, t.p_par,
                              "Proporción de pares acumulada", es_proporcion=True)
        self._panel_evolucion(fila_evolucion[1], inf.evo_altos, t.p_alto,
                              f"Proporción de altos (≥ {fmt_num(inf.corte)}) acumulada",
                              es_proporcion=True)
        self._panel_evolucion(fila_evolucion[2], inf.evo_media, t.media,
                              "Media acumulada de los números",
                              es_proporcion=False, sigma=t.desviacion)
        self._panel_rachas(fila_rachas[0])
        self._panel_atrasos(fila_rachas[1])
        self._panel_distancias(fila_rachas[2])
        self._panel_trazado(fila_patrones[0])
        self._panel_anomalias(fila_patrones[1])
        fig.suptitle(f"Tríplex · Panel 2 — Evolución, rachas y patrones      ({self._meta()})",
                     x=0.006, ha="left", fontsize=15, fontweight="bold", color=P.TINTA)
        return fig

    def _panel_evolucion(self, ax, serie, esperado, titulo: str,
                         es_proporcion: bool, sigma: Optional[float] = None) -> None:
        """Ley de los grandes números: la serie acumulada converge hacia lo esperado."""
        inf = self.inf
        x = inf.evo_indice.astype(float)
        sd = math.sqrt(esperado * (1 - esperado)) if es_proporcion else sigma
        margen = Z95 * sd / np.sqrt(x)
        # Se omiten los primeros sorteos (muy ruidosos) para que la escala sea legible
        inicio = 30 if inf.n >= 300 else 1
        m = x >= inicio
        ax.fill_between(x[m], esperado - margen[m], esperado + margen[m],
                        color=P.BANDA, linewidth=0, label="Margen del azar (IC 95 %)")
        ax.axhline(esperado, color=P.TINTA_2, linewidth=1, linestyle=(0, (4, 3)),
                   label=f"Esperado ({fmt_pct(esperado) if es_proporcion else fmt_dec(esperado, 1)})")
        ax.plot(x[m], serie[m], color=P.SERIE_1, linewidth=1.8, label="Observado",
                marker="o" if m.sum() < 3 else None, markersize=5)
        if inf.n >= 10:
            ax.set_xscale("log")
        else:
            ax.xaxis.set_major_locator(MaxNLocator(integer=True))
        ax.xaxis.set_major_formatter(FuncFormatter(_formato_miles))
        if es_proporcion:
            ax.yaxis.set_major_formatter(PercentFormatter(1.0, decimals=0))
        ax.yaxis.grid(True)
        ax.set_axisbelow(True)
        ax.tick_params(length=0)
        ax.set_xlabel("Sorteos acumulados" + (" (escala logarítmica)" if inf.n >= 10 else ""))
        final = serie[-1]
        valor_final = fmt_pct(final) if es_proporcion else fmt_dec(final, 2)
        ax.annotate(valor_final, xy=(x[-1], final), xytext=(-4, 8),
                    textcoords="offset points", ha="right", fontsize=8.5,
                    color=P.TINTA, fontweight="bold")
        ax.legend(loc="upper right", fontsize=7.5)
        self._titulo(ax, titulo, f"Valor final: {valor_final} · el margen se estrecha como 1/√n")
        if es_proporcion:
            lo = max(0.0, min(float(serie[m].min()), float((esperado - margen[m]).min())))
            hi = min(1.0, max(float(serie[m].max()), float((esperado + margen[m]).max())))
            rango = hi - lo
            ax.set_ylim(lo - 0.05 * rango, hi + 0.30 * rango)
        else:
            lo = min(float(serie[m].min()), float((esperado - margen[m]).min()))
            hi = max(float(serie[m].max()), float((esperado + margen[m]).max()))
            rango = hi - lo
            ax.set_ylim(lo - 0.05 * rango, hi + 0.30 * rango)

    def _panel_rachas(self, ax) -> None:
        """Distribución de longitudes de racha (par/impar y alto/bajo) vs teoría."""
        inf, t = self.inf, self.inf.teoria
        k_max = min(len(inf.rachas_paridad), 20)
        k = np.arange(1, k_max + 1)
        ancho = 0.4
        ax.bar(k - ancho / 2, inf.rachas_paridad[:k_max], width=ancho, color=P.SERIE_1,
               linewidth=0, label="Rachas par/impar")
        ax.bar(k + ancho / 2, inf.rachas_umbral[:k_max], width=ancho, color=P.SERIE_2,
               linewidth=0, label="Rachas alto/bajo")
        esp_paridad = (rachas_esperadas(inf.n, t.p_par, k_max)
                       + rachas_esperadas(inf.n, 1 - t.p_par, k_max))
        esp_umbral = (rachas_esperadas(inf.n, t.p_alto, k_max)
                      + rachas_esperadas(inf.n, 1 - t.p_alto, k_max))
        ax.plot(k, esp_paridad, color=P.TINTA, linewidth=1.2, marker="o", markersize=3.5,
                label="Esperado" + (" (ambas)" if np.allclose(esp_paridad, esp_umbral) else " par/impar"))
        if not np.allclose(esp_paridad, esp_umbral):
            ax.plot(k, esp_umbral, color=P.TINTA_2, linewidth=1.2, marker="s", markersize=3,
                    linestyle=(0, (3, 2)), label="Esperado alto/bajo")
        ax.set_yscale("log")
        ax.set_ylim(bottom=0.5)
        ax.set_xticks(k if k_max <= 12 else np.arange(1, k_max + 1, 2))
        ax.yaxis.set_major_formatter(FuncFormatter(_formato_miles))
        ax.yaxis.grid(True)
        ax.set_axisbelow(True)
        ax.tick_params(length=0)
        ax.set_xlabel("Longitud de la racha (sorteos seguidos del mismo tipo)")
        ax.set_ylabel("Nº de rachas (escala log.)")
        ax.legend(loc="upper right", fontsize=7.5)
        r = inf.rachas
        self._titulo(ax, "Rachas",
                     f"Más largas: par {r['Par'].maxima}, impar {r['Impar'].maxima}, "
                     f"alto {r['Alto'].maxima}, bajo {r['Bajo'].maxima} · "
                     f"Wald-Wolfowitz p = {fmt_p(inf.prueba_rachas_p)}")

    def _panel_atrasos(self, ax) -> None:
        """Los 15 números que llevan más sorteos sin salir."""
        inf = self.inf
        top = np.lexsort((UNIVERSO, -inf.atraso_actual))[:15]
        valores = inf.atraso_actual[top]
        y = np.arange(len(top))[::-1]
        ax.barh(y, valores, height=0.68, color=P.SERIE_1, linewidth=0)
        ax.set_yticks(y)
        ax.set_yticklabels([fmt_num(i) for i in top], fontsize=8.5,
                           fontfamily="monospace", color=P.TINTA)
        for yi, v in zip(y, valores):
            ax.text(v, yi, f" {fmt_int(v)}", va="center", fontsize=7.5, color=P.TINTA_2)
        if inf.n > TOTAL_NUMEROS:
            ax.axvline(TOTAL_NUMEROS - 1, color=P.TINTA_2, linewidth=1, linestyle=(0, (4, 3)))
            ax.text(TOTAL_NUMEROS - 1, len(top) - 0.3, " ausencia media (999)", fontsize=7.5,
                    color=P.TINTA_2, va="bottom")
        ax.set_xlim(0, max(float(valores.max()), TOTAL_NUMEROS if inf.n > TOTAL_NUMEROS else 1) * 1.15)
        ax.set_ylim(-0.6, len(top) + 0.4)
        ax.xaxis.grid(True)
        ax.set_axisbelow(True)
        ax.xaxis.set_major_locator(MaxNLocator(integer=True))
        ax.xaxis.set_major_formatter(FuncFormatter(_formato_miles))
        ax.tick_params(length=0)
        ax.spines["left"].set_visible(False)
        ax.set_xlabel("Sorteos consecutivos sin salir (atraso actual)")
        sin_salir = int((inf.frecuencias == 0).sum())
        extra = f" · {fmt_int(sin_salir)} números aún no han salido" if sin_salir else ""
        record = int(np.lexsort((UNIVERSO, -inf.hueco_maximo))[0])
        self._titulo(ax, "Números más atrasados",
                     f"Récord de ausencia: {fmt_num(record)} ({fmt_int(inf.hueco_maximo[record])}){extra}")

    def _panel_distancias(self, ax) -> None:
        """Salto |x_t - x_{t-1}| entre sorteos consecutivos (teoría: triangular)."""
        inf, t = self.inf, self.inf.teoria
        pares = max(inf.n - 1, 0)
        ancho_bin = 50
        obs = inf.distancias.reshape(-1, ancho_bin).sum(axis=1)
        prob = t.p_distancia.reshape(-1, ancho_bin).sum(axis=1)
        centros = np.arange(len(obs)) * ancho_bin + ancho_bin / 2
        if pares == 0:
            ax.text(0.5, 0.5, "Hacen falta al menos 2 sorteos", ha="center",
                    transform=ax.transAxes, color=P.TINTA_2)
        else:
            self._barras_vs_esperado(ax, centros, obs, prob, n=pares, ancho=ancho_bin * 0.78)
        ax.set_xticks(np.arange(0, 1001, 100))
        ax.set_xlim(-10, 1010)
        ax.set_xlabel("Distancia entre un sorteo y el siguiente (bloques de 50)")
        ax.set_ylabel("Pares de sorteos")
        media = (inf.distancias * np.arange(TOTAL_NUMEROS)).sum() / pares if pares else float("nan")
        self._titulo(ax, "Saltos entre sorteos consecutivos",
                     f"Salto medio {fmt_dec(media, 1)} (teórico ≈ 333,3) · "
                     f"autocorrelación r = {fmt_dec(inf.autocorrelacion, 3)}")

    def _panel_trazado(self, ax) -> None:
        """Los últimos sorteos en orden, con las fronteras de tercios y el corte."""
        inf = self.inf
        y = inf.ultimos
        x = np.arange(inf.n - len(y) + 1, inf.n + 1)
        for limite in (333.5, 666.5):
            ax.axhline(limite, color=P.EJE, linewidth=0.8, zorder=1)
        ax.axhline(inf.corte - 0.5, color=P.TINTA_2, linewidth=1, linestyle=(0, (4, 3)), zorder=1)
        ax.plot(x, y, color=P.SERIE_1, linewidth=0.7, alpha=0.35, zorder=2)
        ax.scatter(x, y, s=18, color=P.SERIE_1, edgecolors=P.SUPERFICIE, linewidths=0.8, zorder=3)
        ax.set_ylim(-20, 1060)
        ax.set_yticks([0, 167, 333, 500, 666, 833, 999])
        ax.set_yticklabels(["000", "167", "333", "500", "666", "833", "999"])
        x0 = x[0] - 0.5
        x_final = x[-1] + max(1.5, 0.07 * len(x))
        ax.set_xlim(x0 - 0.5, x_final)
        # Etiqueta de cada tercio pegada a su borde inferior (lejos de la línea de corte)
        for y_base, etiqueta in zip((0, 334, 667), ETIQUETAS_TERCIOS):
            ax.text(x_final, y_base + 6, etiqueta + " ", ha="right", va="bottom",
                    fontsize=7.5, color=P.TINTA_SUAVE)
        ax.text(x0, inf.corte + 8, f" corte {fmt_num(inf.corte)}", fontsize=7.5,
                color=P.TINTA_2, va="bottom")
        ax.xaxis.set_major_locator(MaxNLocator(integer=True, nbins=12))
        ax.xaxis.set_major_formatter(FuncFormatter(_formato_miles))
        ax.tick_params(length=0)
        ax.set_xlabel("Nº de sorteo")
        ax.set_ylabel("Número premiado")
        self._titulo(ax, f"Últimos {len(y)} sorteos, en orden",
                     "Cada punto es un sorteo · las líneas grises separan los tercios")

    def _panel_anomalias(self, ax) -> None:
        """'Detector de anomalías': puntuación z de cada propiedad curiosa."""
        inf = self.inf
        nombres = [p[0] for p in inf.propiedades]
        z = np.array([p[3] for p in inf.propiedades])
        y = np.arange(len(nombres))[::-1]
        limite = max(3.0, float(np.abs(z).max()) + 0.6)
        ax.axvspan(-Z95, Z95, color=P.BANDA, linewidth=0, zorder=0)
        ax.axvline(0, color=P.TINTA_2, linewidth=1, zorder=1)
        fuera = np.abs(z) > Z95
        ax.hlines(y, 0, z, color=P.EJE, linewidth=1, zorder=2)
        ax.scatter(z[~fuera], y[~fuera], s=46, color=P.SERIE_1, edgecolors=P.SUPERFICIE,
                   linewidths=1.5, zorder=3)
        ax.scatter(z[fuera], y[fuera], s=52, color=P.SERIE_2, edgecolors=P.SUPERFICIE,
                   linewidths=1.5, zorder=3)
        etiquetas = [f"{nombre}  {fmt_pct(obs, 1)} | {fmt_pct(teo, 1)}"
                     for nombre, obs, teo, _ in inf.propiedades]
        ax.set_yticks(y)
        ax.set_yticklabels(etiquetas, fontsize=8, color=P.TINTA)
        ax.set_xlim(-limite, limite)
        ax.set_ylim(-0.7, len(nombres) - 0.3)
        ax.xaxis.grid(True)
        ax.set_axisbelow(True)
        ax.tick_params(length=0)
        ax.spines["left"].set_visible(False)
        ax.set_xlabel("Puntuación z  (observado − teórico, en desviaciones típicas)")
        ax.legend(handles=[
            Patch(facecolor=P.BANDA, label="Zona normal (|z| < 1,96)"),
            Line2D([], [], marker="o", linestyle="", color=P.SERIE_1, label="Dentro"),
            Line2D([], [], marker="o", linestyle="", color=P.SERIE_2, label="Fuera del 95 %"),
        ], loc="upper center", bbox_to_anchor=(0.5, -0.16), ncols=3, fontsize=7.5)
        self._titulo(ax, "Detector de anomalías",
                     f"Propiedad  observado | teórico · {int(fuera.sum())} de {len(z)} fuera del 95 %")

    # ---- PANEL 3: la partida -------------------------------------------------
    def figura_partida(self):
        fig = plt.figure(figsize=(20, 12.5), layout="constrained")
        fig.get_layout_engine().set(h_pad=0.12, w_pad=0.12, hspace=0.07, wspace=0.05)
        filas = fig.subfigures(2, 1, height_ratios=[1.05, 1], hspace=0.04)
        arriba = filas[0].subplots(1, 2, width_ratios=[1.85, 1])
        abajo = filas[1].subplots(1, 3, width_ratios=[1.2, 1, 1])
        self._panel_saldos(arriba[0])
        self._panel_rentabilidad(arriba[1])
        self._panel_valor_esperado(abajo[0])
        self._panel_mente(abajo[1])
        self._panel_libro(abajo[2])
        fig.suptitle(f"Tríplex · Panel 3 — La partida: el Estadístico contra el Azar      "
                     f"({self._meta()})", x=0.006, ha="left", fontsize=15,
                     fontweight="bold", color=P.TINTA)
        return fig

    @staticmethod
    def _formato_euros_eje(valor, _pos=None) -> str:
        return f"{fmt_dec(valor, 0 if abs(valor) >= 10 or valor == 0 else 2)} €"

    def _panel_saldos(self, ax) -> None:
        """Saldo acumulado (premios - apuestas) de cada jugador, sorteo a sorteo."""
        part = self.inf.partida
        x = part.sorteos_saldo
        marcador = "o" if len(x) < 3 else None
        ax.axhline(0, color=P.TINTA_2, linewidth=0.9, zorder=1)
        # Se dibuja primero a los rivales y al final al Estadístico, para que quede encima
        for fila in list(range(1, len(part.cuentas))) + [0]:
            cuenta = part.cuentas[fila]
            ax.plot(x, part.saldos[fila], color=cuenta.color,
                    linewidth=2.8 if fila == 0 else 1.6, marker=marcador, markersize=5,
                    label=f"{cuenta.nombre}: {fmt_euros(cuenta.saldo)}",
                    zorder=4 if fila == 0 else 3)
        manejadores, etiquetas = ax.get_legend_handles_labels()
        orden = [len(etiquetas) - 1] + list(range(len(etiquetas) - 1))   # Estadístico primero
        ax.legend([manejadores[i] for i in orden], [etiquetas[i] for i in orden],
                  loc="lower left", fontsize=8.5, ncols=2)
        ax.yaxis.set_major_formatter(FuncFormatter(self._formato_euros_eje))
        ax.xaxis.set_major_formatter(FuncFormatter(_formato_miles))
        ax.xaxis.set_major_locator(MaxNLocator(integer=True, nbins=10))
        ax.yaxis.grid(True)
        ax.set_axisbelow(True)
        ax.tick_params(length=0)
        ax.set_xlabel("Nº de sorteo")
        ax.set_ylabel("Saldo acumulado")
        bajo, alto = ax.get_ylim()
        ax.set_ylim(bajo - 0.35 * (alto - bajo), alto)       # hueco para la leyenda
        self._titulo(ax, "Saldo de cada jugador",
                     "Todos apuestan 0,50 € por sorteo, salvo el Estadístico: él solo apuesta "
                     "cuando el valor esperado es positivo")

    def _panel_rentabilidad(self, ax) -> None:
        """% de lo apostado que ha vuelto en premios, frente a lo esperable."""
        part = self.inf.partida
        cuentas = part.cuentas
        y = np.arange(len(cuentas))[::-1]
        maximo = max([1.0] + [c.devuelto for c in cuentas if c.apuestas])
        for yi, c in zip(y, cuentas):
            if c.apuestas == 0:
                ax.text(0.01, yi, "no ha apostado: ninguna apuesta tenía VE > 0",
                        va="center", fontsize=8, color=P.TINTA_2, style="italic")
                continue
            ax.barh(yi, c.devuelto, height=0.62, color=c.color, linewidth=0)
            ax.vlines(c.devuelto_esperado, yi - 0.4, yi + 0.4, color=P.TINTA, linewidth=1.8)
            ax.text(max(c.devuelto, c.devuelto_esperado) + maximo * 0.015, yi,
                    fmt_pct(c.devuelto, 1), va="center", fontsize=8, color=P.TINTA)
        ax.axvline(1.0, color=P.TINTA_2, linewidth=1, linestyle=(0, (4, 3)))
        ax.text(1.0, len(cuentas) - 0.45, " 100 % = recuperar lo apostado", fontsize=7.5,
                color=P.TINTA_2, va="bottom")
        ax.set_yticks(y)
        ax.set_yticklabels([c.nombre for c in cuentas], fontsize=8.5, color=P.TINTA)
        ax.set_xlim(0, maximo * 1.18)
        ax.set_ylim(-0.6, len(cuentas) + 0.2)
        ax.xaxis.set_major_formatter(PercentFormatter(1.0, decimals=0))
        ax.xaxis.grid(True)
        ax.set_axisbelow(True)
        ax.tick_params(length=0)
        ax.spines["left"].set_visible(False)
        ax.legend(handles=[Patch(facecolor=P.TINTA_SUAVE, label="Devuelto en premios"),
                           Line2D([], [], color=P.TINTA, marker="|", linestyle="None",
                                  markersize=12, markeredgewidth=1.8,
                                  label="Esperado con sus números (sorteo justo)")],
                  loc="upper center", bbox_to_anchor=(0.5, -0.12), ncols=2, fontsize=7.5)
        self._titulo(ax, "¿Cuánto recupera cada uno?",
                     "Premios cobrados / dinero apostado")

    def _panel_valor_esperado(self, ax) -> None:
        """Premio esperado de cada tipo de número, desglosado por categoría de premio."""
        r = self.inf.partida.reglas
        grupos = list(np.argsort(r.premio_esperado_grupo))      # el mejor, arriba
        y = np.arange(len(grupos))
        for yi, g in zip(y, grupos):
            aportes = r.contribucion[r.representante[g]]
            izquierda = 0.0
            for k, aporte in enumerate(aportes):
                ax.barh(yi, aporte, left=izquierda, height=0.6, color=P.RAMPA_GRIS[k],
                        edgecolor=P.SUPERFICIE, linewidth=1.5)
                izquierda += aporte
            pe = r.premio_esperado_grupo[g]
            ax.text(pe + 0.008, yi, f"{fmt_dec(pe, 3)} €  (devuelve {fmt_pct(pe / r.precio, 1)})",
                    va="center", fontsize=8, color=P.TINTA)
        ax.axvline(r.precio, color=P.TINTA, linewidth=1.6)
        ax.text(r.precio, len(grupos) - 0.45, f" precio de la apuesta ({fmt_dec(r.precio, 2)} €)",
                fontsize=7.5, color=P.TINTA, va="bottom")
        ax.set_yticks(y)
        ax.set_yticklabels([f"{r.describir_grupo(g)}\n{len(r.miembros[g])} números" for g in grupos],
                           fontsize=8, color=P.TINTA)
        ax.set_xlim(0, r.precio * 1.42)
        ax.set_ylim(-0.6, len(grupos) + 0.1)
        ax.xaxis.set_major_formatter(FuncFormatter(lambda v, _p: f"{fmt_dec(v, 2)} €"))
        ax.xaxis.grid(True)
        ax.set_axisbelow(True)
        ax.tick_params(length=0)
        ax.spines["left"].set_visible(False)
        ax.legend(handles=[Patch(facecolor=P.RAMPA_GRIS[k], label=CATEGORIAS_ACIERTO[k])
                           for k in range(4)],
                  loc="upper center", bbox_to_anchor=(0.5, -0.12), ncols=4, fontsize=7.5)
        self._titulo(ax, "¿Qué número conviene?",
                     "Premio esperado de una apuesta según el tipo de número (sorteo justo)")

    def _panel_mente(self, ax) -> None:
        """Valor esperado que el Estadístico atribuye a su mejor apuesta en cada momento."""
        part = self.inf.partida
        x = part.sorteos_mente.astype(float)
        ve = part.mente_ve
        ax.axhline(0, color=P.TINTA, linewidth=1.2, zorder=2)
        ax.fill_between(x, 0, ve, where=ve > 0, color=P.SERIE_1_CLARO, linewidth=0,
                        zorder=1, label="Apuesta (VE > 0)")
        ax.plot(x, ve, color=P.SERIE_1, linewidth=1.8, zorder=3,
                marker="o" if len(x) < 3 else None, label="VE de su mejor número")
        if self.inf.n >= 10:
            ax.set_xscale("log")
        else:
            ax.xaxis.set_major_locator(MaxNLocator(integer=True))
        ax.xaxis.set_major_formatter(FuncFormatter(_formato_miles))
        ax.yaxis.set_major_formatter(FuncFormatter(lambda v, _p: f"{fmt_dec(v, 2)} €"))
        ax.yaxis.grid(True)
        ax.set_axisbelow(True)
        ax.tick_params(length=0)
        ax.set_xlabel("Nº de sorteo" + (" (escala logarítmica)" if self.inf.n >= 10 else ""))
        ax.set_ylabel("Valor esperado por apuesta")
        bajo, alto = ax.get_ylim()
        ax.set_ylim(min(bajo, -0.2), max(alto, 0.05))
        ax.legend(loc="upper left", fontsize=7.5)
        maxima = float(part.mente_prob.max()) if len(part.mente_prob) else 0.0
        self._titulo(ax, "La mente del Estadístico",
                     f"Solo apuesta si la línea supera 0 € · "
                     f"máxima sospecha de trampa: {fmt_pct(maxima, 0)}")

    def _panel_libro(self, ax) -> None:
        """Libro de cuentas y veredicto, en texto."""
        part = self.inf.partida
        ax.axis("off")
        ax.text(0, 1.0, "Libro de cuentas", transform=ax.transAxes, fontsize=11,
                fontweight="bold", color=P.TINTA, va="top")
        columnas = [("Jugador", 0.05, "left"), ("Apuestas", 0.60, "right"),
                    ("Saldo", 0.83, "right"), ("Exactos", 1.0, "right")]
        y = 0.90
        for titulo, xc, ha in columnas:
            ax.text(xc, y, titulo, transform=ax.transAxes, fontsize=8, color=P.TINTA_SUAVE,
                    fontweight="bold", ha=ha, va="top")
        for c in part.cuentas:
            y -= 0.072
            ax.add_patch(plt.Rectangle((0.0, y - 0.035), 0.03, 0.03, transform=ax.transAxes,
                                       color=c.color, clip_on=False))
            valores = (c.nombre, fmt_int(c.apuestas), fmt_euros(c.saldo), fmt_int(c.aciertos[0]))
            for (_, xc, ha), valor in zip(columnas, valores):
                ax.text(xc, y, valor, transform=ax.transAxes, fontsize=8.5, color=P.TINTA,
                        ha=ha, va="top")
        y -= 0.05
        for linea in veredicto_partida(part, breve=True):
            for trozo in textwrap.wrap(linea, 66):
                y -= 0.047
                ax.text(0, y, trozo, transform=ax.transAxes, fontsize=7.8, color=P.TINTA_2,
                        va="top")
            y -= 0.018


# =============================================================================
# 11. ENTRADA POR CONSOLA Y PROGRAMA PRINCIPAL
# =============================================================================

def interpretar_entero(texto: str) -> Optional[int]:
    """Acepta '10000', '10.000', '10_000', '10 000' o '1e5'. Devuelve None si no vale."""
    t = texto.strip().replace("_", "").replace(" ", "")
    if not t:
        return None
    if t.replace(".", "").isdigit() and "." in t:
        grupos = t.split(".")
        if all(len(g) == 3 for g in grupos[1:]) and 1 <= len(grupos[0]) <= 3:
            return int("".join(grupos))
        return None
    if t.isdigit():
        return int(t)
    try:
        valor = float(t.lower())
        return int(valor) if valor.is_integer() else None
    except ValueError:
        return None


def solicitar_numero_sorteos() -> int:
    """Pregunta al usuario cuántos sorteos simular, hasta obtener un valor válido."""
    while True:
        try:
            respuesta = input(f"¿Cuántos sorteos del Tríplex quieres simular? "
                              f"[Intro = {fmt_int(SORTEOS_POR_DEFECTO)}]: ")
        except (EOFError, KeyboardInterrupt):
            print("\nSimulación cancelada.")
            sys.exit(0)
        if not respuesta.strip():
            return SORTEOS_POR_DEFECTO
        n = interpretar_entero(respuesta)
        if n is None:
            print("   ✗ Escribe un número entero (por ejemplo 5000, 10.000 o 1e6).")
        elif not 1 <= n <= MAX_SORTEOS:
            print(f"   ✗ Debe estar entre 1 y {fmt_int(MAX_SORTEOS)}.")
        else:
            if n < 100:
                print("   ⚠ Con tan pocos sorteos las estadísticas serán muy ruidosas.")
            return n


def leer_argumentos(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Simulador estadístico del sorteo del Tríplex (000-999).")
    parser.add_argument("-n", "--sorteos", type=interpretar_entero,
                        help="nº de sorteos (si se omite, se pregunta por consola)")
    parser.add_argument("-s", "--semilla", type=int,
                        help="semilla del generador, para repetir exactamente una simulación")
    parser.add_argument("-c", "--corte", type=int, default=500,
                        help="umbral alto/bajo: 'alto' si el número es >= corte (por defecto 500)")
    parser.add_argument("-o", "--salida", type=Path, default=Path("resultados_triplex"),
                        help="carpeta donde guardar los PNG/CSV (por defecto ./resultados_triplex)")
    parser.add_argument("--trucar", type=int, default=0, metavar="K",
                        help="el Azar trucará en secreto K números (por defecto 0: sorteo justo)")
    parser.add_argument("--factor", type=float, default=3.0,
                        help="cuántas veces más salen los números trucados (por defecto 3)")
    parser.add_argument("--csv", action="store_true",
                        help="guarda también la lista de sorteos en un CSV")
    parser.add_argument("--no-guardar", action="store_true",
                        help="no guarda las imágenes PNG")
    parser.add_argument("--no-mostrar", action="store_true",
                        help="no abre las ventanas de gráficos (útil en servidores)")
    return parser.parse_args(argv)


def construir_configuracion(args: argparse.Namespace) -> Configuracion:
    if args.sorteos is not None and not 1 <= args.sorteos <= MAX_SORTEOS:
        sys.exit(f"El nº de sorteos debe estar entre 1 y {fmt_int(MAX_SORTEOS)}.")
    if not 1 <= args.corte <= 999:
        sys.exit("El corte debe estar entre 1 y 999.")
    if not 0 <= args.trucar <= 100:
        sys.exit("--trucar debe estar entre 0 y 100.")
    if not 0 < args.factor <= 100:
        sys.exit("--factor debe ser mayor que 0 (y como mucho 100).")
    n = args.sorteos if args.sorteos is not None else solicitar_numero_sorteos()
    semilla = args.semilla if args.semilla is not None else secrets.randbelow(10 ** 9)
    return Configuracion(n_sorteos=n, semilla=semilla, corte=args.corte,
                         carpeta_salida=args.salida, guardar_png=not args.no_guardar,
                         guardar_csv=args.csv, mostrar=not args.no_mostrar,
                         trucados=args.trucar, factor=args.factor)


def guardar_csv(config: Configuracion, estadistico: JugadorEstadistico) -> None:
    """Exporta la lista completa de sorteos (nº de sorteo, número premiado)."""
    config.carpeta_salida.mkdir(parents=True, exist_ok=True)
    ruta = config.carpeta_salida / "triplex_sorteos.csv"
    x = estadistico.historial
    tabla = np.column_stack([np.arange(1, len(x) + 1), x])
    np.savetxt(ruta, tabla, fmt=["%d", "%03d"], delimiter=",",
               header="sorteo,numero", comments="")
    print(f"   📄 Sorteos guardados: {ruta}")


def guardar_figuras(config: Configuracion, figuras) -> None:
    """Guarda cada panel como PNG en la carpeta de salida."""
    config.carpeta_salida.mkdir(parents=True, exist_ok=True)
    for nombre, figura in figuras:
        ruta = config.carpeta_salida / f"triplex_{nombre}.png"
        figura.savefig(ruta, dpi=130)
        print(f"   🖼  Gráfico guardado: {ruta}")


def hay_pantalla_grafica() -> bool:
    """True si el backend de matplotlib puede abrir ventanas (no es Agg, PDF…)."""
    backend = matplotlib.get_backend().lower()
    try:   # matplotlib >= 3.9
        from matplotlib.backends import BackendFilter, backend_registry
        no_interactivos = backend_registry.list_builtin(BackendFilter.NON_INTERACTIVE)
    except ImportError:   # versiones anteriores
        no_interactivos = getattr(matplotlib.rcsetup, "non_interactive_bk", [])
    return backend not in {b.lower() for b in no_interactivos}


def main(argv: Optional[List[str]] = None) -> None:
    try:   # evita errores de codificación en consolas antiguas de Windows
        sys.stdout.reconfigure(errors="replace")
    except (AttributeError, ValueError):
        pass

    print("╔" + "═" * 60 + "╗")
    print("║{:^60}║".format("SIMULADOR ESTADÍSTICO DEL TRÍPLEX  (000 - 999)"))
    print("╚" + "═" * 60 + "╝")

    config = construir_configuracion(leer_argumentos(argv))
    estadistico, mesa, _ = simular(config)

    print("▶ El Estadístico prepara su informe…\n")
    informe = estadistico.analizar()
    informe.partida = mesa.resultado()
    imprimir_informe(informe, config.semilla)
    print()
    if config.guardar_csv:
        guardar_csv(config, estadistico)

    if not (config.mostrar or config.guardar_png):
        return
    print("▶ Dibujando los paneles gráficos…")
    visual = VisualizadorTriplex(informe, config.semilla)
    figuras = [("panel1_distribucion", visual.figura_distribucion()),
               ("panel2_evolucion_rachas", visual.figura_dinamica()),
               ("panel3_partida", visual.figura_partida())]
    if config.guardar_png:
        guardar_figuras(config, figuras)

    if config.mostrar and hay_pantalla_grafica():
        print("   (Cierra las ventanas de los gráficos para terminar.)")
        plt.show()
    elif config.mostrar:
        print("   (No hay pantalla disponible: consulta los PNG guardados.)")
    plt.close("all")


if __name__ == "__main__":
    main()
