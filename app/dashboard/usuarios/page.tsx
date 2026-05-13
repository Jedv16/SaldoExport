'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      // Traemos la info de la tabla 'perfiles'
      const { data } = await supabase.from('perfiles').select('*').order('rol');
      if (data) setUsuarios(data);
    };
    fetchUsuarios();
  }, []);

  const toggleRol = async (id: string, actualRol: string) => {
    const nuevoRol = actualRol === 'admin' ? 'user' : 'admin';
    const { error } = await supabase.from('perfiles').update({ rol: nuevoRol }).eq('id', id);
    if (!error) {
      setUsuarios(usuarios.map(u => u.id === id ? { ...u, rol: nuevoRol } : u));
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] bg-gradient-to-br from-white via-white to-[#e9f0ff] border border-[#e2e7f0] p-8">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#0b57d0]">Usuarios</p>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-[#0b1f3a] tracking-tight">Control de usuarios</h1>
            <p className="text-sm text-[#465166]">Administra roles y accesos del equipo.</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-[2rem] border border-[#e2e7f0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="bg-[#f5f7fb] border-b border-[#e2e7f0]">
              <th className="p-5 text-xs font-black uppercase text-[#6c7690]">Usuario</th>
              <th className="p-5 text-xs font-black uppercase text-[#6c7690]">Correo</th>
              <th className="p-5 text-xs font-black uppercase text-[#6c7690] text-center">Rol</th>
              <th className="p-5 text-xs font-black uppercase text-[#6c7690] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e7f0]">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-[#f5f7fb] transition">
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e7f0ff] border border-[#c7d7ff] flex items-center justify-center text-[#0b57d0] font-bold">
                      {u.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-[#0b1f3a]">{u.nombre_completo || 'Sin nombre'}</span>
                  </div>
                </td>
                <td className="p-5 text-[#6c7690] text-sm">{u.email}</td>
                <td className="p-5 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    u.rol === 'admin' ? 'bg-[#e9f0ff] text-[#0b57d0]' : 'bg-[#f5f7fb] text-[#465166]'
                  }`}>
                    {u.rol}
                  </span>
                </td>
                <td className="p-5 text-right">
                  <button
                    onClick={() => toggleRol(u.id, u.rol)}
                    className="text-xs font-black text-[#0b57d0] hover:text-[#0a4bbf]"
                  >
                    Cambiar a {u.rol === 'admin' ? 'Usuario' : 'Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}