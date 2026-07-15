'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const router = useRouter()

  useEffect(() => { cargarClientes() }, [])

  const cargarClientes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', user.id)
      .order('nombre')
    setClientes(data || [])
  }

  const agregarCliente = async () => {
    if (!nombre.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('clientes').insert({
      empresa_id: user?.id,
      nombre: nombre.trim(),
      telefono: telefono.trim()
    })
    setNombre('')
    setTelefono('')
    setMostrarForm(false)
    setLoading(false)
    cargarClientes()
  }

  const colores = ['bg-teal-400', 'bg-purple-400', 'bg-blue-400', 'bg-pink-400', 'bg-orange-400', 'bg-green-400']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center"
            >
              <span className="text-lg">←</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
              <p className="text-gray-400 text-sm">{clientes.length} contactos</p>
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

      {/* Formulario nuevo cliente */}
      {mostrarForm && (
        <div className="mx-4 mt-4 bg-white rounded-3xl shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-4">Nuevo cliente</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setMostrarForm(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={agregarCliente}
                disabled={loading}
                className="flex-1 bg-teal-400 text-white py-4 rounded-2xl font-semibold shadow-md disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      <div className="px-4 py-4 space-y-3">
        {clientes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">👥</span>
            </div>
            <p className="text-gray-800 font-semibold">Sin clientes aún</p>
            <p className="text-gray-400 text-sm mt-1">Toca + para agregar tu primer cliente</p>
          </div>
        ) : (
          clientes.map((cliente, index) => (
            <div
              key={cliente.id}
              onClick={() => router.push(`/clientes/${cliente.id}`)}
              className="bg-white rounded-3xl px-5 py-4 flex items-center gap-4 shadow-sm cursor-pointer active:scale-95 transition-transform"
            >
              <div className={`${colores[index % colores.length]} w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm`}>
                <span className="text-white font-bold text-lg">
                  {cliente.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{cliente.nombre}</p>
                <p className="text-gray-400 text-sm">{cliente.telefono || 'Sin teléfono'}</p>
              </div>
              <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center">
                <span className="text-gray-300">›</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}