'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type EstadoPedido = 'pendiente_pago' | 'pagado' | 'enviado' | 'entregado' | 'cancelado'

// URL y key para llamar edge functions
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
type PipelineStage = 'explorando' | 'cotizado' | 'link_enviado' | 'pagado' | 'entregado' | 'perdido'

// Mapeo de estado de pedido a pipeline_stage
const ESTADO_TO_PIPELINE: Record<EstadoPedido, PipelineStage> = {
  pendiente_pago: 'link_enviado',
  pagado: 'pagado',
  enviado: 'pagado', // No hay stage 'enviado', se mantiene en 'pagado'
  entregado: 'entregado',
  cancelado: 'perdido',
}

interface UpdateEstadoResult {
  success: boolean
  error?: string
}

// Función auxiliar para sincronizar pipeline_stage y atendido_por
async function syncPipelineStage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pedidoId: string,
  nuevoEstado: EstadoPedido
): Promise<void> {
  // Obtener el pedido para conseguir el telefono
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('telefono, lead_id')
    .eq('id', pedidoId)
    .single()

  if (!pedido) return

  const nuevoPipelineStage = ESTADO_TO_PIPELINE[nuevoEstado]

  // Solo actualizamos pipeline_stage, NO tocamos atendido_por
  // El vendedor puede seguir atendiendo aunque el pedido cambie de estado
  // Para devolver al bot, el vendedor debe hacerlo explícitamente desde el chat
  const updateData: Record<string, unknown> = {
    pipeline_stage: nuevoPipelineStage,
    updated_at: new Date().toISOString(),
  }

  // Intentar actualizar por lead_id primero, si no por telefono
  if (pedido.lead_id) {
    await supabase
      .from('sesiones_chat')
      .update(updateData)
      .eq('id', pedido.lead_id)
  } else if (pedido.telefono) {
    await supabase
      .from('sesiones_chat')
      .update(updateData)
      .eq('telefono', pedido.telefono)
  }
}

// Función para enviar notificación WhatsApp al cliente
async function enviarNotificacionEstado(
  pedidoId: string,
  nuevoEstado: EstadoPedido,
  trackingInfo?: { numeroGuia: string; carrier: string }
): Promise<{ success: boolean; notificacionEnviada: boolean; error?: string }> {
  // Solo enviar para estados que requieren notificación
  if (!['pagado', 'enviado', 'entregado'].includes(nuevoEstado)) {
    return { success: true, notificacionEnviada: false }
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Supabase URL o key no configurados')
      return { success: true, notificacionEnviada: false, error: 'Config missing' }
    }

    const payload: Record<string, string> = {
      pedido_id: pedidoId,
      nuevo_estado: nuevoEstado,
    }

    if (trackingInfo) {
      payload.numero_guia = trackingInfo.numeroGuia
      payload.carrier = trackingInfo.carrier
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/order-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (data.success) {
      console.log(`Notificación ${nuevoEstado} enviada para pedido ${pedidoId}`)
      return { success: true, notificacionEnviada: !data.skipped }
    } else {
      console.error(`Error enviando notificación: ${data.error}`)
      return { success: true, notificacionEnviada: false, error: data.error }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error llamando order-notification:', errorMessage)
    // No fallar - el estado ya se actualizó
    return { success: true, notificacionEnviada: false, error: errorMessage }
  }
}

export async function updateEstadoPedido(
  pedidoId: string,
  nuevoEstado: EstadoPedido
): Promise<UpdateEstadoResult> {
  const supabase = await createClient()

  // Prepare update data based on the new status
  const updateData: Record<string, unknown> = {
    estado: nuevoEstado,
    updated_at: new Date().toISOString(),
  }

  // Set relevant dates based on status
  switch (nuevoEstado) {
    case 'pagado':
      updateData.fecha_pago = new Date().toISOString()
      break
    case 'enviado':
      updateData.fecha_envio = new Date().toISOString()
      break
    case 'entregado':
      updateData.fecha_entrega = new Date().toISOString()
      break
  }

  const { error } = await supabase
    .from('pedidos')
    .update(updateData)
    .eq('id', pedidoId)

  if (error) {
    console.error('Error updating pedido:', error)
    return { success: false, error: error.message }
  }

  // Sincronizar pipeline_stage de la sesión
  await syncPipelineStage(supabase, pedidoId, nuevoEstado)

  // Enviar notificación WhatsApp al cliente (no bloquea si falla)
  if (['pagado', 'enviado', 'entregado'].includes(nuevoEstado)) {
    await enviarNotificacionEstado(pedidoId, nuevoEstado)
  }

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${pedidoId}`)
  revalidatePath('/pipeline')
  revalidatePath('/conversations')

  return { success: true }
}

interface UpdateTrackingResult {
  success: boolean
  error?: string
}

export async function updateTrackingInfo(
  pedidoId: string,
  numeroGuia: string,
  carrier: string
): Promise<UpdateTrackingResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pedidos')
    .update({
      numero_guia: numeroGuia,
      carrier: carrier,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedidoId)

  if (error) {
    console.error('Error updating tracking:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${pedidoId}`)

  return { success: true }
}

interface UpdateNotasResult {
  success: boolean
  error?: string
}

export async function updateNotasPedido(
  pedidoId: string,
  notas: string
): Promise<UpdateNotasResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pedidos')
    .update({
      notas: notas,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedidoId)

  if (error) {
    console.error('Error updating notas:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${pedidoId}`)

  return { success: true }
}

export async function marcarComoEnviado(
  pedidoId: string,
  numeroGuia: string,
  carrier: string
): Promise<UpdateEstadoResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pedidos')
    .update({
      estado: 'enviado',
      fecha_envio: new Date().toISOString(),
      numero_guia: numeroGuia,
      carrier: carrier,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedidoId)

  if (error) {
    console.error('Error marking as enviado:', error)
    return { success: false, error: error.message }
  }

  // Sincronizar pipeline_stage de la sesión
  await syncPipelineStage(supabase, pedidoId, 'enviado')

  // Enviar notificación WhatsApp al cliente con info de tracking
  await enviarNotificacionEstado(pedidoId, 'enviado', {
    numeroGuia,
    carrier,
  })

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${pedidoId}`)
  revalidatePath('/pipeline')
  revalidatePath('/conversations')

  return { success: true }
}
