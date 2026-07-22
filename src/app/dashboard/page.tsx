'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [empresa, setEmpresa] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)

  // --- Citas de hoy (tarjeta destacada) ---
  const [citasHoy, setCitasHoy] = useState<any[]>([])
  const [proximaCita, setProximaCita] = useState<any>(null)
  const [cargandoCitas, setCargandoCitas] = useState(true)

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

      await cargarCitasHoy(user.id)
      setLoading(false)
    }
    cargarEmpresa()
  }, [router])

  // Trae las citas de hoy (no canceladas) y calcula cuál es la próxima
  const cargarCitasHoy = async (empresaId: string) => {
    setCargandoCitas(true)
    const ahora = new Date()
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    const finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)

    const { data } = await supabase
      .from('citas')
      .select('*, clientes(nombre)')
      .eq('empresa_id', empresaId)
      .neq('estado', 'cancelada')
      .gte('fecha_inicio', inicioDia.toISOString())
      .lt('fecha_inicio', finDia.toISOString())
      .order('fecha_inicio')

    const lista = data || []
    setCitasHoy(lista)

    const siguiente = lista.find(c => new Date(c.fecha_inicio).getTime() >= ahora.getTime())
    setProximaCita(siguiente || null)
    setCargandoCitas(false)
  }

  const tiempoHasta = (fechaIso: string) => {
    const diffMs = new Date(fechaIso).getTime() - new Date().getTime()
    if (diffMs <= 0) return 'ahora'
    const totalMin = Math.round(diffMs / 60000)
    const horas = Math.floor(totalMin / 60)
    const minutos = totalMin % 60
    if (horas > 0) return `en ${horas}h ${minutos}min`
    return `en ${minutos} min`
  }

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
    //{ icon: 'whatsapp', titulo: 'WhatsApp', descripcion: 'Recordatorios', ruta: '/notificaciones', color: 'bg-emerald-50', iconBg: 'bg-emerald-100' },
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
    if (diasRestantes === 1) return '⚠ Tu suscripción vence mañana. Contacta al administrador para renovar.'
    return `⚠ Tu suscripción vence en ${diasRestantes} días. Contacta al administrador para renovar.`
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
            <span className="text-2xl">⚙</span>
          </div>
        </div>
      )}

      {/* Tarjeta destacada: Citas de hoy */}
      <div
        onClick={() => router.push('/citas')}
        className="mx-4 mt-4 bg-teal-400 rounded-3xl p-6 text-white cursor-pointer active:scale-95 transition-all shadow-md"
      >
        <p className="text-teal-50 text-sm font-semibold">Citas de hoy</p>

        {cargandoCitas ? (
          <div className="h-14 flex items-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-4xl font-bold mt-1">{citasHoy.length}</p>
            {citasHoy.length === 0 ? (
              <p className="text-teal-50 text-sm mt-2">No tienes citas agendadas para hoy</p>
            ) : proximaCita ? (
              <p className="text-teal-50 text-sm mt-2">
                Próxima: <span className="font-semibold">{proximaCita.clientes?.nombre || 'Cliente'}</span> · {tiempoHasta(proximaCita.fecha_inicio)}
              </p>
            ) : (
              <p className="text-teal-50 text-sm mt-2">Ya pasaron todas las citas de hoy</p>
            )}
          </>
        )}
      </div>

      <div className="px-6 py-6">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">Menú principal</h2>
        <div className="grid grid-cols-2 gap-3">
          {modulos.map((modulo) => (
            <div
              key={modulo.ruta}
              onClick={() => router.push(modulo.ruta)}
              className={`${modulo.color} rounded-2xl p-4 cursor-pointer active:scale-95 transition-all shadow-sm`}
            >
              <div className={`${modulo.iconBg} w-9 h-9 rounded-xl flex items-center justify-center mb-2`}>
                {modulo.icon === 'whatsapp' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#10b981">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12.004 2C6.486 2 2.004 6.482 2.004 12c0 1.85.505 3.58 1.38 5.067L2 22l5.1-1.336A9.955 9.955 0 0012.004 22C17.522 22 22 17.518 22 12S17.522 2 12.004 2zm0 18.077a8.05 8.05 0 01-4.1-1.12l-.294-.175-3.028.793.808-2.95-.192-.303a8.05 8.05 0 01-1.238-4.322c0-4.457 3.628-8.077 8.048-8.077 4.42 0 8.048 3.62 8.048 8.077 0 4.457-3.628 8.077-8.052 8.077z"/>
                  </svg>
                ) : (
                  <span className="text-lg">{modulo.icon}</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-700 text-sm">{modulo.titulo}</h3>
              <p className="text-gray-400 text-xs mt-0.5">{modulo.descripcion}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
