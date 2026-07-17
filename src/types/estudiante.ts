export interface Estudiante {
  id: string;
  dni: string;
  cui: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  facultad?: string;
  escuela?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BusquedaEstudianteResponse {
  total: number;
  items: Estudiante[];
}
