const jwt = require("jsonwebtoken");
const verificarToken = require("../middleware/authMiddleware");
const verificarAdmin = require("../middleware/adminMiddleware");
const { crearRes } = require("./helpers");

describe("authMiddleware (verificarToken)", () => {
    beforeAll(() => {
        process.env.JWT_SECRET = "secreto_de_prueba";
    });

    test("responde 401 si no hay token", () => {
        const req = { headers: {} };
        const res = crearRes();
        const next = jest.fn();

        verificarToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test("responde 401 si el formato no es Bearer", () => {
        const req = { headers: { authorization: "token123" } };
        const res = crearRes();
        const next = jest.fn();

        verificarToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test("responde 401 si el token es inválido", () => {
        const req = { headers: { authorization: "Bearer abc" } };
        const res = crearRes();
        const next = jest.fn();

        verificarToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test("deja pasar y llena req.usuario con un token válido", () => {
        const token = jwt.sign(
            { id: 1, rol: "cliente" },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = crearRes();
        const next = jest.fn();

        verificarToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.usuario).toMatchObject({ id: 1, rol: "cliente" });
    });
});

describe("adminMiddleware (verificarAdmin)", () => {
    test("responde 403 si no hay usuario", () => {
        const req = {};
        const res = crearRes();
        const next = jest.fn();

        verificarAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test("responde 403 si el rol es cliente", () => {
        const req = { usuario: { id: 1, rol: "cliente" } };
        const res = crearRes();
        const next = jest.fn();

        verificarAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test("deja pasar si el rol es admin", () => {
        const req = { usuario: { id: 1, rol: "admin" } };
        const res = crearRes();
        const next = jest.fn();

        verificarAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});
