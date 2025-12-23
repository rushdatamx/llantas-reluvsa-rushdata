'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'

interface HourlyChartProps {
  data: {
    hora: number
    cantidad: number
  }[]
}

export function HourlyChart({ data }: HourlyChartProps) {
  const maxValue = Math.max(...data.map((d) => d.cantidad))
  const avgValue = data.reduce((sum, d) => sum + d.cantidad, 0) / data.length

  // Formatear hora para display
  const chartData = data.map((d) => ({
    ...d,
    horaLabel: `${d.hora}h`,
  }))

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      const horaInicio = item.hora
      const horaFin = (item.hora + 1) % 24
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{horaInicio}:00 - {horaFin}:00</p>
          <p className="text-primary font-bold">{item.cantidad} mensajes</p>
          {item.cantidad === maxValue && (
            <p className="text-xs text-green-600">Hora pico</p>
          )}
        </div>
      )
    }
    return null
  }

  const totalMensajes = data.reduce((sum, d) => sum + d.cantidad, 0)

  if (totalMensajes === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
        No hay datos de actividad por hora
      </div>
    )
  }

  // Identificar horarios pico (top 3)
  const sortedByQuantity = [...data].sort((a, b) => b.cantidad - a.cantidad)
  const peakHours = sortedByQuantity.slice(0, 3).map((d) => d.hora)

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="horaLabel"
            tick={{ fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avgValue}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <Bar dataKey="cantidad" radius={[2, 2, 0, 0]} maxBarSize={15}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  peakHours.includes(entry.hora)
                    ? 'hsl(142, 71%, 45%)' // green para picos
                    : 'hsl(var(--primary))'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Horarios pico */}
      <div className="text-xs text-muted-foreground text-center">
        Horarios pico:{' '}
        <span className="text-green-600 font-medium">
          {peakHours.map((h) => `${h}:00`).join(', ')}
        </span>
      </div>
    </div>
  )
}
