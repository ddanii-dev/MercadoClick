jest.mock("../config/database", () => ({ promise: jest.fn() }));

const db = require("../config/database");
const { crearPedido } = require("../controllers/pedidoController");
const { crearRes } = require("./helpers");

const mockQuery = jest.fn();
let conexion;

// Fecha de entrega futura para pasar la validación
const fechaFutura = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

const crearReq = (items) => ({
    usuario: { id: 1 },
    body: {
        nombre: "Daniel López",
        telefono: "3001234567",
        direccion: "Calle 1 # 2-3",
        fecha: fechaFutura,
        pago: "Efectivo",
        items
    }
});

beforeEach(() => {
    jest.resetAllMocks();

    conexion = {
        query: mockQuery,
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
    };

    db.promise.mockReturnValue({
        getConnection: jest.fn().mockResolvedValue(conexion),
        query: mockQuery
    });
});

describe("crearPedido", () => {
    test("responde 400 si el carrito está vacío", async () => {
        mockQuery.mockResolvedValueOnce([[{ id: 1 }]]);
        const res = crearRes();

        await crearPedido(crearReq([]), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(conexion.beginTransaction).not.toHaveBeenCalled();
        expect(conexion.release).toHaveBeenCalled();
    });

    test("responde 400 y revierte si no hay stock suficiente", async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1 }]])
            .mockResolvedValueOnce([[{
                id: 1,
                nombre: "Mouse",
                precio: "50000.00",
                stock: 1,
                stock_minimo: 2
            }]]);
        const res = crearRes();

        await crearPedido(crearReq([{ id: 1, cantidad: 2 }]), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(conexion.rollback).toHaveBeenCalled();
        expect(conexion.commit).not.toHaveBeenCalled();
        expect(conexion.release).toHaveBeenCalled();
    });

    test("calcula subtotal, IVA 19% y total en el backend", async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1 }]])
            .mockResolvedValueOnce([[{
                id: 1,
                nombre: "Mouse",
                precio: "50000.00",
                stock: 10,
                stock_minimo: 2
            }]])
            .mockResolvedValueOnce([{ insertId: 99 }])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);
        const res = crearRes();

        await crearPedido(crearReq([{ id: 1, cantidad: 2 }]), res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                pedido: expect.objectContaining({
                    id: 99,
                    subtotal: 100000,
                    iva: 19000,
                    total: 119000
                })
            })
        );
        expect(conexion.commit).toHaveBeenCalled();
    });
});
