'use server'

import { createClient } from '@/lib/supabase/server'

// URL y key para llamar edge functions
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Tipos
export interface ItemInventarioPayment {
  snapshot_id: string
  descripcion: string
  medida: string
  precio_con_iva: number
  cantidad: number
}

export interface ItemExternoPayment {
  id: string
  descripcion: string
  precio: number
  cantidad: number
}

export interface CreatePaymentLinkRequest {
  // Datos del cliente
  nombre_cliente: string
  telefono_cliente: string
  email_cliente?: string
  direccion_envio?: string

  // Productos
  items: ItemInventarioPayment[]
  items_externos?: ItemExternoPayment[]

  // Totales
  subtotal: number
  costo_envio: number
  costo_alineacion?: number
  descuento?: number
  total: number

  // Metadata
  notas?: string
}

export interface CreatePaymentLinkResult {
  success: boolean
  payment_link_url?: string
  pedido_id?: string
  error?: string
}

export async function createPaymentLink(
  data: CreatePaymentLinkRequest
): Promise<CreatePaymentLinkResult> {
  try {
    // Validaciones básicas
    if (!data.nombre_cliente?.trim()) {
      return { success: false, error: 'El nombre del cliente es requerido' }
    }

    if (!data.telefono_cliente?.trim()) {
      return { success: false, error: 'El teléfono del cliente es requerido' }
    }

    if (data.items.length === 0 && (!data.items_externos || data.items_externos.length === 0)) {
      return { success: false, error: 'Se requiere al menos un producto' }
    }

    if (!data.total || data.total <= 0) {
      return { success: false, error: 'El total debe ser mayor a 0' }
    }

    // Obtener el usuario actual para metadata
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Preparar payload para edge function
    const payload = {
      ...data,
      creado_por: user?.email || 'dashboard',
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Supabase URL o key no configurados')
      return { success: false, error: 'Error de configuración del servidor' }
    }

    // Llamar a la edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Error de edge function:', result)
      return {
        success: false,
        error: result.error || 'Error al generar el link de pago'
      }
    }

    return {
      success: true,
      payment_link_url: result.payment_link_url,
      pedido_id: result.pedido_id,
    }

  } catch (error) {
    console.error('Error en createPaymentLink:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}
