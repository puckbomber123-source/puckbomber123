import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, User, Plus, Pencil, Trash2, ArrowLeft, Users, RefreshCw,
  History, UserCheck, X, Waves, Settings2, ToggleLeft, ToggleRight, Eye, EyeOff, ListTodo,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import ClientSearch from './ClientSearch';

const SUPER_ADMIN_ID = '002';

const technicianSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  staff_id: z.string().min(1, 'Staff ID is required'),
  pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d{4}$/, 'PIN must be 4 numbers'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  role: z.enum(['Admin', 'Pool Tech Senior', 'Assistant Pool Tech']),
  is_active: z.boolean().optional(),
});
type TechnicianFormData = z.infer<typeof technicianSchema>;

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  staff_id: string;
  pin: string;
  role: string;
  is_active: boolean;
}

const roleColors: Record<string, string> = {
  Admin: 'badge-red',
  'Pool Tech Senior': 'badge-green',
  'Assistant Pool Tech': 'badge-blue',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');
  const isSuperAdmin = technician.staff_id === SUPER_ADMIN_ID || technician.id === SUPER_ADMIN_ID;

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncEmail, setSyncEmail] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showPinFor, setShowPinFor] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TechnicianFormData>({
    resolver: zodResolver(technicianSchema),
    defaultValues: { is_active: true },
  });

  useEffect(() => {
    if (technician.role !== 'Admin') { navigate('/dashboard'); return; }
    fetchTechnicians();
  }, [navigate]);

  const fetchTechnicians = async () => {
    const { data, error } = await supabase
      .from('technicians')
      .select('*')
      .order('is_active', { ascending: false })
      .order('role', { ascending: true })
      .order('last_name', { ascending: true });
    if (error) { toast.error('Failed to load technicians'); return; }
    setTechnicians(data || []);
  };

  const handleLogout = () => { sessionStorage.removeItem('technician'); navigate('/'); };

  const handleResyncAll = async () => {
    if (!confirm('Sync all HubSpot contacts? This may take a minute.')) return;
    setResyncing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resync-all-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      const data = await res.json();
      res.ok ? toast.success(`Synced ${data.synced} contacts`) : toast.error(data.error || 'Resync failed');
    } catch { toast.error('Resync failed'); }
    finally { setResyncing(false); }
  };

  const handleSyncClient = async () => {
    const email = syncEmail.trim().toLowerCase();
    if (!email) return;
    setSyncing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-single-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { toast.success(`Synced ${data.contact?.name || email}`); setShowSyncModal(false); setSyncEmail(''); }
      else toast.error(data.error || 'Sync failed');
    } catch { toast.error('Sync failed'); }
    finally { setSyncing(false); }
  };

  const onSubmit = async (data: TechnicianFormData) => {
    if (!isSuperAdmin) { toast.error('Only super-admin can manage users'); return; }
    try {
      const payload = { ...data, is_active: data.is_active ?? true };
      if (editingTechnician) {
        const { error } = await supabase.from('technicians').update(payload).eq('id', editingTechnician.id);
        if (error) throw error;
        toast.success('Technician updated');
      } else {
        const { error } = await supabase.from('technicians').insert([payload]);
        if (error) throw error;
        toast.success('Technician added');
      }
      setShowAddForm(false);
      setEditingTechnician(null);
      reset();
      fetchTechnicians();
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async (id: string) => {
    if (!isSuperAdmin) { toast.error('Only super-admin can delete users'); return; }
    if (!confirm('Delete this technician?')) return;
    const { error } = await supabase.from('technicians').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    fetchTechnicians();
  };

  const toggleActive = async (tech: Technician) => {
    if (!isSuperAdmin) { toast.error('Only super-admin can change user status'); return; }
    const { error } = await supabase.from('technicians').update({ is_active: !tech.is_active }).eq('id', tech.id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`${tech.first_name} marked ${tech.is_active ? 'inactive' : 'active'}`);
    fetchTechnicians();
  };

  const quickLinks = [
    { icon: <RefreshCw className={`w-5 h-5 text-green-600 ${resyncing ? 'animate-spin' : ''}`} />, iconBg: 'bg-green-50', title: 'Resync All HubSpot Contacts', desc: 'Pull all contacts from HubSpot', onClick: handleResyncAll, disabled: resyncing, label: resyncing ? 'Syncing…' : 'Resync', labelColor: 'text-green-600' },
    { icon: <Users className="w-5 h-5 text-brand-600" />, iconBg: 'bg-brand-50', title: 'Daily Team Assignments', desc: 'Assign clients to teams for the day', onClick: () => navigate('/team-assignments'), label: 'Open', labelColor: 'text-brand-600' },
    { icon: <Users className="w-5 h-5 text-blue-600" />, iconBg: 'bg-blue-50', title: 'Preset Teams', desc: 'Manage default team members and notes', onClick: () => navigate('/preset-teams'), label: 'Open', labelColor: 'text-blue-600' },
    { icon: <History className="w-5 h-5 text-amber-600" />, iconBg: 'bg-amber-50', title: 'Client Assignment History', desc: 'Search every past daily assignment', onClick: () => navigate('/client-history'), label: 'Open', labelColor: 'text-amber-600' },
    { icon: <ListTodo className="w-5 h-5 text-teal-600" />, iconBg: 'bg-teal-50', title: 'Task Manager', desc: 'To-dos, recurring tasks & email reminders', onClick: () => navigate('/tasks'), label: 'Open', labelColor: 'text-teal-600' },
  ];

  const activeTechs = technicians.filter(t => t.is_active);
  const inactiveTechs = technicians.filter(t => !t.is_active);

  return (
    <div className="page-shell">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="btn-icon">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="navbar-brand">
              <Waves className="w-5 h-5" />
              <span>Admin Panel</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSyncModal(true)} className="btn-primary btn-sm gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sync Client</span>
            </button>
            <button onClick={handleLogout} className="btn-icon ml-1"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </nav>

      <main className="page-content space-y-8">
        {/* Quick links */}
        <section>
          <p className="section-title">Quick Actions</p>
          <div className="space-y-2">
            {quickLinks.map(link => (
              <button
                key={link.title}
                onClick={link.onClick}
                disabled={(link as any).disabled}
                className="card w-full text-left px-4 py-3.5 flex items-center gap-3 hover:border-neutral-300 hover:shadow-card-md transition-all group disabled:opacity-60"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${link.iconBg}`}>
                  {link.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800">{link.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{link.desc}</p>
                </div>
                <span className={`text-xs font-semibold ${link.labelColor} shrink-0`}>{link.label} →</span>
              </button>
            ))}
          </div>
        </section>

        {/* Client Search */}
        <section>
          <p className="section-title">Client Search</p>
          <ClientSearch />
        </section>

        {/* Manage Technicians — super-admin only */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="section-title mb-0">Manage Technicians</p>
              {!isSuperAdmin && (
                <p className="text-xs text-neutral-400 mt-0.5">Only super-admin (002) can edit users</p>
              )}
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => { setEditingTechnician(null); setShowAddForm(!showAddForm); reset({ is_active: true }); }}
                className="btn-primary btn-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Technician
              </button>
            )}
          </div>

          {isSuperAdmin && (showAddForm || editingTechnician) && (
            <div className="card card-body mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="w-4 h-4 text-brand-600" />
                <h2 className="text-sm font-semibold text-neutral-800">
                  {editingTechnician ? 'Edit Technician' : 'New Technician'}
                </h2>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">First Name</label>
                    <input type="text" {...register('first_name')} className="form-input" />
                    {errors.first_name && <p className="form-error">{errors.first_name.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Last Name</label>
                    <input type="text" {...register('last_name')} className="form-input" />
                    {errors.last_name && <p className="form-error">{errors.last_name.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Staff ID</label>
                    <input type="text" {...register('staff_id')} className="form-input" />
                    {errors.staff_id && <p className="form-error">{errors.staff_id.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">PIN (4 digits)</label>
                    <input type="text" maxLength={4} inputMode="numeric" pattern="\d{4}" {...register('pin')} className="form-input font-mono tracking-widest" placeholder="0000" />
                    {errors.pin && <p className="form-error">{errors.pin.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Email <span className="text-neutral-400 font-normal">(for task reminders)</span></label>
                    <input type="email" {...register('email')} className="form-input" placeholder="name@example.com" />
                  </div>
                  <div>
                    <label className="form-label">Role</label>
                    <select {...register('role')} className="form-select">
                      <option value="">Select role…</option>
                      <option value="Admin">Admin</option>
                      <option value="Pool Tech Senior">Pool Tech Senior</option>
                      <option value="Assistant Pool Tech">Assistant Pool Tech</option>
                    </select>
                    {errors.role && <p className="form-error">{errors.role.message}</p>}
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <input type="checkbox" id="is_active" {...register('is_active')} className="w-4 h-4 accent-brand-600" defaultChecked />
                    <label htmlFor="is_active" className="text-sm font-medium text-neutral-700 cursor-pointer">Active (can sign in)</label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => { setShowAddForm(false); setEditingTechnician(null); reset(); }} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary">
                    {isSubmitting ? 'Saving…' : editingTechnician ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Active users */}
          <div className="table-wrapper mb-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Staff ID</th>
                  <th className="hidden sm:table-cell">Email</th>
                  <th className="hidden sm:table-cell">PIN</th>
                  <th>Role</th>
                  {isSuperAdmin && <th>Status</th>}
                  {isSuperAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {activeTechs.map(tech => (
                  <tr key={tech.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                          {tech.first_name[0]}{tech.last_name[0]}
                        </div>
                        <span className="font-medium text-neutral-800">{tech.first_name} {tech.last_name}</span>
                      </div>
                    </td>
                    <td className="text-neutral-500 font-mono text-xs">{tech.staff_id}</td>
                    <td className="hidden sm:table-cell text-xs text-neutral-600">{tech.email || <span className="text-neutral-300">—</span>}</td>
                    <td className="hidden sm:table-cell">
                      {isSuperAdmin && (
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-sm ${showPinFor === tech.id ? 'text-neutral-800' : 'text-neutral-300 tracking-widest'}`}>
                            {showPinFor === tech.id ? tech.pin : '••••'}
                          </span>
                          <button
                            onClick={() => setShowPinFor(showPinFor === tech.id ? null : tech.id)}
                            className="btn-icon w-6 h-6 text-neutral-400 hover:text-neutral-600"
                          >
                            {showPinFor === tech.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={roleColors[tech.role] || 'badge-gray'}>{tech.role === 'Pool Tech Senior' ? 'Senior' : tech.role === 'Assistant Pool Tech' ? 'Assistant' : tech.role}</span>
                    </td>
                    {isSuperAdmin && (
                      <td>
                        <button onClick={() => toggleActive(tech)} title="Deactivate user" className="flex items-center gap-1 text-xs text-green-700 font-medium hover:text-red-600 transition-colors">
                          <ToggleRight className="w-4 h-4" /> Active
                        </button>
                      </td>
                    )}
                    {isSuperAdmin && (
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingTechnician(tech); setShowAddForm(true); reset({ ...tech }); }}
                            className="btn-icon w-8 h-8 text-neutral-400 hover:text-brand-600"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(tech.id)} className="btn-icon w-8 h-8 text-neutral-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Inactive users */}
          {inactiveTechs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Inactive Users</p>
              <div className="table-wrapper opacity-60">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Staff ID</th>
                      <th>Role</th>
                      {isSuperAdmin && <th>Status</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveTechs.map(tech => (
                      <tr key={tech.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-400 shrink-0">
                              {tech.first_name[0]}{tech.last_name[0]}
                            </div>
                            <span className="font-medium text-neutral-500">{tech.first_name} {tech.last_name}</span>
                          </div>
                        </td>
                        <td className="text-neutral-400 font-mono text-xs">{tech.staff_id}</td>
                        <td className="text-xs text-neutral-400">{tech.email || '—'}</td>
                        <td><span className="badge-gray">{tech.role}</span></td>
                        {isSuperAdmin && (
                          <td>
                            <button onClick={() => toggleActive(tech)} title="Re-activate user" className="flex items-center gap-1 text-xs text-neutral-500 font-medium hover:text-green-700 transition-colors">
                              <ToggleLeft className="w-4 h-4" /> Inactive
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>

      {showSyncModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card card-body w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-brand-600" />
                </div>
                <h2 className="text-sm font-semibold text-neutral-800">Sync Client from HubSpot</h2>
              </div>
              <button onClick={() => { setShowSyncModal(false); setSyncEmail(''); }} className="btn-icon">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-neutral-500 mb-4">Enter the client's email to pull their latest data from HubSpot.</p>
            <input
              type="email"
              value={syncEmail}
              onChange={e => setSyncEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !syncing && handleSyncClient()}
              placeholder="client@example.com"
              autoFocus
              className="form-input mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowSyncModal(false); setSyncEmail(''); }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSyncClient} disabled={syncing || !syncEmail.trim()} className="btn-primary flex-1">
                {syncing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing…</> : <><UserCheck className="w-3.5 h-3.5" /> Sync</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
