import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Users, X, StickyNote, Pencil, Save, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const TEAMS = ['PRINCESSDAVID', 'TONYVAN', 'JARVISVAN', 'SONIC'] as const;
type Team = typeof TEAMS[number];

const TEAM_COLORS: Record<Team, { bg: string; border: string; header: string; light: string }> = {
  PRINCESSDAVID: { bg: 'bg-sky-50', border: 'border-sky-200', header: 'bg-sky-600', light: 'bg-sky-100' },
  TONYVAN:       { bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'bg-emerald-600', light: 'bg-emerald-100' },
  JARVISVAN:     { bg: 'bg-amber-50', border: 'border-amber-200', header: 'bg-amber-600', light: 'bg-amber-100' },
  SONIC:         { bg: 'bg-rose-50', border: 'border-rose-200', header: 'bg-rose-600', light: 'bg-rose-100' },
};

interface Technician {
  id: string;
  staff_id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface PresetMember {
  id: string;
  team: Team;
  staff_id: string;
  technician?: Technician;
}

interface TeamNote {
  id: string;
  team: Team;
  staff_id: string;
  note: string;
  updated_at: string;
  author?: Technician;
}

/* ── Add Member Modal ─────────────────────────────────────────── */

function AddMemberModal({ team, technicians, existingIds, onAdd, onClose }: {
  team: Team;
  technicians: Technician[];
  existingIds: string[];
  onAdd: (t: Technician) => void;
  onClose: () => void;
}) {
  const available = technicians.filter(t => !existingIds.includes(t.staff_id));
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-3 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold text-neutral-900">Add member to {team}</div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {available.length === 0 && (
            <div className="px-4 py-6 text-center text-neutral-400 text-sm">All technicians already assigned</div>
          )}
          {available.map(t => (
            <button key={t.staff_id} onClick={() => onAdd(t)}
              className="w-full px-4 py-3 text-left hover:bg-neutral-50 border-b last:border-b-0 transition-colors">
              <div className="text-sm font-medium text-neutral-900">{t.first_name} {t.last_name}</div>
              <div className="text-xs text-neutral-500">{t.staff_id} · {t.role}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Note editor inline ───────────────────────────────────────── */

function NoteEditor({ note, onSave, editable }: {
  note: TeamNote | undefined;
  onSave: (text: string) => void;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.note || '');
  const current = note?.note || '';

  const startEdit = () => { setDraft(current); setEditing(true); };
  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(current); setEditing(false); };

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          className="w-full text-sm rounded-md border border-neutral-300 p-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
          placeholder="Add your notes for this team..."
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={save}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700">
            <Check className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={cancel}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-50">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!editable && !current) return null;

  return (
    <div className={`rounded-lg p-3 ${current ? 'bg-yellow-50 border border-yellow-200' : 'bg-neutral-50 border border-dashed border-neutral-200'}`}>
      {current ? (
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-neutral-700 whitespace-pre-wrap flex-1">{current}</p>
          {editable && (
            <button onClick={startEdit} className="text-neutral-400 hover:text-neutral-600 shrink-0 p-0.5">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        editable && (
          <button onClick={startEdit} className="text-sm text-neutral-400 hover:text-neutral-600 flex items-center gap-1.5">
            <StickyNote className="w-4 h-4" /> Add your notes for this team...
          </button>
        )
      )}
    </div>
  );
}

/* ── Team Card ────────────────────────────────────────────────── */

function TeamCard({ team, members, technicians, notes, myStaffId, canManageMembers, canViewAllNotes, onAddMember, onRemoveMember, onSaveNote }: {
  team: Team;
  members: PresetMember[];
  technicians: Technician[];
  notes: TeamNote[];
  myStaffId: string;
  canManageMembers: boolean;
  canViewAllNotes: boolean;
  onAddMember: () => void;
  onRemoveMember: (staffId: string) => void;
  onSaveNote: (team: Team, staffId: string, text: string) => void;
}) {
  const colors = TEAM_COLORS[team];
  const myNote = notes.find(n => n.team === team && n.staff_id === myStaffId);

  // Who is "me" on this team?
  const iAmOnThisTeam = members.some(m => m.staff_id === myStaffId);

  return (
    <div className={`rounded-xl border ${colors.border} overflow-hidden shadow-sm`}>
      {/* Header */}
      <div className={`${colors.header} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm tracking-wide">{team}</span>
          <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{members.length} members</span>
        </div>
        {canManageMembers && (
          <button onClick={onAddMember}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Member
          </button>
        )}
      </div>

      {/* Members list */}
      <div className={`${colors.light} px-4 py-3 border-b ${colors.border}`}>
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Team Members</div>
        {members.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">No members assigned</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map(m => m.technician && (
              <div key={m.staff_id}
                className="inline-flex items-center gap-1.5 bg-white rounded-full pl-3 pr-2 py-1 text-sm font-medium text-neutral-700 border border-neutral-200 shadow-sm">
                <span>{m.technician.first_name} {m.technician.last_name}</span>
                <span className="text-xs text-neutral-400">{m.technician.role === 'Pool Tech Senior' ? 'Senior' : m.technician.role === 'Admin' ? 'Admin' : 'Asst.'}</span>
                {canManageMembers && (
                  <button onClick={() => onRemoveMember(m.staff_id)}
                    className="text-neutral-300 hover:text-red-500 transition-colors ml-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className={`${colors.bg} px-4 py-3 space-y-3`}>
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5" /> Notes
        </div>

        {/* My own note (always visible if I'm on this team or can see all) */}
        {(iAmOnThisTeam || canViewAllNotes) && (
          <div>
            <div className="text-xs text-neutral-400 mb-1">Your note</div>
            <NoteEditor
              note={myNote}
              onSave={text => onSaveNote(team, myStaffId, text)}
              editable={true}
            />
          </div>
        )}

        {/* Other members' notes (admins/seniors only) */}
        {canViewAllNotes && notes.filter(n => n.team === team && n.staff_id !== myStaffId && n.note).map(n => (
          <div key={n.staff_id}>
            <div className="text-xs text-neutral-400 mb-1">
              {n.author ? `${n.author.first_name} ${n.author.last_name}` : n.staff_id}
            </div>
            <NoteEditor
              note={n}
              onSave={text => onSaveNote(team, n.staff_id, text)}
              editable={canViewAllNotes}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */

export default function PresetTeams() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<PresetMember[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTarget, setAddTarget] = useState<Team | null>(null);

  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');
  const isAdmin = technician.role === 'Admin';
  const isSenior = technician.role === 'Pool Tech Senior';
  const canManageMembers = isAdmin;
  const canViewAllNotes = isAdmin || isSenior;

  // Which teams to show:
  // - Admin/Senior see all teams
  // - Assistants see only teams they are on
  const myStaffId: string = technician.staff_id || technician.id || '';

  const visibleTeams: Team[] = (() => {
    if (canViewAllNotes) return [...TEAMS];
    const myTeams = members.filter(m => m.staff_id === myStaffId).map(m => m.team);
    return myTeams.length > 0 ? myTeams : [];
  })();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadMembers(), loadTechnicians(), loadNotes()]);
    setLoading(false);
  };

  const loadTechnicians = async () => {
    const { data } = await supabase.from('technicians').select('id,staff_id,first_name,last_name,role');
    setTechnicians(data || []);
  };

  const loadMembers = async () => {
    const { data: rows } = await supabase.from('team_members').select('*').order('team');
    if (!rows) { setMembers([]); return; }
    const staffIds = [...new Set(rows.map((r: PresetMember) => r.staff_id))];
    if (staffIds.length === 0) { setMembers([]); return; }
    const { data: techs } = await supabase.from('technicians').select('id,staff_id,first_name,last_name,role').in('staff_id', staffIds);
    const techMap: Record<string, Technician> = {};
    (techs || []).forEach((t: Technician) => { techMap[t.staff_id] = t; });
    setMembers(rows.map((r: PresetMember) => ({ ...r, technician: techMap[r.staff_id] })));
  };

  const loadNotes = async () => {
    const { data: rows } = await supabase.from('team_notes').select('*');
    if (!rows) { setNotes([]); return; }
    const staffIds = [...new Set(rows.map((r: TeamNote) => r.staff_id))];
    if (staffIds.length === 0) { setNotes([]); return; }
    const { data: techs } = await supabase.from('technicians').select('id,staff_id,first_name,last_name,role').in('staff_id', staffIds);
    const techMap: Record<string, Technician> = {};
    (techs || []).forEach((t: Technician) => { techMap[t.staff_id] = t; });
    setNotes(rows.map((r: TeamNote) => ({ ...r, author: techMap[r.staff_id] })));
  };

  const addMember = async (team: Team, tech: Technician) => {
    if (!canManageMembers) return;
    const { error } = await supabase.from('team_members').insert({ team, staff_id: tech.staff_id });
    if (error) { toast.error('Failed to add member'); return; }
    setMembers(prev => [...prev, { id: '', team, staff_id: tech.staff_id, technician: tech }]);
    setAddTarget(null);
    toast.success(`${tech.first_name} added to ${team}`);
  };

  const removeMember = async (staffId: string, team: Team) => {
    if (!canManageMembers) return;
    await supabase.from('team_members').delete().eq('staff_id', staffId).eq('team', team);
    setMembers(prev => prev.filter(m => !(m.staff_id === staffId && m.team === team)));
    toast.success('Member removed');
  };

  const saveNote = async (team: Team, staffId: string, text: string) => {
    const existing = notes.find(n => n.team === team && n.staff_id === staffId);
    if (existing) {
      const { error } = await supabase.from('team_notes')
        .update({ note: text, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) { toast.error('Failed to save note'); return; }
      setNotes(prev => prev.map(n => n.id === existing.id ? { ...n, note: text } : n));
    } else {
      const { data, error } = await supabase.from('team_notes')
        .insert({ team, staff_id: staffId, note: text })
        .select().single();
      if (error) { toast.error('Failed to save note'); return; }
      const authorTech = technicians.find(t => t.staff_id === staffId);
      setNotes(prev => [...prev, { ...data, author: authorTech }]);
    }
    toast.success('Note saved');
  };

  const backPath = isAdmin ? '/admin' : '/dashboard';

  return (
    <div className="page-shell">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="flex items-center h-14 gap-3">
            <button onClick={() => navigate(backPath)} className="flex items-center text-neutral-600 hover:text-neutral-900 shrink-0">
              <ArrowLeft className="w-5 h-5" /><span className="hidden sm:inline ml-1">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600 shrink-0" />
              <span className="text-base sm:text-lg font-semibold text-neutral-900">Preset Teams</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="page-content">
        <p className="text-sm text-neutral-500 mb-5">
          Preset teams are the default members assigned to each team every day. You can override membership for individual days in the Daily Team Assignments screen.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-neutral-400">Loading...</div>
        ) : visibleTeams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <Users className="w-12 h-12 mb-3 opacity-40" />
            <span className="text-base font-medium text-neutral-500">You are not assigned to any preset team</span>
            <span className="text-sm mt-1">Contact an admin to be added to a team</span>
          </div>
        ) : (
          <div className={`grid gap-5 ${visibleTeams.length === 1 ? 'grid-cols-1 max-w-xl' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {visibleTeams.map(team => (
              <TeamCard
                key={team}
                team={team}
                members={members.filter(m => m.team === team)}
                technicians={technicians}
                notes={notes.filter(n => n.team === team)}
                myStaffId={myStaffId}
                canManageMembers={canManageMembers}
                canViewAllNotes={canViewAllNotes}
                onAddMember={() => setAddTarget(team)}
                onRemoveMember={staffId => removeMember(staffId, team)}
                onSaveNote={saveNote}
              />
            ))}
          </div>
        )}
      </main>

      {addTarget && (
        <AddMemberModal
          team={addTarget}
          technicians={technicians}
          existingIds={members.filter(m => m.team === addTarget).map(m => m.staff_id)}
          onAdd={tech => addMember(addTarget, tech)}
          onClose={() => setAddTarget(null)}
        />
      )}
    </div>
  );
}
