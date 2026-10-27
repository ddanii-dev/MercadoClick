const API_URL = "http://localhost:3000/api";

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

/* ================= LISTAR PRODUCTOS ================= */
async function cargarProductos(pagina = 1) {

    if (!sesion) return;

    paginaActual = pagina;

    const cuerpoTabla = document.getElementById("cuerpo-tabla-productos");
    cuerpoTabla.innerHTML = `<tr><td colspan="7" class="admin-cargando">Cargando productos...</td></tr>`;

    const buscar = document.getElementById("filtro-buscar").value.trim();
    const categoria = document.getElementById("filtro-categoria").value;

    const parametros = new URLSearchParams({
        pagina,
        limite: 10
    });

    if (buscar) parametros.set("buscar", buscar);
    if (categoria !== "todos") parametros.set("categoria", categoria);

    try {

        const respuesta = await fetch(
            `${API_URL}/productos/admin/todos?${parametros.toString()}`,
            {
                headers: { "Authorization": `Bearer ${sesion.token}` }
            }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.mensaje || "No se pudieron cargar los productos");
        }

        if (datos.productos.length === 0) {
            cuerpoTabla.innerHTML = `<tr><td colspan="7" class="admin-vacio">No se encontraron productos.</td></tr>`;
            document.getElementById("paginacion-productos").innerHTML = "";
            return;
        }

        cuerpoTabla.innerHTML = "";

        datos.productos.forEach(producto => {

            const stockBajo = producto.stock <= producto.stock_minimo;

            cuerpoTabla.innerHTML += `
                <tr>
                    <td>${producto.id}</td>
                    <td>${escapeHTML(producto.nombre)}</td>
                    <td>${escapeHTML(producto.categoria)}</td>
                    <td>$${Number(producto.precio).toLocaleString("es-CO")}</td>
                    <td>
                        ${producto.stock}
                        ${stockBajo ? `<span class="admin-badge badge-stock-bajo">Stock bajo</span>` : ""}
                    </td>
                    <td>
                        <span class="admin-badge ${producto.activo ? "badge-activo" : "badge-inactivo"}">
                            ${producto.activo ? "Activo" : "Inactivo"}
                        </span>
                    </td>
                    <td>
                        <div class="admin-acciones">
                            <button class="btn-editar" onclick='abrirModalProducto(${escapeHTML(JSON.stringify(producto))})'>Editar</button>
                            <button class="btn-eliminar" onclick="eliminarProducto(${producto.id})">Eliminar</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        renderizarPaginacion(datos.paginacion);

    } catch (error) {
        console.error(error);
        cuerpoTabla.innerHTML = `<tr><td colspan="7" class="admin-vacio">Error al cargar los productos.</td></tr>`;
    }
}

function renderizarPaginacion(paginacion) {

    const contenedor = document.getElementById("paginacion-productos");

    if (paginacion.totalPaginas <= 1) {
        contenedor.innerHTML = "";
        return;
    }

    contenedor.innerHTML = `
        <button ${paginacion.pagina <= 1 ? "disabled" : ""} onclick="cargarProductos(${paginacion.pagina - 1})">← Anterior</button>
        <span>Página ${paginacion.pagina} de ${paginacion.totalPaginas}</span>
        <button ${paginacion.pagina >= paginacion.totalPaginas ? "disabled" : ""} onclick="cargarProductos(${paginacion.pagina + 1})">Siguiente →</button>
    `;
}

document.getElementById("filtro-buscar").addEventListener("input", () => cargarProductos(1));
document.getElementById("filtro-categoria").addEventListener("change", () => cargarProductos(1));

/* ================= MODAL CREAR / EDITAR ================= */
function abrirModalProducto(producto = null) {

    document.getElementById("form-producto").reset();

    if (producto) {
        document.getElementById("titulo-modal-producto").innerText = "Editar producto";
        document.getElementById("prod-id").value = producto.id;
        document.getElementById("prod-nombre").value = producto.nombre;
        document.getElementById("prod-categoria").value = producto.categoria;
        document.getElementById("prod-precio").value = producto.precio;
        document.getElementById("prod-stock").value = producto.stock;
        document.getElementById("prod-stock-minimo").value = producto.stock_minimo;
        document.getElementById("prod-imagen").value = producto.imagen || "";
        document.getElementById("prod-activo").checked = !!producto.activo;
    } else {
        document.getElementById("titulo-modal-producto").innerText = "Nuevo producto";
        document.getElementById("prod-id").value = "";
        document.getElementById("prod-activo").checked = true;
    }

    document.getElementById("overlay-producto").style.display = "block";
    document.getElementById("modal-producto").style.display = "block";
}

function cerrarModalProducto() {
    document.getElementById("overlay-producto").style.display = "none";
    document.getElementById("modal-producto").style.display = "none";
}

document.getElementById("btn-nuevo-producto").addEventListener("click", () => abrirModalProducto());

document.getElementById("form-producto").addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const id = document.getElementById("prod-id").value;

    const cuerpo = {
        nombre: document.getElementById("prod-nombre").value.trim(),
        categoria: document.getElementById("prod-categoria").value,
        precio: Number(document.getElementById("prod-precio").value),
        stock: Number(document.getElementById("prod-stock").value),
        stock_minimo: Number(document.getElementById("prod-stock-minimo").value),
        imagen: document.getElementById("prod-imagen").value.trim() || null,
        activo: document.getElementById("prod-activo").checked
    };

    try {

        const respuesta = await fetch(
            id ? `${API_URL}/productos/${id}` : `${API_URL}/productos`,
            {
                method: id ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${sesion.token}`
                },
                body: JSON.stringify(cuerpo)
            }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert(datos.mensaje);
            return;
        }

        cerrarModalProducto();
        cargarProductos(paginaActual);

    } catch (error) {
        console.error(error);
        alert("No se pudo conectar con el servidor");
    }
});

/* ================= ELIMINAR (BAJA LÓGICA) ================= */
async function eliminarProducto(id) {

    if (!confirm("¿Seguro que quieres desactivar este producto? Dejará de verse en la tienda.")) {
        return;
    }

    try {

        const respuesta = await fetch(`${API_URL}/productos/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${sesion.token}` }
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert(datos.mensaje);
            return;
        }

        cargarProductos(paginaActual);

    } catch (error) {
        console.error(error);
        alert("No se pudo conectar con el servidor");
    }
}

if (sesion) {
    cargarProductos();
}
