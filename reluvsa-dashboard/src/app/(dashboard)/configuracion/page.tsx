import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IconSettings } from '@tabler/icons-react'
import { NEGOCIO } from '@/lib/constants'

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">
          Ajustes de la plataforma
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconSettings className="h-5 w-5" />
              Información del Negocio
            </CardTitle>
            <CardDescription>
              Datos actuales de configuración
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Nombre</p>
              <p className="text-muted-foreground">{NEGOCIO.nombre}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Dirección</p>
              <p className="text-muted-foreground">{NEGOCIO.direccion}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Teléfono</p>
              <p className="text-muted-foreground">{NEGOCIO.telefono}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email Admin</p>
              <p className="text-muted-foreground">{NEGOCIO.emailAdmin}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración de Envíos</CardTitle>
            <CardDescription>
              Reglas de envío del chatbot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Envío gratis a partir de</p>
              <p className="text-muted-foreground">
                ${NEGOCIO.envioGratisMinimo.toLocaleString('es-MX')} MXN
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Costo por par de llantas</p>
              <p className="text-muted-foreground">
                ${NEGOCIO.costoPorParEnvio.toLocaleString('es-MX')} MXN
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Precio Alineación</p>
              <p className="text-muted-foreground">
                ${NEGOCIO.precioAlineacion.toLocaleString('es-MX')} MXN
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
