import { createClient } from '@/lib/supabase/server'
import { OrdersTable } from '@/components/pedidos/orders-table'
import { IconShoppingCart } from '@tabler/icons-react'

async function getPedidos() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pedidos')
    .select('*')
    .order('created_at', { ascending: false })

  return data || []
}

export default async function PedidosPage() {
  const pedidos = await getPedidos()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <IconShoppingCart className="h-8 w-8" />
          Pedidos
        </h1>
        <p className="text-muted-foreground">
          Gestiona los pedidos del chatbot
        </p>
      </div>

      <OrdersTable pedidos={pedidos} />
    </div>
  )
}
