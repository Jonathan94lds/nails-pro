'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Providers'
import { useConfirm } from '@/components/Providers'
import { SkeletonList } from '@/components/Skeleton'
import MoneyInput from '@/components/MoneyInput'
import BottomNav from '@/components/BottomNav'

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [valor, setValor] = useState('')
  const [duracion, setDuracion] = useState('')
  const [loading, setLoading] = useState(false)
  const [cargandoLista, setCargandoLista] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const router = useRouter()
  const toast = useToast()
  const confirmar = useConfirm()

  const cargarServicios = useCallback(async () => {
    setCargandoLista(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('servicios')
      .select('*')
      .eq('empresa_id', user.id)
      .order('nombre')
    setServicios(data || [])
    setCargandoLista(false)
  }, [router])

  useEffect(() => { cargarServicios() }, [cargarServicios])

  const agregarServicio = async () => {
    if (!nombre.trim() || !valor || !duracion) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('servicios').insert({
      empresa_id: user?.id,
      nombre: nombre.trim(),
      valor: parseFloat(valor),
      duracion_min: parseInt(duracion),
      activo: true
    })
    if (error) {
      toast('No se pudo guardar el servicio', 'error')
      setLoading(false)
      return
    }
    toast(`${nombre.trim()} agregado a tus servicios`, 'success')
    setNombre('')
    setValor('')
    setDuracion('')
    setMostrarForm(false)
    setLoading(false)
    cargarServicios()
  }

  const toggleActivo = async (id: string, activo: boolean, nombreServicio: string) => {
    // Solo pedimos confirmación al desactivar — activar de nuevo no tiene riesgo
    if (activo) {
      const ok = await confirmar({
        title: 'Desactivar servicio',
        message: `${nombreServicio} dejará de aparecer al agendar nuevas citas. Podrás activarlo de nuevo cuando quieras.`,
        confirmText: 'Desactivar',
        danger: true,
      })
      if (!ok) return
    }
    await supabase.from('servicios').update({ activo: !activo }).eq('id', id)
    toast(activo ? `${nombreServicio} desactivado` : `${nombreServicio} activado`, 'success')
    cargarServicios()
  }

  // Rotación de fondos dentro de la paleta de marca — nada de colores dispersos
  const fondos = ['bg-[#1F1B18]', 'bg-[#B08D57]', 'bg-[#2F4A3C]']

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
  const IconServicio = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
    </svg>
  )
  const IconServicioGrande = (p: any) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
    </svg>
  )
  const IconReloj = (p: any) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )

  const inputClass = "w-full bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl px-4 py-4 text-[#1F1B18] placeholder:text-[#B4AC9E] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57]"

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="bg-white px-6 pt-12 pb-6 border-b border-[#EFEAE2]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-10 h-10 rounded-full border border-[#E7E2DA] flex items-center justify-center text-[#8A8378] hover:text-[#1F1B18] hover:border-[#1F1B18] transition-colors"
            >
              <IconBack />
            </button>
            <div>
              <h1 className="text-2xl text-[#1F1B18]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Servicios</h1>
              <p className="text-[#8A8378] text-sm">{servicios.length} servicios</p>
            </div>
          </div>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="w-10 h-10 bg-[#1F1B18] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            {mostrarForm ? <IconClose /> : <IconPlus />}
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div className="mx-4 mt-4 bg-white border border-[#EFEAE2] rounded-3xl p-5">
          <h2 className="font-semibold text-[#1F1B18] mb-4">Nuevo servicio</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre del servicio"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClass}
            />
            <MoneyInput
              value={valor}
              onChange={(val) => setValor(String(val))}
              placeholder="Precio (ej: 25.000)"
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Duración en minutos (ej: 45)"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              className={inputClass}
            />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setMostrarForm(false)}
                className="flex-1 bg-[#F3EDE3] text-[#5C564C] py-4 rounded-2xl font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={agregarServicio}
                disabled={loading}
                className="flex-1 bg-[#1F1B18] text-white py-4 rounded-2xl font-semibold disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 pb-28 space-y-3">
        {cargandoLista ? (
          <SkeletonList filas={5} />
        ) : servicios.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-[#F3EDE3] rounded-3xl flex items-center justify-center mx-auto mb-4 text-[#8A6A3A]">
              <IconServicioGrande />
            </div>
            <p className="text-[#1F1B18] font-semibold">Sin servicios aún</p>
            <p className="text-[#8A8378] text-sm mt-1">Toca + para agregar tu primer servicio</p>
          </div>
        ) : (
          servicios.map((servicio, index) => (
            <div key={servicio.id} className={`bg-white border border-[#EFEAE2] rounded-3xl px-5 py-4 flex items-center gap-4 ${!servicio.activo ? 'opacity-50' : ''}`}>
              <div className={`${fondos[index % fondos.length]} w-12 h-12 rounded-2xl flex items-center justify-center text-white`}>
                <IconServicio />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#1F1B18]">{servicio.nombre}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[#8A6A3A] font-semibold text-sm">${servicio.valor.toLocaleString()}</span>
                  <span className="text-[#8A8378] text-sm flex items-center gap-1">
                    <IconReloj /> {servicio.duracion_min} min
                  </span>
                </div>
              </div>
              <button
                onClick={() => toggleActivo(servicio.id, servicio.activo, servicio.nombre)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold ${servicio.activo ? 'bg-[#E7EDE9] text-[#2F4A3C]' : 'bg-[#F1EEE9] text-[#B4AC9E]'}`}
              >
                {servicio.activo ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  )
}
