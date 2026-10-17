# Decisiones de diseño e implementación — jmcglone.com

Registro de las decisiones tomadas en la modernización del sitio
(octubre 2026). Cada entrada incluye el porqué y, cuando aplica,
cómo se verificó.

## Arquitectura

### Jekyll + GitHub Pages, sin build de JS
El sitio se sirve estático desde GitHub Pages. three.js, GSAP y Lenis
se cargan por CDN como ES modules / scripts defer; three.js se importa
de forma dinámica (`import()` dentro de `js/hero.js`) tras
`requestIdleCallback`, así nunca bloquea el primer render.
**Por qué:** GitHub Pages no permite bundlers sin Actions, y el valor
LCP del contenido no debe pagar el coste de un canvas decorativo.

### Capa de motion solo en la home
Los scripts de motion (GSAP + ScrollTrigger + Lenis + `main.js`) solo
se inyectan cuando el front matter de la página tiene `hero: true`
(ver `_includes/scripts.html`). Las páginas de contenido (CV, notes,
about, contact) cargan únicamente Bootstrap bundle + `library.js`.
**Por qué:** las páginas de texto deben seguir siendo ligeras; el
"wow factor" se concentra donde tiene sentido.

### jQuery fuera
`js/library.js` se reescribió en vanilla (los swatches son 10 líneas).
Se mantiene `bootstrap.bundle.min.js` (incluye Popper) porque el navbar
collapse y los acordeones del CV lo necesitan.
**Por qué:** ~34 KB de JS en cada página para un uso nulo.

## Hero WebGL (`js/hero.js`)

- **Shader:** ruido simplex 2D (Ashima, dominio público) con domain
  warping (fbm sobre fbm), paleta índigo/violeta/cyan sobre navy
  `#0b0e26`, glow suave que sigue el puntero, viñeta para legibilidad.
- **Rendimiento:** `devicePixelRatio` limitado a 1.75 (1.25 en móvil);
  el render se pausa con `visibilitychange` y cuando el hero sale del
  viewport (`IntersectionObserver`); 4 octavas de fbm, sin postproceso.
- **Fallbacks en cascada:** si no hay WebGL, falla el CDN, o el usuario
  prefiere movimiento reducido, queda visible el gradiente CSS del
  propio `.hero` (radiales indigo/violeta/cyan). El contenido nunca
  depende del canvas.

## Motion (`js/main.js`)

- **Preloader independiente de GSAP:** está construido con rAF y
  `setTimeout` puros. Si GSAP no carga, el preloader se oculta igual
  (1.2 s) — no puede dejar la página bloqueada nunca.
- **Lenis** para smooth scroll, sincronizado con el ticker de GSAP;
  los anchors (`#intro`) se interceptan y usan `lenis.scrollTo`.
- **Reveals:** `gsap.from` sobre `[data-reveal]` con ScrollTrigger.
  Los elementos son visibles por defecto; el estado inicial lo fija
  JS, así que sin JS no hay contenido oculto.
- **Hover magnético** en `.navbar-brand` y `.btn`, solo con
  `pointer: fine`.

## Accesibilidad (WCAG 2.2 AA)

- **`prefers-reduced-motion` como interruptor global:** sin Lenis, sin
  WebGl, sin preloader largo, y un bloque CSS mata todas las
  animaciones/transiciones. Verificado con emulación nativa de Chromium
  (`page.emulateMediaFeatures`).
- **Contraste:** placa radial oscura detrás del texto del hero
  (~15:1 medido sobre el shader). Acento `#8fa7ff` sobre `#0e0f11` (AA).
- **Skip link** al contenido (`default.html`), `:focus-visible` con
  outline de acento, canvas `aria-hidden`, marquee `aria-hidden`
  (decorativo, duplicado para el loop).
- **Microdatos migrados** de `data-vocabulary.org` (muerto desde 2011)
  a schema.org (`Person`, `jobTitle`, `PostalAddress`).

## Sistema de diseño (estilo darkroom / lenis.dev)

- **Tema oscuro global:** fondo `#0e0f11`, tinta `#f2f1ee`, acento
  indigo. Tokens en custom properties (`:root` en `css/style.css`).
- **Tipografía:** Merriweather (contenido) + JetBrains Mono (todo el
  chrome: nav, etiquetas, fechas, footer, botones) en mayúsculas con
  tracking amplio. Montserrat se mantiene por compatibilidad.
- **Marquee** de roles entre hero y contenido, CSS puro, loop de 30 s,
  congelado con reduced motion.
- **Listas de notes** como filas con borde inferior y flecha ↗ al hover.
- **CV oscuro:** variables CSS de Bootstrap 5.3 para el acordeón,
  chevrons SVG propios en gris/acento, botón pill con inversión.
- **Grano de película** global: pseudo-elemento fijo con feTurbulence
  SVG a 3.5% de opacidad.
- **View Transitions** cross-document (`@view-transition`), degradación
  silenciosa en navegadores sin soporte.

## Entorno y build

- **asdf:** `.tool-versions` fija `ruby 3.3.1` (la recomendada para
  `github-pages`; la 4.0.0 no compila las gems antiguas del lock).
  Bundler 4.0.10 (el que exige el `Gemfile.lock`), instalado en el
  Ruby de asdf.
- **ffi 1.15.5 → 1.17.4** en el lock: la 1.15.5 no compila en Ruby 3.3.
  Actualización conservadora, el resto del lock intacto.
- **Comandos:**

  ```bash
  bundle exec jekyll serve   # preview en http://localhost:4000
  bundle exec jekyll build
  ```

  *Quirk local:* los shims de asdf no capturan `ruby`/`bundle` en el
  PATH (resuelven al Ruby 2.6 del sistema). Si falla algo, usar
  `~/.asdf/installs/ruby/3.3.1/bin/bundle` directamente.

## Riesgos aceptados y pendientes

1. **Sin SRI en Bootstrap/three/GSAP/Lenis:** se omitieron los hashes
   porque no se pudieron verificar contra la versión exacta; un hash
   incorrecto rompería el sitio. Si se quieren, calcularlos con
   `sri` y añadirlos a `head.html`/`scripts.html`.
2. **Warning de build preexistente:** `notes/atom.xml` pide el layout
   `feed`, que no existe. Anterior a esta modernización.
3. **Push a `master` despliega a producción** (jmcglone.com). Pendiente
   de aprobación explícita.
4. **Paleta del shader:** si se prefiere el look monocromo de
   lenis.dev (azul apagado, sin cian), son tres líneas en el
   fragment shader de `js/hero.js`.

## Metodología de verificación

- Build de Jekyll con el stack oficial (`github-pages 232`, Jekyll
  3.10) y revisión del HTML generado.
- E2E con Chromium headless (Puppeteer + SwiftShader): shader
  renderizando, preloader desmontado, acordeones del CV intactos,
  cero errores de consola, y reduced-motion con emulación nativa.
- Análisis de contraste sobre capturas reales del shader renderizado.
