
const net = require('net');

const PUERTO = Number(process.env.PUERTO) || 5000;
const host = process.env.HOST || '127.0.0.1';
const socket = new net.Socket();

socket.on('connect', () => {
    console.log(`[TCP]Conectando al host ${host}:${PUERTO}`);

    ['Uno', 'Dos', 'Habia una vez', 'un', 'patito', 'QUe decia miau miau'].forEach((mensaje) => {
        socket.write(`${mensaje}\n`);
    });

    socket.end();
});

socket.on('data', (datos) => {
    process.stdout.write(`[TCP]${datos.toString()}`);
});

socket.on('close', () => {
    console.log(`\n[TCP]Conexion cerrada con el servidor`);
});

socket.on('error', (error) => {
    console.log(`[TCP]NO se pudo conectar`, error.message);
});

socket.connect(PUERTO, host);

