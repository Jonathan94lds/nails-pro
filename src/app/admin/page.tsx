'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Providers'

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [pendientes, setPendientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState<string | null>(null)
  const [tab, setTab] = useState<'activos' | 'pendientes'>('activos')

  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null)

  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editFechaVencimiento, setEditFechaVencimiento] = useState('')
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [errorEdit, setErrorEdit] = useState('')

  const [usuarioBorrando, setUsuarioBorrando] = useState<any | null>(null)
  const [loadingBorrado, setLoadingBorrado] = useState(false)
  const [errorBorrado, setErrorBorrado] = useState('')

  const router = useRouter()
  const toast = useToast()

  const cargarUsuarios = useCallback(async () => {
    const { data } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false })

    const todos = data || []
    setUsuarios(todos.filter(u => u.estado !== 'pendiente'))
    setPendientes(todos.filter(u => u.estado === 'pendiente'))
    setLoading(false)
  }, [])

  const verificarAdmin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/dashboard'); return }

    const { data: empresa } = await supabase
      .from('empresas')
      .select('es_admin')
      .eq('id', user.id)
      .single()

    if (!empresa || !empresa.es_admin) {
      router.push('/dashboard')
      return
    }
    cargarUsuarios()
  }, [router, cargarUsuarios])

  useEffect(() => { verificarAdmin() }, [verificarAdmin])

  const getDiasRestantes = (fechaVencimiento: string) => {
    if (!fechaVencimiento) return null
    const hoy = new Date()
    const vence = new Date(fechaVencimiento)
    const diff = Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getColorDias = (dias: number | null) => {
    if (dias === null) return 'bg-[#F3EDE3] text-[#8A8378]'
    if (dias <= 2) return 'bg-[#F7E5E2] text-[#8C2F27]'
    if (dias <= 5) return 'bg-[#F6EEDF] text-[#B08D57]'
    return 'bg-[#E7F0EC] text-[#2F5D4E]'
  }

  const aprobarUsuario = async (userId: string) => {
    setAccionando(userId)
    const nuevaFecha = new Date()
    nuevaFecha.setDate(nuevaFecha.getDate() + 30)
    await supabase
      .from('empresas')
      .update({
        estado: 'activo',
        bloqueado: false,
        fecha_vencimiento: nuevaFecha.toISOString().split('T')[0]
      })
      .eq('id', userId)
    setAccionando(null)
    cargarUsuarios()
  }

  const rechazarUsuario = async (userId: string) => {
    setAccionando(userId)
    await supabase
      .from('empresas')
      .update({ estado: 'rechazado', bloqueado: true })
      .eq('id', userId)
    setAccionando(null)
    cargarUsuarios()
  }

  const registrarPago = async (userId: string) => {
    setAccionando(userId)
    const nuevaFecha = new Date()
    nuevaFecha.setDate(nuevaFecha.getDate() + 30)
    await supabase
      .from('empresas')
      .update({
        fecha_vencimiento: nuevaFecha.toISOString().split('T')[0],
        bloqueado: false,
        estado: 'activo'
      })
      .eq('id', userId)
    setAccionando(null)
    setMenuAbiertoId(null)
    cargarUsuarios()
  }

  const toggleBloqueo = async (userId: string, bloqueado: boolean) => {
    setAccionando(userId)
    await supabase
      .from('empresas')
      .update({ bloqueado: !bloqueado })
      .eq('id', userId)
    setAccionando(null)
    setMenuAbiertoId(null)
    cargarUsuarios()
  }

  const enviarRecordatorio = (usuario: any) => {
    const telefono = usuario.telefono?.replace(/\D/g, '')
    if (!telefono) { toast('Este usuario no tiene teléfono registrado', 'error'); return }
    const dias = getDiasRestantes(usuario.fecha_vencimiento)
    let mensaje = ''
    if (dias !== null && dias <= 0) {
      mensaje = `Hola, Tu suscripción a Nails Pro ha vencido. Para continuar usando la plataforma realiza tu pago de renovación. ¡Gracias!`
    } else {
      mensaje = `Hola, Te recordamos que tu suscripción a Nails Pro está próxima a vencer. Para continuar sin interrupciones realiza tu pago. ¡Gracias!`
    }
    window.open(`https://wa.me/57${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank')
    setMenuAbiertoId(null)
  }

  const abrirEdicion = (usuario: any) => {
    setUsuarioEditando(usuario)
    setEditNombre(usuario.nombre || '')
    setEditTelefono(usuario.telefono || '')
    setEditFechaVencimiento(usuario.fecha_vencimiento || '')
    setErrorEdit('')
    setMenuAbiertoId(null)
  }

  const guardarEdicionUsuario = async () => {
    if (!usuarioEditando) return
    if (!editNombre.trim()) {
      setErrorEdit('El nombre no puede estar vacío')
      return
    }
    setLoadingEdit(true)
    setErrorEdit('')

    const { error } = await supabase
      .from('empresas')
      .update({
        nombre: editNombre.trim(),
        telefono: editTelefono.trim(),
        fecha_vencimiento: editFechaVencimiento || null
      })
      .eq('id', usuarioEditando.id)

    if (error) {
      setErrorEdit('Error al guardar los cambios')
      setLoadingEdit(false)
      return
    }

    setUsuarioEditando(null)
    setLoadingEdit(false)
    cargarUsuarios()
  }

  const confirmarBorrado = async () => {
    if (!usuarioBorrando) return
    setLoadingBorrado(true)
    setErrorBorrado('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/borrar-usuario', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ userId: usuarioBorrando.id })
    })
    const data = await res.json()

    if (!res.ok) {
      setErrorBorrado(data.error || 'No se pudo borrar el usuario')
      setLoadingBorrado(false)
      return
    }

    setUsuarioBorrando(null)
    setLoadingBorrado(false)
    cargarUsuarios()
  }

  const activos = usuarios.filter(u => !u.bloqueado && (getDiasRestantes(u.fecha_vencimiento) || 0) > 0)
  const bloqueados = usuarios.filter(u => u.bloqueado)
  const vencidos = usuarios.filter(u => !u.bloqueado && (getDiasRestantes(u.fecha_vencimiento) || 0) <= 0)

  const IconBack = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
  const IconCheck = (p: any) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
  const IconX = (p: any) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
  const IconCard = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  )
  const IconLock = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="4" y="10.5" width="16" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  )
  const IconUnlock = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="4" y="10.5" width="16" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 7.5-2" />
    </svg>
  )
  const IconWhatsapp = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20l1-5.5A8.5 8.5 0 1 1 21 11.5z" />
      <path d="M8.5 10.5c.3 2.5 2.5 4.7 5 5" />
    </svg>
  )
  const IconEdit = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  )
  const IconTrash = (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
    </svg>
  )
  const IconDots = (p: any) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  )
  const IconWarning = (p: any) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  )
  const IconUsers = (p: any) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
  const IconCheckCircle = (p: any) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )

  if (loading) return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#B08D57] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="bg-white px-6 pt-14 pb-6 border-b border-[#EFEAE2]">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 rounded-full border border-[#E7E2DA] flex items-center justify-center text-[#8A8378] hover:text-[#1F1B18] hover:border-[#1F1B18] transition-colors"
          >
            <IconBack />
          </button>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#B08D57] uppercase">Administración</p>
            <h1
              className="text-[22px] leading-tight text-[#1F1B18] mt-0.5"
              style={{ fontFamily: 'Fraunces, Georgia, serif' }}
            >
              Panel de suscriptores
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-5">
          <div className="bg-[#2F5D4E] rounded-2xl p-3 text-white text-center">
            <p className="text-xl leading-none" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{activos.length}</p>
            <p className="text-[#CFE3DA] text-[10px] mt-1.5 uppercase tracking-wide">Activos</p>
          </div>
          <div className="bg-[#B08D57] rounded-2xl p-3 text-white text-center">
            <p className="text-xl leading-none" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{vencidos.length}</p>
            <p className="text-[#F3E7D5] text-[10px] mt-1.5 uppercase tracking-wide">Vencidos</p>
          </div>
          <div className="bg-[#8C2F27] rounded-2xl p-3 text-white text-center">
            <p className="text-xl leading-none" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{bloqueados.length}</p>
            <p className="text-[#F0D9D6] text-[10px] mt-1.5 uppercase tracking-wide">Bloqueados</p>
          </div>
          <div className="bg-[#1F1B18] rounded-2xl p-3 text-white text-center">
            <p className="text-xl leading-none" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{pendientes.length}</p>
            <p className="text-[#A79A8A] text-[10px] mt-1.5 uppercase tracking-wide">Pendientes</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab('activos')}
            className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
              tab === 'activos' ? 'bg-[#1F1B18] text-white' : 'bg-[#F3EDE3] text-[#8A8378]'
            }`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setTab('pendientes')}
            className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
              tab === 'pendientes' ? 'bg-[#1F1B18] text-white' : 'bg-[#F3EDE3] text-[#8A8378]'
            }`}
          >
            Pendientes {pendientes.length > 0 && `(${pendientes.length})`}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {tab === 'pendientes' ? (
          pendientes.length === 0 ? (
            <div className="text-center py-20 text-[#8A6A3A]">
              <IconCheckCircle className="mx-auto" />
              <p className="text-[#1F1B18] font-semibold mt-4 text-sm">Sin solicitudes pendientes</p>
            </div>
          ) : (
            pendientes.map((usuario) => (
              <div key={usuario.id} className="bg-white border border-[#EFEAE2] rounded-2xl px-5 py-4">
                <div className="mb-3">
                  <p className="font-semibold text-[#1F1B18] text-sm">{usuario.nombre}</p>
                  <p className="text-[#8A8378] text-xs mt-0.5">{usuario.email}</p>
                  <p className="text-[#8A8378] text-xs">{usuario.telefono || 'Sin teléfono'}</p>
                  <span className="bg-[#F3EDE3] text-[#8A6A3A] px-2.5 py-1 rounded-xl text-[11px] font-semibold mt-2 inline-block">
                    Pendiente de aprobación
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => aprobarUsuario(usuario.id)}
                    disabled={accionando === usuario.id}
                    className="flex-1 bg-[#2F5D4E] text-white py-2.5 rounded-2xl text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <IconCheck /> Aprobar
                  </button>
                  <button
                    onClick={() => rechazarUsuario(usuario.id)}
                    disabled={accionando === usuario.id}
                    className="flex-1 bg-[#F7E5E2] text-[#8C2F27] py-2.5 rounded-2xl text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <IconX /> Rechazar
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          usuarios.length === 0 ? (
            <div className="text-center py-20 text-[#8A6A3A]">
              <IconUsers className="mx-auto" />
              <p className="text-[#1F1B18] font-semibold mt-4 text-sm">Sin usuarios registrados</p>
            </div>
          ) : (
            usuarios.map((usuario) => {
              const dias = getDiasRestantes(usuario.fecha_vencimiento)
              return (
                <div key={usuario.id} className="bg-white border border-[#EFEAE2] rounded-2xl px-5 py-4 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-[#1F1B18] text-sm">{usuario.nombre}</p>
                      <p className="text-[#8A8378] text-xs mt-0.5">{usuario.email}</p>
                      <p className="text-[#8A8378] text-xs">{usuario.telefono || 'Sin teléfono'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 relative">
                      {dias !== null ? (
                        <span className={`px-3 py-1 rounded-xl text-[11px] font-semibold ${getColorDias(dias)}`}>
                          {dias <= 0 ? 'Vencido' : `${dias} días`}
                        </span>
                      ) : (
                        <span className="bg-[#F3EDE3] text-[#8A8378] px-3 py-1 rounded-xl text-[11px] font-semibold">Sin fecha</span>
                      )}
                      {usuario.bloqueado && (
                        <p className="text-[#8C2F27] text-[11px] font-semibold flex items-center gap-1">
                          <IconLock width={12} height={12} /> Bloqueado
                        </p>
                      )}

                      <button
                        onClick={() => setMenuAbiertoId(menuAbiertoId === usuario.id ? null : usuario.id)}
                        className="w-9 h-9 rounded-full bg-[#F3EDE3] flex items-center justify-center text-[#8A6A3A] active:scale-95 transition-transform"
                      >
                        <IconDots />
                      </button>

                      {menuAbiertoId === usuario.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuAbiertoId(null)} />
                          <div className="absolute right-0 top-11 bg-white rounded-2xl shadow-lg border border-[#EFEAE2] py-2 w-52 z-20">
                            <button
                              onClick={() => registrarPago(usuario.id)}
                              disabled={accionando === usuario.id}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#1F1B18] hover:bg-[#FAF8F5] disabled:opacity-50"
                            >
                              <IconCard className="text-[#8A6A3A]" /> +30 días
                            </button>
                            <button
                              onClick={() => toggleBloqueo(usuario.id, usuario.bloqueado)}
                              disabled={accionando === usuario.id}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#1F1B18] hover:bg-[#FAF8F5] disabled:opacity-50"
                            >
                              {usuario.bloqueado ? (
                                <><IconUnlock className="text-[#8A6A3A]" /> Habilitar</>
                              ) : (
                                <><IconLock className="text-[#8A6A3A]" /> Bloquear</>
                              )}
                            </button>
                            <button
                              onClick={() => enviarRecordatorio(usuario)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#1F1B18] hover:bg-[#FAF8F5]"
                            >
                              <IconWhatsapp className="text-[#8A6A3A]" /> WhatsApp
                            </button>
                            <button
                              onClick={() => abrirEdicion(usuario)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#1F1B18] hover:bg-[#FAF8F5]"
                            >
                              <IconEdit className="text-[#8A6A3A]" /> Editar
                            </button>
                            <div className="border-t border-[#EFEAE2] my-1" />
                            <button
                              onClick={() => { setUsuarioBorrando(usuario); setMenuAbiertoId(null) }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#8C2F27] hover:bg-[#F7E5E2]"
                            >
                              <IconTrash /> Borrar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )
        )}
      </div>

      {usuarioEditando && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setUsuarioEditando(null)}>
          <div className="bg-[#FAF8F5] rounded-t-3xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3
                className="text-[20px] text-[#1F1B18]"
                style={{ fontFamily: 'Fraunces, Georgia, serif' }}
              >
                Editar usuario
              </h3>
              <button
                onClick={() => setUsuarioEditando(null)}
                className="w-9 h-9 rounded-full border border-[#E7E2DA] flex items-center justify-center text-[#8A8378]"
              >
                <IconX />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold tracking-[0.1em] text-[#8A8378] uppercase mb-1.5 block">Nombre</label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full bg-white border border-[#E7E2DA] rounded-2xl px-4 py-3 text-[#1F1B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#B08D57]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold tracking-[0.1em] text-[#8A8378] uppercase mb-1.5 block">Teléfono</label>
                <input
                  type="text"
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  className="w-full bg-white border border-[#E7E2DA] rounded-2xl px-4 py-3 text-[#1F1B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#B08D57]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold tracking-[0.1em] text-[#8A8378] uppercase mb-1.5 block">Fecha de vencimiento</label>
                <input
                  type="date"
                  value={editFechaVencimiento}
                  onChange={(e) => setEditFechaVencimiento(e.target.value)}
                  className="w-full bg-white border border-[#E7E2DA] rounded-2xl px-4 py-3 text-[#1F1B18] text-sm focus:outline-none focus:ring-2 focus:ring-[#B08D57]"
                />
              </div>

              <p className="text-[#8A8378] text-xs">El correo no se puede editar aquí porque está ligado a la cuenta de acceso.</p>

              {errorEdit && (
                <div className="bg-[#F7E5E2] text-[#8C2F27] text-sm px-4 py-3 rounded-2xl">{errorEdit}</div>
              )}

              <div className="flex gap-3 pb-2 pt-1">
                <button
                  onClick={() => setUsuarioEditando(null)}
                  className="flex-1 bg-[#F3EDE3] text-[#1F1B18] py-3 rounded-2xl font-semibold text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarEdicionUsuario}
                  disabled={loadingEdit}
                  className="flex-1 bg-[#1F1B18] text-white py-3 rounded-2xl font-semibold text-sm disabled:opacity-50"
                >
                  {loadingEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {usuarioBorrando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={() => setUsuarioBorrando(null)}>
          <div className="bg-[#FAF8F5] rounded-3xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-[#F7E5E2] text-[#8C2F27] flex items-center justify-center mx-auto mb-3">
              <IconWarning />
            </div>
            <h3
              className="text-[20px] text-[#1F1B18] text-center mb-1.5"
              style={{ fontFamily: 'Fraunces, Georgia, serif' }}
            >
              ¿Borrar este usuario?
            </h3>
            <p className="text-[#8A8378] text-sm text-center mb-5 leading-relaxed">
              Se eliminará <span className="font-semibold text-[#1F1B18]">{usuarioBorrando.nombre}</span> ({usuarioBorrando.email}) de forma completa: sus datos y su cuenta de acceso. Esta acción no se puede deshacer.
            </p>
            {errorBorrado && (
              <div className="bg-[#F7E5E2] text-[#8C2F27] text-sm px-4 py-3 rounded-2xl mb-4">{errorBorrado}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setUsuarioBorrando(null)}
                className="flex-1 bg-[#F3EDE3] text-[#1F1B18] py-3 rounded-2xl font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarBorrado}
                disabled={loadingBorrado}
                className="flex-1 bg-[#8C2F27] text-white py-3 rounded-2xl font-semibold text-sm disabled:opacity-50"
              >
                {loadingBorrado ? 'Borrando...' : 'Sí, borrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
