'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [empresa, setEmpresa] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const cargarEmpresa = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('empresas').select('*').eq('id', user.id).single()
      setEmpresa(data)
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
            <button onClick={handleLogout} className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center">
              <span className="text-lg">🚪</span>
            </button>
          </div>
        </div>
      </div>

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
