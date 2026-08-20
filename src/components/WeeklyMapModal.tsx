import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight, MapPin, Calendar, Clock,
  CheckCircle2, StickyNote, Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MapBooking {
  id: string;
  client_name: string | null;
  email: string;
  service_type: string;
  event_date: string;
  status: string;
  custom_note: string | null;
  custom_job_name: string | null;
}

interface ClientCity {
  email: string;
  city: string | null;
}

export default function WeeklyMapModal({ onClose, onSelectDate }: { onClose(): void; onSelectDate?(date: string): void }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookings, setBookings] = useState<MapBooking[]>([]);
  const [cityMap, setCityMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }), [weekStart]);

  const weekLabel = `${weekDays[0].toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const dateKeys = useMemo(() => weekDays.map(d => d.toISOString().split('T')[0]), [weekDays]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [bkRes, clRes] = await Promise.all([
      supabase.from('bookings')
        .select('id,client_name,email,service_type,event_date,status,custom_note,custom_job_name')
        .in('event_date', dateKeys)
        .in('status', ['pending', 'pre_book', 'approved']),
      supabase.from('clients').select('email,city'),
    ]);
    const cities: Record<string, string> = {};
    for (const c of (clRes.data || []) as ClientCity[]) {
      if (c.email) cities[c.email.toLowerCase()] = c.city?.trim() || 'Unknown';
    }
    setCityMap(cities);
    setBookings((bkRes.data || []) as MapBooking[]);
    setLoading(false);
  }, [dateKeys]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, MapBooking[]> = {};
    for (const b of bookings) {
      const dk = b.event_date?.split('T')[0];
      if (!dk) continue;
      if (!map[dk]) map[dk] = [];
      map[dk].push(b);
    }
    return map;
  }, [bookings]);

  const cityFor = (b: MapBooking) => cityMap[b.email?.toLowerCase()] || 'Unknown';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-neutral-200 shadow-card-lg w-full max-w-5xl max-h-[92vh] sm:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-600" />
            <h3 className="text-sm font-semibold text-neutral-900">Weekly City Map</h3>
          </div>
          <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
        </div>

        {/* Week nav */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-neutral-100 bg-neutral-50">
          <button onClick={() => setWeekOffset(w => w - 1)} className="btn-secondary btn-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />Prev
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-neutral-900">{weekLabel}</p>
            <p className="text-xs text-neutral-400">Week of {weekDays[0].toLocaleDateString('en-CA', { weekday: 'long' })}</p>
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)} className="btn-secondary btn-sm flex items-center gap-1">
            Next<ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-5 py-2.5 text-xs text-neutral-500 border-b border-neutral-100">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Pending / Pre-Book</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" />Confirmed</span>
        </div>

        {/* Day grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {weekDays.map((day, idx) => {
                const dk = day.toISOString().split('T')[0];
                const dayBookings = bookingsByDate[dk] || [];
                const isToday = new Date().toISOString().split('T')[0] === dk;
                const isWeekend = idx >= 5;

                const citiesMap: Record<string, MapBooking[]> = {};
                for (const b of dayBookings) {
                  const c = cityFor(b);
                  if (!citiesMap[c]) citiesMap[c] = [];
                  citiesMap[c].push(b);
                }
                const cities = Object.entries(citiesMap).sort((a, b) => a[0].localeCompare(b[0]));
                const pendingCount = dayBookings.filter(b => b.status === 'pending' || b.status === 'pre_book').length;
                const confirmedCount = dayBookings.filter(b => b.status === 'approved').length;

                return (
                  <div key={dk} className={`card overflow-hidden ${isToday ? 'ring-2 ring-brand-400' : ''} ${onSelectDate ? 'cursor-pointer' : ''}`}
                    onClick={() => onSelectDate?.(dk)}>
                    <div className={`px-3 py-2.5 border-b border-neutral-100 ${isWeekend ? 'bg-neutral-50' : 'bg-white'} ${isToday ? 'bg-brand-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-bold ${isToday ? 'text-brand-700' : 'text-neutral-900'}`}>
                            {day.toLocaleDateString('en-CA', { weekday: 'short' })}
                          </p>
                          <p className="text-xs text-neutral-400">{day.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {pendingCount > 0 && <span className="badge-yellow text-[10px]">{pendingCount} pend</span>}
                          {confirmedCount > 0 && <span className="badge-blue text-[10px]">{confirmedCount} conf</span>}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 space-y-2 max-h-56 overflow-y-auto">
                      {cities.length === 0 ? (
                        <p className="text-xs text-neutral-300 text-center py-4">No bookings</p>
                      ) : (
                        cities.map(([city, cityBookings]) => (
                          <div key={city} className="space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{city}
                              <span className="text-neutral-300 font-normal">({cityBookings.length})</span>
                            </p>
                            {cityBookings.map(b => {
                              const isPending = b.status === 'pending' || b.status === 'pre_book';
                              const dotColor = isPending ? 'bg-amber-400' : 'bg-blue-400';
                              return (
                                <div key={b.id} className="w-full text-left pl-3 pr-2 py-1.5 rounded-lg hover:bg-neutral-50 transition"
                                  onClick={(e) => { e.stopPropagation(); onSelectDate?.(dk); }}>
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
                                    <span className="text-xs font-medium text-neutral-800 truncate flex-1">
                                      {b.client_name || b.email}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 pl-4 mt-0.5">
                                    <span className="text-[10px] text-neutral-400">{b.service_type === 'Custom Job' ? (b.custom_job_name || 'Custom') : b.service_type}</span>
                                    {b.custom_note && (
                                      <span className="text-[10px] text-amber-600 flex items-center gap-0.5 truncate max-w-[100px]">
                                        <StickyNote className="w-2.5 h-2.5 flex-shrink-0" />{b.custom_note}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 px-5 py-3 border-t border-neutral-100 bg-neutral-50">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
              <p className="text-[11px] font-medium text-amber-700">Pending</p>
              <p className="text-lg font-bold text-amber-900">
                {dateKeys.reduce((s, dk) => s + (bookingsByDate[dk] || []).filter(b => b.status === 'pending' || b.status === 'pre_book').length, 0)}
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5">
              <p className="text-[11px] font-medium text-blue-700">Confirmed</p>
              <p className="text-lg font-bold text-blue-900">
                {dateKeys.reduce((s, dk) => s + (bookingsByDate[dk] || []).filter(b => b.status === 'approved').length, 0)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-2.5">
              <p className="text-[11px] font-medium text-neutral-500">Total</p>
              <p className="text-lg font-bold text-neutral-900">
                {dateKeys.reduce((s, dk) => s + (bookingsByDate[dk] || []).length, 0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
