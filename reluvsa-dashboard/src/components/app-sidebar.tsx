'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  IconDashboard,
  IconLayoutKanban,
  IconMessageCircle,
  IconCalculator,
  IconPackage,
  IconShoppingCart,
  IconLogout,
  IconSettings,
} from '@tabler/icons-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const navItems = [
  { title: 'Dashboard', href: '/', icon: IconDashboard },
  { title: 'Pipeline', href: '/pipeline', icon: IconLayoutKanban },
  { title: 'Conversaciones', href: '/conversations', icon: IconMessageCircle },
  { title: 'Cotizador', href: '/cotizador', icon: IconCalculator },
  { title: 'Inventario', href: '/inventario', icon: IconPackage },
  { title: 'Pedidos', href: '/pedidos', icon: IconShoppingCart },
]

export function AppSidebar() {
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    window.location.href = '/login'
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Image
          src="/rushdata-icono.png"
          alt="RELUVSA"
          width={40}
          height={40}
          className="rounded-lg"
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/configuracion'}>
                  <Link href="/configuracion">
                    <IconSettings className="h-4 w-4" />
                    <span>Ajustes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <IconLogout className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
