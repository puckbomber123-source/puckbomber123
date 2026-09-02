import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Waves, BookOpen, ChevronDown, ChevronUp,
  AlertTriangle, Camera, CheckCircle2, Shield, Info,
} from 'lucide-react';
import {
  POOL_CATEGORIES,
  CLOSING_PROCEDURES,
  CLOSING_SAFETY_RULES,
  CLOSING_IDENTIFY_BEFORE_START,
  REQUIRED_FINAL_PHOTOS,
  type PoolCategory,
} from '../lib/closingProcedures';

export default function ProceduresGuides() {
  const navigate = useNavigate();
  const [selectedPool, setSelectedPool] = useState<PoolCategory>('above-ground-liner');
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([0]));

  const toggleStep = (idx: number) => {
    setOpenSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const steps = CLOSING_PROCEDURES[selectedPool];

  return (
    <div className="page-shell">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="btn-icon">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-600" />
              <span className="font-semibold text-neutral-900">Procedures & Guides</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="page-content max-w-3xl space-y-5">
        {/* Pool type selector */}
        <div>
          <h1 className="page-title">Pool Closing Procedures</h1>
          <p className="page-subtitle mb-4">Select the pool type to view the correct closing procedure.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {POOL_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => { setSelectedPool(cat.key); setOpenSteps(new Set([0])); }}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  selectedPool === cat.key
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-300'
                }`}
              >
                {cat.shortLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Safety rules */}
        <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 bg-red-100/60 flex items-center gap-2 border-b border-red-200">
            <Shield className="w-5 h-5 text-red-600" />
            <span className="font-bold text-red-800 text-sm uppercase tracking-wide">Important Safety Rules</span>
          </div>
          <div className="px-5 py-4 space-y-2">
            {CLOSING_SAFETY_RULES.map((rule, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-red-100 border border-red-300 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-red-600">{i + 1}</span>
                </span>
                <span className="text-sm text-red-800 leading-snug">{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Identify before starting */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 bg-amber-100/60 flex items-center gap-2 border-b border-amber-200">
            <Info className="w-5 h-5 text-amber-600" />
            <span className="font-bold text-amber-800 text-sm uppercase tracking-wide">Identify Before Starting</span>
          </div>
          <div className="px-5 py-4 space-y-2">
            {CLOSING_IDENTIFY_BEFORE_START.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <span className="text-sm text-amber-800 leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Procedure steps */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-800 px-1">
            {POOL_CATEGORIES.find(c => c.key === selectedPool)?.label}
          </h2>
          {steps.map((step, idx) => {
            const isOpen = openSteps.has(idx);
            return (
              <div key={idx} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleStep(idx)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 transition-colors"
                >
                  <span className="font-semibold text-neutral-800 text-sm">{step.title}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 space-y-2.5">
                    {step.instructions.map((instr, j) => (
                      <div key={j} className="flex items-start gap-2.5">
                        <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                        <span className="text-sm text-neutral-700 leading-relaxed">{instr}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Required final photos */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 bg-teal-100/60 flex items-center gap-2 border-b border-teal-200">
            <Camera className="w-5 h-5 text-teal-600" />
            <span className="font-bold text-teal-800 text-sm uppercase tracking-wide">Required Final Photos for Every Closing</span>
          </div>
          <div className="px-5 py-4 space-y-2">
            {REQUIRED_FINAL_PHOTOS.map((photo, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Camera className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                <span className="text-sm text-teal-800 leading-snug">{photo}</span>
              </div>
            ))}
            <p className="text-xs text-teal-700 font-medium pt-2 border-t border-teal-200 mt-2">
              Do not close the job until pictures clearly show the correct procedure was completed.
            </p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-3 bg-neutral-50 border border-neutral-200 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-neutral-600 leading-relaxed">
            Always follow the procedure for the specific pool type. When in doubt about any step, contact a senior technician before proceeding.
          </p>
        </div>
      </main>
    </div>
  );
}
