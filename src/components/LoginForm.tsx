import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Waves, AlertTriangle, Delete } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface Technician {
  id: string;
  staff_id: string;
  first_name: string;
  last_name: string;
  role: string;
  pin: string;
  is_active: boolean;
}

export default function LoginForm() {
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [pin, setPin] = useState('');
  const [showAdminWarning, setShowAdminWarning] = useState(false);
  const [pinError, setPinError] = useState(false);

  useEffect(() => { loadTechnicians(); }, []);

  const loadTechnicians = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('technicians')
      .select('id, staff_id, first_name, last_name, role, pin, is_active')
      .eq('is_active', true)
      .order('first_name', { ascending: true });
    if (error) { toast.error('Failed to load users'); setLoading(false); return; }
    setTechnicians(data || []);
    setLoading(false);
  };

  const selectUser = (tech: Technician) => {
    setSelectedTech(tech);
    setPin('');
    setPinError(false);
  };

  const appendPin = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setPinError(false);
    if (next.length === 4) attemptLogin(next);
  };

  const deletePin = () => {
    setPin(p => p.slice(0, -1));
    setPinError(false);
  };

  const attemptLogin = (enteredPin: string) => {
    if (!selectedTech) return;
    if (enteredPin !== selectedTech.pin) {
      setPinError(true);
      setPin('');
      toast.error('Incorrect PIN');
      return;
    }
    if (selectedTech.role === 'Admin') {
      setShowAdminWarning(true);
      return;
    }
    completeLogin();
  };

  const completeLogin = () => {
    if (!selectedTech) return;
    sessionStorage.setItem('technician', JSON.stringify({
      id: selectedTech.staff_id,
      staff_id: selectedTech.staff_id,
      name: `${selectedTech.first_name} ${selectedTech.last_name}`,
      first_name: selectedTech.first_name,
      last_name: selectedTech.last_name,
      role: selectedTech.role,
    }));
    toast.success(`Welcome, ${selectedTech.first_name}!`);
    navigate('/dashboard');
  };

  const PAD = ['1','2','3','4','5','6','7','8','9','','0','del'];

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-100 rounded-full opacity-60" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-brand-50 rounded-full opacity-80" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card-lg p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mb-4 shadow-card-md">
              <Waves className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-neutral-900">Piscines Novo</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Technician Portal</p>
          </div>

          {!selectedTech ? (
            /* User selection grid */
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3 text-center">Select your name</p>
              {loading ? (
                <div className="text-center py-8 text-neutral-400 text-sm">Loading…</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {technicians.map(tech => (
                    <button
                      key={tech.staff_id}
                      onClick={() => selectUser(tech)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-neutral-200 hover:border-brand-300 hover:bg-brand-50 transition-all group text-center"
                    >
                      <div className="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-brand-100 flex items-center justify-center font-bold text-sm text-neutral-600 group-hover:text-brand-700 transition-colors">
                        {tech.first_name[0]}{tech.last_name[0]}
                      </div>
                      <span className="text-xs font-semibold text-neutral-800 leading-tight">
                        {tech.first_name} {tech.last_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* PIN entry */
            <div>
              <button
                onClick={() => { setSelectedTech(null); setPin(''); setPinError(false); }}
                className="flex items-center gap-2 mb-5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                ← Back
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700 text-lg mx-auto mb-2">
                  {selectedTech.first_name[0]}{selectedTech.last_name[0]}
                </div>
                <p className="font-semibold text-neutral-900">{selectedTech.first_name} {selectedTech.last_name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">Enter your 4-digit PIN</p>
              </div>

              {/* PIN dots */}
              <div className="flex justify-center gap-3 mb-2">
                {[0,1,2,3].map(i => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      i < pin.length
                        ? pinError ? 'bg-red-500' : 'bg-brand-600'
                        : 'bg-neutral-200'
                    }`}
                  />
                ))}
              </div>
              {pinError && <p className="text-center text-xs text-red-500 mb-2">Incorrect PIN — try again</p>}

              {/* PIN hint (visible to user on screen) */}
              <p className="text-center text-[10px] text-neutral-300 mb-5">
                Your PIN: {selectedTech.pin}
              </p>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {PAD.map((key, idx) => {
                  if (key === '') return <div key={idx} />;
                  if (key === 'del') return (
                    <button
                      key={idx}
                      onClick={deletePin}
                      className="h-12 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors active:scale-95"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  );
                  return (
                    <button
                      key={idx}
                      onClick={() => appendPin(key)}
                      className={`h-12 rounded-xl border font-semibold text-lg transition-all active:scale-95 ${
                        pinError
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-neutral-200 text-neutral-800 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700'
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              {selectedTech.role === 'Admin' && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">Admin logins are monitored and logged.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-neutral-400 mt-5">
          Pool Service Management &mdash; Piscines Novo &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* Admin warning modal */}
      {showAdminWarning && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-card-lg max-w-sm w-full p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-base font-semibold text-neutral-900">Admin Login Warning</h2>
              <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                This login attempt will be recorded. Your IP address, approximate location,
                and device information may be sent to management.
              </p>
              <div className="flex gap-3 w-full mt-6">
                <button onClick={() => { setShowAdminWarning(false); setPin(''); }} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => { setShowAdminWarning(false); completeLogin(); }}
                  className="flex-1 btn btn-md bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
