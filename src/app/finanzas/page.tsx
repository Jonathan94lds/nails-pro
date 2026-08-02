'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Providers'
import { SkeletonGrid } from '@/components/Skeleton'
import MoneyInput from '@/components/MoneyInput'
import BottomNav from '@/components/BottomNav'

type Periodo = 'hoy' | 'semana' | 'mes' | 'año'

const CATEGORIAS_POR_DEFECTO = ['Insumos', 'Arriendo', 'Servicios públicos', 'Transporte', 'General']

export default function FinanzasPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [ingresos, setIngresos] = useState(0)
  const [gastos, setGastos] = useState(0)
  const [citas, setCitas] = useState<any[]>([])
  const [listaGastos, setListaGastos] = useState<any[]>([])
  const [mostrarFormGasto, setMostrarFormGasto] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [valorGasto, setValorGasto] = useState('')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('')
  const [loading, setLoading] = useState(false)

  // --- Aspectos destacados del mes (independiente del selector de período) ---
  const [ingresosMesActual, setIngresosMesActual] = useState(0)
  const [ingresosMesAnterior, setIngresosMesAnterior] = useState(0)
  const [servicioTop, setServicioTop] = useState<{ nombre: string, veces: number } | null>(null)
  const [clienteTop, setClienteTop] = useState<{ nombre: string, veces: number } | null>(null)
  const [diaTop, setDiaTop] = useState<{ nombre: string, veces: number } | null>(null)
  const [cargandoDashboard, setCargandoDashboard] = useState(true)

  // --- Categorías de gastos (editables por empresa) ---
  const [categorias, setCategorias] = useState<any[]>([])
  const [cargandoCategorias, setCargandoCategorias] = useState(true)
  const [mostrarModalCategorias, setMostrarModalCategorias] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<string | null>(null)
  const [editandoCategoriaNombre, setEditandoCategoriaNombre] = useState('')
  const [loadingCategoria, setLoadingCategoria] = useState(false)

  const router = useRouter()
  const toast = useToast()

  useEffect(() => { cargarDatos() }, [periodo])
  useEffect(() => { cargarDashboard(); cargarCategorias() }, [])

  const getRango = () => {
    const ahora = new Date()
    let inicio: Date
    switch (periodo) {
      case 'hoy':
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
        break
      case 'semana':
        inicio = new Date(ahora)
        inicio.setDate(ahora.getDate() - 7)
        break
      case 'mes':
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
        break
      case 'año':
        inicio = new Date(ahora.getFullYear(), 0, 1)
        break
    }
    return { inicio: inicio.toISOString(), fin: ahora.toISOString() }
  }

  const cargarDatos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { inicio, fin } = getRango()

    const [{ data: citasData }, { data: gastosData }] = await Promise.all([
      supabase.from('citas').select('*').eq('empresa_id', user.id).eq('estado', 'facturada').gte('facturada_en', inicio).lte('facturada_en', fin),
      supabase.from('gastos').select('*').eq('empresa_id', user.id).gte('fecha', inicio.split('T')[0]).lte('fecha', fin.split('T')[0]).order('fecha', { ascending: false })
    ])

    const totalIngresos = (citasData || []).reduce((sum, c) => sum + (c.valor_total || 0), 0)
    const totalGastos = (gastosData || []).reduce((sum, g) => sum + (g.valor || 0), 0)

    setCitas(citasData || [])
    setListaGastos(gastosData || [])
    setIngresos(totalIngresos)
    setGastos(totalGastos)
  }

  // Trae las citas facturadas del mes actual y del mes anterior, y saca
  // los datos destacados: crecimiento vs mes anterior, servicio más
  // vendido, cliente más frecuente y día más ocupado.
  const cargarDashboard = async () => {
    setCargandoDashboard(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ahora = new Date()
    const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59)

    const [{ data: citasMesActual }, { data: citasMesAnterior }] = await Promise.all([
      supabase
        .from('citas')
        .select('*, clientes(nombre), cita_servicios(servicios(nombre))')
        .eq('empresa_id', user.id)
        .eq('estado', 'facturada')
        .gte('facturada_en', inicioMesActual.toISOString())
        .lte('facturada_en', ahora.toISOString()),
      supabase
        .from('citas')
        .select('valor_total')
        .eq('empresa_id', user.id)
        .eq('estado', 'facturada')
        .gte('facturada_en', inicioMesAnterior.toISOString())
        .lte('facturada_en', finMesAnterior.toISOString())
    ])

    const listaMesActual = citasMesActual || []
    const listaMesAnterior = citasMesAnterior || []

    setIngresosMesActual(listaMesActual.reduce((sum, c) => sum + (c.valor_total || 0), 0))
    setIngresosMesAnterior(listaMesAnterior.reduce((sum, c) => sum + (c.valor_total || 0), 0))

    // Servicio más vendido del mes
    const conteoServicios: Record<string, number> = {}
    listaMesActual.forEach(c => {
      (c.cita_servicios || []).forEach((cs: any) => {
        const nombre = cs.servicios?.nombre
        if (nombre) conteoServicios[nombre] = (conteoServicios[nombre] || 0) + 1
      })
    })
    const topServicio = Object.entries(conteoServicios).sort((a, b) => b[1] - a[1])[0]
    setServicioTop(topServicio ? { nombre: topServicio[0], veces: topServicio[1] } : null)

    // Cliente más frecuente del mes
    const conteoClientes: Record<string, number> = {}
    listaMesActual.forEach(c => {
      const nombre = c.clientes?.nombre
      if (nombre) conteoClientes[nombre] = (conteoClientes[nombre] || 0) + 1
    })
    const topCliente = Object.entries(conteoClientes).sort((a, b) => b[1] - a[1])[0]
    setClienteTop(topCliente ? { nombre: topCliente[0], veces: topCliente[1] } : null)

    // Día de la semana más ocupado del mes
    const conteoDias: Record<string, number> = {}
    listaMesActual.forEach(c => {
      const nombreDia = new Date(c.fecha_inicio || c.facturada_en).toLocaleDateString('es-CO', { weekday: 'long' })
      conteoDias[nombreDia] = (conteoDias[nombreDia] || 0) + 1
    })
    const topDia = Object.entries(conteoDias).sort((a, b) => b[1] - a[1])[0]
    setDiaTop(topDia ? { nombre: topDia[0], veces: topDia[1] } : null)

    setCargandoDashboard(false)
  }

  // --- Categorías de gastos ---
  const cargarCategorias = async () => {
    setCargandoCategorias(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('categorias_gastos')
      .select('*')
      .eq('empresa_id', user.id)
      .order('nombre')

    if (data && data.length > 0) {
      setCategorias(data)
      setCategoriaSeleccionada(prev => prev || data[0].nombre)
    } else {
      // Primera vez: sembramos las categorías por defecto
      const filas = CATEGORIAS_POR_DEFECTO.map(nombre => ({ empresa_id: user.id, nombre }))
      const { data: creadas } = await supabase.from('categorias_gastos').insert(filas).select()
      const listaCreadas = creadas || []
      setCategorias(listaCreadas)
      if (listaCreadas[0]) setCategoriaSeleccionada(listaCreadas[0].nombre)
    }
    setCargandoCategorias(false)
  }

  const agregarCategoria = async () => {
    if (!nuevaCategoria.trim()) return
    setLoadingCategoria(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('categorias_gastos').insert({
      empresa_id: user?.id,
      nombre: nuevaCategoria.trim()
    })
    if (error) {
      toast('No se pudo crear la categoría', 'error')
    } else {
      setNuevaCategoria('')
      cargarCategorias()
    }
    setLoadingCategoria(false)
  }

  const iniciarEdicionCategoria = (cat: any) => {
    setEditandoCategoriaId(cat.id)
    setEditandoCategoriaNombre(cat.nombre)
  }

  const guardarEdicionCategoria = async () => {
    if (!editandoCategoriaId || !editandoCategoriaNombre.trim()) return
    setLoadingCategoria(true)
    const { error } = await supabase
      .from('categorias_gastos')
      .update({ nombre: editandoCategoriaNombre.trim() })
      .eq('id', editandoCategoriaId)
    if (error) {
      toast('No se pudo actualizar la categoría', 'error')
    } else {
      setEditandoCategoriaId(null)
      setEditandoCategoriaNombre('')
      cargarCategorias()
    }
    setLoadingCategoria(false)
  }

  const borrarCategoria = async (id: string) => {
    setLoadingCategoria(true)
    const { error } = await supabase.from('categorias_gastos').delete().eq('id', id)
    if (error) {
      toast('No se pudo borrar la categoría', 'error')
    } else {
      cargarCategorias()
    }
    setLoadingCategoria(false)
  }

  const agregarGasto = async () => {
    if (!descripcion.trim() || !valorGasto) return
    if (!categoriaSeleccionada) { toast('Selecciona una categoría', 'error'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('gastos').insert({
      empresa_id: user?.id,
      descripcion: descripcion.trim(),
      valor: parseFloat(valorGasto),
      fecha: new Date().toISOString().split('T')[0],
      categoria: categoriaSeleccionada
    })
    if (error) {
      toast('No se pudo guardar el gasto', 'error')
      setLoading(false)
      return
    }
    toast('Gasto registrado', 'success')
    setDescripcion('')
    setValorGasto('')
    setMostrarFormGasto(false)
    setLoading(false)
    cargarDatos()
    cargarDashboard()
  }

  const periodos: { key: Periodo, label: string }[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'semana', label: 'Semana' },
    { key: 'mes', label: 'Mes' },
    { key: 'año', label: 'Año' },
  ]

  const variacionMensual = ingresosMesAnterior > 0
    ? ((ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior) * 100
    : (ingresosMesActual > 0 ? 100 : 0)
  const subioIngresos = variacionMensual >= 0

  // --- Íconos de línea, mismo trazo del resto de la app ---
  const IconBack = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
  const IconPlus = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
  const IconClose = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
  const IconUp = (p: any) => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
  const IconDown = (p: any) => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  )
  const IconTag = (p: any) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83z" />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
  const IconEdit = (p: any) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  )
  const IconTrash = (p: any) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
    </svg>
  )
  const IconCheck = (p: any) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )

  const inputClassGasto = "w-full bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl px-4 py-3 text-[#1F1B18] text-sm placeholder:text-[#B4AC9E] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57]"

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="bg-white px-6 pt-12 pb-6 border-b border-[#EFEAE2]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="w-10 h-10 rounded-full border border-[#E7E2DA] flex items-center justify-center text-[#8A8378] hover:text-[#1F1B18] hover:border-[#1F1B18] transition-colors">
            <IconBack />
          </button>
          <div>
            <h1 className="text-2xl text-[#1F1B18]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Finanzas</h1>
            <p className="text-[#8A8378] text-sm">Ingresos y gastos</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 pb-28 space-y-5">
        {/* Selector de período: controla el resumen y las listas de abajo */}
        <div>
          <h2 className="text-[11px] font-semibold tracking-[0.18em] text-[#8A8378] uppercase mb-2">Consultar por período</h2>
          <div className="flex gap-2">
            {periodos.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriodo(p.key)}
                className={`flex-1 py-2 rounded-2xl text-sm font-semibold transition-all ${periodo === p.key ? 'bg-[#1F1B18] text-white' : 'bg-[#F3EDE3] text-[#8A6A3A]'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resumen del período seleccionado */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1F1B18] rounded-3xl p-4 text-white">
            <p className="text-[#A79A8A] text-xs">Ingresos</p>
            <p className="text-lg font-semibold mt-1" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>${ingresos.toLocaleString()}</p>
          </div>
          <div className="bg-[#8C2F27] rounded-3xl p-4 text-white">
            <p className="text-white/70 text-xs">Gastos</p>
            <p className="text-lg font-semibold mt-1" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>${gastos.toLocaleString()}</p>
          </div>
        </div>

        {/* Aspectos destacados del mes: siempre mes actual, no depende del selector */}
        <div>
          <h2 className="text-[11px] font-semibold tracking-[0.18em] text-[#8A8378] uppercase mb-3">Aspectos destacados del mes</h2>
          {cargandoDashboard ? (
            <SkeletonGrid celdas={4} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-[#EFEAE2] rounded-3xl p-4">
                <p className="text-[#8A8378] text-xs">Crecimiento mensual</p>
                <p className="text-lg font-semibold text-[#1F1B18] mt-1">${ingresosMesActual.toLocaleString()}</p>
                <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${subioIngresos ? 'text-[#2F4A3C]' : 'text-[#A8392F]'}`}>
                  {subioIngresos ? <IconUp /> : <IconDown />} {Math.abs(variacionMensual).toFixed(0)}% vs mes anterior
                </p>
              </div>

              <div className="bg-white border border-[#EFEAE2] rounded-3xl p-4">
                <p className="text-[#8A8378] text-xs">Servicio más vendido</p>
                <p className="text-lg font-semibold text-[#1F1B18] mt-1 truncate">{servicioTop?.nombre || '—'}</p>
                <p className="text-xs text-[#8A8378] mt-1">{servicioTop ? `${servicioTop.veces} veces este mes` : 'Sin datos aún'}</p>
              </div>

              <div className="bg-white border border-[#EFEAE2] rounded-3xl p-4">
                <p className="text-[#8A8378] text-xs">Cliente más frecuente</p>
                <p className="text-lg font-semibold text-[#1F1B18] mt-1 truncate">{clienteTop?.nombre || '—'}</p>
                <p className="text-xs text-[#8A8378] mt-1">{clienteTop ? `${clienteTop.veces} citas este mes` : 'Sin datos aún'}</p>
              </div>

              <div className="bg-white border border-[#EFEAE2] rounded-3xl p-4">
                <p className="text-[#8A8378] text-xs">Día más ocupado</p>
                <p className="text-lg font-semibold text-[#1F1B18] mt-1 capitalize">{diaTop?.nombre || '—'}</p>
                <p className="text-xs text-[#8A8378] mt-1">{diaTop ? `${diaTop.veces} citas este mes` : 'Sin datos aún'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Ingresos: lista de citas facturadas del período */}
        <div className="bg-white border border-[#EFEAE2] rounded-3xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-[#1F1B18]">Ingresos ({citas.length})</h2>
            <span className="text-[#8A6A3A] font-semibold">${ingresos.toLocaleString()}</span>
          </div>
          {citas.length === 0 ? (
            <p className="text-[#8A8378] text-sm text-center py-4">Sin ingresos en este período</p>
          ) : (
            <div className="space-y-2">
              {citas.map(cita => (
                <div key={cita.id} className="flex justify-between items-center py-2 border-b border-[#F3EDE3] last:border-b-0">
                  <div>
                    <p className="text-[#1F1B18] text-sm font-semibold">{new Date(cita.facturada_en).toLocaleDateString('es-CO')}</p>
                    <p className="text-[#8A8378] text-xs">{cita.metodo_pago}</p>
                  </div>
                  <p className="text-[#8A6A3A] font-semibold text-sm">${cita.valor_total?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gastos: lista + formulario + gestión de categorías */}
        <div className="bg-white border border-[#EFEAE2] rounded-3xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-[#1F1B18]">Gastos ({listaGastos.length})</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMostrarModalCategorias(true)}
                className="w-8 h-8 bg-[#F3EDE3] rounded-xl flex items-center justify-center text-[#8A6A3A]"
                aria-label="Gestionar categorías"
              >
                <IconTag />
              </button>
              <button
                onClick={() => setMostrarFormGasto(!mostrarFormGasto)}
                className="w-8 h-8 bg-[#8C2F27] rounded-xl flex items-center justify-center text-white"
              >
                {mostrarFormGasto ? <IconClose /> : <IconPlus />}
              </button>
            </div>
          </div>

          {mostrarFormGasto && (
            <div className="space-y-3 mb-4 pb-4 border-b border-[#EFEAE2]">
              <input
                type="text"
                placeholder="Descripción del gasto"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className={inputClassGasto}
              />
              <MoneyInput
                value={valorGasto}
                onChange={setValorGasto}
                placeholder="Valor"
                className={inputClassGasto}
              />
              <select
                value={categoriaSeleccionada}
                onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                className={inputClassGasto}
              >
                {categorias.length === 0 && <option value="">Sin categorías creadas</option>}
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                ))}
              </select>
              {categorias.length === 0 && !cargandoCategorias && (
                <button
                  type="button"
                  onClick={() => setMostrarModalCategorias(true)}
                  className="text-[#8A6A3A] text-xs font-semibold underline"
                >
                  Crea una categoría primero
                </button>
              )}
              <div className="flex gap-3">
                <button onClick={() => setMostrarFormGasto(false)} className="flex-1 bg-[#F3EDE3] text-[#5C564C] py-3 rounded-2xl text-sm font-semibold">Cancelar</button>
                <button onClick={agregarGasto} disabled={loading} className="flex-1 bg-[#8C2F27] text-white py-3 rounded-2xl text-sm font-semibold disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {listaGastos.length === 0 ? (
            <p className="text-[#8A8378] text-sm text-center py-4">Sin gastos en este período</p>
          ) : (
            <div className="space-y-2">
              {listaGastos.map(gasto => (
                <div key={gasto.id} className="flex justify-between items-center py-2 border-b border-[#F3EDE3] last:border-b-0">
                  <div>
                    <p className="text-[#1F1B18] text-sm font-semibold">{gasto.descripcion}</p>
                    <p className="text-[#8A8378] text-xs">{gasto.categoria} · {new Date(gasto.fecha).toLocaleDateString('es-CO')}</p>
                  </div>
                  <p className="text-[#A8392F] font-semibold text-sm">${gasto.valor?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: gestionar categorías de gastos */}
      {mostrarModalCategorias && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setMostrarModalCategorias(false)}>
          <div className="bg-[#FAF8F5] rounded-t-3xl w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[20px] text-[#1F1B18]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
                Categorías de gastos
              </h3>
              <button
                onClick={() => setMostrarModalCategorias(false)}
                className="w-9 h-9 rounded-full border border-[#E7E2DA] flex items-center justify-center text-[#8A8378]"
              >
                <IconClose />
              </button>
            </div>

            {/* Crear nueva categoría */}
            <div className="flex gap-2 mb-5">
              <input
                type="text"
                placeholder="Nueva categoría"
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && agregarCategoria()}
                className="flex-1 bg-white border border-[#E7E2DA] rounded-2xl px-4 py-3 text-[#1F1B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#B08D57]"
              />
              <button
                onClick={agregarCategoria}
                disabled={loadingCategoria || !nuevaCategoria.trim()}
                className="w-12 bg-[#1F1B18] rounded-2xl flex items-center justify-center text-white disabled:opacity-50"
              >
                <IconPlus />
              </button>
            </div>

            {/* Lista de categorías existentes */}
            <div className="space-y-2 pb-2">
              {cargandoCategorias ? (
                <p className="text-[#8A8378] text-sm text-center py-4">Cargando...</p>
              ) : categorias.length === 0 ? (
                <p className="text-[#8A8378] text-sm text-center py-4">Aún no tienes categorías. Crea la primera arriba.</p>
              ) : (
                categorias.map(cat => (
                  <div key={cat.id} className="bg-white border border-[#EFEAE2] rounded-2xl px-4 py-3 flex items-center justify-between">
                    {editandoCategoriaId === cat.id ? (
                      <input
                        type="text"
                        value={editandoCategoriaNombre}
                        onChange={(e) => setEditandoCategoriaNombre(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && guardarEdicionCategoria()}
                        autoFocus
                        className="flex-1 bg-[#FAF8F5] border border-[#E7E2DA] rounded-xl px-3 py-1.5 text-sm text-[#1F1B18] focus:outline-none focus:ring-2 focus:ring-[#B08D57] mr-2"
                      />
                    ) : (
                      <p className="text-[#1F1B18] text-sm font-medium">{cat.nombre}</p>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {editandoCategoriaId === cat.id ? (
                        <button
                          onClick={guardarEdicionCategoria}
                          disabled={loadingCategoria}
                          className="w-8 h-8 rounded-full bg-[#E7F0EC] text-[#2F5D4E] flex items-center justify-center"
                        >
                          <IconCheck />
                        </button>
                      ) : (
                        <button
                          onClick={() => iniciarEdicionCategoria(cat)}
                          className="w-8 h-8 rounded-full bg-[#F3EDE3] text-[#8A6A3A] flex items-center justify-center"
                        >
                          <IconEdit />
                        </button>
                      )}
                      <button
                        onClick={() => borrarCategoria(cat.id)}
                        disabled={loadingCategoria}
                        className="w-8 h-8 rounded-full bg-[#F7E5E2] text-[#8C2F27] flex items-center justify-center"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
