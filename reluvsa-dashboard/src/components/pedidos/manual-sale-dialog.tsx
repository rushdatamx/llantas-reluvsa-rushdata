'use client'

import { useState, useMemo } from 'react'
import { ProductoInventario, SesionChat } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  IconPlus,
  IconTrash,
  IconSearch,
  IconLoader2,
  IconCheck,
  IconBuildingStore,
  IconCash,
  IconCreditCard,
  IconUser,
  IconPhone,
  IconMessageCircle,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { buscarLeadPorTelefono, crearVentaManual, VentaManualItem } from '@/lib/actions/manual-sale'

interface ManualSaleDialogProps {
  productos: ProductoInventario[]
}

interface ItemVenta {
  producto: ProductoInventario
  cantidad: number
}

export function ManualSaleDialog({ productos }: ManualSaleDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'buscar' | 'nuevo'>('buscar')

  // Estado para búsqueda de lead
  const [telefonoBusqueda, setTelefonoBusqueda] = useState('')
  const [buscandoLead, setBuscandoLead] = useState(false)
  const [sesionesEncontradas, setSesionesEncontradas] = useState<SesionChat[]>([])
  const [sesionSeleccionada, setSesionSeleccionada] = useState<SesionChat | null>(null)

  // Estado del formulario
  const [telefono, setTelefono] = useState('')
  const [nombreCliente, setNombreCliente] = useState('')
  const [items, setItems] = useState<ItemVenta[]>([])
  const [metodoPago, setMetodoPago] = useState<'efectivo_sucursal' | 'tarjeta_sucursal'>('efectivo_sucursal')
  const [notas, setNotas] = useState('')

  // Estado para selector de productos
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Estado para guardar
  const [guardando, setGuardando] = useState(false)

  // Normalizar medida para búsqueda flexible
  const normalizarParaBusqueda = (texto: string): string => {
    return texto
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[\/\-\.]/g, '')
      .replace(/r/gi, '')
  }

  const filteredProductos = useMemo(() => {
    if (!searchQuery.trim()) return productos.slice(0, 20)

    const queryOriginal = searchQuery.toLowerCase().trim()
    const queryNormalizada = normalizarParaBusqueda(searchQuery)

    return productos
      .filter((p) => {
        const enDescripcion = p.descripcion?.toLowerCase().includes(queryOriginal)
        const enTag = p.tag?.toLowerCase().includes(queryOriginal)
        const medidaNormalizada = normalizarParaBusqueda(p.medida || '')
        const enMedidaNormalizada = medidaNormalizada.includes(queryNormalizada)
        const enMedidaOriginal = p.medida?.toLowerCase().includes(queryOriginal)
        return enDescripcion || enTag || enMedidaNormalizada || enMedidaOriginal
      })
      .slice(0, 20)
  }, [productos, searchQuery])

  // Buscar lead por teléfono
  const handleBuscarLead = async () => {
    if (!telefonoBusqueda.trim() || telefonoBusqueda.length < 6) {
      toast.error('Ingresa al menos 6 dígitos del teléfono')
      return
    }

    setBuscandoLead(true)
    setSesionesEncontradas([])
    setSesionSeleccionada(null)

    try {
      const result = await buscarLeadPorTelefono(telefonoBusqueda)
      if (result.success && result.sesiones) {
        setSesionesEncontradas(result.sesiones)
        if (result.sesiones.length === 0) {
          toast.info('No se encontraron conversaciones con este teléfono')
        }
      } else {
        toast.error(result.error || 'Error al buscar')
      }
    } catch (error) {
      toast.error('Error al buscar lead')
    } finally {
      setBuscandoLead(false)
    }
  }

  // Seleccionar una sesión encontrada
  const handleSeleccionarSesion = (sesion: SesionChat) => {
    setSesionSeleccionada(sesion)
    // Pre-llenar datos del cliente
    setTelefono(sesion.telefono || sesion.telefono_cliente || '')
    setNombreCliente(sesion.nombre_cliente || '')

    // Si tiene carrito, pre-llenar productos
    if (sesion.carrito && Array.isArray(sesion.carrito)) {
      const itemsDelCarrito: ItemVenta[] = sesion.carrito
        .filter(item => item.producto)
        .map(item => ({
          producto: item.producto as ProductoInventario,
          cantidad: item.cantidad || 1,
        }))
      if (itemsDelCarrito.length > 0) {
        setItems(itemsDelCarrito)
      }
    }
  }

  // Agregar producto
  const addItem = (producto: ProductoInventario) => {
    const existing = items.find((i) => i.producto.snapshot_id === producto.snapshot_id)
    if (existing) {
      setItems(
        items.map((i) =>
          i.producto.snapshot_id === producto.snapshot_id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        )
      )
    } else {
      setItems([...items, { producto, cantidad: 1 }])
    }
    setSearchOpen(false)
    setSearchQuery('')
  }

  // Actualizar cantidad
  const updateCantidad = (snapshotId: string, cantidad: number) => {
    if (cantidad < 1) {
      removeItem(snapshotId)
      return
    }
    setItems(
      items.map((i) =>
        i.producto.snapshot_id === snapshotId ? { ...i, cantidad } : i
      )
    )
  }

  // Remover producto
  const removeItem = (snapshotId: string) => {
    setItems(items.filter((i) => i.producto.snapshot_id !== snapshotId))
  }

  // Calcular total
  const total = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (Number(item.producto.precio_con_iva) || 0) * item.cantidad,
      0
    )
  }, [items])

  // Guardar venta
  const handleGuardar = async () => {
    // Validaciones
    if (!telefono.trim()) {
      toast.error('El teléfono es requerido')
      return
    }
    if (!nombreCliente.trim()) {
      toast.error('El nombre del cliente es requerido')
      return
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }

    setGuardando(true)

    try {
      const ventaItems: VentaManualItem[] = items.map(item => ({
        snapshot_id: item.producto.snapshot_id,
        descripcion: item.producto.descripcion || '',
        medida: item.producto.medida || '',
        precio_con_iva: Number(item.producto.precio_con_iva) || 0,
        cantidad: item.cantidad,
      }))

      const result = await crearVentaManual({
        telefono: telefono.trim(),
        nombre_cliente: nombreCliente.trim(),
        items: ventaItems,
        metodo_pago: metodoPago,
        notas: notas.trim() || undefined,
        lead_id: sesionSeleccionada?.id || null,
      })

      if (result.success) {
        toast.success('Venta registrada correctamente')
        handleReset()
        setOpen(false)
      } else {
        toast.error(result.error || 'Error al registrar la venta')
      }
    } catch (error) {
      toast.error('Error al guardar la venta')
    } finally {
      setGuardando(false)
    }
  }

  // Reset del formulario
  const handleReset = () => {
    setActiveTab('buscar')
    setTelefonoBusqueda('')
    setSesionesEncontradas([])
    setSesionSeleccionada(null)
    setTelefono('')
    setNombreCliente('')
    setItems([])
    setMetodoPago('efectivo_sucursal')
    setNotas('')
    setSearchQuery('')
  }

  // Formatear fecha relativa
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Sin actividad'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `hace ${diffMins} min`
    if (diffHours < 24) return `hace ${diffHours} h`
    if (diffDays < 7) return `hace ${diffDays} días`
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) handleReset()
    }}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <IconBuildingStore className="mr-2 h-4 w-4" />
          Registrar Venta Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconBuildingStore className="h-5 w-5 text-purple-600" />
            Registrar Venta en Sucursal
          </DialogTitle>
          <DialogDescription>
            Registra una venta realizada en la sucursal. Puedes vincularla a una conversación existente del bot.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'buscar' | 'nuevo')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buscar" className="gap-2">
              <IconSearch className="h-4 w-4" />
              Buscar Lead
            </TabsTrigger>
            <TabsTrigger value="nuevo" className="gap-2">
              <IconUser className="h-4 w-4" />
              Cliente Nuevo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buscar" className="space-y-4 mt-4">
            {/* Búsqueda de lead */}
            <div className="space-y-2">
              <Label>Teléfono del cliente</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: 8341234567"
                  value={telefonoBusqueda}
                  onChange={(e) => setTelefonoBusqueda(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscarLead()}
                />
                <Button onClick={handleBuscarLead} disabled={buscandoLead}>
                  {buscandoLead ? (
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <IconSearch className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Resultados de búsqueda */}
            {sesionesEncontradas.length > 0 && (
              <div className="space-y-2">
                <Label>Conversaciones encontradas</Label>
                <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                  {sesionesEncontradas.map((sesion) => (
                    <div
                      key={sesion.id}
                      onClick={() => handleSeleccionarSesion(sesion)}
                      className={`p-3 cursor-pointer hover:bg-muted transition-colors ${
                        sesionSeleccionada?.id === sesion.id ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {sesionSeleccionada?.id === sesion.id && (
                            <IconCheck className="h-4 w-4 text-purple-600" />
                          )}
                          <span className="font-medium">
                            {sesion.nombre_cliente || 'Sin nombre'}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {sesion.pipeline_stage || 'explorando'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <IconPhone className="h-3 w-3" />
                          {sesion.telefono?.replace('whatsapp:+521', '') || sesion.telefono_cliente}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconMessageCircle className="h-3 w-3" />
                          {formatRelativeTime(sesion.ultimo_mensaje_at)}
                        </span>
                      </div>
                      {sesion.carrito && Array.isArray(sesion.carrito) && sesion.carrito.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Carrito: {sesion.carrito.length} producto(s)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sesionSeleccionada && (
              <div className="bg-purple-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-purple-800">
                  Lead vinculado: {sesionSeleccionada.nombre_cliente || sesionSeleccionada.telefono}
                </p>
                <p className="text-purple-600 text-xs">
                  La venta se vinculará a esta conversación y actualizará su estado a &quot;Entregado&quot;
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="nuevo" className="mt-4">
            <p className="text-sm text-muted-foreground">
              Registra una venta sin vincular a una conversación del bot.
            </p>
          </TabsContent>
        </Tabs>

        {/* Formulario principal (siempre visible) */}
        <div className="space-y-4 border-t pt-4">
          {/* Datos del cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                placeholder="8341234567"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del cliente *</Label>
              <Input
                id="nombre"
                placeholder="Nombre completo"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
              />
            </div>
          </div>

          {/* Selector de productos */}
          <div className="space-y-2">
            <Label>Productos vendidos *</Label>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <IconPlus className="mr-2 h-4 w-4" />
                  Agregar producto
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar por medida, marca..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No se encontraron productos</CommandEmpty>
                    <CommandGroup>
                      {filteredProductos.map((producto) => (
                        <CommandItem
                          key={producto.snapshot_id}
                          value={producto.snapshot_id}
                          onSelect={() => addItem(producto)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col flex-1">
                            <span className="font-medium truncate">
                              {producto.descripcion}
                            </span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{producto.medida}</span>
                              <Badge variant="secondary" className="text-xs">
                                {producto.tag || 'TORNEL'}
                              </Badge>
                              <span className="ml-auto font-medium text-foreground">
                                ${Number(producto.precio_con_iva).toLocaleString('es-MX')}
                              </span>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Tabla de productos agregados */}
            {items.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-[80px]">Cant.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.producto.snapshot_id}>
                        <TableCell>
                          <div className="font-medium truncate max-w-[180px]">
                            {item.producto.descripcion}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.producto.medida}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) =>
                              updateCantidad(
                                item.producto.snapshot_id,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-16 h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(
                            Number(item.producto.precio_con_iva) * item.cantidad
                          ).toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeItem(item.producto.snapshot_id)}
                          >
                            <IconTrash className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={metodoPago === 'efectivo_sucursal' ? 'default' : 'outline'}
                className={metodoPago === 'efectivo_sucursal' ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={() => setMetodoPago('efectivo_sucursal')}
              >
                <IconCash className="mr-2 h-4 w-4" />
                Efectivo
              </Button>
              <Button
                type="button"
                variant={metodoPago === 'tarjeta_sucursal' ? 'default' : 'outline'}
                className={metodoPago === 'tarjeta_sucursal' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                onClick={() => setMetodoPago('tarjeta_sucursal')}
              >
                <IconCreditCard className="mr-2 h-4 w-4" />
                Tarjeta
              </Button>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea
              id="notas"
              placeholder="Observaciones adicionales..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
            />
          </div>

          {/* Total */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total a registrar:</span>
              <span className="text-2xl font-bold text-purple-600">
                ${total.toLocaleString('es-MX')} MXN
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sin envío (entrega en sucursal)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={guardando || items.length === 0 || !telefono || !nombreCliente}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {guardando ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <IconCheck className="mr-2 h-4 w-4" />
                Registrar Venta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
