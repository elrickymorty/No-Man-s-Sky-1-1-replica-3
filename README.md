# No Man's Sky — Réplica (browser)

Un homenaje jugable a **No Man's Sky** (Hello Games), construido 100% procedural en el navegador con [Three.js](https://threejs.org). Sin assets: todo el terreno, las texturas, la música y los efectos de sonido se generan en tiempo real a partir de semillas.

> ⚠️ Esto es una réplica del *núcleo jugable* del juego, no el producto completo: captura los sistemas centrales (planetas procedurales, vuelo espacial, minado, fabricación, construcción, fauna) con su propio motor web.

## Jugar

Necesitas un servidor estático (o simplemente abrirlo con cualquier `http.server`):

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

Requiere escritorio: ratón (pointer lock) + teclado. Si el navegador deniega el pointer lock, el juego pasa automáticamente a *modo arrastrar para mirar*.

## Controles

| Acción | Superficie | Espacio |
|---|---|---|
| Mover / acelerar | WASD / Shift (correr) | W S (throttle), Shift (impulso) |
| Mirar / dirigir | Ratón | Ratón (A D inclinarse) |
| Saltar | Espacio | — |
| Escanear | E | — |
| Minar | Clic derecho (mantener) | — |
| Inventario / fabricar | Tab o C | — |
| Construir | B | — |
| Mapa del sistema | M | M |
| Despegar | R (junto a tu nave) | — |
| Aterrizar | — | E (cerca de un planeta, a baja velocidad) |
| Salto interestelar | — | J |
| Pausa | Esc | Esc |

## Lo que hay dentro

- **Planetas procedurales** — cada semilla genera un planeta único: nombre, bioma (pradera, desierto, montañoso, tundra, pantano, volcánico, cristalino, hiel), terreno FBM con montañas agrias, agua, nubes, vegetación, cristales y nodos de recursos.
- **Sistemas estelares infinitos** — sol con color de temperatura, 7-12 planetas orbitando (con lunas, atmósferas y texturas generadas), salta a otros sistemas con `J`.
- **Vuelo en nave** — física con throttle/impulso, cámara de persecución, aterrizaje cinematográfico y despegue.
- **Exploración a pie** — traje con animación de caminata, física de pendientes, ciclo día/noche con sombras dinámicas.
- **Recursos y minado** — 13 recursos (hierro, silicio, carbono, oro, uranio, cristal, helio-3…), nodos con brillo, barra de progreso y partículas.
- **Fabricación** — 12 recetas: paneles solares, módulos de batería, tanques de oxígeno, traje MK-II, módulos de base…
- **Construcción de bases** — suelo, muros, techo, puerta, búnker, baliza, panel solar, mesa, silla; rejilla, preview fantasma y reembolso al desmontar.
- **Fauna alienígena** — 4 especies procedurales (molusco, corredor, ave del terror, grietero) con IA de vagabundeo y huida, escaneables con nombre y comportamiento.
- **Supervivencia ligera** — batería (se recarga con paneles solares) y oxígeno en atmósferas tóxicas.
- **Audio 100% procedural** (WebAudio): ambiente de viento/espacio, música generativa por modos, y ~15 efectos sintetizados.
- **Guardado** — autoguardado + manual en `localStorage`; continúas exactamente donde estabas (planeta, nave, bases, inventario).

## Arquitectura

```
index.html          página + overlays de UI
css/style.css       estilo NMS (HUD, menús, título)
vendor/             three.module.js (r160)
js/
  rng.js            RNG determinista (xmur3/mulberry32)
  noise.js          Simplex 2D/3D + FBM + ridged
  config.js         biomas, recursos, recetas, nombres
  planet.js         planetas, sistemas estelares, heightfield, decorado
  terrain.js        chunks en streaming (generación por rodajas), agua
  sky.js            cielo shader, sol, estrellas, nubes, luces
  decor.js          geometrías de flora/rocas/cristales
  player.js         traje + controlador third-person
  creatures.js      fauna procedural + IA
  build.js          construcción con ghost y rejilla
  inventory.js      inventario / quickbar
  space.js          modo espacio: sistema, vuelo, aterrizaje, warp
  ship.js           nave procedural
  particles.js      partículas en pool
  audio.js          música generativa + SFX sintetizados
  save.js           localStorage
  ui.js             HUD, menús, compás, toasts
  main.js           máquina de estados, input, bucle principal
```

Todo lo procedural parte de una cadena de semillas: `systemSeed → planetSeed → mundo/texturas/fauna`, de modo que cada planeta se puede regenerar idéntico en cualquier momento (clave del guardado).

---
Hecho como ejercicio técnico y homenaje. El concepto y el diseño original de *No Man's Sky* pertenecen a Hello Games.
