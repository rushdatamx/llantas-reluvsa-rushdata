'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  IconArrowLeft,
  IconUser,
  IconPhone,
  IconMail,
  IconMapPin,
  IconPackage,
  IconCreditCard,
  IconTruck,
  IconExternalLink,
  IconMessageCircle,
  IconCheck,
  IconX,
  IconClock,
  IconNote,
  IconLoader2,
  IconCash,
} from '@tabler/icons-react'
import { Pedido } from '@/types/database'
import {
  updateEstadoPedido,
  updateNotasPedido,
  marcarComoEnviado,
  EstadoPedido,
} from '@/lib/actions/pedidos'
import { toast } from 'sonner'
import { METODO_PAGO_CONFIG } from '@/lib/constants'

interface OrderDetailClientProps {
  pedido: Pedido & { numero_guia?: string; carrier?: string; notas?: string }
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendiente_pago: {
    label: 'Pendiente de Pago',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: <IconClock className="h-4 w-4" />,
  },
  pagado: {
    label: 'Pagado',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: <IconCreditCard className="h-4 w-4" />,
  },
  enviado: {
    label: 'Enviado',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: <IconTruck className="h-4 w-4" />,
  },
  entregado: {
    label: 'Entregado',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: <IconCheck className="h-4 w-4" />,
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: <IconX className="h-4 w-4" />,
  },
}

// Define valid transitions
const TRANSICIONES_VALIDAS: Record<string, EstadoPedido[]> = {
  pendiente_pago: ['pagado', 'cancelado'],
  pagado: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
}

export function OrderDetailClient({ pedido }: OrderDetailClientProps) {
  const [isPending, startTransition] = useTransition()
  const [notas, setNotas] = useState(pedido.notas || '')
  const [notasSaved, setNotasSaved] = useState(true)
  const [envioDialogOpen, setEnvioDialogOpen] = useState(false)
  const [numeroGuia, setNumeroGuia] = useState(pedido.numero_guia || '')
  const [carrier, setCarrier] = useState(pedido.carrier || '')

  const estado = pedido.estado || 'pendiente_pago'
  const config = ESTADO_CONFIG[estado]
  const transicionesDisponibles = TRANSICIONES_VALIDAS[estado] || []

  const items = pedido.items as { cantidad: number; descripcion: string; precio_unitario: number; medida?: string }[]
  const totalItems = items?.reduce((sum, item) => sum + item.cantidad, 0) || 0

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const handleEstadoChange = async (nuevoEstado: EstadoPedido) => {
    // If changing to "enviado", show dialog for tracking info
    if (nuevoEstado === 'enviado') {
      setEnvioDialogOpen(true)
      return
    }

    startTransition(async () => {
      const result = await updateEstadoPedido(pedido.id, nuevoEstado)
      if (result.success) {
        toast.success(`Estado actualizado a: ${ESTADO_CONFIG[nuevoEstado].label}`)
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  const handleMarcarEnviado = async () => {
    if (!numeroGuia.trim()) {
      toast.error('Por favor ingresa el numero de guia')
      return
    }

    startTransition(async () => {
      const result = await marcarComoEnviado(pedido.id, numeroGuia, carrier)
      if (result.success) {
        toast.success('Pedido marcado como enviado')
        setEnvioDialogOpen(false)
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  const handleSaveNotas = async () => {
    startTransition(async () => {
      const result = await updateNotasPedido(pedido.id, notas)
      if (result.success) {
        toast.success('Notas guardadas')
        setNotasSaved(true)
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/pedidos">
            <Button variant="ghost" size="icon">
              <IconArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Detalle del Pedido</h1>
            <p className="text-muted-foreground font-mono">
              ID: {pedido.id.slice(0, 8)}...
            </p>
          </div>
        </div>
        <Badge className={`${config.color} text-sm px-3 py-1.5 gap-1.5 border`}>
          {config.icon}
          {config.label}
        </Badge>
      </div>

      {/* Status Actions */}
      {transicionesDisponibles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Acciones disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {transicionesDisponibles.map((nuevoEstado) => {
                const targetConfig = ESTADO_CONFIG[nuevoEstado]
                return (
                  <Button
                    key={nuevoEstado}
                    variant="outline"
                    onClick={() => handleEstadoChange(nuevoEstado)}
                    disabled={isPending}
                    className="gap-2"
                  >
                    {isPending ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      targetConfig.icon
                    )}
                    Marcar como {targetConfig.label}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Envio Dialog */}
      <Dialog open={envioDialogOpen} onOpenChange={setEnvioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informacion de Envio</DialogTitle>
            <DialogDescription>
              Ingresa los datos de la guia de envio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="numeroGuia">Numero de Guia *</Label>
              <Input
                id="numeroGuia"
                value={numeroGuia}
                onChange={(e) => setNumeroGuia(e.target.value)}
                placeholder="Ej: 1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrier">Paqueteria</Label>
              <Input
                id="carrier"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="Ej: DHL, Fedex, Estafeta"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnvioDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMarcarEnviado} disabled={isPending}>
              {isPending ? (
                <IconLoader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <IconTruck className="h-4 w-4 mr-2" />
              )}
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUser className="h-5 w-5" />
              Informacion del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <IconUser className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">{pedido.nombre_cliente || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <IconPhone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Telefono</p>
                <p className="font-medium">{pedido.telefono || pedido.telefono_cliente || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <IconMail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{pedido.email_cliente || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <IconMapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Direccion de envio</p>
                <p className="font-medium">{pedido.direccion_envio || '-'}</p>
              </div>
            </div>

            {pedido.lead_id && (
              <div className="pt-2">
                <Link href={`/conversations/${pedido.lead_id}`}>
                  <Button variant="outline" className="w-full gap-2">
                    <IconMessageCircle className="h-4 w-4" />
                    Ver conversacion
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconCreditCard className="h-5 w-5" />
              Informacion del Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Method Badge */}
            {(() => {
              const metodo = pedido.metodo_pago || 'stripe'
              const metodoConfig = METODO_PAGO_CONFIG[metodo]
              return (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Metodo de pago</span>
                  <Badge className={`${metodoConfig.bgColor} ${metodoConfig.textColor} ${metodoConfig.borderColor} gap-1.5 border`}>
                    {metodo === 'stripe' ? (
                      <IconCreditCard className="h-3.5 w-3.5" />
                    ) : (
                      <IconCash className="h-3.5 w-3.5" />
                    )}
                    {metodoConfig.label}
                  </Badge>
                </div>
              )
            })()}
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">${Number(pedido.subtotal || 0).toLocaleString('es-MX')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Costo de envio</span>
              <span className="font-medium">
                {Number(pedido.costo_envio) === 0 ? 'Gratis' : `$${Number(pedido.costo_envio || 0).toLocaleString('es-MX')}`}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-primary">${Number(pedido.total || 0).toLocaleString('es-MX')}</span>
            </div>

            {/* Only show payment link for Stripe payments */}
            {pedido.metodo_pago !== 'efectivo_cod' && pedido.stripe_payment_link_url && (
              <div className="pt-2">
                <a
                  href={pedido.stripe_payment_link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="w-full gap-2">
                    <IconExternalLink className="h-4 w-4" />
                    Ver link de pago
                  </Button>
                </a>
              </div>
            )}

            {/* COD specific notice */}
            {pedido.metodo_pago === 'efectivo_cod' && (
              <div className="pt-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800">
                  <IconCash className="h-4 w-4 inline mr-1.5" />
                  Pago en efectivo contra entrega. Coordinar cobro al momento de la entrega.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Info (if shipped) */}
        {(estado === 'enviado' || estado === 'entregado') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconTruck className="h-5 w-5" />
                Informacion de Envio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paqueteria</span>
                <span className="font-medium">{pedido.carrier || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Numero de Guia</span>
                <span className="font-medium font-mono">{pedido.numero_guia || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha de Envio</span>
                <span className="font-medium">{formatDate(pedido.fecha_envio)}</span>
              </div>
              {pedido.fecha_entrega && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de Entrega</span>
                  <span className="font-medium">{formatDate(pedido.fecha_entrega)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconNote className="h-5 w-5" />
              Notas Internas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Agregar notas sobre este pedido..."
              value={notas}
              onChange={(e) => {
                setNotas(e.target.value)
                setNotasSaved(false)
              }}
              rows={4}
            />
            <Button
              onClick={handleSaveNotas}
              disabled={isPending || notasSaved}
              className="w-full"
            >
              {isPending ? (
                <IconLoader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <IconCheck className="h-4 w-4 mr-2" />
              )}
              {notasSaved ? 'Guardado' : 'Guardar Notas'}
            </Button>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconPackage className="h-5 w-5" />
              Productos ({totalItems} {totalItems === 1 ? 'llanta' : 'llantas'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items?.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{item.descripcion}</p>
                    {item.medida && (
                      <p className="text-sm text-muted-foreground">Medida: {item.medida}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">x{item.cantidad}</p>
                    {item.precio_unitario && (
                      <p className="text-sm text-muted-foreground">
                        ${Number(item.precio_unitario).toLocaleString('es-MX')} c/u
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconClock className="h-5 w-5" />
              Historial del Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 rounded-lg bg-muted/50 border-2 border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Creado</p>
                <p className="font-medium text-sm">{formatDate(pedido.created_at)}</p>
              </div>
              <div className={`text-center p-4 rounded-lg border-2 ${pedido.fecha_pago ? 'bg-green-50 border-green-300' : 'bg-muted/50 border-transparent'}`}>
                <p className="text-sm text-muted-foreground mb-1">Pagado</p>
                <p className="font-medium text-sm">{formatDate(pedido.fecha_pago)}</p>
              </div>
              <div className={`text-center p-4 rounded-lg border-2 ${pedido.fecha_envio ? 'bg-blue-50 border-blue-300' : 'bg-muted/50 border-transparent'}`}>
                <p className="text-sm text-muted-foreground mb-1">Enviado</p>
                <p className="font-medium text-sm">{formatDate(pedido.fecha_envio)}</p>
              </div>
              <div className={`text-center p-4 rounded-lg border-2 ${pedido.fecha_entrega ? 'bg-emerald-50 border-emerald-300' : 'bg-muted/50 border-transparent'}`}>
                <p className="text-sm text-muted-foreground mb-1">Entregado</p>
                <p className="font-medium text-sm">{formatDate(pedido.fecha_entrega)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
