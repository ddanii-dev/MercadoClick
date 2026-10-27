const express = require("express");

const router = express.Router();

const verificarToken = require("../middleware/authMiddleware");

const {
    listarResenasProducto,
    crearResena
} = require("../controllers/resenaController");

/* Ver reseñas de un producto */
router.get(
    "/:productoId",
    listarResenasProducto
);

/* Crear una reseña */
router.post(
    "/:productoId",
    verificarToken,
    crearResena
);

module.exports = router;
