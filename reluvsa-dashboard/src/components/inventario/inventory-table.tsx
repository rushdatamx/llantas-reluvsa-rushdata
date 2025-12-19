'use client'

import { useState, useMemo } from 'react'
import { ProductoInventario } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  IconSearch,
  IconPackage,
  IconAlertTriangle,
  IconAlertCircle,
  IconCurrencyDollar,
  IconArrowUp,
  IconArrowDown,
  IconDownload,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface InventoryTableProps {
  productos: ProductoInventario[]
}

type SortField = 'descripcion' | 'medida' | 'precio_con_iva' | 'existencia'
type SortOrder = 'asc' | 'desc'
type StockFilter = 'all' | 'low' | 'out'
type BrandFilter = 'all' | 'TORNEL' | 'NEREUS'

const ITEMS_PER_PAGE = 50

export function InventoryTable({ productos }: InventoryTableProps) {
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [sortField, setSortField] = useState<SortField>('medida')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = productos.length
    const lowStock = productos.filter(p => (p.existencia || 0) > 0 && (p.existencia || 0) <= 10).length
    const outOfStock = productos.filter(p => (p.existencia || 0) === 0).length
    const totalValue = productos.reduce((sum, p) => {
      return sum + (Number(p.precio_con_iva) || 0) * (p.existencia || 0)
    }, 0)
    return { total, lowStock, outOfStock, totalValue }
  }, [productos])

  // Helper function to get brand - only TORNEL or NEREUS
  const getBrand = (producto: ProductoInventario): 'TORNEL' | 'NEREUS' => {
    // Check tag first, then description
    if (producto.tag?.toUpperCase().includes('NEREUS') || producto.descripcion?.toUpperCase().includes('NEREUS')) {
      return 'NEREUS'
    }
    return 'TORNEL'
  }

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...productos]

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      result = result.filter(p =>
        p.descripcion?.toLowerCase().includes(searchLower) ||
        p.medida?.toLowerCase().includes(searchLower) ||
        p.tag?.toLowerCase().includes(searchLower)
      )
    }

    // Brand filter
    if (brandFilter !== 'all') {
      result = result.filter(p => getBrand(p) === brandFilter)
    }

    // Stock filter
    if (stockFilter === 'low') {
      result = result.filter(p => (p.existencia || 0) > 0 && (p.existencia || 0) <= 10)
    } else if (stockFilter === 'out') {
      result = result.filter(p => (p.existencia || 0) === 0)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'descripcion':
          comparison = (a.descripcion || '').localeCompare(b.descripcion || '')
          break
        case 'medida':
          comparison = (a.medida || '').localeCompare(b.medida || '')
          break
        case 'precio_con_iva':
          comparison = (Number(a.precio_con_iva) || 0) - (Number(b.precio_con_iva) || 0)
          break
        case 'existencia':
          comparison = (a.existencia || 0) - (b.existencia || 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [productos, search, brandFilter, stockFilter, sortField, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, currentPage])

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [search, brandFilter, stockFilter])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc'
      ? <IconArrowUp className="h-4 w-4 ml-1" />
      : <IconArrowDown className="h-4 w-4 ml-1" />
  }

  const exportToCSV = () => {
    const headers = ['Descripcion', 'Medida', 'Marca', 'Precio', 'Precio con IVA', 'Existencia']
    const rows = filteredProducts.map(p => [
      p.descripcion || '',
      p.medida || '',
      getBrand(p),
      Number(p.precio) || 0,
      Number(p.precio_con_iva) || 0,
      p.existencia || 0,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `inventario_reluvsa_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success('Inventario exportado correctamente')
  }

  const getStockBadge = (existencia: number | null) => {
    const stock = existencia || 0
    if (stock === 0) {
      return <Badge variant="destructive">Sin stock</Badge>
    }
    if (stock <= 10) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">Bajo: {stock}</Badge>
    }
    return <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">{stock}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <IconPackage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total}</div>
            <p className="text-xs text-muted-foreground">SKUs en catálogo</p>
          </CardContent>
        </Card>

        <Card className={cn(kpis.lowStock > 0 && "border-yellow-300 bg-yellow-50")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <IconAlertTriangle className={cn("h-4 w-4", kpis.lowStock > 0 ? "text-yellow-600" : "text-muted-foreground")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", kpis.lowStock > 0 && "text-yellow-700")}>{kpis.lowStock}</div>
            <p className="text-xs text-muted-foreground">Productos con 1-10 unidades</p>
          </CardContent>
        </Card>

        <Card className={cn(kpis.outOfStock > 0 && "border-red-300 bg-red-50")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <IconAlertCircle className={cn("h-4 w-4", kpis.outOfStock > 0 ? "text-red-600" : "text-muted-foreground")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", kpis.outOfStock > 0 && "text-red-700")}>{kpis.outOfStock}</div>
            <p className="text-xs text-muted-foreground">Productos agotados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <IconCurrencyDollar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${kpis.totalValue >= 1000000
                ? `${(kpis.totalValue / 1000000).toFixed(1)}M`
                : kpis.totalValue >= 1000
                  ? `${(kpis.totalValue / 1000).toFixed(0)}K`
                  : kpis.totalValue.toLocaleString('es-MX')
              }
            </div>
            <p className="text-xs text-muted-foreground">Valor total con IVA</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por medida, descripción o marca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Brand Tabs */}
              <Tabs value={brandFilter} onValueChange={(v) => setBrandFilter(v as BrandFilter)}>
                <TabsList>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="TORNEL">TORNEL</TabsTrigger>
                  <TabsTrigger value="NEREUS">NEREUS</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Stock Filter */}
              <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el stock</SelectItem>
                  <SelectItem value="low">Stock bajo (1-10)</SelectItem>
                  <SelectItem value="out">Sin stock</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select
                value={`${sortField}-${sortOrder}`}
                onValueChange={(v) => {
                  const [field, order] = v.split('-') as [SortField, SortOrder]
                  setSortField(field)
                  setSortOrder(order)
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medida-asc">Medida (A-Z)</SelectItem>
                  <SelectItem value="medida-desc">Medida (Z-A)</SelectItem>
                  <SelectItem value="precio_con_iva-asc">Precio (menor a mayor)</SelectItem>
                  <SelectItem value="precio_con_iva-desc">Precio (mayor a menor)</SelectItem>
                  <SelectItem value="existencia-asc">Stock (menor a mayor)</SelectItem>
                  <SelectItem value="existencia-desc">Stock (mayor a menor)</SelectItem>
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button variant="outline" onClick={exportToCSV} className="ml-auto">
                <IconDownload className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>

            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              Mostrando {paginatedProducts.length} de {filteredProducts.length} productos
              {filteredProducts.length !== productos.length && ` (${productos.length} total)`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('descripcion')}
                  >
                    <div className="flex items-center">
                      Descripción
                      <SortIcon field="descripcion" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('medida')}
                  >
                    <div className="flex items-center">
                      Medida
                      <SortIcon field="medida" />
                    </div>
                  </TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('precio_con_iva')}
                  >
                    <div className="flex items-center justify-end">
                      Precio c/IVA
                      <SortIcon field="precio_con_iva" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('existencia')}
                  >
                    <div className="flex items-center justify-end">
                      Existencia
                      <SortIcon field="existencia" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No se encontraron productos con los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProducts.map((item) => {
                    const brand = getBrand(item)
                    const isLowStock = (item.existencia || 0) <= 10 && (item.existencia || 0) > 0
                    const isOutOfStock = (item.existencia || 0) === 0

                    return (
                      <TableRow
                        key={item.snapshot_id}
                        className={cn(
                          isOutOfStock && "bg-red-50",
                          isLowStock && !isOutOfStock && "bg-yellow-50"
                        )}
                      >
                        <TableCell className="font-medium max-w-[300px]">
                          <span className="truncate block">{item.descripcion}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{item.medida}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{brand}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(item.precio_con_iva).toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell className="text-right">
                          {getStockBadge(item.existencia)}
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
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <IconChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <IconChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
