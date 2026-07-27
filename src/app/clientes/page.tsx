'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Providers'
import { SkeletonList } from '@/components/Skeleton'
import BottomNav from '@/components/BottomNav'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading] = useState(false)
  const [cargandoLista, setCargandoLista] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const router = useRouter()
  const toast = useToast()

  useEffect(() => { cargarClientes() }, [])

  const cargarClientes = async () => {
    setCargandoLista(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', user.id)
      .order('nombre')
    setClientes(data || [])
    setCargandoLista(false)
  }

  const agregarCliente = async () => {
    if (!nombre.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('clientes').insert({
      empresa_id: user?.id,
      nombre: nombre.trim(),
      telefono: telefono.trim()
    })
    if (error) {
      toast('No se pudo guardar el cliente', 'error')
      setLoading(false)
      return
    }
    toast(`${nombre.trim()} agregado a tus clientes`, 'success')
    setNombre('')
    setTelefono('')
    setMostrarForm(false)
    setLoading(false)
    cargarClientes()
  }

  // Iniciales sobre fondo de la paleta de marca — tinta y dorado, sin colores dispersos
  const inicialFondos = ['bg-[#1F1B18]', 'bg-[#B08D57]', 'bg-[#2F4A3C]']

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.telefono || '').includes(busqueda)
  )

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
  const IconSearch = (p: any) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
  const IconChevron = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
  const IconClientes = (p: any) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 border-b border-[#EFEAE2]">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-10 h-10 rounded-full border border-[#E7E2DA] flex items-center justify-center text-[#8A8378] hover:text-[#1F1B18] hover:border-[#1F1B18] transition-colors"
            >
              <IconBack />
            </button>
            <div>
              <h1 className="text-2xl text-[#1F1B18]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Clientes</h1>
              <p className="text-[#8A8378] text-sm">{clientesFiltrados.length} contactos</p>
            </div>
          </div>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="w-10 h-10 bg-[#1F1B18] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            {mostrarForm ? <IconClose /> : <IconPlus />}
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8378]">
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Buscar cliente por nombre o teléfono"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl pl-11 pr-4 py-3 text-[#1F1B18] placeholder:text-[#B4AC9E] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57]"
          />
        </div>
      </div>

      {/* Formulario nuevo cliente */}
      {mostrarForm && (
        <div className="mx-4 mt-4 bg-white border border-[#EFEAE2] rounded-3xl p-5">
          <h2 className="font-semibold text-[#1F1B18] mb-4">Nuevo cliente</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl px-4 py-4 text-[#1F1B18] placeholder:text-[#B4AC9E] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57]"
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl px-4 py-4 text-[#1F1B18] placeholder:text-[#B4AC9E] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57]"
            />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setMostrarForm(false)}
                className="flex-1 bg-[#F3EDE3] text-[#5C564C] py-4 rounded-2xl font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={agregarCliente}
                disabled={loading}
                className="flex-1 bg-[#1F1B18] text-white py-4 rounded-2xl font-semibold disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      <div className="px-4 py-4 pb-28 space-y-3">
        {cargandoLista ? (
          <SkeletonList filas={5} />
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-[#F3EDE3] rounded-3xl flex items-center justify-center mx-auto mb-4 text-[#8A6A3A]">
              <IconClientes />
            </div>
            <p className="text-[#1F1B18] font-semibold">
              {busqueda ? 'Sin resultados' : 'Sin clientes aún'}
            </p>
            <p className="text-[#8A8378] text-sm mt-1">
              {busqueda ? 'Intenta con otro nombre o teléfono' : 'Toca + para agregar tu primer cliente'}
            </p>
          </div>
        ) : (
          clientesFiltrados.map((cliente, index) => (
            <div
              key={cliente.id}
              onClick={() => router.push(`/clientes/${cliente.id}`)}
              className="bg-white border border-[#EFEAE2] rounded-3xl px-5 py-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className={`${inicialFondos[index % inicialFondos.length]} w-12 h-12 rounded-2xl flex items-center justify-center`}>
                <span className="text-white font-semibold text-lg" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
                  {cliente.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#1F1B18]">{cliente.nombre}</p>
                <p className="text-[#8A8378] text-sm">{cliente.telefono || 'Sin teléfono'}</p>
              </div>
              <div className="w-8 h-8 bg-[#FAF8F5] rounded-xl flex items-center justify-center text-[#B4AC9E]">
                <IconChevron />
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  )
}
