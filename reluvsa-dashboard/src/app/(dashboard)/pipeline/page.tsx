import { createClient } from '@/lib/supabase/server'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import { IconLayoutKanban, IconRefresh } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

async function getSesiones() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sesiones_chat')
    .select('*')
    .order('ultimo_mensaje_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error fetching sesiones:', error)
    return []
  }

  return data || []
}

export default async function PipelinePage() {
  const sesiones = await getSesiones()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <IconLayoutKanban className="h-8 w-8" />
            Pipeline
          </h1>
          <p className="text-muted-foreground">
            Gestiona el embudo de ventas con vista Kanban - Arrastra las tarjetas entre columnas
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/pipeline">
            <IconRefresh className="h-4 w-4 mr-2" />
            Actualizar
          </Link>
        </Button>
      </div>

      <PipelineBoard initialSesiones={sesiones} />
    </div>
  )
}
