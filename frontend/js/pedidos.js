const API_URL = "http://localhost:3000/api";

const NOMBRES_ESTADO = {
    pendiente: "Pendiente",
    confirmado: "Confirmado",
    enviado: "Enviado",
    entregado: "Entregado",
    cancelado: "Cancelado"
};

async function cargarPedidos() {

    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const contenedor = document.getElementById("lista-pedidos");

    try {

        const respuesta = await fetch(`${API_URL}/pedidos/mios`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.mensaje || "No se pudieron cargar los pedidos");
        }

        if (datos.pedidos.length === 0) {
            contenedor.innerHTML = `
                <p class="pedidos-vacio">
                    Todavía no has realizado ningún pedido.
                </p>
            `;
            return;
        }

        contenedor.innerHTML = "";

        datos.pedidos.forEach(pedido => {

            const fecha = new Date(pedido.fecha_creacion).toLocaleString("es-CO");

            let filasItems = "";

            pedido.items.forEach(item => {
                filasItems += `
                    <div class="pedido-item">
                        <span>${item.nombre_producto} x${item.cantidad}</span>
                        <span>$${Number(item.subtotal).toLocaleString("es-CO")}</span>
                    </div>
                `;
            });

            contenedor.innerHTML += `
                <div class="pedido-card">

                    <div class="pedido-card-header">
                        <div>
                            <strong>Pedido #${pedido.id}</strong>
                            <span class="pedido-fecha">${fecha}</span>
                        </div>

                        <span class="pedido-estado estado-${pedido.estado}">
                            ${NOMBRES_ESTADO[pedido.estado] || pedido.estado}
                        </span>
                    </div>

                    <div class="pedido-items">
                        ${filasItems}
                    </div>

                    <div class="pedido-card-footer">
                        <span>Entrega: ${pedido.direccion}</span>
                        <strong>Total: $${Number(pedido.total).toLocaleString("es-CO")}</strong>
                    </div>

                </div>
            `;
        });

    } catch (error) {
        console.error(error);

        contenedor.innerHTML = `
            <p class="pedidos-vacio">
                No se pudieron cargar tus pedidos. Intenta recargar la página.
            </p>
        `;
    }
}

cargarPedidos();
