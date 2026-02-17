'use client'

import { useState, useMemo } from 'react'
import { ProductoInventario } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  IconCopy,
  IconBrandWhatsapp,
  IconCheck,
  IconFileTypePdf,
  IconDiscount,
  IconPackage,
  IconCreditCard,
  IconLoader2,
  IconExternalLink,
} from '@tabler/icons-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { NEGOCIO } from '@/lib/constants'
import { toast } from 'sonner'
import { generarCotizacionPDF } from '@/lib/pdf/cotizacion-pdf'
import { createPaymentLink } from '@/lib/actions/payment-link'

interface CotizadorFormProps {
  productos: ProductoInventario[]
}

interface ItemCotizacion {
  producto: ProductoInventario
  cantidad: number
  precioOverride?: number // Precio manual, si difiere del inventario
}

interface ItemExterno {
  id: string
  descripcion: string
  precio: number
  cantidad: number
}

type DiscountType = 'none' | 'percentage' | 'fixed'

export function CotizadorForm({ productos }: CotizadorFormProps) {
  const [items, setItems] = useState<ItemCotizacion[]>([])
  const [itemsExternos, setItemsExternos] = useState<ItemExterno[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [incluyeEnvio, setIncluyeEnvio] = useState(false)
  const [incluyeAlineacion, setIncluyeAlineacion] = useState(false)
  const [copied, setCopied] = useState(false)
  const [discountType, setDiscountType] = useState<DiscountType>('none')
  const [discountValue, setDiscountValue] = useState<number>(0)

  // Estado para el formulario de producto externo
  const [externoDialogOpen, setExternoDialogOpen] = useState(false)
  const [externoDescripcion, setExternoDescripcion] = useState('')
  const [externoPrecio, setExternoPrecio] = useState<number>(0)
  const [externoCantidad, setExternoCantidad] = useState<number>(1)

  // Estado para el dialog de payment link
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentEmail, setPaymentEmail] = useState('')
  const [paymentDireccion, setPaymentDireccion] = useState('')
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [generatedPaymentLink, setGeneratedPaymentLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // Normalizar medida para búsqueda flexible (similar al chatbot)
  const normalizarParaBusqueda = (texto: string): string => {
    return texto
      .toLowerCase()
      .replace(/\s+/g, '') // Eliminar espacios
      .replace(/[\/\-\.]/g, '') // Eliminar separadores
      .replace(/r/gi, '') // Eliminar R
  }

  const filteredProductos = useMemo(() => {
    if (!searchQuery.trim()) return productos.slice(0, 20)

    const queryOriginal = searchQuery.toLowerCase().trim()
    const queryNormalizada = normalizarParaBusqueda(searchQuery)

    return productos
      .filter((p) => {
        // Búsqueda normal en descripción y tag
        const enDescripcion = p.descripcion?.toLowerCase().includes(queryOriginal)
        const enTag = p.tag?.toLowerCase().includes(queryOriginal)

        // Búsqueda flexible en medida (permite 205/, 205/55, 20555, etc.)
        const medidaNormalizada = normalizarParaBusqueda(p.medida || '')
        const enMedidaNormalizada = medidaNormalizada.includes(queryNormalizada)

        // También buscar en medida original
        const enMedidaOriginal = p.medida?.toLowerCase().includes(queryOriginal)

        return enDescripcion || enTag || enMedidaNormalizada || enMedidaOriginal
      })
      .slice(0, 20)
  }, [productos, searchQuery])

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

  const removeItem = (snapshotId: string) => {
    setItems(items.filter((i) => i.producto.snapshot_id !== snapshotId))
  }

  const getPrecioItem = (item: ItemCotizacion): number => {
    return item.precioOverride ?? Number(item.producto.precio_con_iva)
  }

  const updatePrecio = (snapshotId: string, precio: number) => {
    setItems(
      items.map((i) =>
        i.producto.snapshot_id === snapshotId
          ? { ...i, precioOverride: precio }
          : i
      )
    )
  }

  // Funciones para productos externos
  const addItemExterno = () => {
    if (!externoDescripcion.trim() || externoPrecio <= 0) {
      toast.error('Completa la descripción y precio')
      return
    }

    const nuevoItem: ItemExterno = {
      id: `externo-${Date.now()}`,
      descripcion: externoDescripcion.trim(),
      precio: externoPrecio,
      cantidad: externoCantidad || 1,
    }

    setItemsExternos([...itemsExternos, nuevoItem])
    setExternoDescripcion('')
    setExternoPrecio(0)
    setExternoCantidad(1)
    setExternoDialogOpen(false)
    toast.success('Producto externo agregado')
  }

  const updateCantidadExterno = (id: string, cantidad: number) => {
    if (cantidad < 1) {
      removeItemExterno(id)
      return
    }
    setItemsExternos(
      itemsExternos.map((i) => (i.id === id ? { ...i, cantidad } : i))
    )
  }

  const removeItemExterno = (id: string) => {
    setItemsExternos(itemsExternos.filter((i) => i.id !== id))
  }

  // Calculations
  // Subtotal de productos de inventario (llantas)
  const subtotalInventario = items.reduce(
    (sum, item) => sum + getPrecioItem(item) * item.cantidad,
    0
  )

  // Subtotal de productos externos (NO afectan envío)
  const subtotalExternos = itemsExternos.reduce(
    (sum, item) => sum + item.precio * item.cantidad,
    0
  )

  // Subtotal total
  const subtotal = subtotalInventario + subtotalExternos

  // Solo llantas del inventario cuentan para envío
  const totalLlantas = items.reduce((sum, item) => sum + item.cantidad, 0)
  const paresLlantas = Math.ceil(totalLlantas / 2)

  // Envío se calcula solo con subtotal de inventario (no externos)
  const costoEnvio = incluyeEnvio
    ? subtotalInventario >= NEGOCIO.envioGratisMinimo
      ? 0
      : paresLlantas * NEGOCIO.costoPorParEnvio
    : 0

  const costoAlineacion = incluyeAlineacion ? NEGOCIO.precioAlineacion : 0

  // Calculate discount
  const descuento = useMemo(() => {
    if (discountType === 'none' || discountValue <= 0) return 0
    if (discountType === 'percentage') {
      const percentage = Math.min(discountValue, 100) // Cap at 100%
      return Math.round(subtotal * (percentage / 100))
    }
    return Math.min(discountValue, subtotal) // Fixed amount, cap at subtotal
  }, [discountType, discountValue, subtotal])

  const total = subtotal - descuento + costoEnvio + costoAlineacion

  // Generate quotation text
  const generarTexto = () => {
    if (items.length === 0 && itemsExternos.length === 0) return ''

    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    let texto = `*COTIZACIÓN RELUVSA*\n`
    texto += `📅 Fecha: ${fecha}\n`
    if (nombreCliente) texto += `👤 Cliente: ${nombreCliente}\n`
    texto += `\n*PRODUCTOS:*\n`

    let contador = 1

    // Productos del inventario
    items.forEach((item) => {
      const precio = getPrecioItem(item)
      texto += `${contador}. ${item.producto.descripcion}\n`
      texto += `   Medida: ${item.producto.medida}\n`
      texto += `   Cantidad: ${item.cantidad}\n`
      texto += `   Precio unitario: $${precio.toLocaleString('es-MX')} (IVA incluido)\n`
      texto += `   Subtotal: $${(precio * item.cantidad).toLocaleString('es-MX')}\n\n`
      contador++
    })

    // Productos externos
    itemsExternos.forEach((item) => {
      texto += `${contador}. ${item.descripcion} _(Externo)_\n`
      texto += `   Cantidad: ${item.cantidad}\n`
      texto += `   Precio unitario: $${item.precio.toLocaleString('es-MX')}\n`
      texto += `   Subtotal: $${(item.precio * item.cantidad).toLocaleString('es-MX')}\n\n`
      contador++
    })

    texto += `*RESUMEN:*\n`
    texto += `Subtotal productos: $${subtotal.toLocaleString('es-MX')}\n`

    if (descuento > 0) {
      if (discountType === 'percentage') {
        texto += `Descuento (${discountValue}%): -$${descuento.toLocaleString('es-MX')}\n`
      } else {
        texto += `Descuento: -$${descuento.toLocaleString('es-MX')}\n`
      }
    }

    if (incluyeEnvio) {
      if (costoEnvio === 0) {
        texto += `Envío: GRATIS (compra mayor a $${NEGOCIO.envioGratisMinimo.toLocaleString('es-MX')})\n`
      } else {
        texto += `Envío: $${costoEnvio.toLocaleString('es-MX')}\n`
      }
    }

    if (incluyeAlineacion) {
      texto += `Alineación: $${costoAlineacion.toLocaleString('es-MX')}\n`
    }

    texto += `\n*TOTAL: $${total.toLocaleString('es-MX')} MXN*\n`
    texto += `\n_Precios incluyen IVA_\n`
    texto += `_Cotización válida por 7 días_\n`
    texto += `\n📍 ${NEGOCIO.direccion}\n`
    texto += `📞 ${NEGOCIO.telefono}\n`

    return texto
  }

  const textoCotizacion = generarTexto()

  const copiarAlPortapapeles = async () => {
    try {
      await navigator.clipboard.writeText(textoCotizacion)
      setCopied(true)
      toast.success('Cotización copiada al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Error al copiar')
    }
  }

  const descargarPDF = async () => {
    if (items.length === 0 && itemsExternos.length === 0) {
      toast.error('Agrega productos para generar el PDF')
      return
    }

    try {
      await generarCotizacionPDF({
        items,
        itemsExternos,
        nombreCliente,
        telefonoCliente,
        incluyeEnvio,
        incluyeAlineacion,
        subtotal,
        costoEnvio,
        costoAlineacion,
        total,
        totalLlantas,
        descuento,
        discountType,
        discountValue,
      })
      toast.success('PDF generado correctamente')
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar el PDF')
    }
  }

  // Verificar si hay productos (inventario o externos)
  const tieneProductos = items.length > 0 || itemsExternos.length > 0

  // Función para generar link de pago
  const generarPaymentLink = async () => {
    // Validaciones
    if (!nombreCliente.trim()) {
      toast.error('Ingresa el nombre del cliente')
      return
    }
    if (!telefonoCliente.trim()) {
      toast.error('Ingresa el teléfono del cliente')
      return
    }
    if (!paymentEmail.trim() || !paymentEmail.includes('@')) {
      toast.error('Ingresa un correo electrónico válido')
      return
    }
    if (!tieneProductos) {
      toast.error('Agrega al menos un producto')
      return
    }

    setIsGeneratingLink(true)
    setGeneratedPaymentLink(null)

    try {
      // Formatear teléfono con prefijo de WhatsApp para que funcionen las notificaciones
      const telefonoFormateado = `whatsapp:+521${telefonoCliente.replace(/\D/g, '')}`

      const result = await createPaymentLink({
        nombre_cliente: nombreCliente.trim(),
        telefono_cliente: telefonoFormateado,
        email_cliente: paymentEmail.trim() || undefined,
        direccion_envio: paymentDireccion.trim() || undefined,
        items: items.map(item => ({
          snapshot_id: item.producto.snapshot_id,
          descripcion: item.producto.descripcion || '',
          medida: item.producto.medida || '',
          precio_con_iva: getPrecioItem(item),
          cantidad: item.cantidad,
        })),
        items_externos: itemsExternos.map(item => ({
          id: item.id,
          descripcion: item.descripcion,
          precio: item.precio,
          cantidad: item.cantidad,
        })),
        subtotal,
        costo_envio: costoEnvio,
        costo_alineacion: costoAlineacion,
        descuento,
        total,
      })

      if (result.success && result.payment_link_url) {
        setGeneratedPaymentLink(result.payment_link_url)
        toast.success('Link de pago generado correctamente')
      } else {
        toast.error(result.error || 'Error al generar el link')
      }
    } catch (error) {
      console.error('Error generando payment link:', error)
      toast.error('Error al generar el link de pago')
    } finally {
      setIsGeneratingLink(false)
    }
  }

  // Copiar link de pago
  const copiarPaymentLink = async () => {
    if (!generatedPaymentLink) return
    try {
      await navigator.clipboard.writeText(generatedPaymentLink)
      setLinkCopied(true)
      toast.success('Link copiado al portapapeles')
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      toast.error('Error al copiar')
    }
  }

  // Enviar link por WhatsApp
  const enviarPaymentLinkWhatsApp = () => {
    if (!generatedPaymentLink || !telefonoCliente) return

    let phone = telefonoCliente.replace(/\D/g, '')
    if (!phone.startsWith('52')) phone = `52${phone}`

    const mensaje = `¡Hola ${nombreCliente.split(' ')[0]}!

Aquí está tu link de pago de RELUVSA:

💰 Total: $${total.toLocaleString('es-MX')} MXN

🔗 ${generatedPaymentLink}

El link es seguro y puedes pagar con tarjeta de crédito o débito.

¡Gracias por tu compra!`

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  // Reset del dialog de payment link
  const resetPaymentDialog = () => {
    setGeneratedPaymentLink(null)
    setLinkCopied(false)
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Left: Product Selection */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agregar Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start">
                    <IconSearch className="mr-2 h-4 w-4" />
                    Buscar producto...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar por medida, marca o descripción..."
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

              {/* Botón para agregar producto externo */}
              <Dialog open={externoDialogOpen} onOpenChange={setExternoDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" title="Agregar producto externo">
                    <IconPackage className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Producto Externo</DialogTitle>
                    <DialogDescription>
                      Agrega un producto que no está en el inventario de llantas.
                      Los productos externos no afectan el cálculo de envío.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="externo-desc">Descripción *</Label>
                      <Input
                        id="externo-desc"
                        placeholder="Ej: Válvulas de llanta, Aceite motor, etc."
                        value={externoDescripcion}
                        onChange={(e) => setExternoDescripcion(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="externo-precio">Precio unitario *</Label>
                        <Input
                          id="externo-precio"
                          type="number"
                          min={0}
                          placeholder="$0.00"
                          value={externoPrecio || ''}
                          onChange={(e) => setExternoPrecio(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="externo-cantidad">Cantidad</Label>
                        <Input
                          id="externo-cantidad"
                          type="number"
                          min={1}
                          value={externoCantidad}
                          onChange={(e) => setExternoCantidad(parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setExternoDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={addItemExterno}>
                      <IconPlus className="mr-2 h-4 w-4" />
                      Agregar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {tieneProductos && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-[130px]">Precio</TableHead>
                      <TableHead className="w-[100px]">Cantidad</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Productos del inventario */}
                    {items.map((item) => {
                      const precioActual = getPrecioItem(item)
                      const precioOriginal = Number(item.producto.precio_con_iva)
                      const precioModificado = item.precioOverride !== undefined && item.precioOverride !== precioOriginal
                      return (
                        <TableRow key={item.producto.snapshot_id}>
                          <TableCell>
                            <div className="font-medium truncate max-w-[200px]">
                              {item.producto.descripcion}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.producto.medida}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={precioActual || ''}
                                  onChange={(e) =>
                                    updatePrecio(
                                      item.producto.snapshot_id,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className={`w-28 pl-5 text-xs ${precioModificado ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : ''}`}
                                />
                              </div>
                              {precioModificado && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItems(
                                      items.map((i) =>
                                        i.producto.snapshot_id === item.producto.snapshot_id
                                          ? { ...i, precioOverride: undefined }
                                          : i
                                      )
                                    )
                                  }
                                  className="text-[10px] text-amber-600 hover:text-amber-800 text-left"
                                >
                                  Original: ${precioOriginal.toLocaleString('es-MX')} ↩
                                </button>
                              )}
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
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${(precioActual * item.cantidad).toLocaleString('es-MX')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.producto.snapshot_id)}
                            >
                              <IconTrash className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {/* Productos externos */}
                    {itemsExternos.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium truncate max-w-[200px] flex items-center gap-2">
                            {item.descripcion}
                            <Badge variant="outline" className="text-xs">
                              Externo
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${item.precio.toLocaleString('es-MX')} c/u
                          </div>
                        </TableCell>
                        <TableCell />
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) =>
                              updateCantidadExterno(
                                item.id,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(item.precio * item.cantidad).toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItemExterno(item.id)}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Opciones Adicionales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Incluir envío</Label>
                <p className="text-xs text-muted-foreground">
                  Gratis a partir de ${NEGOCIO.envioGratisMinimo.toLocaleString('es-MX')}
                </p>
              </div>
              <Switch checked={incluyeEnvio} onCheckedChange={setIncluyeEnvio} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Incluir alineación</Label>
                <p className="text-xs text-muted-foreground">
                  ${NEGOCIO.precioAlineacion.toLocaleString('es-MX')} MXN
                </p>
              </div>
              <Switch
                checked={incluyeAlineacion}
                onCheckedChange={setIncluyeAlineacion}
              />
            </div>

            {/* Discount Section */}
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 mb-3">
                <IconDiscount className="h-4 w-4 text-muted-foreground" />
                <Label>Descuento</Label>
              </div>
              <div className="flex gap-2">
                <div className="flex rounded-md border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDiscountType('none')}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      discountType === 'none'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    Sin
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`px-3 py-1.5 text-sm border-l transition-colors ${
                      discountType === 'percentage'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`px-3 py-1.5 text-sm border-l transition-colors ${
                      discountType === 'fixed'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    $
                  </button>
                </div>
                {discountType !== 'none' && (
                  <Input
                    type="number"
                    min={0}
                    max={discountType === 'percentage' ? 100 : undefined}
                    placeholder={discountType === 'percentage' ? '0-100' : 'Monto'}
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-28"
                  />
                )}
              </div>
              {descuento > 0 && (
                <p className="text-xs text-green-600 mt-2">
                  Descuento aplicado: -${descuento.toLocaleString('es-MX')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Quote Preview */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del cliente</Label>
              <Input
                placeholder="Nombre completo"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono (para WhatsApp)</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
                  whatsapp:+521
                </span>
                <Input
                  placeholder="8341234567"
                  value={telefonoCliente}
                  onChange={(e) => {
                    // Solo permitir dígitos y máximo 10 caracteres
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setTelefonoCliente(value)
                  }}
                  className="rounded-l-none"
                  maxLength={10}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ingresa los 10 dígitos del número (ej: 8341234567)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Resumen</span>
              <span className="text-2xl text-primary">
                ${total.toLocaleString('es-MX')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>
                Subtotal ({totalLlantas} llanta{totalLlantas !== 1 ? 's' : ''}
                {itemsExternos.length > 0 && ` + ${itemsExternos.reduce((sum, i) => sum + i.cantidad, 0)} externo${itemsExternos.reduce((sum, i) => sum + i.cantidad, 0) !== 1 ? 's' : ''}`})
              </span>
              <span>${subtotal.toLocaleString('es-MX')}</span>
            </div>
            {descuento > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  Descuento {discountType === 'percentage' ? `(${discountValue}%)` : ''}
                </span>
                <span>-${descuento.toLocaleString('es-MX')}</span>
              </div>
            )}
            {incluyeEnvio && (
              <div className="flex justify-between">
                <span>Envío</span>
                <span>
                  {costoEnvio === 0 ? (
                    <Badge variant="secondary">GRATIS</Badge>
                  ) : (
                    `$${costoEnvio.toLocaleString('es-MX')}`
                  )}
                </span>
              </div>
            )}
            {incluyeAlineacion && (
              <div className="flex justify-between">
                <span>Alineación</span>
                <span>${costoAlineacion.toLocaleString('es-MX')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span>
              <span>${total.toLocaleString('es-MX')} MXN</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vista Previa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={textoCotizacion}
              readOnly
              className="min-h-[200px] font-mono text-xs"
              placeholder="Agrega productos para generar la cotización"
            />
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={copiarAlPortapapeles}
                  disabled={!tieneProductos}
                >
                  {copied ? (
                    <IconCheck className="mr-2 h-4 w-4" />
                  ) : (
                    <IconCopy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={descargarPDF}
                  disabled={!tieneProductos}
                >
                  <IconFileTypePdf className="mr-2 h-4 w-4 text-red-600" />
                  Descargar PDF
                </Button>
              </div>

              {/* Botón para generar Link de Pago */}
              <Dialog
                open={paymentDialogOpen}
                onOpenChange={(open) => {
                  setPaymentDialogOpen(open)
                  if (!open) resetPaymentDialog()
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={!tieneProductos}
                  >
                    <IconCreditCard className="mr-2 h-4 w-4" />
                    Generar Link de Pago
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Generar Link de Pago</DialogTitle>
                    <DialogDescription>
                      {!generatedPaymentLink
                        ? 'Completa los datos opcionales y genera un link de pago seguro con Stripe.'
                        : 'Link generado correctamente. Copia o envía por WhatsApp.'
                      }
                    </DialogDescription>
                  </DialogHeader>

                  {!generatedPaymentLink ? (
                    <>
                      {/* Resumen del pedido */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between font-medium">
                          <span>Cliente:</span>
                          <span>{nombreCliente || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Teléfono:</span>
                          <span>{telefonoCliente || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Productos:</span>
                          <span>{items.length + itemsExternos.length} items</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                          <span>Total:</span>
                          <span className="text-primary">${total.toLocaleString('es-MX')} MXN</span>
                        </div>
                      </div>

                      {/* Campos del cliente */}
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label htmlFor="payment-email">Email *</Label>
                          <Input
                            id="payment-email"
                            type="email"
                            placeholder="cliente@email.com"
                            value={paymentEmail}
                            onChange={(e) => setPaymentEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-direccion">Dirección de envío (opcional)</Label>
                          <Textarea
                            id="payment-direccion"
                            placeholder="Calle, número, colonia, ciudad, CP"
                            value={paymentDireccion}
                            onChange={(e) => setPaymentDireccion(e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setPaymentDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={generarPaymentLink}
                          disabled={isGeneratingLink || !nombreCliente || !telefonoCliente || !paymentEmail}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isGeneratingLink ? (
                            <>
                              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generando...
                            </>
                          ) : (
                            <>
                              <IconCreditCard className="mr-2 h-4 w-4" />
                              Generar Link
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      {/* Link generado */}
                      <div className="space-y-4">
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <p className="text-sm text-green-800 dark:text-green-200 mb-2 font-medium">
                            Link de pago generado:
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              value={generatedPaymentLink}
                              readOnly
                              className="text-xs font-mono"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={copiarPaymentLink}
                            >
                              {linkCopied ? (
                                <IconCheck className="h-4 w-4 text-green-600" />
                              ) : (
                                <IconCopy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4 text-sm">
                          <p className="font-medium mb-1">Resumen del pedido:</p>
                          <p>Cliente: {nombreCliente}</p>
                          <p className="font-bold text-lg mt-2">
                            Total: ${total.toLocaleString('es-MX')} MXN
                          </p>
                        </div>
                      </div>

                      <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.open(generatedPaymentLink, '_blank')}
                        >
                          <IconExternalLink className="mr-2 h-4 w-4" />
                          Abrir Link
                        </Button>
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={enviarPaymentLinkWhatsApp}
                        >
                          <IconBrandWhatsapp className="mr-2 h-4 w-4" />
                          Enviar por WhatsApp
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
