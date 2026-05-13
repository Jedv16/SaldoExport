'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  ruc?: string; // Lo hacemos opcional para que sirva en ambos módulos
  onSuccess: (razonSocial: string, rucGenerado: string) => void;
  onClose: () => void;
}

export default function ModalNuevaEmpresa({ ruc = '', onSuccess, onClose }: Props) {
  const [razon, setRazon] = useState('');
  const [rucManual, setRucManual] = useState(ruc);
  const [saving, setSaving] = useState(false);

  const guardarEmpresa = async () => {
    const rucFinal = ruc || rucManual;
    if (rucFinal.length !== 11) return alert("El RUC debe tener 11 dígitos");
    if (!razon) return alert("Por favor, ingresa la Razón Social");
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('empresas').insert([
        { 
          ruc: rucFinal, 
          razon_social: razon, 
          creado_por: user?.id 
        }
      ]);

      if (error) throw error;

      onSuccess(razon, rucFinal);
      onClose();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0b1f3a]/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 border border-[#e2e7f0] shadow-2xl">
        <div className="mb-6 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#0b57d0]">Registro</p>
          <h2 className="text-2xl font-black text-[#0b1f3a]">Registrar empresa</h2>
          <p className="text-sm text-[#6c7690]">Completa los datos para continuar.</p>
        </div>

        <div className="space-y-4">
          {/* Campo RUC: Solo editable si no viene de la calculadora */}
          <div>
            <label className="text-[10px] font-black text-[#6c7690] uppercase ml-1">Numero de RUC</label>
            <input 
              type="text" 
              maxLength={11}
              disabled={!!ruc}
              className="w-full p-4 bg-[#f5f7fb] rounded-2xl border-2 border-transparent focus:border-[#0b57d0] outline-none font-bold disabled:opacity-50"
              value={rucManual}
              onChange={(e) => setRucManual(e.target.value)}
              placeholder="20XXXXXXXXX"
            />
          </div>

          {/* Campo Razón Social */}
          <div>
            <label className="text-[10px] font-black text-[#6c7690] uppercase ml-1">Razon social</label>
            <input 
              type="text" 
              className="w-full p-4 bg-[#f5f7fb] rounded-2xl border-2 border-transparent focus:border-[#0b57d0] outline-none font-bold"
              value={razon} 
              onChange={(e) => setRazon(e.target.value)} 
              placeholder="Nombre comercial o legal"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-4 font-bold text-[#6c7690]">Cancelar</button>
            <button 
              onClick={guardarEmpresa} 
              disabled={saving}
              className="flex-1 py-4 bg-[#0b1f3a] text-white rounded-2xl font-black shadow-lg shadow-[#0b1f3a]/20 disabled:opacity-50"
            >
              {saving ? 'GUARDANDO...' : 'REGISTRAR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}