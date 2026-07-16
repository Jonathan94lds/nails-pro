'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [valor, setValor] = useState('')
  const [duracion, setDuracion] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const router = useRouter()

  useEffect(() => { cargarServicios() }, [])

  const cargarServicios = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('servicios')
      .select('*')
      .eq('empresa_id', user.id)
      .order('nombre')
    setServicios(data || [])
  }

  const agregarServicio = async () => {
    if (!nombre.trim() || !valor || !duracion) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('servicios').insert({
      empresa_id: user?.id,
      nombre: nombre.trim(),
      valor: parseFloat(valor),
      duracion_min: parseInt(duracion),
      activo: true
    })
    setNombre('')
    setValor('')
    setDuracion('')
    setMostrarForm(false)
    setLoading(false)
    cargarServicios()
  }

  const toggleActivo = async (id: string, activo: boolean) => {
    await supabase.from('servicios').update({ activo: !activo }).eq('id', id)
    cargarServicios()
  }

  const colores = ['bg-purple-400', 'bg-teal-400', 'bg-pink-400', 'bg-blue-400', 'bg-orange-400']

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center"
            >
              <span className="text-2xl font-bold">←</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
              <p className="text-gray-400 text-sm">{servicios.length} servicios</p>
            </div>
          </div>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="w-10 h-10 bg-purple-400 rounded-2xl flex items-center justify-center shadow-md"
          >
            <span className="text-white text-2xl font-light">{mostrarForm ? '×' : '+'}</span>
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div className="mx-4 mt-4 bg-white rounded-3xl shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-4">Nuevo servicio</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre del servicio"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <input
              type="number"
              placeholder="Precio (ej: 25000)"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <input
              type="number"
              placeholder="Duración en minutos (ej: 45)"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setMostrarForm(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={agregarServicio}
                disabled={loading}
                className="flex-1 bg-purple-400 text-white py-4 rounded-2xl font-semibold shadow-md disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-3">
        {servicios.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✨</span>
            </div>
            <p className="text-gray-800 font-semibold">Sin servicios aún</p>
            <p className="text-gray-400 text-sm mt-1">Toca + para agregar tu primer servicio</p>
          </div>
        ) : (
          servicios.map((servicio, index) => (
            <div key={servicio.id} className={`bg-white rounded-3xl px-5 py-4 flex items-center gap-4 shadow-sm ${!servicio.activo ? 'opacity-50' : ''}`}>
              <div className={`${colores[index % colores.length]} w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm`}>
                <span className="text-white text-xl">✨</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{servicio.nombre}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-teal-500 font-semibold text-sm">${servicio.valor.toLocaleString()}</span>
                  <span className="text-gray-400 text-sm">⏱ {servicio.duracion_min} min</span>
                </div>
              </div>
              <button
                onClick={() => toggleActivo(servicio.id, servicio.activo)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold ${servicio.activo ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400'}`}
              >
                {servicio.activo ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
