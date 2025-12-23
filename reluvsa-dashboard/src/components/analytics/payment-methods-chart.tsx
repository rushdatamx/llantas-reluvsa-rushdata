'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface PaymentMethodsChartProps {
  data: {
    metodo: string
    cantidad: number
    ingresos: number
  }[]
}

const COLORS = {
  stripe: 'hsl(217, 91%, 60%)', // blue
  efectivo_cod: 'hsl(45, 93%, 47%)', // yellow/amber
}

const LABELS: Record<string, string> = {
  stripe: 'Tarjeta',
  efectivo_cod: 'Efectivo',
}

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    name: LABELS[d.metodo] || d.metodo,
    color: COLORS[d.metodo as keyof typeof COLORS] || 'hsl(var(--muted))',
  }))

  const total = chartData.reduce((sum, d) => sum + d.cantidad, 0)

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      const percentage = ((item.cantidad / total) * 100).toFixed(1)
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{item.name}</p>
          <p className="text-sm">{item.cantidad} pedidos ({percentage}%)</p>
          <p className="text-primary font-bold">
            ${item.ingresos.toLocaleString('es-MX')} MXN
          </p>
        </div>
      )
    }
    return null
  }

  const renderCustomizedLabel = (props: {
    cx?: number
    cy?: number
    midAngle?: number
    innerRadius?: number
    outerRadius?: number
    percent?: number
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.05) return null

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={14}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  if (data.length === 0 || total === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No hay datos de métodos de pago
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            innerRadius={40}
            dataKey="cantidad"
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-sm">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Resumen de ingresos */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
        {chartData.map((item) => (
          <div key={item.metodo} className="text-center">
            <p className="text-sm text-muted-foreground">{item.name}</p>
            <p className="font-bold">${item.ingresos.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
