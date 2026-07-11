'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function FacturacionPage() {
  const [citas, setCitas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [citaFacturando, setCitaFacturando] = useState<string | null>(null)
  const [metodoPago, setMetodoPago] = useState('')
  const router = useRouter()

  useEffect(() => { cargarCitasHoy() }, [])

  const cargarCitasHoy = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const hoy = new Date()
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
    const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString()

    const { data } = await supabase
      .from('citas')
      .select('*, clientes(nombre)')
      .eq('empresa_id', user.id)
      .gte('fecha_inicio', inicio)
      .lt('fecha_inicio', fin)
      .neq('estado', 'cancelada')
      .order('fecha_inicio')

    setCitas(data || [])
  }

  const facturar = async (citaId: string) => {
    if (!metodoPago) return
    setLoading(true)

    await supabase
      .from('citas')
      .update({
        estado: 'facturada',
        metodo_pago: metodoPago,
        facturada_en: new Date().toISOString()
      })
      .eq('id', citaId)

    setCitaFacturando(null)
    setMetodoPago('')
    setLoading(false)
    cargarCitasHoy()
  }

  const formatHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const citasPendientes = citas.filter(c => c.estado !== 'facturada')
  const citasFacturadas = citas.filter(c => c.estado === 'facturada')
  const totalHoy = citasFacturadas.reduce((sum, c) => sum + (c.valor_total || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/dashboard')} className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center">
            <span className="text-lg">←</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
            <p className="text-gray-400 text-sm">Citas de hoy</p>
          </div>
        </div>

        {/* Resumen del día */}
        <div className="bg-teal-400 rounded-3xl p-5 text-white">
          <p className="text-teal-100 text-sm">Ingresos de hoy</p>
          <p className="text-3xl font-bold mt-1">${totalHoy.toLocaleString()}</p>
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-2xl font-bold">{citasFacturadas.length}</p>
              <p className="text-teal-100 text-xs">Facturadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{citasPendientes.length}</p>
              <p className="text-teal-100 text-xs">Pendientes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {citas.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🧾</span>
            </div>
            <p className="text-gray-800 font-semibold">No hay citas hoy</p>
            <p className="text-gray-400 text-sm mt-1">Las citas de hoy aparecerán aquí</p>
          </div>
        ) : (
          <>
            {citasPendientes.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-500 mb-2 px-1">PENDIENTES</p>
                {citasPendientes.map((cita) => (
                  <div key={cita.id} className="bg-white rounded-3xl px-5 py-4 shadow-sm mb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gray-800">{cita.clientes?.nombre}</p>
                        <p className="text-gray-400 text-sm mt-1">⏰ {formatHora(cita.fecha_inicio)}</p>
                        <p className="text-teal-500 font-semibold text-sm mt-1">${cita.valor_total?.toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => setCitaFacturando(cita.id)}
                        className="bg-teal-400 text-white px-4 py-2 rounded-2xl text-sm font-semibold shadow-sm"
                      >
                        Facturar
                      </button>
                    </div>

                    {citaFacturando === cita.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm font-semibold text-gray-600 mb-3">Método de pago</p>
                        <div className="flex gap-3 mb-4">
                          <button
                            onClick={() => setMetodoPago('efectivo')}
                            className={`flex-1 py-3 rounded-2xl font-semibold text-sm border-2 transition-all ${metodoPago === 'efectivo' ? 'border-teal-400 bg-teal-50 text-teal-600' : 'border-gray-100 bg-gray-50 text-gray-600'}`}
                          >
                            💵 Efectivo
                          </button>
                          <button
                            onClick={() => setMetodoPago('transferencia')}
                            className={`flex-1 py-3 rounded-2xl font-semibold text-sm border-2 transition-all ${metodoPago === 'transferencia' ? 'border-teal-400 bg-teal-50 text-teal-600' : 'border-gray-100 bg-gray-50 text-gray-600'}`}
                          >
                            📱 Transferencia
                          </button>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setCitaFacturando(null); setMetodoPago('') }}
                            className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-2xl font-semibold text-sm"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => facturar(cita.id)}
                            disabled={!metodoPago || loading}
                            className="flex-1 bg-teal-400 text-white py-3 rounded-2xl font-semibold text-sm disabled:opacity-50"
                          >
                            {loading ? 'Guardando...' : 'Confirmar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {citasFacturadas.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-500 mb-2 px-1">FACTURADAS</p>
                {citasFacturadas.map((cita) => (
                  <div key={cita.id} className="bg-white rounded-3xl px-5 py-4 shadow-sm mb-3 opacity-70">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-800">{cita.clientes?.nombre}</p>
                        <p className="text-gray-400 text-sm mt-1">⏰ {formatHora(cita.fecha_inicio)}</p>
                        <p className="text-green-500 font-semibold text-sm mt-1">${cita.valor_total?.toLocaleString()} · {cita.metodo_pago}</p>
                      </div>
                      <span className="bg-green-100 text-green-600 px-3 py-1 rounded-xl text-xs font-semibold">✓ Pagado</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}