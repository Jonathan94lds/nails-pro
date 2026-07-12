'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const ADMIN_EMAIL = 'jonathan94lds@hotmail.com'

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [pendientes, setPendientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState<string | null>(null)
  const [tab, setTab] = useState<'activos' | 'pendientes'>('activos')
  const router = useRouter()

  useEffect(() => { verificarAdmin() }, [])

  const verificarAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
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
    cargarUsuarios()
  }

  const toggleBloqueo = async (userId: string, bloqueado: boolean) => {
    setAccionando(userId)
    await supabase
      .from('empresas')
      .update({ bloqueado: !bloqueado })
      .eq('id', userId)
    setAccionando(null)
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
                <div key={usuario.id} className="bg-white rounded-3xl px-5 py-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-800">{usuario.nombre}</p>
                      <p className="text-gray-400 text-sm">{usuario.email}</p>
                      <p className="text-gray-400 text-sm">{usuario.telefono || 'Sin teléfono'}</p>
                    </div>
                    <div className="text-right">
                      {dias !== null ? (
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold ${getColorDias(dias)}`}>
                          {dias <= 0 ? 'Vencido' : `${dias} días`}
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-xl text-xs font-bold">Sin fecha</span>
                      )}
                      {usuario.bloqueado && <p className="text-red-500 text-xs font-semibold mt-1">🔒 Bloqueado</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => registrarPago(usuario.id)}
                      disabled={accionando === usuario.id}
                      className="flex-1 bg-teal-400 text-white py-2 rounded-2xl text-xs font-bold disabled:opacity-50"
                    >
                      💳 +30 días
                    </button>
                    <button
                      onClick={() => toggleBloqueo(usuario.id, usuario.bloqueado)}
                      disabled={accionando === usuario.id}
                      className={`flex-1 py-2 rounded-2xl text-xs font-bold disabled:opacity-50 ${usuario.bloqueado ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                    >
                      {usuario.bloqueado ? '🔓 Habilitar' : '🔒 Bloquear'}
                    </button>
                    <button
                      onClick={() => enviarRecordatorio(usuario)}
                      className="flex-1 bg-green-400 text-white py-2 rounded-2xl text-xs font-bold"
                    >
                      📱 WhatsApp
                    </button>
                  </div>
                </div>
              )
            })
          )
        )}
      </div>
    </div>
  )
}
