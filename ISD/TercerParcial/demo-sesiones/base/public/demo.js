// La página se comunica con la API mediante fetch. El navegador administra y envía la cookie automáticamente porque ambos están en el mismo servidor.
// Como este archivo se carga al final del body, los elementos HTML ya están disponibles al ejecutar el código.
const $ = (id) => document.getElementById(id);

// Etapa 1: creamos una función general para realizar las solicitudes a la API.
// fetch no considera los códigos 401 y 403 como errores de conexión, por eso consultamos respuesta.status.
// No es necesario configurar credentials: 'include' porque la página y la API pertenecen al mismo servidor.
async function llamar(metodo, url, cuerpo) {
  const opciones = { method: metodo, headers: {} };
  // Cuando enviamos información, indicamos que el contenido está en formato JSON para que Express pueda procesarlo.
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch {
    // Si no se puede establecer conexión con el servidor, devolvemos un resultado controlado para evitar que la página se interrumpa.
    return { status: 0, datos: { error: 'No hay conexión con el servidor (¿está corriendo npm start?)' } };
  }
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null; // Si la respuesta no contiene JSON válido, conservamos el valor null.
  }
  return { status: respuesta.status, datos };
}

// Etapa 2: mostramos las respuestas de las solicitudes en la bitácora.
// Asignamos una clase dependiendo del código HTTP recibido.
function claseDelCodigo(status) {
  if (status >= 200 && status < 300) return 'codigo ok';
  if (status === 401) return 'codigo e401';
  if (status === 403) return 'codigo e403';
  return 'codigo error';
}

// Colocamos cada nueva respuesta al principio de la bitácora.
// Utilizamos textContent en lugar de innerHTML para evitar que contenido externo pueda ejecutar código HTML o JavaScript (XSS).
function anotar(metodo, url, status, datos) {
  const li = document.createElement('li');

  const codigo = document.createElement('span');
  codigo.className = claseDelCodigo(status);
  codigo.textContent = status;

  const ruta = document.createElement('span');
  ruta.textContent = ` ${metodo} ${url}`;

  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(datos, null, 2);

  li.append(codigo, ruta, pre);
  $('bitacora').prepend(li);

  // Limitamos el historial a 30 respuestas para evitar que acumule demasiados elementos y afecte el rendimiento.
  const lista = $('bitacora');
  while (lista.children.length > 30) lista.lastElementChild.remove();
}

// Comprobamos que los datos del formulario cumplan las condiciones antes de enviarlos.
function validarFormulario(usuario, contrasena) {
  if (usuario.trim() === '') return 'Escribe un usuario';
  if (contrasena === '') return 'Escribe la contraseña';
  if (usuario.length > 30) return 'El usuario es demasiado largo';
  if (contrasena.length > 100) return 'La contraseña es demasiado larga';
  return null;
}

// Deshabilitamos temporalmente los botones para impedir que se generen varias solicitudes mientras esperamos la respuesta del servidor.
function bloquearBotones(bloquear) {
  document.querySelectorAll('button').forEach((b) => { b.disabled = bloquear; });
}

// Etapa 3: consultamos al servidor para conocer si existe una sesión iniciada.
async function pintarEstado() {
  const { status, datos } = await llamar('GET', '/api/sesion');
  const estado = $('estado');
  if (status === 200 && datos && datos.usuario) {
    const u = datos.usuario;
    estado.textContent = `Con sesión: ${u.nombre} (${u.rol}) · sesión ${datos.sesion} · vence en ${datos.expiraEnSegundos} s`;
    estado.className = 'estado con-sesion';
  } else {
    estado.textContent = `Sin sesión (el servidor responde ${status})`;
    estado.className = 'estado sin-sesion';
  }
  // Cuando httpOnly está habilitado, JavaScript no puede acceder a la cookie y document.cookie aparece vacío.
  $('cookie-js').textContent = document.cookie || '(vacío)';
}

// Etapa 4: consultamos y mostramos las sesiones registradas en el servidor.
// Limpiamos primero el cuerpo de la tabla para evitar repetir información al actualizarla.
async function pintarTabla() {
  const { status, datos } = await llamar('GET', '/api/diagnostico/sesiones');
  const tbody = $('tabla-sesiones');
  tbody.replaceChildren();

  if (status !== 200 || !datos) {
    $('donde').textContent = `No se pudo leer el diagnóstico (código ${status})`;
    agregarFilaVacia(tbody, '(no se pudo leer)');
    return;
  }

  $('donde').textContent = datos.almacen === 'memoria'
    ? 'En la MEMORIA del servidor (MemoryStore): se pierden al reiniciar'
    : 'En MySQL, tabla sessions (sobreviven a un reinicio)';

  if (!datos.sesiones || datos.sesiones.length === 0) {
    agregarFilaVacia(tbody, '(sin sesiones)');
    return;
  }

  for (const s of datos.sesiones) {
    const tr = document.createElement('tr');
    if (s.esLaTuya) tr.className = 'tuya';
    const vence = s.expira ? new Date(s.expira).toLocaleTimeString() : '—'; // Convertimos la fecha recibida a la hora local del equipo.
    const celdas = [
      s.esLaTuya ? `${s.sesion} (la tuya)` : s.sesion,
      s.usuario,
      String(s.visitas),
      vence,
    ];
    for (const texto of celdas) {
      const td = document.createElement('td');
      td.textContent = texto;
      tr.append(td);
    }
    tbody.append(tr);
  }
}

// Creamos una fila para indicar que no hay información disponible en la tabla.
function agregarFilaVacia(tbody, texto) {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 4;
  td.textContent = texto;
  tr.append(td);
  tbody.append(tr);
}

// Actualizamos tanto la información de la sesión como el contenido de la tabla.
async function refrescarTodo() {
  await pintarEstado();
  await pintarTabla();
}

// Etapa 5: configuramos las acciones que se ejecutan cuando el usuario interactúa con la página.
// Capturamos el envío del formulario y usamos preventDefault para evitar que se recargue la página.
$('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const cuerpo = { usuario: $('usuario').value, contrasena: $('contrasena').value };
  const problema = validarFormulario(cuerpo.usuario, cuerpo.contrasena);
  if (problema) {
    // Si los datos no cumplen las condiciones, detenemos el envío y registramos el motivo en la bitácora.
    anotar('POST', '/api/login', '--', { error: `La página no lo mandó: ${problema}` });
    return;
  }
  bloquearBotones(true);
  try {
    const { status, datos } = await llamar('POST', '/api/login', cuerpo);
    anotar('POST', '/api/login', status, datos);
    await refrescarTodo();
  } finally {
    bloquearBotones(false); // Reactivamos los botones al terminar, incluso si ocurre algún problema.
  }
});

// Al seleccionar otro usuario, completamos automáticamente su contraseña de ejemplo.
$('usuario').addEventListener('change', () => {
  $('contrasena').value = `${$('usuario').value}12345`;
});

// Identificamos los botones que tienen data-url y obtenemos de sus atributos el método y la dirección de la petición.
document.querySelectorAll('button[data-url]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    const { metodo, url } = boton.dataset;
    bloquearBotones(true);
    try {
      const { status, datos } = await llamar(metodo, url);
      anotar(metodo, url, status, datos);
      await refrescarTodo();
    } finally {
      bloquearBotones(false);
    }
  });
});

// Asociamos cada botón con la función que debe ejecutar al hacer clic.
$('btn-refrescar').addEventListener('click', refrescarTodo);
$('btn-sesiones').addEventListener('click', pintarTabla);

// Etapa 6: al iniciar la página obtenemos la configuración de la API y actualizamos la información mostrada.
async function iniciar() {
  // Establecemos un límite de 100 caracteres para el campo de contraseña.
  $('contrasena').maxLength = 100;
  const { datos } = await llamar('GET', '/api/config');
  $('config').textContent = JSON.stringify(datos, null, 2);
  await refrescarTodo();
}

iniciar();