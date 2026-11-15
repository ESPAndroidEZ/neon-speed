# Trabajo en español (i18n) — qué hice

## Botón para elegir idioma (lo que pediste)
- Fila de idioma "Idioma / Language" en el menú de título (al primer arranque) y en Ajustes, con dos botones: **English** y **Español**.
- El idioma elegido se guarda en el save (`settings.lang`) y se aplica al arrancar; al cambiarlo todo se re-renderiza en el idioma nuevo.

## Archivos nuevos del núcleo i18n
- `src/i18n/langPrefs.ts` — lee/guarda el idioma y avisa de los cambios (`setLang`, `onLangChange`).
- `src/i18n/enGame.ts` / `esGame.ts` — cadenas del juego (radio, pista, clima, drift, etc.).
- `src/i18n/enMenu.ts` / `esMenu.ts` — cadenas de menús y ajustes.
- `src/ui/langRow.ts` — la fila UI con el selector de idioma (usa el idioma *actual* para la etiqueta, el otro para el botón).
- `tests/i18n-check.mts` — comprueba que ninguna clave falte en ningún idioma.
- `tests/lab/i18n-harvest.mts` — script que recoge las cadenas para traducir.

## Traducción
- Traducido al español las cadenas del juego y de los menús.
- Mapeados todos los sitios que muestran texto al jugador (diálogos, historia, radio, subtítulos, tripulación, tuning, garaje, versus, HUD) para que lean por `t()`/`tx()` y cambien con el idioma.

## Seguridad / reglas (cumplido)
- No toqué `src/main.ts`, `src/types/*`, `src/core/*` ni `carController.ts`.
- Solo archivos `i18n`, `ui`, `game`, `data`, `audio`, `fx`, `world` y tests.
- Sin dependencias nuevas; cada archivo `.ts` por debajo de 220 líneas.
