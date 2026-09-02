import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Plus } from 'lucide-react';

export const POOL_CLOSING_ADD_ONS = [
  'Pools Over 512 sq ft (16′ x 32′)',
  'Pools Over 650 sq ft (18′ x 36′ or larger)',
  'Cover Installation',
  'Elastic Cover Installation',
  'Salt Cell Cleaning',
  'Gizmo',
  'Return Plug',
  'Yellow Cover Picks',
] as const;

export type PoolClosingAddOn = typeof POOL_CLOSING_ADD_ONS[number];

export function parseAddOns(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
}

export function serializeAddOns(items: string[]): string {
  return items.join(', ');
}

interface AddOnPickerProps {
  selected: string[];
  onChange: (items: string[]) => void;
  disabled?: boolean;
  label?: string;
}

export function AddOnPicker({ selected, onChange, disabled, label = 'Add-Ons' }: AddOnPickerProps) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  const toggle = (opt: string) => {
    if (disabled) return;
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (!val || disabled) return;
    if (!selected.includes(val)) onChange([...selected, val]);
    setCustomInput('');
  };

  const remove = (item: string) => {
    if (disabled) return;
    onChange(selected.filter(s => s !== item));
  };

  return (
    <div ref={ref} className="relative">
      <label className="form-label font-semibold text-neutral-700">{label}</label>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-brand-200 bg-white text-sm text-neutral-700 hover:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <span className={`flex items-center gap-2 ${selected.length === 0 ? 'text-neutral-400' : 'text-neutral-800 font-medium'}`}>
          {selected.length === 0 ? 'Select add-ons…' : (
            <>
              <Check className="w-4 h-4 text-brand-600" />
              {selected.length} selected
            </>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-brand-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium">
              {s}
              {!disabled && (
                <button type="button" onClick={() => remove(s)} className="hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {open && !disabled && (
        <div className="absolute z-[9999] mt-1 w-full max-h-72 overflow-y-auto bg-white border-2 border-brand-200 rounded-xl shadow-2xl">
          {POOL_CLOSING_ADD_ONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left transition-colors hover:bg-neutral-50 border-b border-neutral-50 last:border-0 ${
                selected.includes(opt) ? 'bg-brand-50 text-brand-800 font-medium' : 'text-neutral-700'
              }`}
            >
              <span className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                selected.includes(opt) ? 'bg-brand-600 border-brand-600' : 'border-neutral-300'
              }`}>
                {selected.includes(opt) && <Check className="w-3 h-3 text-white" />}
              </span>
              <span>{opt}</span>
            </button>
          ))}

          <div className="flex items-center gap-2 px-4 py-3 border-t border-neutral-100 bg-neutral-50">
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              placeholder="Custom add-on…"
              className="flex-1 text-sm rounded-lg border border-neutral-200 px-3 py-2 focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            />
            <button
              type="button"
              onClick={addCustom}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
