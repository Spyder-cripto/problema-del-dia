# -*- coding: utf-8 -*-
import re

P = "index.html"
s = open(P, encoding="utf-8").read()

problemas = [
 dict(tipo="Geometría", fuente="Instantáneas matemáticas",
  titulo="El triángulo de un séptimo",
  enun="En un triángulo cualquiera, marca sobre cada lado el punto que lo divide en razón 2:1 (siempre en el mismo sentido de recorrido). Une cada uno de esos tres puntos con el vértice opuesto. Las tres rectas no se cortan en un mismo punto: dejan en el centro un pequeño triángulo. ¿Qué fracción del área del triángulo original ocupa ese triángulo central?",
  sol="Exactamente <b>una séptima parte</b>. Es un resultado tan limpio como inesperado: el resto del triángulo se descompone en seis piezas que se reagrupan en seis copias del triangulito central, de modo que este cabe <b>7 veces</b> en el total. (Por el teorema de Routh, para la razón 2:1 sale (2−1)²/(2²+2+1) = 1/7.)",
  pistas=["No te lances a calcular áreas con coordenadas: el resultado es una fracción sorprendentemente simple.","Intenta diseccionar el triángulo grande en piezas iguales al central. ¿Cuántas copias del triangulito caben exactamente?"],
  dibujo="<path d='M50 24 L80 74 L20 74 Z' fill='none' stroke='#2f6fb0' stroke-width='3' stroke-linejoin='round'/><g stroke='#e23b2f' stroke-width='1.5'><line x1='50' y1='24' x2='40' y2='74'/><line x1='80' y1='74' x2='34' y2='49'/><line x1='20' y1='74' x2='66' y2='49'/></g><path d='M46 55 L57 53 L51 64 Z' fill='#ffd23f' stroke='#f2a900' stroke-width='1.6' stroke-linejoin='round'/>"),

 dict(tipo="Combinatoria", fuente="Instantáneas matemáticas",
  titulo="Un hilo para todas las diagonales",
  enun="Clavas n chinchetas formando un polígono regular y quieres recorrer, con un único hilo continuo y cerrado, todos los lados y todas las diagonales (es decir, unir cada par de chinchetas exactamente una vez), sin repetir ningún segmento y volviendo al punto de partida. Con 23 chinchetas se consigue; con 24 es imposible; con 25 vuelve a poderse. ¿Qué condición sobre n decide cuándo se puede?",
  sol="Se puede <b>si y solo si n es impar</b>. De cada chincheta salen n−1 segmentos (se une con todas las demás). Un recorrido cerrado que use cada segmento una sola vez (un «circuito euleriano») existe solo cuando de cada punto sale un número <b>par</b> de líneas. Y n−1 es par precisamente cuando n es impar. Por eso 23 y 25 sí, y 24 no.",
  pistas=["Olvida la geometría y fíjate solo en cuántas líneas salen de cada chincheta.","Para entrar y salir de cada punto sin repetir, ese número de líneas debe ser par. ¿Cuándo lo es?"],
  dibujo="<g stroke='#2f6fb0' stroke-width='2.5' fill='none'><polygon points='50,22 78,43 67,76 33,76 22,43'/><line x1='50' y1='22' x2='67' y2='76'/><line x1='50' y1='22' x2='33' y2='76'/><line x1='78' y1='43' x2='33' y2='76'/><line x1='78' y1='43' x2='22' y2='43'/><line x1='22' y1='43' x2='67' y2='76'/></g>"),

 dict(tipo="Ingenio", fuente="Instantáneas matemáticas",
  titulo="Las tablas garantizadas",
  enun="Un jugador de ajedrez mediocre acepta enfrentarse a la vez a dos grandes maestros, ambos muy superiores a él. Aun sin saber apenas jugar, afirma que puede garantizar al menos 1 punto entre las dos partidas (una victoria, o bien dos tablas). ¿Cómo lo consigue?",
  sol="Juega con <b>blancas contra uno y con negras contra el otro</b>, y se limita a <b>copiar de un tablero al otro</b>: lleva la apertura del que juega con blancas a su partida con negras, y la respuesta de este de vuelta al primero, y así sin parar. En realidad son los dos maestros quienes juegan entre sí sin saberlo. Su resultado es la suma de ambas partidas: si gana uno y pierde el otro (1+0) o empatan los dos (½+½), siempre suma <b>exactamente 1 punto</b>.",
  pistas=["No tiene que jugar bien; solo tiene que <i>transmitir</i> jugadas.","¿Y si lograra que los dos maestros, sin saberlo, jugaran en realidad el uno contra el otro?"],
  dibujo="<rect x='26' y='42' width='48' height='34' fill='none' stroke='#9a6f2e' stroke-width='3'/><path d='M26 53 H74 M26 65 H74 M42 42 V76 M58 42 V76' stroke='#9a6f2e' stroke-width='1'/><path d='M30 36 l4 -8 4 8 z' fill='#7fb0e6' stroke='#2f6fb0' stroke-width='1.5'/><path d='M62 36 l4 -8 4 8 z' fill='#e87aa8' stroke='#c2557f' stroke-width='1.5'/>"),

 dict(tipo="Números", fuente="Álgebra recreativa",
  titulo="Las tres hermanas y los pollos",
  enun="Tres hermanas van al mercado con 10, 16 y 26 pollos. Por la mañana venden parte, todas al mismo precio por pollo; por la tarde rebajan y venden el resto, de nuevo todas al mismo precio (más bajo). Al volver a casa, las tres han recaudado <b>lo mismo</b>: 35 monedas cada una. ¿A cuánto vendieron el pollo por la mañana y a cuánto por la tarde?",
  sol="A <b>3,75 por la mañana</b> y <b>1,25 por la tarde</b>. (La de 10 vendió 9 y 1; la de 16, 6 y 10; la de 26, 1 y 25.) Comprueba: 9·3,75+1·1,25 = 6·3,75+10·1,25 = 1·3,75+25·1,25 = 35. Hay más incógnitas que ecuaciones, pero exigir que los pollos vendidos sean números enteros fuerza esta única solución.",
  pistas=["Parece que faltan datos: hay muchas incógnitas. La clave es que los pollos vendidos son números enteros.","La que llevaba más pollos tuvo que vender muchos en la tarde barata; la que llevaba menos, casi todos por la mañana cara. Tantea con esa idea."],
  dibujo="<circle cx='38' cy='46' r='13' fill='#ffd23f' stroke='#f2a900' stroke-width='2.5'/><circle cx='62' cy='46' r='13' fill='#ffd23f' stroke='#f2a900' stroke-width='2.5'/><circle cx='50' cy='66' r='13' fill='#ffd23f' stroke='#f2a900' stroke-width='2.5'/><text x='50' y='71' font-size='12' text-anchor='middle' fill='#9a6f2e' font-family='Georgia,serif'>35</text>"),

 dict(tipo="Ingenio", fuente="Juegos matemáticos recreativos",
  titulo="La palabra en una sola pregunta",
  enun="Tu rival piensa una palabra secreta de cinco letras <b>distintas</b>. Tú propones una «palabra» cualquiera (con las letras y repeticiones que quieras) y él te responde con un solo número: cuántas veces, en total, aparecen en tu palabra las letras de la suya. ¿Puedes garantizar acertar las cinco letras secretas con <b>una sola pregunta</b>?",
  sol="Sí. Numera las letras del abecedario y construye una «palabra» en la que la 1.ª letra aparezca 1 vez; la 2.ª, 10 veces; la 3.ª, 100; la 4.ª, 1000… cada una una potencia de 10. Como las cinco letras secretas son distintas, cada una aporta una potencia de 10 diferente y <b>nunca se mezclan al sumar</b>: la respuesta es un número con exactamente cinco unos, y la posición de cada 1 te dice qué letra es.",
  pistas=["Quieres que una sola respuesta numérica esconda cinco datos independientes a la vez.","¿Qué pasa si cada letra aporta una cifra distinta del número-respuesta? Piensa en potencias de 10."],
  dibujo="<text x='50' y='44' font-size='17' text-anchor='middle' fill='#2f6fb0' font-family='Georgia,serif'>?????</text><text x='50' y='70' font-size='15' text-anchor='middle' fill='#e23b2f' font-family='Georgia,serif'>10101</text>"),

 dict(tipo="Lógica", fuente="El laberinto y otros juegos matemáticos",
  titulo="Los maridos celosos",
  enun="Varias parejas (marido y mujer) deben cruzar un río en una barca de solo dos plazas. La regla es estricta: ninguna mujer puede quedar jamás en compañía de un hombre que no sea su marido si su marido no está presente (ni en las orillas ni en la barca). El célebre Tartaglia aseguró que cuatro parejas podían cruzar así. ¿Tenía razón? ¿Cuántas parejas, como máximo, pueden cruzar?",
  sol="Tartaglia se equivocó. Con barca de dos plazas, el máximo es <b>tres parejas</b> (que sí cruzan); con <b>cuatro o más es imposible</b>. La intuición engaña: parece que con paciencia siempre se puede, pero al analizar los traslados aparece una barrera infranqueable. (Curiosamente, con una barca de <b>tres</b> plazas, las cuatro parejas sí lo logran.)",
  pistas=["Lleva la cuenta, en cada orilla, de cuántos hombres y mujeres quedan tras cada viaje.","El problema está en los viajes de vuelta: alguien debe regresar, y eso casi siempre deja a una mujer mal acompañada. Intenta demostrar que con 4 no hay forma."],
  dibujo="<path d='M16 64 q9 7 18 0 t18 0 t18 0' fill='none' stroke='#7fb0e6' stroke-width='2.5'/><path d='M34 50 h32 l-6 12 h-20 z' fill='#9a6f2e' stroke='#6f5320' stroke-width='2' stroke-linejoin='round'/><line x1='50' y1='50' x2='50' y2='34' stroke='#6f5320' stroke-width='2'/><path d='M50 34 l12 6 -12 5 z' fill='#e23b2f'/>"),

 dict(tipo="Geometría", fuente="Matemáticas e imaginación",
  titulo="La araña y la mosca",
  enun="Una habitación tiene forma de caja: 30 pies de largo, y 12 de ancho y de alto. En el centro de una pared pequeña, a 1 pie del techo, hay una araña; en el centro de la pared opuesta, a 1 pie del suelo, una mosca quieta. La araña solo puede caminar por las superficies (paredes, suelo y techo), nunca por el aire. ¿Cuál es el camino más corto hasta la mosca?",
  sol="<b>40 pies.</b> El camino «evidente» —bajar 1 pie, cruzar los 30 del suelo y subir 11— mide 42. Pero si <b>despliegas</b> la habitación sobre un plano, como una caja de cartón abierta, el trayecto óptimo se vuelve una línea recta: la hipotenusa de un triángulo de catetos 32 y 24, que mide √(32²+24²) = 40. ¡Y obliga a la araña a pisar cinco de las seis caras de la habitación!",
  pistas=["El camino más corto sobre una superficie engaña si lo piensas en 3D. Aplana el problema.","Recorta mentalmente la habitación y despliégala en plano; entonces el camino más corto es una recta. Busca el despliegue que dé la recta más corta."],
  dibujo="<path d='M28 40 L60 40 L72 30 L40 30 Z' fill='none' stroke='#9a6f2e' stroke-width='2.5' stroke-linejoin='round'/><rect x='28' y='40' width='32' height='30' fill='none' stroke='#9a6f2e' stroke-width='2.5'/><path d='M60 40 L72 30 L72 60 L60 70 Z' fill='none' stroke='#9a6f2e' stroke-width='2.5' stroke-linejoin='round'/><circle cx='34' cy='36' r='3' fill='#2b2620'/><circle cx='64' cy='64' r='2.5' fill='#e23b2f'/><line x1='34' y1='36' x2='64' y2='64' stroke='#e23b2f' stroke-width='1.4' stroke-dasharray='3 3'/>"),

 dict(tipo="Probabilidad", fuente="Matemáticas e imaginación",
  titulo="El juego interrumpido",
  enun="Dos personas juegan lanzando una moneda: gana quien primero llegue a 3 puntos, y el ganador se lleva todo el bote. Pero el juego se interrumpe cuando van <b>2 a 1</b>. Si hay que repartir el bote en ese momento, sin seguir jugando, ¿qué parte le toca a cada uno para que sea justo?",
  sol="<b>3/4 para el que va ganando (2–1) y 1/4 para el otro.</b> Lo justo no es repartir según los puntos logrados, sino según la probabilidad de ganar si se continuara. Al rezagado le harían falta dos aciertos seguidos: en dos tiradas más (casos AA, AB, BA, BB, cada uno 1/4) solo gana con BB. Luego gana 1 de cada 4. Con este razonamiento Pascal y Fermat fundaron el cálculo de probabilidades.",
  pistas=["No repartas por los puntos ya conseguidos; piensa en qué habría pasado si hubierais seguido.","Bastan dos tiradas más para resolver el juego. Enumera los cuatro resultados posibles y mira en cuántos gana cada uno."],
  dibujo="<circle cx='40' cy='42' r='14' fill='#ffd23f' stroke='#f2a900' stroke-width='2.5'/><line x1='24' y1='66' x2='76' y2='66' stroke='#9a6f2e' stroke-width='2'/><text x='38' y='82' font-size='13' text-anchor='middle' fill='#2f6fb0' font-family='Georgia,serif'>¾</text><text x='64' y='82' font-size='13' text-anchor='middle' fill='#e23b2f' font-family='Georgia,serif'>¼</text>"),

 dict(tipo="Geometría", fuente="Instantáneas matemáticas",
  titulo="El huerto de Pólya",
  enun="En cada cruce de una cuadrícula de paso 1 hay plantado un árbol, modelado como un círculo de radio r muy pequeño. Te colocas justo en uno de los cruces (quitando ese árbol) y miras en línea recta. Por bien que elijas la dirección, antes o después la visión topa con un tronco. ¿Hasta qué distancia máxima puedes llegar a ver entre los árboles?",
  sol="Nunca más allá de <b>1/r</b>. La razón usa un bello teorema de Minkowski: si tu visual llegara más lejos que 1/r, a su alrededor cabría un rectángulo de área 4 centrado en tu cruce; y todo rectángulo así de grande, centrado en un punto de la red, contiene forzosamente otro punto de la red, es decir, otro árbol que tapa la vista. Así que el alcance máximo es exactamente 1/r: cuanto más finos los troncos, más lejos se ve.",
  pistas=["La respuesta depende solo de r, y es de una sencillez sorprendente.","Rodea tu línea de visión con una franja del ancho de un tronco. ¿A qué longitud esa franja es tan grande que tiene que contener otro punto de la cuadrícula?"],
  dibujo="<g fill='#2f6fb0'><circle cx='30' cy='30' r='3'/><circle cx='50' cy='30' r='3'/><circle cx='70' cy='30' r='3'/><circle cx='30' cy='50' r='3'/><circle cx='70' cy='50' r='3'/><circle cx='30' cy='70' r='3'/><circle cx='50' cy='70' r='3'/><circle cx='70' cy='70' r='3'/></g><circle cx='50' cy='50' r='3.5' fill='none' stroke='#e23b2f' stroke-width='1.8'/><line x1='50' y1='50' x2='84' y2='38' stroke='#e23b2f' stroke-width='1.8' stroke-dasharray='3 3'/>"),

 dict(tipo="Ingenio", fuente="Geometría recreativa",
  titulo="La corneja y el jarro",
  enun="Una corneja sedienta quiere subir el nivel del agua de un jarro de paredes rectas echando dentro piedras esféricas, todas iguales, que se van apilando. Si el agua llega al principio <b>justo a la mitad</b> del jarro, ¿conseguirá que suba hasta el borde para beber? ¿Y si parte de menos de la mitad?",
  sol="Solo lo logra si el agua llega <b>al menos a la mitad</b>. Las esferas, por bien que se apilen, dejan huecos entre ellas: el espacio vacío ronda el <b>48 %</b> del volumen que ocupan (1 − π/6 ≈ 0,476). El agua tiene que <i>rellenar esos huecos</i> antes de poder rebasar las piedras; si parte de menos de la mitad, se queda en los intersticios y nunca sube por encima. La fábula solo funciona si ya había agua suficiente.",
  pistas=["Las piedras no llenan todo el espacio: piensa en lo que queda entre esferas.","Compara el volumen de agua con el de los huecos entre las piedras. ¿Qué porcentaje del jarro son huecos?"],
  dibujo="<path d='M36 32 H64 L60 74 H40 Z' fill='none' stroke='#9a6f2e' stroke-width='2.5' stroke-linejoin='round'/><path d='M41 52 H59 L58 68 H42 Z' fill='#7fb0e6' opacity='0.55'/><circle cx='46' cy='61' r='5' fill='#a9a9a9' stroke='#6f6f6f' stroke-width='1.4'/><circle cx='55' cy='63' r='5' fill='#a9a9a9' stroke='#6f6f6f' stroke-width='1.4'/><circle cx='50' cy='53' r='5' fill='#a9a9a9' stroke='#6f6f6f' stroke-width='1.4'/>"),
]

N0 = 30  # primer índice nuevo

# ---- 1) objetos en PROBLEMAS ----
objs = ""
for pr in problemas:
    enun_plano = re.sub(r"<[^>]+>", "", pr["enun"])  # el enunciado se pinta con textContent: sin HTML
    objs += "  {\n"
    objs += '    titulo:"%s",\n' % pr["titulo"]
    objs += '    fuente:"%s",\n' % pr["fuente"]
    objs += '    enun:"%s",\n' % enun_plano
    objs += '    sol:"%s"\n' % pr["sol"]
    objs += "  },\n"
anchor = "];\n\n// ====== ORDEN DE PUBLICACIÓN"
assert anchor in s, "no encuentro cierre de PROBLEMAS"
s = s.replace(anchor, objs + anchor, 1)

# ---- 2) TIPO ----
tipo_entries = "".join(',%d:"%s"' % (N0+i, pr["tipo"]) for i, pr in enumerate(problemas))
s = s.replace('29:"Números"};', '29:"Números"%s};' % tipo_entries, 1)

# ---- 3) DIF (todos 3) ----
dif_entries = "".join(',%d:3' % (N0+i) for i in range(len(problemas)))
s = s.replace('29:2};', '29:2%s};' % dif_entries, 1)

# ---- 4) PISTAS ----
pistas_block = ""
for i, pr in enumerate(problemas):
    p1, p2 = pr["pistas"]
    pistas_block += '\n  %d:["%s","%s"],' % (N0+i, p1, p2)
s = s.replace('por minuto."]\n};', 'por minuto."],%s\n};' % pistas_block, 1)

# ---- 5) DIBUJOS ----
dib_block = ""
for i, pr in enumerate(problemas):
    dib_block += '\n  %d:"%s",' % (N0+i, pr["dibujo"])
m = re.search(r"(const DIBUJOS = \{.*?)(\n[ \t]*\};)", s, re.S)
assert m, "no encuentro DIBUJOS"
head = m.group(1)
sep = "" if head.rstrip().endswith(",") else ""
s = s[:m.start()] + head + dib_block + m.group(2) + s[m.end():]

open(P, "w", encoding="utf-8").write(s)
print("Insertados", len(problemas), "problemas (indices 30-39).")
