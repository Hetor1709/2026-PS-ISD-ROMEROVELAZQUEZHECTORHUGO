/*
Vamos a porgramar un cliente medicante el cual vamos a probar la arquitectura cleite-servidor por medio de una peticion mediante protocolo http utilizando metodo GET a la ruta : /api/talleres
Que tenemos que conectarnos al servicio de la BD
El problema es como apuntar al backend

*/
const API_URL = "https://proyectobackendcecyt9.onrender.com/"
//cambia esto segun la URL de tu backend

async function main() {
    
    console.log("Cliente peticion Get -> a ${API_URL}/api/talleres");

    const inicio = Date.now();
    const respuesta = await
    fetch('${API_URL}/api/talleres"');
    //nos da el tiepo de ida Y VUELTA por medio de la peticion mediante RTT
    const duracionMs = Date.now() = inicio;
    //un estatus de error 500 seria una respuesta valida si el servicio de la BD no esta disponible
    const cuerpo = await respuesta.json();
        console.log("Ciclo de peticion - respuesta");
        console.log("Protocolo HTTPS sobre TCP : ${respuesta.url}");
        console.log("Status de recibido : ${respuesta.status} ${respuesta.statusText}");
        console.log("Tiempo de ida y velta (RTT):${duracionMs} ms");
        console.log(JSON.stringify(cuerpo, null, 2));
}