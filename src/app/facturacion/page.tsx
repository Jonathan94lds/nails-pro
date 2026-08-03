'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function fechaHoy() {
  return new Date().toISOString().split('T')[0]
}

export default function FacturacionPage() {
  const [citas, setCitas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [citaFacturando, setCitaFacturando] = useState<string | null>(null)
  const [metodoPago, setMetodoPago] = useState('')
  const [fechaFiltro, setFechaFiltro] = useState(fechaHoy())
  const router = useRouter()

  const cargarCitas = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const inicio = new Date(`${fechaFiltro}T00:00:00`).toISOString()
    const fin = new Date(`${fechaFiltro}T23:59:59`).toISOString()

    const { data } = await supabase
      .from('citas')
      .select('*, clientes(nombre)')
      .eq('empresa_id', user.id)
      .gte('fecha_inicio', inicio)
      .lte('fecha_inicio', fin)
      .neq('estado', 'cancelada')
      .order('fecha_inicio')

    setCitas(data || [])
  }, [fechaFiltro, router])

  useEffect(() => { cargarCitas() }, [cargarCitas])

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
    cargarCitas()
  }

  const formatHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const citasPendientes = citas.filter(c => c.estado !== 'facturada')
  const citasFacturadas = citas.filter(c => c.estado === 'facturada')
  const totalDia = citasFacturadas.reduce((sum, c) => sum + (c.valor_total || 0), 0)

  // --- Íconos de línea, mismo trazo del resto de la app ---
  const IconBack = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
  const IconFacturar = (p: any) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 3h9l3 3v15l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V5a2 2 0 0 1 2-2z" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </svg>
  )
  const IconReloj = (p: any) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
  const IconEfectivo = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
  const IconTransferencia = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  )
  const IconCheck = (p: any) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="bg-white px-6 pt-12 pb-6 border-b border-[#EFEAE2]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/dashboard')} className="w-10 h-10 rounded-full border border-[#E7E2DA] flex items-center justify-center text-[#8A8378] hover:text-[#1F1B18] hover:border-[#1F1B18] transition-colors">
            <IconBack />
          </button>
          <div>
            <h1 className="text-2xl text-[#1F1B18]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Facturación</h1>
            <p className="text-[#8A8378] text-sm">Citas del día</p>
          </div>
        </div>

        {/* Selector de fecha */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-[#5C564C] mb-1 block">Ver citas de esta fecha</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="flex-1 bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl px-4 py-3 text-[#1F1B18] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57]"
            />
            {fechaFiltro !== fechaHoy() && (
              <button
                onClick={() => setFechaFiltro(fechaHoy())}
                className="bg-[#1F1B18] text-white text-sm font-semibold px-4 py-3 rounded-2xl whitespace-nowrap"
              >
                Hoy
              </button>
            )}
          </div>
        </div>

        {/* Resumen del día — tarjeta hero oscura, misma línea del dashboard */}
        <div className="bg-[#1F1B18] rounded-3xl p-6 text-white mb-3">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#B08D57] uppercase">Ingresos del día</p>
          <p className="text-[34px] mt-2" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>${totalDia.toLocaleString()}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#E7EDE9] rounded-2xl p-4 text-center">
            <p className="text-2xl text-[#2F4A3C]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{citasFacturadas.length}</p>
            <p className="text-[#3E5C4D] text-xs font-semibold mt-1">Facturadas</p>
          </div>
          <div className="bg-[#F3EDE3] rounded-2xl p-4 text-center">
            <p className="text-2xl text-[#8A6A3A]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{citasPendientes.length}</p>
            <p className="text-[#8A6A3A] text-xs font-semibold mt-1">Pendientes</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {citas.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-[#F3EDE3] rounded-3xl flex items-center justify-center mx-auto mb-4 text-[#8A6A3A]">
              <IconFacturar />
            </div>
            <p className="text-[#1F1B18] font-semibold">No hay citas en esta fecha</p>
            <p className="text-[#8A8378] text-sm mt-1">Elige otra fecha para ver sus citas</p>
          </div>
        ) : (
          <>
            {citasPendientes.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8A8378] uppercase mb-2 px-1">Pendientes</p>
                {citasPendientes.map((cita) => (
                  <div key={cita.id} className="bg-white border border-[#EFEAE2] rounded-3xl px-5 py-4 mb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-[#1F1B18]">{cita.clientes?.nombre}</p>
                        <p className="text-[#8A8378] text-sm mt-1 flex items-center gap-1.5">
                          <IconReloj /> {formatHora(cita.fecha_inicio)}
                        </p>
                        <p className="text-[#8A6A3A] font-semibold text-sm mt-1">${cita.valor_total?.toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => setCitaFacturando(cita.id)}
                        className="bg-[#1F1B18] text-white px-4 py-2 rounded-2xl text-sm font-semibold"
                      >
                        Facturar
                      </button>
                    </div>

                    {citaFacturando === cita.id && (
                      <div className="mt-4 pt-4 border-t border-[#EFEAE2]">
                        <p className="text-sm font-semibold text-[#5C564C] mb-3">Método de pago</p>
                        <div className="flex gap-3 mb-4">
                          <button
                            onClick={() => setMetodoPago('efectivo')}
                            className={`flex-1 py-3 rounded-2xl font-semibold text-sm border-2 transition-all flex items-center justify-center gap-2 ${metodoPago === 'efectivo' ? 'border-[#B08D57] bg-[#F3EDE3] text-[#8A6A3A]' : 'border-[#EFEAE2] bg-[#FAF8F5] text-[#5C564C]'}`}
                          >
                            <IconEfectivo /> Efectivo
                          </button>
                          <button
                            onClick={() => setMetodoPago('transferencia')}
                            className={`flex-1 py-3 rounded-2xl font-semibold text-sm border-2 transition-all flex items-center justify-center gap-2 ${metodoPago === 'transferencia' ? 'border-[#B08D57] bg-[#F3EDE3] text-[#8A6A3A]' : 'border-[#EFEAE2] bg-[#FAF8F5] text-[#5C564C]'}`}
                          >
                            <IconTransferencia /> Transferencia
                          </button>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setCitaFacturando(null); setMetodoPago('') }}
                            className="flex-1 bg-[#F3EDE3] text-[#5C564C] py-3 rounded-2xl font-semibold text-sm"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => facturar(cita.id)}
                            disabled={!metodoPago || loading}
                            className="flex-1 bg-[#1F1B18] text-white py-3 rounded-2xl font-semibold text-sm disabled:opacity-50"
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
                <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8A8378] uppercase mb-2 px-1">Facturadas</p>
                {citasFacturadas.map((cita) => (
                  <div key={cita.id} className="bg-white border border-[#EFEAE2] rounded-3xl px-5 py-4 mb-3 opacity-70">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#1F1B18]">{cita.clientes?.nombre}</p>
                        <p className="text-[#8A8378] text-sm mt-1 flex items-center gap-1.5">
                          <IconReloj /> {formatHora(cita.fecha_inicio)}
                        </p>
                        <p className="text-[#3E5C4D] font-semibold text-sm mt-1">${cita.valor_total?.toLocaleString()} · {cita.metodo_pago}</p>
                      </div>
                      <span className="bg-[#E7EDE9] text-[#2F4A3C] px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1">
                        <IconCheck /> Pagado
                      </span>
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
