# 🧩 El problema matemático del día

> Un acertijo nuevo cada mañana, inspirado en los clásicos de **Martin Gardner**.

[![Web en vivo](https://img.shields.io/badge/web-en_vivo-2e6f4f?style=flat-square)](https://spyder-cripto.github.io/problema-del-dia/)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-activo-success?style=flat-square&logo=github)](https://spyder-cripto.github.io/problema-del-dia/)
[![Código MIT](https://img.shields.io/badge/código-MIT-1a4f8b?style=flat-square)](LICENSE)
[![Sin dependencias](https://img.shields.io/badge/dependencias-0-8a6d3b?style=flat-square)]()

### 👉 [**Ver la web**](https://spyder-cripto.github.io/problema-del-dia/)

Una página que muestra **un problema de matemática recreativa cada día**, rotando una
colección de acertijos según la fecha. Cada uno trae su solución oculta tras un botón,
para que puedas pensarlo antes de mirar. Sin servidor, sin base de datos, sin mantenimiento.

---

## ✨ Características

- **Un problema al día**, automático según la fecha — se sube una vez y rueda solo.
- **Solución desplegable** (botón *Ver solución*), para no destriparte el reto.
- **Archivo navegable**: botones *Anterior · Hoy · Siguiente* para repasar días pasados
  (los futuros quedan ocultos en la interfaz).
- **Diseño sobrio tipo libro**, adaptable a móvil y con **modo oscuro** automático.
- **Cero dependencias**: un único archivo `index.html` con HTML, CSS y JS.

---

## ⚙️ Cómo funciona

Todo vive en `index.html`. Un pequeño script calcula qué problema toca **hoy** a partir de
una fecha de inicio y va rotando la lista. Para personalizarlo, edita estas dos cosas:

```js
const INICIO = "2026-06-18";   // el día 1 de la serie
const PROBLEMAS = [ ... ];      // { titulo, fuente, enun, sol }
```

Añade, quita o reordena objetos en `PROBLEMAS`. Cuando se agotan, la serie vuelve a empezar.

---

## 🚀 Publicar y actualizar

Ya está desplegado en GitHub Pages. Para **actualizar el contenido**:

```bash
# edita index.html y luego:
git add index.html
git commit -m "Nuevos problemas"
git push
```

GitHub Pages se reconstruye solo en uno o dos minutos.

> **Nota:** si tu antivirus intercepta el tráfico HTTPS y `git push` falla con un error de
> certificado SSL, usa `git -c http.sslVerify=false push` o pausa el escudo web un momento.

---

## 📚 Licencia y créditos

- **Código** (HTML / CSS / JS): licencia **MIT** — ver [`LICENSE`](LICENSE). Úsalo y modifícalo libremente.
- **Textos de los acertijos**: redacción **original y propia**, adaptaciones libres de problemas
  clásicos de matemática recreativa popularizados por **Martin Gardner**. En cada problema se cita
  la obra fuente como atribución.
- Este proyecto es un homenaje educativo sin ánimo de lucro. **No está afiliado ni respaldado**
  por Martin Gardner, sus herederos ni sus editoriales; los títulos de los libros se mencionan
  únicamente a efectos de cita y reconocimiento.

---

<sub>Hecho con cariño matemático 🧮</sub>
