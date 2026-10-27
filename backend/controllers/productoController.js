const db = require("../config/database");
const { calcularPaginacion, armarPaginacion } = require("../utils/paginacion");

// RF03 / RF04 / RF05 — catálogo público, con búsqueda, filtro y paginación
const listarProductos = async (req, res) => {
    try {
        const soloActivos = req.path !== "/admin/todos";

        const { pagina, limite, offset } = calcularPaginacion(req.query, 20, 100);

        const condiciones = [];
        const valores = [];

        if (soloActivos) {
            condiciones.push("activo = 1");
        }

        if (req.query.categoria && req.query.categoria !== "todos") {
            condiciones.push("categoria = ?");
            valores.push(req.query.categoria);
        }

        if (req.query.buscar) {
            condiciones.push("nombre LIKE ?");
            valores.push(`%${req.query.buscar}%`);
        }

        const whereSql = condiciones.length > 0
            ? `WHERE ${condiciones.join(" AND ")}`
            : "";

        const [[{ total }]] = await db.promise().query(
            `SELECT COUNT(*) AS total FROM productos ${whereSql}`,
            valores
        );

        const [productos] = await db.promise().query(
            `SELECT * FROM productos ${whereSql} ORDER BY id LIMIT ? OFFSET ?`,
            [...valores, limite, offset]
        );

        res.json({
            productos,
            paginacion: armarPaginacion(pagina, limite, total)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener los productos" });
    }
};

const obtenerProducto = async (req, res) => {
    try {
        const { id } = req.params;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                mensaje: "El ID del producto no es válido"
            });
        }

        const [productos] = await db.promise().query(
            "SELECT * FROM productos WHERE id = ?",
            [id]
        );

        if (productos.length === 0) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        res.json(productos[0]);

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error al obtener el producto" });
    }
};

// RF09 — gestión de productos (admin)
const crearProducto = async (req, res) => {
    try {
        const { nombre, categoria, precio, stock, stock_minimo, imagen } = req.body;

        if (!nombre || !categoria || precio === undefined || stock === undefined) {
            return res.status(400).json({
                mensaje: "Nombre, categoría, precio y stock son obligatorios"
            });
        }

        if (
            typeof nombre !== "string" ||
            nombre.trim().length < 2 ||
            nombre.trim().length > 150
        ) {
            return res.status(400).json({
                mensaje: "El nombre no es válido"
            });
        }

        if (
            imagen !== undefined &&
            imagen !== null &&
            (typeof imagen !== "string" || imagen.length > 255)
        ) {
            return res.status(400).json({
                mensaje: "La imagen no es válida"
            });
        }

        if (
            typeof categoria !== "string" ||
            categoria.trim().length < 2 ||
            categoria.trim().length > 50
        ) {
            return res.status(400).json({
                mensaje: "La categoría no es válida"
            });
        }

        if (
            !Number.isFinite(Number(precio)) ||
            Number(precio) < 0 ||
            !Number.isInteger(Number(stock)) ||
            Number(stock) < 0
        ) {
            return res.status(400).json({
                mensaje: "El precio y el stock no son válidos"
            });
        }

        if (
            stock_minimo !== undefined &&
            (!Number.isInteger(Number(stock_minimo)) || Number(stock_minimo) < 0)
        ) {
            return res.status(400).json({
                mensaje: "El stock mínimo no es válido"
            });
        }

        const [resultado] = await db.promise().query(
            `INSERT INTO productos
                (nombre, categoria, precio, stock, stock_minimo, imagen)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                nombre.trim(),
                categoria.trim(),
                Number(precio),
                Number(stock),
                stock_minimo !== undefined ? Number(stock_minimo) : 5,
                imagen && imagen.trim() ? imagen.trim() : null
            ]
        );

        res.status(201).json({
            mensaje: "Producto creado correctamente",
            id: resultado.insertId
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error al crear el producto" });
    }
};

const actualizarProducto = async (req, res) => {
    try {
        const { id } = req.params;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                mensaje: "El ID del producto no es válido"
            });
        }

        const { nombre, categoria, precio, stock, stock_minimo, imagen, activo } = req.body;

        if (
            nombre !== undefined &&
            (typeof nombre !== "string" ||
            nombre.trim().length < 2 ||
            nombre.trim().length > 150)
        ) {
            return res.status(400).json({
                mensaje: "El nombre no es válido"
            });
        }

        if (
            categoria !== undefined &&
            (typeof categoria !== "string" ||
            categoria.trim().length < 2 ||
            categoria.trim().length > 50)
        ) {
            return res.status(400).json({
                mensaje: "La categoría no es válida"
            });
        }

        if (
            imagen !== undefined &&
            imagen !== null &&
            (typeof imagen !== "string" || imagen.length > 255)
        ) {
            return res.status(400).json({
                mensaje: "La imagen no es válida"
            });
        }

        if (precio !== undefined && (!Number.isFinite(Number(precio)) || Number(precio) < 0)) {
            return res.status(400).json({
                mensaje: "El precio no es válido"
            });
        }

        if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
            return res.status(400).json({
                mensaje: "El stock no es válido"
            });
        }

        if (stock_minimo !== undefined && (!Number.isInteger(Number(stock_minimo)) || Number(stock_minimo) < 0)) {
            return res.status(400).json({
                mensaje: "El stock mínimo no es válido"
            });
        }

        if (activo !== undefined && typeof activo !== "boolean") {
            return res.status(400).json({
                mensaje: "El estado del producto no es válido"
            });
        }

        const [productos] = await db.promise().query(
            "SELECT * FROM productos WHERE id = ?",
            [id]
        );

        if (productos.length === 0) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        const actual = productos[0];

        await db.promise().query(
            `UPDATE productos SET
                nombre = ?,
                categoria = ?,
                precio = ?,
                stock = ?,
                stock_minimo = ?,
                imagen = ?,
                activo = ?
            WHERE id = ?`,
            [
                nombre ?? actual.nombre,
                categoria ?? actual.categoria,
                precio ?? actual.precio,
                stock ?? actual.stock,
                stock_minimo ?? actual.stock_minimo,
                imagen ?? actual.imagen,
                activo !== undefined ? activo : actual.activo,
                id
            ]
        );

        res.json({ mensaje: "Producto actualizado correctamente" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error al actualizar el producto" });
    }
};

// Baja lógica: se desactiva en vez de borrar de la tabla, para no
// romper el historial de pedidos que ya lo referencian
const eliminarProducto = async (req, res) => {
    try {
        const { id } = req.params;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                mensaje: "El ID del producto no es válido"
            });
        }

        const [resultado] = await db.promise().query(
            "UPDATE productos SET activo = 0 WHERE id = ?",
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        res.json({ mensaje: "Producto eliminado correctamente" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al eliminar el producto" });
    }
};

module.exports = {
    listarProductos,
    obtenerProducto,
    crearProducto,
    actualizarProducto,
    eliminarProducto
};
