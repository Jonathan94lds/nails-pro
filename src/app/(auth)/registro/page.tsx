'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegistroPage() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const router = useRouter()

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError('Error al crear la cuenta: ' + authError.message)
      setLoading(false)
      return
    }

    const { error: empresaError } = await supabase
      .from('empresas')
      .insert({
        id: authData.user?.id,
        nombre,
        email,
        telefono,
        estado: 'pendiente',
        bloqueado: false,
      })

    if (empresaError) {
      setError('Error al guardar los datos: ' + empresaError.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setEnviado(true)
    setLoading(false)
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⏳</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Solicitud enviada</h1>
          <p className="text-gray-400 text-sm mb-6">Tu cuenta está siendo revisada. Te contactaremos pronto para activar tu acceso a Nails Pro.</p>
          <Link href="/login" className="text-teal-500 font-semibold">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl">💅</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Nails Pro</h1>
        <p className="text-gray-400 mt-1 text-sm">Crea tu cuenta gratis</p>
      </div>

      <form onSubmit={handleRegistro} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-gray-600 mb-1 block">Nombre de tu negocio</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Nails by María"
            required
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-600 mb-1 block">Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-600 mb-1 block">Teléfono</label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="3001234567"
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-600 mb-1 block">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        {error && <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-2xl">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-400 hover:bg-teal-500 text-white font-bold py-4 rounded-2xl shadow-md transition-all disabled:opacity-50"
        >
          {loading ? 'Enviando solicitud...' : 'Solicitar acceso'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-8">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-teal-500 font-semibold">Inicia sesión</Link>
      </p>
    </div>
  )
}
