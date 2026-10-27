const enviarCorreoRecuperacion = require("../services/emailService");
const db = require("../config/database");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const registrarUsuario = async (req, res) => {
    try {
        const { nombre, cedula, correo, password } = req.body;

        if (!nombre || !cedula || !correo || !password) {
            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios"
            });
        }

        const [usuarios] = await db.promise().query(
            "SELECT * FROM usuarios WHERE correo = ? OR cedula = ?",
            [correo, cedula]
        );

        if (usuarios.length > 0) {
            return res.status(400).json({
                mensaje: "El correo o la cédula ya están registrados"
            });
        }

        const passwordEncriptada = await bcrypt.hash(password, 10);

        await db.promise().query(
            "INSERT INTO usuarios (nombre, cedula, correo, password) VALUES (?, ?, ?, ?)",
            [nombre, cedula, correo, passwordEncriptada]
        );

        res.status(201).json({
            mensaje: "Usuario registrado correctamente"
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            mensaje: "Error al registrar el usuario"
        });
    }
};

// RF02 — el SRS pide autenticación por correo y contraseña
// (antes se hacía por cédula, se corrige aquí)
const iniciarSesion = async (req, res) => {
    try {
        const { correo, password, remember } = req.body;

        if (!correo || !password) {
            return res.status(400).json({
                mensaje: "El correo y la contraseña son obligatorios"
            });
        }

        const [usuarios] = await db.promise().query(
            "SELECT * FROM usuarios WHERE correo = ?",
            [correo]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        const usuario = usuarios[0];

        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password
        );

        if (!passwordCorrecta) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        const duracionToken = remember === true ? "30d" : "2h";

        const token = jwt.sign(
            {
                id: usuario.id,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: duracionToken
            }
        );

        res.json({
            mensaje: "Inicio de sesión correcto",
            token: token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                cedula: usuario.cedula,
                correo: usuario.correo,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            mensaje: "Error al iniciar sesión"
        });
    }
};

// RF11 — solicitar recuperación de contraseña.
const solicitarRecuperacion = async (req, res) => {
    try {
        const { correo } = req.body;

        if (!correo) {
            return res.status(400).json({
                mensaje: "El correo es obligatorio"
            });
        }

        const [usuarios] = await db.promise().query(
            "SELECT * FROM usuarios WHERE correo = ?",
            [correo]
        );

        const mensajeGenerico = {
            mensaje: "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña"
        };

        if (usuarios.length === 0) {
            return res.json(mensajeGenerico);
        }

        const token = crypto.randomBytes(32).toString("hex");

        const expira = new Date(
            Date.now() + 1000 * 60 * 30
        );

        await db.promise().query(
            "UPDATE usuarios SET reset_token = ?, reset_token_expira = ? WHERE correo = ?",
            [token, expira, correo]
        );

        const urlBase = process.env.APP_URL || "http://localhost:3000";

        const enlace =
            `${urlBase}/pages/restablecer.html?token=${token}`;

        await enviarCorreoRecuperacion(correo, enlace);

        res.json(mensajeGenerico);

    } catch (error) {
        console.log(error);

        res.status(500).json({
            mensaje: "Error al procesar la solicitud"
        });
    }
};

// RF11 — segundo paso: definir la nueva contraseña con el token
const restablecerPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                mensaje: "El token y la nueva contraseña son obligatorios"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                mensaje: "La contraseña debe tener al menos 6 caracteres"
            });
        }

        const [usuarios] = await db.promise().query(
            "SELECT * FROM usuarios WHERE reset_token = ? AND reset_token_expira > NOW()",
            [token]
        );

        if (usuarios.length === 0) {
            return res.status(400).json({
                mensaje: "El enlace no es válido o ya expiró"
            });
        }

        const passwordEncriptada = await bcrypt.hash(password, 10);

        await db.promise().query(
            "UPDATE usuarios SET password = ?, reset_token = NULL, reset_token_expira = NULL WHERE id = ?",
            [passwordEncriptada, usuarios[0].id]
        );

        res.json({ mensaje: "Contraseña actualizada correctamente" });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            mensaje: "Error al restablecer la contraseña"
        });
    }
};

module.exports = {
    registrarUsuario,
    iniciarSesion,
    solicitarRecuperacion,
    restablecerPassword
};
