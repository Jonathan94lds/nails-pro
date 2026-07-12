'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function BloqueadoPage() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso suspendido</h1>
        <p className="text-gray-400 text-sm mb-8">Tu cuenta ha sido suspendida. Contacta al administrador para reactivar tu acceso a Nails Pro.</p>
        <button
          onClick={handleLogout}
          className="w-full bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}