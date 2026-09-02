import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, MapPin, Plus, X, Trash2, Loader2, CalendarDays, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

type ServiceType = 'Pool Closing' | 'Pool Opening 1st Visit';

interface SeasonalCitySchedule {
  id: string;
  service_type: ServiceType;
  schedule_date: string;
  cities: string[];
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

export default function SeasonalCityCalendar() {
  const [schedules, setSchedules] = useState<SeasonalCitySchedule[]>([]);
  const [service, setService] = useState<ServiceType>('Pool Closing');
  const [cursor, setCursor] = useState(() => defaultMonthForService('Pool Closing'));
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [draftCities, setDraftCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('seasonal_city_schedules')
      .select('id,service_type,schedule_date,cities')
      .order('schedule_date', { ascending: true });
    if (error) toast.error('Failed to load city schedules');
    else setSchedules((data || []) as SeasonalCitySchedule[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  useEffect(() => {
    setCursor(defaultMonthForService(service));
    setSelectedDate(null);
    setDraftCities([]);
    setCityInput('');
  }, [service]);

  const scheduleMap = useMemo(() => {
    const map: Record<string, SeasonalCitySchedule> = {};
    for (const s of schedules) {
      if (s.service_type === service) map[s.schedule_date] = s;
    }
    return map;
  }, [schedules, service]);

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

  function openDate(date: string) {
    setSelectedDate(date);
    const existing = scheduleMap[date];
    setDraftCities(existing ? [...existing.cities] : []);
    setCityInput('');
  }

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

  function addCity() {
    const trimmed = cityInput.trim();
    if (!trimmed) return;
    if (draftCities.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('That city is already added');
      setCityInput('');
      return;
    }
    setDraftCities(prev => [...prev, trimmed]);
    setCityInput('');
  }

  function removeCity(city: string) {
    setDraftCities(prev => prev.filter(c => c !== city));
  }

  async function saveDate() {
    if (!selectedDate) return;
    if (!isInSeason(service, selectedDate)) {
      toast.error(`${service} dates must fall between ${SEASON_RANGES[service].label}`);
      return;
    }
    setSaving(true);
    const existing = scheduleMap[selectedDate];

    if (draftCities.length === 0) {
      if (existing) {
        const { error } = await supabase.from('seasonal_city_schedules').delete().eq('id', existing.id);
        if (error) { toast.error('Failed to clear schedule'); setSaving(false); return; }
      }
      toast.success('Schedule cleared');
      setSelectedDate(null);
      fetchSchedules();
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('seasonal_city_schedules').upsert({
      service_type: service,
      schedule_date: selectedDate,
      cities: draftCities,
      updated_at: new Date().toISOString(),
      ...(existing ? { id: existing.id } : {}),
    }, { onConflict: 'service_type,schedule_date' });

    if (error) toast.error('Failed to save schedule');
    else { toast.success('Cities saved'); setSelectedDate(null); fetchSchedules(); }
    setSaving(false);
  }

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="card card-body">
      {/* Service toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="inline-flex rounded-xl border border-neutral-200 overflow-hidden">
          {(Object.keys(SEASON_RANGES) as ServiceType[]).map(s => (
            <button
              key={s}
              onClick={() => setService(s)}
              className={`px-4 py-2 text-sm font-semibold transition ${service === s ? 'bg-brand-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 rounded-lg px-3 py-2">
          <CalendarDays className="w-3.5 h-3.5" />
          {service} season: {SEASON_RANGES[service].label}
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="btn-icon"><ChevronLeft className="w-4 h-4" /></button>
        <h3 className="text-sm font-bold text-neutral-900">{MONTH_NAMES[cursor.month]} {cursor.year}</h3>
        <button onClick={nextMonth} className="btn-icon"><ChevronRight className="w-4 h-4" /></button>
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
            const sched = scheduleMap[cell.date];
            const isToday = cell.date === todayISO;
            const isSelected = cell.date === selectedDate;
            return (
              <button
                key={i}
                onClick={() => openDate(cell.date!)}
                className={`relative rounded-lg border p-2 min-h-[72px] text-left transition flex flex-col gap-0.5 ${
                isSelected
                  ? 'border-brand-500 ring-2 ring-brand-300 bg-brand-50'
                  : inSeason
                    ? 'border-neutral-200 hover:border-brand-300 bg-white'
                    : 'border-neutral-100 bg-neutral-50/50 opacity-60'
              }`}
            >
              <span className={`text-xs font-bold ${isToday ? 'text-brand-600' : inSeason ? 'text-neutral-700' : 'text-neutral-300'}`}>
                {cell.day}
              </span>
              {sched && sched.cities.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-auto">
                  {sched.cities.slice(0, 3).map(c => (
                    <span key={c} className="inline-block text-[10px] leading-tight px-1 py-0.5 rounded bg-brand-100 text-brand-700 font-medium truncate max-w-full">
                      {c}
                    </span>
                  ))}
                  {sched.cities.length > 3 && (
                    <span className="text-[10px] text-neutral-400 font-medium">+{sched.cities.length - 3}</span>
                  )}
                </div>
              )}
              {inSeason && !sched && (
                <span className="mt-auto w-4 h-4 rounded-full bg-neutral-100 flex items-center justify-center self-end">
                  <Plus className="w-2.5 h-2.5 text-neutral-300" />
                </span>
              )}
            </button>
          );
        })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-neutral-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-neutral-200 bg-white" />In season</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-100" />Has cities</span>
      </div>

      {/* Date editor panel */}
      {selectedDate && (
        <div className="mt-4 border-t border-neutral-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-neutral-900">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {isInSeason(service, selectedDate)
                  ? `${service} — add the cities you want to service on this date`
                  : <span className="text-amber-600">Outside the {service} season ({SEASON_RANGES[service].label})</span>}
              </p>
            </div>
            <button onClick={() => setSelectedDate(null)} className="btn-icon"><X className="w-4 h-4" /></button>
          </div>

          {/* City chips */}
          <div className="flex flex-wrap gap-1.5 mb-3 min-h-[32px]">
            {draftCities.map(city => (
              <span key={city} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium">
                <MapPin className="w-3 h-3" />
                {city}
                <button onClick={() => removeCity(city)} className="ml-0.5 hover:text-red-600 transition">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {draftCities.length === 0 && (
              <span className="text-xs text-neutral-400">No cities added yet — type one below and press Enter.</span>
            )}
          </div>

          {/* Add city input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCity(); } }}
              placeholder="Type a city name and press Enter…"
              className="form-input flex-1"
              disabled={!isInSeason(service, selectedDate)}
            />
            <button onClick={addCity} disabled={!cityInput.trim() || !isInSeason(service, selectedDate)} className="btn-secondary">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {/* Save / clear */}
          <div className="flex justify-end gap-2 mt-3">
            {scheduleMap[selectedDate] && (
              <button
                onClick={async () => {
                  const sched = scheduleMap[selectedDate];
                  if (!confirm(`Remove all cities for ${selectedDate}?`)) return;
                  const { error } = await supabase.from('seasonal_city_schedules').delete().eq('id', sched.id);
                  if (error) toast.error('Failed to remove');
                  else { toast.success('Schedule removed'); setSelectedDate(null); fetchSchedules(); }
                }}
                className="btn-sm bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 btn flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
            <button onClick={saveDate} disabled={saving} className="btn-primary btn-sm flex items-center gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save Cities'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 text-neutral-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading schedules…
        </div>
      )}
    </div>
  );
}
