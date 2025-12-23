'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  IconCash,
  IconShoppingCart,
  IconPercentage,
  IconReceipt,
  IconDownload,
  IconLoader2,
} from '@tabler/icons-react'
import { format, subDays, getDay, getHours, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { RevenueChart } from '@/components/analytics/revenue-chart'
import { FunnelChart } from '@/components/analytics/funnel-chart'
import { TopProductsChart } from '@/components/analytics/top-products-chart'
import { PaymentMethodsChart } from '@/components/analytics/payment-methods-chart'
import { BotVendorChart } from '@/components/analytics/bot-vendor-chart'
import { WeekdayChart } from '@/components/analytics/weekday-chart'
import { HourlyChart } from '@/components/analytics/hourly-chart'
import { exportAnalyticsToCSV } from '@/lib/export-csv'

type DateRange = '7d' | '30d' | '90d' | 'all'

interface AnalyticsData {
  kpis: {
    ingresos: number
    pedidos: number
    tasaConversion: number
    ticketPromedio: number
  }
  revenueByDay: { fecha: string; ingresos: number }[]
  funnel: {
    conversaciones: number
    conMedida: number
    cotizado: number
    linkEnviado: number
    pagado: number
  }
  topMedidas: { medida: string; cantidad: number }[]
  metodosPago: { metodo: string; cantidad: number; ingresos: number }[]
  botVsVendor: {
    bot: { sesiones: number; conversiones: number; tiempoRespuesta: number }
    vendedor: { sesiones: number; conversiones: number; tiempoRespuesta: number }
  }
  actividadDia: { dia: number; nombre: string; cantidad: number }[]
  actividadHora: { hora: number; cantidad: number }[]
}

interface PedidoItem {
  medida: string
  cantidad: number
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Calcular fecha de inicio según el rango
    let fechaInicio: string | null = null
    if (dateRange === '7d') {
      fechaInicio = subDays(new Date(), 7).toISOString()
    } else if (dateRange === '30d') {
      fechaInicio = subDays(new Date(), 30).toISOString()
    } else if (dateRange === '90d') {
      fechaInicio = subDays(new Date(), 90).toISOString()
    }

    // Query 1: Pedidos para KPIs, ingresos por día, métodos de pago
    let pedidosQuery = supabase
      .from('pedidos')
      .select('fecha_pago, total, metodo_pago, items')
      .in('estado', ['pagado', 'enviado', 'entregado'])

    if (fechaInicio) {
      pedidosQuery = pedidosQuery.gte('fecha_pago', fechaInicio)
    }

    const { data: pedidos } = await pedidosQuery

    // Query 2: Sesiones para funnel y bot vs vendedor
    let sesionesQuery = supabase
      .from('sesiones_chat')
      .select('medida_seleccionada, pipeline_stage, atendido_por')

    if (fechaInicio) {
      sesionesQuery = sesionesQuery.gte('created_at', fechaInicio)
    }

    const { data: sesiones } = await sesionesQuery

    // Query 3: Mensajes para tiempo de respuesta y actividad por hora
    let mensajesQuery = supabase
      .from('mensajes')
      .select('sesion_id, tipo, created_at')
      .order('created_at', { ascending: true })

    if (fechaInicio) {
      mensajesQuery = mensajesQuery.gte('created_at', fechaInicio)
    }

    const { data: mensajes } = await mensajesQuery

    // Procesar datos
    const pedidosArr = pedidos || []
    const sesionesArr = sesiones || []
    const mensajesArr = mensajes || []

    // KPIs
    const ingresos = pedidosArr.reduce((sum, p) => sum + Number(p.total || 0), 0)
    const numPedidos = pedidosArr.length
    const tasaConversion = sesionesArr.length > 0
      ? (sesionesArr.filter(s => ['pagado', 'entregado'].includes(s.pipeline_stage || '')).length / sesionesArr.length) * 100
      : 0
    const ticketPromedio = numPedidos > 0 ? ingresos / numPedidos : 0

    // Ingresos por día
    const revenueMap: Record<string, number> = {}
    pedidosArr.forEach(p => {
      if (p.fecha_pago) {
        const dia = format(parseISO(p.fecha_pago), 'yyyy-MM-dd')
        revenueMap[dia] = (revenueMap[dia] || 0) + Number(p.total || 0)
      }
    })
    const revenueByDay = Object.entries(revenueMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fecha, ingresos]) => ({ fecha, ingresos }))

    // Funnel
    const funnel = {
      conversaciones: sesionesArr.length,
      conMedida: sesionesArr.filter(s => s.medida_seleccionada).length,
      cotizado: sesionesArr.filter(s => ['cotizado', 'link_enviado', 'pagado', 'entregado'].includes(s.pipeline_stage || '')).length,
      linkEnviado: sesionesArr.filter(s => ['link_enviado', 'pagado', 'entregado'].includes(s.pipeline_stage || '')).length,
      pagado: sesionesArr.filter(s => ['pagado', 'entregado'].includes(s.pipeline_stage || '')).length,
    }

    // Top medidas buscadas (from sesiones_chat.medida_seleccionada)
    const medidasMap: Record<string, number> = {}
    sesionesArr.forEach(s => {
      if (s.medida_seleccionada) {
        const medida = s.medida_seleccionada
        medidasMap[medida] = (medidasMap[medida] || 0) + 1
      }
    })
    const topMedidas = Object.entries(medidasMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([medida, cantidad]) => ({ medida, cantidad }))

    // Métodos de pago
    const metodosMap: Record<string, { cantidad: number; ingresos: number }> = {}
    pedidosArr.forEach(p => {
      const metodo = p.metodo_pago || 'stripe'
      if (!metodosMap[metodo]) {
        metodosMap[metodo] = { cantidad: 0, ingresos: 0 }
      }
      metodosMap[metodo].cantidad++
      metodosMap[metodo].ingresos += Number(p.total || 0)
    })
    const metodosPago = Object.entries(metodosMap).map(([metodo, data]) => ({
      metodo,
      cantidad: data.cantidad,
      ingresos: data.ingresos,
    }))

    // Bot vs Vendedor
    const botSesiones = sesionesArr.filter(s => s.atendido_por !== 'vendedor')
    const vendedorSesiones = sesionesArr.filter(s => s.atendido_por === 'vendedor')

    // Calcular tiempo de respuesta promedio
    const calcularTiempoRespuesta = (tipo: 'bot' | 'vendedor'): number => {
      const tiempos: number[] = []
      const mensajesPorSesion: Record<string, typeof mensajesArr> = {}

      mensajesArr.forEach(m => {
        if (!mensajesPorSesion[m.sesion_id]) {
          mensajesPorSesion[m.sesion_id] = []
        }
        mensajesPorSesion[m.sesion_id].push(m)
      })

      Object.values(mensajesPorSesion).forEach(msgs => {
        for (let i = 0; i < msgs.length - 1; i++) {
          if (msgs[i].tipo === 'cliente' && msgs[i + 1].tipo === tipo) {
            const diff = new Date(msgs[i + 1].created_at).getTime() - new Date(msgs[i].created_at).getTime()
            tiempos.push(diff / 1000 / 60) // en minutos
          }
        }
      })

      return tiempos.length > 0 ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : 0
    }

    const botVsVendor = {
      bot: {
        sesiones: botSesiones.length,
        conversiones: botSesiones.filter(s => ['pagado', 'entregado'].includes(s.pipeline_stage || '')).length,
        tiempoRespuesta: calcularTiempoRespuesta('bot'),
      },
      vendedor: {
        sesiones: vendedorSesiones.length,
        conversiones: vendedorSesiones.filter(s => ['pagado', 'entregado'].includes(s.pipeline_stage || '')).length,
        tiempoRespuesta: calcularTiempoRespuesta('vendedor'),
      },
    }

    // Actividad por día de la semana
    const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const actividadDiaMap: Record<number, number> = {}
    sesionesArr.forEach(() => {
      // Como no tenemos created_at en el select, usamos los mensajes
    })
    mensajesArr.filter(m => m.tipo === 'cliente').forEach(m => {
      const dia = getDay(parseISO(m.created_at))
      actividadDiaMap[dia] = (actividadDiaMap[dia] || 0) + 1
    })
    const actividadDia = diasNombres.map((nombre, dia) => ({
      dia,
      nombre,
      cantidad: actividadDiaMap[dia] || 0,
    }))

    // Actividad por hora
    const actividadHoraMap: Record<number, number> = {}
    mensajesArr.filter(m => m.tipo === 'cliente').forEach(m => {
      const hora = getHours(parseISO(m.created_at))
      actividadHoraMap[hora] = (actividadHoraMap[hora] || 0) + 1
    })
    const actividadHora = Array.from({ length: 24 }, (_, hora) => ({
      hora,
      cantidad: actividadHoraMap[hora] || 0,
    }))

    setData({
      kpis: { ingresos, pedidos: numPedidos, tasaConversion, ticketPromedio },
      revenueByDay,
      funnel,
      topMedidas,
      metodosPago,
      botVsVendor,
      actividadDia,
      actividadHora,
    })
    setLoading(false)
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExport = () => {
    if (data) {
      exportAnalyticsToCSV(data, dateRange)
    }
  }

  const dateRangeLabel = {
    '7d': 'Últimos 7 días',
    '30d': 'Últimos 30 días',
    '90d': 'Últimos 90 días',
    'all': 'Todo el tiempo',
  }[dateRange]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Métricas y estadísticas del negocio - {dateRangeLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-1">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(range)}
                className="px-3"
              >
                {range === 'all' ? 'Todo' : range}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={handleExport} disabled={loading || !data}>
            <IconDownload className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ingresos Totales
                </CardTitle>
                <IconCash className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${data.kpis.ingresos.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pedidos Completados
                </CardTitle>
                <IconShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.kpis.pedidos}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tasa de Conversión
                </CardTitle>
                <IconPercentage className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.kpis.tasaConversion.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ticket Promedio
                </CardTitle>
                <IconReceipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${data.kpis.ticketPromedio.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfica de Ingresos */}
          <Card>
            <CardHeader>
              <CardTitle>Ingresos por Día</CardTitle>
              <CardDescription>Evolución de ventas en el período seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart data={data.revenueByDay} />
            </CardContent>
          </Card>

          {/* Funnel de Conversión */}
          <Card>
            <CardHeader>
              <CardTitle>Embudo de Conversión</CardTitle>
              <CardDescription>Progresión de leads a través del proceso de venta</CardDescription>
            </CardHeader>
            <CardContent>
              <FunnelChart data={data.funnel} />
            </CardContent>
          </Card>

          {/* Grid: Top Productos + Métodos de Pago */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Medidas Buscadas</CardTitle>
                <CardDescription>Medidas de llantas más solicitadas por clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <TopProductsChart data={data.topMedidas} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pago</CardTitle>
                <CardDescription>Distribución de pagos por método</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentMethodsChart data={data.metodosPago} />
              </CardContent>
            </Card>
          </div>

          {/* Bot vs Vendedor */}
          <Card>
            <CardHeader>
              <CardTitle>Bot vs Vendedor</CardTitle>
              <CardDescription>Comparativa de rendimiento entre atención automática y manual</CardDescription>
            </CardHeader>
            <CardContent>
              <BotVendorChart data={data.botVsVendor} />
            </CardContent>
          </Card>

          {/* Patrones de Actividad */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Actividad por Día</CardTitle>
                <CardDescription>Mensajes de clientes por día de la semana</CardDescription>
              </CardHeader>
              <CardContent>
                <WeekdayChart data={data.actividadDia} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actividad por Hora</CardTitle>
                <CardDescription>Horarios pico de actividad (mensajes de clientes)</CardDescription>
              </CardHeader>
              <CardContent>
                <HourlyChart data={data.actividadHora} />
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
