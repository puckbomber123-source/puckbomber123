import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, ClipboardList, User, Settings, CalendarDays,
  Send, ClipboardCheck, RefreshCw, MapPin, Users, Waves, DollarSign, BookOpen,
  FileText, Calculator,
} from 'lucide-react';
import ClientSearch from './ClientSearch';
import AssistantRoute from './AssistantRoute';
import LinerQuoteGenerator from './LinerQuoteGenerator';

type Tab = 'actions' | 'myroute' | 'clients' | 'liner';

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

  useEffect(() => { if (isAssistant) setActiveTab('myroute'); }, [isAssistant]);

  const handleLogout = () => {
    sessionStorage.removeItem('technician');
    navigate('/');
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    ...(isAssistant ? [] : [{ id: 'actions' as Tab, label: 'Actions', icon: <ClipboardList className="w-4 h-4" /> }]),
    { id: 'myroute' as Tab, label: 'My Route', icon: <MapPin className="w-4 h-4" /> },
    ...(canManage ? [{ id: 'clients' as Tab, label: 'Clients', icon: <User className="w-4 h-4" /> }] : []),
    ...(isAdmin ? [{ id: 'liner' as Tab, label: 'Liner Quote', icon: <Calculator className="w-4 h-4" /> }] : []),
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

      {/* Liner Quote tab */}
      {activeTab === 'liner' && isAdmin && (
        <main className="page-content">
          <div className="mb-6">
            <h1 className="page-title">Liner Quote Generator</h1>
            <p className="page-subtitle">Generate Spring & Summer liner estimates and send them to n8n for QuickBooks processing.</p>
          </div>
          <div className="card card-body">
            <LinerQuoteGenerator />
          </div>
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
