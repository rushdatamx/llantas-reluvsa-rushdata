import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OrderDetailClient } from '@/components/pedidos/order-detail-client'

async function getPedido(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

interface PedidoDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function PedidoDetailPage({ params }: PedidoDetailPageProps) {
  const { id } = await params
  const pedido = await getPedido(id)

  if (!pedido) {
    notFound()
  }

  return <OrderDetailClient pedido={pedido} />
}
