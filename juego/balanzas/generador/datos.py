"""Contenido de cada acertijo de la colección «Balanzas imposibles»."""

def eq(s):
    return f'<span class="eq">{s}</span>'

PUZLES = [
    dict(
        id="puerto", num=1, titulo="Balanza del puerto", svg="svg/01-puerto.svg",
        pregunta="¿Cuántas balas de cañón debe haber en el cofre?",
        unidad="Balas en el cofre",
        reglas=["Los globos llevan helio: tiran hacia arriba.", "La rampa es lisa: el cañón rueda sin rozamiento."],
        respuesta=9,
        trampas={5: "Casi. Algo cuelga justo bajo un punto de giro: no inclina su viga, pero sí pesa para la de arriba.",
                 8: "Revisa la rampa: mide 10 de largo y 6 de alto."},
        pistas=["Las dos vigas que cuelgan de la de arriba comparten las mismas incógnitas (barril y globo): plantea sus dos ecuaciones y resuélvelas juntas.",
                "La polea de la derecha se mueve con el ancla, y en la rampa importa la relación entre la altura y la longitud de la cuesta. Además, lo que cuelga justo bajo un punto de giro no inclina esa viga, pero sí pesa para la viga de la que cuelga."],
        pasos=[
            ("Las dos vigas colgantes, a la vez",
             "<p>Toma la bala como unidad. Llama B al barril y G a lo que levanta un globo.</p>"
             "<p>Viga de la derecha: 3 balas a 2 puntos contra el barril con globo a 2 y una bala a 4.</p>"
             + eq("3·2 = (B − G)·2 + 1·4 → B − G = 1")
             + "<p>Viga de la izquierda: barril a 3 y globo a 1 contra 3 balas a 2. Las 2 balas que cuelgan del eje no la inclinan.</p>"
             + eq("B·3 − G·1 = 3·2 → 3B − G = 6") + eq("Restando: 2B = 5 → B = 2,5 ; G = 1,5")),
            ("La polea móvil",
             "<p>El ancla cuelga de dos tramos de cuerda y cada uno aguanta la mitad. La viga solo nota A/2, a 4 puntos.</p>"
             + eq("(A/2)·4 = 2,5·2 + 1·3 = 8 → A = 4")),
            ("La rampa",
             "<p>Mide 10 de largo y 6 de alto, así que el cañón tira de la cuerda con 6/10 de su peso. Esa cuerda levanta al cañón de la viga, que solo apoya C − 0,6·C = 0,4·C.</p>"
             + eq("0,4·C·4 = 4·2 → 1,6·C = 8 → C = 5")),
            ("Peso de cada viga colgante",
             "<p>Ahora sí cuentan las 2 balas que cuelgan del eje izquierdo.</p>"
             + eq("Izquierda: 2,5 − 1,5 + 3 + 2 = 6") + eq("Derecha: 3 + 2,5 − 1,5 + 1 = 5")),
            ("La viga del mástil",
             "<p>El loro está sobre el eje y no influye.</p>"
             + eq("6·4 + 5·2 + 4·1 = 5·4 + x·2 → 38 = 20 + 2x")),
        ],
        final="En el cofre hay 9 balas de cañón.",
        pesos=[("Bala", "1"), ("Globo", "−1,5"), ("Barril", "2,5"), ("Ancla", "4"), ("Cañón", "5")],
        distractores="el loro, las gaviotas, el cangrejo, las balas apiladas en la arena, el salvavidas, el velero y el brazo fijo del mástil",
    ),
    dict(
        id="taller", num=2, titulo="El taller del inventor", svg="svg/02-taller.svg",
        pregunta="¿Cuántas tuercas debe haber en la caja de herramientas?",
        unidad="Tuercas en la caja",
        reglas=["Los azulejos son cuadrados iguales, del mismo ancho que la separación entre los puntos de las vigas.",
                "La rueda amarilla y su eje rojo giran juntos; los puntos de su radio están a la misma distancia."],
        respuesta=12,
        trampas={8: "Casi. Hay algo colgado justo bajo el eje de una viga colgante: no la inclina, pero pesa para la de arriba.",
                 16: "La cuerda del torno tira hacia arriba de la viga colgante: le quita peso, no se lo suma."},
        pistas=["Empieza por la palanca naranja, la viga azul de abajo y la viga que cuelga a la izquierda: entre las tres fijan el peso de la bombilla, la tetera y el despertador.",
                "Torno: la fuerza por el radio debe ser igual a ambos lados. Doble polea: cada polea móvil reparte su carga entre dos tramos. Palanca acodada: solo cuenta la distancia horizontal al eje, y los azulejos la miden."],
        pasos=[
            ("La palanca acodada",
             "<p>Toma la tuerca como unidad: B bombilla, T tetera, D despertador. En una palanca doblada solo importa la distancia horizontal al eje: el despertador está a 2 azulejos y la bombilla con su tuerca a 4.</p>"
             + eq("D·2 = (B + 1)·4 → D = 2B + 2")),
            ("La doble polea",
             "<p>El despertador cuelga de una polea móvil: cada tramo aguanta D/2. Uno de esos tramos sostiene la segunda polea móvil, cuyos tramos aguantan D/4. La viga azul de abajo nota D/4 a 4 puntos.</p>"
             + eq("(D/4)·4 = T·1 + 1·2 → D = T + 2")),
            ("El torno y la viga colgante",
             "<p>La tetera cuelga del eje (radio 1) y la cuerda de la rueda sale a radio 3, así que tira con T/3. Tira hacia arriba del punto 3 de la viga colgante, como si empujara hacia abajo al otro lado.</p>"
             + eq("(T/3)·3 + 1·1 = 2·2 + B·1 → T = B + 3")
             + eq("D = T + 2 = B + 5 y D = 2B + 2 → B = 3 ; T = 6 ; D = 8")),
            ("Peso de la viga colgante",
             "<p>Cuentan las 2 tuercas bajo su eje, y la cuerda del torno le quita T/3 = 2.</p>"
             + eq("2 + 3 + 2 + 1 − 2 = 6")),
            ("La viga principal",
             eq("6·4 + 3·3 + 8·2 = 1·1 + x·2 + 6·4 → 49 = 25 + 2x")),
        ],
        final="En la caja hay 12 tuercas.",
        pesos=[("Tuerca", "1"), ("Bombilla", "3"), ("Tetera", "6"), ("Despertador", "8")],
        distractores="la lámpara del techo, los engranajes de la pared, el ratón y el destornillador",
    ),
    dict(
        id="nieve", num=3, titulo="Noche de nieve", svg="svg/03-nieve.svg",
        pregunta="¿Cuántos regalos debe haber en el saco?",
        unidad="Regalos en el saco",
        reglas=["Los globos llevan helio: tiran hacia arriba.",
                "La colina es de hielo: los trineos resbalan sin rozamiento y no pesan."],
        respuesta=9,
        trampas={4: "La polea de la izquierda sostiene lo que cuelga a los dos lados de su cuerda, no solo uno."},
        pistas=["La polea de la izquierda gira libre, así que su cuerda tira igual de los dos lados. Lo mismo pasa con la cuerda de la colina: tira igual de los dos trineos.",
                "En una cuesta, un objeto tira de la cuerda con su peso multiplicado por altura/longitud. El globo del trineo le quita peso al muñeco. Y la viga de arriba flota: tira hacia arriba de la principal."],
        pasos=[
            ("La polea de la izquierda",
             "<p>Toma el regalo como unidad: M muñeco, B bola, G globo. La cuerda tira igual de los dos lados, así que ambos lados pesan lo mismo.</p>"
             + eq("M = 2B + 1")),
            ("La colina",
             "<p>Las dos laderas tienen altura 2. Cada trineo tira de la cuerda con su peso por 2/longitud. El globo le quita G al muñeco.</p>"
             + eq("3·(2/6) = (M − G)·(2/4) → M − G = 2")),
            ("La viga flotante",
             "<p>Gira alrededor del nudo de su cuerda. Un globo a la izquierda equivale a un peso a la derecha, y al revés.</p>"
             + eq("(B + 1)·1 + G·2 = G·3 → G = B + 1")
             + eq("2B + 1 − (B + 1) = 2 → B = 2 ; G = 3 ; M = 5")),
            ("Lo que nota la viga principal",
             "<p>La polea cuelga con los dos lados: 2·5 = 10. La viga flotante pesa 2 + 1 + 1 − 3 − 3 = −2: tira 2 hacia arriba. El regalo de encima, justo en el nudo, también cuenta.</p>"),
            ("La viga del farol",
             eq("10·3 + 1·1 = −2·2 + x·3 + 2·4 → 31 = 4 + 3x")),
        ],
        final="En el saco hay 9 regalos.",
        pesos=[("Regalo", "1"), ("Bola", "2"), ("Globo", "−3"), ("Muñeco", "5")],
        distractores="el muñeco de nieve del suelo, el pingüino, la estrella del farol, los abetos y la luna",
    ),
    dict(
        id="circo", num=4, titulo="El gran circo", svg="svg/04-circo.svg",
        pregunta="¿Cuántos bolos debe haber en el baúl?",
        unidad="Bolos en el baúl",
        reglas=["Los globos llevan helio: tiran hacia arriba.",
                "La barra azul (el trapecio) no tiene eje: cuelga solo de sus dos cuerdas."],
        respuesta=13,
        trampas={9: "Casi. Hay algo colgado justo bajo el eje de la viga colgante de la izquierda: no la inclina, pero pesa para la de arriba."},
        pistas=["La barra azul cuelga de dos cuerdas: cada peso se reparte entre ellas según lo cerca que esté de cada una. Y la pesa de arriba a la izquierda tira hacia arriba de su viga a través de la polea.",
                "La viga verde, la colgante de la izquierda y las dos vigas de los postes dan cuatro ecuaciones con pelota, tambor, pesa y globo. Ninguna se resuelve sola: hay que combinarlas."],
        pasos=[
            ("La viga verde",
             "<p>Toma el bolo como unidad: Pe pelota, Ta tambor, Ps pesa, G globo.</p>"
             + eq("Ps·2 = Ta·3 → Ps = 1,5·Ta")),
            ("La viga colgante de la izquierda",
             "<p>Los 2 bolos de su eje no la inclinan. El globo tira hacia arriba a 1 punto, como un peso al otro lado.</p>"
             + eq("Pe·3 = G·1 + 1·3 → G = 3·Pe − 3")),
            ("El trapecio reparte su carga",
             "<p>Sus cuerdas están a 4 puntos. Un peso a d puntos de la cuerda izquierda manda (4 − d)/4 a esa cuerda y d/4 a la otra.</p>"
             + eq("Cuerda izquierda: (3·Ta − 2·G + Pe)/4")
             + eq("Cuerda derecha: (Ta − 2·G + 3·Pe)/4")),
            ("Las vigas de los postes",
             "<p>Derecha: la cuerda del trapecio a 3 contra un bolo a 3, así que esa cuerda carga 1.</p>"
             + eq("Ta − 2·G + 3·Pe = 4 → Ta = 3·Pe − 2")
             + "<p>Izquierda: la pesa del contrapeso tira hacia arriba a 3, como un peso al otro lado.</p>"
             + eq("2·Ta·2 + 2·4 = Ps·3 + 3·(3·Ta − 2·G + Pe)/4")
             + eq("Sustituyendo: 18·Pe − 4 = 32 → Pe = 2 ; Ta = 4 ; Ps = 6 ; G = 3")),
            ("La viga de arriba",
             "<p>La viga colgante pesa 2 + 2 + 1 − 3 = 2 (cuentan los bolos del eje).</p>"
             + eq("2·4 + 4·2 + 6·3 = x·2 + 2·4 → 34 = 2x + 8")),
        ],
        final="En el baúl hay 13 bolos.",
        pesos=[("Bolo", "1"), ("Pelota", "2"), ("Globo", "−3"), ("Tambor", "4"), ("Pesa", "6")],
        distractores="la foca y su pelota, los bolos tirados en la pista, los banderines y las estrellas de los postes",
    ),
    dict(
        id="selva", num=5, titulo="La selva", svg="svg/05-selva.svg",
        pregunta="¿Cuántos cocos debe haber en la cesta?",
        unidad="Cocos en la cesta",
        reglas=["La estaca de abajo a la derecha está clavada en el suelo.",
                "La rama de arriba y los bambúes son fijos."],
        respuesta=11,
        trampas={19: "La viga de la izquierda cuelga de una polea móvil: la viga de arriba solo nota la mitad de su peso."},
        pistas=["Las dos vigas de abajo a la izquierda comparten una cuerda: tira con la misma fuerza de las dos hacia arriba. No sabes cuánto vale esa fuerza, pero puedes eliminarla.",
                "La polea de la derecha está montada en su viga: sus dos tramos tiran hacia abajo, también el que está atado al suelo. Y la viga que cuelga de la polea móvil solo entrega la mitad de su peso."],
        pasos=[
            ("La polea montada en la viga",
             "<p>Toma el coco como unidad: Pl plátanos, Pi piña, Ma mango. La cuerda tira igual de la estaca que de los plátanos, y los dos tramos cuelgan de la polea: la viga nota 2·Pl a 3 puntos.</p>"
             + eq("2·Pl·3 = (Pi + 1)·2 → Pi = 3·Pl − 1")),
            ("Las dos vigas con cuerda compartida",
             "<p>La cuerda tira hacia arriba con la misma fuerza T de las dos. Un tirón hacia arriba equivale a un peso al otro lado del eje.</p>"
             + eq("Viga de la derecha: T·3 = Pl·2 + Pi·1")
             + eq("Viga de la izquierda: 1·2 + T·4 = (Pi + Pl)·2")
             + eq("Eliminando T: Pi = Pl + 3")
             + eq("3·Pl − 1 = Pl + 3 → Pl = 2 ; Pi = 5 ; T = 3")),
            ("La viga de la polea móvil",
             "<p>Los plátanos de su eje no la inclinan.</p>"
             + eq("Ma·3 = (5 + 1)·2 → Ma = 4")
             + "<p>Pesa 4 + 2 + 5 + 1 = 12, y la polea móvil solo pasa la mitad a la viga de arriba: 6.</p>"),
            ("La viga de arriba",
             eq("6·4 + 1·3 + 5·2 = 4·1 + x·3 → 37 = 4 + 3x")),
        ],
        final="En la cesta hay 11 cocos.",
        pesos=[("Coco", "1"), ("Plátanos", "2"), ("Mango", "4"), ("Piña", "5")],
        distractores="la serpiente, la rana, las mariposas, los cocos caídos y los matorrales",
    ),
    dict(
        id="golosinas", num=6, titulo="La fábrica de golosinas", svg="svg/06-golosinas.svg",
        pregunta="¿Cuántos caramelos debe haber en el bote?",
        unidad="Caramelos en el bote",
        reglas=["Los globos llevan helio: tiran hacia arriba.",
                "El dinamómetro marca la fuerza que hace, medida en caramelos.",
                "La viga de la derecha gira sobre la bisagra de la pared. La vagoneta no pesa y la rampa no tiene rozamiento."],
        respuesta=12,
        trampas={8: "Casi. Algo cuelga justo bajo el eje de la viga colgante: no la inclina, pero pesa para la de arriba."},
        pistas=["El dinamómetro es lo único que da un número: la viga de la derecha gira en su bisagra y el dinamómetro la sostiene con 7 caramelos a 6 puntos de ella.",
                "Rampa 3-4-5: la vagoneta tira con 3/5 de su carga. Plantea también las dos vigas con globo. Las cuatro ecuaciones juntas fijan todos los pesos; ninguna basta sola."],
        pasos=[
            ("La rampa",
             "<p>Toma el caramelo como unidad: Pi piruleta, Do donut, Cu cupcake, G globo. La rampa sube 3 en 5 de cuesta: la vagoneta tira con 3/5 del cupcake, y eso sostiene al donut.</p>"
             + eq("Do = 3/5·Cu")),
            ("La viga con globo del centro",
             "<p>El globo tira hacia arriba a 1 punto a la derecha: equivale a un peso a la izquierda.</p>"
             + eq("Pi·3 + G·1 = 2·2 + 2·3 = 10")),
            ("La viga colgante",
             "<p>La piruleta del eje no la inclina. El globo está a la izquierda y tira hacia arriba.</p>"
             + eq("Cu·2 = G·1 + Do·2 → G = 2·Cu − 2·Do = 0,8·Cu")),
            ("La palanca del dinamómetro",
             "<p>Gira sobre la bisagra; el dinamómetro la sostiene a 6 puntos con 7.</p>"
             + eq("Cu·2 + Do·4 + (Pi + 2)·5 = 7·6 = 42")
             + "<p>Sustituyendo Do = 0,6·Cu, G = 0,8·Cu y Pi = (10 − 0,8·Cu)/3:</p>"
             + eq("9,2·Cu = 46 → Cu = 5 ; Do = 3 ; G = 4 ; Pi = 2")),
            ("La viga de arriba",
             "<p>La viga colgante pesa 5 + 3 + 2 − 4 = 6 (cuenta la piruleta de su eje).</p>"
             + eq("6·4 + 2·2 + 3·1 = 1·1 + x·2 + 2·3 → 31 = 7 + 2x")),
        ],
        final="En el bote hay 12 caramelos.",
        pesos=[("Caramelo", "1"), ("Piruleta", "2"), ("Donut", "3"), ("Globo", "−4"), ("Cupcake", "5")],
        distractores="la cinta transportadora y sus caramelos, el bastón de caramelo y las tuberías del techo",
    ),
    dict(
        id="laboratorio", num=7, titulo="El laboratorio", svg="svg/07-laboratorio.svg",
        pregunta="¿Cuántos imanes debe haber en el maletín?",
        unidad="Imanes en el maletín",
        reglas=["Cada engranaje gira con su tambor rojo sobre un eje fijo. Los puntos de cada radio están a la misma distancia; la línea discontinua marca dónde engranan los dientes.",
                "Los globos llevan helio: tiran hacia arriba.",
                "La vagoneta no pesa y la rampa no tiene rozamiento."],
        respuesta=10,
        trampas={},
        pistas=["Dos engranajes se empujan en sus dientes con la misma fuerza; lo que cambia es el radio. Y la polea de la que cuelga el libro, junto a la rampa, es móvil.",
                "La rampa sube 2 en 5 de cuesta. Junta la rampa con la viga del engranaje y saldrá el peso del libro; la viga de abajo reparte el resto entre matraz y pila."],
        pasos=[
            ("La rampa y la polea móvil",
             "<p>Toma el imán como unidad: Pi pila, Ma matraz, Li libro, G globo. La polea móvil reparte el libro entre dos tramos: la cuerda tira con Li/2. La vagoneta (matraz + pila) tira con 2/5 de su peso.</p>"
             + eq("(Ma + Pi)·2/5 = Li/2 → 4·(Ma + Pi) = 5·Li")),
            ("Los engranajes",
             "<p>El libro cuelga del tambor amarillo a radio 1, y los dientes empujan a radio 2: fuerza Li/2. En el engranaje azul esa fuerza actúa a radio 3 y su tambor tira a radio 1.</p>"
             + eq("T = (Li/2)·3 = 1,5·Li  (tira hacia arriba de la viga)")),
            ("La viga del engranaje",
             "<p>El tirón hacia arriba a 2 puntos a la izquierda equivale a un peso a la derecha.</p>"
             + eq("(Ma + Pi)·3 = 1,5·Li·2 + 1·3 → Ma + Pi = Li + 1")
             + eq("4·(Li + 1) = 5·Li → Li = 4 ; Ma + Pi = 5")),
            ("La viga de abajo",
             eq("Ma·2 = Pi·3 → Ma = 3 ; Pi = 2")),
            ("La viga colgante",
             "<p>La pila de su eje no la inclina; el globo está a la izquierda y tira hacia arriba.</p>"
             + eq("Li·2 = G·1 + Ma·1 → G = 5")
             + "<p>Pesa 4 + 2 + 3 − 5 = 4 (aquí sí cuenta la pila del eje).</p>"),
            ("La viga del techo",
             eq("4·4 + 4·3 + 3·1 = 1·1 + x·3 → 31 = 1 + 3x")),
        ],
        final="En el maletín hay 10 imanes.",
        pesos=[("Imán", "1"), ("Pila", "2"), ("Matraz", "3"), ("Libro", "4"), ("Globo", "−5")],
        distractores="la pecera, la estantería con matraces y pila, y la pizarra",
    ),
    dict(
        id="castillo", num=8, titulo="El castillo", svg="svg/08-castillo.svg",
        pregunta="¿Cuántas coronas debe haber en el caldero?",
        unidad="Coronas en el caldero",
        reglas=["El puente levadizo gira sobre su bisagra y solo lo sostiene la cadena. La polea de la cadena está fijada a la muralla.",
                "Las vigas grandes de madera de arriba y de la izquierda son fijas."],
        respuesta=10,
        trampas={},
        pistas=["Cuenta los tramos de cuerda que sostienen el bloque de abajo del polipasto. El puente gira en su bisagra y la cadena lo sostiene con el peso del yelmo.",
                "Resuelve las vigas colgantes de abajo arriba: la más baja pesa todo lo que cuelga de ella, también la corona de su eje, y ese total cuelga de la viga del medio."],
        pasos=[
            ("El puente levadizo",
             "<p>Toma la corona como unidad: Cá cáliz, Es escudo, Ep espada, Ye yelmo. El puente gira en la bisagra y la cadena tira con el yelmo a 6 puntos.</p>"
             + eq("Ep·4 + Ep·5 = Ye·6 → 3·Ep = 2·Ye")),
            ("El polipasto",
             "<p>El bloque de abajo cuelga de 4 tramos: la cuerda tira con (Ye + Cá)/4, hacia arriba, a 3 puntos a la derecha de la viga de la izquierda.</p>"
             + eq("Es·2 + 3·(Ye + Cá)/4 = Ye·2")),
            ("La viga más baja",
             "<p>La corona de su eje no la inclina.</p>"
             + eq("Ep·2 = Cá·1 + Es·2")),
            ("La viga del medio",
             "<p>De su punto 3 cuelga la viga más baja con todo: Es + Cá + Ep + 1 (su corona del eje cuenta aquí).</p>"
             + eq("3·(Es + Cá + Ep + 1) = Ye·2 + 3·(Cá + Ep) → 3·Es + 3 = 2·Ye")),
            ("Juntándolo todo",
             eq("Ye = 1,5·(Es + 1) ; Ep = 2·Ye/3 = Es + 1 ; Cá = 2·Ep − 2·Es = 2")
             + eq("8·Es + 3·(Ye + 2) = 8·Ye → Es = 3 ; Ye = 6 ; Ep = 4")),
            ("La viga de arriba",
             "<p>La viga más baja pesa 3 + 2 + 4 + 1 = 10; la del medio, 10 + 1 + 6 + 2 + 4 = 23.</p>"
             + eq("2·4 + 23·1 = 1·1 + x·3 → 31 = 1 + 3x")),
        ],
        final="En el caldero hay 10 coronas.",
        pesos=[("Corona", "1"), ("Cáliz", "2"), ("Escudo", "3"), ("Espada", "4"), ("Yelmo", "6")],
        distractores="el cuervo, las banderas, las antorchas, el sol y las vigas fijas de madera",
    ),
    dict(
        id="mar", num=9, titulo="El fondo del mar", svg="svg/09-mar.svg",
        pregunta="¿Cuántas estrellas de mar debe haber en la red?",
        unidad="Estrellas en la red",
        reglas=["Las boyas flotan: tiran hacia arriba con una fuerza fija.",
                "Los puntos de la viga inclinada también están a la misma distancia unos de otros.",
                "La polea del fondo está anclada; el muelle de arriba es fijo."],
        respuesta=11,
        trampas={},
        pistas=["La viga inclinada se equilibra igual que si estuviera recta: todas sus distancias horizontales se encogen en la misma proporción. La cuerda de abajo a la derecha tira hacia abajo de sus dos vigas con la misma fuerza.",
                "La viga más baja del móvil pesa todo lo que cuelga de ella, también la estrella de su eje, y las boyas restan. Hacen falta las cinco ecuaciones a la vez."],
        pasos=[
            ("La viga inclinada",
             "<p>Toma la estrella como unidad: Co concha, Bo botella, An ánfora, B boya. Al inclinarla, todas las distancias horizontales se multiplican por lo mismo, así que cuenta como recta. La boya tira hacia arriba a la derecha: equivale a un peso a la izquierda.</p>"
             + eq("Co·1 + B·1 = Bo·2")),
            ("Las dos vigas de la cuerda de abajo",
             "<p>La cuerda pasa bajo la polea anclada y tira hacia abajo de las dos con la misma fuerza T.</p>"
             + eq("Izquierda: An·2 + Bo·1 = 1·1 + T·3")
             + eq("Derecha: T·3 + Bo·2 = (1 + An)·3")
             + eq("Eliminando T: 3·Bo = An + 4")),
            ("La viga colgante más baja",
             "<p>La estrella de su eje no la inclina.</p>"
             + eq("Bo·2 + B·1 = An·2")),
            ("La viga colgante del medio",
             "<p>De su punto 3 cuelga la viga más baja entera: An + Bo + 1 − B.</p>"
             + eq("Co·3 + An·1 + B·1 = (An + Bo + 1 − B)·3")
             + eq("Con lo anterior: An = 3·Bo − 4 ; B = 4·Bo − 8 ; Co = 8 − 2·Bo")
             + eq("12 + Bo = 15 → Bo = 3 ; An = 5 ; B = 4 ; Co = 2 ; T = 4")),
            ("La viga de arriba",
             "<p>La viga más baja pesa 5 + 3 + 1 − 4 = 5; la del medio, 2 + 5 − 4 + 5 = 8.</p>"
             + eq("8·4 + 3·1 = 2·1 + x·3 → 35 = 2 + 3x")),
        ],
        final="En la red hay 11 estrellas de mar.",
        pesos=[("Estrella", "1"), ("Concha", "2"), ("Botella", "3"), ("Boya", "−4"), ("Ánfora", "5")],
        distractores="el pulpo, los peces, la medusa, las algas, las burbujas y el muelle",
    ),
    dict(
        id="jardin", num=10, titulo="El jardín", svg="svg/10-jardin.svg",
        pregunta="¿Cuántas zanahorias debe haber en el cubo?",
        unidad="Zanahorias en el cubo",
        reglas=["Los globos llevan helio: tiran hacia arriba.",
                "Las tablas de la valla miden lo mismo que la separación entre los puntos de las vigas.",
                "La palanca morada gira sobre un clavo de la valla. La rueda del torno y su eje verde giran juntos."],
        respuesta=12,
        trampas={10: "Casi. Algo cuelga justo bajo el eje de la viga colgante: no la inclina, pero pesa para la de arriba.",
                 18: "La regadera y la zanahoria de la derecha cuelgan de una polea móvil: la viga solo nota la mitad."},
        pistas=["La calabaza del torno cuelga del eje (radio 1) y la cuerda de la rueda sale a radio 2. La palanca morada se mide con las tablas de la valla.",
                "La polea de la derecha es móvil: reparte su carga entre dos tramos. Y la viga colgante pesa también lo que cuelga de su eje."],
        pasos=[
            ("El torno y su viga",
             "<p>Toma la zanahoria como unidad: Ma maceta, Re regadera, Ca calabaza, G globo. La calabaza a radio 1 y la cuerda a radio 2: tira con Ca/2, hacia arriba, a 3 puntos a la izquierda.</p>"
             + eq("(Ca/2)·3 + Re·1 = Re·2 + Ca·1 → Ca = 2·Re")),
            ("La palanca acodada",
             "<p>Solo cuenta la distancia horizontal: la calabaza a 2 tablas, la zanahoria con la regadera a 3.</p>"
             + eq("Ca·2 = (1 + Re)·3 → 4·Re = 3 + 3·Re → Re = 3 ; Ca = 6")),
            ("La polea móvil",
             "<p>La regadera y la zanahoria se reparten entre dos tramos: la viga nota (3 + 1)/2 = 2 a 3 puntos.</p>"
             + eq("Ma·3 + Ma·1 = 1·2 + 2·3 → Ma = 2")),
            ("La viga colgante",
             "<p>La zanahoria de su eje no la inclina; el globo está a la izquierda y tira hacia arriba.</p>"
             + eq("Re·2 = G·1 + Ma·1 → G = 4")
             + "<p>Pesa 3 + 1 + 2 − 4 = 2 (cuenta la zanahoria del eje).</p>"),
            ("La viga de la pérgola",
             eq("2·4 + 6·3 + 1·1 = 3·1 + x·2 → 27 = 3 + 2x")),
        ],
        final="En el cubo hay 12 zanahorias.",
        pesos=[("Zanahoria", "1"), ("Maceta", "2"), ("Regadera", "3"), ("Globo", "−4"), ("Calabaza", "6")],
        distractores="el gnomo, la regadera del césped, el caracol, las abejas, las flores y el sol",
    ),
]

# Apartados de la página de teoría que sirven para cada lámina (ids de teoria.SECCIONES)
TEORIA = {
    "puerto": ["palanca", "colgantes", "globos", "plano-inclinado", "polea-fija", "polea-movil"],
    "taller": ["palanca", "colgantes", "torno", "polea-movil", "palanca-acodada"],
    "nieve": ["palanca", "colgantes", "globos", "plano-inclinado", "polea-fija"],
    "circo": ["palanca", "colgantes", "globos", "trapecio", "polea-fija"],
    "selva": ["palanca", "colgantes", "polea-fija", "polea-movil", "cuerda-compartida"],
    "golosinas": ["palanca", "colgantes", "globos", "plano-inclinado", "polea-fija", "dinamometro"],
    "laboratorio": ["palanca", "colgantes", "globos", "engranajes", "plano-inclinado", "polea-movil"],
    "castillo": ["palanca", "colgantes", "polea-movil", "polea-fija", "dinamometro"],
    "mar": ["palanca", "colgantes", "globos", "palanca-acodada", "cuerda-compartida", "polea-fija"],
    "jardin": ["palanca", "colgantes", "globos", "torno", "polea-movil", "palanca-acodada"],
}
