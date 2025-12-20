'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SesionChat, Mensaje, Profile } from '@/types/database'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  IconSend,
  IconPhone,
  IconUser,
  IconRobot,
  IconUserCircle,
  IconAlertCircle,
  IconArrowBack,
  IconHandGrab,
} from '@tabler/icons-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PIPELINE_STAGES } from '@/lib/constants'

interface ChatAreaProps {
  sesion: SesionChat
  initialMensajes: Mensaje[]
}

export function ChatArea({ sesion: initialSesion, initialMensajes }: ChatAreaProps) {
  const [sesion, setSesion] = useState(initialSesion)
  const [mensajes, setMensajes] = useState<Mensaje[]>(initialMensajes)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isReturningToBot, setIsReturningToBot] = useState(false)
  const [isTakingOver, setIsTakingOver] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const isHandoff = sesion.atendido_por === 'vendedor'
  const motivoHandoff = sesion.motivo_handoff
  const isAssignedToMe = sesion.vendedor_asignado_id === currentUserId
  const isAssigned = !!sesion.vendedor_asignado_id

  // Fetch current user and profiles
  useEffect(() => {
    const fetchUserAndProfiles = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')

      if (profilesData) {
        const profilesMap: Record<string, Profile> = {}
        profilesData.forEach((p: Profile) => {
          profilesMap[p.id] = p
        })
        setProfiles(profilesMap)
      }
    }

    fetchUserAndProfiles()
  }, [supabase])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensajes])

  // Realtime subscription for messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${sesion.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `sesion_id=eq.${sesion.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Mensaje
          setMensajes((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sesion.id, supabase])

  // Realtime subscription for session updates
  useEffect(() => {
    const channel = supabase
      .channel(`sesion-${sesion.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sesiones_chat',
          filter: `id=eq.${sesion.id}`,
        },
        (payload) => {
          setSesion(payload.new as SesionChat)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sesion.id, supabase])

  // Mark messages as read
  useEffect(() => {
    const markAsRead = async () => {
      await supabase.rpc('reset_unread_messages', { sesion_id_param: sesion.id })
    }
    markAsRead()
  }, [sesion.id, supabase])

  const handleTakeOver = async () => {
    if (!currentUserId) return

    setIsTakingOver(true)
    try {
      const { error } = await supabase
        .from('sesiones_chat')
        .update({
          vendedor_asignado_id: currentUserId,
          vendedor_asignado_at: new Date().toISOString(),
          atendido_por: 'vendedor',
        })
        .eq('id', sesion.id)

      if (error) throw error
      toast.success('Conversación asignada a ti')
    } catch (error) {
      console.error('Error taking over:', error)
      toast.error('Error al tomar la conversación')
    } finally {
      setIsTakingOver(false)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    const messageToSend = newMessage.trim()
    setNewMessage('')

    try {
      // Call the vendor-reply-v2 Edge Function with user_id for auto-assignment
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/vendor-reply-v2`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            sesion_id: sesion.id,
            mensaje: messageToSend,
            user_id: currentUserId, // Pass user_id for auto-assignment
          }),
        }
      )

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al enviar mensaje')
      }

      toast.success('Mensaje enviado por WhatsApp')

    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error al enviar mensaje')
      setNewMessage(messageToSend)
    } finally {
      setIsSending(false)
    }
  }

  const handleReturnToBot = async () => {
    setIsReturningToBot(true)
    try {
      await supabase.rpc('return_to_bot', { sesion_id_param: sesion.id })
      toast.success('Conversación devuelta al bot')
      router.refresh()
    } catch (error) {
      console.error('Error returning to bot:', error)
      toast.error('Error al devolver al bot')
    } finally {
      setIsReturningToBot(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const pipelineStage = PIPELINE_STAGES.find(
    (s) => s.id === (sesion.pipeline_stage || 'explorando')
  )

  const getVendorName = (vendorId: string | null | undefined): string | null => {
    if (!vendorId) return null
    const profile = profiles[vendorId]
    if (!profile) return null
    return profile.full_name || profile.email?.split('@')[0] || null
  }

  const assignedVendorName = getVendorName(sesion.vendedor_asignado_id)

  const groupedMessages = mensajes.reduce<{ date: string; messages: Mensaje[] }[]>(
    (acc, msg) => {
      const date = format(new Date(msg.created_at), 'dd MMMM yyyy', {
        locale: es,
      })
      const lastGroup = acc[acc.length - 1]
      if (lastGroup?.date === date) {
        lastGroup.messages.push(msg)
      } else {
        acc.push({ date, messages: [msg] })
      }
      return acc
    },
    []
  )

  const getMotivoLabel = (motivo: string | undefined) => {
    if (!motivo) return 'Transferido a vendedor'
    const labels: Record<string, string> = {
      explicito: 'El cliente solicitó hablar con un vendedor',
      loop: 'El bot no pudo entender al cliente después de varios intentos',
      sin_stock: 'No hay stock de la medida que busca el cliente',
      preguntas_sin_compra: 'El cliente hizo varias preguntas sin avanzar en la compra',
      tiempo_estado: 'El cliente estuvo mucho tiempo sin avanzar',
      pedido_cod: 'El cliente eligió pago en efectivo contra entrega - coordinar envío',
    }
    return labels[motivo] || 'Transferido a vendedor'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Handoff Banner */}
      {isHandoff && (
        <div className="p-3 bg-orange-100 border-b border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconAlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  Conversación en modo vendedor
                </p>
                <p className="text-xs text-orange-600">
                  {getMotivoLabel(motivoHandoff)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Take over button */}
              {!isAssignedToMe && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 bg-white"
                  onClick={handleTakeOver}
                  disabled={isTakingOver}
                >
                  <IconHandGrab className="h-4 w-4" />
                  {isTakingOver ? 'Tomando...' : 'Tomar'}
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 bg-white">
                    <IconArrowBack className="h-4 w-4" />
                    Devolver al bot
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Devolver conversación al bot</AlertDialogTitle>
                    <AlertDialogDescription>
                      El bot volverá a responder automáticamente a este cliente.
                      Usa esta opción cuando el cliente ya no necesite atención
                      personalizada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReturnToBot}
                      disabled={isReturningToBot}
                    >
                      {isReturningToBot ? 'Devolviendo...' : 'Confirmar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              {isHandoff ? (
                <IconUser className="h-5 w-5 text-orange-600" />
              ) : (
                <IconRobot className="h-5 w-5 text-blue-600" />
              )}
              {sesion.nombre_cliente || 'Cliente sin nombre'}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconPhone className="h-4 w-4" />
              <span>{sesion.telefono}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Assigned vendor badge */}
            {isHandoff && (
              assignedVendorName ? (
                <Badge
                  variant="outline"
                  className={cn(
                    isAssignedToMe
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  )}
                >
                  <IconUserCircle className="h-3 w-3 mr-1" />
                  {isAssignedToMe ? 'Asignado a ti' : assignedVendorName}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                  Sin asignar
                </Badge>
              )
            )}
            {pipelineStage && (
              <Badge className={cn(pipelineStage.color, 'text-white')}>
                {pipelineStage.label}
              </Badge>
            )}
          </div>
        </div>
        {sesion.direccion_envio && (
          <p className="text-sm text-muted-foreground mt-2">
            Dirección: {sesion.direccion_envio}
          </p>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center mb-4">
                <Badge variant="secondary" className="text-xs">
                  {group.date}
                </Badge>
              </div>
              <div className="space-y-3">
                {group.messages.map((mensaje) => {
                  const isBot = mensaje.tipo === 'bot'
                  const isVendedor = mensaje.tipo === 'vendedor'
                  const isCliente = mensaje.tipo === 'cliente'

                  return (
                    <div
                      key={mensaje.id}
                      className={cn(
                        'flex gap-2 max-w-[80%]',
                        isCliente ? 'ml-0' : 'ml-auto flex-row-reverse'
                      )}
                    >
                      <div
                        className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                          isBot && 'bg-blue-100 text-blue-600',
                          isVendedor && 'bg-green-100 text-green-600',
                          isCliente && 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {isBot && <IconRobot className="h-4 w-4" />}
                        {isVendedor && <IconUserCircle className="h-4 w-4" />}
                        {isCliente && <IconUser className="h-4 w-4" />}
                      </div>
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-2',
                          isBot && 'bg-blue-50 text-blue-900',
                          isVendedor && 'bg-green-50 text-green-900',
                          isCliente && 'bg-gray-100 text-gray-900'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {mensaje.contenido}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(mensaje.created_at), 'HH:mm')}
                          {isVendedor && ' · Vendedor'}
                          {isBot && ' · Bot'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {mensajes.length === 0 && (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              No hay mensajes aún
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            placeholder={isHandoff ? "Escribe un mensaje como vendedor..." : "Escribe un mensaje..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className={cn("self-end", isHandoff && "bg-green-600 hover:bg-green-700")}
          >
            <IconSend className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {isHandoff ? (
            <>El mensaje se enviará por WhatsApp al cliente</>
          ) : (
            <>Presiona Enter para enviar, Shift+Enter para nueva línea</>
          )}
        </p>
      </div>
    </div>
  )
}
