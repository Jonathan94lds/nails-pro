'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6">
      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl">💅</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Nails Pro</h1>
        <p className="text-gray-400 mt-1 text-sm">Gestiona tu negocio con estilo</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
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
          <label className="text-sm font-semibold text-gray-600 mb-1 block">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-2xl border border-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-400 hover:bg-teal-500 text-white font-bold py-4 rounded-2xl shadow-md transition-all active:scale-95 disabled:opacity-50 mt-2"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-8">
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className="text-teal-500 font-semibold">
          Regístrate aquí
        </Link>
      </p>
    </div>
  )
}
