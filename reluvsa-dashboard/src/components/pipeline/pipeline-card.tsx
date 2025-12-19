'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SesionChat } from '@/types/database'
import { IconPhone, IconGripVertical, IconUserCheck, IconRobot } from '@tabler/icons-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface PipelineCardProps {
  sesion: SesionChat
}

export function PipelineCard({ sesion }: PipelineCardProps) {
  const router = useRouter()
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sesion.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const timeAgo = sesion.ultimo_mensaje_at
    ? formatDistanceToNow(new Date(sesion.ultimo_mensaje_at), {
        addSuffix: true,
        locale: es,
      })
    : 'Sin actividad'

  const isVendor = sesion.atendido_por === 'vendedor'

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!dragStartPos.current) return

    const dx = Math.abs(e.clientX - dragStartPos.current.x)
    const dy = Math.abs(e.clientY - dragStartPos.current.y)

    // Only navigate if mouse moved less than 5px (it's a click, not a drag)
    if (dx < 5 && dy < 5) {
      router.push(`/conversations/${sesion.id}`)
    }

    dragStartPos.current = null
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer hover:bg-accent/50 transition-colors ${
        isDragging ? 'shadow-lg ring-2 ring-primary cursor-grabbing' : ''
      }`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-2">
        <div className="flex items-start gap-1.5">
          <div className="mt-0.5 text-muted-foreground flex-shrink-0">
            <IconGripVertical className="h-3.5 w-3.5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                {isVendor ? (
                  <span className="flex-shrink-0 text-amber-600" title="Atendido por vendedor">
                    <IconUserCheck className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="flex-shrink-0 text-muted-foreground" title="Atendido por bot">
                    <IconRobot className="h-3.5 w-3.5" />
                  </span>
                )}
                <span className="font-medium text-sm truncate">
                  {sesion.nombre_cliente || 'Sin nombre'}
                </span>
              </div>
              {(sesion.mensajes_no_leidos || 0) > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 flex-shrink-0">
                  {sesion.mensajes_no_leidos}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
              <IconPhone className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{sesion.telefono}</span>
            </div>

            {sesion.ultimo_mensaje && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                {sesion.ultimo_mensaje}
              </p>
            )}

            <div className="flex items-center justify-between mt-1.5 gap-1">
              {sesion.total ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  ${Number(sesion.total).toLocaleString('es-MX')}
                </Badge>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-muted-foreground truncate">{timeAgo}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
