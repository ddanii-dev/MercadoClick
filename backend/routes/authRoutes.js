const express = require("express");

const router = express.Router();

const {
    registrarUsuario,
    iniciarSesion,
    solicitarRecuperacion,
    restablecerPassword
} = require("../controllers/authController");

const {
    limitadorLogin,
    limitadorRecuperacion,
    limitadorRegistro,
    limitadorRestablecer
} = require("../middleware/rateLimitMiddleware");

router.post("/registro", limitadorRegistro, registrarUsuario);
router.post("/login", limitadorLogin, iniciarSesion);
router.post("/recuperar", limitadorRecuperacion, solicitarRecuperacion);
router.post("/restablecer", limitadorRestablecer, restablecerPassword);

module.exports = router;
