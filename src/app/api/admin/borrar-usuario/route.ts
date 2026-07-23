import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente con la service role key: SOLO se usa aquí, en el servidor.
// Nunca se debe importar en un componente 'use client'.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verifica quién está haciendo la petición
    const { data: { user: solicitante }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !solicitante) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verifica que quien pide el borrado sea admin
    const { data: empresaSolicitante } = await supabaseAdmin
      .from('empresas')
      .select('es_admin')
      .eq('id', solicitante.id)
      .single()

    if (!empresaSolicitante?.es_admin) {
      return NextResponse.json({ error: 'Solo un administrador puede borrar usuarios' }, { status: 403 })
    }

    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'Falta el id del usuario a borrar' }, { status: 400 })
    }

    // No permitir que el admin se borre a sí mismo por accidente
    if (userId === solicitante.id) {
      return NextResponse.json({ error: 'No puedes borrar tu propia cuenta de administrador' }, { status: 400 })
    }

    // 1. Borra en cascada los datos del negocio (citas, clientes, servicios, gastos)
    const { data: citas } = await supabaseAdmin.from('citas').select('id').eq('empresa_id', userId)
    const citaIds = (citas || []).map(c => c.id)

    if (citaIds.length > 0) {
      await supabaseAdmin.from('cita_servicios').delete().in('cita_id', citaIds)
    }
    await supabaseAdmin.from('citas').delete().eq('empresa_id', userId)
    await supabaseAdmin.from('clientes').delete().eq('empresa_id', userId)
    await supabaseAdmin.from('servicios').delete().eq('empresa_id', userId)
    await supabaseAdmin.from('gastos').delete().eq('empresa_id', userId)
    await supabaseAdmin.from('notificaciones_log').delete().eq('empresa_id', userId)

    // 2. Borra el registro de la empresa
    await supabaseAdmin.from('empresas').delete().eq('id', userId)

    // 3. Borra la cuenta de acceso (auth) por completo
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteAuthError) {
      // Los datos ya se borraron; avisamos que la cuenta de acceso falló
      return NextResponse.json({ error: `Datos borrados, pero falló borrar la cuenta de acceso: ${deleteAuthError.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error inesperado' }, { status: 500 })
  }
}
