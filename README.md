# El problema matemático del día

Web estática que muestra **un acertijo cada día** (rotando los 10 problemas según la fecha)
y deja navegar el archivo de días pasados. Sin servidor, sin base de datos, sin mantenimiento.

Acertijos adaptados con redacción propia de la obra de **Martin Gardner** (se cita la fuente en cada uno).

---

## Cómo funciona

- Todo vive en un único archivo: `index.html`.
- El JavaScript calcula qué problema toca **hoy** a partir de la fecha de inicio (`INICIO`)
  y va rotando la lista `PROBLEMAS`.
- Los botones *Anterior / Hoy / Siguiente* permiten ver días pasados, pero **no los futuros**.

### Ajustes rápidos (dentro de `index.html`)
- `const INICIO = "2026-06-18";` → el día 1 de la serie. Cámbialo para empezar otro día.
- `const PROBLEMAS = [ ... ];` → añade, quita o reordena problemas. Cada uno es
  `{ titulo, fuente, enun, sol }`. Cuando se agotan, la serie vuelve a empezar.

---

## Publicar en GitHub Pages (gratis)

### Opción A — Por la web (sin instalar nada)
1. Entra en https://github.com y crea una cuenta si no la tienes.
2. Botón **New repository** → nombre, p. ej. `problema-del-dia` → **Public** → **Create**.
3. En el repo: **Add file → Upload files** → arrastra `index.html` (y este `README.md`) → **Commit**.
4. **Settings → Pages** → en *Build and deployment*, *Source* = **Deploy from a branch**,
   rama **main**, carpeta **/ (root)** → **Save**.
5. Espera ~1 min. Tu web estará en:
   `https://TU-USUARIO.github.io/problema-del-dia/`

> ¿La quieres en la raíz (`https://TU-USUARIO.github.io/`)? Llama al repo exactamente
> `TU-USUARIO.github.io` en el paso 2.

### Opción B — Por terminal (si tienes git / gh)
```bash
cd problema-del-dia
git init -b main
git add .
git commit -m "Problema matemático del día"
gh repo create problema-del-dia --public --source=. --push
# Luego activa Pages: Settings → Pages → rama main / root
```

---

## Actualizar el contenido
Edita `index.html` (la lista `PROBLEMAS`) y vuelve a subirlo / haz `git push`.
GitHub Pages se actualiza solo en uno o dos minutos.
