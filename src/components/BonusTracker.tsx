import React, { useEffect, useState, useCallback } from 'react';
import { Star, Trophy, TrendingUp, Plus, Trash2, X, Sparkles, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const SUPER_ADMIN_ID = '002';
const BONUS_GOAL = 300;
const NO_PIC_AMOUNT = 5;
const WITH_PIC_AMOUNT = 20;

interface BonusEntry {
  id: string;
  technician_id: string;
  reviewer_name: string | null;
  review_type: 'no_picture' | 'with_picture';
  amount: number;
  bonus_date: string;
  notes: string | null;
  created_at: string;
}

interface TechBonus {
  technician_id: string;
  first_name: string;
  last_name: string;
  staff_id: string;
  role: string;
  total: number;
  entries: BonusEntry[];
}

interface Props {
  isSuperAdmin: boolean;
  currentTechId?: string;
  embedded?: boolean;
}

export default function BonusTracker({ isSuperAdmin, currentTechId, embedded }: Props) {
  const [techBonuses, setTechBonuses] = useState<TechBonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTechId, setAddTechId] = useState('');
  const [addReviewer, setAddReviewer] = useState('');
  const [addType, setAddType] = useState<'no_picture' | 'with_picture'>('no_picture');
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));
  const [addNotes, setAddNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBonuses = useCallback(async () => {
    setLoading(true);
    try {
      const [techRes, bonusRes] = await Promise.all([
        supabase.from('technicians').select('id, first_name, last_name, staff_id, role, is_active').order('is_active', { ascending: false }).order('last_name'),
        supabase.from('review_bonus_entries').select('*').order('bonus_date', { ascending: false }),
      ]);
      if (techRes.error) throw techRes.error;
      if (bonusRes.error) throw bonusRes.error;

      const techs = (techRes.data || []).filter((t: any) => t.is_active);
      const bonuses = bonusRes.data || [];

      const combined: TechBonus[] = techs.map((t: any) => {
        const entries = bonuses.filter((b: BonusEntry) => b.technician_id === t.id);
        const total = entries.reduce((sum: number, e: BonusEntry) => sum + Number(e.amount), 0);
        return {
          technician_id: t.id,
          first_name: t.first_name,
          last_name: t.last_name,
          staff_id: t.staff_id,
          role: t.role,
          total,
          entries,
        };
      });
      combined.sort((a, b) => b.total - a.total);
      setTechBonuses(combined);
    } catch {
      toast.error('Failed to load bonus data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBonuses(); }, [fetchBonuses]);

  const handleAdd = async () => {
    if (!addTechId) { toast.error('Select a technician'); return; }
    setSaving(true);
    try {
      const amount = addType === 'with_picture' ? WITH_PIC_AMOUNT : NO_PIC_AMOUNT;
      const { error } = await supabase.from('review_bonus_entries').insert({
        technician_id: addTechId,
        reviewer_name: addReviewer.trim() || null,
        review_type: addType,
        amount,
        bonus_date: addDate,
        notes: addNotes.trim() || null,
        created_by: SUPER_ADMIN_ID,
      });
      if (error) throw error;
      toast.success(`$${amount} bonus added`);
      setShowAddModal(false);
      setAddReviewer(''); setAddNotes(''); setAddType('no_picture');
      fetchBonuses();
    } catch { toast.error('Failed to add bonus'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this bonus entry?')) return;
    const { error } = await supabase.from('review_bonus_entries').delete().eq('id', id);
    if (error) { toast.error('Failed to remove'); return; }
    toast.success('Removed');
    fetchBonuses();
  };

  const myBonus = currentTechId ? techBonuses.find(t => t.technician_id === currentTechId) : null;
  const maxTotal = Math.max(...techBonuses.map(t => t.total), 1);
  const sortedLeaderboard = [...techBonuses].sort((a, b) => b.total - a.total);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'space-y-6'}>
      {/* Hero: My progress (or admin overview) */}
      {!isSuperAdmin && myBonus && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-lg">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -bottom-12 -left-4 w-40 h-40 rounded-full bg-white/10 blur-xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium text-white/90">Your Review Bonus Progress</span>
            </div>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-4xl font-bold tracking-tight">${myBonus.total}</span>
              <span className="text-lg text-white/80 mb-1">/ ${BONUS_GOAL}</span>
            </div>
            {/* Progress bar */}
            <div className="h-4 bg-white/25 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-white rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
                style={{ width: `${Math.min((myBonus.total / BONUS_GOAL) * 100, 100)}%` }}
              >
                {myBonus.total > 0 && (
                  <span className="text-[10px] font-bold text-orange-600">{Math.round((myBonus.total / BONUS_GOAL) * 100)}%</span>
                )}
              </div>
            </div>
            <p className="text-sm text-white/85">
              {myBonus.total >= BONUS_GOAL
                ? 'Goal reached! Amazing work this season.'
                : `$${BONUS_GOAL - myBonus.total} to go — ask every client for a Google review!`}
            </p>
            <div className="flex gap-4 mt-3 text-xs text-white/80">
              <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Review = ${NO_PIC_AMOUNT}</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3" /> + Photo = ${WITH_PIC_AMOUNT}</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin: quick stats */}
      {isSuperAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Bonuses', value: `$${techBonuses.reduce((s, t) => s + t.total, 0)}`, icon: <TrendingUp className="w-4 h-4" />, color: 'text-brand-600 bg-brand-50' },
            { label: 'Top Earner', value: sortedLeaderboard[0] ? `$${sortedLeaderboard[0].total}` : '$0', icon: <Trophy className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
            { label: 'Active Techs', value: techBonuses.length, icon: <Award className="w-4 h-4" />, color: 'text-teal-600 bg-teal-50' },
            { label: 'Goal / Tech', value: `$${BONUS_GOAL}`, icon: <Sparkles className="w-4 h-4" />, color: 'text-rose-600 bg-rose-50' },
          ].map(s => (
            <div key={s.label} className="card card-body !p-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${s.color}`}>{s.icon}</div>
              <p className="text-lg font-bold text-neutral-900">{s.value}</p>
              <p className="text-[11px] text-neutral-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-neutral-800">Leaderboard — Total Bonus Earned</h3>
          </div>
          {isSuperAdmin && (
            <button onClick={() => { setAddTechId(''); setShowAddModal(true); }} className="btn-primary btn-sm gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Bonus
            </button>
          )}
        </div>

        <div className="space-y-2">
          {sortedLeaderboard.map((tech, idx) => {
            const isMe = currentTechId === tech.technician_id;
            const pct = Math.min((tech.total / BONUS_GOAL) * 100, 100);
            const medal = idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-neutral-200 text-neutral-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-neutral-100 text-neutral-400';
            return (
              <div key={tech.technician_id} className={`card card-body !p-3.5 ${isMe ? 'ring-2 ring-brand-400' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${medal}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-800 truncate">
                        {tech.first_name} {tech.last_name}
                      </span>
                      {isMe && <span className="badge-teal text-[10px]">You</span>}
                      <span className="text-[11px] text-neutral-400">{tech.role === 'Pool Tech Senior' ? 'Senior' : tech.role === 'Assistant Pool Tech' ? 'Assistant' : tech.role}</span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-1.5 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-brand-500'}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold text-neutral-900">${tech.total}</span>
                    <p className="text-[10px] text-neutral-400">{tech.entries.length} review{tech.entries.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add bonus modal */}
      {showAddModal && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card card-body w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Star className="w-4 h-4 text-amber-500" />
                </div>
                <h2 className="text-sm font-semibold text-neutral-800">Add Review Bonus</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Technician</label>
                <select value={addTechId} onChange={e => setAddTechId(e.target.value)} className="form-select">
                  <option value="">Select…</option>
                  {techBonuses.map(t => (
                    <option key={t.technician_id} value={t.technician_id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Review Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAddType('no_picture')}
                    className={`rounded-lg border p-3 text-left transition-all ${addType === 'no_picture' ? 'border-brand-500 bg-brand-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-sm font-semibold text-neutral-800">No Picture</span>
                    </div>
                    <span className="text-xs text-neutral-500">${NO_PIC_AMOUNT} per review</span>
                  </button>
                  <button
                    onClick={() => setAddType('with_picture')}
                    className={`rounded-lg border p-3 text-left transition-all ${addType === 'with_picture' ? 'border-brand-500 bg-brand-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      <span className="text-sm font-semibold text-neutral-800">Picture + Text</span>
                    </div>
                    <span className="text-xs text-neutral-500">${WITH_PIC_AMOUNT} per review</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Reviewer Name</label>
                  <input type="text" value={addReviewer} onChange={e => setAddReviewer(e.target.value)} className="form-input" placeholder="Client name" />
                </div>
                <div>
                  <label className="form-label">Date</label>
                  <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} className="form-input" />
                </div>
              </div>
              <div>
                <label className="form-label">Notes <span className="text-neutral-400 font-normal">(optional)</span></label>
                <input type="text" value={addNotes} onChange={e => setAddNotes(e.target.value)} className="form-input" placeholder="Link to review, etc." />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !addTechId} className="btn-primary flex-1">
                {saving ? 'Saving…' : `Add $${addType === 'with_picture' ? WITH_PIC_AMOUNT : NO_PIC_AMOUNT} Bonus`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entry log (super-admin only) */}
      {isSuperAdmin && techBonuses.some(t => t.entries.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 mb-3">Recent Entries</h3>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {techBonuses
              .flatMap(t => t.entries.map(e => ({ ...e, techName: `${t.first_name} ${t.last_name}` })))
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 30)
              .map(entry => (
                <div key={entry.id} className="flex items-center gap-3 bg-white rounded-lg border border-neutral-200 px-3 py-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${entry.review_type === 'with_picture' ? 'bg-amber-50' : 'bg-neutral-50'}`}>
                    <Star className={`w-3.5 h-3.5 ${entry.review_type === 'with_picture' ? 'text-amber-500 fill-amber-400' : 'text-neutral-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">
                      {entry.techName}
                      {entry.reviewer_name && <span className="text-neutral-500 font-normal"> — {entry.reviewer_name}</span>}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {entry.review_type === 'with_picture' ? 'Picture + Text' : 'No Picture'} · {entry.bonus_date}
                      {entry.notes && ` · ${entry.notes}`}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-neutral-900 shrink-0">${entry.amount}</span>
                  <button onClick={() => handleDelete(entry.id)} className="btn-icon w-7 h-7 text-neutral-300 hover:text-red-500 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
