'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [pendientes, setPendientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState<string | null>(null)
  const [tab, setTab] = useState<'activos' | 'pendientes'>('activos')

  // --- Menú de 3 puntos por usuario ---
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null)

  // --- Editar usuario ---
  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editFechaVencimiento, setEditFechaVencimiento] = useState('')
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [errorEdit, setErrorEdit] = useState('')

  // --- Borrar usuario ---
  const [usuarioBorrando, setUsuarioBorrando] = useState<any | null>(null)
  const [loadingBorrado, setLoadingBorrado] = useState(false)
  const [errorBorrado, setErrorBorrado] = useState('')

  const router = useRouter()

  useEffect(() => { verificarAdmin() }, [])

 const verificarAdmin = async () => {
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
  }

  const cargarUsuarios = async () => {
    const { data } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false })

    const todos = data || []
    setUsuarios(todos.filter(u => u.estado !== 'pendiente'))
    setPendientes(todos.filter(u => u.estado === 'pendiente'))
    setLoading(false)
  }

  const getDiasRestantes = (fechaVencimiento: string) => {
    if (!fechaVencimiento) return null
    const hoy = new Date()
    const vence = new Date(fechaVencimiento)
    const diff = Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getColorDias = (dias: number | null) => {
    if (dias === null) return 'bg-gray-100 text-gray-500'
    if (dias <= 0) return 'bg-red-100 text-red-600'
    if (dias <= 2) return 'bg-red-100 text-red-600'
    if (dias <= 5) return 'bg-yellow-100 text-yellow-600'
    return 'bg-green-100 text-green-600'
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
    if (!telefono) { alert('Este usuario no tiene teléfono registrado'); return }
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

  // --- Editar usuario ---
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

  // --- Borrar usuario (completo: datos + cuenta de acceso) ---
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

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/dashboard')} className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center">
            <span className="text-lg">←</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel Admin</h1>
            <p className="text-gray-400 text-sm">Gestión de suscriptores</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-green-400 rounded-2xl p-3 text-white text-center">
            <p className="text-2xl font-bold">{activos.length}</p>
            <p className="text-green-100 text-xs">Activos</p>
          </div>
          <div className="bg-yellow-400 rounded-2xl p-3 text-white text-center">
            <p className="text-2xl font-bold">{vencidos.length}</p>
            <p className="text-yellow-100 text-xs">Vencidos</p>
          </div>
          <div className="bg-red-400 rounded-2xl p-3 text-white text-center">
            <p className="text-2xl font-bold">{bloqueados.length}</p>
            <p className="text-red-100 text-xs">Bloqueados</p>
          </div>
          <div className="bg-blue-400 rounded-2xl p-3 text-white text-center">
            <p className="text-2xl font-bold">{pendientes.length}</p>
            <p className="text-blue-100 text-xs">Pendientes</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab('activos')}
            className={`flex-1 py-2 rounded-2xl text-sm font-semibold ${tab === 'activos' ? 'bg-teal-400 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setTab('pendientes')}
            className={`flex-1 py-2 rounded-2xl text-sm font-semibold ${tab === 'pendientes' ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            Pendientes {pendientes.length > 0 && `(${pendientes.length})`}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {tab === 'pendientes' ? (
          pendientes.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-4xl">✅</span>
              <p className="text-gray-800 font-semibold mt-4">Sin solicitudes pendientes</p>
            </div>
          ) : (
            pendientes.map((usuario) => (
              <div key={usuario.id} className="bg-white rounded-3xl px-5 py-4 shadow-sm">
                <div className="mb-3">
                  <p className="font-bold text-gray-800">{usuario.nombre}</p>
                  <p className="text-gray-400 text-sm">{usuario.email}</p>
                  <p className="text-gray-400 text-sm">{usuario.telefono || 'Sin teléfono'}</p>
                  <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-xl text-xs font-bold mt-1 inline-block">Pendiente de aprobación</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => aprobarUsuario(usuario.id)}
                    disabled={accionando === usuario.id}
                    className="flex-1 bg-teal-400 text-white py-2 rounded-2xl text-xs font-bold disabled:opacity-50"
                  >
                    ✅ Aprobar
                  </button>
                  <button
                    onClick={() => rechazarUsuario(usuario.id)}
                    disabled={accionando === usuario.id}
                    className="flex-1 bg-red-100 text-red-600 py-2 rounded-2xl text-xs font-bold disabled:opacity-50"
                  >
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          usuarios.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-4xl">👥</span>
              <p className="text-gray-800 font-semibold mt-4">Sin usuarios registrados</p>
            </div>
          ) : (
            usuarios.map((usuario) => {
              const dias = getDiasRestantes(usuario.fecha_vencimiento)
              return (
                <div key={usuario.id} className="bg-white rounded-3xl px-5 py-4 shadow-sm relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-800">{usuario.nombre}</p>
                      <p className="text-gray-400 text-sm">{usuario.email}</p>
                      <p className="text-gray-400 text-sm">{usuario.telefono || 'Sin teléfono'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 relative">
                      {dias !== null ? (
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold ${getColorDias(dias)}`}>
                          {dias <= 0 ? 'Vencido' : `${dias} días`}
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-xl text-xs font-bold">Sin fecha</span>
                      )}
                      {usuario.bloqueado && <p className="text-red-500 text-xs font-semibold">🔒 Bloqueado</p>}

                      {/* Botón de 3 puntos */}
                      <button
                        onClick={() => setMenuAbiertoId(menuAbiertoId === usuario.id ? null : usuario.id)}
                        className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-95 transition-all"
                      >
                        <span className="text-gray-600 text-lg font-bold tracking-wider">⋮</span>
                      </button>

                      {/* Menú desplegable con todas las acciones */}
                      {menuAbiertoId === usuario.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuAbiertoId(null)} />
                          <div className="absolute right-0 top-10 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 w-48 z-20">
                            <button
                              onClick={() => registrarPago(usuario.id)}
                              disabled={accionando === usuario.id}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              💳 +30 días
                            </button>
                            <button
                              onClick={() => toggleBloqueo(usuario.id, usuario.bloqueado)}
                              disabled={accionando === usuario.id}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              {usuario.bloqueado ? '🔓 Habilitar' : '🔒 Bloquear'}
                            </button>
                            <button
                              onClick={() => enviarRecordatorio(usuario)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              📱 WhatsApp
                            </button>
                            <button
                              onClick={() => abrirEdicion(usuario)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              ✏️ Editar
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            <button
                              onClick={() => { setUsuarioBorrando(usuario); setMenuAbiertoId(null) }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50"
                            >
                              🗑️ Borrar
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

      {/* Modal de Editar usuario */}
      {usuarioEditando && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setUsuarioEditando(null)}>
          <div className="bg-white rounded-t-3xl w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">Editar usuario</h3>
              <button onClick={() => setUsuarioEditando(null)} className="text-2xl text-gray-400">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Nombre</label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Teléfono</label>
                <input
                  type="text"
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Fecha de vencimiento</label>
                <input
                  type="date"
                  value={editFechaVencimiento}
                  onChange={(e) => setEditFechaVencimiento(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <p className="text-gray-400 text-xs">El correo no se puede editar aquí porque está ligado a la cuenta de acceso.</p>

              {errorEdit && <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-2xl">{errorEdit}</div>}

              <div className="flex gap-3 pb-2">
                <button onClick={() => setUsuarioEditando(null)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-2xl font-semibold text-sm">
                  Cancelar
                </button>
                <button onClick={guardarEdicionUsuario} disabled={loadingEdit} className="flex-1 bg-teal-400 text-white py-3 rounded-2xl font-semibold text-sm disabled:opacity-50">
                  {loadingEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de borrado */}
      {usuarioBorrando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={() => setUsuarioBorrando(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-3xl text-center mb-2">⚠️</p>
            <h3 className="font-bold text-gray-800 text-lg text-center mb-1">¿Borrar este usuario?</h3>
            <p className="text-gray-500 text-sm text-center mb-5">
              Se eliminará <span className="font-semibold">{usuarioBorrando.nombre}</span> ({usuarioBorrando.email}) de forma completa: sus datos y su cuenta de acceso. Esta acción no se puede deshacer.
            </p>
            {errorBorrado && <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-2xl mb-4">{errorBorrado}</div>}
            <div className="flex gap-3">
              <button onClick={() => setUsuarioBorrando(null)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-2xl font-semibold text-sm">
                Cancelar
              </button>
              <button
                onClick={confirmarBorrado}
                disabled={loadingBorrado}
                className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-semibold text-sm disabled:opacity-50"
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
