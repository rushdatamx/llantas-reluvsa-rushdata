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

interface WeekdayChartProps {
  data: {
    dia: number
    nombre: string
    cantidad: number
  }[]
}

export function WeekdayChart({ data }: WeekdayChartProps) {
  const maxValue = Math.max(...data.map((d) => d.cantidad))

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof data[0] }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{item.nombre}</p>
          <p className="text-primary font-bold">{item.cantidad} mensajes</p>
        </div>
      )
    }
    return null
  }

  const totalMensajes = data.reduce((sum, d) => sum + d.cantidad, 0)

  if (totalMensajes === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
        No hay datos de actividad
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <XAxis
          dataKey="nombre"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.cantidad === maxValue
                  ? 'hsl(142, 71%, 45%)' // green para el máximo
                  : 'hsl(var(--primary))'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
