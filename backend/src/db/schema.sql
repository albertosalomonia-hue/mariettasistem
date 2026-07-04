-- Núcleo del sistema: empresas, empleados, plantillas y contratos.
-- Módulos de auth/firma/auditoría completos se agregan en una fase posterior;
-- aquí solo lo necesario para el motor de generación de contratos.

CREATE TABLE IF NOT EXISTS empresas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  razon_social VARCHAR(255) NOT NULL,
  ruc VARCHAR(20) NOT NULL,
  direccion_fiscal VARCHAR(255) NOT NULL,
  representante_nombre VARCHAR(255) NOT NULL,
  representante_dni VARCHAR(20) NOT NULL,
  ciudad VARCHAR(100) NOT NULL DEFAULT 'Iquitos',
  activa TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS empleados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  nombre_completo VARCHAR(255) NOT NULL,
  dni VARCHAR(20) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  cargo_default VARCHAR(150) NOT NULL,
  email VARCHAR(255) NULL,
  telefono VARCHAR(30) NULL,
  foto_path VARCHAR(500) NULL,
  estado ENUM('activo', 'cesado') NOT NULL DEFAULT 'activo',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_empleados_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  UNIQUE KEY uq_empleados_dni (dni)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  empleado_id INT NULL,
  nombre_completo VARCHAR(255) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  email VARCHAR(255) NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('super_admin', 'rrhh', 'gerente', 'supervisor', 'trabajador') NOT NULL DEFAULT 'rrhh',
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  CONSTRAINT fk_usuarios_empleado FOREIGN KEY (empleado_id) REFERENCES empleados(id),
  UNIQUE KEY uq_usuarios_usuario (usuario),
  UNIQUE KEY uq_usuarios_email (email),
  UNIQUE KEY uq_usuarios_empleado (empleado_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS plantillas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion VARCHAR(500) NULL,
  archivo_path VARCHAR(500) NOT NULL,
  variables_json JSON NOT NULL,
  version INT NOT NULL DEFAULT 1,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS contratos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plantilla_id INT NOT NULL,
  empleado_id INT NOT NULL,
  empresa_id INT NOT NULL,
  cargo VARCHAR(150) NOT NULL,
  duracion VARCHAR(100) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  sueldo_numero DECIMAL(10,2) NOT NULL,
  sueldo_letras VARCHAR(255) NOT NULL,
  estado ENUM(
    'borrador', 'generado', 'enviado', 'abierto', 'en_revision',
    'firmado', 'rechazado', 'anulado', 'vencido', 'archivado'
  ) NOT NULL DEFAULT 'generado',
  docx_path VARCHAR(500) NULL,
  pdf_path VARCHAR(500) NULL,
  pdf_hash_sha256 CHAR(64) NULL,
  firma_path VARCHAR(500) NULL,
  firmado_en DATETIME NULL,
  firma_ip VARCHAR(45) NULL,
  firma_user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_contratos_plantilla FOREIGN KEY (plantilla_id) REFERENCES plantillas(id),
  CONSTRAINT fk_contratos_empleado FOREIGN KEY (empleado_id) REFERENCES empleados(id),
  CONSTRAINT fk_contratos_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO empresas (razon_social, ruc, direccion_fiscal, representante_nombre, representante_dni, ciudad)
SELECT 'TRANSPORTES MARIETTA E.I.R.L.', '20609440652', 'JR. RAMÓN CASTILLA NRO. 748 Sec. 5', 'MANUEL JESÚS AGUILAR LAVANDA', '43664762', 'Iquitos'
WHERE NOT EXISTS (SELECT 1 FROM empresas WHERE ruc = '20609440652');
