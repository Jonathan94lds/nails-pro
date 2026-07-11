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
                    className="bg-green-400 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ml-3 flex-shrink-0"
                  >
                    <span className="text-2xl">📱</span>
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
