const express = require("express");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const productoRoutes = require("./routes/productoRoutes");
const pedidoRoutes = require("./routes/pedidoRoutes");
const resenaRoutes = require("./routes/resenaRoutes");
const verificarToken = require("./middleware/authMiddleware");

const app = express();

app.use(express.json());

// API
app.use("/api/auth", authRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/resenas", resenaRoutes);

// Frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Ruta de prueba protegida
app.get("/api/perfil", verificarToken, (req, res) => {
    res.json({
        mensaje: "Acceso permitido",
        usuario: req.usuario
    });
});

// Página principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

module.exports = app;
