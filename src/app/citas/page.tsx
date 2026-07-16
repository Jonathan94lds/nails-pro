'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function fechaHoy() {
  return new Date().toISOString().split('T')[0]
}

export default function CitasPage() {
  const [citas, setCitas] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [clienteId, setClienteId] = useState('')
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([])
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarModalServicios, setMostrarModalServicios] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fechaFiltro, setFechaFiltro] = useState(fechaHoy())
  const [verTodasPendientes, setVerTodasPendientes] = useState(false)
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

  const citasDelDia = citas.filter(c => c.fecha_inicio.split('T')[0] === fechaFiltro)

  const citasPendientesFuturas = citas
    .filter(c => c.estado === 'pendiente' && c.fecha_inicio.split('T')[0] >= fechaHoy())
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))

  const citasMostradas = verTodasPendientes ? citasPendientesFuturas : citasDelDia

  const serviciosSeleccionadosObjs = servicios.filter(s => serviciosSeleccionados.includes(s.id))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/dashboard')} className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center">
            <span className="text-2xl font-bold">←</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
            <p className="text-gray-400 text-sm">{citasMostradas.length} citas</p>
          </div>
        </div>

        {/* Botón principal, más protagonista */}
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="w-full bg-teal-400 rounded-2xl py-4 flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
        >
          <span className="text-white text-2xl font-light">{mostrarForm ? '×' : '+'}</span>
          <span className="text-white font-bold">{mostrarForm ? 'Cerrar' : 'Agregar cita'}</span>
        </button>
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

          {/* Servicios: ahora en ventana emergente en vez de lista larga */}
          <div>
            <label className="text-sm font-semibold text-gray-600 mb-2 block">Servicios</label>
            <button
              onClick={() => setMostrarModalServicios(true)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-left flex items-center justify-between"
            >
              <span className={serviciosSeleccionados.length > 0 ? 'text-gray-800 font-semibold' : 'text-gray-400'}>
                {serviciosSeleccionados.length > 0
                  ? `${serviciosSeleccionados.length} servicio(s) seleccionado(s)`
                  : 'Toca para elegir servicios'}
              </span>
              <span className="text-gray-400">›</span>
            </button>

            {serviciosSeleccionadosObjs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {serviciosSeleccionadosObjs.map(s => (
                  <span key={s.id} className="bg-teal-50 text-teal-600 text-xs font-semibold px-3 py-1.5 rounded-xl">
                    {s.nombre}
                  </span>
                ))}
              </div>
            )}
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

      {/* Modal / ventana flotante para elegir servicios */}
      {mostrarModalServicios && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setMostrarModalServicios(false)}>
          <div
            className="bg-white rounded-t-3xl w-full max-h-[75vh] flex flex-col p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">Elegir servicios</h3>
              <button onClick={() => setMostrarModalServicios(false)} className="text-2xl text-gray-400">×</button>
            </div>
            <div className="overflow-y-auto space-y-2 flex-1">
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
            <button
              onClick={() => setMostrarModalServicios(false)}
              className="w-full bg-teal-400 text-white py-4 rounded-2xl font-semibold shadow-md mt-4"
            >
              Listo ({serviciosSeleccionados.length})
            </button>
          </div>
        </div>
      )}

      {/* Filtros: solo se muestran si NO se está creando una cita */}
      {!mostrarForm && (
        <>
          <div className="px-4 pt-4 space-y-3">
            {!verTodasPendientes && (
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Ver citas del día</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={fechaFiltro}
                    onChange={(e) => setFechaFiltro(e.target.value)}
                    className="flex-1 bg-white border border-gray-100 rounded-2xl px-4 py-3 text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  {fechaFiltro !== fechaHoy() && (
                    <button
                      onClick={() => setFechaFiltro(fechaHoy())}
                      className="bg-teal-400 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-sm whitespace-nowrap"
                    >
                      Hoy
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setVerTodasPendientes(!verTodasPendientes)}
              className={`w-full py-3 rounded-2xl font-semibold text-sm shadow-sm transition-colors ${
                verTodasPendientes ? 'bg-purple-500 text-white' : 'bg-white text-purple-500 border border-purple-200'
              }`}
            >
              {verTodasPendientes ? '← Volver a ver por fecha' : 'Ver todas las pendientes'}
            </button>
          </div>

          <div className="px-4 py-4 space-y-3">
            {citasMostradas.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📅</span>
                </div>
                <p className="text-gray-800 font-semibold">
                  {verTodasPendientes ? 'Sin citas pendientes' : 'Sin citas en esta fecha'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {verTodasPendientes ? 'No hay citas pendientes desde hoy en adelante' : 'Elige otra fecha o agenda una nueva cita'}
                </p>
              </div>
            ) : (
              citasMostradas.map((cita) => (
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
        </>
      )}
    </div>
  )
}