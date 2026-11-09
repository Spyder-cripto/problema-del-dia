# 🎲 Simulador estadístico del Tríplex

Simula sorteos del **Tríplex** (números de tres cifras, del `000` al `999`), los analiza con una
batería de estadísticas y enfrenta a un **estadístico experto** con el azar y con cuatro
jugadores corrientes. Genera tres paneles gráficos.

- **Jugador 1 · El Azar** genera los resultados por lotes. Por defecto el sorteo es justo; con
  `--trucar` puede hacer trampa en secreto.
- **Jugador 2 · El Estadístico** juega de la forma más inteligente posible y, además, registra
  y analiza cada sorteo.

## Cómo juega el Estadístico

Usa la tabla de premios del Tríplex (0,50 € por billete; exacto 150 €, mismas cifras en otro
orden 10 €, dos primeras o dos últimas cifras 2 €, primera o última cifra 0,50 €; solo se cobra
el premio más alto).

1. **Valor esperado exacto de cada número, con todos los premios.** El pasado no cambia las
   probabilidades, pero el tipo de número sí cambia el premio esperado:

   | Tipo de número | Cuántos | Devuelve de media |
   |---|---:|---:|
   | Tres cifras distintas (123) | 720 | **64,1 %** |
   | Pareja contigua (112, 211) | 180 | 58,2 % |
   | Pareja separada (121) | 90 | 58,1 % |
   | Trío (777) | 10 | 54,3 % |

   Todos pierden dinero: la casa se queda de media con el 37,6 %. Los premios parciales importan
   mucho: si una bola de cada bombo pesa 1,3 veces más, el mejor número pasa a tener valor
   esperado **positivo** (+0,013 € por billete), cosa que una cuenta que mire solo el premio
   exacto no ve.
2. **Tres explicaciones posibles, comparadas por inferencia bayesiana**: *sorteo justo* (90 % a
   priori), *números trucados* (5 %) y *bombos sesgados* (5 %: en un sorteo con un bombo por
   cifra, el defecto físico más realista es una bola que sale de más). El prior escéptico evita
   la "maldición del ganador": entre 1000 números siempre hay alguno que parece caliente por
   casualidad.
3. **Solo apuesta si el valor esperado es positivo** (en un sorteo justo, nunca), y **cuánto lo
   decide el criterio de Kelly fraccionado** (½ Kelly): lo que más hace crecer la banca sin
   arriesgarse a la ruina. Con poca banca, ni siquiera con ventaja compensa apostar.
4. **No cae en falacias**: ni persigue números "calientes" ni "atrasados".

Juegan también, todos con la misma banca (1.000 € por defecto):

- el **Estadístico obligado** a comprar siempre un billete (elige el número de mayor valor esperado);
- el **Oráculo**, que conoce las probabilidades reales: la cota de lo que se puede conseguir;
- cuatro rivales que apuestan en todos los sorteos: **cazador de calientes**, **cazador de
  atrasados**, **supersticioso** (siempre el 777) y **aleatorio**.

Quien no puede pagar su apuesta, se arruina.

### Resultados medidos con muchas semillas

| Escenario | Estadístico | Oráculo (sabe la verdad) |
|---|---|---|
| Sorteo justo (99 partidas de 1.000 a 1.000.000 de sorteos) | no apuesta nunca y nunca se deja engañar | tampoco apuesta |
| 10 números trucados ×3 | lo descubre hacia el sorteo 2.900 y gana | gana |
| 10 números trucados ×2 | lo descubre, pero no apuesta: no compensa | tampoco apuesta |
| Bombos ×1,3, banca de 1.000 € | encuentra las 3 bolas hacia el sorteo 2.000, pero no apuesta: la ventaja es demasiado pequeña para su banca | tampoco apuesta |
| Bombos ×1,3, banca de 20.000 € | apuesta y gana | apuesta y gana |
| Bombos ×1,5 | lo descubre hacia el sorteo 630 y gana | gana |

En todos los escenarios toma la misma decisión que el Oráculo (apostar o no) sin conocer la
verdad.

### Estadísticas nuevas

- **¿Qué cree que está pasando?** Probabilidad a posteriori de cada explicación, sorteo a sorteo.
- **¿Predice mejor que el azar?** Puntuación logarítmica de sus predicciones, en bits: sube si
  ha aprendido algo real y se queda en 0 si no había nada que aprender.
- **¿Por qué tanta gente cree que gana?** Probabilidad exacta de ir ganando tras n apuestas al
  mismo número: tras 379 apuestas al 123, un **30,9 %** va ganando; tras 10.000, un 0,05 %.
- **La ruina**: con 1.000 € y apostando siempre, la banca dura de media unos 5.600 sorteos.

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
2. muestra una barra de progreso con saldos y ruinas en vivo,
3. imprime el informe completo en la consola,
4. guarda cuatro PNG en `./resultados_triplex/` y abre las ventanas de los gráficos.

Tiempos orientativos: unos 8 s con 10.000 o 100.000 sorteos (casi todo es dibujar los cuatro
paneles), 10 s con 1.000.000 y 14 s con 5.000.000.

### Opciones

| Opción | Qué hace |
|---|---|
| `-n 50000` | nº de sorteos, sin preguntar (máx. 20.000.000) |
| `-s 42` | semilla, para repetir exactamente una simulación |
| `--trucar 10` | el Azar trucará en secreto 10 números (por defecto 0: sorteo justo) |
| `--factor 3` | cuántas veces más salen los números trucados (por defecto 3) |
| `--bombos 1.5` | el Azar carga en secreto una bola de cada bombo, que pesa 1,5 veces más |
| `--banca 1000` | dinero inicial de cada jugador, en € (por defecto 1.000) |
| `--kelly 0.5` | fracción del criterio de Kelly que usa el Estadístico (por defecto ½) |
| `-c 500` | umbral alto/bajo: "alto" si el número es ≥ corte (por defecto 500) |
| `-o carpeta` | carpeta de salida (por defecto `resultados_triplex`) |
| `--csv` | guarda también la lista de sorteos en `triplex_sorteos.csv` |
| `--no-guardar` | no guarda los PNG |
| `--no-mostrar` | no abre ventanas (útil en servidores o por SSH) |

Ejemplos:

```bash
python simulador_triplex.py -n 100000 -s 7 -c 750 --csv
python simulador_triplex.py -n 50000 --trucar 10 --factor 3     # ¿descubrirá la trampa?
python simulador_triplex.py -n 20000 --bombos 1.5               # bolas cargadas
python simulador_triplex.py -n 20000 --bombos 1.3 --banca 20000 # ventaja pequeña: hace falta banca
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
| La partida | valor esperado por tipo de número, libro de cuentas de cada jugador (billetes, saldo, % devuelto real y esperado, aciertos, ruina), confesión del Azar y trampas desenmascaradas |
| La mente | creencias en cada explicación, sorteo en que se convence de la trampa, factor estimado, bolas sospechosas, bits de predicción, probabilidad de ir ganando, duración de la banca |

## Gráficos

- **Panel 1 · Distribución**: terminaciones, tercios, paridad y umbral, suma de cifras,
  raíz digital, mapa de calor de cifras por posición, ficha resumen y un mapa de los
  1000 números (rojo = sale más de lo esperado, azul = menos).
- **Panel 2 · Evolución, rachas y patrones**: proporción de pares, de altos y media acumuladas
  con su margen del 95 % (ley de los grandes números), distribución de rachas, números más
  atrasados, saltos entre sorteos, últimos 250 sorteos en orden y un detector de anomalías
  (puntuación z de cada propiedad).
- **Panel 3 · La partida**: saldo de cada jugador sorteo a sorteo (con las ruinas), cuánto
  recupera cada uno frente a lo esperable, qué tipo de número conviene, por qué tanta gente cree
  que gana y el libro de cuentas con el veredicto.
- **Panel 4 · La mente del Estadístico**: qué cree que está pasando, si le compensa apostar,
  si predice mejor que el puro azar y las lecciones de la partida.

En las barras, la **raya negra** es el valor esperado y la **línea gris** el margen en el que
cae el azar el 95 % de las veces.

## Pruebas

```bash
python test_simulador_triplex.py
```

Comprueban el valor esperado exacto de cada número, los p-valores de la χ², el cerebro
bayesiano (no se deja engañar por un número suelto; detecta números trucados y bolas cargadas),
el criterio de Kelly, la probabilidad exacta de ir ganando (frente a Monte Carlo) y, sobre todo,
que la mesa de juego (vectorizada por tramos) da exactamente las mismas decisiones, bancas y
ruinas que una partida jugada sorteo a sorteo: nadie mira el futuro.

## Estructura del código

| Sección | Contenido |
|---|---|
| 1 | constantes, `Configuracion` y `Paleta` de colores |
| 2 | formato numérico en español y funciones estadísticas (χ² sin SciPy, rachas, entropía) |
| 3 | propiedades de los números y `ModeloTeorico` (probabilidades exactas) |
| 4 | `ReglasTriplex` (premios y valor esperado exacto), `plan_kelly`, probabilidad de ir ganando y `CerebroBayesiano` (tres hipótesis) |
| 5 | `JugadorAzar` (justo, números trucados o bombos cargados) |
| 6 | `JugadorEstadistico` (estrategia y análisis) e `Informe` |
| 7 | la partida: rivales, Oráculo, `MesaDeJuego` y libro de cuentas |
| 8 | `simular()`: orquestación y progreso en vivo |
| 9 | informe por consola |
| 10 | `VisualizadorTriplex`: un método por gráfico |
| 11 | entrada por consola, argumentos y `main()` |

> Nota: es una simulación con fines educativos. En un sorteo justo no hay números "calientes"
> ni "debidos": el pasado no cambia las probabilidades del siguiente sorteo, y ninguna
> estrategia puede ganar a la casa a largo plazo.
