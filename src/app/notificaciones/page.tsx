'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Providers'

export default function NotificacionesPage() {
  const [citas, setCitas] = useState<any[]>([])
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [cargando, setCargando] = useState(true)
  const router = useRouter()
  const toast = useToast()

  useEffect(() => { cargarCitas() }, [fecha])

  const cargarCitas = async () => {
    setCargando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const inicio = new Date(`${fecha}T00:00:00`).toISOString()
    const fin = new Date(`${fecha}T23:59:59`).toISOString()

    const { data } = await supabase
      .from('citas')
      .select('*, clientes(nombre, telefono), cita_servicios(servicios(nombre))')
      .eq('empresa_id', user.id)
      .eq('estado', 'pendiente')
      .gte('fecha_inicio', inicio)
      .lte('fecha_inicio', fin)
      .order('fecha_inicio')

    setCitas(data || [])
    setCargando(false)
  }

  const formatHora = (f: string) => {
    return new Date(f).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const formatFechaLarga = (f: string) => {
    return new Date(f).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const enviarWhatsApp = (cita: any) => {
    const telefono = cita.clientes?.telefono?.replace(/\D/g, '')
    if (!telefono) {
      toast('Este cliente no tiene teléfono registrado', 'error')
      return
    }

    const serviciosNombres = cita.cita_servicios
      ?.map((cs: any) => cs.servicios?.nombre)
      .filter(Boolean)
      .join(', ') || 'tu servicio'

    const fechaTexto = formatFechaLarga(cita.fecha_inicio)
    const hora = formatHora(cita.fecha_inicio)

    const mensaje = `Hola, te recordamos que tienes una cita agendada para ${serviciosNombres} el ${fechaTexto} a las ${hora}.`

    const url = `https://wa.me/57${telefono}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  // Íconos de línea, mismo lenguaje visual del resto de la app
  const IconBack = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
  const IconEmpty = (p: any) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20l1-5.5A8.5 8.5 0 1 1 21 11.5z" />
      <path d="M8.5 10.5c.3 2.5 2.5 4.7 5 5" />
    </svg>
  )
  const IconClock = (p: any) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
  const IconWhatsapp = (p: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20l1-5.5A8.5 8.5 0 1 1 21 11.5z" />
      <path d="M8.5 10.5c.3 2.5 2.5 4.7 5 5" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="bg-white px-6 pt-12 pb-6 border-b border-[#EFEAE2]">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.push('/dashboard')} className="w-10 h-10 rounded-full border border-[#E7E2DA] flex items-center justify-center text-[#8A8378] hover:text-[#1F1B18] hover:border-[#1F1B18] transition-colors">
            <IconBack />
          </button>
          <div>
            <h1 className="text-2xl text-[#1F1B18]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Notificaciones</h1>
            <p className="text-[#8A8378] text-sm">Recordatorios por WhatsApp</p>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold tracking-[0.1em] text-[#8A8378] uppercase mb-1.5 block">Selecciona una fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl px-4 py-3.5 text-[#1F1B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57]"
          />
        </div>
      </div>

      <div className="px-4 py-4 pb-10 space-y-3">
        {cargando ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#B08D57] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : citas.length === 0 ? (
          <div className="text-center py-20 text-[#8A6A3A]">
            <IconEmpty className="mx-auto" />
            <p className="text-[#1F1B18] font-semibold mt-4 text-sm">Sin citas para esta fecha</p>
            <p className="text-[#8A8378] text-sm mt-1">Selecciona otra fecha</p>
          </div>
        ) : (
          <>
            <div className="bg-[#E7F0EC] rounded-2xl px-4 py-3">
              <p className="text-[#2F5D4E] text-sm font-semibold">
                {citas.length} cita{citas.length > 1 ? 's' : ''} para esta fecha
              </p>
            </div>

            {citas.map((cita) => (
              <div key={cita.id} className="bg-white border border-[#EFEAE2] rounded-3xl px-5 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-[#1F1B18] text-sm">{cita.clientes?.nombre}</p>
                    <p className="text-[#8A8378] text-sm mt-1 flex items-center gap-1.5">
                      <IconClock /> {formatHora(cita.fecha_inicio)}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {cita.cita_servicios?.map((cs: any, i: number) => (
                        <span key={i} className="bg-[#F3EDE3] text-[#8A6A3A] text-[11px] px-2.5 py-1 rounded-xl font-semibold">
                          {cs.servicios?.nombre}
                        </span>
                      ))}
                    </div>
                    <p className="text-[#8A6A3A] font-semibold text-sm mt-2">${cita.valor_total?.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => enviarWhatsApp(cita)}
                    className="bg-[#1F1B18] text-white p-3 rounded-2xl ml-3 flex-shrink-0 flex flex-col items-center gap-1 active:scale-95 transition-transform"
                  >
                    <IconWhatsapp className="text-[#B08D57]" />
                    <span className="text-[9px] font-semibold">Enviar</span>
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
