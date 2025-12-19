import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  IconMessageCircle,
  IconTruck,
  IconFileInvoice,
  IconCreditCard,
  IconCash,
  IconChartBar,
  IconShoppingCart,
  IconAlertTriangle,
  IconPackageOff,
  IconArrowRight,
  IconTrendingUp,
  IconTrendingDown,
  IconClock,
  IconUserQuestion,
  IconRobot,
} from '@tabler/icons-react'
import { SalesChart } from '@/components/dashboard/sales-chart'
import { PIPELINE_STAGES } from '@/lib/constants'

// Helper para obtener fechas
function getDateRanges() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const startOfWeek = new Date(today)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
  const endOfLastWeek = new Date(startOfWeek)
  endOfLastWeek.setDate(endOfLastWeek.getDate() - 1)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  return {
    today: today.toISOString(),
    yesterday: yesterday.toISOString(),
    startOfWeek: startOfWeek.toISOString(),
    startOfLastWeek: startOfLastWeek.toISOString(),
    endOfLastWeek: endOfLastWeek.toISOString(),
    startOfMonth: startOfMonth.toISOString(),
    startOfLastMonth: startOfLastMonth.toISOString(),
    endOfLastMonth: endOfLastMonth.toISOString(),
  }
}

async function getActionsPending() {
  const supabase = await createClient()

  // Mensajes sin leer
  const { count: mensajesSinLeer } = await supabase
    .from('sesiones_chat')
    .select('*', { count: 'exact', head: true })
    .gt('mensajes_no_leidos', 0)

  // Pedidos por enviar (pagados pero no enviados)
  const { count: pedidosPorEnviar } = await supabase
    .from('pedidos')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pagado')

  // Cotizaciones sin respuesta (etapa cotizacion_enviada hace más de 24h)
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: cotizacionesSinRespuesta } = await supabase
    .from('sesiones_chat')
    .select('*', { count: 'exact', head: true })
    .eq('pipeline_stage', 'cotizacion_enviada')
    .lt('ultimo_mensaje_at', hace24h)

  // Links de pago pendientes
  const { count: linksPendientes } = await supabase
    .from('pedidos')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente_pago')

  return {
    mensajesSinLeer: mensajesSinLeer || 0,
    pedidosPorEnviar: pedidosPorEnviar || 0,
    cotizacionesSinRespuesta: cotizacionesSinRespuesta || 0,
    linksPendientes: linksPendientes || 0,
  }
}

async function getSalesMetrics() {
  const supabase = await createClient()
  const dates = getDateRanges()

  // Ventas de hoy
  const { data: ventasHoy } = await supabase
    .from('pedidos')
    .select('total')
    .in('estado', ['pagado', 'enviado', 'entregado'])
    .gte('fecha_pago', dates.today)

  // Ventas de ayer (para comparar)
  const { data: ventasAyer } = await supabase
    .from('pedidos')
    .select('total')
    .in('estado', ['pagado', 'enviado', 'entregado'])
    .gte('fecha_pago', dates.yesterday)
    .lt('fecha_pago', dates.today)

  // Ventas de esta semana
  const { data: ventasSemana } = await supabase
    .from('pedidos')
    .select('total')
    .in('estado', ['pagado', 'enviado', 'entregado'])
    .gte('fecha_pago', dates.startOfWeek)

  // Ventas semana pasada (para comparar)
  const { data: ventasSemanaAnterior } = await supabase
    .from('pedidos')
    .select('total')
    .in('estado', ['pagado', 'enviado', 'entregado'])
    .gte('fecha_pago', dates.startOfLastWeek)
    .lt('fecha_pago', dates.startOfWeek)

  // Ventas del mes
  const { data: ventasMes } = await supabase
    .from('pedidos')
    .select('total')
    .in('estado', ['pagado', 'enviado', 'entregado'])
    .gte('fecha_pago', dates.startOfMonth)

  // Ventas mes anterior
  const { data: ventasMesAnterior } = await supabase
    .from('pedidos')
    .select('total')
    .in('estado', ['pagado', 'enviado', 'entregado'])
    .gte('fecha_pago', dates.startOfLastMonth)
    .lt('fecha_pago', dates.startOfMonth)

  // Pedidos del mes para ticket promedio
  const { data: pedidosMes, count: totalPedidosMes } = await supabase
    .from('pedidos')
    .select('total', { count: 'exact' })
    .in('estado', ['pagado', 'enviado', 'entregado'])
    .gte('fecha_pago', dates.startOfMonth)

  const sumHoy = ventasHoy?.reduce((sum, p) => sum + Number(p.total), 0) || 0
  const sumAyer = ventasAyer?.reduce((sum, p) => sum + Number(p.total), 0) || 0
  const sumSemana = ventasSemana?.reduce((sum, p) => sum + Number(p.total), 0) || 0
  const sumSemanaAnterior = ventasSemanaAnterior?.reduce((sum, p) => sum + Number(p.total), 0) || 0
  const sumMes = ventasMes?.reduce((sum, p) => sum + Number(p.total), 0) || 0
  const sumMesAnterior = ventasMesAnterior?.reduce((sum, p) => sum + Number(p.total), 0) || 0
  const ticketPromedio = totalPedidosMes && totalPedidosMes > 0 ? sumMes / totalPedidosMes : 0

  return {
    hoy: sumHoy,
    hoyComparacion: sumAyer > 0 ? ((sumHoy - sumAyer) / sumAyer) * 100 : 0,
    semana: sumSemana,
    semanaComparacion: sumSemanaAnterior > 0 ? ((sumSemana - sumSemanaAnterior) / sumSemanaAnterior) * 100 : 0,
    mes: sumMes,
    mesComparacion: sumMesAnterior > 0 ? ((sumMes - sumMesAnterior) / sumMesAnterior) * 100 : 0,
    ticketPromedio,
    totalPedidosMes: totalPedidosMes || 0,
  }
}

async function getSalesLast7Days() {
  const supabase = await createClient()
  const days = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const { data } = await supabase
      .from('pedidos')
      .select('total')
      .in('estado', ['pagado', 'enviado', 'entregado'])
      .gte('fecha_pago', startOfDay.toISOString())
      .lt('fecha_pago', endOfDay.toISOString())

    const total = data?.reduce((sum, p) => sum + Number(p.total), 0) || 0

    days.push({
      dia: startOfDay.toLocaleDateString('es-MX', { weekday: 'short' }),
      fecha: startOfDay.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      ventas: total,
    })
  }

  return days
}

// Tipo para conversaciones que requieren atención
interface ConversacionAtencion {
  id: string
  telefono: string
  nombre_cliente: string | null
  pipeline_stage: string
  ultimo_mensaje: string | null
  ultimo_mensaje_at: string
  mensajes_no_leidos: number
  motivo_handoff: string | null
  atendido_por: string | null
  ultimo_mensaje_tipo: string | null
  tiempo_espera_minutos: number
  prioridad: number
}

async function getConversacionesRequierenAtencion(): Promise<ConversacionAtencion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_conversaciones_requieren_atencion', { limite: 5 })

  if (error) {
    console.error('Error fetching conversations:', error)
    return []
  }

  return data || []
}

// Helper para formatear tiempo de espera
function formatTiempoEspera(minutos: number): string {
  if (minutos < 60) {
    return `${minutos}m`
  } else if (minutos < 1440) {
    const horas = Math.floor(minutos / 60)
    return `${horas}h`
  } else {
    const dias = Math.floor(minutos / 1440)
    return `${dias}d`
  }
}

async function getInventarioAlerts() {
  const supabase = await createClient()

  // Productos con stock bajo (menos de 4)
  const { data: stockBajo } = await supabase
    .from('inventario')
    .select('*')
    .gt('existencia', 0)
    .lt('existencia', 4)
    .order('existencia', { ascending: true })
    .limit(5)

  // Productos agotados
  const { data: agotados, count: totalAgotados } = await supabase
    .from('inventario')
    .select('*', { count: 'exact' })
    .eq('existencia', 0)
    .limit(5)

  return {
    stockBajo: stockBajo || [],
    agotados: agotados || [],
    totalAgotados: totalAgotados || 0,
  }
}

async function getChatbotStats() {
  const supabase = await createClient()
  const dates = getDateRanges()

  // Total conversaciones del mes
  const { count: totalConversaciones } = await supabase
    .from('sesiones_chat')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dates.startOfMonth)

  // Conversaciones con interés (seleccionaron medida)
  const { count: conInteres } = await supabase
    .from('sesiones_chat')
    .select('*', { count: 'exact', head: true })
    .not('medida_seleccionada', 'is', null)
    .gte('created_at', dates.startOfMonth)

  // Conversaciones que llegaron a cotización
  const { count: conCotizacion } = await supabase
    .from('sesiones_chat')
    .select('*', { count: 'exact', head: true })
    .in('pipeline_stage', ['cotizado', 'link_enviado', 'pagado', 'entregado'])
    .gte('created_at', dates.startOfMonth)

  // Conversaciones que llegaron a venta (pagado o entregado)
  const { count: ventasCerradas } = await supabase
    .from('sesiones_chat')
    .select('*', { count: 'exact', head: true })
    .in('pipeline_stage', ['pagado', 'entregado'])
    .gte('created_at', dates.startOfMonth)

  // Ingresos generados por el chatbot (pedidos del mes)
  const { data: pedidosChatbot } = await supabase
    .from('pedidos')
    .select('total')
    .in('estado', ['pagado', 'enviado', 'entregado'])
    .gte('created_at', dates.startOfMonth)

  const ingresosChatbot = pedidosChatbot?.reduce((sum, p) => sum + Number(p.total), 0) || 0
  const ticketPromedioChatbot = ventasCerradas && ventasCerradas > 0
    ? ingresosChatbot / ventasCerradas
    : 0

  // Ingresos mes anterior para comparar
  const { data: pedidosMesAnterior } = await supabase
    .from('pedidos')
    .select('total')
    .in('estado', ['pagado', 'enviado', 'entregado'])
    .gte('created_at', dates.startOfLastMonth)
    .lt('created_at', dates.startOfMonth)

  const ingresosMesAnterior = pedidosMesAnterior?.reduce((sum, p) => sum + Number(p.total), 0) || 0
  const ingresosComparacion = ingresosMesAnterior > 0
    ? ((ingresosChatbot - ingresosMesAnterior) / ingresosMesAnterior) * 100
    : 0

  // Medidas más buscadas (del mes)
  const { data: medidasBuscadas } = await supabase
    .from('sesiones_chat')
    .select('medida_seleccionada')
    .not('medida_seleccionada', 'is', null)
    .gte('created_at', dates.startOfMonth)

  // Contar frecuencia de medidas
  const medidasCount: Record<string, number> = {}
  medidasBuscadas?.forEach((s) => {
    if (s.medida_seleccionada) {
      medidasCount[s.medida_seleccionada] = (medidasCount[s.medida_seleccionada] || 0) + 1
    }
  })

  const topMedidas = Object.entries(medidasCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([medida, count]) => ({ medida, count }))

  // Calcular tasas del funnel
  const total = totalConversaciones || 0
  const tasaInteres = total > 0 ? ((conInteres || 0) / total) * 100 : 0
  const tasaCotizacion = total > 0 ? ((conCotizacion || 0) / total) * 100 : 0
  const tasaConversion = total > 0 ? ((ventasCerradas || 0) / total) * 100 : 0

  return {
    funnel: {
      totalConversaciones: total,
      conInteres: conInteres || 0,
      conCotizacion: conCotizacion || 0,
      ventasCerradas: ventasCerradas || 0,
      tasaInteres,
      tasaCotizacion,
      tasaConversion,
    },
    ingresos: {
      total: ingresosChatbot,
      comparacion: ingresosComparacion,
      ticketPromedio: ticketPromedioChatbot,
    },
    topMedidas,
  }
}

export default async function DashboardPage() {
  const [actions, sales, salesChart, conversaciones, inventario, chatbot] = await Promise.all([
    getActionsPending(),
    getSalesMetrics(),
    getSalesLast7Days(),
    getConversacionesRequierenAtencion(),
    getInventarioAlerts(),
    getChatbotStats(),
  ])

  const totalAcciones = actions.mensajesSinLeer + actions.pedidosPorEnviar + actions.cotizacionesSinRespuesta + actions.linksPendientes

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Panel de control de RELUVSA - Vista general del negocio
        </p>
      </div>

      {/* Acciones Pendientes */}
      {totalAcciones > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
              <IconAlertTriangle className="h-5 w-5" />
              Acciones Pendientes
              <Badge variant="destructive" className="ml-2">{totalAcciones}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {actions.mensajesSinLeer > 0 && (
                <Link href="/conversations">
                  <Button variant="outline" className="gap-2 border-orange-300 hover:bg-orange-100">
                    <IconMessageCircle className="h-4 w-4" />
                    <span>{actions.mensajesSinLeer} mensajes sin leer</span>
                  </Button>
                </Link>
              )}
              {actions.pedidosPorEnviar > 0 && (
                <Link href="/pedidos?estado=pagado">
                  <Button variant="outline" className="gap-2 border-orange-300 hover:bg-orange-100">
                    <IconTruck className="h-4 w-4" />
                    <span>{actions.pedidosPorEnviar} pedidos por enviar</span>
                  </Button>
                </Link>
              )}
              {actions.cotizacionesSinRespuesta > 0 && (
                <Link href="/pipeline">
                  <Button variant="outline" className="gap-2 border-orange-300 hover:bg-orange-100">
                    <IconFileInvoice className="h-4 w-4" />
                    <span>{actions.cotizacionesSinRespuesta} cotizaciones sin respuesta</span>
                  </Button>
                </Link>
              )}
              {actions.linksPendientes > 0 && (
                <Link href="/pedidos?estado=pendiente_pago">
                  <Button variant="outline" className="gap-2 border-orange-300 hover:bg-orange-100">
                    <IconCreditCard className="h-4 w-4" />
                    <span>{actions.linksPendientes} links de pago pendientes</span>
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas de Ventas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas Hoy
            </CardTitle>
            <IconCash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${sales.hoy.toLocaleString('es-MX')}</div>
            {sales.hoyComparacion !== 0 && (
              <p className={`text-xs flex items-center gap-1 ${sales.hoyComparacion > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {sales.hoyComparacion > 0 ? <IconTrendingUp className="h-3 w-3" /> : <IconTrendingDown className="h-3 w-3" />}
                {sales.hoyComparacion > 0 ? '+' : ''}{sales.hoyComparacion.toFixed(0)}% vs ayer
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas Semana
            </CardTitle>
            <IconChartBar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${sales.semana.toLocaleString('es-MX')}</div>
            {sales.semanaComparacion !== 0 && (
              <p className={`text-xs flex items-center gap-1 ${sales.semanaComparacion > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {sales.semanaComparacion > 0 ? <IconTrendingUp className="h-3 w-3" /> : <IconTrendingDown className="h-3 w-3" />}
                {sales.semanaComparacion > 0 ? '+' : ''}{sales.semanaComparacion.toFixed(0)}% vs sem. anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas del Mes
            </CardTitle>
            <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${sales.mes.toLocaleString('es-MX')}</div>
            {sales.mesComparacion !== 0 && (
              <p className={`text-xs flex items-center gap-1 ${sales.mesComparacion > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {sales.mesComparacion > 0 ? <IconTrendingUp className="h-3 w-3" /> : <IconTrendingDown className="h-3 w-3" />}
                {sales.mesComparacion > 0 ? '+' : ''}{sales.mesComparacion.toFixed(0)}% vs mes anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Promedio
            </CardTitle>
            <IconShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${sales.ticketPromedio.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">
              {sales.totalPedidosMes} pedidos este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica y Stats del Chatbot */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Gráfica de ventas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ventas Últimos 7 Días</CardTitle>
            <CardDescription>Ingresos diarios de la semana</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart data={salesChart} />
          </CardContent>
        </Card>

        {/* Stats del Chatbot - Funnel de Conversión */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Rendimiento del Chatbot</CardTitle>
            <CardDescription>Funnel de conversión este mes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Funnel Visual */}
            <div className="space-y-3">
              {/* Conversaciones */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Conversaciones</span>
                  <span className="font-medium">{chatbot.funnel.totalConversaciones}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Con interés */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mostraron interés</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{chatbot.funnel.conInteres}</span>
                    <Badge variant="secondary" className="text-xs">
                      {chatbot.funnel.tasaInteres.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${Math.min(chatbot.funnel.tasaInteres, 100)}%` }}
                  />
                </div>
              </div>

              {/* Cotización */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cotización generada</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{chatbot.funnel.conCotizacion}</span>
                    <Badge variant="secondary" className="text-xs">
                      {chatbot.funnel.tasaCotizacion.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full transition-all"
                    style={{ width: `${Math.min(chatbot.funnel.tasaCotizacion, 100)}%` }}
                  />
                </div>
              </div>

              {/* Venta cerrada */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-green-600">Venta cerrada</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600">{chatbot.funnel.ventasCerradas}</span>
                    <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                      {chatbot.funnel.tasaConversion.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min(chatbot.funnel.tasaConversion, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Ingresos */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ingresos del chatbot</span>
                <div className="text-right">
                  <span className="font-bold">${chatbot.ingresos.total.toLocaleString('es-MX')}</span>
                  {chatbot.ingresos.comparacion !== 0 && (
                    <p className={`text-xs flex items-center justify-end gap-1 ${chatbot.ingresos.comparacion > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {chatbot.ingresos.comparacion > 0 ? <IconTrendingUp className="h-3 w-3" /> : <IconTrendingDown className="h-3 w-3" />}
                      {chatbot.ingresos.comparacion > 0 ? '+' : ''}{chatbot.ingresos.comparacion.toFixed(0)}%
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ticket promedio</span>
                <span className="font-medium">${chatbot.ingresos.ticketPromedio.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Medidas más buscadas */}
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Medidas más buscadas</p>
              <div className="flex flex-wrap gap-1">
                {chatbot.topMedidas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos aún</p>
                ) : (
                  chatbot.topMedidas.map((m) => (
                    <Badge key={m.medida} variant="outline" className="text-xs">
                      {m.medida} ({m.count})
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversaciones Pendientes y Alertas de Inventario */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Conversaciones que requieren atención */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Requiere Atención
                {conversaciones.length > 0 && (
                  <Badge variant="destructive">{conversaciones.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>Clientes esperando respuesta</CardDescription>
            </div>
            <Link href="/conversations">
              <Button variant="ghost" size="sm">
                Ver todas <IconArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conversaciones.length === 0 ? (
                <div className="text-center py-6">
                  <IconRobot className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Todo bajo control - sin conversaciones pendientes
                  </p>
                </div>
              ) : (
                conversaciones.map((conv) => {
                  const stage = PIPELINE_STAGES.find(s => s.id === conv.pipeline_stage)

                  // Determinar color de prioridad
                  const prioridadColor = conv.prioridad === 1
                    ? 'bg-red-500'
                    : conv.prioridad === 2
                      ? 'bg-red-400'
                      : conv.prioridad <= 4
                        ? 'bg-orange-400'
                        : 'bg-yellow-400'

                  // Determinar icono según tipo
                  const IconoTipo = conv.ultimo_mensaje_tipo === 'cliente'
                    ? IconUserQuestion
                    : conv.motivo_handoff
                      ? IconAlertTriangle
                      : IconMessageCircle

                  return (
                    <Link
                      key={conv.id}
                      href={`/conversations/${conv.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors border"
                    >
                      {/* Indicador de prioridad */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${prioridadColor}`} />

                      {/* Icono de tipo */}
                      <IconoTipo className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                      {/* Contenido */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate text-sm">
                            {conv.nombre_cliente || conv.telefono}
                          </p>
                          {(conv.mensajes_no_leidos || 0) > 0 && (
                            <Badge variant="destructive" className="text-xs h-5">
                              {conv.mensajes_no_leidos}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.ultimo_mensaje_tipo === 'cliente'
                            ? 'Cliente esperando respuesta'
                            : conv.motivo_handoff
                              ? `Handoff: ${conv.motivo_handoff}`
                              : conv.ultimo_mensaje || 'Sin mensajes'}
                        </p>
                      </div>

                      {/* Tiempo de espera y etapa */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <IconClock className="h-3 w-3" />
                          <span>{formatTiempoEspera(conv.tiempo_espera_minutos)}</span>
                        </div>
                        {stage && (
                          <Badge variant="outline" className="text-xs">
                            {stage.label}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alertas de Inventario */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Alertas de Inventario
                {(inventario.totalAgotados > 0 || inventario.stockBajo.length > 0) && (
                  <Badge variant="destructive">
                    {inventario.totalAgotados + inventario.stockBajo.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Productos que necesitan atención</CardDescription>
            </div>
            <Link href="/inventario">
              <Button variant="ghost" size="sm">
                Ver todo <IconArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Agotados */}
              {inventario.totalAgotados > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 flex items-center gap-1 mb-2">
                    <IconPackageOff className="h-4 w-4" />
                    Agotados ({inventario.totalAgotados})
                  </p>
                  <div className="space-y-1">
                    {inventario.agotados.slice(0, 3).map((p) => (
                      <p key={p.snapshot_id} className="text-sm text-muted-foreground truncate">
                        • {p.medida} - {p.descripcion}
                      </p>
                    ))}
                    {inventario.totalAgotados > 3 && (
                      <p className="text-xs text-muted-foreground">
                        y {inventario.totalAgotados - 3} más...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Stock bajo */}
              {inventario.stockBajo.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-orange-600 flex items-center gap-1 mb-2">
                    <IconAlertTriangle className="h-4 w-4" />
                    Stock bajo (menos de 4)
                  </p>
                  <div className="space-y-1">
                    {inventario.stockBajo.map((p) => (
                      <div key={p.snapshot_id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate">
                          {p.medida} - {p.descripcion}
                        </span>
                        <Badge variant="outline" className="ml-2">
                          {p.existencia}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inventario.totalAgotados === 0 && inventario.stockBajo.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Todo el inventario está en orden
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
