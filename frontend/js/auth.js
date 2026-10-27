// Mostrar y ocultar contraseña
const showPassword = document.getElementById("showPassword");

if (showPassword) {

    showPassword.addEventListener("click", () => {

        const password = document.getElementById("password");

        if (password.type === "password") {

            password.type = "text";

        } else {
            password.type = "password";
        }
    });
}

// Mostrar y ocultar contraseña de confirmación
const showConfirmPassword = document.getElementById("showConfirmPassword");

if (showConfirmPassword) {

    showConfirmPassword.addEventListener("click", () => {

        const confirmPassword = document.getElementById("confirmPassword");

        if (confirmPassword.type === "password") {

            confirmPassword.type = "text";

        } else {
            confirmPassword.type = "password";
        }
    });
}

// Registro
const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const nombre = document.getElementById("nombre").value;
        const cedula = document.getElementById("cedula").value;
        const correo = document.getElementById("correo").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {

            alert("Las contraseñas no coinciden");
            return;

        }

        try {
            const respuesta = await fetch(
                "http://localhost:3000/api/auth/registro",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        nombre,
                        cedula,
                        correo,
                        password
                    })
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {

                alert(datos.mensaje);
                return;

            }

            alert("Cuenta creada correctamente");

            window.location.href = "login.html";

        } catch (error) {
            console.error(error);

            alert("No se pudo conectar con el servidor");
        }
    });
}

// Inicio de sesión
const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const correo = document.getElementById("correo").value;
        const password = document.getElementById("password").value;
        const remember = document.getElementById("remember").checked;

        try {
            const respuesta = await fetch(
                "http://localhost:3000/api/auth/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        correo,
                        password,
                        remember
                    })
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {

                alert(datos.mensaje);
                return;

            }

            localStorage.setItem("token", datos.token);

            localStorage.setItem(
                "usuario",
                JSON.stringify(datos.usuario)
            );

            alert("Inicio de sesión correcto");

            window.location.href = "../index.html";

        } catch (error) {
            console.error(error);

            alert("No se pudo conectar con el servidor");
        }
    });
}

// Recuperar contraseña
const recuperarForm = document.getElementById("recuperarForm");

if (recuperarForm) {

    recuperarForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const correo = document.getElementById("correo").value;

        try {

            const respuesta = await fetch(
                "http://localhost:3000/api/auth/recuperar",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        correo
                    })
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {

                alert(datos.mensaje);
                return;

            }

            alert(datos.mensaje);

        } catch (error) {

            console.error(error);

            alert("No se pudo conectar con el servidor");

        }
    });
}

// Página de perfil
const perfilContainer = document.getElementById("perfil-container");

if (perfilContainer) {

    const usuarioGuardado = localStorage.getItem("usuario");
    const token = localStorage.getItem("token");

    if (!usuarioGuardado || !token) {

        window.location.href = "login.html";

    } else {

        const usuario = JSON.parse(usuarioGuardado);

        document.getElementById("perfil-nombre").innerText = usuario.nombre;

        document.getElementById("perfil-cedula").innerText = usuario.cedula;

        document.getElementById("perfil-correo").innerText = usuario.correo;

        document.getElementById("perfil-rol").innerText =
            usuario.rol === "admin" ? "Administrador" : "Cliente";

        const iniciales = usuario.nombre
            .trim()
            .split(/\s+/)
            .map(palabra => palabra.charAt(0))
            .slice(0, 2)
            .join("")
            .toUpperCase();

        document.getElementById("perfil-avatar").innerText = iniciales;

        const btnCerrarSesionPerfil =
            document.getElementById("perfil-cerrar-sesion");

        btnCerrarSesionPerfil.addEventListener("click", () => {

            localStorage.removeItem("token");
            localStorage.removeItem("usuario");

            window.location.href = "../index.html";

        });
    }
}

// Mostrar usuario conectado
const usuarioMenu = document.getElementById("usuario-menu");

if (usuarioMenu) {

    const usuarioGuardado = localStorage.getItem("usuario");

    if (usuarioGuardado) {
        const usuario = JSON.parse(usuarioGuardado);

        const enlaceAdmin = usuario.rol === "admin"
            ? `<a href="pages/admin/productos.html">Admin</a>`
            : "";

        usuarioMenu.innerHTML = `

            <span>Hola, ${escapeHTML(usuario.nombre)}</span>

            <a href="pages/pedidos.html">Mis pedidos</a>

            ${enlaceAdmin}

            <a href="pages/perfil.html">Mi perfil</a>

            <button id="cerrarSesion">Cerrar sesión</button>

        `;

        const cerrarSesion =
            document.getElementById("cerrarSesion");

        cerrarSesion.addEventListener("click", () => {

            localStorage.removeItem("token");
            localStorage.removeItem("usuario");

            window.location.reload();

        });

    }

}

// Restablecer contraseña
const restablecerForm = document.getElementById("restablecerForm");

if (restablecerForm) {

    restablecerForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const password = document.getElementById("password").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {

            alert("Las contraseñas no coinciden");
            return;

        }

        const parametros =
            new URLSearchParams(window.location.search);

        const token = parametros.get("token");

        if (!token) {

            alert("El enlace de recuperación no es válido");
            return;

        }

        try {
            const respuesta = await fetch(
                "http://localhost:3000/api/auth/restablecer",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        token,
                        password
                    })
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {

                alert(datos.mensaje);
                return;

            }

            alert(datos.mensaje);

            window.location.href = "login.html";

        } catch (error) {
            console.error(error);
            alert("No se pudo conectar con el servidor");
        }
    });
}
