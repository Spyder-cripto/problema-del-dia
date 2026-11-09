#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pruebas del simulador del Tríplex.

La comprobación clave: la mesa de juego decide por tramos con numpy, y aquí se
reproduce la partida SORTEO A SORTEO con bucles sencillos para verificar que
cada jugador decide exactamente lo mismo usando solo los sorteos anteriores
(nadie mira el futuro) y que bancas, ruinas, billetes y premios cuadran.

Uso:  python test_simulador_triplex.py
"""

import math

import numpy as np

import simulador_triplex as st


# -----------------------------------------------------------------------------
# Partida de referencia, sorteo a sorteo
# -----------------------------------------------------------------------------

def partida_sorteo_a_sorteo(sorteos, reglas, prob_reales, semilla, banca0, fraccion,
                            max_billetes=20):
    """Versión lenta y evidente de la partida, con la misma política de juego."""
    cerebro = st.CerebroBayesiano(reglas)
    ve_oraculo = reglas.valor_esperado(prob_reales)
    veces = np.zeros(1000, dtype=np.int64)
    ultimo = np.full(1000, -1, dtype=np.int64)
    max_global, lider_global = 0, 0
    aleatorio = np.random.default_rng([semilla, 99])
    bancas = [float(banca0)] * 7
    billetes = [0] * 7
    arruinado = [None] * 7
    revision, fin_plan = 0, 0
    plan = plan_o = None
    banca_plan = (banca0, banca0)
    decisiones = []
    for n, x in enumerate(sorteos):
        # --- (re)planificación con la información anterior al sorteo n ---
        if n >= fin_plan:
            if n >= revision:
                cerebro.revisar(veces, n)
                revision = n + max(50, n // 200)
            plan = st.plan_kelly(cerebro.prediccion, cerebro.ve, reglas, bancas[0], fraccion,
                                 max_billetes)
            plan_o = st.plan_kelly(prob_reales, ve_oraculo, reglas, bancas[2], fraccion,
                                   max_billetes)
            banca_plan = (bancas[0], bancas[2])
            fin_plan = revision
        atrasado = int(np.lexsort((st.UNIVERSO, ultimo))[0])
        apuestas = [(plan.numeros, plan.billetes), ([plan.mejor_numero], [1]),
                    (plan_o.numeros, plan_o.billetes), ([lider_global], [1]), ([atrasado], [1]),
                    ([777], [1]), ([int(aleatorio.integers(0, 1000, size=1)[0])], [1])]
        decisiones.append((plan.mejor_numero, plan.mejor_ve, lider_global, atrasado))
        for j, (numeros, cuantos) in enumerate(apuestas):
            coste = 0.5 * int(np.sum(cuantos))
            if arruinado[j] is not None or coste == 0:
                continue
            if bancas[j] < coste - 1e-9:
                arruinado[j] = n + 1
                continue
            premio = sum(int(k) * float(reglas.premio64[int(i), x]) for i, k in zip(numeros, cuantos))
            bancas[j] += premio - coste
            billetes[j] += int(np.sum(cuantos))
        # --- se conoce el resultado ---
        veces[x] += 1
        ultimo[x] = n
        if veces[x] > max_global:
            max_global, lider_global = int(veces[x]), int(x)
        # reajuste si la banca de un jugador Kelly sale de su banda
        for p, j, b in ((plan, 0, banca_plan[0]), (plan_o, 2, banca_plan[1])):
            if p.total_billetes and not (0.8 * b <= bancas[j] <= 1.25 * b):
                fin_plan = n + 1
    return decisiones, bancas, billetes, arruinado


class MesaQueAnota(st.MesaDeJuego):
    """Mesa normal que además guarda lo que cada jugador sabía antes de cada sorteo."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.anotado = []

    def _contexto(self, lote, frecuencias_antes):
        ctx = super()._contexto(lote, frecuencias_antes)
        self.anotado.append(ctx)
        return ctx


def prueba_mesa_equivale_a_sorteo_a_sorteo(nombre, semilla=3, n=3000, lote=137, banca=200.0,
                                           **trampa) -> None:
    azar = st.JugadorAzar(semilla, **trampa)
    reglas = st.ReglasTriplex()
    estadistico = st.JugadorEstadistico(n, 500, reglas)
    rivales = [st.CazadorDeCalientes(), st.CazadorDeAtrasados(), st.Supersticioso(777),
               st.ApostadorAleatorio(semilla)]
    mesa = MesaQueAnota(reglas, estadistico, rivales, n, azar, banca, 0.5)
    rapidas = []
    for trozo in azar.sortear(n, lote):     # lotes pequeños: se prueba el arrastre de estado
        ya_anotados = len(mesa.anotado)
        numero, ve, _ = mesa.jugar_lote(trozo, estadistico.frecuencias)
        tramos = mesa.anotado[ya_anotados:]
        lider = np.concatenate([c.lider for c in tramos])
        atrasado = np.concatenate([c.atrasado for c in tramos])
        rapidas += list(zip(numero, ve, lider, atrasado))
        estadistico.registrar(trozo)

    lentas, bancas, billetes, arruinado = partida_sorteo_a_sorteo(
        estadistico.historial, reglas, azar.probabilidades, semilla, banca, 0.5)
    for k, (rapida, lenta) in enumerate(zip(rapidas, lentas)):
        assert int(rapida[0]) == lenta[0], f"sorteo {k}: mejor número {rapida[0]} vs {lenta[0]}"
        assert abs(float(rapida[1]) - lenta[1]) < 1e-9, f"sorteo {k}: VE distinto"
        assert int(rapida[2]) == lenta[2], f"sorteo {k}: líder {rapida[2]} vs {lenta[2]}"
        assert int(rapida[3]) == lenta[3], f"sorteo {k}: atrasado {rapida[3]} vs {lenta[3]}"
    for j, cuenta in enumerate(mesa.cuentas):
        assert cuenta.billetes == billetes[j], (cuenta.nombre, cuenta.billetes, billetes[j])
        assert abs(cuenta.banca - bancas[j]) < 1e-6, (cuenta.nombre, cuenta.banca, bancas[j])
        assert cuenta.arruinado_en == arruinado[j], (cuenta.nombre, cuenta.arruinado_en, arruinado[j])
    e, o = mesa.cuentas[0], mesa.cuentas[2]
    ruinas = sum(1 for c in mesa.cuentas if c.arruinado_en)
    print(f"   ✓ mesa por tramos = partida sorteo a sorteo ({nombre}: billetes Estadístico "
          f"{e.billetes}, Oráculo {o.billetes}, arruinados {ruinas})")


# -----------------------------------------------------------------------------
# Piezas sueltas
# -----------------------------------------------------------------------------

def prueba_valor_esperado_exacto() -> None:
    """Valores calculados a mano con la tabla de premios y comparación con fuerza bruta."""
    r = st.ReglasTriplex()
    # 123: 1 exacto (150) + 5 otro orden (10) + 18 dos cifras (2) + 169 una cifra (0,5)
    assert abs(r.premio_esperado[123] - (150 + 50 + 36 + 84.5) / 1000) < 1e-12
    # 777: 1 exacto + 18 dos cifras + 171 una cifra
    assert abs(r.premio_esperado[777] - (150 + 36 + 85.5) / 1000) < 1e-12
    assert abs(r.premio_esperado.mean() - 0.312) < 1e-12        # devuelve el 62,4 %
    prob = np.random.default_rng(1).dirichlet(np.ones(1000))
    ve = r.valor_esperado(prob)
    for i in (0, 123, 505, 999):
        bruto = sum(prob[j] * r.premio64[i, j] for j in range(1000)) - 0.5
        assert abs(ve[i] - bruto) < 1e-12
    print("   ✓ valor esperado exacto de cada número")


def prueba_chi2_frente_a_tabla() -> None:
    """Valores críticos conocidos de la chi-cuadrado (p = 0,05)."""
    for x, gl in [(3.841459, 1), (16.918978, 9), (40.113272, 27)]:
        assert abs(st.chi2_cola_superior(x, gl) - 0.05) < 1e-6
    print("   ✓ p-valores de la chi-cuadrado")


def prueba_cerebro() -> None:
    """Empieza con las creencias previas, no se deja engañar por un número
    aislado y detecta tanto números trucados como bombos sesgados."""
    r = st.ReglasTriplex()
    c = st.CerebroBayesiano(r)
    assert np.allclose(c.creencias, [0.90, 0.05, 0.05])
    n = 10_000
    normales = np.full(1000, 10)
    c.revisar(normales, n)
    assert c.creencias[0] > 0.9                       # todo normal: más confianza en el sorteo
    un_raro = normales.copy()
    un_raro[123] = 25
    c.revisar(un_raro, int(un_raro.sum()))
    assert c.creencias[0] > 0.5                       # un número raro puede ser azar
    varios = normales.copy()
    varios[[5, 50, 500, 555]] = 30
    c.revisar(varios, int(varios.sum()))
    assert c.creencias[1] > 0.95                      # cuatro a la vez: números trucados
    assert {num for num, _ in c.sospechosos()} == {5, 50, 500, 555}
    # Bombo de unidades con la bola 7 cargada (sale un 13 % en vez de un 10 %)
    pesos = np.ones((3, 10))
    pesos[2, 7] = 1.35
    pesos /= pesos.sum(axis=1, keepdims=True)
    esperado = np.einsum("i,j,k->ijk", *pesos).ravel() * n
    conteos = np.round(esperado).astype(int)
    c.revisar(conteos, int(conteos.sum()))
    assert c.creencias[2] > 0.99
    assert [(b, d) for b, d, _ in c.bolas_sospechosas()] == [(2, 7)]
    print("   ✓ cerebro bayesiano (tres hipótesis)")


def prueba_kelly() -> None:
    """Sin ventaja no apuesta; con ventaja apuesta más cuanto mayor es la banca;
    con muy poca banca no apuesta aunque haya ventaja."""
    r = st.ReglasTriplex()
    justo = np.full(1000, 1e-3)
    plan = st.plan_kelly(justo, r.valor_esperado(justo), r, 10_000, 0.5, 20)
    assert plan.total_billetes == 0 and plan.mejor_ve < 0
    trucado = np.ones(1000)
    trucado[:10] *= 3
    trucado /= trucado.sum()
    ve = r.valor_esperado(trucado)
    billetes = [st.plan_kelly(trucado, ve, r, b, 0.5, 20).total_billetes for b in (50, 1000, 10_000)]
    assert billetes[0] == 0 and 0 < billetes[1] < billetes[2] <= 20, billetes
    print(f"   ✓ Kelly: billetes con banca de 50 / 1.000 / 10.000 € → {billetes}")


def prueba_prob_ir_ganando() -> None:
    """Exacto frente a casos a mano y a Monte Carlo."""
    r = st.ReglasTriplex()
    assert abs(st.prob_ir_ganando(r, 123, [1])[0] - 24 / 1000) < 1e-12   # premio > 0,50 €
    exacta = st.prob_ir_ganando(r, 123, [100])[0]
    sorteos = np.random.default_rng(5).integers(0, 1000, size=(100_000, 100))
    simulada = float(np.mean(r.premio64[123][sorteos].sum(axis=1) > 50))
    assert abs(exacta - simulada) < 4 * math.sqrt(exacta * (1 - exacta) / 100_000)
    curva = st.curva_ir_ganando(r, 123, 1000)
    for n in (1, 10, 299, 300, 1000):
        assert abs(curva[n - 1] - st.prob_ir_ganando(r, 123, [n])[0]) < 1e-9
    print(f"   ✓ probabilidad de ir ganando (exacta {exacta:.4f}, simulada {simulada:.4f}; "
          f"programación dinámica = FFT)")


if __name__ == "__main__":
    print("Pruebas del simulador del Tríplex")
    prueba_valor_esperado_exacto()
    prueba_chi2_frente_a_tabla()
    prueba_cerebro()
    prueba_kelly()
    prueba_prob_ir_ganando()
    prueba_mesa_equivale_a_sorteo_a_sorteo("sorteo justo")
    prueba_mesa_equivale_a_sorteo_a_sorteo("8 números ×4", trucados=8, factor=4.0, banca=2000.0)
    prueba_mesa_equivale_a_sorteo_a_sorteo("bombos ×1,6", bombos=1.6, banca=3000.0)
    print("Todo correcto.")
