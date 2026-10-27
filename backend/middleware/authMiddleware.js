const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
    try {
        const token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({
                mensaje: "No hay token de autenticación"
            });
        }

        const partes = token.split(" ");

        if (partes.length !== 2 || partes[0] !== "Bearer") {
            return res.status(401).json({
                mensaje: "Formato de token inválido"
            });
        }

        const tokenLimpio = partes[1];

        const usuario = jwt.verify(
            tokenLimpio,
            process.env.JWT_SECRET
        );

        req.usuario = usuario;

        next();

    } catch (error) {
        return res.status(401).json({
            mensaje: "Token inválido o expirado"
        });
    }
};

module.exports = verificarToken;
