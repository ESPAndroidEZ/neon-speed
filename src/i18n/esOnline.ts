import type { EN_ONLINE } from './enOnline';

/** Carreras online (español neutro). Mismas claves que enOnline.ts. */
export const ES_ONLINE: Record<keyof typeof EN_ONLINE, string> = {
  'menu.online': 'Online',
  'on.title': 'ONLINE', 'on.name': 'Tu nombre', 'on.create': 'Crear sala', 'on.join': 'Unirse', 'on.code': 'Código de sala',
  'on.yourCar': 'Corres con el coche de tu garaje: {car}', 'on.connecting': 'Conectando…', 'on.room': 'CÓDIGO DE SALA',
  'on.how': 'Un jugador crea una sala y comparte el código de 4 letras; los demás se unen con él. El anfitrión elige circuito y clima y empieza la carrera para todos. Hasta 8 jugadores.',
  'on.share': 'Comparte el código con tus amigos. También puedes empezar solo.',
  'on.players': 'Jugadores ({n}/{max})', 'on.host': 'anfitrión', 'on.you': 'tú', 'on.track': 'Circuito', 'on.weather': 'Clima',
  'on.start': 'Empezar la carrera para todos', 'on.waiting': 'Esperando a que el anfitrión empiece la carrera…', 'on.racing': 'Hay una carrera en curso: entras en la siguiente.',
  'on.leave': 'Salir de la sala', 'on.lobby': 'Volver a la sala', 'on.result': 'Carrera online', 'on.waitGrid': 'Esperando a todos los jugadores…',
  'on.err.noRoom': 'No hay ninguna sala con ese código.', 'on.err.full': 'Esa sala está llena.', 'on.err.racing': 'Hay una carrera en curso en esa sala.',
  'on.err.hostLeft': 'El anfitrión ha salido de la sala.', 'on.err.net': 'Problema de conexión. Revisa tu internet e inténtalo de nuevo. {msg}',
};
