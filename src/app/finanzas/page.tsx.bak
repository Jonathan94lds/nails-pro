'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Periodo = 'hoy' | 'semana' | 'mes' | 'año'

export default function FinanzasPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [ingresos, setIngresos] = useState(0)
  const [gastos, setGastos] = useState(0)
  const [citas, setCitas] = useState<any[]>([])
  const [listaGastos, setListaGastos] = useState<any[]>([])
  const [mostrarFormGasto, setMostrarFormGasto] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [valorGasto, setValorGasto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [loading, setLoading] = useState(false)

  // --- Dashboard del mes (independiente del selector de período) ---
  const [ingresosMesActual, setIngresosMesActual] = useState(0)
  const [ingresosMesAnterior, setIngresosMesAnterior] = useState(0)
  const [servicioTop, setServicioTop] = useState<{ nombre: string, veces: number } | null>(null)
  const [clienteTop, setClienteTop] = useState<{ nombre: string, veces: number } | null>(null)
  const [diaTop, setDiaTop] = useState<{ nombre: string, veces: number } | null>(null)
  const [cargandoDashboard, setCargandoDashboard] = useState(true)

  const router = useRouter()

  useEffect(() => { cargarDatos() }, [periodo])
  useEffect(() => { cargarDashboard() }, [])

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
  // los 4 datos del dashboard: ingresos vs mes anterior, servicio más
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

  const agregarGasto = async () => {
    if (!descripcion.trim() || !valorGasto) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('gastos').insert({
      empresa_id: user?.id,
      descripcion: descripcion.trim(),
      valor: parseFloat(valorGasto),
      fecha: new Date().toISOString().split('T')[0],
      categoria: categoria || 'general'
    })
    setDescripcion('')
    setValorGasto('')
    setCategoria('')
    setMostrarFormGasto(false)
    setLoading(false)
    cargarDatos()
    cargarDashboard()
  }

  const utilidad = ingresos - gastos
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/dashboard')} className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center">
            <span className="text-lg">←</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
            <p className="text-gray-400 text-sm">Ingresos y gastos</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Dashboard del mes: 4 tarjetas con lo que más importa de un vistazo */}
        <div>
          <h2 className="font-bold text-gray-800 mb-3">Dashboard del mes</h2>
          {cargandoDashboard ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-3xl p-4 shadow-sm h-24 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Ingresos vs mes anterior */}
              <div className="bg-white rounded-3xl p-4 shadow-sm">
                <p className="text-gray-400 text-xs">Ingresos totales (mes actual)</p>
                <p className="text-lg font-bold text-gray-800 mt-1">${ingresosMesActual.toLocaleString()}</p>
                <p className={`text-xs font-semibold mt-1 ${subioIngresos ? 'text-green-500' : 'text-red-400'}`}>
                  {subioIngresos ? '▲' : '▼'} {Math.abs(variacionMensual).toFixed(0)}% vs mes anterior
                </p>
              </div>

              {/* Servicio más vendido */}
              <div className="bg-white rounded-3xl p-4 shadow-sm">
                <p className="text-gray-400 text-xs">Servicio más vendido</p>
                <p className="text-lg font-bold text-gray-800 mt-1 truncate">{servicioTop?.nombre || '—'}</p>
                <p className="text-xs text-gray-400 mt-1">{servicioTop ? `${servicioTop.veces} veces este mes` : 'Sin datos aún'}</p>
              </div>

              {/* Cliente más frecuente */}
              <div className="bg-white rounded-3xl p-4 shadow-sm">
                <p className="text-gray-400 text-xs">Cliente más frecuente</p>
                <p className="text-lg font-bold text-gray-800 mt-1 truncate">{clienteTop?.nombre || '—'}</p>
                <p className="text-xs text-gray-400 mt-1">{clienteTop ? `${clienteTop.veces} citas este mes` : 'Sin datos aún'}</p>
              </div>

              {/* Día más ocupado */}
              <div className="bg-white rounded-3xl p-4 shadow-sm">
                <p className="text-gray-400 text-xs">Día más ocupado</p>
                <p className="text-lg font-bold text-gray-800 mt-1 capitalize">{diaTop?.nombre || '—'}</p>
                <p className="text-xs text-gray-400 mt-1">{diaTop ? `${diaTop.veces} citas este mes` : 'Sin datos aún'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Selector de período */}
        <div>
          <h2 className="font-bold text-gray-800 mb-2">Consultar por período</h2>
          <div className="flex gap-2">
            {periodos.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriodo(p.key)}
                className={`flex-1 py-2 rounded-2xl text-sm font-semibold transition-all ${periodo === p.key ? 'bg-teal-400 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-teal-400 rounded-3xl p-4 text-white">
            <p className="text-teal-100 text-xs">Ingresos</p>
            <p className="text-xl font-bold mt-1">${ingresos.toLocaleString()}</p>
          </div>
          <div className="bg-red-400 rounded-3xl p-4 text-white">
            <p className="text-red-100 text-xs">Gastos</p>
            <p className="text-xl font-bold mt-1">${gastos.toLocaleString()}</p>
          </div>
          <div className={`${utilidad >= 0 ? 'bg-green-400' : 'bg-orange-400'} rounded-3xl p-4 text-white`}>
            <p className="text-white text-opacity-80 text-xs">Utilidad</p>
            <p className="text-xl font-bold mt-1">${utilidad.toLocaleString()}</p>
          </div>
        </div>

        {/* Citas facturadas */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-gray-800">Ingresos ({citas.length})</h2>
            <span className="text-teal-500 font-bold">${ingresos.toLocaleString()}</span>
          </div>
          {citas.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Sin ingresos en este período</p>
          ) : (
            <div className="space-y-2">
              {citas.map(cita => (
                <div key={cita.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="text-gray-800 text-sm font-semibold">{new Date(cita.facturada_en).toLocaleDateString('es-CO')}</p>
                    <p className="text-gray-400 text-xs">{cita.metodo_pago}</p>
                  </div>
                  <p className="text-teal-500 font-bold text-sm">${cita.valor_total?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gastos */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-gray-800">Gastos ({listaGastos.length})</h2>
            <button
              onClick={() => setMostrarFormGasto(!mostrarFormGasto)}
              className="w-8 h-8 bg-red-400 rounded-xl flex items-center justify-center"
            >
              <span className="text-white text-lg font-light">{mostrarFormGasto ? '×' : '+'}</span>
            </button>
          </div>

          {mostrarFormGasto && (
            <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
              <input
                type="text"
                placeholder="Descripción del gasto"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <input
                type="number"
                placeholder="Valor"
                value={valorGasto}
                onChange={(e) => setValorGasto(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <option value="">Categoría</option>
                <option value="insumos">Insumos</option>
                <option value="arriendo">Arriendo</option>
                <option value="servicios">Servicios públicos</option>
                <option value="transporte">Transporte</option>
                <option value="general">General</option>
              </select>
              <div className="flex gap-3">
                <button onClick={() => setMostrarFormGasto(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-2xl text-sm font-semibold">Cancelar</button>
                <button onClick={agregarGasto} disabled={loading} className="flex-1 bg-red-400 text-white py-3 rounded-2xl text-sm font-semibold disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {listaGastos.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Sin gastos en este período</p>
          ) : (
            <div className="space-y-2">
              {listaGastos.map(gasto => (
                <div key={gasto.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="text-gray-800 text-sm font-semibold">{gasto.descripcion}</p>
                    <p className="text-gray-400 text-xs">{gasto.categoria} · {new Date(gasto.fecha).toLocaleDateString('es-CO')}</p>
                  </div>
                  <p className="text-red-400 font-bold text-sm">${gasto.valor?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
