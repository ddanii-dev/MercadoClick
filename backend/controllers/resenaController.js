const db = require("../config/database");

/* ================= LISTAR RESEÑAS ================= */
const listarResenasProducto = async (req, res) => {
    try {
        const { productoId } = req.params;

        const [resenas] = await db.promise().query(
            `SELECT 
                r.id,
                r.calificacion,
                r.comentario,
                r.fecha,
                u.nombre AS nombre_usuario
             FROM resenas r
             INNER JOIN usuarios u 
                ON u.id = r.usuario_id
             WHERE r.producto_id = ?
             ORDER BY r.fecha DESC`,
            [productoId]
        );

        const [resultado] = await db.promise().query(
            `SELECT 
                AVG(calificacion) AS promedio,
                COUNT(*) AS total
             FROM resenas
             WHERE producto_id = ?`,
            [productoId]
        );

        const promedio = resultado[0].promedio;
        const total = resultado[0].total;

        res.json({
            resenas,
            promedio: promedio ? Number(promedio).toFixed(1) : null,
            total: Number(total)
        });

    } catch (error) {
        console.error("Error al obtener reseñas:", error);

        res.status(500).json({
            mensaje: "Error al obtener las reseñas"
        });
    }
};

/* ================= CREAR RESEÑA ================= */
const crearResena = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { productoId } = req.params;
        const { calificacion, comentario } = req.body;

        /* ---------- VALIDAR CALIFICACIÓN ---------- */
        const numeroCalificacion = Number(calificacion);

        if (
            !Number.isInteger(numeroCalificacion) ||
            numeroCalificacion < 1 ||
            numeroCalificacion > 5
        ) {

            return res.status(400).json({
                mensaje: "La calificación debe ser un número entero entre 1 y 5"
            });

        }

        /* ---------- VALIDAR COMENTARIO ---------- */
        const comentarioLimpio = comentario
            ? comentario.trim()
            : null;

        if (comentarioLimpio && comentarioLimpio.length > 500) {

            return res.status(400).json({
                mensaje: "El comentario no puede superar los 500 caracteres"
            });

        }

        /* ---------- COMPROBAR QUE EL PRODUCTO EXISTE ---------- */
        const [producto] = await db.promise().query(
            `SELECT id
             FROM productos
             WHERE id = ?`,
            [productoId]
        );

        if (producto.length === 0) {

            return res.status(404).json({
                mensaje: "El producto no existe"
            });

        }

        /* ---------- COMPROBAR QUE EL USUARIO COMPRÓ ---------- */
        const [compras] = await db.promise().query(
            `SELECT dp.id
             FROM detalle_pedidos dp
             INNER JOIN pedidos p
                ON p.id = dp.pedido_id
             WHERE p.usuario_id = ?
               AND dp.producto_id = ?
             LIMIT 1`,
            [usuarioId, productoId]
        );

        if (compras.length === 0) {

            return res.status(403).json({
                mensaje: "Solo puedes reseñar productos que hayas comprado"
            });

        }

        /* ---------- COMPROBAR SI YA RESEÑÓ ---------- */
        const [resenaExistente] = await db.promise().query(
            `SELECT id
             FROM resenas
             WHERE producto_id = ?
               AND usuario_id = ?
             LIMIT 1`,
            [productoId, usuarioId]
        );

        if (resenaExistente.length > 0) {

            return res.status(409).json({
                mensaje: "Ya publicaste una reseña para este producto"
            });

        }

        /* ---------- INSERTAR RESEÑA ---------- */
        await db.promise().query(
            `INSERT INTO resenas
                (producto_id, usuario_id, calificacion, comentario)
             VALUES (?, ?, ?, ?)`,
            [
                productoId,
                usuarioId,
                numeroCalificacion,
                comentarioLimpio
            ]
        );

        res.status(201).json({
            mensaje: "Reseña publicada correctamente"
        });

    } catch (error) {
        console.error("Error al crear reseña:", error);

        res.status(500).json({
            mensaje: "Error al publicar la reseña"
        });
    }
};

module.exports = {
    listarResenasProducto,
    crearResena
};
