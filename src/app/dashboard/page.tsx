'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [empresa, setEmpresa] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const router = useRouter()

  const ADMIN_EMAIL = 'jonathan94lds@hotmail.com'

  useEffect(() => {
    const cargarEmpresa = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setEsAdmin(user.email === ADMIN_EMAIL)

      const { data } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setEmpresa(data)

        if (data.fecha_vencimiento) {
          const hoy = new Date()
          const vence = new Date(data.fecha_vencimiento)
          const diff = Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
          setDiasRestantes(diff)
        }

        if (data.bloqueado) {
          router.push('/bloqueado')
          return
        }
      }

      setLoading(false)
    }
    cargarEmpresa()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  const modulos = [
    { icon: '👥', titulo: 'Clientes', descripcion: 'Base de clientes', ruta: '/clientes', color: 'bg-blue-50', iconBg: 'bg-blue-100' },
    { icon: '✨', titulo: 'Servicios', descripcion: 'Precios y duración', ruta: '/servicios', color: 'bg-purple-50', iconBg: 'bg-purple-100' },
    { icon: '📅', titulo: 'Citas', descripcion: 'Agenda del día', ruta: '/citas', color: 'bg-teal-50', iconBg: 'bg-teal-100' },
    { icon: '💰', titulo: 'Finanzas', descripcion: 'Ingresos y gastos', ruta: '/finanzas', color: 'bg-green-50', iconBg: 'bg-green-100' },
    { icon: '💬', titulo: 'WhatsApp', descripcion: 'Recordatorios', ruta: '/notificaciones', color: 'bg-emerald-50', iconBg: 'bg-emerald-100' },
    { icon: '🧾', titulo: 'Facturar', descripcion: 'Citas de hoy', ruta: '/facturacion', color: 'bg-orange-50', iconBg: 'bg-orange-100' },
  ]

  const getAlertaColor = () => {
    if (diasRestantes === null) return ''
    if (diasRestantes <= 0) return 'bg-red-500'
    if (diasRestantes <= 1) return 'bg-red-400'
    if (diasRestantes <= 2) return 'bg-orange-400'
    return 'bg-yellow-400'
  }

  const getAlertaMensaje = () => {
    if (diasRestantes === null) return ''
    if (diasRestantes <= 0) return '🔴 Tu suscripción ha vencido. Contacta al administrador para renovar.'
    if (diasRestantes === 1) return '⚠️ Tu suscripción vence mañana. Contacta al administrador para renovar.'
    return `⚠️ Tu suscripción vence en ${diasRestantes} días. Contacta al administrador para renovar.`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-sm">Bienvenida 👋</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{empresa?.nombre || 'Nails Pro'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-400 rounded-2xl flex items-center justify-center shadow-sm">
              <span className="text-xl">💅</span>
            </div>
            <button onClick={handleLogout} className="flex flex-col items-center justify-center gap-0.5 w-14 h-14 bg-gray-100 rounded-2xl">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="text-[10px] font-semibold text-red-500">Salir</span>
            </button>
          </div>
        </div>
      </div>

      {diasRestantes !== null && diasRestantes <= 5 && (
        <div className={`${getAlertaColor()} mx-4 mt-4 rounded-3xl p-4 text-white`}>
          <p className="font-semibold text-sm">{getAlertaMensaje()}</p>
        </div>
      )}

      {esAdmin && (
        <div
          onClick={() => router.push('/admin')}
          className="mx-4 mt-4 bg-gray-900 rounded-3xl p-4 text-white cursor-pointer active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Panel de Administrador</p>
              <p className="text-gray-400 text-xs mt-1">Gestionar suscriptores</p>
            </div>
            <span className="text-2xl">⚙️</span>
          </div>
        </div>
      )}

      <div className="px-6 py-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Menú principal</h2>
        <div className="grid grid-cols-2 gap-4">
          {modulos.map((modulo) => (
            <div
              key={modulo.ruta}
              onClick={() => router.push(modulo.ruta)}
              className={`${modulo.color} rounded-3xl p-5 cursor-pointer active:scale-95 transition-all shadow-sm`}
            >
              <div className={`${modulo.iconBg} w-12 h-12 rounded-2xl flex items-center justify-center mb-3`}>
                <span className="text-2xl">{modulo.icon}</span>
              </div>
              <h3 className="font-bold text-gray-800 text-sm">{modulo.titulo}</h3>
              <p className="text-gray-400 text-xs mt-1">{modulo.descripcion}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}