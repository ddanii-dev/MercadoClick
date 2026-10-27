const API_URL = "http://localhost:3000/api";

let productos = [];

let carrito = [];

try {
  const datosGuardados = localStorage.getItem("carrito");
  carrito = datosGuardados ? JSON.parse(datosGuardados) : [];

  // Validación: si lo guardado no es un arreglo válido, se reinicia
  if (!Array.isArray(carrito)) {
    carrito = [];
  }
} catch (error) {
  console.error("Datos del carrito corruptos, se reinicia el carrito.", error);
  carrito = [];
}

const contenedor =
  document.getElementById("lista-productos");

/* ================= PRODUCTOS ================= */
async function cargarProductos() {

  try {
    contenedor.innerHTML = `<p class="sin-resultados">Cargando productos...</p>`;

    const respuesta = await fetch(`${API_URL}/productos?limite=100`);
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || "No se pudieron cargar los productos");
    }

    // Se normaliza "imagen" (nombre del campo en la BD) a "img"
    // para no tener que tocar el resto del código que ya usaba "img"
    productos = datos.productos.map(producto => ({
      ...producto,
      img: producto.imagen,
      precio: Number(producto.precio)
    }));

    actualizarVista();

  } catch (error) {
    console.error(error);

    contenedor.innerHTML = `
      <p class="sin-resultados">
        No se pudo conectar con el servidor. Intenta recargar la página.
      </p>
    `;
  }
}

function mostrarProductos(lista = productos) {

  contenedor.innerHTML = "";

  // Validación: si no hay resultados, se informa al usuario
  if (lista.length === 0) {
    contenedor.innerHTML = `
      <p class="sin-resultados">
        No se encontraron productos que coincidan con tu búsqueda.
      </p>
    `;
    return;
  }

  lista.forEach(producto => {

    const sinStock = producto.stock <= 0;

    // Se escapa el nombre para poder insertarlo dentro del atributo
    // onclick sin romperlo ni permitir inyección de HTML/JS.
    const onclickResenas = escapeHTML(
      `verResenas(${producto.id}, '${producto.nombre.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}')`
    );

    contenedor.innerHTML += `
      <div class="producto">

        <img src="${escapeHTML(producto.img)}" alt="${escapeHTML(producto.nombre)}">

        <h3>${escapeHTML(producto.nombre)}</h3>

        <p class="categoria">
        ${escapeHTML(producto.categoria)}
        </p>

        <p>
        $${producto.precio.toLocaleString("es-CO")}
        </p>

        <span class="ver-resenas" onclick="${onclickResenas}">
            <span class="estrella">★</span> Ver reseñas
        </span>

        <span
          class="btn ${sinStock ? "btn-deshabilitado" : ""}"
          onclick="${sinStock ? "" : `agregarCarrito(${producto.id})`}">
          ${sinStock ? "Sin stock" : "Agregar al carrito"}
        </span>

      </div>
    `;
  });
}

/* ================= CARRITO ================= */
function agregarCarrito(id) {

  const producto =
    productos.find(p => p.id === id);

  if (!producto) return;

  const existe =
    carrito.find(i => i.id === id);

  const cantidadEnCarrito = existe ? existe.cantidad : 0;

  // Validación: no permitir agregar más unidades de las que hay en stock
  if (cantidadEnCarrito + 1 > producto.stock) {
    alert(`Solo hay ${producto.stock} unidades disponibles de "${producto.nombre}".`);
    return;
  }

  if (existe) {
    existe.cantidad++;
  }
  else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1
    });
  }

  guardarCarrito();
  mostrarCarrito();
}

function eliminar(id) {

  carrito =
    carrito.filter(i => i.id !== id);

  guardarCarrito();
  mostrarCarrito();
}

function sumarCantidad(id) {

  const item =
    carrito.find(
      p => p.id === id
    );

  const producto = productos.find(p => p.id === id);

  // Validación: no superar la cantidad máxima permitida ni el stock disponible
  if (item.cantidad >= CANTIDAD_MAXIMA) {
    alert(`La cantidad máxima permitida por producto es ${CANTIDAD_MAXIMA}.`);
    return;
  }

  if (producto && item.cantidad + 1 > producto.stock) {
    alert(`Solo hay ${producto.stock} unidades disponibles de "${producto.nombre}".`);
    return;
  }

  item.cantidad++;

  guardarCarrito();

  mostrarCarrito();
}

function restarCantidad(id) {

  const item =
    carrito.find(
      p => p.id === id
    );

  item.cantidad--;

  if (item.cantidad <= 0) {

    eliminar(id);

    return;
  }

  guardarCarrito();

  mostrarCarrito();
}

const CANTIDAD_MAXIMA = 99;

function cambiarCantidad(id, valorIngresado) {

  const item = carrito.find(p => p.id === id);

  if (!item) return;

  // Validación: solo números enteros (sin letras, símbolos ni decimales sueltos)
  const valorLimpio = valorIngresado.trim();
  const esNumeroValido = /^\d+$/.test(valorLimpio);

  let cantidad = esNumeroValido ? parseInt(valorLimpio, 10) : NaN;

  if (!esNumeroValido || isNaN(cantidad)) {
    alert("Por favor ingresa solo números enteros positivos.");
    cantidad = item.cantidad; // se conserva el valor anterior
  } else if (cantidad <= 0) {
    eliminar(id);
    return;
  } else if (cantidad > CANTIDAD_MAXIMA) {
    alert(`La cantidad máxima permitida por producto es ${CANTIDAD_MAXIMA}.`);
    cantidad = CANTIDAD_MAXIMA;
  }

  item.cantidad = cantidad;

  guardarCarrito();
  mostrarCarrito();
}

function mostrarCarrito() {
  const div = document.getElementById("items-carrito");

  div.innerHTML = "";

  // Si el carrito está vacío, se informa al usuario
  if (carrito.length === 0) {
    div.innerHTML = `
      <p class="carrito-vacio">
        Tu carrito está vacío.
      </p>
    `;

    document.getElementById("subtotal").innerText = "";
    document.getElementById("iva").innerText = "";
    document.getElementById("total").innerText = "";
    actualizarContador();
    return;
  }

  let subtotal = 0;

  carrito.forEach(item => {
    subtotal += item.precio * item.cantidad;

    div.innerHTML += `
      <div class="item-carrito">

        <div>
          <strong>${escapeHTML(item.nombre)}</strong>

          <div class="controles-cantidad">
            <button onclick="restarCantidad(${item.id})">-</button>

            <input
              type="number"
              class="input-cantidad"
              min="1"
              max="99"
              step="1"
              value="${item.cantidad}"
              onchange="cambiarCantidad(${item.id}, this.value)"
            >

            <button onclick="sumarCantidad(${item.id})">+</button>
          </div>
        </div>

        <span class="precio-carrito">
          $${(item.precio * item.cantidad).toLocaleString()}
        </span>

        <span
          class="btn-eliminar"
          onclick="eliminar(${item.id})"
        >
          X
        </span>

      </div>
    `;
  });

  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  document.getElementById("subtotal").innerText =
      "Subtotal: $" + subtotal.toLocaleString("es-CO");

  document.getElementById("iva").innerText =
      "IVA (19%): $" + iva.toLocaleString("es-CO");

  document.getElementById("total").innerText =
      "Total: $" + total.toLocaleString("es-CO");

  actualizarContador();
}

function actualizarContador() {

  const totalItems =
    carrito.reduce(
      (acc, item) =>
        acc + item.cantidad,
      0
    );

  document.getElementById("contador")
    .innerText = totalItems;
}

function guardarCarrito() {

  localStorage.setItem(
    "carrito",
    JSON.stringify(carrito)
  );
}

function vaciarCarrito() {

  carrito = [];

  guardarCarrito();

  mostrarCarrito();
}

/* ================= ABRIR CARRITO ================= */
function toggleCarrito() {

  const carritoDiv =
    document.getElementById("carrito");

  const overlay =
    document.getElementById("overlay");

  if (carritoDiv.style.right === "0px") {

    carritoDiv.style.right = "-420px";

    overlay.style.display = "none";

  } else {

    carritoDiv.style.right = "0px";

    overlay.style.display = "block";
  }
}

function actualizarVista() {

  let lista = [...productos];

  // Validación: se recortan espacios al inicio/final para no afectar la búsqueda
  const texto =
    document.getElementById("buscar")
      .value
      .trim()
      .toLowerCase();

  const categoria =
    document.getElementById("categoria")
      .value;

  const orden =
    document.getElementById("ordenar")
      .value;

  // Buscar por nombre
  lista = lista.filter(producto =>
    producto.nombre
      .toLowerCase()
      .includes(texto)
  );

  // Filtrar por categoría
  if (categoria !== "todos") {

    lista = lista.filter(producto =>
      producto.categoria === categoria
    );
  }

  // Ordenar por precio
  if (orden === "asc") {

    lista.sort(
      (a, b) => a.precio - b.precio
    );

  } else if (orden === "desc") {

    lista.sort(
      (a, b) => b.precio - a.precio
    );
  }

  mostrarProductos(lista);
}

/* ================= BUSCADOR ================= */
document
  .getElementById("buscar")
  .addEventListener("input", actualizarVista);

document
  .getElementById("categoria")
  .addEventListener("change", actualizarVista);

document
  .getElementById("ordenar")
  .addEventListener("change", actualizarVista);

document
  .getElementById("vaciar-carrito")
  .addEventListener(
    "click",
    vaciarCarrito
  );

/* ================= RESEÑAS (RF12) ================= */

let productoActualResenas = null;
let nombreProductoActualResenas = "";


/* ================= VER RESEÑAS ================= */

async function verResenas(id, nombre) {

    productoActualResenas = id;
    nombreProductoActualResenas = nombre;


    /* ---------- ABRIR MODAL ---------- */

    document.getElementById("resenas-titulo").innerText =
        `Reseñas de ${nombre}`;

    document.getElementById("overlay-resenas").style.display =
        "block";

    document.getElementById("modal-resenas").style.display =
        "block";


    const contenido =
        document.getElementById("contenido-resenas");


    contenido.innerHTML = `
        <p class="sin-resultados">
            Cargando reseñas...
        </p>
    `;


    try {

        const respuesta = await fetch(
            `${API_URL}/resenas/${id}`
        );


        const datos = await respuesta.json();


        if (!respuesta.ok) {

            throw new Error(
                datos.mensaje ||
                "No se pudieron cargar las reseñas"
            );
        }


        let html = "";


        /* ---------- RESUMEN ---------- */

        if (datos.total > 0) {

            const promedio =
                Number(datos.promedio);

            const estrellasLlenas =
                Math.round(promedio);

            const estrellasVacias =
                5 - estrellasLlenas;


            html += `
                <div class="resenas-resumen">

                    <div class="resenas-promedio-numero">
                        ${promedio}/5
                    </div>

                    <div class="resenas-estrellas">
                        ${"★".repeat(estrellasLlenas)}
                        ${"☆".repeat(estrellasVacias)}
                    </div>

                    <div class="resenas-total">
                        ${datos.total}
                        ${datos.total === 1
                            ? "reseña"
                            : "reseñas"}
                    </div>

                </div>
            `;

        } else {

            html += `
                <p class="sin-resultados">
                    Este producto todavía no tiene reseñas.
                </p>
            `;
        }


        /* ---------- RESEÑAS ---------- */

        datos.resenas.forEach(resena => {

            const calificacion =
                Number(resena.calificacion);


            const estrellasVacias =
                5 - calificacion;


            const fecha =
                new Date(resena.fecha)
                    .toLocaleDateString("es-CO");


            html += `

                <div class="resena-item">

                    <div class="resena-arriba">

                        <strong>
                            ${escapeHTML(
                                resena.nombre_usuario
                            )}
                        </strong>

                        <span class="resena-fecha">
                            ${fecha}
                        </span>

                    </div>


                    <div class="resena-estrellas">

                        ${"★".repeat(calificacion)}
                        ${"☆".repeat(estrellasVacias)}

                    </div>


                    ${
                        resena.comentario
                            ? `
                                <p class="resena-comentario">
                                    ${escapeHTML(
                                        resena.comentario
                                    )}
                                </p>
                              `
                            : ""
                    }

                </div>

            `;
        });


        contenido.innerHTML = html;


    } catch (error) {

        console.error(
            "Error al cargar reseñas:",
            error
        );


        contenido.innerHTML = `

            <p class="sin-resultados">

                No se pudieron cargar las reseñas.

            </p>

        `;
    }
}



/* ================= CERRAR RESEÑAS ================= */

function cerrarResenas() {

    document.getElementById(
        "overlay-resenas"
    ).style.display = "none";


    document.getElementById(
        "modal-resenas"
    ).style.display = "none";


    productoActualResenas = null;
}

/* ================= PUBLICAR RESEÑA ================= */
document
    .getElementById("form-resena")
    .addEventListener(
        "submit",
        async function (evento) {
            evento.preventDefault();

            /* ---------- COMPROBAR PRODUCTO ---------- */
            if (!productoActualResenas) {
                alert(
                    "No se ha seleccionado ningún producto."
                );

                return;
            }

            /* ---------- COMPROBAR SESIÓN ---------- */
            const token =
                localStorage.getItem("token");

            if (!token) {
                alert(
                    "Debes iniciar sesión para dejar una reseña."
                );

                window.location.href =
                    "pages/login.html";

                return;
            }

            /* ---------- OBTENER DATOS ---------- */
            const calificacion =
                Number(
                    document.getElementById(
                        "resena-calificacion"
                    ).value
                );

            const comentario =
                document.getElementById(
                    "resena-comentario"
                ).value.trim();

            /* ---------- VALIDACIÓN FRONTEND ---------- */
            if (
                !Number.isInteger(calificacion) ||
                calificacion < 1 ||
                calificacion > 5
            ) {
                alert(
                    "Selecciona una calificación válida."
                );

                return;
            }

            if (comentario.length > 500) {
                alert(
                    "El comentario no puede superar los 500 caracteres."
                );

                return;
            }

            /* ---------- BOTÓN ---------- */
            const boton =
                document.getElementById(
                    "btn-publicar-resena"
                );

            boton.disabled = true;

            boton.innerText =
                "Publicando...";

            try {
                const respuesta = await fetch(
                    `${API_URL}/resenas/${productoActualResenas}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            calificacion,
                            comentario
                        })
                    }
                );

                const datos =
                    await respuesta.json();

                /* ---------- TOKEN EXPIRADO ---------- */
                if (respuesta.status === 401) {
                    localStorage.removeItem("token");

                    alert(
                        "Tu sesión ha expirado. Inicia sesión nuevamente."
                    );

                    window.location.href =
                        "pages/login.html";
                    return;
                }

                /* ---------- ERROR ---------- */
                if (!respuesta.ok) {
                    alert(
                        datos.mensaje ||
                        "No se pudo publicar la reseña."
                    );

                    return;
                }

                /* ---------- ÉXITO ---------- */
                alert(
                    datos.mensaje ||
                    "Reseña publicada correctamente."
                );

                /* Limpiar formulario */
                document
                    .getElementById("form-resena")
                    .reset();

                /* Volver a cargar reseñas */
                await verResenas(
                    productoActualResenas,
                    nombreProductoActualResenas
                );

            } catch (error) {
                console.error(
                    "Error al publicar reseña:",
                    error
                );

                alert(
                    "No se pudo conectar con el servidor."
                );

            } finally {
                boton.disabled = false;

                boton.innerText =
                    "Publicar reseña";
            }
        }
    );

/* ================= CHECKOUT ================= */

function abrirCheckout() {

  // Validación: no se puede pagar con el carrito vacío
  if (carrito.length === 0) {
    alert("Tu carrito está vacío. Agrega productos antes de finalizar la compra.");
    return;
  }

  // RF07/RF08: el pedido queda asociado a un usuario, por eso se
  // requiere sesión activa antes de dejar pagar.
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Debes iniciar sesión para finalizar tu compra.");
    window.location.href = "pages/login.html";
    return;
  }

  document.getElementById("overlay-checkout").style.display = "block";
  document.getElementById("modal-checkout").style.display = "block";
}

function cerrarCheckout() {
  document.getElementById("overlay-checkout").style.display = "none";
  document.getElementById("modal-checkout").style.display = "none";
}

function marcarError(idCampo, idError, mensaje) {
  document.getElementById(idCampo).classList.add("campo-invalido");
  document.getElementById(idError).innerText = mensaje;
}

function limpiarError(idCampo, idError) {
  document.getElementById(idCampo).classList.remove("campo-invalido");
  document.getElementById(idError).innerText = "";
}

function validarFormularioCheckout() {

  let esValido = true;

  // --- Nombre: obligatorio, solo letras y espacios, mínimo 3 caracteres ---
  const nombre = document.getElementById("chk-nombre").value.trim();
  const regexNombre = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{3,60}$/;

  if (nombre === "") {
    marcarError("chk-nombre", "error-nombre", "El nombre es obligatorio.");
    esValido = false;
  } else if (!regexNombre.test(nombre)) {
    marcarError("chk-nombre", "error-nombre", "Solo letras y espacios (mínimo 3 caracteres, sin números ni símbolos).");
    esValido = false;
  } else {
    limpiarError("chk-nombre", "error-nombre");
  }

  // --- Teléfono: obligatorio, exactamente 10 dígitos numéricos ---
  const telefono = document.getElementById("chk-telefono").value.trim();
  const regexTelefono = /^[0-9]{10}$/;

  if (telefono === "") {
    marcarError("chk-telefono", "error-telefono", "El teléfono es obligatorio.");
    esValido = false;
  } else if (!regexTelefono.test(telefono)) {
    marcarError("chk-telefono", "error-telefono", "Debe tener exactamente 10 dígitos numéricos.");
    esValido = false;
  } else {
    limpiarError("chk-telefono", "error-telefono");
  }

  // --- Dirección: obligatoria, mínimo 5 caracteres ---
  const direccion = document.getElementById("chk-direccion").value.trim();

  if (direccion === "") {
    marcarError("chk-direccion", "error-direccion", "La dirección es obligatoria.");
    esValido = false;
  } else if (direccion.length < 5) {
    marcarError("chk-direccion", "error-direccion", "Debe tener al menos 5 caracteres.");
    esValido = false;
  } else {
    limpiarError("chk-direccion", "error-direccion");
  }

  // --- Fecha: obligatoria, no puede ser anterior a hoy ---
  const fechaValor = document.getElementById("chk-fecha").value;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (fechaValor === "") {
    marcarError("chk-fecha", "error-fecha", "Selecciona una fecha de entrega.");
    esValido = false;
  } else {
    const fechaSeleccionada = new Date(fechaValor + "T00:00:00");

    if (fechaSeleccionada < hoy) {
      marcarError("chk-fecha", "error-fecha", "La fecha no puede ser anterior a hoy.");
      esValido = false;
    } else {
      limpiarError("chk-fecha", "error-fecha");
    }
  }

  // --- Forma de pago: obligatoria ---
  const pago = document.getElementById("chk-pago").value;

  if (pago === "") {
    marcarError("chk-pago", "error-pago", "Selecciona una forma de pago.");
    esValido = false;
  } else {
    limpiarError("chk-pago", "error-pago");
  }

  return esValido;
}

function generarComprobante(numeroOrden, datosCliente, pedido) {

  const div = document.getElementById("contenido-comprobante");

  let filas = "";

  carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;

    filas += `
      <div class="linea-comprobante">
        <span>${escapeHTML(item.nombre)} x${item.cantidad}</span>
        <span>$${subtotal.toLocaleString("es-CO")}</span>
      </div>
    `;
  });

  const fechaHoraCompra = new Date().toLocaleString("es-CO");

  div.innerHTML = `
    <div class="linea-comprobante">
      <span><strong>N° de orden</strong></span>
      <span>#${numeroOrden}</span>
    </div>
    <div class="linea-comprobante">
      <span>Fecha de compra</span>
      <span>${fechaHoraCompra}</span>
    </div>
    <div class="linea-comprobante">
      <span>Cliente</span>
      <span>${escapeHTML(datosCliente.nombre)}</span>
    </div>
    <div class="linea-comprobante">
      <span>Entrega</span>
      <span>${escapeHTML(datosCliente.direccion)}</span>
    </div>
    <div class="linea-comprobante">
      <span>Fecha deseada</span>
      <span>${escapeHTML(datosCliente.fecha)}</span>
    </div>
    <div class="linea-comprobante">
      <span>Forma de pago</span>
      <span>${escapeHTML(datosCliente.pago)}</span>
    </div>
    <br>
    ${filas}
    <div class="linea-comprobante">
        <span>Subtotal</span>
        <span>$${Number(pedido.subtotal).toLocaleString("es-CO")}</span>
    </div>
    <div class="linea-comprobante">
        <span>IVA (19%)</span>
        <span>$${Number(pedido.iva).toLocaleString("es-CO")}</span>
    </div>
    <div class="total-comprobante">
        Total: $${Number(pedido.total).toLocaleString("es-CO")}
    </div>
  `;

  document.getElementById("overlay-comprobante").style.display = "block";
  document.getElementById("modal-comprobante").style.display = "block";
}

function cerrarComprobante() {
  document.getElementById("overlay-comprobante").style.display = "none";
  document.getElementById("modal-comprobante").style.display = "none";
}

document
  .getElementById("finalizar-compra")
  .addEventListener("click", abrirCheckout);

document
  .getElementById("form-checkout")
  .addEventListener("submit", async function (evento) {

    evento.preventDefault();

    if (!validarFormularioCheckout()) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Debes iniciar sesión para finalizar tu compra.");
      window.location.href = "pages/login.html";
      return;
    }

    const datosCliente = {
      nombre: document.getElementById("chk-nombre").value.trim(),
      telefono: document.getElementById("chk-telefono").value.trim(),
      direccion: document.getElementById("chk-direccion").value.trim(),
      fecha: document.getElementById("chk-fecha").value,
      pago: document.getElementById("chk-pago").value
    };

    const botonConfirmar = document.getElementById("btn-confirmar-compra");
    botonConfirmar.disabled = true;
    botonConfirmar.innerText = "Procesando...";

    try {

      // El total y la validación de stock se recalculan en el
      // backend, el frontend solo manda qué productos y cuántos
      const respuesta = await fetch(`${API_URL}/pedidos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...datosCliente,
          items: carrito.map(item => ({ id: item.id, cantidad: item.cantidad }))
        })
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        alert(datos.mensaje);
        return;
      }

      generarComprobante(datos.pedido.id, datosCliente, datos.pedido);
      cerrarCheckout();

      // Se vacía el carrito, se limpia el formulario y se refresca
      // el catálogo (el stock cambió con la compra)
      vaciarCarrito();
      document.getElementById("form-checkout").reset();
      cargarProductos();

    } catch (error) {
      console.error(error);
      alert("No se pudo conectar con el servidor");
    } finally {
      botonConfirmar.disabled = false;
      botonConfirmar.innerText = "Confirmar compra";
    }
  });

/* ================= INICIO ================= */

cargarProductos();
mostrarCarrito();
actualizarContador();
