jest.mock("../config/database", () => ({ promise: jest.fn() }));

const db = require("../config/database");
const {
    crearProducto,
    obtenerProducto,
    eliminarProducto
} = require("../controllers/productoController");
const { crearRes } = require("./helpers");

const mockQuery = jest.fn();

beforeEach(() => {
    jest.resetAllMocks();
    db.promise.mockReturnValue({ query: mockQuery });
});

describe("crearProducto", () => {
    test("responde 400 si faltan campos obligatorios", async () => {
        const req = { body: { nombre: "Mouse" } };
        const res = crearRes();

        await crearProducto(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test("responde 400 si el precio es negativo", async () => {
        const req = {
            body: { nombre: "Mouse", categoria: "Tecnología", precio: -5, stock: 10 }
        };
        const res = crearRes();

        await crearProducto(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test("crea el producto y responde 201 con datos válidos", async () => {
        mockQuery.mockResolvedValue([{ insertId: 7 }]);
        const req = {
            body: { nombre: "Mouse", categoria: "Tecnología", precio: 50000, stock: 10 }
        };
        const res = crearRes();

        await crearProducto(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            mensaje: "Producto creado correctamente",
            id: 7
        });
        expect(mockQuery.mock.calls[0][1]).toContain("Mouse");
    });

    test("responde 500 si la base de datos falla", async () => {
        const spy = jest.spyOn(console, "log").mockImplementation(() => {});
        mockQuery.mockRejectedValue(new Error("fallo de BD"));
        const req = {
            body: { nombre: "Mouse", categoria: "Tecnología", precio: 50000, stock: 10 }
        };
        const res = crearRes();

        await crearProducto(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        spy.mockRestore();
    });
});

describe("obtenerProducto", () => {
    test("responde 400 si el ID no es válido", async () => {
        const req = { params: { id: "abc" } };
        const res = crearRes();

        await obtenerProducto(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("responde 404 si el producto no existe", async () => {
        mockQuery.mockResolvedValue([[]]);
        const req = { params: { id: "99" } };
        const res = crearRes();

        await obtenerProducto(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test("devuelve el producto si existe", async () => {
        const producto = { id: 1, nombre: "Mouse" };
        mockQuery.mockResolvedValue([[producto]]);
        const req = { params: { id: "1" } };
        const res = crearRes();

        await obtenerProducto(req, res);

        expect(res.json).toHaveBeenCalledWith(producto);
    });
});

describe("eliminarProducto", () => {
    test("responde 400 si el ID no es válido", async () => {
        const req = { params: { id: "-3" } };
        const res = crearRes();

        await eliminarProducto(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test("responde 404 si no se afectó ninguna fila", async () => {
        mockQuery.mockResolvedValue([{ affectedRows: 0 }]);
        const req = { params: { id: "5" } };
        const res = crearRes();

        await eliminarProducto(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test("desactiva el producto cuando existe", async () => {
        mockQuery.mockResolvedValue([{ affectedRows: 1 }]);
        const req = { params: { id: "5" } };
        const res = crearRes();

        await eliminarProducto(req, res);

        expect(res.json).toHaveBeenCalledWith({
            mensaje: "Producto eliminado correctamente"
        });
    });
});
