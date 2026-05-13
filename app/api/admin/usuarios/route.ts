import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabaseClients = () => {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return null;
  }

  return {
    supabaseAuth: createClient(supabaseUrl, supabaseAnonKey),
    supabaseAdmin: createClient(supabaseUrl, supabaseServiceKey),
  };
};

export async function POST(request: Request) {
  const clients = getSupabaseClients();
  if (!clients) {
    return NextResponse.json({ error: 'Supabase environment variables are not configured.' }, { status: 500 });
  }

  const { supabaseAuth, supabaseAdmin } = clients;
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Sesion no valida.' }, { status: 401 });
  }

  const { data: perfilData, error: perfilError } = await supabaseAdmin
    .from('perfiles')
    .select('rol')
    .eq('id', userData.user.id)
    .single();

  if (perfilError || perfilData?.rol !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const body = await request.json();
  const email = String(body.email || '').trim();
  const password = String(body.password || '').trim();
  const nombreCompleto = String(body.nombre_completo || '').trim();
  const rol = body.rol === 'admin' ? 'admin' : 'user';

  if (!email || !password || !nombreCompleto) {
    return NextResponse.json({ error: 'Faltan datos requeridos.' }, { status: 400 });
  }

  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: nombreCompleto,
      rol,
    },
  });

  if (createError || !createData.user) {
    return NextResponse.json({ error: createError?.message || 'No se pudo crear el usuario.' }, { status: 400 });
  }

  const { error: upsertError } = await supabaseAdmin
    .from('perfiles')
    .upsert({
      id: createData.user.id,
      email,
      nombre_completo: nombreCompleto,
      rol,
    });

  if (upsertError) {
    return NextResponse.json({ error: 'Usuario creado, pero no se pudo actualizar el perfil.' }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
