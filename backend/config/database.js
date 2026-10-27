const mysql = require("mysql2");

require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verificación inicial de que la conexión funciona (no reemplaza
// al pool, solo confirma la configuración al arrancar el server).
pool.getConnection((error, conexion) => {
    if (error) {
        console.log("Error al conectar con MySQL:", error);
        return;
    }

    console.log("Conectado a MySQL");
    conexion.release();
});

module.exports = pool;
