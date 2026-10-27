const verificarAdmin = (req, res, next) => {
    if (!req.usuario || req.usuario.rol !== "admin") {
        return res.status(403).json({
            mensaje: "Acceso restringido a administradores"
        });
    }

    next();
};

module.exports = verificarAdmin;
