'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PipelineCard } from './pipeline-card'
import { SesionChat, PipelineStage } from '@/types/database'
import { cn } from '@/lib/utils'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'

const ITEMS_PER_PAGE = 10

interface PipelineColumnProps {
  stage: {
    id: PipelineStage
    label: string
    color: string
  }
  sesiones: SesionChat[]
}

export function PipelineColumn({ stage, sesiones }: PipelineColumnProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  const hasMore = sesiones.length > ITEMS_PER_PAGE
  const visibleSesiones = isExpanded ? sesiones : sesiones.slice(0, ITEMS_PER_PAGE)
  const hiddenCount = sesiones.length - ITEMS_PER_PAGE

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-h-[500px] min-w-[160px] flex-1 transition-colors',
        isOver && 'ring-2 ring-primary bg-accent/50'
      )}
    >
      <CardHeader className="px-2 py-2">
        <CardTitle className="flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', stage.color)} />
            <span className="truncate">{stage.label}</span>
          </div>
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 flex-shrink-0">
            {sesiones.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-1.5 pt-0">
        <SortableContext
          items={visibleSesiones.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5">
            {sesiones.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-[11px] text-muted-foreground border border-dashed rounded-md">
                Vacío
              </div>
            ) : (
              <>
                {visibleSesiones.map((sesion) => (
                  <PipelineCard key={sesion.id} sesion={sesion} />
                ))}

                {hasMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? (
                      <>
                        <IconChevronUp className="h-3 w-3 mr-1" />
                        Mostrar menos
                      </>
                    ) : (
                      <>
                        <IconChevronDown className="h-3 w-3 mr-1" />
                        Ver {hiddenCount} más
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  )
}
