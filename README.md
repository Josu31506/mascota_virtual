# Mascota virtual (Expo)

Aplicación móvil creada con Expo que permite visualizar el estado de una mascota virtual y enviar acciones a un backend.

## Requisitos

- Node.js 18 o superior
- npm 9 o superior
- La app Expo Go instalada en tu dispositivo móvil (Android o iOS) o un emulador configurado

## Instalación

```bash
npm install
```

## Ejecución

1. Define la URL base del backend en `app.json` (propiedad `extra.apiBaseUrl`) o exporta la variable `EXPO_PUBLIC_API_BASE_URL` antes de iniciar Expo.
2. Inicia el bundler:

```bash
npm run start
```

3. Escanea el código QR con Expo Go o abre el proyecto en un emulador desde la terminal.

## Escenarios y fondos

Coloca las imágenes provistas en la carpeta `assets/scenes/` con los siguientes nombres para que el fondo de cada pestaña se cargue correctamente:

- `scene-sala.png`
- `scene-dormir.png`
- `scene-jardin.png`

Puedes subir estos archivos manualmente después de clonar el repositorio; el proyecto incluye únicamente la carpeta vacía para que añadas los recursos oficiales.

### Tienda de atuendos

Añade los PNG de atuendos a `assets/shop/` con los nombres sugeridos a continuación para que la tienda los muestre al deslizar hacia la derecha:

- `outfit-01.png`
- `outfit-02.png`
- `outfit-03.png`
- `outfit-04.png`

Sustituye los marcadores actuales por tus diseños finales manteniendo los mismos nombres de archivo.

## Endpoints esperados

El frontend espera que el backend exponga los siguientes endpoints REST:

- `GET /status`: devuelve el estado actual de la mascota.
- `POST /interactions`: recibe una acción (`action`) y un mensaje (`message`).

Ajusta el código de `App.js` si tu API utiliza rutas diferentes.
