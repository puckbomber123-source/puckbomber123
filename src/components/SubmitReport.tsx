import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { POOL_CLOSING_ADD_ONS, parseAddOns } from '../lib/addons';
import { CLOSING_CHECKLISTS, categorizePoolType, POOL_CATEGORIES } from '../lib/closingProcedures';
import { uploadToR2, buildR2Path } from '../lib/r2';
import { saveDraft, loadDraft, deleteDraft } from '../lib/offlineDb';
import {
  ArrowLeft,
  Camera,
  Upload,
  X,
  Check,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  WifiOff,
  RefreshCw,
  Clock,
  DollarSign,
  FileText,
  User,
  Send,
  BookOpen,
  Waves,
} from 'lucide-react';

interface LocationState {
  assignmentId?: string;
  clientEmail?: string;
  serviceType?: string;
  serviceDate?: string;
  reportId?: string;
  returnTo?: {
    path: string;
    date?: string;
    assignmentId?: string;
  };
}

interface ClientData {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pool_type: string;
  pool_cover: string;
  pool_opening: string;
  pool_opening_add_on: string;
  pool_size?: string;
}

interface PhotoSlot {
  url: string;
  preview: string;
  file?: File;
}

interface SwimReadyChecklist {
  winter_plu: string[];
  pool_reins: string[];
  pool_light: string[];
  equip_2nd: string[];
  garden_hos: string[];
  cement_poo: string[];
  final_insp: string[];
}

interface ReportDraft {
  serviceDate: string;
  serviceType: string;
  openingType: string;
  openingAddOns: string[];
  closingAddOns: string[];
  closingChecklist: string[];
  leadTechnician: string;
  technicianIds: string[];
  clientPaidCash: boolean;
  cashAmount: string;
  propertyLeftClean: boolean;
  serviceNotComplete: boolean;
  completedTime: string;
  preStartChecklist: string[];
  linerPullInspection: boolean;
  swimReadyChecklist: SwimReadyChecklist;
  winterPlug: string[];
  poolReinstallation: string[];
  poolLight: string[];
  poolPump: string[];
  valvesPlumbing: string[];
  sandFilter: string[];
  cartridgeFilter: string[];
  saltSystem: string[];
  chlorinator: string[];
  heater: string[];
  aboveGround: string[];
  gardenHose: string[];
  cementPool: string[];
  marketing: string[];
  finalInspection: string[];
  technicianNotes: string;
  photoPoolArea: string;
  photoPoolEquipment: string;
  photoExtra: string;
  photoRemovedParts: string;
  poolTypeOverride: string;
  returnPlugQty: string;
  gizmoQty: string;
  yellowCoverPicksQty: string;
}

type SyncState =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'syncing'
  | 'emailing'
  | 'synced'
  | 'offline'
  | 'error'
  | 'email_failed';

interface ChecklistSubsection {
  key: keyof SwimReadyChecklist;
  title: string;
  options: string[];
  note?: React.ReactNode;
  cementOnly?: boolean;
}

const SERVICE_NOT_COMPLETE_MARKER = '[SERVICE NOT COMPLETE]';

// Technicians are loaded from the DB; this is the fallback placeholder
const TECHNICIANS_FALLBACK: string[] = [];

const SERVICE_TYPES = [
  'Pool Opening',
  'Pool Closing',
  'Liner Replacement',
  'Liner Measurement',
  'Pool Maintenance',
  'Service Call',
  'Leak Detection',
  'Pressure Test',
];

const OPENING_TYPES = [
  'Swim-Ready 1st Visit',
  'Silver Opening',
  '2nd Visit (Gold)',
];

const OPENING_ADD_ONS = [
  'Liner Vac',
  'Salt Cell Cleaning',
  'Salt/Chlorine',
  'Full Chemicals',
  'Cover Removal',
  'Oversized Pool',
];

function getClosingChecklist(poolType: string | null | undefined): string[] {
  return CLOSING_CHECKLISTS[categorizePoolType(poolType)];
}

const PRE_START = [
  'Confirmed client name and address',
  'Gate / backyard access obtained',
  'Pool cover removed and stored or folded',
  'Area around pool inspected for hazards',
  'Equipment pad visually checked before startup',
];

const EMPTY_SWIM_READY: SwimReadyChecklist = {
  winter_plu: [],
  pool_reins: [],
  pool_light: [],
  equip_2nd: [],
  garden_hos: [],
  cement_poo: [],
  final_insp: [],
};

const SWIM_READY_SUBSECTIONS: ChecklistSubsection[] = [
  {
    key: 'winter_plu',
    title: '1. Winter Plug Removal',
    options: ['Remove all winter plugs from return jets', 'Remove winter plugs from skimmer', 'Not applicable'],
    note: (
      <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3.5 space-y-1.5">
        <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">IMPORTANT — Skimmer Plug Verification</p>
        <p className="text-xs text-amber-700">Usually remove the <strong>FRONT</strong> skimmer plug.</p>
        <p className="text-xs text-amber-700">After removing plug, stick finger inside skimmer line. Technician SHOULD feel: open pipe, 90° elbow, clear plumbing path.</p>
        <p className="text-xs text-amber-700">If you feel rocks, sand, or a plug upside down — you removed the <strong>WRONG plug</strong>. Check the other location.</p>
      </div>
    ),
  },
  {
    key: 'pool_reins',
    title: '2. Pool Reinstallation',
    options: ['Install Bottom Drain Cover', 'Install Return Jets', 'Leave Skimmer Basket available for 2nd visit', 'Leave Skimmer Flap available for 2nd visit', 'Not applicable'],
  },
  {
    key: 'pool_light',
    title: '3. Pool Light',
    options: ['Pool light is properly installed', 'Not applicable'],
    note: (
      <div className="mt-3 rounded-xl bg-brand-50 border border-brand-200 p-3.5 space-y-1.5">
        <p className="text-xs font-bold text-brand-800 uppercase tracking-wide">If light screw is missing:</p>
        <ul className="text-xs text-brand-700 space-y-0.5 list-disc list-inside">
          <li>Use spare screws from toolbox kit</li>
          <li>If light still cannot be secured, leave safely on top ledge</li>
          <li>Mention in report and ask client if they have a spare screw</li>
        </ul>
      </div>
    ),
  },
  {
    key: 'equip_2nd',
    title: '4. Equipment Ready for 2nd Visit',
    options: [
      'Pool Pump — gaskets & plugs OK',
      'Pool Pump — gaskets/plugs MISSING',
      'Plumbing — OK',
      'Plumbing — MISSING/issue',
      'Salt Cell & Board — OK',
      'Salt Cell & Board — MISSING/issue',
      'Chlorinator — OK',
      'Chlorinator — MISSING/issue',
      'Not applicable',
    ],
  },
  {
    key: 'garden_hos',
    title: '5. Garden Hose Refill',
    options: ['Pool is being refilled in SHALLOW END'],
  },
  {
    key: 'cement_poo',
    title: '6. Cement Pool — Acid Wash',
    options: ['Acid wash complete', 'Not applicable'],
    cementOnly: true,
  },
  {
    key: 'final_insp',
    title: '7. Final Inspection',
    options: ['No tools left behind', 'Not applicable'],
  },
];

function isCementPool(poolType: string): boolean {
  const normalized = poolType.toLowerCase();
  return normalized.includes('cement') || normalized.includes('concrete') || normalized.includes('gunite');
}

function isSeniorOrAdmin(role: string): boolean {
  return role === 'Pool Tech Senior' || role === 'Admin';
}

function nowLocalTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}


function normalizeIncomingOpeningType(value?: string): string {
  if (!value) return '';
  if (value === 'Swim Ready') return 'Swim-Ready 1st Visit';
  if (value === 'Gold Opening') return '2nd Visit (Gold)';
  return value;
}

function isoToLocalTime(value?: string | null): string {
  if (!value) return nowLocalTimeString();
  try {
    const d = new Date(value);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return nowLocalTimeString();
  }
}

function parseTechnicianNotes(raw?: string | null): {
  serviceNotComplete: boolean;
  notes: string;
} {
  const text = raw || '';
  const serviceNotComplete = text.includes(SERVICE_NOT_COMPLETE_MARKER);
  const notes = text.replace(SERVICE_NOT_COMPLETE_MARKER, '').trim();
  return { serviceNotComplete, notes };
}

function buildTechnicianNotes(draft: ReportDraft): string {
  const notes = draft.technicianNotes.trim();

  if (draft.serviceNotComplete) {
    return `${SERVICE_NOT_COMPLETE_MARKER}\n${notes}`.trim();
  }

  return notes;
}

const EMPTY_DRAFT: ReportDraft = {
  serviceDate: new Date().toISOString().split('T')[0],
  serviceType: '',
  openingType: '',
  openingAddOns: [],
  closingAddOns: [],
  closingChecklist: [],
  leadTechnician: '',
  technicianIds: [],
  clientPaidCash: false,
  cashAmount: '',
  propertyLeftClean: false,
  serviceNotComplete: false,
  completedTime: nowLocalTimeString(),
  preStartChecklist: [],
  linerPullInspection: false,
  swimReadyChecklist: { ...EMPTY_SWIM_READY },
  winterPlug: [],
  poolReinstallation: [],
  poolLight: [],
  poolPump: [],
  valvesPlumbing: [],
  sandFilter: [],
  cartridgeFilter: [],
  saltSystem: [],
  chlorinator: [],
  heater: [],
  aboveGround: [],
  gardenHose: [],
  cementPool: [],
  marketing: [],
  finalInspection: [],
  technicianNotes: '',
  photoPoolArea: '',
  photoPoolEquipment: '',
  photoExtra: '',
  photoRemovedParts: '',
  poolTypeOverride: '',
  returnPlugQty: '',
  gizmoQty: '',
  yellowCoverPicksQty: '',
};

function photoFromUrl(url?: string | null): PhotoSlot | null {
  if (!url) return null;
  return { url, preview: url };
}

function SectionCard({
  title,
  children,
  collapsible = false,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-visible mb-4">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => collapsible && setOpen(!open)}
      >
        <span className="font-semibold text-neutral-800 text-base">{title}</span>
        {collapsible && (open ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />)}
      </button>

      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function ChecklistSection({
  label,
  items,
  checked,
  onChange,
}: {
  label: string;
  items: string[];
  checked: string[];
  onChange: (items: string[]) => void;
}) {
  const toggle = (item: string) => {
    onChange(checked.includes(item) ? checked.filter(c => c !== item) : [...checked, item]);
  };

  return (
    <div>
      <p className="text-sm font-medium text-neutral-600 mb-2">{label}</p>

      <div className="space-y-2">
        {items.map(item => (
          <label key={item} className="flex items-start gap-3 cursor-pointer group py-1.5">
            <span
              className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                checked.includes(item) ? 'bg-brand-600 border-brand-600' : 'border-neutral-300 group-hover:border-brand-400'
              }`}
            >
              {checked.includes(item) && <CheckCircle className="w-3 h-3 text-white" />}
            </span>

            <span className="text-sm text-neutral-700 leading-snug">{item}</span>

            <input
              type="checkbox"
              className="sr-only"
              checked={checked.includes(item)}
              onChange={() => toggle(item)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function MultiSelectDropdown({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (items: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  };

  return (
    <div ref={ref} className="relative overflow-visible">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-700 hover:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
      >
        <span className={selected.length === 0 ? 'text-neutral-400' : 'text-neutral-800'}>
          {selected.length === 0 ? 'Select all that apply…' : `${selected.length} selected`}
        </span>

        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium">
              {s}

              <button type="button" onClick={() => toggle(s)} className="hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-[9999] mt-1 w-full max-h-72 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-xl">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left transition-colors hover:bg-neutral-50 border-b border-neutral-50 last:border-0 ${
                selected.includes(opt) ? 'bg-brand-50 text-brand-800 font-medium' : 'text-neutral-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                  selected.includes(opt) ? 'bg-brand-600 border-brand-600' : 'border-neutral-300'
                }`}
              >
                {selected.includes(opt) && <Check className="w-3 h-3 text-white" />}
              </span>

              <span>{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const OWN_HOSE_OPTION = 'We installed our own hose';

function SwimReadyChecklistSection({
  subsection,
  value,
  onChange,
  isCement,
}: {
  subsection: ChecklistSubsection;
  value: string[];
  onChange: (items: string[]) => void;
  isCement: boolean;
}) {
  if (subsection.cementOnly && !isCement) return null;

  const isGarden = subsection.key === 'garden_hos';
  const toggleOwnHose = () => {
    onChange(value.includes(OWN_HOSE_OPTION) ? value.filter(v => v !== OWN_HOSE_OPTION) : [...value, OWN_HOSE_OPTION]);
  };

  const toggleItem = (item: string) => {
    const cur = (value || []).filter(v => v !== OWN_HOSE_OPTION);
    const hasOwnHose = value.includes(OWN_HOSE_OPTION);
    const updated = cur.includes(item) ? cur.filter(c => c !== item) : [...cur, item];
    onChange(hasOwnHose ? [...updated, OWN_HOSE_OPTION] : updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm mb-3">
      <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-neutral-800">{subsection.title}</h3>

        {subsection.cementOnly && (
          <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
            REQUIRED
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-2">
        {subsection.options.map(item => {
          const checked = (value || []).filter(v => v !== OWN_HOSE_OPTION).includes(item);
          return (
            <label key={item} className="flex items-start gap-3 cursor-pointer group py-2 px-3 rounded-xl hover:bg-neutral-50 transition-colors">
              <span
                className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                  checked ? 'bg-brand-600 border-brand-600' : 'border-neutral-300 group-hover:border-brand-400'
                }`}
              >
                {checked && <CheckCircle className="w-3 h-3 text-white" />}
              </span>
              <span className="text-sm text-neutral-700 leading-snug">{item}</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => toggleItem(item)}
              />
            </label>
          );
        })}

        {isGarden && (
          <label className="flex items-start gap-3 cursor-pointer group py-2 px-3 rounded-xl transition-colors hover:bg-red-50 mt-1">
            <span
              className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                value.includes(OWN_HOSE_OPTION) ? 'bg-red-600 border-red-600' : 'border-red-400 group-hover:border-red-500'
              }`}
            >
              {value.includes(OWN_HOSE_OPTION) && <Check className="w-3 h-3 text-white" />}
            </span>
            <span className="text-sm font-bold text-red-700 leading-snug">We installed our own hose</span>
            <input
              type="checkbox"
              className="sr-only"
              checked={value.includes(OWN_HOSE_OPTION)}
              onChange={toggleOwnHose}
            />
          </label>
        )}

        {subsection.note}
      </div>
    </div>
  );
}

function PhotoUploadSlot({
  label,
  required,
  value,
  onCapture,
  onRemove,
}: {
  label: string;
  required?: boolean;
  value: PhotoSlot | null;
  onCapture: (file: File) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <p className="text-sm font-medium text-neutral-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </p>

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-neutral-200">
          <img src={value.preview} alt={label} className="w-full h-48 object-cover" />

          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>

          {value.url && !value.file && (
            <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-lg">
              Uploaded
            </div>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed border-neutral-200 rounded-xl p-6 flex flex-col items-center gap-3 bg-neutral-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700"
            >
              <Camera className="w-4 h-4" /> Camera
            </button>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50"
            >
              <Upload className="w-4 h-4" /> Gallery
            </button>
          </div>

          <p className="text-xs text-neutral-400">JPG, PNG, HEIC — max 10MB</p>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onCapture(f);
              e.target.value = '';
            }}
          />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onCapture(f);
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
}

function SyncBadge({ state }: { state: SyncState }) {
  const config: Record<SyncState, { icon: React.ReactNode; text: string; cls: string }> = {
    idle: { icon: null, text: '', cls: '' },
    saving: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: 'Saving draft…', cls: 'text-neutral-500' },
    saved: { icon: <CheckCircle className="w-3 h-3" />, text: 'Draft saved', cls: 'text-green-600' },
    syncing: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: 'Saving report…', cls: 'text-brand-600' },
    emailing: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: 'Sending email…', cls: 'text-brand-600' },
    synced: { icon: <CheckCircle className="w-3 h-3" />, text: 'Email sent', cls: 'text-green-600' },
    offline: { icon: <WifiOff className="w-3 h-3" />, text: 'Offline — saved locally', cls: 'text-amber-600' },
    error: { icon: <RefreshCw className="w-3 h-3" />, text: 'Save failed', cls: 'text-red-600' },
    email_failed: { icon: <AlertTriangle className="w-3 h-3" />, text: 'Email failed', cls: 'text-red-600' },
  };

  const c = config[state];
  if (!c.text) return null;

  return <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.cls}`}>{c.icon}{c.text}</span>;
}

function InfoField({
  label,
  value,
  span,
  highlight,
}: {
  label: string;
  value: string;
  span?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-xs text-neutral-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-amber-700 font-bold' : 'text-neutral-800'}`}>
        {value || '—'}
      </p>
    </div>
  );
}

export default function SubmitReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const techRaw = sessionStorage.getItem('technician') || '{}';
  const tech = JSON.parse(techRaw) as { id: string; name: string; role: string; staff_id?: string };
  const isSenior = isSeniorOrAdmin(tech.role || '');
  const defaultLeadTechnician = tech.name || '';

  const [technicianNames, setTechnicianNames] = useState<string[]>(TECHNICIANS_FALLBACK);

  const draftKey = `report-draft-${state.assignmentId || 'standalone'}-${tech.id || tech.staff_id || 'unknown'}`;

  const [client, setClient] = useState<ClientData | null>(null);
  const [clientLoading, setClientLoading] = useState(false);

  const [draft, setDraft] = useState<ReportDraft>({
    ...EMPTY_DRAFT,
    serviceType: state.serviceType || '',
    serviceDate: state.serviceDate || new Date().toISOString().split('T')[0],
    completedTime: nowLocalTimeString(),
    leadTechnician: defaultLeadTechnician,
  });

  const [photoPoolArea, setPhotoPoolArea] = useState<PhotoSlot | null>(null);
  const [photoPoolEquip, setPhotoPoolEquip] = useState<PhotoSlot | null>(null);
  const [photoExtra, setPhotoExtra] = useState<PhotoSlot | null>(null);
  const [photoRemovedParts, setPhotoRemovedParts] = useState<PhotoSlot | null>(null);
  const [technicianRecords, setTechnicianRecords] = useState<{ id: string; first_name: string; last_name: string }[]>([]);

  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingReportId, setExistingReportId] = useState<string | null>(state.reportId || null);
  const [emailError, setEmailError] = useState('');
  const [hasEmailFailed, setHasEmailFailed] = useState(false);
  const [previousReportBlocked, setPreviousReportBlocked] = useState(false);

  const submitLock = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cement = !!(client?.pool_type && isCementPool(client.pool_type));
  const isOpening = draft.serviceType === 'Pool Opening';
  const isSwimReady = isOpening && draft.openingType === 'Swim-Ready 1st Visit';
  const isClosing = draft.serviceType === 'Pool Closing';
  const effectivePoolType = draft.poolTypeOverride || client?.pool_type || '';

  const goBackToAssignment = useCallback(() => {
    const isAssistantRole = tech.role === 'Assistant Pool Tech';

    if (isAssistantRole) {
      navigate('/my-route');
      return;
    }

    navigate(state.returnTo?.path || '/team-assignments', {
      state: {
        date: state.returnTo?.date || draft.serviceDate,
        scrollToAssignmentId: state.returnTo?.assignmentId || state.assignmentId,
      },
      replace: false,
    });
  }, [navigate, state.returnTo?.path, state.returnTo?.date, state.returnTo?.assignmentId, state.assignmentId, draft.serviceDate, tech.role]);

  useEffect(() => {
    supabase
      .from('technicians')
      .select('id,first_name,last_name')
      .eq('is_active', true)
      .order('first_name')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const records = data.map((t: { id: string; first_name: string; last_name: string }) => ({ id: t.id, first_name: t.first_name, last_name: t.last_name }));
          setTechnicianRecords(records);
          setTechnicianNames(records.map(t => `${t.first_name} ${t.last_name}`.trim()));
        }
      });
  }, []);

  useEffect(() => {
    const email = state.clientEmail;
    if (!email) return;

    setClientLoading(true);

    supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setClient(data as ClientData);
      })
      .finally(() => setClientLoading(false));
  }, [state.clientEmail]);

  useEffect(() => {
    const loadExistingReport = async () => {
      let reportQuery = supabase.from('service_reports').select('*');

      if (state.reportId) {
        reportQuery = reportQuery.eq('id', state.reportId);
      } else if (state.assignmentId) {
        reportQuery = reportQuery.eq('assignment_id', state.assignmentId);
      } else {
        return;
      }

      const { data, error } = await reportQuery.maybeSingle();

      if (error || !data) return;

      const parsedNotes = parseTechnicianNotes(data.technician_notes);

      setExistingReportId(data.id);

      setDraft(prev => ({
        ...prev,
        serviceDate: data.service_date || prev.serviceDate,
        serviceType: data.service_type || prev.serviceType,
        openingType: normalizeIncomingOpeningType(data.opening_type || ''),
        openingAddOns: data.opening_add_ons || [],
        closingAddOns: data.closing_add_ons || [],
        closingChecklist: data.closing_checklist || [],
        leadTechnician: data.lead_technician || prev.leadTechnician,
        clientPaidCash: !!data.client_paid_cash,
        cashAmount: data.cash_amount != null ? String(data.cash_amount) : '',
        propertyLeftClean: !!data.property_left_clean,
        serviceNotComplete: parsedNotes.serviceNotComplete,
        completedTime: isoToLocalTime(data.completed_time),
        preStartChecklist: data.pre_start_checklist || [],
        linerPullInspection: !!data.liner_pull_inspection,
        swimReadyChecklist: (() => {
          const cd = data.checklist_data;
          if (cd && (cd.equip_2nd !== undefined || cd.winter_plu !== undefined)) {
            return {
              winter_plu: cd.winter_plu || [],
              pool_reins: cd.pool_reins || [],
              pool_light: cd.pool_light || [],
              equip_2nd: cd.equip_2nd || cd.pool_pump || [],
              garden_hos: cd.garden_hos || [],
              cement_poo: cd.cement_poo || [],
              final_insp: cd.final_insp || [],
            };
          }
          return {
            winter_plu: data.winter_plug || [],
            pool_reins: data.pool_reinstallation || [],
            pool_light: data.pool_light || [],
            equip_2nd: data.pool_pump || [],
            garden_hos: data.garden_hose || [],
            cement_poo: data.cement_pool || [],
            final_insp: data.final_inspection || [],
          };
        })(),
        winterPlug: data.winter_plug || [],
        poolReinstallation: data.pool_reinstallation || [],
        poolLight: data.pool_light || [],
        poolPump: data.pool_pump || [],
        valvesPlumbing: data.valves_plumbing || [],
        sandFilter: data.sand_filter || [],
        cartridgeFilter: data.cartridge_filter || [],
        saltSystem: data.salt_system || [],
        chlorinator: data.chlorinator || [],
        heater: data.heater || [],
        aboveGround: data.above_ground || [],
        gardenHose: data.garden_hose || [],
        cementPool: data.cement_pool || [],
        marketing: data.marketing || [],
        finalInspection: data.final_inspection || [],
        technicianNotes: parsedNotes.notes,
        photoPoolArea: data.photo_pool_area || '',
        photoPoolEquipment: data.photo_pool_equipment || '',
        photoExtra: data.photo_extra || '',
        photoRemovedParts: data.photo_removed_parts || '',
        poolTypeOverride: data.pool_type_override || '',
        returnPlugQty: data.return_plug_qty != null ? String(data.return_plug_qty) : '',
        gizmoQty: data.gizmo_qty != null ? String(data.gizmo_qty) : '',
        yellowCoverPicksQty: data.yellow_cover_picks_qty != null ? String(data.yellow_cover_picks_qty) : '',
      }));

      setPhotoPoolArea(photoFromUrl(data.photo_pool_area));
      setPhotoPoolEquip(photoFromUrl(data.photo_pool_equipment));
      setPhotoExtra(photoFromUrl(data.photo_extra));
      setPhotoRemovedParts(photoFromUrl(data.photo_removed_parts));

      const { data: techRows } = await supabase
        .from('report_technicians')
        .select('technician_name')
        .eq('report_id', data.id);
      if (techRows && techRows.length > 0) {
        const names = techRows.map((r: { technician_name: string }) => r.technician_name);
        setDraft(prev => ({
          ...prev,
          leadTechnician: names[0] || prev.leadTechnician,
          technicianIds: names.slice(1),
        }));
      }

      setSyncState('saved');
    };

    loadExistingReport();
  }, [state.reportId, state.assignmentId]);

  useEffect(() => {
    loadDraft<ReportDraft>(draftKey).then(saved => {
      if (saved && !existingReportId) {
        setDraft(prev => ({
          ...prev,
          ...saved,
          openingType: normalizeIncomingOpeningType(saved.openingType),
          leadTechnician: saved.leadTechnician || defaultLeadTechnician,
          serviceNotComplete: !!saved.serviceNotComplete,
        }));

        setSyncState('saved');
      }
    });
  }, [draftKey, defaultLeadTechnician, existingReportId]);

  useEffect(() => {
    if (tech.role !== 'Assistant Pool Tech' || !state.assignmentId || existingReportId) return;
    (async () => {
      const { data: currentAssignment } = await supabase
        .from('team_daily_assignments')
        .select('assignment_date, team, sort_order, display_closing_add_ons, display_opening_add_ons, service_type')
        .eq('id', state.assignmentId)
        .maybeSingle();
      if (!currentAssignment) return;
      if (currentAssignment.display_closing_add_ons && currentAssignment.service_type === 'Pool Closing') {
        setDraft(prev => prev.serviceType === 'Pool Closing' && prev.closingAddOns.length === 0
          ? { ...prev, closingAddOns: parseAddOns(currentAssignment.display_closing_add_ons) }
          : prev);
      }
      if (currentAssignment.display_opening_add_ons && currentAssignment.service_type === 'Pool Opening') {
        setDraft(prev => prev.serviceType === 'Pool Opening' && prev.openingAddOns.length === 0
          ? { ...prev, openingAddOns: parseAddOns(currentAssignment.display_opening_add_ons) }
          : prev);
      }
      const { data: earlier } = await supabase
        .from('team_daily_assignments')
        .select('id, report_completed')
        .eq('assignment_date', currentAssignment.assignment_date)
        .eq('team', currentAssignment.team)
        .lt('sort_order', currentAssignment.sort_order);
      if (earlier && earlier.some(a => !a.report_completed)) {
        setPreviousReportBlocked(true);
      }
    })();
  }, [state.assignmentId, existingReportId, tech.role]);

  const scheduleSave = useCallback((d: ReportDraft) => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    setSyncState('saving');

    autosaveTimer.current = setTimeout(async () => {
      await saveDraft(draftKey, d);
      setSyncState('saved');
    }, 800);
  }, [draftKey]);

  const update = useCallback(<K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => {
    setDraft(prev => {
      const next = { ...prev, [key]: value };

      if (key === 'serviceType' && value !== 'Pool Opening') {
        next.openingType = '';
        next.openingAddOns = [];
        next.swimReadyChecklist = { ...EMPTY_SWIM_READY };
      }
      if (key === 'serviceType' && value !== 'Pool Closing') {
        next.closingChecklist = [];
        next.returnPlugQty = '';
        next.gizmoQty = '';
        next.yellowCoverPicksQty = '';
      }

      if (key === 'openingType' && value !== 'Swim-Ready 1st Visit') {
        next.swimReadyChecklist = { ...EMPTY_SWIM_READY };
      }

      scheduleSave(next);
      return next;
    });

    if (hasEmailFailed) setEmailError('');
  }, [scheduleSave, hasEmailFailed]);

  const handlePhoto = async (
    file: File,
    _slot: 'pool_area' | 'pool_equipment' | 'extra' | 'removed_parts',
    setter: React.Dispatch<React.SetStateAction<PhotoSlot | null>>
  ) => {
    const preview = URL.createObjectURL(file);
    setter({ url: '', preview, file });

    if (hasEmailFailed) setEmailError('');
  };

  const uploadPhoto = async (file: File, slot: string, reportId: string): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = buildR2Path(reportId, `${slot}.${ext}`);
    return uploadToR2(file, path);
  };

  const validate = (): string | null => {
    if (previousReportBlocked) return 'Submit the report for your previous stop first';
    if (!draft.serviceDate) return 'Service date is required';
    if (!draft.serviceType) return 'Service type is required';
    if (!draft.leadTechnician) return 'At least one technician is required';
    if (draft.serviceType === 'Pool Opening' && !draft.openingType) return 'Opening type is required';
    if (draft.serviceNotComplete && !draft.technicianNotes.trim()) {
      return 'Explain why the service was not completed in technician notes';
    }
    if (!photoPoolArea) return 'Pool Area photo is required';
    if (!photoPoolEquip) return 'Pool Equipment photo is required';

    if (cement && isOpening) {
      const cementSelections = isSwimReady ? draft.swimReadyChecklist.cement_poo : draft.cementPool;
      if (!cementSelections || cementSelections.length === 0) {
        return 'Cement pool acid wash checklist must be completed';
      }
    }

    if (!isSenior && draft.preStartChecklist.length === 0) {
      return 'Pre-start checklist must have at least one item checked';
    }

    if (!draft.propertyLeftClean) {
      return 'You must confirm the property was left clean before submitting';
    }

    return null;
  };

  const getCompletedTimeIso = () => {
    try {
      const [h, m] = draft.completedTime.split(':').map(Number);
      const d = new Date(`${draft.serviceDate}T00:00:00`);
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  const saveReport = async (): Promise<{ reportId: string; areaUrl: string; equipUrl: string; extraUrl: string; removedPartsUrl: string }> => {
    const sDate = draft.serviceDate;
    const sType = draft.serviceType;

    // Use existing reportId or generate a stable one to use as the R2 path prefix
    const uploadReportId = existingReportId ?? crypto.randomUUID();

    let areaUrl = photoPoolArea?.url || '';
    let equipUrl = photoPoolEquip?.url || '';
    let extraUrl = photoExtra?.url || '';
    let removedPartsUrl = photoRemovedParts?.url || '';

    if (photoPoolArea?.file) {
      areaUrl = await uploadPhoto(photoPoolArea.file, 'pool-area', uploadReportId);
      setPhotoPoolArea(p => (p ? { ...p, url: areaUrl, file: undefined, preview: areaUrl } : p));
    }

    if (photoPoolEquip?.file) {
      equipUrl = await uploadPhoto(photoPoolEquip.file, 'pool-equipment', uploadReportId);
      setPhotoPoolEquip(p => (p ? { ...p, url: equipUrl, file: undefined, preview: equipUrl } : p));
    }

    if (photoExtra?.file) {
      extraUrl = await uploadPhoto(photoExtra.file, 'extra', uploadReportId);
      setPhotoExtra(p => (p ? { ...p, url: extraUrl, file: undefined, preview: extraUrl } : p));
    }

    if (photoRemovedParts?.file) {
      removedPartsUrl = await uploadPhoto(photoRemovedParts.file, 'removed-parts', uploadReportId);
      setPhotoRemovedParts(p => (p ? { ...p, url: removedPartsUrl, file: undefined, preview: removedPartsUrl } : p));
    }

    const reportPayload = {
      client_id: client?.id || null,
      client_email: state.clientEmail || client?.email || null,
      assignment_id: state.assignmentId || null,
      lead_technician: draft.leadTechnician,
      technician_id: tech.staff_id || tech.id || '',
      service_date: sDate,
      service_type: sType,
      opening_type: draft.openingType,
      opening_add_ons: draft.openingAddOns,
      closing_add_ons: draft.closingAddOns,
      closing_checklist: draft.closingChecklist,
      client_paid_cash: draft.clientPaidCash,
      cash_amount: draft.clientPaidCash && draft.cashAmount ? parseFloat(draft.cashAmount) : null,
      property_left_clean: draft.propertyLeftClean,
      pre_start_checklist: draft.preStartChecklist,
      liner_pull_inspection: draft.linerPullInspection,
      technician_notes: buildTechnicianNotes(draft),
      checklist_data: isSwimReady ? draft.swimReadyChecklist : null,
      winter_plug: isSwimReady ? draft.swimReadyChecklist.winter_plu : draft.winterPlug,
      pool_reinstallation: isSwimReady ? draft.swimReadyChecklist.pool_reins : draft.poolReinstallation,
      pool_light: isSwimReady ? draft.swimReadyChecklist.pool_light : draft.poolLight,
      pool_pump: isSwimReady ? draft.swimReadyChecklist.equip_2nd : draft.poolPump,
      valves_plumbing: isSwimReady ? [] : draft.valvesPlumbing,
      sand_filter: isSwimReady ? [] : draft.sandFilter,
      cartridge_filter: isSwimReady ? [] : draft.cartridgeFilter,
      salt_system: isSwimReady ? [] : draft.saltSystem,
      chlorinator: isSwimReady ? [] : draft.chlorinator,
      heater: isSwimReady ? [] : draft.heater,
      above_ground: isSwimReady ? [] : draft.aboveGround,
      garden_hose: isSwimReady ? draft.swimReadyChecklist.garden_hos : draft.gardenHose,
      cement_pool: isSwimReady ? draft.swimReadyChecklist.cement_poo : draft.cementPool,
      marketing: isSwimReady ? [] : draft.marketing,
      final_inspection: isSwimReady ? draft.swimReadyChecklist.final_insp : draft.finalInspection,
      photo_pool_area: areaUrl,
      photo_pool_equipment: equipUrl,
      photo_extra: extraUrl,
      photo_removed_parts: removedPartsUrl,
      pool_type_override: draft.poolTypeOverride || null,
      return_plug_qty: draft.closingAddOns.includes('Return Plug') && draft.returnPlugQty ? parseInt(draft.returnPlugQty) : null,
      gizmo_qty: draft.closingAddOns.includes('Gizmo') && draft.gizmoQty ? parseInt(draft.gizmoQty) : null,
      yellow_cover_picks_qty: draft.closingAddOns.includes('Yellow Cover Picks') && draft.yellowCoverPicksQty ? parseInt(draft.yellowCoverPicksQty) : null,
      completed_time: getCompletedTimeIso(),
      time_finished: new Date().toISOString(),
      sync_status: 'synced',
    };

    let reportId = existingReportId;

    if (!reportId && state.assignmentId) {
      const { data: existing, error: existingError } = await supabase
        .from('service_reports')
        .select('id')
        .eq('assignment_id', state.assignmentId)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing?.id) reportId = existing.id;
    }

    if (reportId) {
      const { data, error } = await supabase
        .from('service_reports')
        .update(reportPayload)
        .eq('id', reportId)
        .select('id')
        .single();

      if (error) throw error;

      setExistingReportId(data.id);
      reportId = data.id;
    } else {
      const { data, error } = await supabase
        .from('service_reports')
        .insert(reportPayload)
        .select('id')
        .single();

      if (error) throw error;

      setExistingReportId(data.id);
      reportId = data.id;
    }

    // Save technicians to junction table
    const allTechs = [draft.leadTechnician, ...draft.technicianIds].filter(Boolean);
    await supabase.from('report_technicians').delete().eq('report_id', reportId);
    if (allTechs.length > 0) {
      const techRows = allTechs.map(name => {
        const record = technicianRecords.find(t => `${t.first_name} ${t.last_name}` === name);
        return {
          report_id: reportId,
          technician_id: record?.id || name,
          technician_name: name,
        };
      });
      await supabase.from('report_technicians').insert(techRows);
    }

    return { reportId, areaUrl, equipUrl, extraUrl, removedPartsUrl };
  };

  const sendReportEmail = async (
    reportId: string,
    photoUrls: { areaUrl: string; equipUrl: string; extraUrl: string; removedPartsUrl: string },
    isResend = false
  ) => {
    const emailResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-report-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        reportId,
        to: 'theo@novopiscines.ca',
        client,
        draft: {
          ...draft,
          technicianNotes: buildTechnicianNotes(draft),
          leadTechnician: draft.leadTechnician,
        },
        techName: draft.leadTechnician,
        techStaffId: tech.staff_id || tech.id || '',
        technicianNames: [draft.leadTechnician, ...draft.technicianIds].filter(Boolean),
        photoUrls,
        isResend,
        serviceNotComplete: draft.serviceNotComplete,
      }),
    });

    const rawText = await emailResponse.text();
    let emailResult: unknown = null;

    try {
      emailResult = rawText ? JSON.parse(rawText) : null;
    } catch {
      emailResult = rawText;
    }

    if (!emailResponse.ok) {
      throw new Error(
        typeof emailResult === 'object' && emailResult !== null && 'error' in emailResult
          ? String((emailResult as { error: unknown }).error)
          : `Email failed with status ${emailResponse.status}`
      );
    }

    return emailResult;
  };

  const markAssignmentAfterReport = async (reportId: string) => {
    if (!state.assignmentId) return;

    const { error } = await supabase
      .from('team_daily_assignments')
      .update({
        report_completed: true,
        completed: !draft.serviceNotComplete,
        service_not_complete: draft.serviceNotComplete,
        cash_paid_amount: draft.clientPaidCash && draft.cashAmount ? parseFloat(draft.cashAmount) : null,
        linked_report_id: reportId,
        to_be_invoiced: !draft.serviceNotComplete,
      })
      .eq('id', state.assignmentId);

    if (error) {
      throw new Error('Email sent, but assignment could not be updated. Tell admin.');
    }

    // Advance the linked booking's job_status to ready_for_invoice
    if (!draft.serviceNotComplete) {
      await supabase
        .from('bookings')
        .update({ job_status: 'ready_for_invoice', updated_at: new Date().toISOString() })
        .eq('assignment_id', state.assignmentId)
        .in('job_status', ['awaiting_booking_request', 'booked', 'ready_for_invoice']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitLock.current || isSubmitting) return;

    const validationError = validate();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!navigator.onLine) {
      setSyncState('offline');
      toast('No internet connection — report saved locally. Submit again when reconnected.', {
        icon: '📵',
        duration: 5000,
      });
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setHasEmailFailed(false);
    setEmailError('');

    try {
      setSyncState('syncing');
      toast.loading(existingReportId ? 'Updating report...' : 'Saving report...', { id: 'report-submit' });

      const saved = await saveReport();

      setSyncState('emailing');
      toast.loading('Report saved. Sending email...', { id: 'report-submit' });

      await sendReportEmail(saved.reportId, {
        areaUrl: saved.areaUrl,
        equipUrl: saved.equipUrl,
        extraUrl: saved.extraUrl,
        removedPartsUrl: saved.removedPartsUrl,
      }, !!existingReportId || hasEmailFailed);

      await markAssignmentAfterReport(saved.reportId);

      await deleteDraft(draftKey);

      setSyncState('synced');
      setHasEmailFailed(false);
      setEmailError('');

      toast.success(
        draft.serviceNotComplete
          ? 'Report saved and emailed. Marked as not complete.'
          : existingReportId
          ? 'Report updated and email resent!'
          : 'Report saved and email sent!',
        { id: 'report-submit' }
      );

      setTimeout(goBackToAssignment, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.toLowerCase().includes('email')) {
        setSyncState('email_failed');
        setHasEmailFailed(true);
        setEmailError(msg);

        toast.error('Report saved, but email did not send. Edit if needed, then press submit again.', {
          id: 'report-submit',
          duration: 7000,
        });
      } else {
        setSyncState('error');

        toast.error(`Submit failed: ${msg}`, {
          id: 'report-submit',
          duration: 7000,
        });
      }
    } finally {
      setIsSubmitting(false);
      submitLock.current = false;
    }
  };

  const handleResendOnly = async () => {
    if (submitLock.current || isSubmitting) return;

    if (!existingReportId) {
      toast.error('No saved report found yet. Press submit first.');
      return;
    }

    if (!navigator.onLine) {
      setSyncState('offline');
      toast.error('No internet connection');
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setEmailError('');

    try {
      setSyncState('emailing');
      toast.loading('Resending email...', { id: 'report-resend' });

      await sendReportEmail(existingReportId, {
        areaUrl: photoPoolArea?.url || '',
        equipUrl: photoPoolEquip?.url || '',
        extraUrl: photoExtra?.url || '',
        removedPartsUrl: photoRemovedParts?.url || '',
      }, true);

      await markAssignmentAfterReport(existingReportId);
      await deleteDraft(draftKey);

      setSyncState('synced');
      setHasEmailFailed(false);

      toast.success('Email sent!', { id: 'report-resend' });

      setTimeout(goBackToAssignment, 900);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncState('email_failed');
      setHasEmailFailed(true);
      setEmailError(msg);

      toast.error(`Email failed again: ${msg}`, {
        id: 'report-resend',
        duration: 7000,
      });
    } finally {
      setIsSubmitting(false);
      submitLock.current = false;
    }
  };

  const submitButtonText = (() => {
    if (isSubmitting && syncState === 'syncing') return existingReportId ? 'Updating Report...' : 'Saving Report...';
    if (isSubmitting && syncState === 'emailing') return 'Sending Email...';
    if (hasEmailFailed) return 'Update Report + Resend Email';
    if (existingReportId) return 'Update Report + Resend Email';
    return 'Submit Report + Send Email';
  })();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={goBackToAssignment}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <h1 className="text-base font-bold text-neutral-900">
            {existingReportId ? 'Edit Service Report' : 'Service Report'}
          </h1>

          <SyncBadge state={syncState} />
        </div>
      </header>

      <form id="report-form" onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-5 pb-36">
        <div className="flex items-center gap-3 mb-5 px-1">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
            <User className="w-4 h-4 text-brand-600" />
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900">{tech.name || 'Technician'}</p>
            <p className="text-xs text-neutral-500">{tech.role || 'Role not set'}</p>
          </div>

          {isSenior && (
            <span className="ml-auto text-xs bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-3 py-1 font-medium">
              Senior — checklists optional
            </span>
          )}
        </div>

        {existingReportId && (
          <div className="mb-5 rounded-2xl bg-brand-50 border border-brand-200 p-4 flex gap-3">
            <FileText className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-brand-800 text-sm">Editing submitted report</p>
              <p className="text-brand-700 text-sm mt-0.5">
                Changes will update the saved report and send a new email.
              </p>
            </div>
          </div>
        )}

        {previousReportBlocked && (
          <div className="mb-5 rounded-2xl bg-amber-50 border-2 border-amber-400 p-4 flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 text-sm uppercase tracking-wide">Previous report required</p>
              <p className="text-amber-700 text-sm mt-0.5">
                You must submit the report for your previous stop before you can submit this one.
              </p>
            </div>
          </div>
        )}

        {hasEmailFailed && (
          <div className="mb-5 rounded-2xl bg-red-50 border-2 border-red-300 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />

              <div className="flex-1">
                <p className="font-bold text-red-800 text-sm uppercase tracking-wide">Email did not send</p>

                <p className="text-red-700 text-sm mt-1">
                  The report was saved, but the email failed. You can edit the report and submit again.
                </p>

                {emailError && (
                  <p className="text-xs text-red-600 mt-2 bg-white border border-red-200 rounded-lg p-2 break-words">
                    {emailError}
                  </p>
                )}

                {existingReportId && (
                  <button
                    type="button"
                    onClick={handleResendOnly}
                    disabled={isSubmitting}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Resend Email Only
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {cement && isOpening && (
          <div className="mb-5 rounded-2xl bg-amber-50 border-2 border-amber-400 p-4 flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 text-sm uppercase tracking-wide">Acid Wash Required</p>
              <p className="text-amber-700 text-sm mt-0.5">
                ACID WASH REQUIRED FOR ALL CEMENT POOL OPENINGS. Complete the acid wash checklist below before submitting.
              </p>
            </div>
          </div>
        )}

        <SectionCard title="Client Information">
          {clientLoading ? (
            <div className="flex items-center gap-2 text-neutral-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading client…</span>
            </div>
          ) : client ? (
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="Name" value={`${client.first_name} ${client.last_name}`} />
              <InfoField label="Email" value={client.email} />
              <InfoField label="Phone" value={client.phone} />
              <InfoField label="Pool Type" value={client.pool_type} highlight={cement} />
              <InfoField label="Address" value={`${client.address}, ${client.city}`} span />
              {client.pool_size && <InfoField label="Pool Size" value={client.pool_size} />}
              {draft.serviceType === 'Pool Opening' && client.pool_opening && <InfoField label="Opening Package" value={client.pool_opening} />}
              {draft.serviceType === 'Pool Opening' && client.pool_opening_add_on && <InfoField label="Add-ons" value={client.pool_opening_add_on} />}
              {draft.serviceType === 'Pool Opening' && client.pool_cover && <InfoField label="Pool Cover" value={client.pool_cover} />}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">
              {state.clientEmail ? 'Client not found in database.' : 'No client linked to this assignment.'}
            </p>
          )}
        </SectionCard>

        <SectionCard title="Service Details">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Service Date</label>
              <input
                type="date"
                value={draft.serviceDate}
                onChange={e => update('serviceDate', e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Service Type</label>
              <select
                value={draft.serviceType}
                onChange={e => update('serviceType', e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white disabled:opacity-60"
              >
                <option value="">Select service type…</option>
                {SERVICE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Technicians on Site <span className="text-red-500">*</span>
              </label>

              <div className="flex flex-wrap gap-2">
                {technicianNames.map(name => {
                  const selected = draft.leadTechnician === name || draft.technicianIds.includes(name);
                  return (
                    <button key={name} type="button" disabled={isSubmitting}
                      onClick={() => {
                        const isLead = draft.leadTechnician === name;
                        const isInList = draft.technicianIds.includes(name);
                        if (isLead) {
                          const newLead = draft.technicianIds[0] || '';
                          const remaining = draft.technicianIds.slice(1);
                          setDraft(prev => {
                            const next = { ...prev, leadTechnician: newLead, technicianIds: remaining };
                            scheduleSave(next);
                            return next;
                          });
                          if (hasEmailFailed) setEmailError('');
                        } else if (isInList) {
                          update('technicianIds', draft.technicianIds.filter(n => n !== name));
                        } else {
                          if (!draft.leadTechnician) {
                            update('leadTechnician', name);
                          } else {
                            update('technicianIds', [...draft.technicianIds, name]);
                          }
                        }
                      }}
                      className={`py-2 px-3 rounded-full border text-xs font-medium transition-all disabled:opacity-60 ${
                        selected
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:border-brand-300'
                      }`}
                    >{name}</button>
                  );
                })}
              </div>
              <p className="text-xs text-neutral-400 mt-1">Tap each technician who worked on this job. First selected is lead.</p>
            </div>

            {isOpening && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Opening Type</label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {OPENING_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => update('openingType', t)}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-60 ${
                        draft.openingType === t
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:border-brand-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isOpening && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Opening Add-ons <span className="text-xs font-normal text-neutral-400">(confirm each was completed)</span></label>

                <div className="flex flex-wrap gap-2">
                  {OPENING_ADD_ONS.map(addon => (
                    <button
                      key={addon}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        const cur = draft.openingAddOns;
                        update('openingAddOns', cur.includes(addon) ? cur.filter(a => a !== addon) : [...cur, addon]);
                      }}
                      className={`py-2 px-3 rounded-full border text-xs font-medium transition-all disabled:opacity-60 ${
                        draft.openingAddOns.includes(addon)
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:border-brand-300'
                      }`}
                    >
                      {addon}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isClosing && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Pool Closing Add-Ons <span className="text-xs font-normal text-neutral-400">(confirm each was completed)</span></label>
                  <div className="flex flex-wrap gap-2">
                    {POOL_CLOSING_ADD_ONS.map(addon => (
                      <button
                        key={addon}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          const cur = draft.closingAddOns;
                          update('closingAddOns', cur.includes(addon) ? cur.filter(a => a !== addon) : [...cur, addon]);
                        }}
                        className={`py-2 px-3 rounded-full border text-xs font-medium transition-all disabled:opacity-60 ${
                          draft.closingAddOns.includes(addon)
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:border-brand-300'
                        }`}
                      >
                        {addon}
                      </button>
                    ))}
                  </div>

                  {(draft.closingAddOns.includes('Return Plug') || draft.closingAddOns.includes('Gizmo') || draft.closingAddOns.includes('Yellow Cover Picks')) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      {draft.closingAddOns.includes('Return Plug') && (
                        <div>
                          <label className="block text-xs font-medium text-neutral-600 mb-1"># of Return Plugs</label>
                          <input
                            type="number"
                            min="0"
                            value={draft.returnPlugQty}
                            onChange={e => update('returnPlugQty', e.target.value)}
                            disabled={isSubmitting}
                            placeholder="0"
                            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                          />
                        </div>
                      )}
                      {draft.closingAddOns.includes('Gizmo') && (
                        <div>
                          <label className="block text-xs font-medium text-neutral-600 mb-1"># of Gizmos</label>
                          <input
                            type="number"
                            min="0"
                            value={draft.gizmoQty}
                            onChange={e => update('gizmoQty', e.target.value)}
                            disabled={isSubmitting}
                            placeholder="0"
                            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                          />
                        </div>
                      )}
                      {draft.closingAddOns.includes('Yellow Cover Picks') && (
                        <div>
                          <label className="block text-xs font-medium text-neutral-600 mb-1"># of Yellow Cover Picks</label>
                          <input
                            type="number"
                            min="0"
                            value={draft.yellowCoverPicksQty}
                            onChange={e => update('yellowCoverPicksQty', e.target.value)}
                            disabled={isSubmitting}
                            placeholder="0"
                            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <a
                  href="/procedures"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium hover:bg-teal-100 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  View Full Procedures & Guides
                  <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                </a>

                {client?.pool_type && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">Pool Type (change if incorrect)</label>
                    <div className="flex flex-wrap gap-2">
                      {POOL_CATEGORIES.map(cat => (
                        <button key={cat.key} type="button"
                          onClick={() => update('poolTypeOverride', cat.label === effectivePoolType ? '' : cat.label)}
                          className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                            cat.label === effectivePoolType || (!draft.poolTypeOverride && cat.key === categorizePoolType(client?.pool_type))
                              ? 'bg-brand-600 border-brand-600 text-white'
                              : 'bg-white border-neutral-200 text-neutral-600 hover:border-brand-300'
                          }`}
                        >{cat.shortLabel}</button>
                      ))}
                    </div>
                    {draft.poolTypeOverride && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">Overridden from client record</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Closing Checklist — {categorizePoolType(effectivePoolType) === 'above-ground-liner' ? 'Above-Ground' : categorizePoolType(effectivePoolType) === 'in-ground-concrete' ? 'In-Ground Concrete' : categorizePoolType(effectivePoolType) === 'fiberglass' ? 'Fiberglass' : 'In-Ground Liner'}</label>
                  <div className="space-y-1">
                    {getClosingChecklist(effectivePoolType).map(item => {
                      const checked = draft.closingChecklist.includes(item);
                      return (
                        <label key={item} className="flex items-start gap-3 cursor-pointer group py-2 px-3 rounded-xl hover:bg-neutral-50 transition-colors">
                          <span className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${checked ? 'bg-brand-600 border-brand-600' : 'border-neutral-300 group-hover:border-brand-400'}`}>
                            {checked && <CheckCircle className="w-3 h-3 text-white" />}
                          </span>
                          <span className="text-sm text-neutral-700 leading-snug">{item}</span>
                          <input type="checkbox" className="sr-only" checked={checked} onChange={() => update('closingChecklist', checked ? draft.closingChecklist.filter(c => c !== item) : [...draft.closingChecklist, item])} />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <span className={`w-11 h-6 rounded-full relative transition-colors ${draft.clientPaidCash ? 'bg-green-500' : 'bg-neutral-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${draft.clientPaidCash ? 'translate-x-5' : ''}`} />
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={draft.clientPaidCash}
                    disabled={isSubmitting}
                    onChange={e => update('clientPaidCash', e.target.checked)}
                  />
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
                  <DollarSign className="w-4 h-4 text-green-600" /> Client paid cash
                </span>
              </label>

              {draft.clientPaidCash && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Amount Paid (CAD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-medium">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.cashAmount}
                      onChange={e => update('cashAmount', e.target.value)}
                      disabled={isSubmitting}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-green-300 pl-7 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50 disabled:opacity-60"
                    />
                  </div>
                </div>
              )}
            </div>

            <label className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 transition-colors ${draft.propertyLeftClean ? 'border-green-400 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
              <span className={`mt-0.5 w-11 h-6 rounded-full relative transition-colors ${draft.propertyLeftClean ? 'bg-green-500' : 'bg-neutral-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${draft.propertyLeftClean ? 'translate-x-5' : ''}`} />
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={draft.propertyLeftClean}
                  disabled={isSubmitting}
                  onChange={e => update('propertyLeftClean', e.target.checked)}
                />
              </span>
              <span>
                <span className={`block text-sm font-bold ${draft.propertyLeftClean ? 'text-green-800' : 'text-amber-800'}`}>
                  Property Left Clean <span className="text-red-500">*</span>
                </span>
                <span className={`block text-xs mt-0.5 ${draft.propertyLeftClean ? 'text-green-700' : 'text-amber-700'}`}>
                  Hose must be rolled up. Property must be left in the same condition as when you arrived.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer rounded-2xl border-2 border-red-200 bg-red-50 p-4">
              <span className={`mt-0.5 w-11 h-6 rounded-full relative transition-colors ${draft.serviceNotComplete ? 'bg-red-600' : 'bg-neutral-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${draft.serviceNotComplete ? 'translate-x-5' : ''}`} />
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={draft.serviceNotComplete}
                  disabled={isSubmitting}
                  onChange={e => update('serviceNotComplete', e.target.checked)}
                />
              </span>

              <span>
                <span className="block text-sm font-bold text-red-800">Service Not Complete</span>
                <span className="block text-xs text-red-700 mt-0.5">
                  Turn this on if the job could not be completed. You must explain why in technician notes.
                </span>
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-neutral-400" /> Service Completed Time
              </label>

              <input
                type="time"
                value={draft.completedTime}
                onChange={e => update('completedTime', e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
              />
            </div>
          </div>
        </SectionCard>

        {!isSenior && (
          <SectionCard title="Pre-Start Checkup" collapsible>
            <ChecklistSection
              label="Complete before starting any work"
              items={PRE_START}
              checked={draft.preStartChecklist}
              onChange={v => update('preStartChecklist', v)}
            />

            <label className="flex items-center gap-3 cursor-pointer mt-4">
              <span className={`w-11 h-6 rounded-full relative transition-colors ${draft.linerPullInspection ? 'bg-brand-500' : 'bg-neutral-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${draft.linerPullInspection ? 'translate-x-5' : ''}`} />
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={draft.linerPullInspection}
                  disabled={isSubmitting}
                  onChange={e => update('linerPullInspection', e.target.checked)}
                />
              </span>

              <span className="text-sm font-medium text-neutral-700">Liner pull inspection completed</span>
            </label>
          </SectionCard>
        )}

        {isSwimReady && (
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="flex-1 h-px bg-neutral-200" />
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest whitespace-nowrap">
                Swim-Ready 1st Visit Checklist
              </span>
              <div className="flex-1 h-px bg-neutral-200" />
            </div>
            {(() => {
              const size = client?.pool_size || '';
              const [w, h] = size.toLowerCase().replace(/\s/g, '').split('x').map(Number);
              const isSuperLarge = w >= 45 && h >= 22;
              const isLarge = !isSuperLarge && w >= 32 && h >= 16;
              if (isSuperLarge) return (
                <div className="mb-4 rounded-2xl bg-red-50 border-2 border-red-400 px-4 py-3 flex items-center gap-3">
                  <span className="text-sm font-bold text-red-700 uppercase tracking-wide">SUPER LARGE POOL</span>
                  <span className="text-sm text-red-600">{size}</span>
                </div>
              );
              if (isLarge) return (
                <div className="mb-4 rounded-2xl bg-amber-50 border-2 border-amber-400 px-4 py-3 flex items-center gap-3">
                  <span className="text-sm font-bold text-amber-700 uppercase tracking-wide">LARGE POOL</span>
                  <span className="text-sm text-amber-600">{size}</span>
                </div>
              );
              return null;
            })()}

            {SWIM_READY_SUBSECTIONS.map(sub => (
              <SwimReadyChecklistSection
                key={sub.key}
                subsection={sub}
                value={draft.swimReadyChecklist[sub.key]}
                onChange={items => update('swimReadyChecklist', { ...draft.swimReadyChecklist, [sub.key]: items })}
                isCement={cement}
              />
            ))}
          </div>
        )}

        {!isSwimReady && (
          <>
            {cement && isOpening && (
              <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-400 mb-4">
                <div className="px-5 py-4 bg-amber-50 flex items-center gap-2 border-b border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-amber-800 text-sm">Cement Pool — Acid Wash (REQUIRED)</span>
                </div>
                <div className="px-5 py-4 space-y-2">
                  {['Acid wash complete', 'Not applicable'].map(item => {
                    const checked = draft.cementPool.includes(item);
                    return (
                      <label key={item} className="flex items-start gap-3 cursor-pointer group py-2 px-3 rounded-xl hover:bg-neutral-50 transition-colors">
                        <span className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${checked ? 'bg-brand-600 border-brand-600' : 'border-neutral-300 group-hover:border-brand-400'}`}>
                          {checked && <CheckCircle className="w-3 h-3 text-white" />}
                        </span>
                        <span className="text-sm text-neutral-700 leading-snug">{item}</span>
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => update('cementPool', checked ? draft.cementPool.filter(c => c !== item) : [...draft.cementPool, item])} />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <SectionCard title="Client Follow-Up" collapsible>
              <div className="space-y-3">
                <div className="space-y-2">
                  {['3 Door Hangers Dropped', 'Equipment sticker applied', 'Loyalty sticker dropped off'].map(item => {
                    const checked = draft.marketing.includes(item);
                    return (
                      <label key={item} className="flex items-start gap-3 cursor-pointer group py-2 px-3 rounded-xl hover:bg-neutral-50 transition-colors">
                        <span className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${checked ? 'bg-brand-600 border-brand-600' : 'border-neutral-300 group-hover:border-brand-400'}`}>
                          {checked && <CheckCircle className="w-3 h-3 text-white" />}
                        </span>
                        <span className="text-sm text-neutral-700 leading-snug">{item}</span>
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => update('marketing', checked ? draft.marketing.filter(c => c !== item) : [...draft.marketing, item])} />
                      </label>
                    );
                  })}
                </div>
                {draft.marketing.includes('3 Door Hangers Dropped') && (
                  <div className="ml-8">
                    <button type="button"
                      onClick={() => {
                        const item = 'No pools in surrounding areas';
                        const checked = draft.marketing.includes(item);
                        update('marketing', checked ? draft.marketing.filter(c => c !== item) : [...draft.marketing.filter(c => c !== 'No pools in surrounding areas' && c !== 'To be checked'), item]);
                      }}
                      className={`py-2 px-3 rounded-full border text-xs font-medium transition-all ${draft.marketing.includes('No pools in surrounding areas') ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-neutral-200 text-neutral-600 hover:border-brand-300'}`}
                    >No pools in surrounding areas</button>
                  </div>
                )}
              </div>
            </SectionCard>
          </>
        )}

        <SectionCard title={
          draft.serviceType === 'Service Call'
            ? 'Parts Used & Service Detail'
            : draft.serviceNotComplete ? 'Technician Notes — Required' : 'Technician Notes'
        }>
          {draft.serviceNotComplete && (
            <div className="mb-3 rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-sm font-semibold text-red-800">
                Explain why the service was not completed.
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                Example: missing parts, no access, unsafe condition, equipment issue, high groundwater, client not ready, etc.
              </p>
            </div>
          )}

          <textarea
            value={draft.technicianNotes}
            onChange={e => update('technicianNotes', e.target.value)}
            disabled={isSubmitting}
            rows={5}
            placeholder={
              draft.serviceType === 'Service Call'
                ? 'List parts used and describe the service performed…'
                : draft.serviceNotComplete
                ? 'Required: explain why the service was not completed...'
                : 'Describe any issues found, follow-up work needed, or observations…'
            }
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none disabled:opacity-60 ${
              draft.serviceNotComplete && !draft.technicianNotes.trim()
                ? 'border-red-300 focus:ring-red-500 bg-red-50'
                : 'border-neutral-200 focus:ring-brand-500'
            }`}
          />
        </SectionCard>

        <SectionCard title="Photos">
          <div className="space-y-5">
            <PhotoUploadSlot
              label="Pool Area"
              required
              value={photoPoolArea}
              onCapture={f => handlePhoto(f, 'pool_area', setPhotoPoolArea)}
              onRemove={() => setPhotoPoolArea(null)}
            />

            <PhotoUploadSlot
              label="Pool Equipment"
              required
              value={photoPoolEquip}
              onCapture={f => handlePhoto(f, 'pool_equipment', setPhotoPoolEquip)}
              onRemove={() => setPhotoPoolEquip(null)}
            />

            <PhotoUploadSlot
              label="Extra (Optional)"
              value={photoExtra}
              onCapture={f => handlePhoto(f, 'extra', setPhotoExtra)}
              onRemove={() => setPhotoExtra(null)}
            />

            {isClosing && (
              <PhotoUploadSlot
                label="Removed Parts / Storage Location"
                value={photoRemovedParts}
                onCapture={f => handlePhoto(f, 'removed_parts', setPhotoRemovedParts)}
                onRemove={() => setPhotoRemovedParts(null)}
              />
            )}
          </div>
        </SectionCard>

        <div className="flex items-center gap-2 px-1 mb-4 text-sm text-neutral-400">
          <Clock className="w-4 h-4" />
          <span>Finish time will be recorded automatically on submission</span>
        </div>
      </form>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-100 px-4 py-3 safe-pb">
        <div className="max-w-2xl mx-auto space-y-2">
          {draft.serviceNotComplete && (
            <div className="text-xs text-red-600 font-medium text-center">
              Service marked not complete — technician notes required.
            </div>
          )}

          {hasEmailFailed && (
            <div className="text-xs text-red-600 font-medium text-center">
              Email failed. You can edit, then submit again.
            </div>
          )}

          <div className="flex items-center gap-3">
            {!navigator.onLine && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <WifiOff className="w-4 h-4" />
                Offline
              </span>
            )}

            <button
              type="submit"
              form="report-form"
              disabled={isSubmitting || previousReportBlocked}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-base active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${
                previousReportBlocked
                  ? 'bg-neutral-400 shadow-neutral-400/30'
                  : draft.serviceNotComplete
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                  : hasEmailFailed
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                  : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/30'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {submitButtonText}
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  {submitButtonText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
