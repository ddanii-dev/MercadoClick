const db = require("../config/database");
const { calcularPaginacion, armarPaginacion } = require("../utils/paginacion");

// RF07 — checkout real: valida stock, calcula el total en el
// backend (nunca confiando en lo que mande el frontend) y descuenta
// inventario. HU-01 (alertas de stock mínimo) se apoya en esto
const crearPedido = async (req, res) => {
    const conexion = await db.promise().getConnection();

    let transaccionIniciada = false;

    try {
        const usuarioId = req.usuario.id;

        const [usuarios] = await conexion.query(
            "SELECT id FROM usuarios WHERE id = ?",
            [usuarioId]
        );

        if (usuarios.length === 0) {
            conexion.release();

            return res.status(401).json({
                mensaje: "El usuario ya no existe"
            });
        }

        const { nombre, telefono, direccion, fecha, pago, items } = req.body;

        if (typeof nombre !== "string" || nombre.trim().length < 2 || nombre.trim().length > 100) {
            conexion.release();

            return res.status(400).json({
                mensaje: "El nombre no es válido"
            });
        }

        if (typeof telefono !== "string" || telefono.trim().length < 7 || telefono.trim().length > 10) {
            conexion.release();

            return res.status(400).json({
                mensaje: "El teléfono no es válido"
            });
        }

        if (typeof direccion !== "string" || direccion.trim().length < 5 || direccion.trim().length > 150) {
            conexion.release();

            return res.status(400).json({
                mensaje: "La dirección no es válida"
            });
        }

        if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            conexion.release();

            return res.status(400).json({
                mensaje: "La fecha de entrega no es válida"
            });
        }

        const fechaEntrega = new Date(fecha);

        if (isNaN(fechaEntrega.getTime())) {
            conexion.release();

            return res.status(400).json({
                mensaje: "La fecha de entrega no es válida"
            });
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fechaEntrega.setHours(0, 0, 0, 0);

        if (fechaEntrega < hoy) {
            conexion.release();

            return res.status(400).json({
                mensaje: "La fecha de entrega no puede ser anterior a hoy"
            });
        }

        const formasPagoPermitidas = ["Efectivo", "Tarjeta", "Transferencia"];

        if (!formasPagoPermitidas.includes(pago)) {
            conexion.release();

            return res.status(400).json({
                mensaje: "La forma de pago no es válida"
            });
        }

        if (!nombre || !telefono || !direccion || !fecha || !pago) {
            conexion.release();
            return res.status(400).json({
                mensaje: "Todos los datos de entrega son obligatorios"
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            conexion.release();
            return res.status(400).json({
                mensaje: "El carrito no puede estar vacío"
            });
        }

        if (items.length > 50) {
            conexion.release();

            return res.status(400).json({
                mensaje: "El carrito no puede tener más de 50 productos"
            });
        }

        await conexion.beginTransaction();
        transaccionIniciada = true;

        let subtotal = 0;
        const detalles = [];
        const alertasStock = [];

        const idsProductos = items.map(item => item.id);

        const idsUnicos = new Set(idsProductos);

        if (idsProductos.length !== idsUnicos.size) {
            await conexion.rollback();
            conexion.release();

            return res.status(400).json({
                mensaje: "No se puede agregar el mismo producto más de una vez"
            });
        }

        for (const item of items) {

            if (typeof item !== "object" || item === null || Array.isArray(item)) {
                await conexion.rollback();
                conexion.release();

                return res.status(400).json({
                    mensaje: "Uno de los productos del carrito no es válido"
                });
            }

            if (!Number.isInteger(item.id) || item.id <= 0) {
                await conexion.rollback();
                conexion.release();

                return res.status(400).json({
                    mensaje: "El producto no es válido"
                });
            }

            if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
                await conexion.rollback();
                conexion.release();

                return res.status(400).json({
                    mensaje: "La cantidad del producto no es válida"
                });
            }

            if (item.cantidad > 100) {
                await conexion.rollback();
                conexion.release();

                return res.status(400).json({
                    mensaje: "La cantidad máxima por producto es 100"
                });
            }

            const [productos] = await conexion.query(
                "SELECT * FROM productos WHERE id = ? AND activo = 1 FOR UPDATE",

                [item.id]
            );

            if (productos.length === 0) {
                await conexion.rollback();
                conexion.release();

                return res.status(400).json({

                    mensaje: `Uno de los productos ya no está disponible`
                });
            }

            const producto = productos[0];

            const precio = Number(producto.precio);

                if (!Number.isFinite(precio) || precio < 0) {
                    await conexion.rollback();
                    conexion.release();

                    return res.status(500).json({
                        mensaje: "El precio de uno de los productos no es válido"
                    });
                }

            if (item.cantidad > producto.stock) {
                await conexion.rollback();
                conexion.release();

                return res.status(400).json({

                    mensaje: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}`
                });
            }

            const subtotalProducto = precio * item.cantidad;
            subtotal += subtotalProducto;

            detalles.push({
                producto_id: producto.id,
                nombre_producto: producto.nombre,
                precio_unitario: precio,
                cantidad: item.cantidad,
                subtotal: subtotalProducto
            });

            const nuevoStock = producto.stock - item.cantidad;
            if (nuevoStock <= producto.stock_minimo) {

                alertasStock.push(`${producto.nombre} (quedan ${nuevoStock})`);
            }
        }

        if (!Number.isFinite(subtotal) || subtotal < 0) {
            await conexion.rollback();
            conexion.release();
            return res.status(500).json({
                mensaje: "No se pudo calcular correctamente el subtotal del pedido"
            });
        }

        const iva = Number((subtotal * 0.19).toFixed(2));
        const total = Number((subtotal + iva).toFixed(2));

        const [resultadoPedido] = await conexion.query(
            `INSERT INTO pedidos
                (usuario_id, nombre_cliente, telefono, direccion, fecha_entrega, forma_pago, subtotal, iva, total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [usuarioId, nombre, telefono, direccion, fecha, pago, subtotal, iva, total]
        );

        const pedidoId = resultadoPedido.insertId;

        for (const detalle of detalles) {
            await conexion.query(
                `INSERT INTO detalle_pedidos
                    (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    pedidoId,
                    detalle.producto_id,
                    detalle.nombre_producto,
                    detalle.precio_unitario,
                    detalle.cantidad,
                    detalle.subtotal
                ]
            );

            const [resultadoStock] = await conexion.query(
                `UPDATE productos
                SET stock = stock - ?
                WHERE id = ?
                AND stock >= ?`,
                [
                    detalle.cantidad,
                    detalle.producto_id,
                    detalle.cantidad
                ]
            );

            if (resultadoStock.affectedRows === 0) {
                await conexion.rollback();
                conexion.release();

                return res.status(400).json({
                    mensaje: "No hay suficiente stock para uno de los productos"
                });
            }
        }

        await conexion.commit();
        conexion.release();

        if (alertasStock.length > 0) {
            console.log("⚠ Alerta de stock mínimo:", alertasStock.join(", "));
        }

        res.status(201).json({
            mensaje: "Pedido registrado correctamente",
            pedido: {
                id: pedidoId,
                subtotal,
                iva,
                total,
                estado: "pendiente",
                items: detalles
            }
        });

    } catch (error) {
        if (transaccionIniciada) {
            await conexion.rollback();
        }

        conexion.release();

        console.log(error);

        res.status(500).json({
             mensaje: "Error al registrar el pedido"
        });
    }
};

// RF08 — historial de pedidos del cliente (paginado)
const misPedidos = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const { pagina, limite, offset } = calcularPaginacion(req.query, 10, 50);

        const [[{ total }]] = await db.promise().query(
            "SELECT COUNT(*) AS total FROM pedidos WHERE usuario_id = ?",
            [usuarioId]
        );

        const [pedidos] = await db.promise().query(
            `SELECT * FROM pedidos
             WHERE usuario_id = ?
             ORDER BY fecha_creacion DESC
             LIMIT ? OFFSET ?`,
            [usuarioId, limite, offset]
        );

        for (const pedido of pedidos) {
            const [detalles] = await db.promise().query(
                "SELECT * FROM detalle_pedidos WHERE pedido_id = ?",
                [pedido.id]
            );
            pedido.items = detalles;
        }

        res.json({
            pedidos,
            paginacion: armarPaginacion(pagina, limite, total)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener los pedidos" });
    }
};

// RF10 — gestión de pedidos (admin), paginado y filtrable por estado
const listarTodosPedidos = async (req, res) => {
    try {
        const { pagina, limite, offset } = calcularPaginacion(req.query, 20, 100);

        const condiciones = [];
        const valores = [];

        if (req.query.estado) {
            condiciones.push("p.estado = ?");
            valores.push(req.query.estado);
        }

        const whereSql = condiciones.length > 0
            ? `WHERE ${condiciones.join(" AND ")}`
            : "";

        const [[{ total }]] = await db.promise().query(
            `SELECT COUNT(*) AS total FROM pedidos p ${whereSql}`,
            valores
        );

        const [pedidos] = await db.promise().query(
            `SELECT p.*, u.nombre AS nombre_usuario, u.correo
             FROM pedidos p
             LEFT JOIN usuarios u ON u.id = p.usuario_id
             ${whereSql}
             ORDER BY p.fecha_creacion DESC
             LIMIT ? OFFSET ?`,
            [...valores, limite, offset]
        );

        for (const pedido of pedidos) {
            const [detalles] = await db.promise().query(
                "SELECT * FROM detalle_pedidos WHERE pedido_id = ?",
                [pedido.id]
            );
            pedido.items = detalles;
        }

        res.json({
            pedidos,
            paginacion: armarPaginacion(pagina, limite, total)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener los pedidos" });
    }
};

const actualizarEstadoPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ["pendiente", "confirmado", "enviado", "entregado", "cancelado"];

        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ mensaje: "Estado inválido" });
        }

        const [resultado] = await db.promise().query(
            "UPDATE pedidos SET estado = ? WHERE id = ?",
            [estado, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: "Pedido no encontrado" });
        }

        res.json({ mensaje: "Estado del pedido actualizado" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error al actualizar el estado del pedido" });
    }
};

module.exports = {
    crearPedido,
    misPedidos,
    listarTodosPedidos,
    actualizarEstadoPedido
};
