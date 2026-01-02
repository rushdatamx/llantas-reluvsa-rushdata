'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { MetodoPago, PedidoItem, SesionChat } from '@/types/database'

// Tipos para la venta manual
export interface VentaManualItem {
  snapshot_id: string
  descripcion: string
  medida: string
  precio_con_iva: number
  cantidad: number
}

export interface VentaManualData {
  // Cliente
  telefono: string
  nombre_cliente: string
  // Productos
  items: VentaManualItem[]
  // Pago
  metodo_pago: 'efectivo_sucursal' | 'tarjeta_sucursal'
  // Opcional
  notas?: string
  // Vinculación con lead (opcional)
  lead_id?: string | null
}

export interface VentaManualResult {
  success: boolean
  pedido_id?: string
  error?: string
}

export interface BuscarLeadResult {
  success: boolean
  sesiones?: SesionChat[]
  error?: string
}

/**
 * Busca sesiones de chat por número de teléfono
 * para vincular una venta manual a un lead existente
 */
export async function buscarLeadPorTelefono(telefono: string): Promise<BuscarLeadResult> {
  const supabase = await createClient()

  // Normalizar teléfono - remover caracteres no numéricos excepto +
  const telefonoNormalizado = telefono.replace(/[^\d+]/g, '')

  // Buscar sesiones que contengan este teléfono (parcial)
  const { data, error } = await supabase
    .from('sesiones_chat')
    .select('*')
    .or(`telefono.ilike.%${telefonoNormalizado}%,telefono_cliente.ilike.%${telefonoNormalizado}%`)
    .order('ultimo_mensaje_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error buscando lead:', error)
    return { success: false, error: error.message }
  }

  return { success: true, sesiones: data || [] }
}

/**
 * Crea una venta manual registrada en sucursal
 * El pedido se crea directamente como "entregado" ya que el cliente pagó y se llevó el producto
 */
export async function crearVentaManual(data: VentaManualData): Promise<VentaManualResult> {
  const supabase = await createClient()

  // Validaciones básicas
  if (!data.telefono || data.telefono.trim() === '') {
    return { success: false, error: 'El teléfono es requerido' }
  }

  if (!data.nombre_cliente || data.nombre_cliente.trim() === '') {
    return { success: false, error: 'El nombre del cliente es requerido' }
  }

  if (!data.items || data.items.length === 0) {
    return { success: false, error: 'Debe agregar al menos un producto' }
  }

  // Calcular totales
  const subtotal = data.items.reduce((acc, item) => {
    return acc + (item.precio_con_iva * item.cantidad)
  }, 0)

  // Sin envío para ventas en sucursal (recoger en tienda)
  const costo_envio = 0
  const total = subtotal + costo_envio

  // Convertir items al formato de PedidoItem
  const pedidoItems: PedidoItem[] = data.items.map(item => ({
    medida: item.medida || 'N/A',
    marca: item.descripcion?.includes('NEREUS') ? 'NEREUS' :
           item.descripcion?.includes('TORNEL') ? 'TORNEL' : 'Otro',
    descripcion: item.descripcion || '',
    cantidad: item.cantidad,
    precio_unitario: item.precio_con_iva,
  }))

  const now = new Date().toISOString()

  // Crear el pedido directamente como "entregado"
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      // Info del cliente
      telefono: data.telefono,
      nombre_cliente: data.nombre_cliente,
      email_cliente: '', // No requerido para venta en sucursal
      direccion_envio: 'Recoger en sucursal',
      telefono_cliente: data.telefono,
      // Productos y totales
      items: pedidoItems,
      subtotal,
      costo_envio,
      total,
      // Estado y fechas
      estado: 'entregado', // Directo a entregado
      fecha_pago: now,
      fecha_entrega: now, // Se llevó el producto
      // Método y origen
      metodo_pago: data.metodo_pago as MetodoPago,
      origen: 'sucursal',
      // Vinculación con lead
      lead_id: data.lead_id || null,
      // Notas
      notas: data.notas || null,
      // Sin Stripe
      stripe_payment_link_id: null,
      stripe_payment_link_url: null,
      stripe_payment_intent_id: null,
      stripe_session_id: null,
    })
    .select('id')
    .single()

  if (pedidoError) {
    console.error('Error creando venta manual:', pedidoError)
    return { success: false, error: pedidoError.message }
  }

  // Si hay lead_id, actualizar el pipeline_stage de la sesión
  if (data.lead_id) {
    const { error: updateError } = await supabase
      .from('sesiones_chat')
      .update({
        pipeline_stage: 'entregado',
        pedido_id: pedido.id,
        updated_at: now,
      })
      .eq('id', data.lead_id)

    if (updateError) {
      console.error('Error actualizando sesión:', updateError)
      // No falla la operación, el pedido ya se creó
    }
  }

  // Revalidar rutas
  revalidatePath('/pedidos')
  revalidatePath('/pipeline')
  revalidatePath('/conversations')
  revalidatePath('/')

  return { success: true, pedido_id: pedido.id }
}
