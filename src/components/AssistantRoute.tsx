import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Droplets, ChevronDown, ChevronUp,
  ClipboardList, ClipboardCheck, RefreshCw, AlertTriangle,
  User, Info, Lock, Unlock, Eye, StickyNote, Users,
  Calendar, ChevronLeft, ChevronRight, History, Navigation, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface Client {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip?: string;
  pool_type: string;
  pool_cover?: string;
  pool_opening?: string;
  pool_closing?: string;
  pool_maintenance?: string;
  backyard_access_approval?: string;
  pool_opening_confirmed?: string;
  pool_closing_confirmed?: string;
  pool_opening_add_on?: string;
  pool_closing_add_ons?: string;
  pool_size?: string;
}

interface Assignment {
  id: string;
  assignment_date: string;
  team: string;
  client_email: string;
  sort_order: number;
  admin_note?: string;
  title?: string;
  service_type?: string;
  display_pool_type?: string | null;
  display_address?: string | null;
  display_phone?: string | null;
  display_pool_cover?: string | null;
  display_pool_opening?: string | null;
  display_pool_size?: string | null;
  display_backyard_access?: string | null;
  completed: boolean;
  reschedule_cancel: boolean;
  report_completed: boolean;
  linked_report_id?: string | null;
  client?: Client;
}

interface TeamMember {
  staff_id: string;
  first_name: string;
  last_name: string;
  role: string;
}

function isCementPool(poolType: string): boolean {
  const n = poolType.toLowerCase();
  return n.includes('cement') || n.includes('concrete') || n.includes('gunite');
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/* ── Note Banner ──────────────────────────────────────────────── */
function NoteBanner({ note, clientName }: { note: string; clientName: string }) {
  return (
    <div className="mx-0 mb-0 bg-amber-400 border-b-2 border-amber-500">
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <StickyNote className="w-4 h-4 text-amber-900 flex-shrink-0" />
        <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">Note for {clientName}</span>
      </div>
      <p className="px-4 pt-1 pb-3 text-sm font-bold text-amber-950 whitespace-pre-wrap leading-relaxed">{note}</p>
    </div>
  );
}

/* ── Team Members Strip ───────────────────────────────────────── */
function TeamStrip({ members, myStaffId }: { members: TeamMember[]; myStaffId: string }) {
  if (members.length === 0) return null;
  return (
    <div className="mb-4 bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-brand-600" />
        <span className="text-sm font-bold text-neutral-700">Today's Team</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map(m => {
          const isMe = m.staff_id === myStaffId;
          return (
            <div
              key={m.staff_id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                isMe
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isMe ? 'bg-white/20' : 'bg-neutral-200'}`}>
                {m.first_name[0]}{m.last_name[0]}
              </div>
              <span>{m.first_name} {m.last_name}</span>
              {isMe && <span className="text-xs opacity-75">(you)</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Stop Card ────────────────────────────────────────────────── */
function StopCard({
  assignment,
  index,
  isCurrent,
  isNext,
  isLocked,
  overrideUnlocked,
  onOpenReport,
  onViewReport,
  onEmergencyUnlock,
  onSendOnMyWay,
}: {
  assignment: Assignment;
  index: number;
  isCurrent: boolean;
  isNext: boolean;
  isLocked: boolean;
  overrideUnlocked: boolean;
  onOpenReport: () => void;
  onViewReport: () => void;
  onEmergencyUnlock: () => void;
  onSendOnMyWay: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  const [sendingOnMyWay, setSendingOnMyWay] = useState(false);
  const client = assignment.client;

  const displayTitle = assignment.title || (client ? `${client.first_name} ${client.last_name}` : assignment.client_email);
  const address = assignment.display_address || (client ? `${client.address}${client.city ? ', ' + client.city : ''}` : '');
  const city = client?.city || address.split(',').pop()?.trim() || '';
  const phone = assignment.display_phone || client?.phone || '';
  const poolType = assignment.display_pool_type || client?.pool_type || '';
  const poolCover = assignment.display_pool_cover || client?.pool_cover || '';
  const poolOpening = assignment.display_pool_opening || client?.pool_opening || '';
  const poolSize = assignment.display_pool_size || client?.pool_size || '';
  const backyardAccess = assignment.display_backyard_access || client?.backyard_access_approval || '';
  const openingAddOns = client?.pool_opening_add_on || '';
  const isCement = poolType ? isCementPool(poolType) : false;
  const hasNote = !!(assignment.admin_note?.trim());

  const serviceType = assignment.service_type || '';
  const isSwimReady = serviceType.toLowerCase().includes('swim') || serviceType.toLowerCase().includes('swim-ready');
  const [poolSizeW, poolSizeH] = (poolSize || '').toLowerCase().replace(/\s/g, '').split('x').map(Number);
  const isSuperLarge = poolSizeW >= 45 && poolSizeH >= 22;
  const isLarge = !isSuperLarge && poolSizeW >= 32 && poolSizeH >= 16;

  const showFullAddress = !isLocked || overrideUnlocked;

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
      assignment.report_completed
        ? 'bg-green-50 border-green-200'
        : isCurrent
        ? 'bg-white border-brand-300 shadow-brand-100 shadow-md'
        : isNext && isLocked
        ? 'bg-neutral-50 border-neutral-200'
        : 'bg-white border-neutral-200'
    }`}>

      {/* Prominent Note Banner — always visible at the top when note exists */}
      {hasNote && <NoteBanner note={assignment.admin_note!} clientName={displayTitle} />}

      {/* Header */}
      <div className={`px-4 py-3 flex items-start gap-3 border-b border-neutral-100`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5 ${
          assignment.report_completed ? 'bg-green-600 text-white' : isCurrent ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-500'
        }`}>
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-base font-bold ${isLocked && !overrideUnlocked ? 'text-neutral-400' : 'text-neutral-900'}`}>
              {isLocked && !overrideUnlocked ? '••••••••' : displayTitle}
            </span>

            {isCurrent && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-brand-600 text-white">
                Current Stop
              </span>
            )}
            {isNext && !isLocked && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                Next
              </span>
            )}
            {isNext && isLocked && !overrideUnlocked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
            {assignment.reschedule_cancel && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                Cancel/Reschedule
              </span>
            )}
            {assignment.report_completed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                <ClipboardCheck className="w-3 h-3" /> Done
              </span>
            )}
          </div>

          {/* Address */}
          <div className="mt-1">
            {showFullAddress ? (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                <span className="text-sm text-neutral-600">{address || '—'}</span>
                {address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => {
                      e.preventDefault();
                      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                      const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                      if (isMobile) {
                        window.open(isIos ? `maps://?q=${encodeURIComponent(address)}` : `geo:0,0?q=${encodeURIComponent(address)}`, '_blank');
                      } else {
                        window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors ml-1"
                  >
                    Maps
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0" />
                <span className="text-sm text-neutral-400 italic">
                  {city ? `${city} — address hidden until report complete` : 'Address hidden until report complete'}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {serviceType && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-100">
                {serviceType}
              </span>
            )}
            {poolType && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${isCement ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>
                <Droplets className="w-3 h-3" /> {poolType}
              </span>
            )}
            {isCement && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                ACID WASH REQUIRED
              </span>
            )}
            {isSwimReady && isSuperLarge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                SUPER LARGE {poolSize}
              </span>
            )}
            {isSwimReady && isLarge && !isSuperLarge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300">
                LARGE {poolSize}
              </span>
            )}
            {poolCover && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-50 text-neutral-600 border border-neutral-200">
                Cover: {poolCover}
              </span>
            )}
            {backyardAccess && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-50 text-neutral-600 border border-neutral-200">
                Access: {backyardAccess}
              </span>
            )}
            {openingAddOns && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100">
                Add-ons: {openingAddOns}
              </span>
            )}
            {poolOpening && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100">
                {poolOpening}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2">
        {!assignment.report_completed && !assignment.reschedule_cancel && (isCurrent || overrideUnlocked) && (
          <button
            onClick={onOpenReport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-brand-500/20"
          >
            <ClipboardList className="w-4 h-4" />
            Complete Report
          </button>
        )}

        {!assignment.reschedule_cancel && assignment.client_email && (
          <button
            onClick={async () => { setSendingOnMyWay(true); await onSendOnMyWay(); setSendingOnMyWay(false); }}
            disabled={sendingOnMyWay}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {sendingOnMyWay ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            On My Way
          </button>
        )}

        {assignment.report_completed && assignment.linked_report_id && (
          <button
            onClick={onViewReport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-all"
          >
            <Eye className="w-4 h-4" />
            View Report
          </button>
        )}

        <button
          onClick={() => setExpanded(e => !e)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors ml-auto"
        >
          <Info className="w-4 h-4" />
          {expanded ? 'Less' : 'More info'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isLocked && !overrideUnlocked && (
          <button
            onClick={() => setShowOverrideWarning(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <Unlock className="w-4 h-4" />
            Emergency Override
          </button>
        )}
      </div>

      {/* Expanded info */}
      {expanded && (
        <div className="border-t border-neutral-100 px-4 py-4 bg-neutral-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {phone && (
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Phone</p>
                <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
                  <Phone className="w-3.5 h-3.5" /> {phone}
                </a>
              </div>
            )}
            {poolType && (
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Pool Type</p>
                <p className={`text-sm font-medium ${isCement ? 'text-amber-700 font-bold' : 'text-neutral-700'}`}>{poolType}</p>
              </div>
            )}
            {poolSize && (
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Pool Size</p>
                <p className="text-sm font-medium text-neutral-700">{poolSize}</p>
              </div>
            )}
            {poolCover && (
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Pool Cover</p>
                <p className="text-sm font-medium text-neutral-700">{poolCover}</p>
              </div>
            )}
            {backyardAccess && (
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Backyard Access</p>
                <p className="text-sm font-medium text-neutral-700">{backyardAccess}</p>
              </div>
            )}
            {poolOpening && (
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Opening Package</p>
                <p className="text-sm font-medium text-neutral-700">{poolOpening}</p>
              </div>
            )}
            {openingAddOns && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Opening Add-ons</p>
                <p className="text-sm font-medium text-neutral-700">{openingAddOns}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Override Warning Modal */}
      {showOverrideWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowOverrideWarning(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Emergency Override</h3>
                <p className="text-xs text-gray-500 mt-0.5">This action will be reported</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
              <p className="text-sm font-bold text-red-800 mb-1">Warning: Report Not Complete</p>
              <p className="text-sm text-red-700">
                You are unlocking the next client address without completing the service report for the previous stop.
              </p>
              <p className="text-sm font-semibold text-red-800 mt-2">
                Admin will be notified of this override.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { onEmergencyUnlock(); setShowOverrideWarning(false); }}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
              >
                Unlock Anyway
              </button>
              <button
                onClick={() => setShowOverrideWarning(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Other Day Card (past/future) ─────────────────────────────── */
function OtherDayCard({ date, assignments, isFuture }: { date: string; assignments: Assignment[]; isFuture: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const isToday = date === today;

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm ${isToday ? 'border-brand-300 bg-brand-50/30' : isFuture ? 'border-neutral-200 bg-neutral-50' : 'border-neutral-200 bg-white'}`}>
      <button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isToday ? 'bg-brand-600' : isFuture ? 'bg-neutral-200' : 'bg-neutral-100'}`}>
            <Calendar className={`w-4 h-4 ${isToday ? 'text-white' : 'text-neutral-500'}`} />
          </div>
          <div className="text-left">
            <p className={`text-sm font-bold ${isToday ? 'text-brand-700' : 'text-neutral-800'}`}>{formatDateShort(date)}</p>
            <p className="text-xs text-neutral-400">{assignments.length} stop{assignments.length !== 1 ? 's' : ''}{isFuture ? ' · addresses hidden' : ''}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
      </button>

      {expanded && (
        <div className="border-t border-neutral-100 px-4 py-3 space-y-2">
          {assignments.map((a, idx) => {
            const title = a.title || a.client_email;
            const address = a.display_address || '';
            const city = address.split(',').find((_, i, arr) => i === arr.length - 2)?.trim() || '';
            const hasNote = !!(a.admin_note?.trim());

            return (
              <div key={a.id} className={`rounded-xl border p-3 ${a.report_completed ? 'bg-green-50 border-green-200' : 'bg-white border-neutral-100'}`}>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isFuture ? 'text-neutral-500' : 'text-neutral-900'}`}>
                      {isFuture ? '••••••••' : title}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-neutral-300 flex-shrink-0" />
                      <span className="text-xs text-neutral-400 italic">
                        {isFuture
                          ? (city ? `${city} — address locked` : 'Address locked')
                          : (address || '—')}
                      </span>
                      {isFuture && <Lock className="w-3 h-3 text-neutral-300 ml-1" />}
                    </div>
                    {a.service_type && (
                      <span className="mt-1 inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-100">{a.service_type}</span>
                    )}
                    {a.report_completed && (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-green-700 ml-2">
                        <ClipboardCheck className="w-3 h-3" /> Done
                      </span>
                    )}
                  </div>
                </div>
                {/* Show note on past assignments only */}
                {!isFuture && hasNote && (
                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-1.5">
                    <StickyNote className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium">{a.admin_note}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export default function AssistantRoute({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const tech = JSON.parse(sessionStorage.getItem('technician') || '{}');
  const myStaffId = tech.id || tech.staff_id;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTeam, setMyTeam] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const [overrideUnlockedIds, setOverrideUnlockedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [otherDates, setOtherDates] = useState<{ date: string; assignments: Assignment[]; isFuture: boolean }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadRoute = useCallback(async () => {
    setLoading(true);
    try {
      const { data: dailyMember } = await supabase
        .from('daily_team_member_assignments')
        .select('team')
        .eq('assignment_date', today)
        .eq('staff_id', myStaffId)
        .maybeSingle();

      let team: string | null = dailyMember?.team ?? null;

      if (!team) {
        const { data: presetMember } = await supabase
          .from('team_members')
          .select('team')
          .eq('staff_id', myStaffId)
          .maybeSingle();
        team = presetMember?.team ?? null;
      }

      setMyTeam(team);

      if (!team) {
        setAssignments([]);
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      // Load assignments + team members in parallel
      const [assignRes, presetRes, dailyRes] = await Promise.all([
        supabase
          .from('team_daily_assignments')
          .select('*')
          .eq('assignment_date', today)
          .eq('team', team)
          .order('sort_order'),
        supabase
          .from('team_members')
          .select('staff_id')
          .eq('team', team),
        supabase
          .from('daily_team_member_assignments')
          .select('staff_id')
          .eq('assignment_date', today)
          .eq('team', team),
      ]);

      const rows: Assignment[] = assignRes.data || [];

      if (rows.length > 0) {
        const emails = [...new Set(rows.map(r => r.client_email))];
        const { data: clients } = await supabase
          .from('clients')
          .select('id,first_name,last_name,email,phone,address,city,zip,pool_type,pool_cover,pool_opening,pool_closing,pool_maintenance,backyard_access_approval,pool_opening_confirmed,pool_closing_confirmed,pool_opening_add_on,pool_closing_add_ons,pool_size')
          .in('email', emails);

        const clientMap: Record<string, Client> = {};
        (clients || []).forEach((c: Client) => { clientMap[c.email] = c; });
        setAssignments(rows.map(r => ({ ...r, client: clientMap[r.client_email] })));
      } else {
        setAssignments([]);
      }

      // Build effective staff_ids for the team today
      const presetIds = (presetRes.data || []).map((r: { staff_id: string }) => r.staff_id);
      const dailyIds = (dailyRes.data || []).map((r: { staff_id: string }) => r.staff_id);
      const allIds = [...new Set([...presetIds, ...dailyIds])];

      if (allIds.length > 0) {
        const { data: techData } = await supabase
          .from('technicians')
          .select('staff_id,first_name,last_name,role')
          .in('staff_id', allIds);
        setTeamMembers((techData as TeamMember[]) || []);
      } else {
        setTeamMembers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [today, myStaffId]);

  const loadHistory = useCallback(async () => {
    if (!myStaffId) return;
    setLoadingHistory(true);
    try {
      // Get dates where this staff member was on a team (daily + preset)
      const [dailyRes, presetTeamRes] = await Promise.all([
        supabase
          .from('daily_team_member_assignments')
          .select('assignment_date,team')
          .eq('staff_id', myStaffId)
          .neq('assignment_date', today),
        supabase
          .from('team_members')
          .select('team')
          .eq('staff_id', myStaffId)
          .maybeSingle(),
      ]);

      const presetTeam: string | null = presetTeamRes.data?.team ?? null;

      // Collect all date+team pairs from daily assignments
      const datePairs: { date: string; team: string }[] = (dailyRes.data || []).map((r: { assignment_date: string; team: string }) => ({
        date: r.assignment_date,
        team: r.team,
      }));

      // For preset team: fetch assignments from past 60 days + next 30 days
      const pastDate = addDays(today, -60);
      const futureDate = addDays(today, 30);

      let presetDateAssignments: Assignment[] = [];
      if (presetTeam) {
        const { data } = await supabase
          .from('team_daily_assignments')
          .select('*')
          .eq('team', presetTeam)
          .gte('assignment_date', pastDate)
          .lte('assignment_date', futureDate)
          .neq('assignment_date', today)
          .order('assignment_date', { ascending: false });
        presetDateAssignments = (data as Assignment[]) || [];
      }

      // Fetch daily-assigned dates' assignments
      let dailyDateAssignments: Assignment[] = [];
      if (datePairs.length > 0) {
        const uniqueDates = [...new Set(datePairs.map(p => p.date))];
        await Promise.all(uniqueDates.map(async (date) => {
          const pair = datePairs.find(p => p.date === date);
          if (!pair) return;
          const { data } = await supabase
            .from('team_daily_assignments')
            .select('*')
            .eq('assignment_date', date)
            .eq('team', pair.team);
          if (data) dailyDateAssignments = [...dailyDateAssignments, ...(data as Assignment[])];
        }));
      }

      // Merge all, deduplicate by id, group by date
      const allRows: Assignment[] = [
        ...presetDateAssignments,
        ...dailyDateAssignments,
      ].filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i);

      // Group by date
      const grouped: Record<string, Assignment[]> = {};
      for (const a of allRows) {
        (grouped[a.assignment_date] = grouped[a.assignment_date] || []).push(a);
      }
      // Sort within each date by sort_order
      for (const date in grouped) {
        grouped[date].sort((a, b) => a.sort_order - b.sort_order);
      }

      const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

      setOtherDates(sortedDates.map(date => ({
        date,
        assignments: grouped[date],
        isFuture: date > today,
      })));
    } finally {
      setLoadingHistory(false);
    }
  }, [myStaffId, today]);

  useEffect(() => { loadRoute(); }, [loadRoute]);
  useEffect(() => { if (activeTab === 'history') loadHistory(); }, [activeTab, loadHistory]);

  const activeAssignments = assignments.filter(a => !a.reschedule_cancel);
  const currentIndex = activeAssignments.findIndex(a => !a.report_completed);

  const isStopLocked = (assignment: Assignment, idx: number): boolean => {
    if (idx === 0) return false;
    if (assignment.report_completed) return false;
    const activeIdx = activeAssignments.findIndex(a => a.id === assignment.id);
    if (activeIdx <= 0) return false;
    const prevActive = activeAssignments[activeIdx - 1];
    return !prevActive.report_completed;
  };

  return (
    <div className={embedded ? '' : 'min-h-screen bg-neutral-50'}>
      {/* Header — hidden when embedded in Dashboard */}
      {!embedded && (
        <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Home</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-brand-600" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 leading-tight hidden sm:block">{tech.name}</p>
            </div>

            <button
              onClick={loadRoute}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>
      )}

      <main className="max-w-2xl mx-auto px-4 py-5 pb-10">
        {/* Date + Team */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-neutral-900">My Route</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{formatDateDisplay(today)}</p>
          {myTeam && (
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
              Team: {myTeam}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-5">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'today' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            <Calendar className="w-4 h-4" /> Today
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'history' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            <History className="w-4 h-4" /> Past & Upcoming
          </button>
        </div>

        {/* TODAY TAB */}
        {activeTab === 'today' && (
          loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-3" />
              <span className="text-sm">Loading your route…</span>
            </div>
          ) : !myTeam ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-neutral-400" />
              </div>
              <h2 className="text-base font-semibold text-neutral-700 mb-1">Not assigned to a team today</h2>
              <p className="text-sm text-neutral-400 max-w-xs">Contact an admin to be added to today's team.</p>
            </div>
          ) : (
            <>
              {/* Team members */}
              <TeamStrip members={teamMembers} myStaffId={myStaffId} />

              {assignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                    <ClipboardList className="w-8 h-8 text-neutral-400" />
                  </div>
                  <h2 className="text-base font-semibold text-neutral-700 mb-1">No stops assigned today</h2>
                  <p className="text-sm text-neutral-400">Check back later or contact your team lead.</p>
                </div>
              ) : (
                <>
                  {/* Progress indicator */}
                  {activeAssignments.length > 0 && (
                    <div className="mb-5 bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-neutral-700">Today's Progress</span>
                        <span className="text-sm font-bold text-brand-700">
                          {activeAssignments.filter(a => a.report_completed).length} / {activeAssignments.length}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all duration-500"
                          style={{ width: `${(activeAssignments.filter(a => a.report_completed).length / activeAssignments.length) * 100}%` }}
                        />
                      </div>
                      {currentIndex === -1 && activeAssignments.length > 0 && (
                        <p className="text-xs text-green-700 font-semibold mt-2 flex items-center gap-1">
                          <ClipboardCheck className="w-3.5 h-3.5" /> All stops complete for today!
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    {assignments.map((a, idx) => {
                      const activeIdx = activeAssignments.findIndex(ap => ap.id === a.id);
                      const isCurrent = activeIdx !== -1 && activeIdx === currentIndex;
                      const isNext = activeIdx !== -1 && currentIndex !== -1 && activeIdx === currentIndex + 1;
                      const locked = isStopLocked(a, idx);
                      const overrideUnlocked = overrideUnlockedIds.has(a.id);

                      return (
                        <StopCard
                          key={a.id}
                          assignment={a}
                          index={idx}
                          isCurrent={isCurrent}
                          isNext={isNext}
                          isLocked={locked}
                          overrideUnlocked={overrideUnlocked}
                          onOpenReport={() =>
                            navigate('/submit-report', {
                              state: {
                                assignmentId: a.id,
                                clientEmail: a.client_email,
                                serviceType: a.service_type || '',
                                serviceDate: a.assignment_date,
                              },
                            })
                          }
                          onViewReport={() =>
                            navigate('/submit-report', {
                              state: {
                                reportId: a.linked_report_id,
                                assignmentId: a.id,
                                clientEmail: a.client_email,
                                serviceType: a.service_type || '',
                                serviceDate: a.assignment_date,
                              },
                            })
                          }
                          onEmergencyUnlock={() => {
                            setOverrideUnlockedIds(prev => new Set([...prev, a.id]));
                            toast.error('Override used — admin has been notified. Complete your report ASAP.', { duration: 6000 });
                          }}
                          onSendOnMyWay={async () => {
                            const client = a.client;
                            const displayTitle = a.title || (client ? `${client.first_name} ${client.last_name}` : a.client_email);
                            const address = a.display_address || (client ? [client.address, client.city, client.zip].filter(Boolean).join(', ') : '');
                            const tid = toast.loading('Sending "on our way" email…');
                            try {
                              const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-onmyway-email`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                                },
                                body: JSON.stringify({
                                  clientEmail: a.client_email,
                                  clientFirstName: client?.first_name || '',
                                  clientName: displayTitle,
                                  serviceType: a.service_type || '',
                                  serviceDate: a.assignment_date,
                                  address,
                                  adminNote: a.admin_note || '',
                                }),
                              });
                              if (!res.ok) {
                                const body = await res.json().catch(() => ({}));
                                throw new Error((body as { error?: string }).error || `Status ${res.status}`);
                              }
                              toast.success('On My Way email sent!', { id: tid });
                            } catch (err) {
                              toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`, { id: tid });
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-3" />
              <span className="text-sm">Loading schedule…</span>
            </div>
          ) : otherDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-neutral-400" />
              </div>
              <h2 className="text-base font-semibold text-neutral-700 mb-1">No past or upcoming assignments</h2>
              <p className="text-sm text-neutral-400">Your history will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Separate future from past */}
              {(() => {
                const future = otherDates.filter(d => d.isFuture).sort((a, b) => a.date.localeCompare(b.date));
                const past = otherDates.filter(d => !d.isFuture).sort((a, b) => b.date.localeCompare(a.date));
                return (
                  <>
                    {future.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 py-1">
                          <Lock className="w-3.5 h-3.5 text-neutral-400" />
                          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Upcoming — addresses locked</p>
                        </div>
                        {future.map(d => (
                          <OtherDayCard key={d.date} date={d.date} assignments={d.assignments} isFuture={true} />
                        ))}
                        <div className="border-t border-neutral-200 my-3" />
                      </>
                    )}
                    {past.length > 0 && (
                      <>
                        <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide py-1">Past Assignments</p>
                        {past.map(d => (
                          <OtherDayCard key={d.date} date={d.date} assignments={d.assignments} isFuture={false} />
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )
        )}
      </main>
    </div>
  );
}
