// Consultas a la tabla usuarios. Siempre con ? (consulta parametrizada), nunca pegando texto en el SQL.
const bcrypt = require('bcryptjs');

function crearModeloUsuarios(pool) {
  // Regresa el usuario (sin el hash) si la contraseña es correcta, o null si no.
  async function verificar(usuario, contrasena) {
    //si no son texto no buscamos nada
    if (typeof usuario !== 'string' || typeof contrasena !== 'string') return null;

    //buscamos al usuario con ? para evitar inyeccion sql
    const [filas] = await pool.query(
      'SELECT id, usuario, nombre, rol, contrasena_hash FROM usuarios WHERE usuario = ?',
      [usuario]
    );
    const fila = filas[0];
    if (!fila) return null; //no existe el usuario

    //comparamos la contraseña con el hash usando bcrypt
    const correcta = await bcrypt.compare(contrasena, fila.contrasena_hash);
    if (!correcta) return null;

    //regresamos el usuario sin el hash
    return { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol };
  }

  return { verificar };
}

module.exports = { crearModeloUsuarios };