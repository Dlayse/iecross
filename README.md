# IE Cross XI

Generador de equipos para **Inazuma Eleven Cross**: marca los jugadores que tienes (con su despertar/凸, tu nivel,
equipamiento y entrenadores) y la web te propone los onces más fuertes, con su estrategia, sus combos y lo que
te falta para llegar al techo de cada formación.

**Web:** https://eljuezholden.github.io/iecross/

- Todo se calcula en tu navegador; tus plantillas se guardan solo en él (y se pueden compartir con un enlace).
- Los datos del juego vienen de [IE Cross Database](https://iecrossdatabase.pages.dev) (RR_o). Una GitHub Action
  los comprueba cada 6 horas y, si hay cambios, recalcula el meta y vuelve a publicar la web.
- La explicación de los cálculos está en la propia web, en «Cómo calculamos».

## Desarrollo

```bash
npm install
npm run dev                  # http://localhost:3000
node scripts/sync.mjs        # descargar datos e imágenes
npx tsx scripts/calibrate.ts # recalcular el meta de referencia (data/bench.json)
```

Proyecto fan, sin relación con LEVEL-5.
