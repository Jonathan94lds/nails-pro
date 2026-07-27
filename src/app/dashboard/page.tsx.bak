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
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#B08D57] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  // Íconos de línea, mismo grosor de trazo, agnósticos de nicho
  const IconClientes = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
  const IconServicios = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
    </svg>
  )
  const IconCitas = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M16 2.5v4M8 2.5v4M3 9.5h18" />
    </svg>
  )
  const IconFinanzas = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M16 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
    </svg>
  )
  const IconFacturar = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 3h9l3 3v15l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V5a2 2 0 0 1 2-2z" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </svg>
  )
  const IconLogout = (p: any) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
  const IconAdmin = (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
  const IconWarning = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  )

  const modulos = [
    { icon: IconClientes, titulo: 'Clientes', descripcion: 'Base de clientes', ruta: '/clientes' },
    { icon: IconServicios, titulo: 'Servicios', descripcion: 'Precios y duración', ruta: '/servicios' },
    { icon: IconCitas, titulo: 'Citas', descripcion: 'Agenda del día', ruta: '/citas' },
    { icon: IconFinanzas, titulo: 'Finanzas', descripcion: 'Ingresos y gastos', ruta: '/finanzas' },
    { icon: IconFacturar, titulo: 'Facturar', descripcion: 'Citas de hoy', ruta: '/facturacion' },
  ]

  const getAlertaColor = () => {
    if (diasRestantes === null) return ''
    if (diasRestantes <= 0) return 'bg-[#8C2F27]'
    if (diasRestantes <= 1) return 'bg-[#A8392F]'
    if (diasRestantes <= 2) return 'bg-[#B8623A]'
    return 'bg-[#B08D57]'
  }

  const getAlertaMensaje = () => {
    if (diasRestantes === null) return ''
    if (diasRestantes <= 0) return 'Tu suscripción ha vencido. Contacta al administrador para renovar.'
    if (diasRestantes === 1) return 'Tu suscripción vence mañana. Contacta al administrador para renovar.'
    return `Tu suscripción vence en ${diasRestantes} días. Contacta al administrador para renovar.`
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="px-6 pt-14 pb-7">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#B08D57] uppercase">Bienvenida</p>
            <h1
              className="text-[28px] leading-tight text-[#1F1B18] mt-1.5"
              style={{ fontFamily: 'Fraunces, Georgia, serif' }}
            >
              {empresa?.nombre || 'Tu Estudio'}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="w-11 h-11 rounded-full border border-[#E7E2DA] flex items-center justify-center text-[#8A8378] hover:text-[#1F1B18] hover:border-[#1F1B18] transition-colors"
            aria-label="Cerrar sesión"
          >
            <IconLogout />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* Alerta de suscripción */}
        {diasRestantes !== null && diasRestantes <= 5 && (
          <div className={`${getAlertaColor()} rounded-2xl px-5 py-4 text-white flex items-start gap-3`}>
            <IconWarning className="mt-0.5 shrink-0" />
            <p className="text-[13px] leading-snug font-medium">{getAlertaMensaje()}</p>
          </div>
        )}

        {/* Panel admin */}
        {esAdmin && (
          <div
            onClick={() => router.push('/admin')}
            className="bg-[#1F1B18] rounded-2xl px-5 py-4 text-white cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-sm">Panel de administrador</p>
              <p className="text-[#A79A8A] text-xs mt-0.5">Gestionar suscriptores</p>
            </div>
            <IconAdmin className="text-[#B08D57]" />
          </div>
        )}

        {/* Tarjeta hero: agenda del día */}
        <div
          onClick={() => router.push('/citas')}
          className="bg-[#1F1B18] rounded-3xl p-7 text-white cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#B08D57] uppercase">Agenda de hoy</p>
            <IconCitas className="text-[#B08D57]" />
          </div>

          {cargandoCitas ? (
            <div className="h-12 flex items-center mt-2">
              <div className="w-5 h-5 border-2 border-[#B08D57] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-[40px] leading-none mt-4" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
                {citasHoy.length}
              </p>
              {citasHoy.length === 0 ? (
                <p className="text-[#A79A8A] text-sm mt-3">No tienes citas agendadas para hoy</p>
              ) : proximaCita ? (
                <p className="text-[#D8CFC2] text-sm mt-3">
                  Próxima: <span className="text-white font-medium">{proximaCita.clientes?.nombre || 'Cliente'}</span> · {tiempoHasta(proximaCita.fecha_inicio)}
                </p>
              ) : (
                <p className="text-[#A79A8A] text-sm mt-3">Ya pasaron todas las citas de hoy</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Menú principal */}
      <div className="px-6 pt-7 pb-8">
        <h2 className="text-[11px] font-semibold tracking-[0.18em] text-[#8A8378] uppercase mb-4">Menú principal</h2>
        <div className="grid grid-cols-2 gap-3">
          {modulos.map((modulo) => {
            const Icon = modulo.icon
            return (
              <div
                key={modulo.ruta}
                onClick={() => router.push(modulo.ruta)}
                className="bg-white border border-[#EFEAE2] rounded-2xl p-4 cursor-pointer active:scale-[0.97] transition-transform"
              >
                <div className="w-9 h-9 rounded-xl bg-[#F3EDE3] flex items-center justify-center mb-3 text-[#8A6A3A]">
                  <Icon />
                </div>
                <h3 className="font-semibold text-[#1F1B18] text-sm">{modulo.titulo}</h3>
                <p className="text-[#8A8378] text-xs mt-0.5">{modulo.descripcion}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
