import type { EN_LOOK } from './enLook';

/** Opciones de aspecto del garaje (vinilos, llantas, piezas, luces). Mismas claves que enLook.ts. */
export const ES_LOOK: Record<keyof typeof EN_LOOK, string> = {
  'lookid.stripes': 'Rayas', 'lookid.racing': 'Competición', 'lookid.checker': 'Cuadros', 'lookid.tiger': 'Tigre', 'lookid.wave': 'Ola',
  'lookid.shards': 'Esquirlas', 'lookid.scales': 'Escamas', 'lookid.circuit': 'Circuito', 'lookid.speed-lines': 'Líneas de velocidad',
  'lookid.cross-hatch': 'Trama cruzada', 'lookid.stars': 'Estrellas', 'lookid.zigzag': 'Zigzag', 'lookid.halftone': 'Semitono',
  'lookid.five': 'Cinco radios', 'lookid.multi': 'Multirradio',
  'lookid.solid': 'Fijo', 'lookid.pulse': 'Pulso', 'lookid.rainbow': 'Arcoíris', 'lookid.chase': 'Persecución',
  'lookid.gt-wing': 'Alerón GT', 'lookid.ducktail': 'Cola de pato', 'lookid.lip-slim': 'Labio fino', 'lookid.twin-blade': 'Doble hoja',
  'lookid.swan-neck': 'Cuello de cisne', 'lookid.roof-fin': 'Aleta de techo', 'lookid.big-wing': 'Alerón grande',
  'lookid.blade': 'Hoja', 'lookid.lip-wide': 'Labio ancho', 'lookid.dual-fin': 'Doble aleta', 'lookid.canard': 'Canard', 'lookid.plow': 'Pala', 'lookid.mesh': 'Rejilla',
  'lookid.plain': 'Liso', 'lookid.sharp': 'Afilado', 'lookid.ducted': 'Con conducto', 'lookid.ribbed': 'Acanalado', 'lookid.carbon': 'Carbono',
  'lookid.vent': 'Toma de aire', 'lookid.scoop': 'Cuchara', 'lookid.twin-vent': 'Doble toma', 'lookid.louvered': 'Con branquias', 'lookid.carbon-flat': 'Carbono liso',
};
