'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'
type ToastItem = { id: number; message: string; type: ToastType }

type ConfirmOptions = {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}
type ConfirmState = ConfirmOptions & { resolve: (v: boolean) => void }

type ToastContextType = { toast: (message: string, type?: ToastType) => void }
type ConfirmContextType = { confirm: (opts: ConfirmOptions) => Promise<boolean> }

const ToastContext = createContext<ToastContextType | null>(null)
const ConfirmContext = createContext<ConfirmContextType | null>(null)

// Úsalo así: const toast = useToast(); toast('Cliente guardado', 'success')
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <Providers>')
  return ctx.toast
}

// Úsalo así: const confirm = useConfirm();
// const ok = await confirm({ title: '¿Desactivar servicio?', message: '...', danger: true })
// if (!ok) return
export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <Providers>')
  return ctx.confirm
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3200)
  }, [])

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...opts, resolve })
    })
  }, [])

  const cerrarConfirm = (resultado: boolean) => {
    confirmState?.resolve(resultado)
    setConfirmState(null)
  }

  const colorPorTipo: Record<ToastType, string> = {
    success: 'bg-[#2F4A3C]',
    error: 'bg-[#8C2F27]',
    info: 'bg-[#1F1B18]',
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <ConfirmContext.Provider value={{ confirm }}>
        {children}

        {/* Stack de notificaciones */}
        <div className="fixed bottom-6 left-4 right-4 z-[100] flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`${colorPorTipo[t.type]} text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg max-w-sm w-full text-center`}
            >
              {t.message}
            </div>
          ))}
        </div>

        {/* Modal de confirmación */}
        {confirmState && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110] px-6"
            onClick={() => cerrarConfirm(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-[#1F1B18] text-lg" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
                {confirmState.title}
              </h3>
              <p className="text-[#5C564C] text-sm mt-2 leading-relaxed">{confirmState.message}</p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => cerrarConfirm(false)}
                  className="flex-1 bg-[#F3EDE3] text-[#5C564C] py-3 rounded-2xl font-semibold text-sm"
                >
                  {confirmState.cancelText || 'Cancelar'}
                </button>
                <button
                  onClick={() => cerrarConfirm(true)}
                  className={`flex-1 py-3 rounded-2xl font-semibold text-sm text-white ${confirmState.danger ? 'bg-[#8C2F27]' : 'bg-[#1F1B18]'}`}
                >
                  {confirmState.confirmText || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}
