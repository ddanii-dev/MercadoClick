const API_URL = "http://localhost:3000/api";

const NOMBRES_ESTADO = {
    pendiente: "Pendiente",
    confirmado: "Confirmado",
    enviado: "Enviado",
    entregado: "Entregado",
    cancelado: "Cancelado"
};

let paginaActual = 1;

/* ================= PROTECCIÓN DE ACCESO ================= */
function obtenerSesion() {
    const token = localStorage.getItem("token");
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!token || !usuarioGuardado) {
        window.location.href = "../login.html";
        return null;
    }

    const usuario = JSON.parse(usuarioGuardado);

    if (usuario.rol !== "admin") {
        alert("No tienes permisos para acceder al panel de administración.");
        window.location.href = "../../index.html";
        return null;
    }

    return { token, usuario };
}

const sesion = obtenerSesion();

/* ================= LISTAR PEDIDOS ================= */
async function cargarPedidos(pagina = 1) {

    if (!sesion) return;

    paginaActual = pagina;

    const cuerpoTabla = document.getElementById("cuerpo-tabla-pedidos");
    cuerpoTabla.innerHTML = `<tr><td colspan="6" class="admin-cargando">Cargando pedidos...</td></tr>`;

    const estado = document.getElementById("filtro-estado").value;

    const parametros = new URLSearchParams({ pagina, limite: 10 });

    if (estado) parametros.set("estado", estado);

    try {

        const respuesta = await fetch(`${API_URL}/pedidos?${parametros.toString()}`, {
            headers: { "Authorization": `Bearer ${sesion.token}` }
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.mensaje || "No se pudieron cargar los pedidos");
        }

        if (datos.pedidos.length === 0) {
            cuerpoTabla.innerHTML = `<tr><td colspan="6" class="admin-vacio">No se encontraron pedidos.</td></tr>`;
            document.getElementById("paginacion-pedidos").innerHTML = "";
            return;
        }

        cuerpoTabla.innerHTML = "";

        datos.pedidos.forEach(pedido => {

            const fecha = new Date(pedido.fecha_creacion).toLocaleString("es-CO");

            const resumenProductos = pedido.items
                .map(item => `${escapeHTML(item.nombre_producto)} x${item.cantidad}`)
                .join(", ");

            const opciones = Object.keys(NOMBRES_ESTADO)
                .map(estadoOpcion => `
                    <option value="${estadoOpcion}" ${pedido.estado === estadoOpcion ? "selected" : ""}>
                        ${NOMBRES_ESTADO[estadoOpcion]}
                    </option>
                `)
                .join("");

            cuerpoTabla.innerHTML += `
                <tr>
                    <td>#${pedido.id}</td>
                    <td>
                        ${escapeHTML(pedido.nombre_usuario || pedido.nombre_cliente)}
                        <br>
                        <small>${escapeHTML(pedido.correo || "")}</small>
                    </td>
                    <td>${fecha}</td>
                    <td title="${resumenProductos}">
                        ${resumenProductos.length > 40 ? resumenProductos.slice(0, 40) + "..." : resumenProductos}
                    </td>
                    <td>$${Number(pedido.total).toLocaleString("es-CO")}</td>
                    <td>
                        <select class="admin-estado-select" onchange="cambiarEstado(${pedido.id}, this.value)">
                            ${opciones}
                        </select>
                    </td>
                </tr>
            `;
        });

        renderizarPaginacion(datos.paginacion);

    } catch (error) {
        console.error(error);
        cuerpoTabla.innerHTML = `<tr><td colspan="6" class="admin-vacio">Error al cargar los pedidos.</td></tr>`;
    }
}

function renderizarPaginacion(paginacion) {

    const contenedor = document.getElementById("paginacion-pedidos");

    if (paginacion.totalPaginas <= 1) {
        contenedor.innerHTML = "";
        return;
    }

    contenedor.innerHTML = `
        <button ${paginacion.pagina <= 1 ? "disabled" : ""} onclick="cargarPedidos(${paginacion.pagina - 1})">← Anterior</button>
        <span>Página ${paginacion.pagina} de ${paginacion.totalPaginas}</span>
        <button ${paginacion.pagina >= paginacion.totalPaginas ? "disabled" : ""} onclick="cargarPedidos(${paginacion.pagina + 1})">Siguiente →</button>
    `;
}

document.getElementById("filtro-estado").addEventListener("change", () => cargarPedidos(1));

/* ================= CAMBIAR ESTADO ================= */
async function cambiarEstado(id, nuevoEstado) {

    try {

        const respuesta = await fetch(`${API_URL}/pedidos/${id}/estado`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sesion.token}`
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert(datos.mensaje);
            cargarPedidos(paginaActual);
            return;
        }

    } catch (error) {
        console.error(error);
        alert("No se pudo conectar con el servidor");
        cargarPedidos(paginaActual);
    }
}

if (sesion) {
    cargarPedidos();
}
