"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type PerfilRow = {
  id: string;
  email: string | null;
  rol: string | null;
  nombre_completo: string | null;
  updated_at: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<PerfilRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    rol: 'user',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadUsers = async (isMounted?: { current: boolean }, targetPage = page) => {
    setLoading(true);
    setError(null);
    const from = (targetPage - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error: loadError, count } = await supabase
      .from('perfiles')
      .select('id, email, rol, nombre_completo, updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (isMounted && !isMounted.current) return;

    if (loadError) {
      setError('No se pudo cargar la lista de usuarios.');
      setUsers([]);
      setTotalCount(0);
    } else {
      setUsers(data ?? []);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    const isMounted = { current: true };
    loadUsers(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, [page]);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setFormError(null);
    setFormSuccess(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setFormError('No hay sesion activa.');
      setCreating(false);
      return;
    }

    const response = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(form),
    });

    const result = await response.json();
    if (!response.ok && !result.ok) {
      setFormError(result.error || 'No se pudo crear el usuario.');
      setCreating(false);
      return;
    }

    setFormSuccess('Usuario creado correctamente.');
    setForm({ email: '', password: '', nombre_completo: '', rol: 'user' });
    setPage(1);
    await loadUsers(undefined, 1);
    setCreating(false);
  };

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token || null;
  };

  const handleEditUser = async (row: PerfilRow) => {
    const nextName = window.prompt('Nombre completo', row.nombre_completo ?? '');
    if (nextName === null) return;

    const nextRoleRaw = window.prompt('Rol (admin/user)', row.rol ?? 'user');
    if (nextRoleRaw === null) return;

    const nextRole = nextRoleRaw.trim().toLowerCase();
    if (nextRole !== 'admin' && nextRole !== 'user') {
      alert('Rol invalido. Usa admin o user.');
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setActionError('No hay sesion activa.');
      return;
    }

    setActionError(null);
    setActionLoadingId(row.id);

    const response = await fetch(`/api/admin/usuarios/${row.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ nombre_completo: nextName.trim(), rol: nextRole }),
    });

    const result = await response.json();
    if (!response.ok) {
      setActionError(result.error || 'No se pudo actualizar el usuario.');
      setActionLoadingId(null);
      return;
    }

    await loadUsers();
    setActionLoadingId(null);
  };

  const handleDeleteUser = async (row: PerfilRow) => {
    const confirmed = window.confirm(`Eliminar usuario ${row.email ?? ''}?`);
    if (!confirmed) return;

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setActionError('No hay sesion activa.');
      return;
    }

    setActionError(null);
    setActionLoadingId(row.id);

    const response = await fetch(`/api/admin/usuarios/${row.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      setActionError(result.error || 'No se pudo eliminar el usuario.');
      setActionLoadingId(null);
      return;
    }

    await loadUsers();
    setActionLoadingId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600">Administracion</p>
        <h1 className="text-2xl font-black text-[#0b1f3a]">Usuarios y roles</h1>
        <p className="text-sm text-[#465166]">Gestiona altas, permisos y revisiones de acceso.</p>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      </section>

      <div className="rounded-3xl border border-[#e2e7f0] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-[#0b1f3a]">Listado de usuarios</p>
            <p className="text-xs text-[#6c7690]">Vista preliminar de administracion.</p>
          </div>
          <span className="text-xs font-semibold text-[#6c7690]"></span>
        </div>
        <form onSubmit={handleCreateUser} className="mt-4 grid gap-3 rounded-2xl border border-[#edf1f7] bg-[#f7f9ff] px-4 py-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Nombre</label>
            <input
              value={form.nombre_completo}
              onChange={(event) => setForm((prev) => ({ ...prev, nombre_completo: event.target.value }))}
              className="w-full rounded-2xl border border-[#e2e7f0] bg-white px-3 py-2 text-sm font-semibold text-[#0b1f3a]"
              placeholder="Nombre completo"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Correo</label>
            <input
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-2xl border border-[#e2e7f0] bg-white px-3 py-2 text-sm font-semibold text-[#0b1f3a]"
              placeholder="correo@empresa.com"
              type="email"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Contrasena</label>
            <input
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-2xl border border-[#e2e7f0] bg-white px-3 py-2 text-sm font-semibold text-[#0b1f3a]"
              placeholder="Minimo 8 caracteres"
              type="password"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Rol</label>
            <select
              value={form.rol}
              onChange={(event) => setForm((prev) => ({ ...prev, rol: event.target.value }))}
              className="w-full rounded-2xl border border-[#e2e7f0] bg-white px-3 py-2 text-sm font-semibold text-[#0b1f3a]"
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="md:col-span-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-[#0b57d0] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white disabled:opacity-60"
            >
              {creating ? 'Creando...' : 'Crear usuario'}
            </button>
            {formError && <span className="text-xs font-semibold text-rose-600">{formError}</span>}
            {formSuccess && <span className="text-xs font-semibold text-emerald-600">{formSuccess}</span>}
          </div>
        </form>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#edf1f7]">
          <div className="grid grid-cols-5 gap-2 bg-[#f7f9ff] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#6c7690]">
            <span>Usuario</span>
            <span>Nombre</span>
            <span>Rol</span>
            <span>Actualizado</span>
            <span>Accion</span>
          </div>
          {loading && (
            <div className="px-4 py-6 text-sm text-[#6c7690]">Cargando usuarios...</div>
          )}
          {!loading && users.length === 0 && (
            <div className="px-4 py-6 text-sm text-[#6c7690]">No hay usuarios registrados.</div>
          )}
          {actionError && (
            <div className="px-4 py-3 text-xs font-semibold text-rose-600">{actionError}</div>
          )}
          {users.map((row) => (
            <div key={row.id} className="grid grid-cols-5 gap-2 border-t border-[#edf1f7] px-4 py-3 text-sm">
              <span className="font-semibold text-[#0b1f3a]">{row.email ?? 'Sin correo'}</span>
              <span className="text-[#465166]">{row.nombre_completo ?? 'Sin nombre'}</span>
              <span className="text-[#465166]">{row.rol ?? 'user'}</span>
              <span className="text-[#465166]">{formatDate(row.updated_at)}</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleEditUser(row)}
                  disabled={actionLoadingId === row.id}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 disabled:opacity-60"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(row)}
                  disabled={actionLoadingId === row.id}
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 disabled:opacity-60"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-[#6c7690]">
            Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} de {totalCount}
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-xl border bg-white disabled:opacity-50"
            >
              Anterior
            </button>
            <div className="inline-flex items-center gap-1">
              {Array.from({ length: Math.max(1, Math.ceil(totalCount / pageSize)) }).map((_, i) => {
                const pageNumber = i + 1;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`px-3 py-1 rounded-xl ${pageNumber === page ? 'bg-[#0b57d0] text-white' : 'bg-white'}`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= totalCount}
              className="px-3 py-1 rounded-xl border bg-white disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
