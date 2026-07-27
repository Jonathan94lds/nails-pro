'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const IconInicio = (p: any) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 11.5L12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
)
const IconCitas = (p: any) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path d="M16 2.5v4M8 2.5v4M3 9.5h18" />
  </svg>
)
const IconClientes = (p: any) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="10" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconFinanzas = (p: any) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M16 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
  </svg>
)
const IconMas = (p: any) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
)
const IconServicios = (p: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
  </svg>
)
const IconFacturar = (p: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 3h9l3 3v15l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V5a2 2 0 0 1 2-2z" />
    <path d="M9 9h6M9 13h6M9 17h3" />
  </svg>
)
const IconClose = (p: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

const tabs = [
  { href: '/dashboard', label: 'Inicio', Icon: IconInicio },
  { href: '/citas', label: 'Citas', Icon: IconCitas },
  { href: '/clientes', label: 'Clientes', Icon: IconClientes },
  { href: '/finanzas', label: 'Finanzas', Icon: IconFinanzas },
]

// Barra fija en las 6 pantallas principales. "Más" abre una hoja con los
// módulos que no caben en la barra (Servicios, Facturación) — cuando
// agregues Configuración, solo hay que sumar un botón acá.
export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mostrarMas, setMostrarMas] = useState(false)

  const irA = (href: string) => {
    setMostrarMas(false)
    router.push(href)
  }

  const masActivo = pathname === '/servicios' || pathname === '/facturacion'

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EFEAE2] px-2 pt-2 flex items-center justify-around z-40"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        {tabs.map(({ href, label, Icon }) => {
          const activo = pathname === href
          return (
            <button
              key={href}
              onClick={() => irA(href)}
              className="flex flex-col items-center gap-1 px-3 py-1 min-w-[56px]"
            >
              <Icon className={activo ? 'text-[#1F1B18]' : 'text-[#B4AC9E]'} />
              <span className={`text-[10px] font-semibold ${activo ? 'text-[#1F1B18]' : 'text-[#B4AC9E]'}`}>
                {label}
              </span>
            </button>
          )
        })}
        <button
          onClick={() => setMostrarMas(true)}
          className="flex flex-col items-center gap-1 px-3 py-1 min-w-[56px]"
        >
          <IconMas className={masActivo || mostrarMas ? 'text-[#1F1B18]' : 'text-[#B4AC9E]'} />
          <span className={`text-[10px] font-semibold ${masActivo || mostrarMas ? 'text-[#1F1B18]' : 'text-[#B4AC9E]'}`}>
            Más
          </span>
        </button>
      </nav>

      {mostrarMas && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setMostrarMas(false)}>
          <div
            className="bg-white rounded-t-3xl w-full p-5 pb-8"
            style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-[#1F1B18] text-lg" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
                Más
              </h3>
              <button onClick={() => setMostrarMas(false)} className="text-[#8A8378]">
                <IconClose />
              </button>
            </div>

            <button
              onClick={() => irA('/servicios')}
              className="w-full flex items-center gap-3 py-3 text-left"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#F3EDE3] flex items-center justify-center text-[#8A6A3A]">
                <IconServicios />
              </div>
              <div>
                <p className="font-semibold text-[#1F1B18] text-sm">Servicios</p>
                <p className="text-[#8A8378] text-xs">Precios y duración</p>
              </div>
            </button>

            <button
              onClick={() => irA('/facturacion')}
              className="w-full flex items-center gap-3 py-3 text-left"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#F3EDE3] flex items-center justify-center text-[#8A6A3A]">
                <IconFacturar />
              </div>
              <div>
                <p className="font-semibold text-[#1F1B18] text-sm">Facturación</p>
                <p className="text-[#8A8378] text-xs">Citas de hoy</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
