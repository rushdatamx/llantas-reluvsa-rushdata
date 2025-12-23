'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface TopProductsChartProps {
  data: {
    medida: string
    cantidad: number
  }[]
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { medida: string; cantidad: number } }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{item.medida}</p>
          <p className="text-primary font-bold">{item.cantidad} unidades</p>
        </div>
      )
    }
    return null
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No hay datos de ventas por medida
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="medida"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={75}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="cantidad"
          fill="hsl(var(--primary))"
          radius={[0, 4, 4, 0]}
          maxBarSize={25}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
