import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, ClipboardList, User, Settings, CalendarDays,
  Send, ClipboardCheck, RefreshCw, MapPin, Users, Waves, DollarSign, BookOpen,
  FileText, Calculator, Paintbrush, AlertTriangle, X,
  Copy, Check, Star, ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import BonusTracker from './BonusTracker';
import ClientSearch from './ClientSearch';
import AssistantRoute from './AssistantRoute';
import LinerQuoteGenerator from './LinerQuoteGenerator';
import CementPaintingQuote from './CementPaintingQuote';

type Tab = 'actions' | 'myroute' | 'clients' | 'sales';
type SalesSubTab = 'liner' | 'cement';

interface ActionCard {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  accent: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');
  const isAdmin = technician.role === 'Admin';
  const isSenior = technician.role === 'Pool Tech Senior';
  const isAssistant = technician.role === 'Assistant Pool Tech';
  const canBookClients = isAdmin;
  const canManage = isAdmin || isSenior;

  const defaultTab: Tab = isAssistant ? 'myroute' : 'actions';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [salesSubTab, setSalesSubTab] = useState<SalesSubTab>('liner');
  const [doubleBookings, setDoubleBookings] = useState<{ email: string; client_name: string; count: number; dates: string[] }[]>([]);
  const [dismissedDoubles, setDismissedDoubles] = useState(false);
  const [copiedReview, setCopiedReview] = useState(false);
  const REVIEW_LINK = 'https://g.page/r/CdFTMUDvEQ1EEAE/review';

  useEffect(() => { if (isAssistant) setActiveTab('myroute'); }, [isAssistant]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('email, client_name, event_date, status, job_status')
          .ilike('service_type', '%closing%')
          .in('status', ['approved', 'pending', 'pre_book'])
          .not('job_status', 'in', '("cancelled","hidden")');
        if (error) throw error;
        const byEmail: Record<string, { email: string; client_name: string; dates: string[] }> = {};
        (data || []).forEach((b: { email: string; client_name: string; event_date: string }) => {
          if (!b.email) return;
          if (!byEmail[b.email]) byEmail[b.email] = { email: b.email, client_name: b.client_name || b.email, dates: [] };
          if (!byEmail[b.email].dates.includes(b.event_date)) byEmail[b.email].dates.push(b.event_date);
        });
        const doubles = Object.values(byEmail)
          .filter(v => v.dates.length > 1)
          .map(v => ({ email: v.email, client_name: v.client_name, count: v.dates.length, dates: v.dates.sort() }));
        setDoubleBookings(doubles);
      } catch { /* non-critical */ }
    })();
  }, [isAdmin]);

  const handleLogout = () => {
    sessionStorage.removeItem('technician');
    navigate('/');
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    ...(isAssistant ? [] : [{ id: 'actions' as Tab, label: 'Actions', icon: <ClipboardList className="w-4 h-4" /> }]),
    { id: 'myroute' as Tab, label: 'My Route', icon: <MapPin className="w-4 h-4" /> },
    ...(canManage ? [{ id: 'clients' as Tab, label: 'Clients', icon: <User className="w-4 h-4" /> }] : []),
    ...(isAdmin ? [{ id: 'sales' as Tab, label: 'Sales', icon: <DollarSign className="w-4 h-4" /> }] : []),
  ];

  const actions: ActionCard[] = [
    ...(canBookClients ? [{
      icon: <Send className="w-5 h-5" />,
      title: 'New Booking Request',
      desc: 'Submit a booking for admin approval',
      onClick: () => navigate('/book-client'),
      accent: 'text-brand-600 bg-brand-50',
    }] : []),
    ...(isAdmin ? [{
      icon: <ClipboardCheck className="w-5 h-5" />,
      title: 'Booking Requests',
      desc: 'Approve, reject or edit pending requests',
      onClick: () => navigate('/booking-requests'),
      accent: 'text-blue-600 bg-blue-50',
    }] : []),
    ...(canManage ? [{
      icon: <Users className="w-5 h-5" />,
      title: 'Team Assignments',
      desc: 'View and manage daily team schedules',
      onClick: () => navigate('/team-assignments'),
      accent: 'text-brand-600 bg-brand-50',
    }] : []),
    {
      icon: <CalendarDays className="w-5 h-5" />,
      title: 'Assignment Calendar',
      desc: 'Month / week / day calendar view',
      onClick: () => navigate('/calendar'),
      accent: 'text-teal-600 bg-teal-50',
    },
    ...(isAdmin ? [{
      icon: <DollarSign className="w-5 h-5" />,
      title: 'Cash Payments',
      desc: 'Track clients paying by cash',
      onClick: () => navigate('/cash-payments'),
      accent: 'text-amber-600 bg-amber-50',
    }] : []),
    ...(isAdmin ? [{
      icon: <ClipboardCheck className="w-5 h-5" />,
      title: 'Task Manager',
      desc: 'To-dos, recurring tasks & reminders',
      onClick: () => navigate('/tasks'),
      accent: 'text-teal-600 bg-teal-50',
    }] : []),
    ...(isAdmin ? [{
      icon: <FileText className="w-5 h-5" />,
      title: 'Job Status Board',
      desc: 'Track jobs: Booking → Booked → Invoice → Review → Complete',
      onClick: () => navigate('/job-status'),
      accent: 'text-green-600 bg-green-50',
    }] : []),
    {
      icon: <BookOpen className="w-5 h-5" />,
      title: 'Procedures & Guides',
      desc: 'Pool closing procedures by pool type',
      onClick: () => navigate('/procedures'),
      accent: 'text-teal-600 bg-teal-50',
    },
  ];

  return (
    <div className="page-shell">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-brand">
            <Waves className="w-5 h-5" />
            <span>Piscines Novo</span>
          </div>

          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <span className="text-sm text-neutral-700 font-medium">{technician.name}</span>
              <span className="badge-teal">{technician.role}</span>
            </div>

            {isAdmin && (
              <button onClick={() => navigate('/admin')} className="btn-icon" title="Admin panel">
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => window.location.reload()} className="btn-icon" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="btn-icon" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="bg-white border-b border-neutral-200 sticky top-14 z-30">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions tab */}
      {activeTab === 'actions' && (
        <main className="page-content">
          {/* Greeting */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-neutral-900">
              Good {getGreeting()}, {technician.first_name || technician.name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">What would you like to do today?</p>
          </div>

          {/* Bonus Tracker — first thing they see */}
          <div className="mb-6">
            <BonusTracker
              isSuperAdmin={technician.staff_id === '002' || technician.id === '002'}
              currentTechId={technician.id}
              embedded
            />
          </div>

          {/* Review link copy — employees only (non-admin) */}
          {!isAdmin && (
            <div className="card border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3.5 flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">Send clients our Google Review link</p>
                <p className="text-xs text-amber-700 mt-0.5">Copy & share — earn $5 per review, $20 with a photo!</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(REVIEW_LINK);
                  setCopiedReview(true);
                  setTimeout(() => setCopiedReview(false), 2000);
                }}
                className="btn-primary btn-sm gap-1.5 shrink-0"
              >
                {copiedReview ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedReview ? 'Copied!' : 'Copy Link'}
              </button>
              <a
                href={REVIEW_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon shrink-0 text-amber-600 hover:text-amber-700"
                title="Open review page"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Double-booking alert */}
          {isAdmin && doubleBookings.length > 0 && !dismissedDoubles && (
            <div className="card border-red-200 bg-red-50 px-4 py-3.5 flex items-start gap-3 mb-6 relative">
              <button
                onClick={() => setDismissedDoubles(true)}
                className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800">Double Pool Closing Bookings Detected</p>
                <p className="text-xs text-red-600 mt-0.5 mb-2">
                  {doubleBookings.length} client{doubleBookings.length !== 1 ? 's have' : ' has'} multiple pool closing bookings. Review and cancel duplicates.
                </p>
                <div className="space-y-1.5">
                  {doubleBookings.map(d => (
                    <div key={d.email} className="flex flex-wrap items-center gap-2 text-xs bg-white rounded-lg px-3 py-2 border border-red-200">
                      <span className="font-semibold text-neutral-800">{d.client_name}</span>
                      <span className="text-neutral-500">{d.email}</span>
                      <span className="badge-red">{d.count} closings</span>
                      <span className="text-neutral-500">Dates: {d.dates.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {actions.map(action => (
              <button
                key={action.title}
                onClick={action.onClick}
                className="card group text-left p-5 hover:shadow-card-md hover:border-neutral-300 transition-all duration-150 flex items-center gap-4"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${action.accent}`}>
                  {action.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800 group-hover:text-brand-700 transition-colors">{action.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </main>
      )}

      {/* My Route tab */}
      {activeTab === 'myroute' && (
        <div className="mx-auto max-w-5xl w-full">
          <AssistantRoute embedded />
        </div>
      )}

      {/* Sales tab */}
      {activeTab === 'sales' && isAdmin && (
        <main className="page-content">
          <div className="mb-6">
            <h1 className="page-title">Sales</h1>
            <p className="page-subtitle">Generate estimates and send them to n8n for QuickBooks processing.</p>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setSalesSubTab('liner')}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                salesSubTab === 'liner'
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <Calculator className="w-4 h-4" /> Liner Quote
            </button>
            <button
              onClick={() => setSalesSubTab('cement')}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                salesSubTab === 'cement'
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <Paintbrush className="w-4 h-4" /> Cement Pool Painting
            </button>
          </div>

          {salesSubTab === 'liner' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-neutral-900">Liner Quote Generator</h2>
                <p className="text-sm text-neutral-500">Generate Spring & Summer liner estimates.</p>
              </div>
              <div className="card card-body">
                <LinerQuoteGenerator />
              </div>
            </div>
          )}

          {salesSubTab === 'cement' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-neutral-900">Cement Pool Painting Quote</h2>
                <p className="text-sm text-neutral-500">Generate painting estimates with paint and labour pricing.</p>
              </div>
              <div className="card card-body">
                <CementPaintingQuote />
              </div>
            </div>
          )}
        </main>
      )}

      {/* Clients tab */}
      {activeTab === 'clients' && canManage && (
        <main className="page-content">
          <div className="mb-6">
            <h1 className="page-title">Client Search</h1>
            <p className="page-subtitle">Search and view client service history</p>
          </div>
          <ClientSearch />
        </main>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
