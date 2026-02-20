'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SesionChat, Profile } from '@/types/database'
import { useAppStore } from '@/stores/app-store'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IconSearch, IconPhone, IconAlertCircle, IconRobot, IconUser, IconUserCircle } from '@tabler/icons-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ConversationListProps {
  initialSesiones: SesionChat[]
  selectedId?: string
}

export function ConversationList({ initialSesiones, selectedId }: ConversationListProps) {
  const [sesiones, setSesiones] = useState<SesionChat[]>(initialSesiones)
  const [search, setSearch] = useState('')
  const filter = useAppStore((s) => s.conversationFilter)
  const setFilter = useAppStore((s) => s.setConversationFilter)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const router = useRouter()
  const supabase = createClient()

  // Fetch current user and profiles
  useEffect(() => {
    const fetchUserAndProfiles = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

      // Get all profiles for vendor names
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('conversations-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sesiones_chat',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSesiones((prev) => [payload.new as SesionChat, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setSesiones((prev) =>
              prev.map((s) =>
                s.id === payload.new.id ? (payload.new as SesionChat) : s
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setSesiones((prev) => prev.filter((s) => s.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const filteredSesiones = sesiones.filter((s) => {
    // Filtro de búsqueda
    const searchLower = search.toLowerCase()
    const matchesSearch =
      s.telefono?.toLowerCase().includes(searchLower) ||
      s.nombre_cliente?.toLowerCase().includes(searchLower) ||
      s.ultimo_mensaje?.toLowerCase().includes(searchLower)

    if (!matchesSearch) return false

    // Filtro por tipo
    if (filter === 'mias') {
      return s.vendedor_asignado_id === currentUserId
    }
    if (filter === 'handoff') {
      return s.atendido_por === 'vendedor'
    }
    if (filter === 'bot') {
      return s.atendido_por !== 'vendedor'
    }

    return true
  })

  const sortedSesiones = [...filteredSesiones].sort((a, b) => {
    // Primero las que requieren atención (handoff)
    const aHandoff = a.atendido_por === 'vendedor' ? 1 : 0
    const bHandoff = b.atendido_por === 'vendedor' ? 1 : 0
    if (aHandoff !== bHandoff) return bHandoff - aHandoff

    // Luego por mensajes no leídos
    const aUnread = a.mensajes_no_leidos || 0
    const bUnread = b.mensajes_no_leidos || 0
    if (aUnread !== bUnread) return bUnread - aUnread

    // Finalmente por última actividad
    const aTime = new Date(a.ultimo_mensaje_at || a.created_at || 0).getTime()
    const bTime = new Date(b.ultimo_mensaje_at || b.created_at || 0).getTime()
    return bTime - aTime
  })

  const handoffCount = sesiones.filter((s) => s.atendido_por === 'vendedor').length
  const myCount = sesiones.filter((s) => s.vendedor_asignado_id === currentUserId).length

  const getVendorName = (vendorId: string | null | undefined): string | null => {
    if (!vendorId) return null
    const profile = profiles[vendorId]
    if (!profile) return null
    return profile.full_name || profile.email?.split('@')[0] || null
  }

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="mias" className="gap-1 text-xs px-1">
              <IconUserCircle className="h-3 w-3" />
              Mías
              {myCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 px-1 py-0 text-[10px]">
                  {myCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="todas" className="text-xs px-1">
              Todas
            </TabsTrigger>
            <TabsTrigger value="handoff" className="gap-1 text-xs px-1">
              <IconAlertCircle className="h-3 w-3" />
              {handoffCount > 0 && (
                <Badge variant="destructive" className="px-1 py-0 text-[10px]">
                  {handoffCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bot" className="gap-1 text-xs px-1">
              <IconRobot className="h-3 w-3" />
              Bot
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y">
          {sortedSesiones.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {filter === 'mias'
                ? 'No tienes conversaciones asignadas'
                : filter === 'handoff'
                ? 'No hay conversaciones que requieran atención'
                : 'No hay conversaciones'}
            </div>
          ) : (
            sortedSesiones.map((sesion) => {
              const isSelected = selectedId === sesion.id
              const isHandoff = sesion.atendido_por === 'vendedor'
              const motivoHandoff = sesion.motivo_handoff
              const assignedVendorName = getVendorName(sesion.vendedor_asignado_id)
              const isAssignedToMe = sesion.vendedor_asignado_id === currentUserId
              const timeAgo = sesion.ultimo_mensaje_at
                ? formatDistanceToNow(new Date(sesion.ultimo_mensaje_at), {
                    addSuffix: false,
                    locale: es,
                  })
                : ''

              return (
                <button
                  key={sesion.id}
                  onClick={() => router.push(`/conversations/${sesion.id}`)}
                  className={cn(
                    'w-full p-4 text-left hover:bg-accent transition-colors',
                    isSelected && 'bg-accent',
                    isHandoff && !isSelected && 'bg-orange-50 hover:bg-orange-100'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isHandoff ? (
                          <IconUser className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        ) : (
                          <IconRobot className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                        <span className="font-medium truncate">
                          {sesion.nombre_cliente || 'Sin nombre'}
                        </span>
                        {(sesion.mensajes_no_leidos || 0) > 0 && (
                          <Badge
                            variant="destructive"
                            className="text-xs px-1.5 py-0"
                          >
                            {sesion.mensajes_no_leidos}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <IconPhone className="h-3 w-3" />
                        <span>{sesion.telefono}</span>
                      </div>

                      {/* Assigned vendor badge */}
                      {isHandoff && (
                        <div className="flex items-center gap-1 mt-1">
                          {assignedVendorName ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                isAssignedToMe
                                  ? "bg-green-100 text-green-700 border-green-300"
                                  : "bg-gray-100 text-gray-700 border-gray-300"
                              )}
                            >
                              <IconUserCircle className="h-3 w-3 mr-1" />
                              {isAssignedToMe ? 'Tú' : assignedVendorName}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                              Sin asignar
                            </Badge>
                          )}
                          {motivoHandoff && (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                              {motivoHandoff === 'explicito' && 'Solicitó vendedor'}
                              {motivoHandoff === 'loop' && 'Bot no entendió'}
                              {motivoHandoff === 'sin_stock' && 'Sin stock'}
                              {motivoHandoff === 'preguntas_sin_compra' && 'Muchas preguntas'}
                              {motivoHandoff === 'tiempo_estado' && 'Tiempo excedido'}
                              {motivoHandoff === 'pedido_cod' && '💵 Pago efectivo'}
                            </Badge>
                          )}
                        </div>
                      )}

                      {sesion.ultimo_mensaje && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {sesion.ultimo_mensaje}
                        </p>
                      )}
                    </div>
                    {timeAgo && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
