const { calcularPaginacion, armarPaginacion } = require("../utils/paginacion");

describe("calcularPaginacion", () => {
    test("usa valores por defecto si no hay query", () => {
        expect(calcularPaginacion({}, 20, 100)).toEqual({
            pagina: 1,
            limite: 20,
            offset: 0
        });
    });

    test("calcula el offset según la página", () => {
        expect(calcularPaginacion({ pagina: "3", limite: "10" })).toEqual({
            pagina: 3,
            limite: 10,
            offset: 20
        });
    });

    test("no permite superar el límite máximo", () => {
        const { limite } = calcularPaginacion({ limite: "5000" }, 20, 100);
        expect(limite).toBe(100);
    });

    test("corrige páginas inválidas o negativas", () => {
        const { pagina } = calcularPaginacion({ pagina: "-4" });
        expect(pagina).toBe(1);
    });
});

describe("armarPaginacion", () => {
    test("calcula el total de páginas redondeando hacia arriba", () => {
        expect(armarPaginacion(1, 10, 25)).toEqual({
            pagina: 1,
            limite: 10,
            total: 25,
            totalPaginas: 3
        });
    });
});
