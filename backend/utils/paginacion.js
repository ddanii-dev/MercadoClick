// Calcula página, límite y offset a partir de la query string,
// con valores por defecto y un límite máximo para proteger la Base de Datos
const calcularPaginacion = (query, limitePorDefecto = 20, limiteMaximo = 100) => {
    const pagina = Math.max(parseInt(query.pagina) || 1, 1);
    const limite = Math.min(
        Math.max(parseInt(query.limite) || limitePorDefecto, 1),
        limiteMaximo
    );
    const offset = (pagina - 1) * limite;

    return { pagina, limite, offset };
};

// Arma el objeto de paginación que se devuelve en la respuesta.
const armarPaginacion = (pagina, limite, total) => ({
    pagina,
    limite,
    total,
    totalPaginas: Math.ceil(total / limite)
});

module.exports = { calcularPaginacion, armarPaginacion };
