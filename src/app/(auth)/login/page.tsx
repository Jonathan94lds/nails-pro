'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
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

  // Marca de línea, mismo lenguaje visual que el resto de la app
  const IconMark = (p: any) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 19c3-1 5.5-3.5 9-9" />
      <path d="M12.5 8.5 16 5c1-1 2.5-1 3.5 0s1 2.5 0 3.5l-3.5 3.5" />
      <path d="M4.5 19.5 3 21" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
  const IconEye = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
  const IconEyeOff = (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 4.22-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.68 3.94M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px]">
        {/* Marca */}
        <div className="flex flex-col items-center mb-9">
          <div className="w-14 h-14 rounded-2xl bg-[#1F1B18] flex items-center justify-center mb-5 text-[#B08D57]">
            <IconMark />
          </div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#B08D57] uppercase mb-1.5">Bienvenida de nuevo</p>
          <h1 className="text-[30px] text-[#1F1B18] leading-none" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
            Nails Pro
          </h1>
        </div>

        {/* Tarjeta */}
        <div className="bg-white border border-[#EFEAE2] rounded-3xl px-7 py-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] text-[#8A8378] uppercase mb-1.5 block">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                autoComplete="email"
                className="w-full bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl px-4 py-3.5 text-[#1F1B18] text-sm placeholder:text-[#B4AC9E] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57] focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] text-[#8A8378] uppercase mb-1.5 block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl px-4 py-3.5 pr-12 text-[#1F1B18] text-sm placeholder:text-[#B4AC9E] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4AC9E] hover:text-[#8A6A3A] transition-colors"
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {mostrarPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-[#F7E5E2] text-[#8C2F27] text-sm px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1F1B18] hover:bg-[#2A2521] text-white font-semibold text-sm py-3.5 rounded-2xl transition-colors active:scale-[0.98] disabled:opacity-50 mt-1"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#8A8378] mt-7">
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="text-[#8A6A3A] font-semibold">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  )
}
