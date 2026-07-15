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
    cargarDatos()
  }, [clienteId])

  async function cargarDatos() {
    setCargando(true)

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

  const totalCitas = citas.length
  const ultimaVisita = citas.length > 0 ? citas[0].fecha_inicio : null

  const formatFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  const colorEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-600'
      case 'confirmada': return 'bg-blue-100 text-blue-600'
      case 'facturada': return 'bg-green-100 text-green-600'
      case 'cancelada': return 'bg-red-100 text-red-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cliente no encontrado</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push('/clientes')}
            className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center"
          >
            <span className="text-lg">←</span>
          </button>
          <div className="bg-teal-400 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">
              {cliente.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cliente.nombre}</h1>
            <p className="text-gray-400 text-sm">{cliente.telefono || 'Sin teléfono'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-teal-50 rounded-2xl px-4 py-3 text-center">
            <p className="text-2xl font-bold text-teal-600">{totalCitas}</p>
            <p className="text-teal-500 text-xs font-medium">Citas totales</p>
          </div>
          <div className="bg-purple-50 rounded-2xl px-4 py-3 text-center">
            <p className="text-sm font-bold text-purple-600">
              {ultimaVisita ? formatFecha(ultimaVisita) : 'Sin visitas'}
            </p>
            <p className="text-purple-400 text-xs font-medium">Última visita</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        <p className="text-gray-500 font-semibold text-sm px-1">Historial de citas</p>

        {citas.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📋</span>
            </div>
            <p className="text-gray-800 font-semibold">Sin citas registradas</p>
            <p className="text-gray-400 text-sm mt-1">Este cliente aún no tiene historial</p>
          </div>
        ) : (
          citas.map((cita) => (
            <div key={cita.id} className="bg-white rounded-3xl px-5 py-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <p className="font-bold text-gray-800">{formatFecha(cita.fecha_inicio)}</p>
                <span className={`px-3 py-1 rounded-xl text-xs font-bold ${colorEstado(cita.estado)}`}>
                  {cita.estado}
                </span>
              </div>
              <div className="space-y-1 mb-3">
                {cita.cita_servicios.map((cs, i) => (
                  <p key={i} className="text-gray-500 text-sm">
                    • {cs.servicios?.nombre || 'Servicio'} — ${cs.valor_snapshot.toLocaleString('es-CO')}
                  </p>
                ))}
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <p className="text-gray-400 text-xs">{cita.metodo_pago || 'Sin método de pago'}</p>
                <p className="font-bold text-teal-500 text-lg">${cita.valor_total.toLocaleString('es-CO')}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}