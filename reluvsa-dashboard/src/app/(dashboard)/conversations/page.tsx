import { createClient } from '@/lib/supabase/server'
import { ConversationList } from '@/components/conversations/conversation-list'
import { IconMessageCircle } from '@tabler/icons-react'

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

export default async function ConversationsPage() {
  const sesiones = await getSesiones()

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      <div className="w-[350px] flex-shrink-0">
        <ConversationList initialSesiones={sesiones} />
      </div>
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <IconMessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Selecciona una conversación</h3>
          <p className="text-sm">
            Elige una conversación de la lista para ver los mensajes
          </p>
        </div>
      </div>
    </div>
  )
}
