import { createClient } from '@/lib/supabase/server'
import { InventoryTable } from '@/components/inventario/inventory-table'
import { IconPackage } from '@tabler/icons-react'

async function getInventario() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('inventario')
    .select('*')
    .order('medida', { ascending: true })

  return data || []
}

export default async function InventarioPage() {
  const inventario = await getInventario()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <IconPackage className="h-8 w-8" />
          Inventario
        </h1>
        <p className="text-muted-foreground">
          Gestiona el catálogo de llantas
        </p>
      </div>

      <InventoryTable productos={inventario} />
    </div>
  )
}
