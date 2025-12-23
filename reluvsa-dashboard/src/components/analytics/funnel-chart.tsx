'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Badge } from '@/components/ui/badge'

interface FunnelChartProps {
  data: {
    conversaciones: number
    conMedida: number
    cotizado: number
    linkEnviado: number
    pagado: number
  }
}

export function FunnelChart({ data }: FunnelChartProps) {
  const total = data.conversaciones || 1

  const chartData = [
    {
      etapa: 'Conversaciones',
      cantidad: data.conversaciones,
      porcentaje: 100,
      color: 'hsl(217, 91%, 60%)', // blue-500
    },
    {
      etapa: 'Con medida',
      cantidad: data.conMedida,
      porcentaje: (data.conMedida / total) * 100,
      color: 'hsl(271, 91%, 65%)', // purple-500
    },
    {
      etapa: 'Cotizado',
      cantidad: data.cotizado,
      porcentaje: (data.cotizado / total) * 100,
      color: 'hsl(45, 93%, 47%)', // yellow-500
    },
    {
      etapa: 'Link enviado',
      cantidad: data.linkEnviado,
      porcentaje: (data.linkEnviado / total) * 100,
      color: 'hsl(25, 95%, 53%)', // orange-500
    },
    {
      etapa: 'Pagado',
      cantidad: data.pagado,
      porcentaje: (data.pagado / total) * 100,
      color: 'hsl(142, 71%, 45%)', // green-500
    },
  ]

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{item.etapa}</p>
          <p className="text-lg font-bold">{item.cantidad} sesiones</p>
          <p className="text-sm text-muted-foreground">
            {item.porcentaje.toFixed(1)}% del total
          </p>
        </div>
      )
    }
    return null
  }

  if (data.conversaciones === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No hay datos de conversiones en este período
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="etapa"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={95}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} maxBarSize={35}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Badges con porcentajes */}
      <div className="flex flex-wrap gap-2 justify-center">
        {chartData.slice(1).map((item) => (
          <Badge
            key={item.etapa}
            variant="outline"
            className="text-xs"
            style={{ borderColor: item.color, color: item.color }}
          >
            {item.etapa}: {item.porcentaje.toFixed(0)}%
          </Badge>
        ))}
      </div>
    </div>
  )
}
