'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  IconSearch,
  IconShoppingCart,
  IconCurrencyDollar,
  IconClock,
  IconTruck,
  IconCheck,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconArrowUp,
  IconArrowDown,
  IconDownload,
  IconEye,
  IconAlertTriangle,
  IconCreditCard,
  IconCash,
} from '@tabler/icons-react'
import { Pedido } from '@/types/database'
import { METODO_PAGO_CONFIG } from '@/lib/constants'

interface OrdersTableProps {
  pedidos: Pedido[]
}

type EstadoFilter = 'all' | 'pendiente_pago' | 'pagado' | 'enviado' | 'entregado' | 'cancelado'
type SortField = 'created_at' | 'total' | 'nombre_cliente'
type SortDirection = 'asc' | 'desc'

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendiente_pago: {
    label: 'Pendiente Pago',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: <IconClock className="h-3 w-3" />,
  },
  pagado: {
    label: 'Pagado',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: <IconCurrencyDollar className="h-3 w-3" />,
  },
  enviado: {
    label: 'Enviado',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: <IconTruck className="h-3 w-3" />,
  },
  entregado: {
    label: 'Entregado',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: <IconCheck className="h-3 w-3" />,
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: <IconX className="h-3 w-3" />,
  },
}

const ITEMS_PER_PAGE = 20

export function OrdersTable({ pedidos }: OrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  // Calculate KPIs
  const kpis = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())

    const pedidosDelMes = pedidos.filter(p => new Date(p.created_at!) >= startOfMonth)
    const pedidosPagados = pedidos.filter(p => p.estado === 'pagado' || p.estado === 'enviado' || p.estado === 'entregado')
    const pedidosPagadosMes = pedidosDelMes.filter(p => p.estado === 'pagado' || p.estado === 'enviado' || p.estado === 'entregado')

    const ventasMes = pedidosPagadosMes.reduce((sum, p) => sum + Number(p.total || 0), 0)
    const pendientesPago = pedidos.filter(p => p.estado === 'pendiente_pago').length
    const pendientesEnvio = pedidos.filter(p => p.estado === 'pagado').length
    const ticketPromedio = pedidosPagados.length > 0
      ? pedidosPagados.reduce((sum, p) => sum + Number(p.total || 0), 0) / pedidosPagados.length
      : 0
    const cancelados = pedidosDelMes.filter(p => p.estado === 'cancelado').length
    const tasaCancelacion = pedidosDelMes.length > 0 ? (cancelados / pedidosDelMes.length) * 100 : 0

    return {
      ventasMes,
      pendientesPago,
      pendientesEnvio,
      ticketPromedio,
      tasaCancelacion,
      totalPedidosMes: pedidosDelMes.length,
    }
  }, [pedidos])

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let result = [...pedidos]

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(p =>
        p.nombre_cliente?.toLowerCase().includes(search) ||
        p.telefono?.includes(search) ||
        p.telefono_cliente?.includes(search) ||
        p.id.toLowerCase().includes(search)
      )
    }

    // Estado filter
    if (estadoFilter !== 'all') {
      result = result.filter(p => p.estado === estadoFilter)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
          break
        case 'total':
          comparison = Number(a.total) - Number(b.total)
          break
        case 'nombre_cliente':
          comparison = (a.nombre_cliente || '').localeCompare(b.nombre_cliente || '')
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [pedidos, searchTerm, estadoFilter, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSorted.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredAndSorted, currentPage])

  // Reset page when filters change
  const handleFilterChange = (newFilter: EstadoFilter) => {
    setEstadoFilter(newFilter)
    setCurrentPage(1)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <IconArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <IconArrowDown className="h-3 w-3 ml-1" />
    )
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Cliente', 'Telefono', 'Email', 'Items', 'Subtotal', 'Envio', 'Total', 'Metodo Pago', 'Estado', 'Fecha']
    const rows = filteredAndSorted.map(p => {
      const items = p.items as { cantidad: number }[]
      const totalItems = items?.reduce((sum, item) => sum + item.cantidad, 0) || 0
      const metodo = p.metodo_pago || 'stripe'
      return [
        p.id,
        p.nombre_cliente,
        p.telefono || p.telefono_cliente,
        p.email_cliente,
        totalItems,
        p.subtotal,
        p.costo_envio,
        p.total,
        METODO_PAGO_CONFIG[metodo]?.label || 'Tarjeta',
        ESTADO_CONFIG[p.estado || 'pendiente_pago']?.label,
        new Date(p.created_at!).toLocaleDateString('es-MX'),
      ]
    })

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Check if order is old and still pending
  const isOldPending = (pedido: Pedido) => {
    if (pedido.estado !== 'pendiente_pago') return false
    const created = new Date(pedido.created_at!)
    const now = new Date()
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
    return hoursDiff > 24
  }

  // Count by status for tabs
  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: pedidos.length }
    pedidos.forEach(p => {
      const estado = p.estado || 'pendiente_pago'
      counts[estado] = (counts[estado] || 0) + 1
    })
    return counts
  }, [pedidos])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <IconCurrencyDollar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpis.ventasMes.toLocaleString('es-MX')}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.totalPedidosMes} pedidos este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes Pago</CardTitle>
            <IconClock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{kpis.pendientesPago}</div>
            <p className="text-xs text-muted-foreground">
              Esperando pago
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Enviar</CardTitle>
            <IconTruck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpis.pendientesEnvio}</div>
            <p className="text-xs text-muted-foreground">
              Pagados, listos para enviar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <IconShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Math.round(kpis.ticketPromedio).toLocaleString('es-MX')}</div>
            <p className="text-xs text-muted-foreground">
              Por pedido pagado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa Cancelacion</CardTitle>
            <IconX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.tasaCancelacion.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <IconShoppingCart className="h-5 w-5" />
              Pedidos ({filteredAndSorted.length})
            </CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative">
                <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, telefono, ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-8 w-full md:w-[280px]"
                />
              </div>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <IconDownload className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Tabs */}
          <Tabs value={estadoFilter} onValueChange={(v) => handleFilterChange(v as EstadoFilter)} className="mb-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all" className="gap-1">
                Todos
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{countByStatus.all || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pendiente_pago" className="gap-1">
                <IconClock className="h-3 w-3" />
                Pendiente Pago
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-yellow-100">{countByStatus.pendiente_pago || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pagado" className="gap-1">
                <IconCurrencyDollar className="h-3 w-3" />
                Pagado
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-green-100">{countByStatus.pagado || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="enviado" className="gap-1">
                <IconTruck className="h-3 w-3" />
                Enviado
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-blue-100">{countByStatus.enviado || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="entregado" className="gap-1">
                <IconCheck className="h-3 w-3" />
                Entregado
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-emerald-100">{countByStatus.entregado || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cancelado" className="gap-1">
                <IconX className="h-3 w-3" />
                Cancelado
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-red-100">{countByStatus.cancelado || 0}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('nombre_cliente')}
                  >
                    <div className="flex items-center">
                      Cliente
                      <SortIcon field="nombre_cliente" />
                    </div>
                  </TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-end">
                      Total
                      <SortIcon field="total" />
                    </div>
                  </TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center">
                      Fecha
                      <SortIcon field="created_at" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No hay pedidos que coincidan con los filtros
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((pedido) => {
                    const items = pedido.items as { cantidad: number }[]
                    const totalItems = items?.reduce((sum, item) => sum + item.cantidad, 0) || 0
                    const estado = pedido.estado || 'pendiente_pago'
                    const config = ESTADO_CONFIG[estado]
                    const isOld = isOldPending(pedido)

                    return (
                      <TableRow key={pedido.id} className={isOld ? 'bg-yellow-50' : ''}>
                        <TableCell className="font-mono text-xs">
                          {pedido.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isOld && (
                              <IconAlertTriangle className="h-4 w-4 text-yellow-500" title="Pedido antiguo pendiente" />
                            )}
                            {pedido.nombre_cliente}
                          </div>
                        </TableCell>
                        <TableCell>{pedido.telefono || pedido.telefono_cliente}</TableCell>
                        <TableCell className="text-center">{totalItems}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(pedido.total).toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const metodo = pedido.metodo_pago || 'stripe'
                            const metodoConfig = METODO_PAGO_CONFIG[metodo]
                            return (
                              <Badge className={`${metodoConfig.bgColor} ${metodoConfig.textColor} ${metodoConfig.borderColor} gap-1 border`}>
                                {metodo === 'stripe' ? (
                                  <IconCreditCard className="h-3 w-3" />
                                ) : (
                                  <IconCash className="h-3 w-3" />
                                )}
                                {metodoConfig.shortLabel}
                              </Badge>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${config.color} gap-1 border`}>
                            {config.icon}
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(pedido.created_at!).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          <Link href={`/pedidos/${pedido.id}`}>
                            <Button variant="ghost" size="sm">
                              <IconEye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)} de {filteredAndSorted.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <IconChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Pagina {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <IconChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
