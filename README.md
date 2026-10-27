# MercadoClick

Tienda virtual desarrollada con **Node.js, Express y MySQL**. Incluye catálogo de productos, registro e inicio de sesión, carrito con checkout, historial de pedidos, reseñas, recuperación de contraseña por correo y un panel de administración.

## Tecnologías

- **Backend:** Node.js, Express 5, MySQL (mysql2)
- **Seguridad:** JWT, bcrypt, límite de peticiones (express-rate-limit)
- **Correo:** Nodemailer
- **Pruebas:** Jest
- **Frontend:** HTML, CSS y JavaScript

## Estructura del proyecto

```
MercadoClick/
├── backend/
│   ├── config/         Conexión a la base de datos
│   ├── controllers/    Lógica de cada módulo
│   ├── middleware/     Autenticación, rol admin y límite de peticiones
│   ├── routes/         Definición de endpoints
│   ├── services/       Envío de correos
│   ├── test/           Pruebas unitarias
│   ├── utils/          Funciones auxiliares (paginación)
│   ├── app.js          Configuración de la aplicación Express
│   └── server.js       Arranque del servidor
├── database/
│   └── schema.sql      Esquema de la base de datos
└── frontend/           Interfaz web (HTML, CSS, JS)
```

## Requisitos

- Node.js 18.11 o superior
- MySQL 8 o superior
- Una cuenta de Gmail con clave de aplicación (solo para la recuperación de contraseña)

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/ddanii-dev/MercadoClick.git
cd MercadoClick
```

2. Crea la base de datos importando el esquema:

```bash
mysql -u TU_USUARIO -p < database/schema.sql
```

3. Instala las dependencias del backend:

```bash
cd backend
npm install
```

4. Crea tu archivo de variables de entorno a partir del ejemplo:

```bash
copy .env.example .env
```

En Linux o Mac usa `cp .env.example .env`. Luego abre `.env` y completa tus datos:

```
PORT=3000
APP_URL=http://localhost:3000

DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=mercadoclick
DB_PORT=3306

JWT_SECRET=un_secreto_largo_y_dificil_de_adivinar

EMAIL_USER=tu_correo
EMAIL_PASSWORD=tu_clave_de_aplicacion
```

> El archivo `.env` contiene datos privados y no se sube al repositorio.

## Ejecución

```bash
npm start
```

Para desarrollo, con reinicio automático al guardar cambios:

```bash
npm run dev
```

La aplicación queda disponible en http://localhost:3000.

## Pruebas

```bash
npm test
```

Para ver el reporte de cobertura:

```bash
npm run test:coverage
```

## Rol de administrador

Los usuarios se registran como `cliente`. Para convertir una cuenta en administrador, cambia su rol directamente en la base de datos:

```sql
UPDATE usuarios SET rol = 'admin' WHERE correo = 'tu_correo@ejemplo.com';
```

## Endpoints de la API

Las rutas protegidas requieren la cabecera `Authorization: Bearer <token>`, que se obtiene al iniciar sesión.

### Autenticación

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| POST | `/api/auth/registro` | Registrar un usuario | Público |
| POST | `/api/auth/login` | Iniciar sesión | Público |
| POST | `/api/auth/recuperar` | Solicitar recuperación de contraseña | Público |
| POST | `/api/auth/restablecer` | Definir una nueva contraseña con el token | Público |

### Productos

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/productos` | Listar productos activos | Público |
| GET | `/api/productos/admin/todos` | Listar todos, incluidos inactivos | Admin |
| GET | `/api/productos/:id` | Ver un producto | Público |
| POST | `/api/productos` | Crear un producto | Admin |
| PUT | `/api/productos/:id` | Actualizar un producto | Admin |
| DELETE | `/api/productos/:id` | Desactivar un producto | Admin |

Parámetros opcionales del listado: `pagina`, `limite`, `categoria` y `buscar`.

### Pedidos

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| POST | `/api/pedidos` | Crear un pedido | Cliente |
| GET | `/api/pedidos/mios` | Ver mis pedidos | Cliente |
| GET | `/api/pedidos` | Listar todos los pedidos (filtro `estado`) | Admin |
| PUT | `/api/pedidos/:id/estado` | Cambiar el estado de un pedido | Admin |

### Reseñas

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/resenas/:productoId` | Ver reseñas de un producto | Público |
| POST | `/api/resenas/:productoId` | Publicar una reseña | Cliente que compró el producto |

### Otros

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/perfil` | Datos del usuario autenticado | Cliente |

## Autores

- Daniel López