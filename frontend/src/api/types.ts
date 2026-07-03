export interface Empresa {
  id: number;
  razon_social: string;
  ruc: string;
  direccion_fiscal: string;
  representante_nombre: string;
  representante_dni: string;
  ciudad: string;
}

export type Rol = 'super_admin' | 'rrhh' | 'gerente' | 'supervisor' | 'trabajador';

export interface UsuarioCuenta {
  id: number;
  empresa_id: number;
  empleado_id: number | null;
  nombre_completo: string;
  usuario: string;
  email: string | null;
  rol: Rol;
  must_change_password: boolean;
  activo: boolean;
  created_at: string;
}

export interface Empleado {
  id: number;
  empresa_id: number;
  nombre_completo: string;
  dni: string;
  direccion: string;
  cargo_default: string;
  email: string | null;
  telefono: string | null;
  foto_path: string | null;
  estado: 'activo' | 'cesado';
}

export interface Plantilla {
  id: number;
  nombre: string;
  descripcion: string | null;
  variables_json: string[];
  version: number;
  activa: boolean;
  created_at: string;
}

export type EstadoContrato =
  | 'borrador'
  | 'generado'
  | 'enviado'
  | 'abierto'
  | 'en_revision'
  | 'firmado'
  | 'rechazado'
  | 'anulado'
  | 'vencido'
  | 'archivado';

export interface Contrato {
  id: number;
  plantilla_id: number;
  empleado_id: number;
  empresa_id: number;
  cargo: string;
  duracion: string;
  fecha_inicio: string;
  fecha_fin: string;
  sueldo_numero: string;
  sueldo_letras: string;
  estado: EstadoContrato;
  docx_path: string | null;
  pdf_path: string | null;
  pdf_hash_sha256: string | null;
  created_at: string;
  empleado_nombre?: string;
  plantilla_nombre?: string;
}
