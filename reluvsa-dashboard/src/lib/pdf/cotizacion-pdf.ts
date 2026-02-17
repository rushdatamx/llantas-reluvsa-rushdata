import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ProductoInventario } from '@/types/database'
import { NEGOCIO } from '@/lib/constants'

interface ItemCotizacion {
  producto: ProductoInventario
  cantidad: number
  precioOverride?: number
}

interface ItemExterno {
  id: string
  descripcion: string
  precio: number
  cantidad: number
}

type DiscountType = 'none' | 'percentage' | 'fixed'

interface CotizacionData {
  items: ItemCotizacion[]
  itemsExternos?: ItemExterno[]
  nombreCliente: string
  telefonoCliente: string
  incluyeEnvio: boolean
  incluyeAlineacion: boolean
  subtotal: number
  costoEnvio: number
  costoAlineacion: number
  total: number
  totalLlantas: number
  descuento?: number
  discountType?: DiscountType
  discountValue?: number
}

// IVA Rate
const IVA_RATE = 0.16

// Helper para formatear moneda con 2 decimales
const formatMoney = (amount: number): string => {
  return amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// RELUVSA Brand Colors
const COLORS = {
  yellow: [255, 237, 0] as [number, number, number],      // #FFED00
  black: [0, 0, 0] as [number, number, number],           // #000000
  red: [227, 25, 55] as [number, number, number],         // #E31937
  gray: [100, 100, 100] as [number, number, number],
  lightGray: [248, 249, 250] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  green: [34, 139, 34] as [number, number, number],
}

// Load image as base64
async function loadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function generarCotizacionPDF(data: CotizacionData): Promise<void> {
  const {
    items,
    itemsExternos = [],
    nombreCliente,
    telefonoCliente,
    incluyeEnvio,
    incluyeAlineacion,
    subtotal,
    costoEnvio,
    costoAlineacion,
    total,
    totalLlantas,
    descuento = 0,
    discountType = 'none',
    discountValue = 0,
  } = data

  const hasDiscount = descuento > 0

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Try to load logo
  let logoBase64: string | null = null
  try {
    logoBase64 = await loadImageAsBase64('/reluvsa-logo.jpg')
  } catch (error) {
    console.warn('Could not load logo:', error)
  }

  let yPos = 15

  // ========== HEADER WITH YELLOW BANNER ==========
  // Yellow banner at top
  doc.setFillColor(...COLORS.yellow)
  doc.rect(0, 0, pageWidth, 35, 'F')

  // Add logo if available
  if (logoBase64) {
    doc.addImage(logoBase64, 'JPEG', 15, 5, 50, 25)
  } else {
    // Fallback: Text logo
    doc.setFontSize(24)
    doc.setTextColor(...COLORS.black)
    doc.setFont('helvetica', 'bold')
    doc.text('RELUVSA', 20, 22)
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.red)
    doc.text('AUTOPARTES', 20, 28)
  }

  // Document title - right aligned on yellow banner
  doc.setFontSize(22)
  doc.setTextColor(...COLORS.black)
  doc.setFont('helvetica', 'bold')
  doc.text('COTIZACION', pageWidth - 20, 18, { align: 'right' })

  // Date on banner
  const fecha = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.black)
  doc.setFont('helvetica', 'normal')
  doc.text(fecha, pageWidth - 20, 26, { align: 'right' })

  yPos = 50

  // ========== CLIENT INFO ==========
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.red)
  doc.setFont('helvetica', 'bold')
  doc.text('DATOS DEL CLIENTE', 20, yPos)

  // Red underline
  doc.setDrawColor(...COLORS.red)
  doc.setLineWidth(0.5)
  doc.line(20, yPos + 2, 75, yPos + 2)

  yPos += 10
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.black)
  doc.setFont('helvetica', 'normal')

  if (nombreCliente) {
    doc.text(`Cliente: ${nombreCliente}`, 20, yPos)
    yPos += 6
  }
  if (telefonoCliente) {
    doc.text(`Telefono: ${telefonoCliente}`, 20, yPos)
    yPos += 6
  }
  if (!nombreCliente && !telefonoCliente) {
    doc.setTextColor(...COLORS.gray)
    doc.text('Cliente general', 20, yPos)
    yPos += 6
  }

  yPos += 8

  // ========== PRODUCTS TABLE ==========
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.red)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUCTOS', 20, yPos)

  // Red underline
  doc.setDrawColor(...COLORS.red)
  doc.line(20, yPos + 2, 52, yPos + 2)

  yPos += 8

  // Productos del inventario (mostrar precio SIN IVA)
  const tableDataInventario = items.map((item, idx) => {
    const precioConIva = item.precioOverride ?? Number(item.producto.precio_con_iva)
    const precioSinIva = precioConIva / (1 + IVA_RATE)
    const subtotalSinIva = precioSinIva * item.cantidad
    return [
      (idx + 1).toString(),
      item.producto.descripcion || '',
      item.producto.medida || '',
      item.cantidad.toString(),
      `$${formatMoney(precioSinIva)}`,
      `$${formatMoney(subtotalSinIva)}`,
    ]
  })

  // Productos externos (mostrar precio SIN IVA)
  const tableDataExternos = itemsExternos.map((item, idx) => {
    const precioConIva = item.precio
    const precioSinIva = precioConIva / (1 + IVA_RATE)
    const subtotalSinIva = precioSinIva * item.cantidad
    return [
      (items.length + idx + 1).toString(),
      `${item.descripcion} (Externo)`,
      '-',
      item.cantidad.toString(),
      `$${formatMoney(precioSinIva)}`,
      `$${formatMoney(subtotalSinIva)}`,
    ]
  })

  // Combinar ambas tablas
  const tableData = [...tableDataInventario, ...tableDataExternos]

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Descripcion', 'Medida', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.red,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [255, 252, 220], // Light yellow tint
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  })

  // Get the Y position after the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yPos = (doc as any).lastAutoTable.finalY + 15

  // ========== TOTALS SECTION ==========
  const totalsX = pageWidth - 85
  const totalsWidth = 65

  // Calcular subtotal sin IVA y monto de IVA
  const subtotalSinIva = subtotal / (1 + IVA_RATE)
  const montoIva = subtotal - subtotalSinIva

  // Calculate box height based on options
  let boxHeight = 50 // Base height for subtotal + IVA + total
  if (hasDiscount) boxHeight += 10
  if (incluyeEnvio) boxHeight += 10
  if (incluyeAlineacion) boxHeight += 10

  // Box for totals with yellow accent
  doc.setFillColor(...COLORS.lightGray)
  doc.setDrawColor(...COLORS.yellow)
  doc.setLineWidth(2)
  doc.roundedRect(totalsX - 10, yPos - 5, totalsWidth + 20, boxHeight, 3, 3, 'FD')

  doc.setFontSize(10)
  doc.setTextColor(...COLORS.black)
  doc.setFont('helvetica', 'normal')

  // Subtotal SIN IVA - mostrar conteo de llantas y externos si hay
  const totalExternos = itemsExternos.reduce((sum, item) => sum + item.cantidad, 0)
  let subtotalLabel = `Subtotal (${totalLlantas} llanta${totalLlantas !== 1 ? 's' : ''}`
  if (totalExternos > 0) {
    subtotalLabel += ` + ${totalExternos} ext.`
  }
  subtotalLabel += '):'
  doc.text(subtotalLabel, totalsX, yPos + 5)
  doc.text(`$${formatMoney(subtotalSinIva)}`, totalsX + totalsWidth, yPos + 5, { align: 'right' })

  let totalsYOffset = 12

  // IVA (16%)
  doc.text('IVA (16%):', totalsX, yPos + 5 + totalsYOffset)
  doc.text(`$${formatMoney(montoIva)}`, totalsX + totalsWidth, yPos + 5 + totalsYOffset, { align: 'right' })
  totalsYOffset += 10

  // Discount (se aplica después del IVA)
  if (hasDiscount) {
    const discountLabel = discountType === 'percentage'
      ? `Descuento (${discountValue}%):`
      : 'Descuento:'
    doc.setTextColor(...COLORS.green)
    doc.text(discountLabel, totalsX, yPos + 5 + totalsYOffset)
    doc.text(`-$${formatMoney(descuento)}`, totalsX + totalsWidth, yPos + 5 + totalsYOffset, { align: 'right' })
    doc.setTextColor(...COLORS.black)
    totalsYOffset += 10
  }

  // Shipping
  if (incluyeEnvio) {
    doc.text('Envio:', totalsX, yPos + 5 + totalsYOffset)
    if (costoEnvio === 0) {
      doc.setTextColor(...COLORS.green)
      doc.text('GRATIS', totalsX + totalsWidth, yPos + 5 + totalsYOffset, { align: 'right' })
      doc.setTextColor(...COLORS.black)
    } else {
      doc.text(`$${formatMoney(costoEnvio)}`, totalsX + totalsWidth, yPos + 5 + totalsYOffset, { align: 'right' })
    }
    totalsYOffset += 10
  }

  // Alignment
  if (incluyeAlineacion) {
    doc.text('Alineacion:', totalsX, yPos + 5 + totalsYOffset)
    doc.text(`$${formatMoney(costoAlineacion)}`, totalsX + totalsWidth, yPos + 5 + totalsYOffset, { align: 'right' })
    totalsYOffset += 10
  }

  // Total line separator
  doc.setDrawColor(...COLORS.red)
  doc.setLineWidth(0.5)
  doc.line(totalsX, yPos + totalsYOffset, totalsX + totalsWidth, yPos + totalsYOffset)

  // Total amount (con IVA incluido - mismo valor que antes)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.red)
  doc.text('TOTAL:', totalsX, yPos + 10 + totalsYOffset)
  doc.text(`$${formatMoney(total)} MXN`, totalsX + totalsWidth, yPos + 10 + totalsYOffset, { align: 'right' })

  // ========== NOTES ==========
  yPos = yPos + totalsYOffset + 30

  doc.setFontSize(9)
  doc.setTextColor(...COLORS.gray)
  doc.setFont('helvetica', 'italic')
  doc.text('* Precios antes de IVA', 20, yPos)
  doc.text('* Cotizacion valida por 7 dias', 20, yPos + 5)
  if (incluyeEnvio && costoEnvio === 0) {
    doc.text(`* Envio gratis por compra mayor a $${NEGOCIO.envioGratisMinimo.toLocaleString('es-MX')}`, 20, yPos + 10)
  }

  // ========== FOOTER WITH YELLOW BANNER ==========
  const footerY = pageHeight - 30

  // Yellow footer banner
  doc.setFillColor(...COLORS.yellow)
  doc.rect(0, footerY - 5, pageWidth, 35, 'F')

  // Red accent line at top of footer
  doc.setDrawColor(...COLORS.red)
  doc.setLineWidth(2)
  doc.line(0, footerY - 5, pageWidth, footerY - 5)

  doc.setFontSize(10)
  doc.setTextColor(...COLORS.black)
  doc.setFont('helvetica', 'bold')
  doc.text(NEGOCIO.nombre, 20, footerY + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(NEGOCIO.direccion, 20, footerY + 12)
  doc.text(`Tel: ${NEGOCIO.telefono}`, 20, footerY + 19)

  // Small logo or tagline on right side of footer
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.red)
  doc.text('AUTOPARTES', pageWidth - 20, footerY + 12, { align: 'right' })

  // ========== SAVE ==========
  const fileName = nombreCliente
    ? `Cotizacion_RELUVSA_${nombreCliente.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    : `Cotizacion_RELUVSA_${new Date().toISOString().split('T')[0]}.pdf`

  doc.save(fileName)
}
