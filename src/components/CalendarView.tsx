import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ArrowLeft, Calendar, CheckCircle2,
  XCircle, Clock, RefreshCw, ChevronDown, ChevronUp, Trash2, MoveRight, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { TeamDailyAssignment } from '../types';

const TEAMS = ['PRINCESSDAVID', 'TONYVAN', 'JARVISVAN', 'SONIC', 'Unallocated'] as const;
type TeamKey = typeof TEAMS[number];

const TEAM_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; header: string }> = {
  PRINCESSDAVID: { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-500',    header: 'bg-blue-600' },
  TONYVAN:       { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', header: 'bg-emerald-600' },
  JARVISVAN:     { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500',   header: 'bg-amber-600' },
  SONIC:         { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    dot: 'bg-rose-500',    header: 'bg-rose-600' },
  Unallocated:   { bg: 'bg-neutral-50', border: 'border-neutral-200', text: 'text-neutral-600', dot: 'bg-neutral-400', header: 'bg-neutral-500' },
};

const SERVICE_COLORS: Record<string, string> = {
  'Pool Opening':    'bg-cyan-100 text-cyan-800',
  'Pool Closing':    'bg-orange-100 text-orange-800',
  'Pool Maintenance':'bg-green-100 text-green-800',
  'Swim Ready':      'bg-blue-100 text-blue-800',
  'Service Call':    'bg-red-100 text-red-800',
};

function getServiceColor(type: string) { return SERVICE_COLORS[type] || 'bg-neutral-100 text-neutral-700'; }
function formatDate(d: Date) { return d.toISOString().split('T')[0]; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isToday(d: Date) { return isSameDay(d, new Date()); }

type ViewMode = 'month' | 'week' | 'day';
interface DragState { assignmentId: string; sourceDate: string; sourceTeam: string | null; }

export default function CalendarView() {
  const navigate = useNavigate();
  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');
  const isAdmin = technician.role === 'Admin';

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assignments, setAssignments] = useState<TeamDailyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<TeamDailyAssignment | null>(null);
  const [moveModal, setMoveModal] = useState<{ assignment: TeamDailyAssignment } | null>(null);
  const [moveDate, setMoveDate] = useState('');
  const [moveTeam, setMoveTeam] = useState('');

  const fetchRange = useCallback(async () => {
    setLoading(true);
    let start: Date, end: Date;
    if (viewMode === 'month') { start = startOfMonth(currentDate); start = addDays(start, -start.getDay()); end = addDays(start, 41); }
    else if (viewMode === 'week') { start = startOfWeek(currentDate); end = addDays(start, 6); }
    else { start = currentDate; end = currentDate; }
    const { data, error } = await supabase.from('team_daily_assignments').select('*')
      .gte('assignment_date', formatDate(start)).lte('assignment_date', formatDate(end))
      .order('sort_order', { ascending: true });
    if (error) toast.error('Failed to load assignments');
    else setAssignments(data || []);
    setLoading(false);
  }, [viewMode, currentDate]);

  useEffect(() => { fetchRange(); }, [fetchRange]);

  function navDate(dir: -1 | 1) {
    setCurrentDate(prev => {
      if (viewMode === 'month') return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
      if (viewMode === 'week') return addDays(prev, dir * 7);
      return addDays(prev, dir);
    });
  }

  function getAssignmentsForDate(ds: string) { return assignments.filter(a => a.assignment_date === ds); }

  async function handleDeleteAssignment(id: string) {
    if (!window.confirm('Delete this assignment?')) return;
    const { error } = await supabase.from('team_daily_assignments').delete().eq('id', id);
    if (error) toast.error('Delete failed');
    else { toast.success('Deleted'); fetchRange(); }
  }

  async function handleMoveAssignment() {
    if (!moveModal || !moveDate) return;
    const teamVal = moveTeam || moveModal.assignment.team;
    const { error } = await supabase.from('team_daily_assignments')
      .update({ assignment_date: moveDate, team: teamVal, updated_at: new Date().toISOString() })
      .eq('id', moveModal.assignment.id);
    if (error) toast.error('Move failed');
    else { toast.success('Assignment moved'); setMoveModal(null); fetchRange(); }
  }

  async function handleDropOnDate(targetDateStr: string) {
    if (!dragState || dragState.sourceDate === targetDateStr) { setDragState(null); setDragOverDate(null); return; }
    const { error } = await supabase.from('team_daily_assignments')
      .update({ assignment_date: targetDateStr, updated_at: new Date().toISOString() })
      .eq('id', dragState.assignmentId);
    if (error) toast.error('Move failed');
    else { toast.success('Assignment moved'); fetchRange(); }
    setDragState(null);
    setDragOverDate(null);
  }

  async function toggleCompleted(a: TeamDailyAssignment) {
    const { error } = await supabase.from('team_daily_assignments')
      .update({ completed: !a.completed, updated_at: new Date().toISOString() })
      .eq('id', a.id);
    if (error) toast.error('Update failed');
    else fetchRange();
  }

  function headerLabel() {
    if (viewMode === 'month') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (viewMode === 'week') {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 6);
      return `${ws.toLocaleDateString('default', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function renderMonthGrid() {
    const gridStart = startOfMonth(currentDate);
    const startDay = startOfWeek(gridStart);
    const days: Date[] = Array.from({ length: 42 }, (_, i) => addDays(startDay, i));
    const inMonth = (d: Date) => d.getMonth() === currentDate.getMonth();
    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-l border-t border-neutral-200">
          {WEEKDAYS.map(d => (
            <div key={d} className="border-r border-b border-neutral-200 bg-neutral-50 py-2 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wide">{d}</div>
          ))}
          {days.map((day, i) => {
            const ds = formatDate(day);
            const dayAssignments = getAssignmentsForDate(ds);
            const isCurrentMonth = inMonth(day);
            const isExpanded = expandedDay === ds;
            const isDragOver = dragOverDate === ds;
            const today = isToday(day);
            return (
              <div key={i}
                className={`border-r border-b border-neutral-200 min-h-[100px] p-1 transition-colors cursor-pointer
                  ${!isCurrentMonth ? 'bg-neutral-50' : 'bg-white hover:bg-brand-50/20'}
                  ${isDragOver ? 'bg-brand-100 ring-2 ring-inset ring-brand-400' : ''}
                `}
                onClick={() => setExpandedDay(isExpanded ? null : ds)}
                onDragOver={e => { e.preventDefault(); setDragOverDate(ds); }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={() => handleDropOnDate(ds)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                    ${today ? 'bg-brand-600 text-white' : isCurrentMonth ? 'text-neutral-700' : 'text-neutral-300'}
                  `}>{day.getDate()}</span>
                  {dayAssignments.length > 0 && <span className="text-xs text-neutral-400">{dayAssignments.length}</span>}
                </div>
                <div className="space-y-0.5">
                  {(isExpanded ? dayAssignments : dayAssignments.slice(0, 3)).map(a => (
                    <AssignmentPill key={a.id} assignment={a} isAdmin={isAdmin}
                      onDragStart={() => setDragState({ assignmentId: a.id, sourceDate: a.assignment_date, sourceTeam: a.team })}
                      onDragEnd={() => { setDragState(null); setDragOverDate(null); }}
                      onDelete={() => handleDeleteAssignment(a.id)}
                      onMove={() => { setMoveModal({ assignment: a }); setMoveDate(a.assignment_date); setMoveTeam(a.team || ''); }}
                      onToggle={() => toggleCompleted(a)}
                      onClick={e => e.stopPropagation()}
                    />
                  ))}
                  {!isExpanded && dayAssignments.length > 3 && (
                    <button className="text-xs text-brand-600 hover:underline w-full text-left pl-1"
                      onClick={e => { e.stopPropagation(); setExpandedDay(ds); }}>
                      +{dayAssignments.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderWeekView() {
    const ws = startOfWeek(currentDate);
    const days: Date[] = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-l border-t border-neutral-200 h-full">
          {days.map((day, i) => {
            const ds = formatDate(day);
            const dayAssignments = getAssignmentsForDate(ds);
            const today = isToday(day);
            const isDragOver = dragOverDate === ds;
            return (
              <div key={i}
                className={`border-r border-b border-neutral-200 flex flex-col transition-colors ${today ? 'bg-brand-50/30' : 'bg-white'} ${isDragOver ? 'bg-brand-100 ring-2 ring-inset ring-brand-400' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOverDate(ds); }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={() => handleDropOnDate(ds)}
              >
                <div className={`sticky top-0 z-10 py-2 px-1 text-center border-b border-neutral-200 ${today ? 'bg-brand-50' : 'bg-neutral-50'}`}>
                  <div className="text-xs font-semibold text-neutral-500 uppercase">{day.toLocaleString('default', { weekday: 'short' })}</div>
                  <div className={`text-lg font-bold mt-0.5 w-8 h-8 flex items-center justify-center rounded-full mx-auto ${today ? 'bg-brand-600 text-white' : 'text-neutral-800'}`}>{day.getDate()}</div>
                </div>
                <div className="flex-1 p-1 space-y-1 overflow-auto">
                  {dayAssignments.map(a => (
                    <AssignmentCard key={a.id} assignment={a} isAdmin={isAdmin}
                      onDragStart={() => setDragState({ assignmentId: a.id, sourceDate: a.assignment_date, sourceTeam: a.team })}
                      onDragEnd={() => { setDragState(null); setDragOverDate(null); }}
                      onDelete={() => handleDeleteAssignment(a.id)}
                      onMove={() => { setMoveModal({ assignment: a }); setMoveDate(a.assignment_date); setMoveTeam(a.team || ''); }}
                      onToggle={() => toggleCompleted(a)}
                      onEdit={() => setEditingAssignment(a)}
                      navigate_={navigate}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderDayView() {
    const ds = formatDate(currentDate);
    const dayAssignments = getAssignmentsForDate(ds);
    const byTeam: Record<string, TeamDailyAssignment[]> = {};
    dayAssignments.forEach(a => { const t = a.team || 'Unallocated'; if (!byTeam[t]) byTeam[t] = []; byTeam[t].push(a); });
    return (
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {(Object.keys(TEAM_COLORS) as TeamKey[]).map(team => {
            const teamAssignments = byTeam[team] || [];
            const colors = TEAM_COLORS[team];
            return (
              <div key={team} className={`rounded-xl border ${colors.border} overflow-hidden flex flex-col`}>
                <div className={`${colors.header} px-3 py-2 flex items-center justify-between`}>
                  <span className="text-white text-sm font-semibold">{team}</span>
                  <span className="text-white/80 text-xs">{teamAssignments.length} jobs</span>
                </div>
                <div className={`flex-1 ${colors.bg} p-2 space-y-2 min-h-[200px]`}>
                  {teamAssignments.length === 0 && <p className="text-xs text-neutral-400 text-center mt-4">No assignments</p>}
                  {teamAssignments.map(a => (
                    <AssignmentCard key={a.id} assignment={a} isAdmin={isAdmin}
                      onDragStart={() => setDragState({ assignmentId: a.id, sourceDate: a.assignment_date, sourceTeam: a.team })}
                      onDragEnd={() => { setDragState(null); setDragOverDate(null); }}
                      onDelete={() => handleDeleteAssignment(a.id)}
                      onMove={() => { setMoveModal({ assignment: a }); setMoveDate(a.assignment_date); setMoveTeam(a.team || ''); }}
                      onToggle={() => toggleCompleted(a)}
                      onEdit={() => setEditingAssignment(a)}
                      navigate_={navigate}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const totalAssignments = assignments.length;
  const completedCount = assignments.filter(a => a.completed).length;

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <header className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-card">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="btn-icon"><ArrowLeft className="w-4 h-4" /></button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            <span className="font-semibold text-neutral-900 hidden sm:block">Assignment Calendar</span>
          </div>
        </div>

        <div className="flex bg-neutral-100 rounded-lg p-0.5 text-sm">
          {(['month', 'week', 'day'] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 rounded-md capitalize font-medium transition ${viewMode === m ? 'bg-white text-brand-600 shadow-card-md' : 'text-neutral-600 hover:text-neutral-800'}`}>
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date())} className="btn-secondary btn-sm">Today</button>
          <button onClick={() => navDate(-1)} className="btn-icon"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-neutral-700 min-w-[140px] text-center">{headerLabel()}</span>
          <button onClick={() => navDate(1)} className="btn-icon"><ChevronRight className="w-4 h-4" /></button>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-sm text-neutral-500">
          <span>{completedCount}/{totalAssignments} done</span>
          <button onClick={fetchRange} className="btn-icon">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : 'text-neutral-400'}`} />
          </button>
        </div>
      </header>

      <div className="flex flex-col flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
        {loading && (
          <div className="flex items-center justify-center p-8 text-neutral-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        )}
        {!loading && viewMode === 'month' && renderMonthGrid()}
        {!loading && viewMode === 'week' && renderWeekView()}
        {!loading && viewMode === 'day' && renderDayView()}
      </div>

      {moveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card card-body w-full max-w-sm">
            <h3 className="text-base font-semibold text-neutral-900 mb-1">Move Assignment</h3>
            <p className="text-sm text-neutral-500 mb-4">{moveModal.assignment.title || moveModal.assignment.client_email}</p>
            <div className="space-y-3">
              <div><label className="form-label">New Date</label><input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} className="form-input" /></div>
              <div>
                <label className="form-label">Team</label>
                <select value={moveTeam} onChange={e => setMoveTeam(e.target.value)} className="form-select">
                  {TEAMS.filter(t => t !== 'Unallocated').map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="">Unallocated</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setMoveModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleMoveAssignment} className="btn-primary flex-1">Move</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PillProps {
  assignment: TeamDailyAssignment;
  isAdmin: boolean;
  onDragStart(): void;
  onDragEnd(): void;
  onDelete(): void;
  onMove(): void;
  onToggle(): void;
  onClick(e: React.MouseEvent): void;
}

function AssignmentPill({ assignment: a, isAdmin, onDragStart, onDragEnd, onDelete, onMove, onToggle, onClick }: PillProps) {
  const [hover, setHover] = useState(false);
  const color = TEAM_COLORS[a.team || 'Unallocated'];
  const label = a.title || a.client_email || 'Unnamed';
  return (
    <div draggable={isAdmin} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className={`relative flex items-center gap-1 px-1.5 py-0.5 rounded text-xs cursor-pointer select-none ${a.completed ? 'opacity-50 line-through' : ''} ${color.bg} ${color.border} border`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
      <span className={`truncate flex-1 ${color.text}`}>{label}</span>
      {a.report_completed && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
      {isAdmin && hover && (
        <div className="absolute right-0 top-0 -translate-y-full flex bg-white shadow-card-md rounded-lg border border-neutral-200 z-30 overflow-hidden" onClick={e => e.stopPropagation()}>
          <button onClick={onToggle} className="p-1.5 hover:bg-neutral-50 text-neutral-500 hover:text-green-600 transition" title="Toggle done"><CheckCircle2 className="w-3.5 h-3.5" /></button>
          <button onClick={onMove} className="p-1.5 hover:bg-neutral-50 text-neutral-500 hover:text-brand-600 transition" title="Move"><MoveRight className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 hover:bg-neutral-50 text-neutral-500 hover:text-red-600 transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}

interface CardProps {
  assignment: TeamDailyAssignment;
  isAdmin: boolean;
  onDragStart(): void;
  onDragEnd(): void;
  onDelete(): void;
  onMove(): void;
  onToggle(): void;
  onEdit(): void;
  navigate_: ReturnType<typeof useNavigate>;
}

function AssignmentCard({ assignment: a, isAdmin, onDragStart, onDragEnd, onDelete, onMove, onToggle, onEdit, navigate_ }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = TEAM_COLORS[a.team || 'Unallocated'];
  const label = a.title || a.client_email || 'Unnamed';
  const addr = a.display_address || '';

  function statusIcon() {
    if (a.report_completed) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (a.reschedule_cancel) return <XCircle className="w-4 h-4 text-red-400" />;
    if (a.completed) return <CheckCircle2 className="w-4 h-4 text-blue-400" />;
    return <Clock className="w-4 h-4 text-neutral-300" />;
  }

  return (
    <div draggable={isAdmin} onDragStart={onDragStart} onDragEnd={onDragEnd}
      className={`rounded-lg border ${color.border} ${color.bg} overflow-hidden transition select-none ${a.completed ? 'opacity-60' : ''} ${isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
    >
      <div className="px-2.5 py-2 flex items-start gap-2" onClick={() => setExpanded(p => !p)}>
        <div className="mt-0.5">{statusIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold truncate ${color.text} ${a.completed ? 'line-through' : ''}`}>{label}</p>
          {a.service_type && <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 font-medium ${getServiceColor(a.service_type)}`}>{a.service_type}</span>}
          {addr && <p className="text-[10px] text-neutral-400 truncate mt-0.5">{addr}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-neutral-100 px-2.5 py-2 space-y-1.5 bg-white/60">
          {a.display_phone && <p className="text-xs text-neutral-600"><span className="font-medium">Phone:</span> {a.display_phone}</p>}
          {a.display_pool_type && <p className="text-xs text-neutral-600"><span className="font-medium">Pool:</span> {a.display_pool_type}</p>}
          {a.admin_note && <p className="text-xs text-neutral-600 italic">Note: {a.admin_note}</p>}
          {isAdmin && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button onClick={onToggle} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition font-medium"><CheckCircle2 className="w-3 h-3" />{a.completed ? 'Unmark' : 'Done'}</button>
              <button onClick={onMove} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-brand-50 text-brand-700 border border-brand-200 rounded-md hover:bg-brand-100 transition font-medium"><MoveRight className="w-3 h-3" />Move</button>
              <button onClick={() => navigate_(`/team-assignments?date=${a.assignment_date}`)} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-neutral-50 text-neutral-600 border border-neutral-200 rounded-md hover:bg-neutral-100 transition font-medium"><Users className="w-3 h-3" />Teams View</button>
              <button onClick={onDelete} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition font-medium"><Trash2 className="w-3 h-3" />Delete</button>
            </div>
          )}
          {!isAdmin && a.linked_report_id && (
            <button onClick={() => navigate_(`/view-report?id=${a.linked_report_id}`)} className="text-xs text-brand-600 underline hover:text-brand-800">View Report</button>
          )}
        </div>
      )}
    </div>
  );
}
