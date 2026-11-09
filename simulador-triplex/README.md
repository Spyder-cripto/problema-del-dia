# 🎲 Simulador estadístico del Tríplex

Simula sorteos del **Tríplex** (números de tres cifras, del `000` al `999`) y los analiza
con una batería de estadísticas y dos paneles gráficos.

- **Jugador 1 · El Azar**: genera los resultados (uniformes e independientes) por lotes.
- **Jugador 2 · El Estadístico**: anota cada lote en cuanto sale (contadores en vivo en la
  consola), comenta los primeros sorteos y, al terminar, compara todo lo observado con lo que
  predice la teoría.

Las probabilidades teóricas se calculan **de forma exacta** recorriendo los 1000 números
posibles, así que cada métrica lleva su valor esperado y su margen normal del azar (IC 95 %).

## Instalación

Requiere **Python 3.9 o superior**.

```bash
pip install numpy matplotlib seaborn
# o bien
pip install -r requirements.txt
```

## Ejecución

```bash
python simulador_triplex.py
```

El programa pregunta cuántos sorteos quieres simular. Acepta `5000`, `10.000`, `1e6`…
Si pulsas Intro sin escribir nada, simula 10.000. Después:

1. narra los 10 primeros sorteos (paridad, terminación, suma, tercio, curiosidades…),
2. muestra una barra de progreso con métricas en vivo,
3. imprime el informe completo en la consola,
4. guarda dos PNG en `./resultados_triplex/` y abre las ventanas de los gráficos.

### Opciones

| Opción | Qué hace |
|---|---|
| `-n 50000` | nº de sorteos, sin preguntar (máx. 20.000.000) |
| `-s 42` | semilla, para repetir exactamente una simulación |
| `-c 500` | umbral alto/bajo: "alto" si el número es ≥ corte (por defecto 500) |
| `-o carpeta` | carpeta de salida (por defecto `resultados_triplex`) |
| `--csv` | guarda también la lista de sorteos en `triplex_sorteos.csv` |
| `--no-guardar` | no guarda los PNG |
| `--no-mostrar` | no abre ventanas (útil en servidores o por SSH) |

Ejemplo: `python simulador_triplex.py -n 100000 -s 7 -c 750 --csv`

## Qué calcula

| Bloque | Métricas |
|---|---|
| General | media, mediana, desviación típica, números distintos vistos, sorteo en que se completó la colección 000-999 (problema del coleccionista, ≈ 7.485 de media), más y menos salidos, χ² de uniformidad de los 1000 números, entropía |
| Terminaciones | frecuencia de la última cifra (0-9) + χ² |
| Paridad | pares/impares, evolución acumulada, prueba de rachas de Wald-Wolfowitz |
| Intervalos | tercios 000-333 · 334-666 · 667-999 + χ² |
| Umbral | altos/bajos respecto al corte, evolución acumulada |
| Suma de cifras | distribución 0-27 frente a la teórica + χ²; raíz digital |
| Posiciones | frecuencia de cada cifra en centenas, decenas y unidades + χ² por posición |
| Rachas | racha más larga y racha en curso de pares, impares, altos y bajos (con su valor esperado), distribución de longitudes frente a la teoría, misma terminación seguida, repeticiones inmediatas |
| Secuencia | atraso actual de cada número, récord de ausencia, saltos entre sorteos consecutivos, autocorrelación |
| Curiosidades | trío, pareja, capicúa, escalera, cifras crecientes, contiene un 7, primo, múltiplo de 3, cuadrado perfecto: observado frente a teórico, con su puntuación z |

## Gráficos

- **Panel 1 · Distribución**: terminaciones, tercios, paridad y umbral, suma de cifras,
  raíz digital, mapa de calor de cifras por posición, ficha resumen y un mapa de los
  1000 números (rojo = sale más de lo esperado, azul = menos).
- **Panel 2 · Evolución, rachas y patrones**: proporción de pares, de altos y media acumuladas
  con su margen del 95 % (ley de los grandes números), distribución de rachas, números más
  atrasados, saltos entre sorteos, últimos 250 sorteos en orden y un detector de anomalías
  (puntuación z de cada propiedad).

En las barras, la **raya negra** es el valor esperado y la **línea gris** el margen en el que
cae el azar el 95 % de las veces.

## Estructura del código

| Sección | Contenido |
|---|---|
| 1 | constantes, `Configuracion` y `Paleta` de colores |
| 2 | formato numérico en español y funciones estadísticas (χ² sin SciPy, rachas, entropía) |
| 3 | propiedades de los números y `ModeloTeorico` (probabilidades exactas) |
| 4 | `JugadorAzar` |
| 5 | `JugadorEstadistico` e `Informe` |
| 6 | `simular()`: orquestación y progreso en vivo |
| 7 | informe por consola |
| 8 | `VisualizadorTriplex`: un método por gráfico |
| 9 | entrada por consola, argumentos y `main()` |

> Nota: es una simulación con fines educativos. En un sorteo justo no hay números "calientes"
> ni "debidos": el pasado no cambia las probabilidades del siguiente sorteo.
