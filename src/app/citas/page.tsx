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
  const [contactosSoportado, setContactosSoportado] = useState(false)
  const [importandoContacto, setImportandoContacto] = useState(false)
  const router = useRouter()

  useEffect(() => {
    cargarDatos()
    // El selector de contactos del celular (Contact Picker API) solo existe
    // hoy en día en Chrome para Android. En iPhone/otros navegadores no
    // aparece 'contacts' en navigator, así que el botón simplemente no se muestra.
    if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      setContactosSoportado(true)
    }
  }, [])

  const cargarDatos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const [{ data: citasData }, { data: clientesData }, { data: serviciosData }] = await Promise.all([
      supabase.from('citas').select('*, clientes(nombre, telefono), cita_servicios(servicios(nombre))').eq('empresa_id', user.id).order('fecha_inicio'),
      supabase.from('clientes').select('*').eq('empresa_id', user.id).order('nombre'),
      supabase.from('servicios').select('*').eq('empresa_id', user.id).eq('activo', true).order('nombre')
    ])
    setCitas(citasData || [])
    setClientes(clientesData || [])
    setServicios(serviciosData || [])
  }

  // Abre el selector nativo de contactos del celular (solo Android/Chrome).
  // Si el número ya existe entre los clientes, selecciona ese cliente.
  // Si no existe, crea un cliente nuevo con ese nombre y teléfono.
  const elegirDesdeContactos = async () => {
    try {
      setImportandoContacto(true)
      const seleccionados = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false })
      if (!seleccionados || seleccionados.length === 0) { setImportandoContacto(false); return }

      const contacto = seleccionados[0]
      const nombreContacto = (contacto.name && contacto.name[0]) || ''
      const telCrudo = (contacto.tel && contacto.tel[0]) || ''
      const telLimpio = telCrudo.replace(/\D/g, '').slice(-10) // últimos 10 dígitos, sin indicativo

      if (!nombreContacto || !telLimpio) {
        alert('Ese contacto no tiene nombre o teléfono válido')
        setImportandoContacto(false)
        return
      }

      const existente = clientes.find(c => (c.telefono || '').replace(/\D/g, '').slice(-10) === telLimpio)

      if (existente) {
        setClienteId(existente.id)
        setImportandoContacto(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      const { data: nuevoCliente, error: errorCliente } = await supabase
        .from('clientes')
        .insert({ empresa_id: user?.id, nombre: nombreContacto.trim(), telefono: telLimpio })
        .select()
        .single()

      if (errorCliente || !nuevoCliente) {
        alert('No se pudo crear el cliente desde el contacto')
        setImportandoContacto(false)
        return
      }

      setClientes(prev => [...prev, nuevoCliente].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setClienteId(nuevoCliente.id)
      setImportandoContacto(false)
    } catch (err) {
      // El usuario canceló el picker o el navegador lo bloqueó — no hacemos nada
      setImportandoContacto(false)
    }
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

  // Envía el WhatsApp directamente desde la tarjeta de la cita.
  // Usa el mismo patrón (wa.me + mensaje predeterminado) que el resto de la app.
  const enviarWhatsapp = (cita: any) => {
    const telefono = cita.clientes?.telefono?.replace(/\D/g, '')
    if (!telefono) {
      alert('Este cliente no tiene teléfono registrado')
      return
    }
    const nombresServicios = (cita.cita_servicios || [])
      .map((cs: any) => cs.servicios?.nombre)
      .filter(Boolean)
      .join(', ')
    const hora = new Date(cita.fecha_inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    const mensaje = `Hola 👋 Te recordamos tu cita para ${nombresServicios || 'tu servicio'} hoy a las ${hora}. ¡Te esperamos!`
    window.open(`https://wa.me/57${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank')
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
            {contactosSoportado && (
              <button
                type="button"
                onClick={elegirDesdeContactos}
                disabled={importandoContacto}
                className="w-full mt-2 bg-teal-50 text-teal-600 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>📇</span>
                {importandoContacto ? 'Abriendo contactos...' : 'Elegir desde contactos'}
              </button>
            )}
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
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${colorEstado(cita.estado)}`}>
                        {cita.estado}
                      </span>
                      <button
                        onClick={() => enviarWhatsapp(cita)}
                        title="Enviar mensaje"
                        className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center active:scale-95 transition-all"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#10b981">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12.004 2C6.486 2 2.004 6.482 2.004 12c0 1.85.505 3.58 1.38 5.067L2 22l5.1-1.336A9.955 9.955 0 0012.004 22C17.522 22 22 17.518 22 12S17.522 2 12.004 2zm0 18.077a8.05 8.05 0 01-4.1-1.12l-.294-.175-3.028.793.808-2.95-.192-.303a8.05 8.05 0 01-1.238-4.322c0-4.457 3.628-8.077 8.048-8.077 4.42 0 8.048 3.62 8.048 8.077 0 4.457-3.628 8.077-8.052 8.077z"/>
                        </svg>
                      </button>
                    </div>
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
