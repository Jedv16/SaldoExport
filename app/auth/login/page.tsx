'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Error: " + error.message);
      return;
    }

    const userId = data.user?.id;
    const metadataRole = data.user?.user_metadata?.rol;
    if (!userId) {
      router.push('/dashboard/calculadora');
      return;
    }

    const { data: perfil, error: perfilError } = await supabase.from('perfiles').select('rol').eq('id', userId).single();
    if (perfilError) {
      console.error('Error perfil:', perfilError);
    }

    const effectiveRole = perfil?.rol || metadataRole;
    if (effectiveRole === 'admin') {
      router.push('/admin');
      return;
    }

    router.push('/dashboard/calculadora');
  };


  return (
    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl grid lg:grid-cols-[1.1fr_1fr] gap-8">
        <section className="hidden lg:flex flex-col justify-between rounded-[2.5rem] bg-[#0b1f3a] text-white p-10 shadow-2xl shadow-[#0b1f3a]/30">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">SaldoExport</p>
            <h1 className="mt-4 text-3xl font-black leading-tight">Gestión y recuperación del saldo a favor del exportador</h1>

            <div className="mx-auto my-8 w-full flex items-center justify-center">
              <div className="w-48 h-48 bg-white/5 rounded-xl flex items-center justify-center">
                <img src="/img/logo.jpeg" alt="SaldoExport" className="w-36 h-36 object-contain" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
            Accede a calculos confiables, historial fiscal y reportes listos para auditoria.
          </div>
        </section>

        <form onSubmit={handleLogin} className="bg-white rounded-[2rem] border border-[#e2e7f0] p-8 md:p-10 shadow-xl">
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#0b57d0]">Ingreso seguro</p>
            <h2 className="text-2xl font-black text-[#0b1f3a]">Entrar a SaldoExport</h2>
            <p className="text-sm text-[#465166]">Inicia sesión para continuar.</p>
          </div>

          <div className="mt-8 space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Correo</label>
              <input
                type="email"
                placeholder="nombre@empresa.com"
                className="w-full rounded-2xl border border-[#e2e7f0] bg-[#f5f7fb] px-4 py-3 text-sm font-semibold text-[#0b1f3a] outline-none focus:border-[#0b57d0]"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-2xl border border-[#e2e7f0] bg-[#f5f7fb] px-4 py-3 text-sm font-semibold text-[#0b1f3a] outline-none focus:border-[#0b57d0]"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button className="mt-8 w-full rounded-2xl bg-[#0b1f3a] text-white py-3 text-sm font-black uppercase tracking-[0.25em] shadow-lg shadow-[#0b1f3a]/20 hover:bg-[#0a1930] transition">
            Iniciar sesion
          </button>


          <p className="mt-6 text-sm text-[#465166]">
            No tienes cuenta?{' '}
            <Link className="font-bold text-[#0b57d0] hover:text-[#0a4bbf]" href="/auth/registro">
              Crear cuenta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}