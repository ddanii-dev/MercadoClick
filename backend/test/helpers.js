// Respuesta falsa de Express para poder verificar status() y json()
const crearRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

module.exports = { crearRes };
