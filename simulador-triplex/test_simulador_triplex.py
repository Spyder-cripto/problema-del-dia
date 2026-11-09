#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pruebas del simulador del Tríplex.

La comprobación clave: la mesa de juego decide por lotes con numpy, y aquí se
reproduce la partida SORTEO A SORTEO con bucles sencillos para verificar que
cada jugador elige exactamente lo mismo usando solo los sorteos anteriores
(nadie mira el futuro) y que los premios y saldos cuadran.

Uso:  python test_simulador_triplex.py
"""

import math

import numpy as np

import simulador_triplex as st


def partida_sorteo_a_sorteo(sorteos, reglas, semilla):
    """Versión lenta y evidente de la partida, para comparar."""
    detector = st.DetectorDeTrampas()
    revision = 0
    veces = np.zeros(1000, dtype=np.int64)
    ultimo = np.full(1000, -1, dtype=np.int64)
    max_global, lider_global = 0, 0
    lideres = {g: (0, int(reglas.representante[g])) for g in range(reglas.n_grupos)}
    aleatorio = np.random.default_rng([semilla, 99])
    saldos = np.zeros(6)
    apuestas = np.zeros(6, dtype=np.int64)
    elecciones = []
    for n, x in enumerate(sorteos):
        # --- decisiones con la información disponible ANTES del sorteo n ---
        if n >= revision:                       # revisa si la máquina está trucada
            detector.revisar_maquina(veces, n)
            revision = n + max(100, n // 100)
        mejor = (-math.inf, None, None)
        for g in range(reglas.n_grupos):
            cuenta, lider = lideres[g]
            p, prob = detector.evaluar(np.array([cuenta]), np.array([n]))
            ve = (reglas.premio_esperado_grupo[g]
                  + (p[0] - detector.p0) * reglas.premio_exacto[lider] - reglas.precio)
            if ve > mejor[0]:
                mejor = (ve, lider, prob[0])
        ve_e, numero_e, _ = mejor
        atrasado = int(np.lexsort((st.UNIVERSO, ultimo))[0])
        picks = [numero_e, numero_e, lider_global, atrasado, 777,
                 int(aleatorio.integers(0, 1000, size=1)[0])]
        apuesta = [ve_e > 0, True, True, True, True, True]
        elecciones.append((numero_e, ve_e, lider_global, atrasado))
        for j in range(6):
            if apuesta[j]:
                apuestas[j] += 1
                saldos[j] += reglas.premio[picks[j], x] - reglas.precio
        # --- se conoce el resultado y se actualiza el estado ---
        veces[x] += 1
        ultimo[x] = n
        if veces[x] > max_global:
            max_global, lider_global = int(veces[x]), int(x)
        g = int(reglas.grupo[x])
        if veces[x] > lideres[g][0]:
            lideres[g] = (int(veces[x]), int(x))
    return elecciones, saldos, apuestas


class MesaQueAnota(st.MesaDeJuego):
    """Mesa normal que además guarda lo que cada jugador sabía antes de cada sorteo."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.anotado = []

    def _contexto(self, lote, frecuencias_antes):
        ctx = super()._contexto(lote, frecuencias_antes)
        self.anotado.append(ctx)
        return ctx


def prueba_mesa_equivale_a_sorteo_a_sorteo(trucados: int, semilla: int = 3,
                                           n: int = 4000, lote: int = 137) -> None:
    azar = st.JugadorAzar(semilla, trucados=trucados, factor=4.0)
    estadistico = st.JugadorEstadistico(n, 500)
    rivales = [st.CazadorDeCalientes(), st.CazadorDeAtrasados(), st.Supersticioso(777),
               st.ApostadorAleatorio(semilla)]
    reglas = st.ReglasTriplex()
    mesa = MesaQueAnota(reglas, estadistico, rivales, n, azar)
    rapidas = []
    for trozo in azar.sortear(n, lote):     # lotes pequeños: se prueba el arrastre de estado
        ya_anotados = len(mesa.anotado)
        numero, ve, _ = mesa.jugar_lote(trozo, estadistico.frecuencias)
        tramos = mesa.anotado[ya_anotados:]          # un lote puede partirse en tramos
        lider = np.concatenate([c.lider for c in tramos])
        atrasado = np.concatenate([c.atrasado for c in tramos])
        rapidas += list(zip(numero, ve, lider, atrasado))
        estadistico.registrar(trozo)

    lentas, saldos, apuestas = partida_sorteo_a_sorteo(estadistico.historial, reglas, semilla)
    for k, (rapida, lenta) in enumerate(zip(rapidas, lentas)):
        assert int(rapida[0]) == lenta[0], f"sorteo {k}: Estadístico elige {rapida[0]} vs {lenta[0]}"
        assert abs(float(rapida[1]) - lenta[1]) < 1e-9, f"sorteo {k}: VE distinto"
        assert int(rapida[2]) == lenta[2], f"sorteo {k}: líder {rapida[2]} vs {lenta[2]}"
        assert int(rapida[3]) == lenta[3], f"sorteo {k}: atrasado {rapida[3]} vs {lenta[3]}"
    for j, cuenta in enumerate(mesa.cuentas):
        assert cuenta.apuestas == apuestas[j], (cuenta.nombre, cuenta.apuestas, apuestas[j])
        assert abs(cuenta.saldo - saldos[j]) < 1e-6, (cuenta.nombre, cuenta.saldo, saldos[j])
    print(f"   ✓ mesa por lotes = partida sorteo a sorteo (trucados={trucados}, "
          f"{n} sorteos, apuestas del Estadístico: {mesa.cuentas[0].apuestas})")


def prueba_valor_esperado_exacto() -> None:
    """Valores calculados a mano con la tabla de premios."""
    r = st.ReglasTriplex()
    # 123: 1 exacto (150) + 5 otro orden (10) + 18 dos cifras (2) + 169 una cifra (0,5)
    assert abs(r.premio_esperado[123] - (150 + 50 + 36 + 84.5) / 1000) < 1e-12
    # 777: 1 exacto + 18 dos cifras + 171 una cifra
    assert abs(r.premio_esperado[777] - (150 + 36 + 85.5) / 1000) < 1e-12
    assert abs(r.premio_esperado.mean() - 0.312) < 1e-12        # devuelve el 62,4 %
    print("   ✓ valor esperado exacto de cada número")


def prueba_chi2_frente_a_tabla() -> None:
    """Valores críticos conocidos de la chi-cuadrado (p = 0,05)."""
    for x, gl in [(3.841459, 1), (16.918978, 9), (40.113272, 27)]:
        assert abs(st.chi2_cola_superior(x, gl) - 0.05) < 1e-6
    print("   ✓ p-valores de la chi-cuadrado")


def prueba_detector() -> None:
    """Sin datos devuelve el prior; un número aislado no le convence de que haya
    trampa, pero varios números desviados a la vez, sí."""
    d = st.DetectorDeTrampas()
    _, prob = d.evaluar(0, 0)
    assert abs(float(prob) - d.prior_maquina * d.prior_numero) < 1e-12
    n = 10_000
    normales = np.full(1000, 10)
    un_raro = normales.copy()
    un_raro[123] = 25                           # 2,5 veces lo esperado: puede ser azar
    assert d.revisar_maquina(normales, n) < d.prior_maquina   # todo normal: más confianza
    assert d.revisar_maquina(un_raro, n) < 0.5
    varios = normales.copy()
    varios[[5, 50, 500, 555]] = 30              # cuatro números a la vez: trampa
    assert d.revisar_maquina(varios, n) > 0.95
    _, prob_alta = d.evaluar(30, n)
    _, prob_normal = d.evaluar(12, n)
    assert prob_alta > 0.9 and prob_normal < 0.05
    print("   ✓ detector bayesiano de trampas")


if __name__ == "__main__":
    print("Pruebas del simulador del Tríplex")
    prueba_valor_esperado_exacto()
    prueba_chi2_frente_a_tabla()
    prueba_detector()
    prueba_mesa_equivale_a_sorteo_a_sorteo(trucados=0)
    prueba_mesa_equivale_a_sorteo_a_sorteo(trucados=8)
    print("Todo correcto.")
