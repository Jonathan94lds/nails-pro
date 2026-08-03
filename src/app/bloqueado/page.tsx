'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function BloqueadoPage() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const IconLock = (p: any) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="4" y="10.5" width="16" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#8C2F27] flex items-center justify-center mx-auto mb-6 text-white">
          <IconLock />
        </div>
        <h1 className="text-[26px] text-[#1F1B18] mb-2" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
          Acceso suspendido
        </h1>
        <p className="text-[#8A8378] text-sm leading-relaxed mb-8">
          Tu cuenta ha sido suspendida. Contacta al administrador para reactivar tu acceso a Nails Pro.
        </p>
        <button
          onClick={handleLogout}
          className="w-full bg-white border border-[#EFEAE2] text-[#1F1B18] font-semibold text-sm py-3.5 rounded-2xl transition-colors active:scale-[0.98] hover:border-[#1F1B18]"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
