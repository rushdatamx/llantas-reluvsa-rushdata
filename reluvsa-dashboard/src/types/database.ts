// Tipos para la base de datos de RELUVSA

export interface SesionChat {
  id: string
  telefono: string
  lead_id: string | null
  estado: 'inicio' | 'buscando_medida' | 'mostrando_opciones' | 'seleccionando_producto' | 'pidiendo_cantidad' | 'confirmando_cotizacion' | 'pidiendo_nombre' | 'pidiendo_email' | 'pidiendo_direccion' | 'generando_link' | 'esperando_pago' | 'completado'
  medida_seleccionada: string | null
  productos_encontrados: ProductoInventario[] | null
  producto_seleccionado: ProductoInventario | null
  cantidad: number | null
  nombre_cliente: string | null
  email_cliente: string | null
  telefono_cliente: string | null
  direccion_envio: string | null
  subtotal: number | null
  costo_envio: number | null
  total: number | null
  carrito: CartItem[] | null
  pedido_id: string | null
  ultimo_mensaje_at: string | null
  expira_at: string | null
  mensajes_count: number | null
  created_at: string | null
  updated_at: string | null
  // Campos nuevos para el dashboard
  pipeline_stage?: PipelineStage
  ultimo_mensaje?: string
  mensajes_no_leidos?: number
  atendido_por?: 'bot' | 'vendedor'
  motivo_handoff?: string
  // Campos de asignación de vendedor
  vendedor_asignado_id?: string | null
  vendedor_asignado_at?: string | null
}

export type PipelineStage =
  | 'explorando'
  | 'cotizado'
  | 'link_enviado'
  | 'pagado'
  | 'entregado'
  | 'perdido'

export interface ProductoInventario {
  snapshot_id: string
  descripcion: string | null
  tag: string | null
  precio: number | null
  precio_con_iva: number | null
  existencia: number | null
  categoria: string | null
  medida: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Pedido {
  id: string
  lead_id: string | null
  telefono: string
  nombre_cliente: string
  email_cliente: string
  direccion_envio: string
  items: PedidoItem[]
  subtotal: number
  costo_envio: number
  total: number
  stripe_payment_link_id: string | null
  stripe_payment_link_url: string | null
  stripe_payment_intent_id: string | null
  stripe_session_id: string | null
  estado: 'pendiente_pago' | 'pagado' | 'enviado' | 'entregado' | 'cancelado'
  fecha_pago: string | null
  fecha_envio: string | null
  fecha_entrega: string | null
  created_at: string | null
  updated_at: string | null
  telefono_cliente: string | null
  // Campos de tracking y notas
  numero_guia?: string | null
  carrier?: string | null
  notas?: string | null
  // Método de pago
  metodo_pago?: 'stripe' | 'efectivo_cod' | null
}

export interface PedidoItem {
  medida: string
  marca: string
  descripcion: string
  cantidad: number
  precio_unitario: number
}

export interface CartItem {
  producto: ProductoInventario
  cantidad: number
}

export interface Mensaje {
  id: string
  sesion_id: string
  telefono: string
  tipo: 'cliente' | 'bot' | 'vendedor'
  contenido: string
  metadata: Record<string, unknown>
  leido: boolean
  created_at: string
}

// Tipo para las métricas del dashboard
export interface DashboardMetrics {
  sesionesActivas: number
  pedidosPendientes: number
  pedidosPagados: number
  ventasMes: number
}

// Tipo para perfiles de usuario
export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  created_at: string | null
  updated_at: string | null
}
