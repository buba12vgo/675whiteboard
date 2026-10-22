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
- **Trazo**, con la simbología del curso de entrenador: continuo para un desplazamiento sin balón, discontinuo para un pase, discontinuo con un bucle para una asistencia y zigzag para un desplazamiento con balón. El final puede ser libre, flecha rellena o una T de bloqueo. Al pasar de paso, la jugadora sigue su flecha y el balón aparece en la punta del pase o de la asistencia. El **tiro** no es un trazo: es una flecha corta y fina de doble línea (`=>`), de unas 0,7 veces el diámetro de la ficha, pegada al borde de quien tira y mirando a la canasta. Se orienta al dibujarla o, con Mover, desde la punta. No mueve fichas ni balón.
- **Campo** de diagrama: rectángulo de 28×15 m, línea de fondo arriba en medio campo, y la canasta (tablero a 1,20 m y aro a 1,575 m) en cada fondo. Arranca en un **fondo liso claro** (crema) con las líneas en azul oscuro. En **Fondo** se puede pasar a oscuro, un color plano, o parquet claro u oscuro. En la barra superior, **FIBA 6,75** y **Minibasket** eligen el tipo de pista y se guarda con la jugada. **Media pista** y **Pista entera** cambian el encuadre. FIBA dibuja la zona de 4,90×5,80 m y el triple actual: arco de 6,75 m y tramos rectos en las esquinas a 6,60 m del aro. Minibasket no lleva ese arco. Sigue la FEB: tiro libre a 4 m del tablero (a 5,20 m del fondo, línea de 3,60 m), zona interior de 4,90 m, rectángulo exterior de 8 m (límite de 2/3 de la FEGABA, a esos mismos 4 m del tablero), semicírculo de 1,80 m, marcas de 10 cm en los laterales de la zona y círculo central de 1,80 m. El tablero no se acerca a 975 mm: la NIDE lo fija a 1,20 m. Las pistas de 26×14, 24×13, 22×12 y 20×11 m están permitidas en competición, pero el dibujo se queda en 28×15.
- Ataque y defensa usan un solo color cada uno (marino y el naranja `#ea580c` al empezar). Se cambian en **Fichas**. El ataque es un disco crema con borde marino grueso y número marino. La defensa es un disco naranja con el número en blanco y una media luna del mismo naranja, con dos puntas que salen por los laterales por debajo de la línea media. Con Mover se arrastra y el punto del lateral la gira. El tamaño de la ficha crece con el campo. El balón es un icono pequeño de cuero oscuro con la cruz clara, junto a quien lo tiene, para no confundirse con la defensa. El obstáculo es un cuadrado, en Fichas.
- **Pista entera** y **media pista**, en la barra superior. La media pista pone la línea de fondo arriba. El campo se vuelve a dibujar al girar el iPad. En el iPad, lápiz, goma, mover, trazo, fondo y fichas están en la paleta de la izquierda. Abajo quedan ataque, defensa, balón, colores, deshacer, rehacer y limpiar. En el teléfono esa paleta pasa a la barra de abajo.
- Fichas **1–5**, **X1–X5**, el **balón** y un **obstáculo**. Se arrastran con la herramienta Mover. La defensa, además, se gira desde el lateral. Se pueden quitar y volver a poner.
- **Pasos**: cada paso guarda las flechas y la posición de las fichas. Reproducir anima el movimiento hasta el paso siguiente.
- **Nueva jugada** deja el campo en blanco con el 5c5 de inicio y conserva el campo entero o medio campo, y el tipo de pista, que tuvieras. Si hay cambios sin guardar, pide confirmación. **Guardar** pone nombre, categoría (jugada o ejercicio) y notas. Queda en la cuenta y, en este navegador, en IndexedDB. Se puede abrir, renombrar, duplicar y eliminar.
- **Salir** cierra la sesión. La siguiente cuenta no ve las jugadas de la anterior.
- **Exportar** descarga un JSON con las jugadas. **Importar** lo vuelve a cargar. El icono de imagen exporta el paso actual en PNG (en el iPad, si el sistema lo permite, abre la hoja de compartir).

**Ocultar** deja el campo libre para el Apple Pencil. **Herramientas** vuelve a mostrar la paleta. Mientras se dibuja, la página no hace scroll ni zoom.
