'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CitasPage() {
  const [citas, setCitas] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [clienteId, setClienteId] = useState('')
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([])
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: citasData }, { data: clientesData }, { data: serviciosData }] = await Promise.all([
      supabase.from('citas').select('*, clientes(nombre)').eq('empresa_id', user.id).order('fecha_inicio'),
      supabase.from('clientes').select('*').eq('empresa_id', user.id).order('nombre'),
      supabase.from('servicios').select('*').eq('empresa_id', user.id).eq('activo', true).order('nombre')
    ])

    setCitas(citasData || [])
    setClientes(clientesData || [])
    setServicios(serviciosData || [])
  }

  const toggleServicio = (id: string) => {
    setServiciosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const calcularTotales = () => {
    const seleccionados = servicios.filter(s => serviciosSeleccionados.includes(s.id))
    const valorTotal = seleccionados.reduce((sum, s) => sum + s.valor, 0)
    const duracionTotal = seleccionados.reduce((sum, s) => sum + s.duracion_min, 0)
    return { valorTotal, duracionTotal }
  }

  const guardarCita = async () => {
    if (!clienteId || serviciosSeleccionados.length === 0 || !fecha || !hora) {
      setError('Completa todos los campos')
      return
    }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const { valorTotal, duracionTotal } = calcularTotales()

    const fechaInicio = new Date(`${fecha}T${hora}`)
    const fechaFin = new Date(fechaInicio.getTime() + duracionTotal * 60000)

    const { data: traslape } = await supabase
      .from('citas')
      .select('id')
      .eq('empresa_id', user?.id)
      .neq('estado', 'cancelada')
      .lt('fecha_inicio', fechaFin.toISOString())
      .gt('fecha_fin', fechaInicio.toISOString())

    if (traslape && traslape.length > 0) {
      setError('⚠️ Revisa tu agenda — hay un traslape con otra cita')
      setLoading(false)
      return
    }

    const { data: nuevaCita, error: citaError } = await supabase
      .from('citas')
      .insert({
        empresa_id: user?.id,
        cliente_id: clienteId,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        valor_total: valorTotal,
        duracion_total: duracionTotal,
        estado: 'pendiente'
      })
      .select()
      .single()

    if (citaError || !nuevaCita) {
      setError('Error al guardar la cita')
      setLoading(false)
      return
    }

    const serviciosSelec = servicios.filter(s => serviciosSeleccionados.includes(s.id))
    await supabase.from('cita_servicios').insert(
      serviciosSelec.map(s => ({
        cita_id: nuevaCita.id,
        servicio_id: s.id,
        valor_snapshot: s.valor,
        duracion_snapshot: s.duracion_min
      }))
    )

    setClienteId('')
    setServiciosSeleccionados([])
    setFecha('')
    setHora('')
    setMostrarForm(false)
    setLoading(false)
    cargarDatos()
  }

  const { valorTotal, duracionTotal } = calcularTotales()

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  }

  const colorEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-600'
      case 'confirmada': return 'bg-blue-100 text-blue-600'
      case 'facturada': return 'bg-green-100 text-green-600'
      case 'cancelada': return 'bg-red-100 text-red-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center">
              <span className="text-lg">←</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
              <p className="text-gray-400 text-sm">{citas.length} citas</p>
            </div>
          </div>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="w-10 h-10 bg-teal-400 rounded-2xl flex items-center justify-center shadow-md"
          >
            <span className="text-white text-2xl font-light">{mostrarForm ? '×' : '+'}</span>
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div className="mx-4 mt-4 bg-white rounded-3xl shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-gray-800">Nueva cita</h2>

          <div>
            <label className="text-sm font-semibold text-gray-600 mb-1 block">Cliente</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Selecciona un cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600 mb-2 block">Servicios</label>
            <div className="space-y-2">
              {servicios.map(s => (
                <div
                  key={s.id}
                  onClick={() => toggleServicio(s.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border-2 transition-all ${serviciosSeleccionados.includes(s.id) ? 'border-teal-400 bg-teal-50' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{s.nombre}</p>
                    <p className="text-gray-400 text-xs">${s.valor.toLocaleString()} · {s.duracion_min} min</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${serviciosSeleccionados.includes(s.id) ? 'border-teal-400 bg-teal-400' : 'border-gray-300'}`}>
                    {serviciosSeleccionados.includes(s.id) && <span className="text-white text-xs">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {serviciosSeleccionados.length > 0 && (
            <div className="bg-teal-50 rounded-2xl p-4">
              <p className="text-teal-700 font-semibold text-sm">Total: ${valorTotal.toLocaleString()} · {duracionTotal} min</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-1 block">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-1 block">Hora</label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-2xl">{error}</div>}

          <div className="flex gap-3">
            <button onClick={() => setMostrarForm(false)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-semibold">
              Cancelar
            </button>
            <button onClick={guardarCita} disabled={loading} className="flex-1 bg-teal-400 text-white py-4 rounded-2xl font-semibold shadow-md disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-3">
        {citas.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📅</span>
            </div>
            <p className="text-gray-800 font-semibold">Sin citas aún</p>
            <p className="text-gray-400 text-sm mt-1">Toca + para agendar tu primera cita</p>
          </div>
        ) : (
          citas.map((cita) => (
            <div key={cita.id} className="bg-white rounded-3xl px-5 py-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-800">{cita.clientes?.nombre}</p>
                  <p className="text-gray-400 text-sm mt-1">{formatFecha(cita.fecha_inicio)}</p>
                  <p className="text-teal-500 font-semibold text-sm mt-1">${cita.valor_total?.toLocaleString()} · {cita.duracion_total} min</p>
                </div>
                <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${colorEstado(cita.estado)}`}>
                  {cita.estado}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}