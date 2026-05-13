import { createClient } from '@supabase/supabase-js';

// Las variables de entorno que pusiste en el .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Creamos el cliente con los tipos de datos automáticos de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);