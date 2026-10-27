const express = require("express");

const router = express.Router();

const verificarToken = require("../middleware/authMiddleware");
const verificarAdmin = require("../middleware/adminMiddleware");

const {
    listarProductos,
    obtenerProducto,
    crearProducto,
    actualizarProducto,
    eliminarProducto
} = require("../controllers/productoController");

// Públicas (RF03 / RF04 / RF05)
router.get("/", listarProductos);
router.get("/admin/todos", verificarToken, verificarAdmin, listarProductos);
router.get("/:id", obtenerProducto);

// Solo administrador (RF09)
router.post("/", verificarToken, verificarAdmin, crearProducto);
router.put("/:id", verificarToken, verificarAdmin, actualizarProducto);
router.delete("/:id", verificarToken, verificarAdmin, eliminarProducto);

module.exports = router;
