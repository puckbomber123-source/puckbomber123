import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, MapPin, X, Loader2, CalendarDays,
  CheckCircle2, Clock, User, Mail, Phone,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type ServiceType = 'Pool Closing' | 'Pool Opening 1st Visit';

interface SeasonalCitySchedule {
  service_type: ServiceType;
  schedule_date: string;
  cities: string[];
}

interface DayBooking {
  id: string;
  client_name: string | null;
  email: string | null;
  service_type: string | null;
  status: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  phone: string | null;
  source: 'confirmed' | 'pending';
}

const SEASON_RANGES: Record<ServiceType, { start: string; end: string; label: string }> = {
  'Pool Closing': { start: '09-15', end: '10-31', label: 'Sep 15 – Oct 31' },
  'Pool Opening 1st Visit': { start: '04-15', end: '06-15', label: 'Apr 15 – Jun 15' },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function dateStr(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function monthDayOf(date: string) { return date.slice(5); }

function isInSeason(service: ServiceType, date: string): boolean {
  const md = monthDayOf(date);
  const r = SEASON_RANGES[service];
  return md >= r.start && md <= r.end;
}

function defaultMonthForService(service: ServiceType): { year: number; month: number } {
  const now = new Date();
  if (service === 'Pool Closing') {
    return { year: now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - (now.getMonth() < 3 ? 1 : 0), month: 8 };
  }
  return { year: now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, month: 3 };
}

interface Props {
  service: ServiceType;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

export default function BookingCalendar({ service, selectedDate, onSelectDate }: Props) {
  const [cursor, setCursor] = useState(() => defaultMonthForService(service));
  const [schedules, setSchedules] = useState<Record<string, string[]>>({});
  const [dayCounts, setDayCounts] = useState<Record<string, { confirmed: number; pending: number }>>({});
  const [dayBookings, setDayBookings] = useState<DayBooking[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCursor(defaultMonthForService(service));
  }, [service]);

  // Fetch schedules + booking counts for the visible month
  const fetchMonthData = useCallback(async (year: number, month: number) => {
    setLoading(true);
    const startOfMonth = dateStr(year, month, 1);
    const endOfMonth = dateStr(year, month, new Date(year, month + 1, 0).getDate());

    const [schedRes, assignRes, bookingRes] = await Promise.all([
      supabase.from('seasonal_city_schedules').select('schedule_date,cities').eq('service_type', service),
      supabase.from('team_daily_assignments').select('assignment_date,service_type').gte('assignment_date', startOfMonth).lte('assignment_date', endOfMonth),
      supabase.from('bookings').select('event_date,service_type,status').gte('event_date', startOfMonth).lte('event_date', endOfMonth).in('status', ['pending', 'approved']),
    ]);

    const schedMap: Record<string, string[]> = {};
    for (const s of (schedRes.data || []) as SeasonalCitySchedule[]) {
      schedMap[s.schedule_date] = s.cities;
    }
    setSchedules(schedMap);

    const counts: Record<string, { confirmed: number; pending: number }> = {};
    for (const row of assignRes.data || []) {
      const d = row.assignment_date as string;
      if (!counts[d]) counts[d] = { confirmed: 0, pending: 0 };
      counts[d].confirmed += 1;
    }
    for (const row of bookingRes.data || []) {
      if (row.status === 'pending') {
        const d = row.event_date as string;
        if (!counts[d]) counts[d] = { confirmed: 0, pending: 0 };
        counts[d].pending += 1;
      }
    }
    setDayCounts(counts);
    setLoading(false);
  }, [service]);

  useEffect(() => {
    fetchMonthData(cursor.year, cursor.month);
  }, [cursor, fetchMonthData]);

  // Fetch detailed bookings when a date is selected
  useEffect(() => {
    if (!selectedDate) { setDayBookings([]); return; }
    setLoadingDay(true);
    (async () => {
      const [assignRes, bookingRes] = await Promise.all([
        supabase.from('team_daily_assignments')
          .select('id,title,service_type,display_address,status,client_email')
          .eq('assignment_date', selectedDate)
          .order('sort_order'),
        supabase.from('bookings')
          .select('id,client_name,email,service_type,status')
          .eq('event_date', selectedDate)
          .eq('status', 'pending'),
      ]);

      const assignEmails = (assignRes.data || []).map((r: { client_email?: string }) => r.client_email).filter(Boolean) as string[];
      const pendingEmails = (bookingRes.data || []).map((r: { email: string }) => r.email).filter(Boolean);
      const allEmails = [...new Set([...assignEmails, ...pendingEmails])].map((e: string) => e.toLowerCase());

      const clientMap = new Map<string, { address: string | null; city: string | null; zip: string | null; phone: string | null }>();
      if (allEmails.length) {
        const { data: clients } = await supabase.from('clients').select('email,address,city,zip,phone').in('email', allEmails);
        for (const c of (clients || []) as { email: string; address: string | null; city: string | null; zip: string | null; phone: string | null }[]) {
          clientMap.set(c.email.toLowerCase(), { address: c.address, city: c.city, zip: c.zip, phone: c.phone });
        }
      }

      const rows: DayBooking[] = [];

      for (const a of (assignRes.data || []) as { id: string; title: string | null; service_type: string | null; display_address: string | null; status: string | null; client_email?: string }[]) {
        const client = a.client_email ? clientMap.get(a.client_email.toLowerCase()) : undefined;
        rows.push({
          id: a.id,
          client_name: a.title,
          email: a.client_email || null,
          service_type: a.service_type,
          status: a.status || 'Confirmed',
          address: client?.address || null,
          city: client?.city || null,
          zip: client?.zip || null,
          phone: client?.phone || null,
          source: 'confirmed',
        });
      }

      for (const b of (bookingRes.data || []) as { id: string; client_name: string | null; email: string; service_type: string; status: string }[]) {
        const client = clientMap.get(b.email.toLowerCase());
        rows.push({
          id: b.id,
          client_name: b.client_name,
          email: b.email,
          service_type: b.service_type,
          status: b.status,
          address: client?.address || null,
          city: client?.city || null,
          zip: client?.zip || null,
          phone: client?.phone || null,
          source: 'pending',
        });
      }

      setDayBookings(rows);
      setLoadingDay(false);
    })();
  }, [selectedDate]);

  const calendarDays = useMemo(() => {
    const { year, month } = cursor;
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: string | null; day: number | null }[] = [];
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: dateStr(year, month, d), day: d });
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    return cells;
  }, [cursor]);

  function prevMonth() {
    setCursor(c => {
      let m = c.month - 1;
      let y = c.year;
      if (m < 0) { m = 11; y -= 1; }
      return { year: y, month: m };
    });
  }
  function nextMonth() {
    setCursor(c => {
      let m = c.month + 1;
      let y = c.year;
      if (m > 11) { m = 0; y += 1; }
      return { year: y, month: m };
    });
  }

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="card card-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-brand-600 text-white px-3 py-1.5 text-sm font-semibold">
            {service}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 rounded-lg px-3 py-2">
          <CalendarDays className="w-3.5 h-3.5" />
          Season: {SEASON_RANGES[service].label}
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="btn-icon"><ChevronLeft className="w-4 h-4" /></button>
        <h3 className="text-sm font-bold text-neutral-900">{MONTH_NAMES[cursor.month]} {cursor.year}</h3>
        <button type="button" onClick={nextMonth} className="btn-icon"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="grid grid-cols-7 gap-1 mb-1 min-w-[420px]">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wide text-neutral-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 min-w-[420px]">
        {calendarDays.map((cell, i) => {
          if (!cell.date) return <div key={i} className="rounded-lg" />;
          const inSeason = isInSeason(service, cell.date);
          const cities = schedules[cell.date];
          const counts = dayCounts[cell.date];
          const isToday = cell.date === todayISO;
          const isSelected = cell.date === selectedDate;
          const hasBookings = counts && (counts.confirmed > 0 || counts.pending > 0);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(cell.date!)}
              className={`relative rounded-lg border p-2 min-h-[80px] text-left transition flex flex-col gap-0.5 ${
                isSelected
                  ? 'border-brand-500 ring-2 ring-brand-300 bg-brand-50'
                  : inSeason
                    ? 'border-neutral-200 hover:border-brand-300 bg-white'
                    : 'border-neutral-100 bg-neutral-50/50 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isToday ? 'text-brand-600' : inSeason ? 'text-neutral-700' : 'text-neutral-300'}`}>
                  {cell.day}
                </span>
                {hasBookings && (
                  <span className="flex items-center gap-0.5">
                    {counts.confirmed > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                    {counts.pending > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  </span>
                )}
              </div>
              {cities && cities.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {cities.slice(0, 2).map(c => (
                    <span key={c} className="inline-block text-[10px] leading-tight px-1 py-0.5 rounded bg-brand-100 text-brand-700 font-medium truncate max-w-full">
                      {c}
                    </span>
                  ))}
                  {cities.length > 2 && <span className="text-[10px] text-neutral-400 font-medium">+{cities.length - 2}</span>}
                </div>
              )}
              {hasBookings && (
                <div className="mt-auto flex items-center gap-1.5 text-[10px]">
                  {counts.confirmed > 0 && <span className="flex items-center gap-0.5 text-green-700 font-semibold"><CheckCircle2 className="w-3 h-3" />{counts.confirmed}</span>}
                  {counts.pending > 0 && <span className="flex items-center gap-0.5 text-amber-600 font-semibold"><Clock className="w-3 h-3" />{counts.pending}</span>}
                </div>
              )}
            </button>
          );
        })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-neutral-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Confirmed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Pending request</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-100" />Cities</span>
      </div>

      {/* Selected date detail */}
      {selectedDate && (
        <div className="mt-4 border-t border-neutral-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-neutral-900">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              {schedules[selectedDate] && schedules[selectedDate].length > 0 && (
                <p className="text-xs text-brand-700 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />Cities: {schedules[selectedDate].join(', ')}
                </p>
              )}
            </div>
            <button type="button" onClick={() => onSelectDate('')} className="btn-icon"><X className="w-4 h-4" /></button>
          </div>

          {loadingDay ? (
            <div className="flex items-center justify-center py-8 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading bookings…
            </div>
          ) : dayBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
              <CalendarDays className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No bookings on this date yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dayBookings.map((b, idx) => (
                <div key={b.id} className={`rounded-xl border p-3 ${b.source === 'confirmed' ? 'border-green-200 bg-green-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
                  <div className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${b.source === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-neutral-900">{b.client_name || b.email || '—'}</p>
                        {b.source === 'confirmed'
                          ? <span className="text-[10px] font-bold uppercase text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Confirmed</span>
                          : <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">Pending</span>
                        }
                      </div>
                      {b.service_type && <p className="text-xs text-brand-700 font-medium mt-0.5">{b.service_type}</p>}
                      <div className="mt-1.5 space-y-0.5 text-xs text-neutral-600">
                        {b.address && <p className="flex items-center gap-1"><MapPin className="w-3 h-3 text-neutral-400 shrink-0" />{[b.address, b.city, b.zip].filter(Boolean).join(', ')}</p>}
                        {b.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-neutral-400 shrink-0" />{b.email}</p>}
                        {b.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-neutral-400 shrink-0" />{b.phone}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && !selectedDate && (
        <div className="flex items-center justify-center py-8 text-neutral-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      )}
    </div>
  );
}
