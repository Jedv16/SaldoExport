'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AjustesPage() {
  // Estados de Perfil
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [userRol, setUserRol] = useState('user');

  // Estados de Admin (Variables Globales)
  const [igv, setIgv] = useState(18);
  const [limite, setLimite] = useState(18);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || '');

      // Traer perfil y rol
      const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
      if (perfil) {
        setNombre(perfil.nombre_completo || '');
        setUserRol(perfil.rol);
      }

      // Traer variables globales
      const { data: config } = await supabase.from('ajustes_sistema').select('*').eq('id', 1).single();
      if (config) {
        setIgv(config.igv_defecto);
        setLimite(config.limite_sfmb_defecto);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const updatePerfil = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('perfiles').update({ nombre_completo: nombre }).eq('id', user?.id);
    if (error) alert("Error: " + error.message);
    else alert("Nombre actualizado correctamente");
  };

  const updatePassword = async () => {
    if (pass.length < 6) return alert("La contraseña debe tener al menos 6 caracteres");
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) alert("Error: " + error.message);
    else { alert("Contraseña cambiada con éxito"); setPass(''); }
  };

  const updateGlobalConfig = async () => {
    const { error } = await supabase.from('ajustes_sistema').update({ 
      igv_defecto: igv, 
      limite_sfmb_defecto: limite 
    }).eq('id', 1);
    
    if (error) alert("Error al guardar: " + error.message);
    else alert("Configuración global actualizada");
  };

  if (loading) return <div className="p-10 text-center text-[#6c7690]">Cargando ajustes...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="rounded-[2rem] bg-gradient-to-br from-white via-white to-[#e9f0ff] border border-[#e2e7f0] p-8">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#0b57d0]">Ajustes</p>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-[#0b1f3a] tracking-tight">Sistema</h1>
            <p className="text-sm text-[#465166]">Gestiona tu perfil y preferencias globales de calculo.</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN USUARIO: MI PERFIL */}
      <section className="bg-white rounded-[2rem] border border-[#e2e7f0] p-8 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-widest text-[#6c7690] mb-6">Mi perfil</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#6c7690] uppercase ml-1">Nombre completo</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} 
                className="w-full mt-1 p-4 bg-[#f5f7fb] rounded-2xl border-2 border-transparent focus:border-[#0b57d0] outline-none transition" />
            </div>
            <button onClick={updatePerfil} className="bg-[#0b1f3a] text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-[0.2em]">
              Guardar nombre
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#6c7690] uppercase ml-1">Nueva contrasena</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••"
                className="w-full mt-1 p-4 bg-[#f5f7fb] rounded-2xl border-2 border-transparent focus:border-[#0b57d0] outline-none transition" />
            </div>
            <button onClick={updatePassword} className="bg-[#0b57d0] text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-[0.2em]">
              Cambiar contrasena
            </button>
          </div>
        </div>
      </section>

      {/* SECCIÓN ADMIN: VARIABLES GLOBALES */}
      {userRol === 'admin' && (
        <section className="bg-white rounded-[2rem] border border-[#e2e7f0] p-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="bg-[#0b57d0] text-white text-[10px] font-black px-2 py-1 rounded">ADMIN</span>
            <h2 className="text-sm font-black uppercase tracking-widest text-[#0b1f3a]">
              Variables globales de calculo
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#6c7690] uppercase ml-1">IGV por defecto (%)</label>
              <input type="number" value={igv} onChange={(e) => setIgv(Number(e.target.value))}
                className="w-full p-4 bg-[#f5f7fb] rounded-2xl border-2 border-transparent focus:border-[#0b57d0] outline-none transition font-bold" />
              <p className="text-[10px] text-[#6c7690] ml-1">Usado para separar la base imponible en la calculadora.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#6c7690] uppercase ml-1">Limite SFMB (% del FOB)</label>
              <input type="number" value={limite} onChange={(e) => setLimite(Number(e.target.value))}
                className="w-full p-4 bg-[#f5f7fb] rounded-2xl border-2 border-transparent focus:border-[#0b57d0] outline-none transition font-bold" />
              <p className="text-[10px] text-[#6c7690] ml-1">Tope maximo de devolucion mensual segun ley de exportacion.</p>
            </div>
          </div>

          <button onClick={updateGlobalConfig} className="mt-8 w-full md:w-auto bg-[#0b1f3a] hover:bg-[#0a1930] text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition shadow-lg shadow-[#0b1f3a]/20">
            Actualizar reglas del sistema
          </button>
        </section>
      )}
    </div>
  );
}