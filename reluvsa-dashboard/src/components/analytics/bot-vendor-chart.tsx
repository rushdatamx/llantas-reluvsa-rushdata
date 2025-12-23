'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { IconRobot, IconUser, IconClock } from '@tabler/icons-react'

interface BotVendorChartProps {
  data: {
    bot: {
      sesiones: number
      conversiones: number
      tiempoRespuesta: number
    }
    vendedor: {
      sesiones: number
      conversiones: number
      tiempoRespuesta: number
    }
  }
}

export function BotVendorChart({ data }: BotVendorChartProps) {
  const botTasa = data.bot.sesiones > 0
    ? ((data.bot.conversiones / data.bot.sesiones) * 100).toFixed(1)
    : '0'
  const vendedorTasa = data.vendedor.sesiones > 0
    ? ((data.vendedor.conversiones / data.vendedor.sesiones) * 100).toFixed(1)
    : '0'

  const formatTiempo = (minutos: number): string => {
    if (minutos < 1) return '< 1 min'
    if (minutos < 60) return `${Math.round(minutos)} min`
    return `${(minutos / 60).toFixed(1)} hrs`
  }

  const chartData = [
    {
      categoria: 'Sesiones',
      Bot: data.bot.sesiones,
      Vendedor: data.vendedor.sesiones,
    },
    {
      categoria: 'Conversiones',
      Bot: data.bot.conversiones,
      Vendedor: data.vendedor.conversiones,
    },
  ]

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const totalSesiones = data.bot.sesiones + data.vendedor.sesiones

  if (totalSesiones === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No hay datos de atención en este período
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Gráfica de barras */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="Bot" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Vendedor" fill="hsl(271, 91%, 65%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bot */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-blue-100">
              <IconRobot className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-medium">Bot</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sesiones</span>
              <span className="font-medium">{data.bot.sesiones}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conversiones</span>
              <span className="font-medium">{data.bot.conversiones}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tasa</span>
              <span className="font-medium text-green-600">{botTasa}%</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-muted-foreground flex items-center gap-1">
                <IconClock className="h-3 w-3" /> Respuesta
              </span>
              <span className="font-medium">{formatTiempo(data.bot.tiempoRespuesta)}</span>
            </div>
          </div>
        </div>

        {/* Vendedor */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-purple-100">
              <IconUser className="h-4 w-4 text-purple-600" />
            </div>
            <span className="font-medium">Vendedor</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sesiones</span>
              <span className="font-medium">{data.vendedor.sesiones}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conversiones</span>
              <span className="font-medium">{data.vendedor.conversiones}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tasa</span>
              <span className="font-medium text-green-600">{vendedorTasa}%</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-muted-foreground flex items-center gap-1">
                <IconClock className="h-3 w-3" /> Respuesta
              </span>
              <span className="font-medium">{formatTiempo(data.vendedor.tiempoRespuesta)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
