import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Waves, LogOut, Plus, Check, Trash2, Pencil, Bell,
  CalendarClock, Repeat, Flag, User, X, RefreshCw, Circle,
  CheckCircle2, ListTodo, Mail, Inbox,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type { AdminTask } from '../types';

type Priority = 'low' | 'normal' | 'high';
type Recurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
type FilterTab = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';

interface Technician {
  id: string;
  staff_id: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string | null;
}

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
  due_date: z.string().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']),
  recurrence_day: z.string().optional(),
  recurrence_month: z.string().optional(),
  recurrence_weekday: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']),
  assigned_to: z.string().optional(),
});
type TaskFormData = z.infer<typeof taskSchema>;

const priorityConfig: Record<Priority, { label: string; color: string; dot: string; bg: string }> = {
  high:   { label: 'High',   color: 'text-red-700',   dot: 'bg-red-500',   bg: 'bg-red-50 ring-red-200' },
  normal: { label: 'Normal', color: 'text-blue-700',  dot: 'bg-blue-500',  bg: 'bg-blue-50 ring-blue-200' },
  low:    { label: 'Low',    color: 'text-neutral-500', dot: 'bg-neutral-400', bg: 'bg-neutral-50 ring-neutral-200' },
};

const recurrenceConfig: Record<Recurrence, { label: string; icon: React.ReactNode }> = {
  none:    { label: 'One-time',      icon: <Circle className="w-3 h-3" /> },
  daily:   { label: 'Every day',     icon: <Repeat className="w-3 h-3" /> },
  weekly:  { label: 'Every week',    icon: <Repeat className="w-3 h-3" /> },
  biweekly:{ label: 'Every 2 weeks', icon: <Repeat className="w-3 h-3" /> },
  monthly: { label: 'Every month',   icon: <Repeat className="w-3 h-3" /> },
  yearly:  { label: 'Every year',    icon: <Repeat className="w-3 h-3" /> },
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function daysUntil(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const today = new Date(todayStr() + 'T00:00:00');
  const due = new Date(dueDate + 'T00:00:00');
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function formatDueDate(dueDate: string | null, completed: boolean): { text: string; className: string } {
  if (!dueDate) return { text: 'No date', className: 'text-neutral-400' };
  const days = daysUntil(dueDate);
  const date = new Date(dueDate + 'T00:00:00');
  const formatted = date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: days && Math.abs(days) > 60 ? 'numeric' : undefined });

  if (completed) return { text: formatted, className: 'text-neutral-400 line-through' };
  if (days === null) return { text: formatted, className: 'text-neutral-500' };
  if (days < 0) return { text: `Overdue · ${formatted}`, className: 'text-red-600 font-semibold' };
  if (days === 0) return { text: 'Today', className: 'text-amber-600 font-semibold' };
  if (days === 1) return { text: 'Tomorrow', className: 'text-amber-600' };
  if (days <= 7) return { text: `In ${days} days · ${formatted}`, className: 'text-neutral-600' };
  return { text: formatted, className: 'text-neutral-500' };
}

function computeNextDueDate(task: AdminTask): string | null {
  if (task.recurrence === 'none') return task.due_date;
  const today = new Date(todayStr() + 'T00:00:00');

  if (task.recurrence === 'daily') {
    return today.toISOString().split('T')[0];
  }
  if (task.recurrence === 'weekly' || task.recurrence === 'biweekly') {
    const target = task.recurrence_weekday ?? today.getDay();
    const step = task.recurrence === 'biweekly' ? 14 : 7;
    const diff = (target - today.getDay() + 7) % 7;
    const next = new Date(today);
    next.setDate(next.getDate() + (diff === 0 ? step : diff));
    return next.toISOString().split('T')[0];
  }
  if (task.recurrence === 'monthly') {
    const day = task.recurrence_day ?? today.getDate();
    let year = today.getFullYear();
    let month = today.getMonth();
    if (today.getDate() >= day) month++;
    if (month > 11) { month = 0; year++; }
    const lastDay = new Date(year, month + 1, 0).getDate();
    const useDay = Math.min(day, lastDay);
    return new Date(year, month, useDay).toISOString().split('T')[0];
  }
  if (task.recurrence === 'yearly') {
    const month = (task.recurrence_month ?? 1) - 1;
    const day = task.recurrence_day ?? 1;
    let year = today.getFullYear();
    const thisYearDate = new Date(year, month, day);
    if (today > thisYearDate) year++;
    return new Date(year, month, day).toISOString().split('T')[0];
  }
  return task.due_date;
}

export default function TaskManager() {
  const navigate = useNavigate();
  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');

  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [techs, setTechs] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingReminderFor, setSendingReminderFor] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { recurrence: 'none', priority: 'normal' },
  });

  const watchRecurrence = watch('recurrence');

  useEffect(() => {
    if (technician.role !== 'Admin') { navigate('/dashboard'); return; }
    fetchTasks();
    fetchTechs();
  }, [navigate]);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_tasks')
      .select('*')
      .order('completed', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load tasks'); setLoading(false); return; }
    setTasks(data || []);
    setLoading(false);
  };

  const fetchTechs = async () => {
    const { data } = await supabase
      .from('technicians')
      .select('id, staff_id, first_name, last_name, role, email')
      .eq('is_active', true)
      .order('first_name', { ascending: true });
    setTechs(data || []);
  };

  const techMap = useMemo(() => {
    const map: Record<string, Technician> = {};
    techs.forEach(t => { map[t.staff_id] = t; });
    return map;
  }, [techs]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    const today = todayStr();

    if (activeFilter === 'today') {
      result = result.filter(t => !t.completed && t.due_date === today);
    } else if (activeFilter === 'upcoming') {
      result = result.filter(t => !t.completed && t.due_date && t.due_date > today);
    } else if (activeFilter === 'overdue') {
      result = result.filter(t => !t.completed && t.due_date && t.due_date < today);
    } else if (activeFilter === 'completed') {
      result = result.filter(t => t.completed);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [tasks, activeFilter, searchQuery]);

  const counts = useMemo(() => {
    const today = todayStr();
    return {
      all: tasks.filter(t => !t.completed).length,
      today: tasks.filter(t => !t.completed && t.due_date === today).length,
      upcoming: tasks.filter(t => !t.completed && t.due_date && t.due_date > today).length,
      overdue: tasks.filter(t => !t.completed && t.due_date && t.due_date < today).length,
      completed: tasks.filter(t => t.completed).length,
    };
  }, [tasks]);

  const handleToggleComplete = useCallback(async (task: AdminTask) => {
    if (task.completed) {
      const { error } = await supabase
        .from('admin_tasks')
        .update({ completed: false, completed_at: null, updated_at: new Date().toISOString() })
        .eq('id', task.id);
      if (error) { toast.error('Failed to update'); return; }
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: false, completed_at: null } : t));
    } else {
      let nextDueDate = task.due_date;
      if (task.recurrence !== 'none') {
        const updated = { ...task, completed: true };
        nextDueDate = computeNextDueDate(updated);
      }
      const { error } = await supabase
        .from('admin_tasks')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          due_date: nextDueDate,
          reminder_sent_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);
      if (error) { toast.error('Failed to update'); return; }
      setTasks(prev => prev.map(t => t.id === task.id ? {
        ...t, completed: true, completed_at: new Date().toISOString(),
        due_date: nextDueDate, reminder_sent_at: null,
      } : t));
      toast.success('Task completed', { icon: '✓' });
    }
  }, []);

  const sendReminder = async (task: AdminTask) => {
    const recipient = task.assigned_to
      ? techMap[task.assigned_to]
      : techMap[technician.staff_id];
    if (!recipient?.email) {
      toast.error('No email on file. Add an email in Admin → Manage Technicians.');
      return;
    }
    setSendingReminderFor(task.id);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-task-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          toEmail: recipient.email,
          recipientName: `${recipient.first_name} ${recipient.last_name}`,
          taskTitle: task.title,
          taskNotes: task.notes,
          dueDate: task.due_date,
          priority: task.priority,
          recurrence: task.recurrence,
          assignedByName: technician.name || `${technician.first_name} ${technician.last_name}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      await supabase
        .from('admin_tasks')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', task.id);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, reminder_sent_at: new Date().toISOString() } : t));
      toast.success(`Reminder sent to ${recipient.email}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reminder');
    } finally {
      setSendingReminderFor(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    const { error } = await supabase.from('admin_tasks').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Task deleted');
  };

  const openCreateForm = () => {
    setEditingTask(null);
    setShowForm(true);
    reset({
      title: '', notes: '', due_date: '', recurrence: 'none',
      recurrence_day: '', recurrence_month: '', recurrence_weekday: '',
      priority: 'normal', assigned_to: '',
    });
  };

  const openEditForm = (task: AdminTask) => {
    setEditingTask(task);
    setShowForm(true);
    reset({
      title: task.title,
      notes: task.notes || '',
      due_date: task.due_date || '',
      recurrence: task.recurrence,
      recurrence_day: task.recurrence_day?.toString() || '',
      recurrence_month: task.recurrence_month?.toString() || '',
      recurrence_weekday: task.recurrence_weekday?.toString() || '',
      priority: task.priority,
      assigned_to: task.assigned_to || '',
    });
  };

  const onSubmit = async (data: TaskFormData) => {
    const payload: Record<string, any> = {
      title: data.title,
      notes: data.notes || null,
      due_date: data.due_date || null,
      recurrence: data.recurrence,
      priority: data.priority,
      assigned_to: data.assigned_to || null,
      updated_at: new Date().toISOString(),
    };

    if (data.recurrence === 'monthly') {
      payload.recurrence_day = data.recurrence_day ? parseInt(data.recurrence_day) : null;
      payload.recurrence_weekday = null;
      payload.recurrence_month = null;
    } else if (data.recurrence === 'yearly') {
      payload.recurrence_day = data.recurrence_day ? parseInt(data.recurrence_day) : null;
      payload.recurrence_month = data.recurrence_month ? parseInt(data.recurrence_month) : null;
      payload.recurrence_weekday = null;
    } else if (data.recurrence === 'weekly' || data.recurrence === 'biweekly') {
      payload.recurrence_weekday = data.recurrence_weekday ? parseInt(data.recurrence_weekday) : null;
      payload.recurrence_day = null;
      payload.recurrence_month = null;
    } else {
      payload.recurrence_day = null;
      payload.recurrence_month = null;
      payload.recurrence_weekday = null;
    }

    try {
      if (editingTask) {
        const { error } = await supabase.from('admin_tasks').update(payload).eq('id', editingTask.id);
        if (error) throw error;
        toast.success('Task updated');
      } else {
        payload.created_by = technician.staff_id;
        const { data: newTask, error } = await supabase.from('admin_tasks').insert([payload]).select().single();
        if (error) throw error;
        toast.success('Task created');
      }
      setShowForm(false);
      setEditingTask(null);
      reset();
      fetchTasks();
    } catch {
      toast.error('Failed to save task');
    }
  };

  const handleLogout = () => { sessionStorage.removeItem('technician'); navigate('/'); };

  const filterTabs: { id: FilterTab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: 'all',       label: 'All',       count: counts.all,       icon: <ListTodo className="w-4 h-4" /> },
    { id: 'today',     label: 'Today',     count: counts.today,     icon: <CalendarClock className="w-4 h-4" /> },
    { id: 'upcoming',  label: 'Upcoming',  count: counts.upcoming,  icon: <CalendarClock className="w-4 h-4" /> },
    { id: 'overdue',   label: 'Overdue',   count: counts.overdue,   icon: <Bell className="w-4 h-4" /> },
    { id: 'completed', label: 'Done',      count: counts.completed, icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  const adminTechs = techs.filter(t => t.role === 'Admin');

  return (
    <div className="page-shell">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="btn-icon">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="navbar-brand">
              <Waves className="w-5 h-5" />
              <span>Tasks</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => window.location.reload()} className="btn-icon" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="btn-icon" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="page-content">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Task Manager</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {counts.all} active {counts.all === 1 ? 'task' : 'tasks'}
              {counts.overdue > 0 && <span className="text-red-600 font-medium"> · {counts.overdue} overdue</span>}
            </p>
          </div>
          <button onClick={openCreateForm} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>

        {/* Search + Filter tabs */}
        <div className="mb-5 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks…"
              className="form-input pl-10"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <ListTodo className="w-4 h-4" />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            {filterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeFilter === tab.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300 hover:text-neutral-800'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs px-1.5 rounded-full ${
                    activeFilter === tab.id ? 'bg-white/20' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="spinner w-7 h-7" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-state">
            <Inbox className="empty-state-icon" />
            <p className="empty-state-title">
              {searchQuery ? 'No tasks match your search' : activeFilter === 'completed' ? 'No completed tasks yet' : 'No tasks here'}
            </p>
            <p className="empty-state-desc">
              {activeFilter === 'all' && !searchQuery ? 'Click "New Task" to create your first to-do' : 'Try a different filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                techMap={techMap}
                onToggle={handleToggleComplete}
                onEdit={openEditForm}
                onDelete={handleDelete}
                onReminder={sendReminder}
                sendingReminder={sendingReminderFor === task.id}
              />
            ))}
          </div>
        )}
      </main>

      {/* Task form modal */}
      {showForm && (
        <TaskFormModal
          editing={!!editingTask}
          watchRecurrence={watchRecurrence}
          register={register}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          errors={errors}
          isSubmitting={isSubmitting}
          onClose={() => { setShowForm(false); setEditingTask(null); reset(); }}
          adminTechs={adminTechs}
        />
      )}
    </div>
  );
}

interface TaskRowProps {
  task: AdminTask;
  techMap: Record<string, Technician>;
  onToggle: (task: AdminTask) => void;
  onEdit: (task: AdminTask) => void;
  onDelete: (id: string) => void;
  onReminder: (task: AdminTask) => void;
  sendingReminder: boolean;
}

function TaskRow({ task, techMap, onToggle, onEdit, onDelete, onReminder, sendingReminder }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const dueInfo = formatDueDate(task.due_date, task.completed);
  const pri = priorityConfig[task.priority];
  const rec = recurrenceConfig[task.recurrence];
  const assignedTech = task.assigned_to ? techMap[task.assigned_to] : null;

  return (
    <div
      className={`card transition-all duration-200 ${task.completed ? 'opacity-60' : 'hover:shadow-card-md hover:border-neutral-300'}`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(task)}
          className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            task.completed
              ? 'bg-brand-600 border-brand-600'
              : 'border-neutral-300 hover:border-brand-500 hover:bg-brand-50'
          }`}
        >
          {task.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>

        {/* Content */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => (task.notes || task.recurrence !== 'none') && setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${task.completed ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
              {task.title}
            </span>
            <span className={`badge ring-1 ring-inset ${pri.bg} ${pri.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
              {pri.label}
            </span>
            {task.recurrence !== 'none' && (
              <span className="badge bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200">
                {rec.icon} {rec.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={`text-xs flex items-center gap-1 ${dueInfo.className}`}>
              <CalendarClock className="w-3 h-3" />
              {dueInfo.text}
            </span>
            {assignedTech && (
              <span className="text-xs text-neutral-500 flex items-center gap-1">
                <User className="w-3 h-3" />
                {assignedTech.first_name} {assignedTech.last_name}
              </span>
            )}
            {task.reminder_sent_at && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Bell className="w-3 h-3" />
                Reminder sent
              </span>
            )}
          </div>

          {expanded && task.notes && (
            <p className="text-sm text-neutral-600 mt-2 pl-1 leading-relaxed">{task.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onReminder(task)}
            disabled={sendingReminder || task.completed}
            className="btn-icon w-8 h-8 text-neutral-400 hover:text-teal-600 disabled:opacity-30"
            title="Send reminder email"
          >
            {sendingReminder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onEdit(task)}
            className="btn-icon w-8 h-8 text-neutral-400 hover:text-brand-600"
            title="Edit task"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="btn-icon w-8 h-8 text-neutral-400 hover:text-red-600"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface TaskFormModalProps {
  editing: boolean;
  watchRecurrence: Recurrence;
  register: any;
  handleSubmit: any;
  onSubmit: (data: TaskFormData) => void;
  errors: any;
  isSubmitting: boolean;
  onClose: () => void;
  adminTechs: Technician[];
}

function TaskFormModal({ editing, watchRecurrence, register, handleSubmit, onSubmit, errors, isSubmitting, onClose, adminTechs }: TaskFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card card-body w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <ListTodo className="w-4 h-4 text-brand-600" />
            </div>
            <h2 className="text-sm font-semibold text-neutral-800">
              {editing ? 'Edit Task' : 'New Task'}
            </h2>
          </div>
          <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="form-label">Task Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              {...register('title')}
              className="form-input"
              placeholder="e.g. Pay off RBC Mastercard"
              autoFocus
            />
            {errors.title && <p className="form-error">{errors.title.message}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes</label>
            <textarea
              {...register('notes')}
              className="form-textarea h-20"
              placeholder="Optional details or instructions…"
            />
          </div>

          {/* Due date + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Due Date</label>
              <input type="date" {...register('due_date')} className="form-input" />
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select {...register('priority')} className="form-select">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="form-label">Repeat</label>
            <select {...register('recurrence')} className="form-select">
              <option value="none">One-time (no repeat)</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly (every 2 weeks)</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Recurrence-specific fields */}
          {watchRecurrence === 'monthly' && (
            <div>
              <label className="form-label">Day of Month</label>
              <input
                type="number"
                min={1}
                max={31}
                {...register('recurrence_day')}
                className="form-input"
                placeholder="e.g. 31"
              />
              <p className="form-hint">If the month has fewer days, the last day is used.</p>
            </div>
          )}

          {watchRecurrence === 'yearly' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Month</label>
                <select {...register('recurrence_month')} className="form-select">
                  <option value="">Select…</option>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Day</label>
                <input type="number" min={1} max={31} {...register('recurrence_day')} className="form-input" placeholder="e.g. 31" />
              </div>
            </div>
          )}

          {(watchRecurrence === 'weekly' || watchRecurrence === 'biweekly') && (
            <div>
              <label className="form-label">Day of Week</label>
              <select {...register('recurrence_weekday')} className="form-select">
                <option value="">Select…</option>
                {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
          )}

          {/* Assign to */}
          <div>
            <label className="form-label">Assign To</label>
            <select {...register('assigned_to')} className="form-select">
              <option value="">Myself (unassigned)</option>
              {adminTechs.map(tech => (
                <option key={tech.staff_id} value={tech.staff_id}>
                  {tech.first_name} {tech.last_name} ({tech.role})
                </option>
              ))}
            </select>
            <p className="form-hint">
              Reminder emails go to the assigned user's email (set in Admin → Manage Technicians).
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : editing ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}