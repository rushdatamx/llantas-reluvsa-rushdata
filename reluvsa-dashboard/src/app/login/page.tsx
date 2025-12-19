'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error('Error al iniciar sesión', {
        description: error.message,
      })
      setLoading(false)
      return
    }

    toast.success('Bienvenido!')
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header con logo */}
      <header className="p-6">
        <Image
          src="/rushdata-icono.png"
          alt="RushData"
          width={36}
          height={36}
          className="opacity-80"
        />
      </header>

      {/* Contenido central */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Título y descripción */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
              Convierte chats en ventas.
            </h1>
            <p className="text-lg text-gray-400">
              Cotiza. Cobra. Cierra. En piloto automático con <span className="text-gray-600 font-medium">RushData</span>.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-gray-600">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 border-gray-200 focus:border-gray-300 focus:ring-0 placeholder:text-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-gray-600">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 border-gray-200 focus:border-gray-300 focus:ring-0 placeholder:text-gray-300"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Continuar'
              )}
            </Button>
          </form>

          {/* Footer del formulario */}
          <p className="text-center text-xs text-gray-400">
            Panel de administración exclusivo para vendedores autorizados.
          </p>
        </div>
      </main>
    </div>
  )
}
