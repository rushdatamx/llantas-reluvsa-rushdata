import { createClient } from '@/lib/supabase/server'
import { ConversationList } from '@/components/conversations/conversation-list'
import { ChatArea } from '@/components/conversations/chat-area'
import { notFound } from 'next/navigation'

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

async function getSesion(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sesiones_chat')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

async function getMensajes(sesionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('mensajes')
    .select('*')
    .eq('sesion_id', sesionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching mensajes:', error)
    return []
  }

  return data || []
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConversationDetailPage({ params }: Props) {
  const { id } = await params
  const [sesiones, sesion, mensajes] = await Promise.all([
    getSesiones(),
    getSesion(id),
    getMensajes(id),
  ])

  if (!sesion) {
    notFound()
  }

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      <div className="w-[350px] flex-shrink-0">
        <ConversationList initialSesiones={sesiones} selectedId={id} />
      </div>
      <div className="flex-1">
        <ChatArea sesion={sesion} initialMensajes={mensajes} />
      </div>
    </div>
  )
}
