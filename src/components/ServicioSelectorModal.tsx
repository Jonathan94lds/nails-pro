'use client'

type Servicio = { id: string; nombre: string; valor: number; duracion_min: number }

const IconClose = (p: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IconCheck = (p: any) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

// Se usa tanto para crear una cita nueva como para editar una existente —
// antes era el mismo bloque de JSX copiado dos veces en citas/page.tsx.
export default function ServicioSelectorModal({
  servicios,
  seleccionados,
  onToggle,
  onClose,
  zIndex = 50,
}: {
  servicios: Servicio[]
  seleccionados: string[]
  onToggle: (id: string) => void
  onClose: () => void
  zIndex?: number
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-h-[75vh] flex flex-col p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#1F1B18] text-lg">Elegir servicios</h3>
          <button onClick={onClose} className="text-[#8A8378]"><IconClose /></button>
        </div>

        <div className="overflow-y-auto space-y-2 flex-1">
          {servicios.map(s => {
            const activo = seleccionados.includes(s.id)
            return (
              <div
                key={s.id}
                onClick={() => onToggle(s.id)}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border-2 transition-all ${activo ? 'border-[#B08D57] bg-[#F3EDE3]' : 'border-[#EFEAE2] bg-[#FAF8F5]'}`}
              >
                <div>
                  <p className="font-semibold text-[#1F1B18] text-sm">{s.nombre}</p>
                  <p className="text-[#8A8378] text-xs">${s.valor.toLocaleString()} · {s.duracion_min} min</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${activo ? 'border-[#B08D57] bg-[#B08D57] text-white' : 'border-[#D8D0C3]'}`}>
                  {activo && <IconCheck />}
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={onClose} className="w-full bg-[#1F1B18] text-white py-4 rounded-2xl font-semibold mt-4">
          Listo ({seleccionados.length})
        </button>
      </div>
    </div>
  )
}
