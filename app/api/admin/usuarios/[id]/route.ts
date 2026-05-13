import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are not configured.');
}

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const getAdminUser = async (request: Request) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return { error: NextResponse.json({ error: 'No autorizado.' }, { status: 401 }) };
  }

  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: NextResponse.json({ error: 'Sesion no valida.' }, { status: 401 }) };
  }

  const { data: perfilData, error: perfilError } = await supabaseAdmin
    .from('perfiles')
    .select('rol')
    .eq('id', userData.user.id)
    .single();

  if (perfilError || perfilData?.rol !== 'admin') {
    return { error: NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }) };
  }

  return { userId: userData.user.id };
};

export async function PATCH(request: Request, context: RouteContext) {
  const adminCheck = await getAdminUser(request);
  if (adminCheck.error) return adminCheck.error;

  const body = await request.json();
  const nombreCompleto = String(body.nombre_completo || '').trim();
  const rol = body.rol === 'admin' ? 'admin' : 'user';

  if (!nombreCompleto) {
    return NextResponse.json({ error: 'Nombre requerido.' }, { status: 400 });
  }

  const { id: targetId } = await context.params;
  if (!isValidUuid(targetId)) {
    return NextResponse.json({ error: 'ID de usuario invalido.' }, { status: 400 });
  }

  const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
    user_metadata: {
      full_name: nombreCompleto,
      rol,
    },
  });

  if (updateAuthError) {
    return NextResponse.json({ error: updateAuthError.message }, { status: 400 });
  }

  const { error: updatePerfilError } = await supabaseAdmin
    .from('perfiles')
    .update({ nombre_completo: nombreCompleto, rol })
    .eq('id', targetId);

  if (updatePerfilError) {
    return NextResponse.json({ error: 'No se pudo actualizar el perfil.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  const adminCheck = await getAdminUser(request);
  if (adminCheck.error) return adminCheck.error;

  const { id: targetId } = await context.params;
  if (!isValidUuid(targetId)) {
    return NextResponse.json({ error: 'ID de usuario invalido.' }, { status: 400 });
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
