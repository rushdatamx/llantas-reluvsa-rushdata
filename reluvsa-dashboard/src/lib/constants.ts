import { PipelineStage } from '@/types/database'

export const PIPELINE_STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: 'explorando', label: 'Explorando', color: 'bg-blue-500' },
  { id: 'cotizado', label: 'Cotizado', color: 'bg-purple-500' },
  { id: 'link_enviado', label: 'Link Enviado', color: 'bg-yellow-500' },
  { id: 'pagado', label: 'Pagado', color: 'bg-green-500' },
  { id: 'entregado', label: 'Entregado', color: 'bg-emerald-600' },
  { id: 'perdido', label: 'Perdido', color: 'bg-gray-500' },
]

export const PEDIDO_ESTADOS = {
  pendiente_pago: { label: 'Pendiente de Pago', color: 'bg-yellow-500' },
  pagado: { label: 'Pagado', color: 'bg-green-500' },
  enviado: { label: 'Enviado', color: 'bg-blue-500' },
  entregado: { label: 'Entregado', color: 'bg-emerald-600' },
  cancelado: { label: 'Cancelado', color: 'bg-red-500' },
}

export const METODO_PAGO_CONFIG = {
  stripe: {
    label: 'Tarjeta',
    shortLabel: 'Tarjeta',
    icon: 'CreditCard',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  efectivo_cod: {
    label: 'Efectivo (COD)',
    shortLabel: 'Efectivo',
    icon: 'Banknote',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
} as const

export const NEGOCIO = {
  nombre: 'RELUVSA Berriozábal',
  direccion: 'Calle F. Berriozábal 1982, Comercial Dos Mil, 87058 Ciudad Victoria, Tamps.',
  telefono: '+52 834 270 9767',
  googleMaps: 'https://share.google/MWTkvQe16I0veKV1p',
  emailAdmin: 'jorgepensado1996@gmail.com',
  precioAlineacion: 250,
  envioGratisMinimo: 2499,
  costoPorParEnvio: 299,
}

export const NAV_ITEMS = [
  { title: 'Dashboard', href: '/', icon: 'IconDashboard' },
  { title: 'Pipeline', href: '/pipeline', icon: 'IconKanban' },
  { title: 'Conversaciones', href: '/conversations', icon: 'IconMessageCircle' },
  { title: 'Cotizador', href: '/cotizador', icon: 'IconCalculator' },
  { title: 'Inventario', href: '/inventario', icon: 'IconPackage' },
  { title: 'Pedidos', href: '/pedidos', icon: 'IconShoppingCart' },
]
