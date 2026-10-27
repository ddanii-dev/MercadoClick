jest.mock("../config/database", () => ({ promise: jest.fn() }));
jest.mock("bcrypt", () => ({ hash: jest.fn(), compare: jest.fn() }));
jest.mock("../services/emailService", () => jest.fn());

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/database");
const {
    registrarUsuario,
    iniciarSesion,
    restablecerPassword
} = require("../controllers/authController");
const { crearRes } = require("./helpers");

const mockQuery = jest.fn();

beforeAll(() => {
    process.env.JWT_SECRET = "secreto_de_prueba";
});

beforeEach(() => {
    jest.resetAllMocks();
    db.promise.mockReturnValue({ query: mockQuery });
});

describe("registrarUsuario", () => {
    test("responde 400 si faltan campos", async () => {
        const req = { body: { nombre: "Ana" } };
        const res = crearRes();

        await registrarUsuario(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test("responde 400 si el correo o la cédula ya existen", async () => {
        mockQuery.mockResolvedValue([[{ id: 1 }]]);
        const req = {
            body: { nombre: "Ana", cedula: "123", correo: "ana@correo.com", password: "Clave123" }
        };
        const res = crearRes();

        await registrarUsuario(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    test("guarda la contraseña encriptada y responde 201", async () => {
        mockQuery
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{}]);
        bcrypt.hash.mockResolvedValue("hash123");
        const req = {
            body: { nombre: "Ana", cedula: "123", correo: "ana@correo.com", password: "Clave123" }
        };
        const res = crearRes();

        await registrarUsuario(req, res);

        expect(bcrypt.hash).toHaveBeenCalledWith("Clave123", 10);
        expect(mockQuery.mock.calls[1][1]).toEqual([
            "Ana",
            "123",
            "ana@correo.com",
            "hash123"
        ]);
        expect(res.status).toHaveBeenCalledWith(201);
    });
});

describe("iniciarSesion", () => {
    test("responde 400 si faltan campos", async () => {
        const req = { body: { correo: "ana@correo.com" } };
        const res = crearRes();

        await iniciarSesion(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("responde 401 si el correo no existe", async () => {
        mockQuery.mockResolvedValue([[]]);
        const req = { body: { correo: "x@correo.com", password: "Clave123" } };
        const res = crearRes();

        await iniciarSesion(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test("responde 401 si la contraseña es incorrecta", async () => {
        mockQuery.mockResolvedValue([[{ id: 1, password: "hash", rol: "cliente" }]]);
        bcrypt.compare.mockResolvedValue(false);
        const req = { body: { correo: "ana@correo.com", password: "mala" } };
        const res = crearRes();

        await iniciarSesion(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test("devuelve un token válido y no expone la contraseña", async () => {
        mockQuery.mockResolvedValue([[{
            id: 5,
            nombre: "Ana",
            cedula: "123",
            correo: "ana@correo.com",
            password: "hash",
            rol: "admin"
        }]]);
        bcrypt.compare.mockResolvedValue(true);
        const req = { body: { correo: "ana@correo.com", password: "Clave123" } };
        const res = crearRes();

        await iniciarSesion(req, res);

        const respuesta = res.json.mock.calls[0][0];
        const payload = jwt.verify(respuesta.token, process.env.JWT_SECRET);

        expect(payload).toMatchObject({ id: 5, rol: "admin" });
        expect(respuesta.usuario).not.toHaveProperty("password");
    });
});

describe("restablecerPassword", () => {
    test("responde 400 si la contraseña tiene menos de 6 caracteres", async () => {
        const req = { body: { token: "abc", password: "123" } };
        const res = crearRes();

        await restablecerPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            mensaje: "La contraseña debe tener al menos 6 caracteres"
        });
    });

    test("responde 400 si el token no es válido o expiró", async () => {
        mockQuery.mockResolvedValue([[]]);
        const req = { body: { token: "abc", password: "Clave123" } };
        const res = crearRes();

        await restablecerPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            mensaje: "El enlace no es válido o ya expiró"
        });
    });
});
