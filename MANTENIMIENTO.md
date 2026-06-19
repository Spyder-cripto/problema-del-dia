# Mantenimiento — "El problema del día"

Guía para retomar y mantener el proyecto en frío. Todo vive en un único **`index.html`** (HTML + CSS + JS + datos).

- **Repo:** `Spyder-cripto/problema-del-dia`
- **Live:** https://spyder-cripto.github.io/problema-del-dia/ (GitHub Pages, rama `main`, raíz)
- **Local:** `C:\Proyectos\TRIPLEX\problema-del-dia\`
- **Serie iniciada:** 2026-06-17 (día 1 = "La herencia de las ovejas"). La constante `INICIO` en `index.html` fija el día 1.

## Qué es

Una web estática que muestra **un acertijo matemático cada día**. El problema cambia solo a medianoche (hora **local del visitante**), calculado en JS por la fecha — no hay backend ni publicación manual. Hay **63 problemas** (a 2026-06-19; eran 40, +23 reabastecidos ese día — ver sección al final); el ciclo dura ~62 días y luego repite.

## Modelo de datos (en `index.html`)

- **`PROBLEMAS`** — array de objetos. Campos: `titulo`, `fuente`, `enun`, `sol`, y opcional `fig` (SVG de una figura geométrica que se muestra junto a la solución).
- **`ORDEN`** — array de índices = la secuencia diaria. Diseñada para que **las categorías se alternen** (nunca dos iguales seguidas, ni en el cierre cíclico). Contiene TODOS los problemas activos (los 40 menos los excluidos). Día N de la serie = `ORDEN[(N-1) % ORDEN.length]`.
- **`EXCLUIDOS`** — índices retirados de la rotación (p. ej. `[28]`, "Calcetines a oscuras", demasiado fácil).
- **`SEQ`** = `ORDEN` + (cualquier índice que no esté en ORDEN ni en EXCLUIDOS, anexado al final). Hoy ORDEN ya contiene todo, así que SEQ = ORDEN (39).
- **`TIPO`** — `{índice: categoría}`. Categorías válidas (con color en `CLASE_TIPO`): **Geometría, Números, Lógica, Probabilidad, Combinatoria, Ingenio**. NO existe "Álgebra" (usar "Números").
- **`DIF`** — `{índice: 1|2|3|4}` (1=Fácil, 2=Media, 3=Difícil, **4=Muy difícil**, añadido 2026-06-19). Se pinta como **escala de 4 puntos**: `"●".repeat(d) + "○".repeat(4 - d)` → Media `●●○○`, Difícil `●●●○`, Muy difícil `●●●●`. Hay `DIF_NOMBRE[4]="Muy difícil"` y CSS `.dif.d4` (rojo `--hard`, negrita). **OJO:** la fórmula antes era `repeat(3 - d)`; con `d=4` eso lanzaba `RangeError` (repeat negativo) — por eso se cambió el 3 por 4.
- **`PISTAS`** — `{índice: [..]}`. **Muy difícil → 2; Difícil → 2 pistas; Media → 1; Fácil → 0.** Respeta el número según la dificultad. (El nº de botones lo decide `PISTAS[idx].length`, no `DIF`.)
- **`DIBUJOS`** — `{índice: "SVG"}` garabato infantil (viewBox 0 0 100 100, va sobre `PAPEL`). Si falta, usa `DEFECTO` (carita). 
- **`INICIO`** — fecha del día 1 (en el `index.html` es `"2026-06-01"`).
- **`OVERRIDES`** — mapa `{ "YYYY-MM-DD": índice }` (añadido 2026-06-19) para **forzar un problema concreto en una fecha concreta**, con prioridad sobre el ciclo y SIN tocar `ORDEN`. La función `idxDeDia(i)` lo consulta; `generate_preview.py` también (para que la tarjeta de ese día coincida). **No se aplica en modo `?ver`** (ahí mandas tú el problema). El día así forzado **salta** el problema que tocaba por ciclo (no lo recoloca: ese problema reaparece en la siguiente vuelta del ciclo). Útil para repetir/cambiar un día puntual; es inocuo dejar entradas pasadas (solo afectan a esa fecha exacta, que no se repite hasta dentro de un ciclo entero). Ej. actual: `{"2026-06-20": 43}` repite «La moneda que gira de más».
- **`?ver=N`** — parámetro de URL para **previsualizar** cualquier problema (la web normal no deja navegar a días futuros; el botón "Siguiente" se desactiva al llegar a hoy). Ej.: `...github.io/problema-del-dia/?ver=30`.

## Diseño

- Paleta (light): `--bg #f3efe6`, `--bg2 #ece5d6`, `--card #fffdf8`, `--ink #2b2620`, `--muted #857c6e`, `--accent #9a6f2e` (oro), `--accent-2 #1f5fa6` (azul), `--hard #c0432f`. Hay modo oscuro (segundo `:root`).
- Pills de categoría: `.t-geo` azul, `.t-num` verde, `.t-log` morado, `.t-prob` naranja, `.t-comb` rosa, `.t-ing` oro.
- Tipografía serif del sistema (sin Google Fonts a propósito): `--display` (Palatino/Iowan/Georgia) para títulos, `--body` (Georgia) para texto.
- Título del problema (`h2`): 2.1rem (móvil 1.7rem). Enunciado justificado (`text-align:justify; hyphens:auto`).
- Dibujo: iconito 56px a la izquierda del título, rotado -4°.

## Botones interactivos (¡no perder este detalle!)

Pista y solución **alternan mostrar/ocultar al hacer clic**, cambiando icono Y texto:
- 💡 *Ver solución* ⇄ 🙈 *Ocultar solución* (panel **oro**)
- 💭 *Pista 1* ⇄ 🙈 *Ocultar pista 1* (panel **azul**)
- 💭 *Pista 2* ⇄ 🙈 *Ocultar pista 2*

## Cómo AÑADIR un problema nuevo (sin romper nada)

El JS y los datos están en el mismo `<script>`. **Un error de sintaxis (p. ej. una coma que falta) tumba el script entero y la tarjeta sale vacía.**

1. Añade el objeto al final del array `PROBLEMAS` (antes del `];`). Recibe el siguiente índice libre.
2. Añade su entrada en `TIPO`, `DIF`, `PISTAS` (2 si es difícil) y `DIBUJOS`.
3. **Inserta su índice en `ORDEN`** en una posición donde su categoría NO coincida con la anterior ni la siguiente (mantener la alternancia). NO lo dejes solo anexado al final.
4. **Reglas de los strings:**
   - `enun` se pinta con `textContent` → **PROHIBIDO HTML** (las etiquetas saldrían literales). Texto plano.
   - `sol` usa `innerHTML` → sí admite `<b>`, `<i>`.
   - Los strings JS van entre comillas dobles → dentro usa « » y nunca `"`.
   - **CUIDADO con las comas** entre objetos del array y entre entradas de los mapas.

### VALIDACIÓN OBLIGATORIA antes de publicar

Regex (contar títulos/comillas) **NO** detecta comas que faltan. Validar de verdad:

```bash
# 1) sintaxis JS
python -c "import re;open('_c.js','w',encoding='utf-8').write(max(re.findall(r'<script>(.*?)</script>', open('index.html',encoding='utf-8').read(), re.S), key=len))"
node --check _c.js

# 2) runtime: ejecutar render() con un DOM simulado (detecta datos rotos)
#    (ver el runner usado el 2026-06-18: stub de document/window/location + eval del script + render())
```
Solo publicar si `node --check` pasa Y `render()` corre sin throw.

## Tarjetas de compartir (Open Graph)

`generate_preview.py` (en el repo) parsea `index.html`, calcula el problema de hoy (TZ Europe/Madrid) y genera:
- **`preview.png`** 1200×630 (horizontal, para enlaces): fondo crema + rejilla, barra superior oro→azul, antetítulo "EL PROBLEMA DEL DÍA" en oro, título grande, píldora de categoría, "Dificultad ●●●", enlace al pie, y el garabato (SVG→PNG vía cairosvg) rotado -5° arriba a la derecha. **La tarjeta NO lleva enunciado** (solo título/categoría/dificultad/dibujo/enlace).
- **`preview_sq.png`** 1080×1080 (cuadrada, para estados de WhatsApp): título arriba, dibujo en medio, etiquetas abajo, todo centrado.

`cairosvg` solo está en el runner de la nube (Ubuntu), no en local. La **GitHub Action** `.github/workflows/preview.yml` (cron 22:10 y 23:10 UTC ≈ 00:10 Madrid, cubre DST, + `workflow_dispatch`, + `push` sobre `index.html`/`generate_preview.py`) regenera las imágenes y commitea con cache-buster `og:image -> preview.png?v=YYYYMMDD`. El commit del bot lleva **`[skip ci]`** para no entrar en bucle.

### Archivo de tarjetas por problema (`tarjetas/`)
`python generate_preview.py --todas` genera, para CADA problema en rotación, `tarjetas/dia-NN.png` (horizontal) y `tarjetas/dia-NN-sq.png` (cuadrada, para estados de WhatsApp), más una **galería** `tarjetas/index.html` con miniatura + descargas + enlace `?ver=` de cada uno. La Action lo ejecuta automáticamente, así que **hay tarjeta de los 39 problemas** (no solo del de hoy), y se regeneran solas cuando cambian los problemas o el `INICIO`. Galería pública: `…github.io/problema-del-dia/tarjetas/`. Tarjeta de un día: `…/tarjetas/dia-NN-sq.png`. (NN = nº de día en la serie; depende de `INICIO`/`ORDEN`, por eso se regeneran al cambiarlos.) **Uso de Fali:** comparte la cuadrada en su estado de WhatsApp junto al enlace `?ver=idx` del problema.

## Publicar

`git add … && git commit && git push`. El repo tiene `http.sslVerify=false` (por la interceptación HTTPS de Avast). Pages reconstruye en ~1-2 min. Para forzar la regeneración de la preview a mano: `workflow_dispatch` de la Action.

## Los 10 problemas difíciles añadidos el 2026-06-18 (índices 30-39, dif 3)

Minados y adaptados de la biblioteca de mate descargada (ver carpeta `D:\libros_maravillosos\Matemáticas` — movida de `Downloads` el 2026-06-19):

| idx | título | categoría | fuente |
|----|--------|-----------|--------|
| 30 | El triángulo de un séptimo | Geometría | Instantáneas matemáticas (Steinhaus) |
| 31 | Un hilo para todas las diagonales | Combinatoria | Instantáneas matemáticas |
| 32 | Las tablas garantizadas | Ingenio | Instantáneas matemáticas |
| 33 | Las tres hermanas y los pollos | Números | Álgebra recreativa (Perelman) |
| 34 | La palabra en una sola pregunta | Ingenio | Juegos matemáticos recreativos (Guik) |
| 35 | Los maridos celosos | Lógica | El laberinto y otros juegos (Lucas/Tartaglia) |
| 36 | La araña y la mosca | Geometría | Matemáticas e imaginación (Dudeney/Kasner) |
| 37 | El juego interrumpido | Probabilidad | Matemáticas e imaginación (Pascal-Fermat) |
| 38 | El huerto de Pólya | Geometría | Instantáneas matemáticas |
| 39 | La corneja y el jarro | Ingenio | Geometría recreativa (Perelman) |

El script que los insertó: `add_problemas.py` (cuidado: tuvo el bug de las comas, corregido a mano después).

## Los 23 problemas añadidos el 2026-06-19 (índices 40-62)

Reabastecimiento grande (40 → 63) minado de **`D:\libros_maravillosos\Matemáticas`** (los libros se movieron de `Downloads` a `D:` el 2026-06-19) con **2 workflows (ultracode)**: (1) 16 lectores → curador → **verificación adversaria** (cada acertijo resuelto desde cero) → selección; (2) un redactor + un revisor de gotchas por problema. Mezcla **10 Media / 10 Difícil / 3 Muy difícil**, las 6 categorías cubiertas. Enunciados con redacción propia (respeta copyright), soluciones verificadas. Scripts del lote en `C:\Proyectos\TRIPLEX\`: `armar_problemas.py` (+ `_nuevos_src.json` / `_nuevos_final.json`). `ORDEN` recalculado sobre los 62 activos con alternancia (0 adyacencias).

| idx | título | categoría | dificultad | fuente |
|----|--------|-----------|-----------|--------|
| 40 | La paradoja del ascensor de Gamow | Probabilidad | Media | Que las matemáticas te acompañen (Clara Grima) |
| 41 | ¿Quién siente más frío? | Ingenio | Media | Matemática Recreativa (Perelman) |
| 42 | Las cajas sin etiqueta correcta | Lógica | Media | El encanto de la matemática (Pappas) |
| 43 | La moneda que rueda | Geometría | Difícil | Matemática Recreativa (Perelman) |
| 44 | El intercambio de las manecillas | Números | Difícil | Álgebra recreativa (Perelman) |
| 45 | El río y los dos ferrys | Números | Difícil | Nuevos Acertijos de Sam Loyd (Gardner) |
| 46 | El secreto del balón de fútbol | Geometría | Difícil | Ingeniosos encuentros entre juegos y matemáticas (Stewart) |
| 47 | Los piratas democráticos | Lógica | Difícil | Locos por las matemáticas (Stewart) |
| 48 | ¿Quién gana al Chomp? | Combinatoria | Muy difícil | Locos por las matemáticas (Stewart) |
| 49 | Cuadrar el cuadrado | Geometría | Muy difícil | Locos por las matemáticas (Stewart) |
| 50 | ¿Quién pasa el aro más fácilmente? | Probabilidad | Difícil | Matemática Recreativa (Perelman) |
| 51 | La forma de la metralla | Geometría | Media | Geometría Recreativa (Perelman) |
| 52 | La correa y las tres poleas | Geometría | Difícil | Geometría Recreativa (Perelman) |
| 53 | El horizonte de Gogol | Números | Media | Geometría Recreativa (Perelman) |
| 54 | Cubos bicolores | Combinatoria | Difícil | Matemática para Divertirse (Gardner) |
| 55 | Eva habladora | Números | Difícil | Miscelánea matemática (Gardner) |
| 56 | Los números que se tienen amistad | Números | Media | Miscelánea matemática (Gardner) |
| 57 | El nenúfar y la profundidad del lago | Geometría | Media | Acertijos de Sam Loyd (Gardner) |
| 58 | La pelota perfecta | Geometría | Media | Acertijos de Sam Loyd (Gardner) |
| 59 | Cinco niñas y diez pesadas | Números | Difícil | Nuevos Acertijos de Sam Loyd (Gardner) |
| 60 | Cuántos cuadrados hay en un tablero | Números | Media | El encanto de la matemática (Pappas) |
| 61 | El sorteo justo con moneda trucada | Probabilidad | Media | Que las matemáticas te acompañen (Clara Grima) |
| 62 | La zanja más astuta | Geometría | Muy difícil | Locos por las matemáticas (Stewart) |

## Juego de Hackenbush (`juego/`)

Página independiente jugable en `juego/index.html` (URL `…/problema-del-dia/juego/`), enlazada desde la principal ("🎮 Juega a Hackenbush", bajo el botón de compartir). Es el juego de Conway: cortar palitos de colores por turnos, con la regla del derrumbe. Tiene su propio HTML/CSS/JS (estética del sitio, modo oscuro). **Funciones:** posiciones en el objeto `PRESETS` + array `ORDER`; el selector las agrupa por `nivel` (Fácil/Media/Difícil/Genio/**Diabólico**) + **🗓️ Reto del día** + opción **Editor**. Modos 2 jugadores y **contra la máquina** (IA óptima por **minimax memoizado** `canWin(edges,turno)`). El juego maneja **grafos arbitrarios** (árboles, bosques y **ciclos**) — el derrumbe es por accesibilidad al suelo (`groundedSet`).

### Motor v2 (formas canónicas + infinitesimales) — `2026-06-19`
El botón **"⚖️ ¿Quién gana?"** da el **valor exacto** y el resultado. El motor calcula la **forma canónica** del juego (números surreales dyádicos **y** infinitesimales: ∗k, ↑, ↓, ↑∗, ⇑, ⇑∗, número+infinitesimal como 1∗/¼∗…). Para que sea rápido en el navegador hay **despacho por composición** (`valueLabel`): rojo-azul puro → valor diádico rápido; todo verde → **Grundy/mex** (∗k); mixto pequeño (≤9-10 aristas) → forma canónica completa; mixto grande → solo resultado por minimax. **Validación:** el motor se construyó con un *workflow* de **4 implementaciones independientes** (definición recursiva de ≤, juego-diferencia, casos especiales, algoritmo de Siegel) que **coincidieron en las 18 posiciones de una batería** (consenso 18/18, sin discrepancias) + auto-checks deterministas (G+(−G)=0, Grundy/mex para verdes, diádico para rojo-azul, tricotomía). Etiquetas humanas vía `labelOf` (números exactos + diccionario perezoso de infinitesimales `ensureNamed`). Hay una librería node reutilizable (regenerable; los `_*.js` del directorio están en `.gitignore`).

**Modo 😈 misère** (quien no puede mover GANA): casilla que invierte la regla. Implementación: `canWin` con el caso base volteado (sin jugadas → `misere?true:false`) y `doCut` que asigna `st.winner = misere ? st.turn : mover`. IA, pista y "¿Quién gana?" lo respetan (el valor surreal no aplica en misère → muestra solo el resultado).

**Roster actual (22 posiciones, validadas en node — valor y nº de jugadas ganadoras):**

| nivel | clave | nombre | valor | resultado |
|---|---|---|---|---|
| Fácil | caraacara | Cara a cara | 0 | gana el 2º (espejo) |
| Fácil | media | La media justa | ½ | Azul |
| Media | tira | Tira y afloja | 0 | gana el 2º |
| Media | chispa | Chispa verde | ∗ | gana el 1º (Nim 1·2) |
| Difícil | torcido | El árbol torcido | −⅛ | Rojo · **1 jugada gana** |
| Difícil | ramaesc | La rama escondida | ½ | Azul · **1 jugada gana** |
| Genio | mixto | El duelo del genio | ∗ | siempre Azul |
| Genio | sumacruel | La suma imposible | ⅛ | Azul · 1 de muchas |
| Genio | hidrahielo | La hidra de hielo | 1/16 | Azul · **1 jugada gana** (9 aristas) |
| Genio | roble | El roble de Conway | ⅛ | Azul · **1 jugada gana** (11 aristas) |
| Genio | abismo | El abismo | **−1/64** | Rojo · **1 jugada gana** (11 aristas) |
| Genio | balanza | La balanza del diablo | ∗ | gana el 1º · **1 de 9** (la ramita verde) |
| Genio | abanico | El cuarteto verde | ∗ | gana el 1º (Nim verde 1·2·3·4) |
| Diabólico | soplo | El soplo | **↑** | Azul · **1 jugada gana** (bosque ↑∗+∗) |
| Diabólico | corriente | La corriente | **⇑** | Azul (↑∗+↑∗) |
| Diabólico | ventisca | La ventisca | **⇑∗** | Azul (↑∗+↑∗+∗) |
| Diabólico | marea | La marea | **⇓∗** | Rojo (↓∗+↓∗+∗) |
| Diabólico | anillo | El anillo encantado | **⇑** | Azul · 1 gana · **ciclo** (triáng. verde-azul-verde) |
| Diabólico | conway | El triángulo de Conway | **∗** | gana el 1º · **ciclo** (fusión) |
| Diabólico | amuleto | El amuleto | **½∗** | Azul · 1 gana · **ciclo** |
| Diabólico | rombo | El rombo tramposo | **¼∗** | Azul · 1 gana · **ciclo** (4) |
| Diabólico | diablo | El rombo del diablo | **−¼∗** | Rojo · 1 gana · **ciclo** (4) |

Las de Genio (7-11 aristas) son **árboles ramificados con jugada ganadora ÚNICA**. Las de **Diabólico** son **infinitesimales** (bosques de gadgets: tallo verde-azul=↑∗, verde-rojo=↓∗, verde=∗) y **ciclos** (triángulos/rombos coloreados que dan ∗, ½∗, ¼∗, ⇑…). Todas se diseñan/verifican en node con el motor v2 (`evalFull`) antes de pegar los literales con coordenadas.

**🗓️ Reto del día + compartir:** array `RETOS` (pool de las más duras); `retoKey()` rota por fecha **local** (cambia a medianoche, como los acertijos). Opción "Reto del día" en el selector + botón. **Enlaces:** `?reto` abre el reto de hoy, `?pos=clave` abre una posición concreta (botón 🔗 copia el enlace). El reto no revela el valor (sin spoiler).

**Mejoras de juego (2026-06-19):**
1. **💡 Pista** (`showHint`/`winningMove`): resalta con halo dorado pulsante el palito que gana con juego perfecto para quien mueve; si el turno ya está perdido, lo dice.
2. **Editor con RAMAS y CICLOS** (grafo): `editClick` sobre un grafo `editNodes`/`editEdges`. **Modelo:** pincha el **suelo** → clava una base (queda anclada); toca el **vacío** hacia arriba → crece un palito desde el ancla y re-ancla en la punta (encadena); **toca un nudo existente** → mueve el ancla ahí (ramificar). Con **🔗 Unir nudos** (`linkMode`) tocas dos nudos y nace una arista entre ellos → **ciclos**. `▶ Jugar` poda lo desanclado (`groundedSet`) y juega. (Evita multi-aristas entre los mismos 2 nudos: se solaparían al dibujarse en línea recta.)
3. **Caída animada** (`ghosts`): los trozos que se desprenden al cortar caen con fade (translateY+rotate, ~0.42 s) antes de re-renderizar.
4. **Contador de jugadas + Deshacer** en partida (`history`/`snapshot`/`restore`/`undoMove`): en modo IA, Deshacer revierte la ronda entera.
5. **Bug corregido (la congelación):** `commitCut` hacía el render final con `lock=true` (durante la animación) y al desbloquear NO redibujaba → tras responder la IA los palitos quedaban sin manejador de clic. Fix: bloquear antes de animar y **re-renderizar al desbloquear** (`setTimeout`→`lock=false; render()`).

**Validar en node antes de publicar:** (1) `node --check` del `<script>` extraído; (2) ejecutar el IIFE con un DOM simulado (stub de document/createElementNS/getElementById…) para que `loadPreset`→`render` corran sin throw; (3) para el motor v2 y el roster, recomputar con la librería (`evalFull`) el valor canónico y nº de jugadas ganadoras de cada preset (la batería de 18 tiene oráculo fijo; números ½,⅛,1/16,1/64 y nimbers/infinitesimales ∗k,↑,⇑,↑∗ exactos). **OJO rendimiento:** la forma canónica de posiciones mixtas grandes (>10 aristas) explota (abanico de 10 verdes tardaba 64 s) → el despacho rápido lo evita; mantener los niveles mixtos pequeños. **No depende de la GitHub Action (es estático) → NO hay cache-buster:** forzar recarga (Ctrl+F5) o abrir con `?v=N`. Surgió el 2026-06-19 al explorar a Conway tras bajar *Winning Ways Vol.1* a `Downloads\Conway`.

## Reabastecer problemas

Antes de que el ciclo de ~62 días repita demasiado, minar más acertijos de la biblioteca (`D:\libros_maravillosos\Matemáticas`: Perelman, Gardner, Sam Loyd/Dudeney, Malba Tahan, Ignátiev, Yaglom, Steinhaus, Guik, Lucas, Paenza…). Adaptar (reescribir, no copiar; respeta copyright) y seguir el procedimiento de "Cómo añadir un problema".
