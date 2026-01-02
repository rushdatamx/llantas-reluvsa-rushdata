import { createClient } from '@/lib/supabase/server'
import { OrdersTable } from '@/components/pedidos/orders-table'
import { ManualSaleDialog } from '@/components/pedidos/manual-sale-dialog'
import { IconShoppingCart } from '@tabler/icons-react'

async function getPedidos() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pedidos')
    .select('*')
    .order('created_at', { ascending: false })

  return data || []
}

async function getProductos() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('inventario')
    .select('*')
    .gt('existencia', 0)
    .order('descripcion')

  return data || []
}

export default async function PedidosPage() {
  const [pedidos, productos] = await Promise.all([
    getPedidos(),
    getProductos(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <IconShoppingCart className="h-8 w-8" />
            Pedidos
          </h1>
          <p className="text-muted-foreground">
            Gestiona los pedidos del chatbot
          </p>
        </div>
        <ManualSaleDialog productos={productos} />
      </div>

      <OrdersTable pedidos={pedidos} />
    </div>
  )
}
