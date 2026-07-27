export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[#F1EEE9] animate-pulse rounded-2xl ${className}`} />
}

// Fila tipo "tarjeta de lista" — clientes, servicios, citas
export function SkeletonListItem() {
  return (
    <div className="bg-white border border-[#EFEAE2] rounded-3xl px-5 py-4 flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

// Varias filas seguidas, para no repetir el .map en cada pagina
export function SkeletonList({ filas = 4 }: { filas?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: filas }).map((_, i) => <SkeletonListItem key={i} />)}
    </div>
  )
}

// Tarjeta pequena tipo dashboard (finanzas, resumen)
export function SkeletonCard() {
  return <Skeleton className="p-4 h-24 w-full" />
}

// Cuadricula de tarjetas pequenas (dashboard de finanzas: 2x2, 2x3, etc)
export function SkeletonGrid({ celdas = 4 }: { celdas?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: celdas }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}
