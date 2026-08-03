'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Cliente {
  id: string
  nombre: string
  telefono: string
}

interface ServicioSnapshot {
  valor_snapshot: number
  duracion_snapshot: number
  servicios: { nombre: string } | null
}

interface Cita {
  id: string
  fecha_inicio: string
  valor_total: number
  estado: string
  metodo_pago: string | null
  cita_servicios: ServicioSnapshot[]
}

export default function HistorialClientePage() {
  const params = useParams()
  const router = useRouter()
  const clienteId = params.id as string

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [citas, setCitas] = useState<Cita[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: clienteData } = await supabase
        .from('clientes')
        .select('id, nombre, telefono')
        .eq('id', clienteId)
        .single()

      const { data: citasData } = await supabase
        .from('citas')
        .select(`
          id, fecha_inicio, valor_total, estado, metodo_pago,
          cita_servicios (
            valor_snapshot,
            duracion_snapshot,
            servicios ( nombre )
          )
        `)
        .eq('cliente_id', clienteId)
        .order('fecha_inicio', { ascending: false })

      setCliente(clienteData)
      setCitas((citasData as any) || [])
      setCargando(false)
    }
    cargarDatos()
  }, [clienteId, router])

  const totalCitas = citas.length
  const ultimaVisita = citas.length > 0 ? citas[0].fecha_inicio : null

  const formatFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  const colorEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-[#F6EEDF] text-[#B08D57]'
      case 'confirmada': return 'bg-[#E7F0EC] text-[#2F5D4E]'
      case 'facturada': return 'bg-[#E7F0EC] text-[#2F5D4E]'
      case 'cancelada': return 'bg-[#F7E5E2] text-[#8C2F27]'
      default: return 'bg-[#F3EDE3] text-[#8A8378]'
    }
  }

  // Íconos de línea, mismo lenguaje visual del resto de la app
  const IconBack = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
  const IconEmpty = (p: any) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M16 2.5v4M8 2.5v4M3 9.5h18" />
    </svg>
  )

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#B08D57] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <p className="text-[#8A8378] text-sm">Cliente no encontrado</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-10">
      <div className="bg-white px-6 pt-12 pb-6 border-b border-[#EFEAE2]">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push('/clientes')}
            className="w-10 h-10 rounded-full border border-[#E7E2DA] flex items-center justify-center text-[#8A8378] hover:text-[#1F1B18] hover:border-[#1F1B18] transition-colors"
          >
            <IconBack />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-[#1F1B18] flex items-center justify-center text-[#B08D57]">
            <span className="font-semibold text-lg" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
              {cliente.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-[20px] text-[#1F1B18] leading-tight" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
              {cliente.nombre}
            </h1>
            <p className="text-[#8A8378] text-sm">{cliente.telefono || 'Sin teléfono'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#F3EDE3] rounded-2xl px-4 py-3 text-center">
            <p className="text-xl font-semibold text-[#1F1B18]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{totalCitas}</p>
            <p className="text-[#8A6A3A] text-xs font-medium mt-0.5">Citas totales</p>
          </div>
          <div className="bg-[#F3EDE3] rounded-2xl px-4 py-3 text-center">
            <p className="text-sm font-semibold text-[#1F1B18] mt-1">
              {ultimaVisita ? formatFecha(ultimaVisita) : 'Sin visitas'}
            </p>
            <p className="text-[#8A6A3A] text-xs font-medium mt-0.5">Última visita</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8A8378] uppercase px-1">Historial de citas</p>

        {citas.length === 0 ? (
          <div className="text-center py-20 text-[#8A6A3A]">
            <IconEmpty className="mx-auto" />
            <p className="text-[#1F1B18] font-semibold mt-4 text-sm">Sin citas registradas</p>
            <p className="text-[#8A8378] text-sm mt-1">Este cliente aún no tiene historial</p>
          </div>
        ) : (
          citas.map((cita) => (
            <div key={cita.id} className="bg-white border border-[#EFEAE2] rounded-3xl px-5 py-4">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-[#1F1B18] text-sm">{formatFecha(cita.fecha_inicio)}</p>
                <span className={`px-3 py-1 rounded-xl text-[11px] font-semibold capitalize ${colorEstado(cita.estado)}`}>
                  {cita.estado}
                </span>
              </div>
              <div className="space-y-1 mb-3">
                {cita.cita_servicios.map((cs, i) => (
                  <p key={i} className="text-[#8A8378] text-sm">
                    • {cs.servicios?.nombre || 'Servicio'} — ${cs.valor_snapshot.toLocaleString('es-CO')}
                  </p>
                ))}
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[#F3EDE3]">
                <p className="text-[#8A8378] text-xs">{cita.metodo_pago || 'Sin método de pago'}</p>
                <p className="font-semibold text-[#8A6A3A] text-lg">${cita.valor_total.toLocaleString('es-CO')}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
