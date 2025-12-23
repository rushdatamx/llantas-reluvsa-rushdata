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

export function exportAnalyticsToCSV(data: AnalyticsData, dateRange: string) {
  const lines: string[] = []
  const fecha = new Date().toLocaleDateString('es-MX')

  // Header
  lines.push(`RELUVSA Analytics Report - ${fecha}`)
  lines.push(`Período: ${dateRange}`)
  lines.push('')

  // KPIs
  lines.push('=== KPIs ===')
  lines.push('Métrica,Valor')
  lines.push(`Ingresos Totales,$${data.kpis.ingresos.toLocaleString('es-MX')}`)
  lines.push(`Pedidos Completados,${data.kpis.pedidos}`)
  lines.push(`Tasa de Conversión,${data.kpis.tasaConversion.toFixed(1)}%`)
  lines.push(`Ticket Promedio,$${data.kpis.ticketPromedio.toLocaleString('es-MX')}`)
  lines.push('')

  // Ingresos por día
  lines.push('=== Ingresos por Día ===')
  lines.push('Fecha,Ingresos')
  data.revenueByDay.forEach((d) => {
    lines.push(`${d.fecha},$${d.ingresos.toLocaleString('es-MX')}`)
  })
  lines.push('')

  // Funnel
  lines.push('=== Embudo de Conversión ===')
  lines.push('Etapa,Cantidad,Porcentaje')
  const total = data.funnel.conversaciones || 1
  lines.push(`Conversaciones,${data.funnel.conversaciones},100%`)
  lines.push(`Con medida,${data.funnel.conMedida},${((data.funnel.conMedida / total) * 100).toFixed(1)}%`)
  lines.push(`Cotizado,${data.funnel.cotizado},${((data.funnel.cotizado / total) * 100).toFixed(1)}%`)
  lines.push(`Link enviado,${data.funnel.linkEnviado},${((data.funnel.linkEnviado / total) * 100).toFixed(1)}%`)
  lines.push(`Pagado,${data.funnel.pagado},${((data.funnel.pagado / total) * 100).toFixed(1)}%`)
  lines.push('')

  // Top medidas
  lines.push('=== Top Medidas Buscadas ===')
  lines.push('Medida,Cantidad')
  data.topMedidas.forEach((m) => {
    lines.push(`${m.medida},${m.cantidad}`)
  })
  lines.push('')

  // Métodos de pago
  lines.push('=== Métodos de Pago ===')
  lines.push('Método,Cantidad,Ingresos')
  data.metodosPago.forEach((m) => {
    const metodoLabel = m.metodo === 'stripe' ? 'Tarjeta' : m.metodo === 'efectivo_cod' ? 'Efectivo' : m.metodo
    lines.push(`${metodoLabel},${m.cantidad},$${m.ingresos.toLocaleString('es-MX')}`)
  })
  lines.push('')

  // Bot vs Vendedor
  lines.push('=== Bot vs Vendedor ===')
  lines.push('Atención,Sesiones,Conversiones,Tasa,Tiempo Respuesta (min)')
  const botTasa = data.botVsVendor.bot.sesiones > 0
    ? ((data.botVsVendor.bot.conversiones / data.botVsVendor.bot.sesiones) * 100).toFixed(1)
    : '0'
  const vendedorTasa = data.botVsVendor.vendedor.sesiones > 0
    ? ((data.botVsVendor.vendedor.conversiones / data.botVsVendor.vendedor.sesiones) * 100).toFixed(1)
    : '0'
  lines.push(`Bot,${data.botVsVendor.bot.sesiones},${data.botVsVendor.bot.conversiones},${botTasa}%,${data.botVsVendor.bot.tiempoRespuesta.toFixed(1)}`)
  lines.push(`Vendedor,${data.botVsVendor.vendedor.sesiones},${data.botVsVendor.vendedor.conversiones},${vendedorTasa}%,${data.botVsVendor.vendedor.tiempoRespuesta.toFixed(1)}`)
  lines.push('')

  // Actividad por día
  lines.push('=== Actividad por Día de la Semana ===')
  lines.push('Día,Mensajes')
  data.actividadDia.forEach((d) => {
    lines.push(`${d.nombre},${d.cantidad}`)
  })
  lines.push('')

  // Actividad por hora
  lines.push('=== Actividad por Hora ===')
  lines.push('Hora,Mensajes')
  data.actividadHora.forEach((h) => {
    lines.push(`${h.hora}:00,${h.cantidad}`)
  })

  // Crear y descargar el archivo
  const csvContent = lines.join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `reluvsa-analytics-${dateRange}-${fecha.replace(/\//g, '-')}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
