'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NotificacionesPage() {
  const [citas, setCitas] = useState<any[]>([])
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const router = useRouter()

  useEffect(() => { cargarCitas() }, [fecha])

  const cargarCitas = async () => {
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
      alert('Este cliente no tiene teléfono registrado')
      return
    }

    const serviciosNombres = cita.cita_servicios
      ?.map((cs: any) => cs.servicios?.nombre)
      .filter(Boolean)
      .join(', ') || 'tu servicio'

    const fechaTexto = formatFechaLarga(cita.fecha_inicio)
    const hora = formatHora(cita.fecha_inicio)

    const mensaje = `Hola 💅 Te recordamos que tienes una cita agendada para ${serviciosNombres} el ${fechaTexto} a las ${hora}.`

    const url = `https://wa.me/57${telefono}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/dashboard')} className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center">
            <span className="text-lg">←</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
            <p className="text-gray-400 text-sm">Recordatorios por WhatsApp</p>
          </div>
        </div>

        {/* Selector de fecha */}
        <div>
          <label className="text-sm font-semibold text-gray-600 mb-1 block">Selecciona una fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {citas.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">💬</span>
            </div>
            <p className="text-gray-800 font-semibold">Sin citas para esta fecha</p>
            <p className="text-gray-400 text-sm mt-1">Selecciona otra fecha</p>
          </div>
        ) : (
          <>
            <div className="bg-green-50 rounded-3xl p-4">
              <p className="text-green-700 text-sm font-semibold">💬 {citas.length} cita{citas.length > 1 ? 's' : ''} para esta fecha</p>
            </div>

            {citas.map((cita) => (
              <div key={cita.id} className="bg-white rounded-3xl px-5 py-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{cita.clientes?.nombre}</p>
                    <p className="text-gray-400 text-sm mt-1">⏰ {formatHora(cita.fecha_inicio)}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cita.cita_servicios?.map((cs: any, i: number) => (
                        <span key={i} className="bg-teal-50 text-teal-600 text-xs px-2 py-1 rounded-xl font-semibold">
                          {cs.servicios?.nombre}
                        </span>
                      ))}
                    </div>
                    <p className="text-teal-500 font-semibold text-sm mt-2">${cita.valor_total?.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => enviarWhatsApp(cita)}
                    className="bg-green-400 text-white px-4 py-3 rounded-2xl shadow-md ml-3 flex-shrink-0 flex flex-col items-center gap-1"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12.004 2C6.486 2 2.004 6.482 2.004 12c0 1.85.505 3.58 1.38 5.067L2 22l5.1-1.336A9.955 9.955 0 0012.004 22C17.522 22 22 17.518 22 12S17.522 2 12.004 2zm0 18.077a8.05 8.05 0 01-4.1-1.12l-.294-.175-3.028.793.808-2.95-.192-.303a8.05 8.05 0 01-1.238-4.322c0-4.457 3.628-8.077 8.048-8.077 4.42 0 8.048 3.62 8.048 8.077 0 4.457-3.628 8.077-8.052 8.077z"/>
                    </svg>
                    <span className="text-[10px] font-bold">Enviar mensaje</span>
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
