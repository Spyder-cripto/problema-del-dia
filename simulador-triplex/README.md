# 🎲 Simulador estadístico del Tríplex

Simula sorteos del **Tríplex** (números de tres cifras, del `000` al `999`), los analiza con una
batería de estadísticas y enfrenta a un **estadístico experto** con el azar y con cuatro
jugadores corrientes. Genera tres paneles gráficos.

- **Jugador 1 · El Azar** genera los resultados por lotes. Por defecto el sorteo es justo; con
  `--trucar` puede hacer trampa en secreto.
- **Jugador 2 · El Estadístico** juega de la forma más inteligente posible y, además, registra
  y analiza cada sorteo.

## Cómo juega el Estadístico

Usa la tabla de premios del Tríplex (0,50 € por número; exacto 150 €, mismas cifras en otro
orden 10 €, dos primeras o dos últimas cifras 2 €, primera o última cifra 0,50 €; solo se cobra
el premio más alto).

1. **Calcula el valor esperado exacto de cada número.** El pasado no cambia las probabilidades,
   pero el tipo de número sí cambia el premio esperado:

   | Tipo de número | Cuántos | Devuelve de media |
   |---|---:|---:|
   | Tres cifras distintas (123) | 720 | **64,1 %** |
   | Pareja contigua (112, 211) | 180 | 58,2 % |
   | Pareja separada (121) | 90 | 58,1 % |
   | Trío (777) | 10 | 54,3 % |

   Todos pierden dinero: la casa se queda de media con el 37,6 %.
2. **Vigila si la máquina está trucada** con un modelo bayesiano jerárquico. Primero se pregunta
   si la máquina está trucada (prior escéptico del 5 %) y, solo entonces, qué números lo están
   y cuánto. Así no se deja engañar por la "maldición del ganador": entre 1000 números siempre
   hay alguno que parece caliente por casualidad.
3. **Apuesta solo si el valor esperado es positivo.** En un sorteo justo eso no ocurre nunca,
   así que su mejor jugada es no jugar. Si detecta una trampa rentable, apuesta y gana. Si la
   trampa existe pero no compensa (los números trucados necesitan salir más de ≈ 2,2 veces lo
   normal), tampoco apuesta.
4. **No cae en falacias**: ni persigue números "calientes" ni "atrasados".

Para comparar, juegan también (apostando en todos los sorteos): un **cazador de calientes**,
un **cazador de atrasados**, un **supersticioso** (siempre el 777), un jugador **aleatorio** y
el propio Estadístico **obligado** a apostar siempre (elige el número de mayor valor esperado).

Resultados medidos con muchas semillas:

| Escenario | Qué hace el Estadístico |
|---|---|
| Sorteo justo (151 partidas de 1.000 a 1.000.000 sorteos) | no apuesta nunca: 0 € perdidos |
| 10 números trucados ×3 | los descubre (9,5 de 10 con 10.000 sorteos), apuesta y gana |
| 10 números trucados ×2 o ×1,5 | descubre la trampa con 100.000 sorteos pero no apuesta: no compensa |

> La tabla de premios procede de resuloto.com y statyr.com (noviembre de 2026); conviene
> comprobarla en juegosonce.es. Si cambia, basta con editar `TABLA_PREMIOS` en el script.

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

1. narra los 10 primeros sorteos: qué decide el Estadístico antes de cada uno y qué sale,
2. muestra una barra de progreso con métricas y saldos en vivo,
3. imprime el informe completo en la consola,
4. guarda tres PNG en `./resultados_triplex/` y abre las ventanas de los gráficos.

Tiempos orientativos: 100.000 sorteos en menos de un segundo; 1.000.000, unos 2 s;
20.000.000, alrededor de un minuto.

### Opciones

| Opción | Qué hace |
|---|---|
| `-n 50000` | nº de sorteos, sin preguntar (máx. 20.000.000) |
| `-s 42` | semilla, para repetir exactamente una simulación |
| `--trucar 10` | el Azar trucará en secreto 10 números (por defecto 0: sorteo justo) |
| `--factor 3` | cuántas veces más salen los números trucados (por defecto 3) |
| `-c 500` | umbral alto/bajo: "alto" si el número es ≥ corte (por defecto 500) |
| `-o carpeta` | carpeta de salida (por defecto `resultados_triplex`) |
| `--csv` | guarda también la lista de sorteos en `triplex_sorteos.csv` |
| `--no-guardar` | no guarda los PNG |
| `--no-mostrar` | no abre ventanas (útil en servidores o por SSH) |

Ejemplos:

```bash
python simulador_triplex.py -n 100000 -s 7 -c 750 --csv
python simulador_triplex.py -n 50000 --trucar 10 --factor 3     # ¿descubrirá la trampa?
```

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
| La partida | valor esperado por tipo de número, libro de cuentas de cada jugador (apuestas, saldo, % devuelto real y esperado, aciertos), sospecha de trampa y números desenmascarados |

## Gráficos

- **Panel 1 · Distribución**: terminaciones, tercios, paridad y umbral, suma de cifras,
  raíz digital, mapa de calor de cifras por posición, ficha resumen y un mapa de los
  1000 números (rojo = sale más de lo esperado, azul = menos).
- **Panel 2 · Evolución, rachas y patrones**: proporción de pares, de altos y media acumuladas
  con su margen del 95 % (ley de los grandes números), distribución de rachas, números más
  atrasados, saltos entre sorteos, últimos 250 sorteos en orden y un detector de anomalías
  (puntuación z de cada propiedad).
- **Panel 3 · La partida**: saldo de cada jugador sorteo a sorteo, cuánto recupera cada uno
  frente a lo esperable, qué tipo de número conviene, la "mente" del Estadístico (valor
  esperado de su mejor apuesta en cada momento) y el libro de cuentas con el veredicto.

En las barras, la **raya negra** es el valor esperado y la **línea gris** el margen en el que
cae el azar el 95 % de las veces.

## Pruebas

```bash
python test_simulador_triplex.py
```

Comprueban el valor esperado exacto de cada número, los p-valores de la χ², el detector de
trampas y, sobre todo, que la mesa de juego (vectorizada por lotes) toma exactamente las mismas
decisiones que una partida jugada sorteo a sorteo: nadie mira el futuro.

## Estructura del código

| Sección | Contenido |
|---|---|
| 1 | constantes, `Configuracion` y `Paleta` de colores |
| 2 | formato numérico en español y funciones estadísticas (χ² sin SciPy, rachas, entropía) |
| 3 | propiedades de los números y `ModeloTeorico` (probabilidades exactas) |
| 4 | `ReglasTriplex` (tabla de premios y valor esperado exacto) y `DetectorDeTrampas` (Bayes) |
| 5 | `JugadorAzar` |
| 6 | `JugadorEstadistico` (estrategia de apuesta y análisis) e `Informe` |
| 7 | la partida: rivales, `MesaDeJuego` y libro de cuentas |
| 8 | `simular()`: orquestación y progreso en vivo |
| 9 | informe por consola |
| 10 | `VisualizadorTriplex`: un método por gráfico |
| 11 | entrada por consola, argumentos y `main()` |

> Nota: es una simulación con fines educativos. En un sorteo justo no hay números "calientes"
> ni "debidos": el pasado no cambia las probabilidades del siguiente sorteo, y ninguna
> estrategia puede ganar a la casa a largo plazo.
