import { create } from 'zustand'
import { SesionChat, Mensaje, Pedido, ProductoInventario } from '@/types/database'

interface AppState {
  // Sesiones/Conversaciones
  sesiones: SesionChat[]
  setSesiones: (sesiones: SesionChat[]) => void
  selectedSesion: SesionChat | null
  setSelectedSesion: (sesion: SesionChat | null) => void

  // Mensajes
  mensajes: Mensaje[]
  setMensajes: (mensajes: Mensaje[]) => void
  addMensaje: (mensaje: Mensaje) => void

  // Pedidos
  pedidos: Pedido[]
  setPedidos: (pedidos: Pedido[]) => void

  // Inventario
  inventario: ProductoInventario[]
  setInventario: (inventario: ProductoInventario[]) => void

  // UI State
  isSidebarOpen: boolean
  toggleSidebar: () => void
  conversationFilter: 'mias' | 'todas' | 'handoff' | 'bot'
  setConversationFilter: (filter: 'mias' | 'todas' | 'handoff' | 'bot') => void
}

export const useAppStore = create<AppState>((set) => ({
  // Sesiones
  sesiones: [],
  setSesiones: (sesiones) => set({ sesiones }),
  selectedSesion: null,
  setSelectedSesion: (sesion) => set({ selectedSesion: sesion }),

  // Mensajes
  mensajes: [],
  setMensajes: (mensajes) => set({ mensajes }),
  addMensaje: (mensaje) => set((state) => ({
    mensajes: [...state.mensajes, mensaje]
  })),

  // Pedidos
  pedidos: [],
  setPedidos: (pedidos) => set({ pedidos }),

  // Inventario
  inventario: [],
  setInventario: (inventario) => set({ inventario }),

  // UI
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  conversationFilter: 'todas',
  setConversationFilter: (filter) => set({ conversationFilter: filter }),
}))
