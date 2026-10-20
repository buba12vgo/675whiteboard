# Pizarra

Pizarra táctica de baloncesto para iPad. Campo FIBA a pantalla completa, dibujo con el dedo o el Apple Pencil, fichas de ataque y defensa, y jugadas guardadas en el dispositivo. Funciona sin conexión cuando se abre desde la pantalla de inicio.

## Arrancar en local

```bash
npm install
npm run dev
```

Abre [http://localhost:47321](http://localhost:47321).

```bash
npm test
npm run build
npm run preview
```

`npm run build` genera el sitio estático en `dist/`, con el service worker que deja la app disponible sin red.

## Instalar en el iPad

Hace falta servir la app por HTTPS (el hosting de abajo vale). En el iPad:

1. Abre la dirección en **Safari**.
2. Pulsa **Compartir**.
3. Elige **Añadir a pantalla de inicio**.
4. Abre **Pizarra** desde el icono.

La primera visita tiene que ser con red, para que Safari descargue la app. Después se abre a pantalla completa, sin la barra del navegador, en vertical y en horizontal, también sin conexión.

El manifiesto usa `display: standalone` y `display_override: fullscreen`, y la página incluye `apple-mobile-web-app-capable`.

## Publicar

Cualquier hosting de archivos estáticos sirve. Sube el contenido de `dist/` después de `npm run build`.

### Firebase Hosting

El repo incluye `firebase.json` (carpeta `dist`, reescritura a `index.html` y caché corta para `index.html` y `sw.js`).

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy --only hosting
```

En `firebase init`, elige el proyecto y acepta el `firebase.json` que ya está. La URL que te da Firebase es HTTPS: esa es la que se abre en Safari del iPad para instalarla.

### Otro hosting

Netlify, Cloudflare Pages, GitHub Pages o un bucket sirven igual: publica `dist/` como sitio estático y, si el host lo pide, redirige todas las rutas a `index.html`.

## Cómo se usa

- **Lápiz**, **goma** y **mover**. El lápiz usa eventos de puntero: con el Apple Pencil respeta la presión; con el dedo el trazo se suaviza.
- **Trazo**: continuo para un desplazamiento, discontinuo para un pase, zigzag para un bote. El final puede ser libre, flecha o una T de bloqueo.
- **Campo entero** y **medio campo**. El campo se vuelve a dibujar al girar el iPad.
- Fichas **1–5**, **X1–X5** y el **balón**. Se arrastran con la herramienta Mover. Se pueden quitar y volver a poner.
- **Pasos**: cada paso guarda las flechas y la posición de las fichas. Reproducir anima el movimiento hasta el paso siguiente.
- **Guardar** con nombre, categoría (jugada o ejercicio) y notas. Todo queda en IndexedDB. Se puede abrir, renombrar, duplicar y eliminar.
- **Exportar** descarga un JSON con las jugadas. **Importar** lo vuelve a cargar. El icono de imagen exporta el paso actual en PNG (en el iPad, si el sistema lo permite, abre la hoja de compartir).

La barra de herramientas se puede ocultar para dejar el campo casi a pantalla completa. Mientras se dibuja, la página no hace scroll ni zoom.
