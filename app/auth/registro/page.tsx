'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName } // Esto lo lee el Trigger para la tabla perfiles
      }
    });

    if (error) {
      const friendlyMessage = error.message.includes('Password should contain at least one character of each')
        ? 'Debe de incluir una letra mayuscula, minuscula, numeros y simbolos.'
        : error.message;
      setErrorMessage(friendlyMessage);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const { error: updateError } = await supabase.from('perfiles').update({ rol: 'user' }).eq('id', userId);
      if (updateError) {
        setErrorMessage('Cuenta creada, pero no se pudo asignar el rol. Revisa las politicas RLS.');
      } else {
        setSuccessMessage('Cuenta creada exitosamente. Ya puedes iniciar sesión.');
      }
    }

    if (!userId) {
      setSuccessMessage('Cuenta creada exitosamente. Revisa tu correo para confirmar (si tienes activado el email confirmation).');
    }

    setEmail('');
    setPassword('');
    setFullName('');
    setLoading(false);

    window.setTimeout(() => {
      router.push('/auth/login');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl grid lg:grid-cols-[1fr_1.1fr] gap-8">
        <form onSubmit={handleRegister} className="bg-white rounded-[2rem] border border-[#e2e7f0] p-8 md:p-10 shadow-xl">
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#0b57d0]">Registro</p>
            <h1 className="text-2xl font-black text-[#0b1f3a]">Crear cuenta</h1>
            <p className="text-sm text-[#465166]">Complete el formulario para crear su cuenta.</p>
          </div>

          <div className="mt-8 space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Nombre completo</label>
              <input
                type="text"
                placeholder="Nombre y apellido"
                className="w-full rounded-2xl border border-[#e2e7f0] bg-[#f5f7fb] px-4 py-3 text-sm font-semibold text-[#0b1f3a] outline-none focus:border-[#0b57d0]"
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Correo</label>
              <input
                type="email"
                placeholder="nombre@empresa.com"
                className="w-full rounded-2xl border border-[#e2e7f0] bg-[#f5f7fb] px-4 py-3 text-sm font-semibold text-[#0b1f3a] outline-none focus:border-[#0b57d0]"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Contraseña</label>
              <input
                type="password"
                placeholder="Minimo 8 caracteres"
                className="w-full rounded-2xl border border-[#e2e7f0] bg-[#f5f7fb] px-4 py-3 text-sm font-semibold text-[#0b1f3a] outline-none focus:border-[#0b57d0]"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {successMessage && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-2xl bg-[#0b1f3a] text-white py-3 text-sm font-black uppercase tracking-[0.25em] shadow-lg shadow-[#0b1f3a]/20 hover:bg-[#0a1930] transition disabled:opacity-60"
          >
            {loading ? 'Creando...' : 'Crear cuenta'}
          </button>

          <p className="mt-6 text-sm text-[#465166]">
            Ya tienes cuenta?{' '}
            <Link className="font-bold text-[#0b57d0] hover:text-[#0a4bbf]" href="/auth/login">
              Iniciar sesion
            </Link>
          </p>
        </form>

        <section className="hidden lg:flex flex-col justify-between rounded-[2.5rem] bg-white border border-[#e2e7f0] p-10 shadow-xl">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#6c7690]">Confianza</p>
            <h2 className="mt-4 text-3xl font-black text-[#0b1f3a]">Transparencia en cada calculo</h2>
          </div>
          <div className="rounded-2xl border border-[#e2e7f0] bg-[#f5f7fb] p-4 text-xs text-[#465166]">
            Automatiza el Saldo a Favor, registra periodos y exporta reportes con un flujo claro y auditable.
          </div>
        </section>
      </div>
    </div>
  );
}