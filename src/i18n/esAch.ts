import type { EN_ACH } from './enAch';

/** Logros (español neutro). Mismas claves que enAch.ts. */
export const ES_ACH: Record<keyof typeof EN_ACH, string> = {
  'ach.unlocked': 'LOGRO: {name}', 'ach.title': 'Logros', 'ach.count': '{n} de {total} desbloqueados',
  'ach.finish': 'Primera salida', 'ach.finish.d': 'Termina una carrera.',
  'ach.win': 'Primera sangre', 'ach.win.d': 'Gana una carrera.',
  'ach.podium5': 'Habitual', 'ach.podium5.d': 'Sube al podio 5 veces.',
  'ach.wins10': 'El jefe', 'ach.wins10.d': 'Gana 10 carreras.',
  'ach.drift10k': 'De lado', 'ach.drift10k.d': 'Suma 10.000 puntos de derrape en una carrera.',
  'ach.drift50k': 'Puro humo', 'ach.drift50k.d': 'Suma 50.000 puntos de derrape en una carrera.',
  'ach.near5': 'Rozando pintura', 'ach.near5.d': '5 roces en una carrera.',
  'ach.tow5': 'Rey de la estela', 'ach.tow5.d': '5 estelas en una carrera.',
  'ach.combo5k': 'Reacción en cadena', 'ach.combo5k.d': 'Guarda un combo de estilo de 5.000 puntos.',
  'ach.style20k': 'Espectáculo', 'ach.style20k.d': '20.000 puntos de estilo en una carrera.',
  'ach.rain': 'Acuaplaneo', 'ach.rain.d': 'Gana bajo la lluvia.',
  'ach.snow': 'Sangre fría', 'ach.snow.d': 'Gana en la nieve.',
  'ach.ton': 'Doscientos cincuenta', 'ach.ton.d': 'Llega a 250 km/h.',
  'ach.weathers': 'Todo terreno', 'ach.weathers.d': 'Gana con sol, lluvia y nieve.',
  'ach.tracks3': 'Turista', 'ach.tracks3.d': 'Gana en 3 circuitos distintos.',
  'ach.cars4': 'Coleccionista', 'ach.cars4.d': 'Gana con 4 coches distintos.',
  'ach.laps100': 'Kilometraje', 'ach.laps100.d': 'Completa 100 vueltas.',
};
