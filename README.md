# Pizarra

Pizarra táctica de baloncesto para iPad. El proyecto se llama **675whiteboard**. Campo FIBA a pantalla completa, dibujo con el dedo o el Apple Pencil, fichas de ataque y defensa, y jugadas guardadas en la cuenta. También queda una copia en el dispositivo para seguir dibujando sin red.

## Arrancar en local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abre [http://localhost:47321](http://localhost:47321). Entra con Google o con correo y contraseña. `localhost` ya está autorizado en Firebase, sin el puerto.

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

## Cuenta y datos

El proyecto de Firebase se muestra como **675whiteboard**. El identificador interno es `whiteboard675`, porque un id de Google no puede empezar por un número. La app web usa esa configuración, que está en `.env.example`.

- Autenticación: Google y correo con contraseña.
- Firestore Enterprise, base `pizarra`, región `europe-southwest1` (Madrid).
- Cada cuenta solo lee y escribe `users/{uid}/plays` y `users/{uid}/drafts/current`.
- Las reglas de `firestore.rules` son un prototipo: revisalas antes de compartir la app con más gente.

Para volver a publicar reglas o proveedores:

```bash
npx -y firebase-tools@latest deploy --only auth,firestore --project whiteboard675
```

Si publicas en un dominio nuevo, añádelo en Authentication → Settings → Authorized domains, sin `https://` ni puerto.

En el móvil entra desde Safari o Chrome en [675whiteboard.vercel.app](https://675whiteboard.vercel.app). El acceso con Google no funciona si abres el enlace dentro de WhatsApp o Instagram.

## Publicar en Vercel

`vercel.json` reescribe todas las rutas a `index.html` y evita cachear `sw.js`.

```bash
npm run build
npx vercel --prod
```

En el proyecto de Vercel define las mismas variables `VITE_FIREBASE_*` de `.env.example`. Vite las incrusta en el build. Después añade el dominio de Vercel (por ejemplo `675whiteboard.vercel.app`) a los dominios autorizados de Firebase, sin protocolo.

La URL HTTPS de Vercel es la que se abre en Safari del iPad para instalarla.

## Cómo se usa

- **Lápiz**, **goma** y **mover**. El lápiz usa eventos de puntero: con el Apple Pencil respeta la presión; con el dedo el trazo se suaviza.
- **Trazo**, con la simbología del curso de entrenador: continuo para un desplazamiento sin balón, discontinuo para un pase, discontinuo con un bucle para una asistencia, zigzag para un desplazamiento con balón y ondulado para un tiro. El final puede ser libre, flecha rellena o una T de bloqueo. Al pasar de paso, la jugadora sigue su flecha y el balón aparece en la punta del pase o de la asistencia.
- **Campo** de diagrama: rectángulo cerrado, zona rectangular, línea de fondo arriba en medio campo. No lleva canasta, círculo de tiros libres, círculo central ni marcas. La línea de 6,25 se enciende con el botón **6,25** solo cuando el diagrama la necesita.
- El atacante que tiene el balón lleva un punto naranja. La defensa es una X. El obstáculo es un cuadrado, en Fichas.
- **Campo entero** y **medio campo**. El medio campo pone la línea de fondo arriba. El campo se vuelve a dibujar al girar el iPad.
- Fichas **1–5**, **X1–X5**, el **balón** y un **obstáculo**. Se arrastran con la herramienta Mover. Se pueden quitar y volver a poner.
- **Pasos**: cada paso guarda las flechas y la posición de las fichas. Reproducir anima el movimiento hasta el paso siguiente.
- **Guardar** con nombre, categoría (jugada o ejercicio) y notas. Queda en la cuenta y, en este navegador, en IndexedDB. Se puede abrir, renombrar, duplicar y eliminar.
- **Salir** cierra la sesión. La siguiente cuenta no ve las jugadas de la anterior.
- **Exportar** descarga un JSON con las jugadas. **Importar** lo vuelve a cargar. El icono de imagen exporta el paso actual en PNG (en el iPad, si el sistema lo permite, abre la hoja de compartir).

La barra de herramientas se puede ocultar para dejar el campo casi a pantalla completa. Mientras se dibuja, la página no hace scroll ni zoom.
