'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Providers'
import { useConfirm } from '@/components/Providers'
import BottomNav from '@/components/BottomNav'
import ServicioSelectorModal from '@/components/ServicioSelectorModal'

function fechaLocal(fecha: Date | string) {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fechaHoy() {
  return fechaLocal(new Date())
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

  // --- Menú de 3 puntos por cita ---
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null)

  // --- Facturar directamente desde la cita ---
  const [citaFacturandoId, setCitaFacturandoId] = useState<string | null>(null)
  const [metodoPago, setMetodoPago] = useState('')
  const [loadingFactura, setLoadingFactura] = useState(false)

  // --- Editar cita ---
  const [citaEditando, setCitaEditando] = useState<any | null>(null)
  const [editClienteId, setEditClienteId] = useState('')
  const [editServiciosSeleccionados, setEditServiciosSeleccionados] = useState<string[]>([])
  const [editFecha, setEditFecha] = useState('')
  const [editHora, setEditHora] = useState('')
  const [mostrarModalServiciosEdit, setMostrarModalServiciosEdit] = useState(false)
  const [errorEdit, setErrorEdit] = useState('')
  const [loadingEdit, setLoadingEdit] = useState(false)

  const router = useRouter()
  const toast = useToast()
  const confirmar = useConfirm()

  const cargarDatos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const [{ data: citasData }, { data: clientesData }, { data: serviciosData }] = await Promise.all([
      supabase.from('citas').select('*, clientes(nombre, telefono), cita_servicios(servicio_id, servicios(nombre))').eq('empresa_id', user.id).order('fecha_inicio'),
      supabase.from('clientes').select('*').eq('empresa_id', user.id).order('nombre'),
      supabase.from('servicios').select('*').eq('empresa_id', user.id).eq('activo', true).order('nombre')
    ])
    setCitas(citasData || [])
    setClientes(clientesData || [])
    setServicios(serviciosData || [])
  }, [router])

  useEffect(() => {
    cargarDatos()
    // El selector de contactos del celular (Contact Picker API) solo existe
    // hoy en día en Chrome para Android. En iPhone/otros navegadores no
    // aparece 'contacts' en navigator, así que el botón simplemente no se muestra.
    if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      setContactosSoportado(true)
    }
  }, [cargarDatos])

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
      const telLimpio = telCrudo.replace(/\D/g, '').slice(-10)

      if (!nombreContacto || !telLimpio) {
        toast('Ese contacto no tiene nombre o teléfono válido', 'error')
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
        toast('No se pudo crear el cliente desde el contacto', 'error')
        setImportandoContacto(false)
        return
      }

      setClientes(prev => [...prev, nuevoCliente].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setClienteId(nuevoCliente.id)
      setImportandoContacto(false)
    } catch {
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
      setError('Revisa tu agenda — hay un traslape con otra cita')
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
    toast('Cita agendada correctamente', 'success')
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
      case 'pendiente': return 'bg-[#F3EDE3] text-[#8A6A3A]'
      case 'confirmada': return 'bg-[#E9EEF0] text-[#3B5A66]'
      case 'facturada': return 'bg-[#E7EDE9] text-[#2F4A3C]'
      case 'cancelada': return 'bg-[#F3E4E2] text-[#8C2F27]'
      default: return 'bg-[#F1EEE9] text-[#5C564C]'
    }
  }

  // Envía el WhatsApp directamente desde la tarjeta de la cita.
  const enviarWhatsapp = (cita: any) => {
    const telefono = cita.clientes?.telefono?.replace(/\D/g, '')
    if (!telefono) {
      toast('Este cliente no tiene teléfono registrado', 'error')
      return
    }
    const nombresServicios = (cita.cita_servicios || [])
      .map((cs: any) => cs.servicios?.nombre)
      .filter(Boolean)
      .join(', ')
    const hora = new Date(cita.fecha_inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    const fechaTexto = new Date(cita.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
    const mensaje = `Hola, te recordamos tu cita para ${nombresServicios || 'tu servicio'} programada para el ${fechaTexto} a las ${hora}. ¡Nos vemos pronto!`
    window.open(`https://wa.me/57${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank')
    setMenuAbiertoId(null)
  }

  // Una cita se puede facturar si es de hoy o de una fecha ya pasada,
  // y todavía no está facturada ni cancelada. Las de fechas futuras no.
  const puedeFacturar = (cita: any) => {
    const inicioHoy = new Date(fechaHoy() + 'T00:00:00')
    return new Date(cita.fecha_inicio) < new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000)
      && cita.estado !== 'facturada'
      && cita.estado !== 'cancelada'
  }

  // Misma lógica que en /facturacion: pide método de pago y marca la cita como facturada
  const facturarCita = async (citaId: string) => {
    if (!metodoPago) return
    const ok = await confirmar({
      title: 'Confirmar factura',
      message: 'Una vez facturada, la cita pasará a tu historial de ingresos y no podrás editarla desde aquí.',
      confirmText: 'Facturar',
    })
    if (!ok) return
    setLoadingFactura(true)
    await supabase
      .from('citas')
      .update({
        estado: 'facturada',
        metodo_pago: metodoPago,
        facturada_en: new Date().toISOString()
      })
      .eq('id', citaId)
    setCitaFacturandoId(null)
    setMetodoPago('')
    setLoadingFactura(false)
    toast('Cita facturada correctamente', 'success')
    cargarDatos()
  }

  // --- Edición de cita ---
  const abrirEdicion = (cita: any) => {
    setCitaEditando(cita)
    setEditClienteId(cita.cliente_id)
    setEditServiciosSeleccionados((cita.cita_servicios || []).map((cs: any) => cs.servicio_id).filter(Boolean))
    const fechaObj = new Date(cita.fecha_inicio)
    setEditFecha(fechaLocal(fechaObj))
    setEditHora(fechaObj.toTimeString().slice(0, 5))
    setErrorEdit('')
    setMenuAbiertoId(null)
  }

  const toggleServicioEdit = (id: string) => {
    setEditServiciosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const calcularTotalesEdit = () => {
    const seleccionados = servicios.filter(s => editServiciosSeleccionados.includes(s.id))
    const valorTotal = seleccionados.reduce((sum, s) => sum + s.valor, 0)
    const duracionTotal = seleccionados.reduce((sum, s) => sum + s.duracion_min, 0)
    return { valorTotal, duracionTotal }
  }

  const guardarEdicion = async () => {
    if (!citaEditando) return
    if (!editClienteId || editServiciosSeleccionados.length === 0 || !editFecha || !editHora) {
      setErrorEdit('Completa todos los campos')
      return
    }
    setLoadingEdit(true)
    setErrorEdit('')
    const { data: { user } } = await supabase.auth.getUser()
    const { valorTotal: nuevoValor, duracionTotal: nuevaDuracion } = calcularTotalesEdit()
    const fechaInicio = new Date(`${editFecha}T${editHora}`)
    const fechaFin = new Date(fechaInicio.getTime() + nuevaDuracion * 60000)

    const { data: traslape } = await supabase
      .from('citas')
      .select('id')
      .eq('empresa_id', user?.id)
      .neq('estado', 'cancelada')
      .neq('id', citaEditando.id)
      .lt('fecha_inicio', fechaFin.toISOString())
      .gt('fecha_fin', fechaInicio.toISOString())

    if (traslape && traslape.length > 0) {
      setErrorEdit('Hay un traslape con otra cita')
      setLoadingEdit(false)
      return
    }

    const { error: updateError } = await supabase
      .from('citas')
      .update({
        cliente_id: editClienteId,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        valor_total: nuevoValor,
        duracion_total: nuevaDuracion
      })
      .eq('id', citaEditando.id)

    if (updateError) {
      setErrorEdit('Error al guardar los cambios')
      setLoadingEdit(false)
      return
    }

    // Reemplaza los servicios de la cita por los nuevos seleccionados
    await supabase.from('cita_servicios').delete().eq('cita_id', citaEditando.id)
    const serviciosSelec = servicios.filter(s => editServiciosSeleccionados.includes(s.id))
    await supabase.from('cita_servicios').insert(
      serviciosSelec.map(s => ({
        cita_id: citaEditando.id,
        servicio_id: s.id,
        valor_snapshot: s.valor,
        duracion_snapshot: s.duracion_min
      }))
    )

    setCitaEditando(null)
    setLoadingEdit(false)
    toast('Cambios guardados', 'success')
    cargarDatos()
  }

const citasDelDia = citas.filter(c => fechaLocal(c.fecha_inicio) === fechaFiltro)
  const citasPendientesFuturas = citas
  .filter(c => c.estado === 'pendiente' && fechaLocal(c.fecha_inicio) >= fechaHoy())
  .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))

  const citasMostradas = verTodasPendientes ? citasPendientesFuturas : citasDelDia

  const serviciosSeleccionadosObjs = servicios.filter(s => serviciosSeleccionados.includes(s.id))
  const editServiciosSeleccionadosObjs = servicios.filter(s => editServiciosSeleccionados.includes(s.id))
  const { valorTotal: editValorTotal, duracionTotal: editDuracionTotal } = calcularTotalesEdit()

  // --- Íconos de línea, mismo trazo del resto de la app ---
  const IconBack = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
  const IconPlus = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
  const IconClose = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
  const IconChevron = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
  const IconCitas = (p: any) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M16 2.5v4M8 2.5v4M3 9.5h18" />
    </svg>
  )
  const IconContacto = (p: any) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M6 16c.5-1.7 1.8-2.5 3-2.5s2.5.8 3 2.5M14 9h4M14 13h4" />
    </svg>
  )
  const IconDots = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  )
  const IconWhatsapp = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B7A5A" {...p}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12.004 2C6.486 2 2.004 6.482 2.004 12c0 1.85.505 3.58 1.38 5.067L2 22l5.1-1.336A9.955 9.955 0 0012.004 22C17.522 22 22 17.518 22 12S17.522 2 12.004 2zm0 18.077a8.05 8.05 0 01-4.1-1.12l-.294-.175-3.028.793.808-2.95-.192-.303a8.05 8.05 0 01-1.238-4.322c0-4.457 3.628-8.077 8.048-8.077 4.42 0 8.048 3.62 8.048 8.077 0 4.457-3.628 8.077-8.052 8.077z"/>
    </svg>
  )
  const IconFacturar = (p: any) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 3h9l3 3v15l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V5a2 2 0 0 1 2-2z" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </svg>
  )
  const IconEditar = (p: any) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  )
  const IconEfectivo = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
  const IconTransferencia = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  )

  const inputClass = "w-full bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl px-4 py-4 text-[#1F1B18] placeholder:text-[#B4AC9E] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57]"
  const labelClass = "text-sm font-semibold text-[#5C564C] mb-1 block"

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="bg-white px-6 pt-12 pb-6 border-b border-[#EFEAE2]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/dashboard')} className="w-10 h-10 rounded-full border border-[#E7E2DA] flex items-center justify-center text-[#8A8378] hover:text-[#1F1B18] hover:border-[#1F1B18] transition-colors">
            <IconBack />
          </button>
          <div>
            <h1 className="text-2xl text-[#1F1B18]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Citas</h1>
            <p className="text-[#8A8378] text-sm">{citasMostradas.length} citas</p>
          </div>
        </div>

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="w-full bg-[#1F1B18] rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          {mostrarForm ? <IconClose className="text-white" /> : <IconPlus className="text-white" />}
          <span className="text-white font-semibold">{mostrarForm ? 'Cerrar' : 'Agregar cita'}</span>
        </button>
      </div>

      {mostrarForm && (
        <div className="mx-4 mt-4 mb-28 bg-white border border-[#EFEAE2] rounded-3xl p-5 space-y-4">
          <h2 className="font-semibold text-[#1F1B18]">Nueva cita</h2>
          <div>
            <label className={labelClass}>Cliente</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecciona un cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {contactosSoportado && (
              <button
                type="button"
                onClick={elegirDesdeContactos}
                disabled={importandoContacto}
                className="w-full mt-2 bg-[#F3EDE3] text-[#8A6A3A] py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <IconContacto />
                {importandoContacto ? 'Abriendo contactos...' : 'Elegir desde contactos'}
              </button>
            )}
          </div>

          <div>
            <label className={labelClass + ' mb-2'}>Servicios</label>
            <button
              onClick={() => setMostrarModalServicios(true)}
              className={`${inputClass} text-left flex items-center justify-between`}
            >
              <span className={serviciosSeleccionados.length > 0 ? 'text-[#1F1B18] font-semibold' : 'text-[#B4AC9E]'}>
                {serviciosSeleccionados.length > 0
                  ? `${serviciosSeleccionados.length} servicio(s) seleccionado(s)`
                  : 'Toca para elegir servicios'}
              </span>
              <IconChevron className="text-[#B4AC9E]" />
            </button>
            {serviciosSeleccionadosObjs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {serviciosSeleccionadosObjs.map(s => (
                  <span key={s.id} className="bg-[#F3EDE3] text-[#8A6A3A] text-xs font-semibold px-3 py-1.5 rounded-xl">
                    {s.nombre}
                  </span>
                ))}
              </div>
            )}
          </div>

          {serviciosSeleccionados.length > 0 && (
            <div className="bg-[#F3EDE3] rounded-2xl p-4">
              <p className="text-[#8A6A3A] font-semibold text-sm">Total: ${valorTotal.toLocaleString()} · Duración: {duracionTotal} min</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Hora</label>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={inputClass} />
            </div>
          </div>

          {error && <div className="bg-[#F3E4E2] text-[#8C2F27] text-sm px-4 py-3 rounded-2xl">{error}</div>}

          <div className="flex gap-3">
            <button onClick={() => setMostrarForm(false)} className="flex-1 bg-[#F3EDE3] text-[#5C564C] py-4 rounded-2xl font-semibold">
              Cancelar
            </button>
            <button onClick={guardarCita} disabled={loading} className="flex-1 bg-[#1F1B18] text-white py-4 rounded-2xl font-semibold disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Modal para elegir servicios (nueva cita) */}
      {mostrarModalServicios && (
        <ServicioSelectorModal
          servicios={servicios}
          seleccionados={serviciosSeleccionados}
          onToggle={toggleServicio}
          onClose={() => setMostrarModalServicios(false)}
        />
      )}

      {/* Modal de Editar cita */}
      {citaEditando && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setCitaEditando(null)}>
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1F1B18] text-lg">Editar cita</h3>
              <button onClick={() => setCitaEditando(null)} className="text-[#8A8378]"><IconClose /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Cliente</label>
                <select value={editClienteId} onChange={(e) => setEditClienteId(e.target.value)} className={inputClass}>
                  <option value="">Selecciona un cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass + ' mb-2'}>Servicios</label>
                <button
                  onClick={() => setMostrarModalServiciosEdit(true)}
                  className={`${inputClass} text-left flex items-center justify-between`}
                >
                  <span className={editServiciosSeleccionados.length > 0 ? 'text-[#1F1B18] font-semibold' : 'text-[#B4AC9E]'}>
                    {editServiciosSeleccionados.length > 0
                      ? `${editServiciosSeleccionados.length} servicio(s) seleccionado(s)`
                      : 'Toca para elegir servicios'}
                  </span>
                  <IconChevron className="text-[#B4AC9E]" />
                </button>
                {editServiciosSeleccionadosObjs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editServiciosSeleccionadosObjs.map(s => (
                      <span key={s.id} className="bg-[#F3EDE3] text-[#8A6A3A] text-xs font-semibold px-3 py-1.5 rounded-xl">
                        {s.nombre}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {editServiciosSeleccionados.length > 0 && (
                <div className="bg-[#F3EDE3] rounded-2xl p-4">
                  <p className="text-[#8A6A3A] font-semibold text-sm">Total: ${editValorTotal.toLocaleString()} · {editDuracionTotal} min</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Hora</label>
                  <input type="time" value={editHora} onChange={(e) => setEditHora(e.target.value)} className={inputClass} />
                </div>
              </div>

              {errorEdit && <div className="bg-[#F3E4E2] text-[#8C2F27] text-sm px-4 py-3 rounded-2xl">{errorEdit}</div>}

              <div className="flex gap-3 pb-2">
                <button onClick={() => setCitaEditando(null)} className="flex-1 bg-[#F3EDE3] text-[#5C564C] py-4 rounded-2xl font-semibold">
                  Cancelar
                </button>
                <button onClick={guardarEdicion} disabled={loadingEdit} className="flex-1 bg-[#1F1B18] text-white py-4 rounded-2xl font-semibold disabled:opacity-50">
                  {loadingEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para elegir servicios (edición) */}
      {mostrarModalServiciosEdit && (
        <ServicioSelectorModal
          servicios={servicios}
          seleccionados={editServiciosSeleccionados}
          onToggle={toggleServicioEdit}
          onClose={() => setMostrarModalServiciosEdit(false)}
          zIndex={60}
        />
      )}

      {/* Filtros: solo se muestran si NO se está creando una cita */}
      {!mostrarForm && (
        <>
          <div className="px-4 pt-4 space-y-3">
            {!verTodasPendientes && (
              <div>
                <label className={labelClass}>Ver citas del día</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={fechaFiltro}
                    onChange={(e) => setFechaFiltro(e.target.value)}
                    className="flex-1 bg-white border border-[#EFEAE2] rounded-2xl px-4 py-3 text-[#1F1B18] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57]"
                  />
                  {fechaFiltro !== fechaHoy() && (
                    <button
                      onClick={() => setFechaFiltro(fechaHoy())}
                      className="bg-[#1F1B18] text-white text-sm font-semibold px-4 py-3 rounded-2xl whitespace-nowrap"
                    >
                      Hoy
                    </button>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => setVerTodasPendientes(!verTodasPendientes)}
              className={`w-full py-3 rounded-2xl font-semibold text-sm transition-colors border ${
                verTodasPendientes ? 'bg-[#2F4A3C] text-white border-[#2F4A3C]' : 'bg-white text-[#2F4A3C] border-[#D9E2DC]'
              }`}
            >
              {verTodasPendientes ? '← Volver a ver por fecha' : 'Ver todas las pendientes'}
            </button>
          </div>

          <div className="px-4 py-4 pb-28 space-y-3">
            {citasMostradas.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-[#F3EDE3] rounded-3xl flex items-center justify-center mx-auto mb-4 text-[#8A6A3A]">
                  <IconCitas />
                </div>
                <p className="text-[#1F1B18] font-semibold">
                  {verTodasPendientes ? 'Sin citas pendientes' : 'Sin citas en esta fecha'}
                </p>
                <p className="text-[#8A8378] text-sm mt-1">
                  {verTodasPendientes ? 'No hay citas pendientes desde hoy en adelante' : 'Elige otra fecha o agenda una nueva cita'}
                </p>
              </div>
            ) : (
              citasMostradas.map((cita) => (
                <div key={cita.id} className="bg-white border border-[#EFEAE2] rounded-3xl px-5 py-4 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-[#1F1B18]">{cita.clientes?.nombre}</p>
                      <p className="text-[#8A8378] text-sm mt-1">{formatFecha(cita.fecha_inicio)}</p>
<p className="text-[#8A6A3A] font-semibold text-sm mt-1">${cita.valor_total?.toLocaleString()} · Duración: {cita.duracion_total} min</p>                    </div>
                    <div className="flex flex-col items-end gap-2 relative">
                      <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${colorEstado(cita.estado)}`}>
                        {cita.estado}
                      </span>

                      {/* Botón de 3 puntos */}
                      <button
                        onClick={() => setMenuAbiertoId(menuAbiertoId === cita.id ? null : cita.id)}
                        className="w-9 h-9 rounded-full bg-[#FAF8F5] flex items-center justify-center text-[#8A8378] active:scale-95 transition-all"
                      >
                        <IconDots />
                      </button>

                      {/* Menú desplegable */}
                      {menuAbiertoId === cita.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuAbiertoId(null)} />
                          <div className="absolute right-0 top-10 bg-white rounded-2xl shadow-lg border border-[#EFEAE2] py-2 w-44 z-20">
                            <button
                              onClick={() => enviarWhatsapp(cita)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#1F1B18] hover:bg-[#FAF8F5]"
                            >
                              <IconWhatsapp />
                              WhatsApp
                            </button>

                            {puedeFacturar(cita) && (
                              <button
                                onClick={() => { setCitaFacturandoId(cita.id); setMenuAbiertoId(null) }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#1F1B18] hover:bg-[#FAF8F5]"
                              >
                                <IconFacturar /> Facturar
                              </button>
                            )}

                            <button
                              onClick={() => abrirEdicion(cita)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#1F1B18] hover:bg-[#FAF8F5]"
                            >
                              <IconEditar /> Editar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Panel de facturación inline (mismo flujo que /facturacion) */}
                  {citaFacturandoId === cita.id && (
                    <div className="mt-4 pt-4 border-t border-[#EFEAE2]">
                      <p className="text-sm font-semibold text-[#5C564C] mb-3">Método de pago</p>
                      <div className="flex gap-3 mb-4">
                        <button
                          onClick={() => setMetodoPago('efectivo')}
                          className={`flex-1 py-3 rounded-2xl font-semibold text-sm border-2 transition-all flex items-center justify-center gap-2 ${metodoPago === 'efectivo' ? 'border-[#B08D57] bg-[#F3EDE3] text-[#8A6A3A]' : 'border-[#EFEAE2] bg-[#FAF8F5] text-[#5C564C]'}`}
                        >
                          <IconEfectivo /> Efectivo
                        </button>
                        <button
                          onClick={() => setMetodoPago('transferencia')}
                          className={`flex-1 py-3 rounded-2xl font-semibold text-sm border-2 transition-all flex items-center justify-center gap-2 ${metodoPago === 'transferencia' ? 'border-[#B08D57] bg-[#F3EDE3] text-[#8A6A3A]' : 'border-[#EFEAE2] bg-[#FAF8F5] text-[#5C564C]'}`}
                        >
                          <IconTransferencia /> Transferencia
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setCitaFacturandoId(null); setMetodoPago('') }}
                          className="flex-1 bg-[#F3EDE3] text-[#5C564C] py-3 rounded-2xl font-semibold text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => facturarCita(cita.id)}
                          disabled={!metodoPago || loadingFactura}
                          className="flex-1 bg-[#1F1B18] text-white py-3 rounded-2xl font-semibold text-sm disabled:opacity-50"
                        >
                          {loadingFactura ? 'Guardando...' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
      <BottomNav />
    </div>
  )
}
