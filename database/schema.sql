-- ============================================================
-- BASE DE DATOS: MercadoClick
-- Proyecto de tienda virtual
-- ============================================================

-- ============================================================
-- 1. CREAR BASE DE DATOS
-- ============================================================

CREATE DATABASE IF NOT EXISTS mercadoclick;

USE mercadoclick;

-- ============================================================
-- 2. TABLA: USUARIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    cedula VARCHAR(20) NOT NULL UNIQUE,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('cliente', 'admin') DEFAULT 'cliente',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Datos para recuperación de contraseña
    reset_token VARCHAR(255) NULL,
    reset_token_expira DATETIME NULL
);

-- ============================================================
-- 3. ASIGNAR ROL DE ADMINISTRADOR
-- ============================================================

UPDATE usuarios
SET rol = 'admin'
WHERE correo = 'daniel.lopez.developer@gmail.com';

-- ============================================================
-- 4. TABLA: PRODUCTOS
-- RF09 / HU-01
-- ============================================================

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    imagen VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. TABLA: PEDIDOS
-- RF07 / RF08 / RF10 / HU-02
-- ============================================================

CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    usuario_id INT NOT NULL,

    nombre_cliente VARCHAR(100) NOT NULL,
    telefono VARCHAR(10) NOT NULL,
    direccion VARCHAR(150) NOT NULL,
    fecha_entrega DATE NOT NULL,

    forma_pago VARCHAR(30) NOT NULL,

    subtotal DECIMAL(10, 2) NOT NULL,
    iva DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,

    estado ENUM(
        'pendiente',
        'confirmado',
        'enviado',
        'entregado',
        'cancelado'
    ) DEFAULT 'pendiente',

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
);

-- ============================================================
-- 6. TABLA: DETALLE DE PEDIDOS
-- ============================================================

CREATE TABLE IF NOT EXISTS detalle_pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    pedido_id INT NOT NULL,
    producto_id INT,

    nombre_producto VARCHAR(150) NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    cantidad INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,

    FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE CASCADE,

    FOREIGN KEY (producto_id)
        REFERENCES productos(id)
);

-- ============================================================
-- 7. TABLA: RESEÑAS
-- RF12
-- ============================================================

CREATE TABLE IF NOT EXISTS resenas (
    id INT AUTO_INCREMENT PRIMARY KEY,

    producto_id INT NOT NULL,
    usuario_id INT NOT NULL,

    calificacion INT NOT NULL,
    comentario VARCHAR(500),

    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (producto_id)
        REFERENCES productos(id)
        ON DELETE CASCADE,

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id),

    -- La calificación debe estar entre 1 y 5
    CHECK (calificacion BETWEEN 1 AND 5),

    -- Un usuario solo puede dejar una reseña
    -- por cada producto
    UNIQUE (producto_id, usuario_id)
);

-- ============================================================
-- 8. PROCEDIMIENTO PARA CREAR ÍNDICES
-- RNF05 - Escalabilidad
-- ============================================================

DELIMITER //

CREATE PROCEDURE crear_indice_si_no_existe(
    IN nombreIndice VARCHAR(64),
    IN nombreTabla VARCHAR(64),
    IN definicionColumnas VARCHAR(64)
)
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
        AND table_name = nombreTabla
        AND index_name = nombreIndice
    ) THEN

        SET @sql = CONCAT(
            'CREATE INDEX ',
            nombreIndice,
            ' ON ',
            nombreTabla,
            '(',
            definicionColumnas,
            ')'
        );

        PREPARE stmt FROM @sql;

        EXECUTE stmt;

        DEALLOCATE PREPARE stmt;

    END IF;

END //

DELIMITER ;

-- ============================================================
-- 9. CREAR ÍNDICES
-- ============================================================

CALL crear_indice_si_no_existe(
    'idx_productos_categoria',
    'productos',
    'categoria'
);

CALL crear_indice_si_no_existe(
    'idx_pedidos_usuario',
    'pedidos',
    'usuario_id'
);

CALL crear_indice_si_no_existe(
    'idx_pedidos_estado',
    'pedidos',
    'estado'
);

CALL crear_indice_si_no_existe(
    'idx_detalle_pedido',
    'detalle_pedidos',
    'pedido_id'
);

CALL crear_indice_si_no_existe(
    'idx_resenas_producto',
    'resenas',
    'producto_id'
);

-- ============================================================
-- 10. ELIMINAR PROCEDIMIENTO
-- ============================================================

DROP PROCEDURE crear_indice_si_no_existe;

-- ============================================================
-- 11. PRODUCTOS INICIALES
-- ============================================================
-- Solo se insertan si la tabla productos está vacía.

INSERT INTO productos (
    nombre,
    categoria,
    precio,
    stock,
    stock_minimo,
    imagen
)

SELECT *
FROM (

    SELECT
        'Leche Entera 1L',
        'Lácteos',
        4200,
        50,
        10,
        'assets/images/img1.png'

    UNION ALL

    SELECT
        'Yogur de Frutas',
        'Lácteos',
        2800,
        40,
        10,
        'assets/images/img2.png'

    UNION ALL

    SELECT
        'Queso Tajado 250g',
        'Lácteos',
        9000,
        30,
        8,
        'assets/images/img3.png'

    UNION ALL

    SELECT
        'Papas Snack 40g',
        'Snacks',
        2000,
        60,
        15,
        'assets/images/img4.png'

    UNION ALL

    SELECT
        'Gaseosa 1.5L',
        'Bebidas',
        5200,
        45,
        10,
        'assets/images/img5.png'

    UNION ALL

    SELECT
        'Maní Salado 50g',
        'Snacks',
        2300,
        35,
        10,
        'assets/images/img6.png'

    UNION ALL

    SELECT
        'Galletas Vainilla',
        'Snacks',
        1800,
        55,
        12,
        'assets/images/img7.png'

) AS datos_iniciales

WHERE NOT EXISTS (
    SELECT 1
    FROM productos
);

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================