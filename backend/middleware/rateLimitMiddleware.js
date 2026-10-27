const rateLimit = require("express-rate-limit");

// Login: limita los intentos de fuerza bruta de contraseña por IP.
// 10 intentos cada 15 minutos es holgado para un usuario real que
// se equivoca de contraseña, pero corta un ataque automatizado
const limitadorLogin = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,
    standardHeaders: true, // responde con cabeceras RateLimit-*
    legacyHeaders: false,
    message: {
        mensaje: "Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos."
    }
});

// Recuperación de contraseña: evita que se abuse del envío masivo
// de correos y que se use el endpoint para enumerar qué correos
// están registrados probando muchos a la vez
const limitadorRecuperacion = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        mensaje: "Demasiadas solicitudes de recuperación de contraseña. Intenta de nuevo más tarde."
    }
});

// Registro, evita la creación masiva/automatizada de cuentas
const limitadorRegistro = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        mensaje: "Demasiados registros desde esta IP. Intenta de nuevo más tarde."
    }
});

// Restablecer contraseña (segundo paso, con token), también se
// limita para dificultar que alguien intente adivinar tokens
const limitadorRestablecer = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        mensaje: "Demasiados intentos. Intenta de nuevo en unos minutos."
    }
});

module.exports = {
    limitadorLogin,
    limitadorRecuperacion,
    limitadorRegistro,
    limitadorRestablecer
};
