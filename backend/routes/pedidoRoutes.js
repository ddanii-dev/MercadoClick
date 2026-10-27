const express = require("express");

const router = express.Router();

const verificarToken = require("../middleware/authMiddleware");
const verificarAdmin = require("../middleware/adminMiddleware");

const {
    crearPedido,
    misPedidos,
    listarTodosPedidos,
    actualizarEstadoPedido
} = require("../controllers/pedidoController");

// Cliente autenticado (RF07 / RF08)
router.post("/", verificarToken, crearPedido);
router.get("/mios", verificarToken, misPedidos);

// Solo administrador (RF10)
router.get("/", verificarToken, verificarAdmin, listarTodosPedidos);
router.put("/:id/estado", verificarToken, verificarAdmin, actualizarEstadoPedido);

module.exports = router;
