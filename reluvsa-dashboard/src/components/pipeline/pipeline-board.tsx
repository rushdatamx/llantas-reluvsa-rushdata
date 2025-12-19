'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { PipelineColumn } from './pipeline-column'
import { PipelineCard } from './pipeline-card'
import { PIPELINE_STAGES } from '@/lib/constants'
import { SesionChat, PipelineStage } from '@/types/database'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconCalendar } from '@tabler/icons-react'

type DateFilter = '7' | '30' | '90' | 'all'

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: 'all', label: 'Todos' },
]

interface PipelineBoardProps {
  initialSesiones: SesionChat[]
}

export function PipelineBoard({ initialSesiones }: PipelineBoardProps) {
  const [sesiones, setSesiones] = useState<SesionChat[]>(initialSesiones)
  const [activeSession, setActiveSession] = useState<SesionChat | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>('30')
  const supabase = createClient()

  // Filter sessions by date
  const filteredSesiones = useMemo(() => {
    if (dateFilter === 'all') return sesiones

    const now = new Date()
    const daysAgo = parseInt(dateFilter)
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    return sesiones.filter((s) => {
      const sessionDate = new Date(s.ultimo_mensaje_at || s.created_at || 0)
      return sessionDate >= cutoffDate
    })
  }, [sesiones, dateFilter])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('sesiones-changes')
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
            setSesiones((prev) =>
              prev.filter((s) => s.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const getSessionsByStage = (stage: PipelineStage): SesionChat[] => {
    return filteredSesiones
      .filter((s) => (s.pipeline_stage || 'explorando') === stage)
      .sort(
        (a, b) =>
          new Date(b.ultimo_mensaje_at || b.created_at || 0).getTime() -
          new Date(a.ultimo_mensaje_at || a.created_at || 0).getTime()
      )
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const session = sesiones.find((s) => s.id === active.id)
    setActiveSession(session || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Check if we're over a column
    const isOverColumn = PIPELINE_STAGES.some((stage) => stage.id === overId)

    if (isOverColumn) {
      const activeSession = sesiones.find((s) => s.id === activeId)
      if (activeSession && activeSession.pipeline_stage !== overId) {
        setSesiones((prev) =>
          prev.map((s) =>
            s.id === activeId
              ? { ...s, pipeline_stage: overId as PipelineStage }
              : s
          )
        )
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveSession(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Determine the target stage
    let targetStage: PipelineStage | null = null

    // Check if dropped on a column
    const droppedOnColumn = PIPELINE_STAGES.find((stage) => stage.id === overId)
    if (droppedOnColumn) {
      targetStage = droppedOnColumn.id
    } else {
      // Dropped on another card - find that card's stage
      const overSession = sesiones.find((s) => s.id === overId)
      if (overSession) {
        targetStage = overSession.pipeline_stage || 'explorando'
      }
    }

    if (!targetStage) return

    const activeSession = sesiones.find((s) => s.id === activeId)
    if (!activeSession) return

    // Update in database
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('sesiones_chat')
        .update({ pipeline_stage: targetStage })
        .eq('id', activeId)

      if (error) throw error

      const stageName = PIPELINE_STAGES.find((s) => s.id === targetStage)?.label
      toast.success(`Movido a "${stageName}"`)
    } catch (error) {
      console.error('Error updating pipeline stage:', error)
      toast.error('Error al mover la sesión')
      // Revert the optimistic update
      setSesiones((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? { ...s, pipeline_stage: activeSession.pipeline_stage }
            : s
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (sesiones.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px] text-muted-foreground">
        No hay sesiones de chat. Las nuevas conversaciones aparecerán aquí.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Mostrando {filteredSesiones.length} de {sesiones.length} conversaciones</span>
        </div>
        <div className="flex items-center gap-2">
          <IconCalendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pipeline Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-2 pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              sesiones={getSessionsByStage(stage.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeSession ? <PipelineCard sesion={activeSession} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
