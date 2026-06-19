# Mantenimiento — "El problema del día"

Guía para retomar y mantener el proyecto en frío. Todo vive en un único **`index.html`** (HTML + CSS + JS + datos).

- **Repo:** `Spyder-cripto/problema-del-dia`
- **Live:** https://spyder-cripto.github.io/problema-del-dia/ (GitHub Pages, rama `main`, raíz)
- **Local:** `C:\Proyectos\TRIPLEX\problema-del-dia\`
- **Serie iniciada:** 2026-06-17 (día 1 = "La herencia de las ovejas"). La constante `INICIO` en `index.html` fija el día 1.

## Qué es

Una web estática que muestra **un acertijo matemático cada día**. El problema cambia solo a medianoche (hora **local del visitante**), calculado en JS por la fecha — no hay backend ni publicación manual. Hay **40 problemas** (a 2026-06-18); el ciclo dura ~40 días y luego repite.

## Modelo de datos (en `index.html`)

- **`PROBLEMAS`** — array de objetos. Campos: `titulo`, `fuente`, `enun`, `sol`, y opcional `fig` (SVG de una figura geométrica que se muestra junto a la solución).
- **`ORDEN`** — array de índices = la secuencia diaria. Diseñada para que **las categorías se alternen** (nunca dos iguales seguidas, ni en el cierre cíclico). Contiene TODOS los problemas activos (los 40 menos los excluidos). Día N de la serie = `ORDEN[(N-1) % ORDEN.length]`.
- **`EXCLUIDOS`** — índices retirados de la rotación (p. ej. `[28]`, "Calcetines a oscuras", demasiado fácil).
- **`SEQ`** = `ORDEN` + (cualquier índice que no esté en ORDEN ni en EXCLUIDOS, anexado al final). Hoy ORDEN ya contiene todo, así que SEQ = ORDEN (39).
- **`TIPO`** — `{índice: categoría}`. Categorías válidas (con color en `CLASE_TIPO`): **Geometría, Números, Lógica, Probabilidad, Combinatoria, Ingenio**. NO existe "Álgebra" (usar "Números").
- **`DIF`** — `{índice: 1|2|3}` (1=Fácil, 2=Media, 3=Difícil).
- **`PISTAS`** — `{índice: [..]}`. **Difícil → 2 pistas; Media → 1; Fácil → 0.** Respeta el número según la dificultad.
- **`DIBUJOS`** — `{índice: "SVG"}` garabato infantil (viewBox 0 0 100 100, va sobre `PAPEL`). Si falta, usa `DEFECTO` (carita). 
- **`INICIO`** — fecha del día 1 (`"2026-06-17"`).
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

Minados y adaptados de la biblioteca de mate descargada (ver carpeta `Downloads\libros_maravillosos\Matemáticas`, ~110 libros más para seguir):

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

## Juego de Hackenbush (`juego/`)

Página independiente jugable en `juego/index.html` (URL `…/problema-del-dia/juego/`), enlazada desde la principal ("🎮 Juega a Hackenbush", bajo el botón de compartir). Es el juego de Conway: cortar palitos de colores por turnos, con la regla del derrumbe. Tiene su propio HTML/CSS/JS (estética del sitio, modo oscuro). **Funciones:** posiciones en el objeto `PRESETS` + array `ORDER` (constructor `forest(columns,segH)` para bosques de tallos, o `F(...)`, o nodos/aristas a mano para árboles); el selector las agrupa por `nivel` (Fácil/Media/Difícil/Genio) + opción **Editor** (construye posiciones propias clicando). Modos 2 jugadores y **contra la máquina** (IA óptima por **minimax memoizado** sobre el conjunto de aristas — `canWin(edges,turno)`). Botón **"¿Quién gana?"** = **valor exacto** (`value()`/`simplest()`: números surreales dyádicos para posiciones Rojo-Azul; ∗ "no numérico" si hay verdes) + clase de resultado (siempre Azul / siempre Rojo / el primero / el segundo). **Validar en node antes de publicar** (`node --check` del script + test de `value()`/`canWin()` sobre las posiciones nuevas; valores tipo ½,¾,⅛,1/32,1/64, Nim verde 1·2·3 → segundo). Estado actual: podado a 2 posiciones Genio («El duelo del genio», «La suma imposible»=⅛) + Editor. **No depende de la GitHub Action (es estático) → NO hay cache-buster:** al editarlo, en el navegador hay que forzar recarga (Ctrl+F5) o abrir con `?v=N`; si no, se ve la versión cacheada. Surgió el 2026-06-19 al explorar a Conway tras bajar *Winning Ways Vol.1* a `Downloads\Conway`.

## Reabastecer problemas

Antes de que el ciclo de ~40 días repita demasiado, minar más acertijos de la biblioteca (`Downloads\libros_maravillosos\Matemáticas`: Perelman, Gardner, Sam Loyd/Dudeney, Malba Tahan, Ignátiev, Yaglom, Steinhaus, Guik, Lucas, Paenza…). Adaptar (reescribir, no copiar; respeta copyright) y seguir el procedimiento de "Cómo añadir un problema".
