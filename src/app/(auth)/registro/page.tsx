'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RegistroPage() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, telefono }
      }
    })

    if (authError) {
      setError('Error: ' + authError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('empresas').update({
        nombre,
        telefono
      }).eq('id', user.id)
    }

    await supabase.auth.signOut()
    setEnviado(true)
    setLoading(false)
  }

  // Íconos de línea, mismo lenguaje visual del resto de la app
  const IconMark = (p: any) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 19c3-1 5.5-3.5 9-9" />
      <path d="M12.5 8.5 16 5c1-1 2.5-1 3.5 0s1 2.5 0 3.5l-3.5 3.5" />
      <path d="M4.5 19.5 3 21" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
  const IconClock = (p: any) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )

  const inputClass = "w-full bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl px-4 py-3.5 text-[#1F1B18] text-sm placeholder:text-[#B4AC9E] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57] focus:bg-white transition-colors"
  const labelClass = "text-[11px] font-semibold tracking-[0.1em] text-[#8A8378] uppercase mb-1.5 block"

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1F1B18] flex items-center justify-center mx-auto mb-6 text-[#B08D57]">
            <IconClock />
          </div>
          <h1 className="text-[26px] text-[#1F1B18] mb-2" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
            Solicitud enviada
          </h1>
          <p className="text-[#8A8378] text-sm leading-relaxed mb-8">
            Tu cuenta está siendo revisada. Te contactaremos pronto para activar tu acceso.
          </p>
          <Link href="/login" className="text-[#8A6A3A] font-semibold text-sm">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px]">
        {/* Marca */}
        <div className="flex flex-col items-center mb-9">
          <div className="w-14 h-14 rounded-2xl bg-[#1F1B18] flex items-center justify-center mb-5 text-[#B08D57]">
            <IconMark />
          </div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#B08D57] uppercase mb-1.5">Solicita tu acceso</p>
          <h1 className="text-[30px] text-[#1F1B18] leading-none" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
            Nails Pro
          </h1>
        </div>

        {/* Tarjeta */}
        <div className="bg-white border border-[#EFEAE2] rounded-3xl px-7 py-8">
          <form onSubmit={handleRegistro} className="space-y-4">
            <div>
              <label className={labelClass}>Nombre de tu negocio</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Nails by María"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="3001234567"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                autoComplete="new-password"
                className={inputClass}
              />
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
              {loading ? 'Enviando...' : 'Solicitar acceso'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#8A8378] mt-7">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#8A6A3A] font-semibold">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
