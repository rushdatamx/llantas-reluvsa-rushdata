import { createClient } from '@/lib/supabase/server'
import { CotizadorForm } from '@/components/cotizador/cotizador-form'
import { IconCalculator } from '@tabler/icons-react'

async function getProductos() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventario')
    .select('*')
    .gt('existencia', 0)
    .order('medida', { ascending: true })

  if (error) {
    console.error('Error fetching productos:', error)
    return []
  }

  return data || []
}

export default async function CotizadorPage() {
  const productos = await getProductos()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <IconCalculator className="h-8 w-8" />
          Cotizador
        </h1>
        <p className="text-muted-foreground">
          Crea cotizaciones manuales y envíalas por WhatsApp
        </p>
      </div>

      <CotizadorForm productos={productos} />
    </div>
  )
}
