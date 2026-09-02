export type PoolCategory = 'above-ground-liner' | 'in-ground-liner' | 'in-ground-concrete' | 'fiberglass';

export const POOL_CATEGORIES: { key: PoolCategory; label: string; shortLabel: string }[] = [
  { key: 'above-ground-liner', label: 'Above-Ground Liner Pool', shortLabel: 'Above-Ground' },
  { key: 'in-ground-liner', label: 'In-Ground Liner Pool', shortLabel: 'In-Ground Liner' },
  { key: 'in-ground-concrete', label: 'In-Ground Concrete Pool', shortLabel: 'In-Ground Concrete' },
  { key: 'fiberglass', label: 'Fiberglass Pool', shortLabel: 'Fiberglass' },
];

export function categorizePoolType(poolType: string | null | undefined): PoolCategory {
  const s = (poolType || '').toLowerCase();
  if (s.includes('above') || s.includes('above-ground')) return 'above-ground-liner';
  if (s.includes('fiberglass') || s.includes('fibre') || s.includes('fiber')) return 'fiberglass';
  if (s.includes('concrete') || s.includes('cement') || s.includes('gunite')) return 'in-ground-concrete';
  return 'in-ground-liner';
}

export const CLOSING_CHECKLISTS: Record<PoolCategory, string[]> = {
  'above-ground-liner': [
    'Remove stairs/ladder and any bricks or weights',
    'Install skimmer foam kit and remove return fitting',
    'Install and secure winter cover (if applicable)',
    'Lower water 8 inches below return opening',
    'Isolate bottom drain valve (if present)',
    'Remove all exposed plumbing (hoses, pump, filter, salt cell, removable valves)',
    'Drain pump — remove drain plugs, store in basket',
    'Drain sand filter — drain plug, pressure gauge, sight glass, gasket',
    'Drain heater — disconnect unions, remove drain plug, blow out separately',
    'Remove and drain salt cell (leave flow switch installed)',
    'Blow out all fixed/underground plumbing and backwash lines',
    'Winterize bottom drain — pour antifreeze, insert foam noodle, close valve',
    'Add winter closing kit after water is lowered',
    'Store equipment neatly inside (pump, salt cell, gauge, small parts)',
  ],
  'in-ground-liner': [
    'Lower water to first pool step',
    'Remove return fittings, stair jets, water-feature fittings, skimmer basket',
    'Blow out every return individually (plug all but one, repeat)',
    'Blow out stair jets, fountains and water features separately',
    'Blow out skimmer from front of pump',
    'Blow out bottom drain — close valve during airflow for air lock',
    'Protect every skimmer — Gizmo or foam kit + half bottle antifreeze',
    'Wrap skimmer lid in plastic bag and reinstall',
    'Remove accessible deep-end lights (save screw in pump basket)',
    'Blow out equipment lines (waste for backwash, recirculate for returns)',
    'Blow out heater separately — disconnect unions, remove drain plug',
    'Drain pump — remove all plugs, store in basket',
    'Drain sand filter — drain plug, gauge, sight glass, gasket',
    'Remove and drain salt cell (leave flow switch, disconnect wire only)',
    'Set valves open (bottom-drain closed to maintain air lock)',
    'Add winter closing kit at first step level',
  ],
  'in-ground-concrete': [
    'Lower water to first pool step',
    'Remove return fittings, stair jets, water-feature fittings, skimmer baskets',
    'Blow out every return individually (plug all but one, repeat)',
    'Blow out stair jets, fountains and water features separately',
    'Blow out skimmer from front of pump',
    'Blow out bottom drain — close valve during airflow for air lock',
    'Protect every skimmer — Gizmo or foam kit + half bottle antifreeze',
    'Wrap skimmer lid in plastic bag and reinstall',
    'Remove accessible deep-end lights (save screw, no electrical)',
    'Blow out backwash, return, skimmer, bottom-drain and water-feature lines',
    'Blow out heater separately — disconnect unions, remove drain plug',
    'Drain pump — remove all plugs, store in basket',
    'Drain sand filter — drain plug, gauge, sight glass, gasket',
    'Remove and drain salt cell (leave flow switch, disconnect wire only)',
    'Set valves open (bottom-drain closed to maintain air lock)',
    'Add winter closing kit at first step level',
  ],
  'fiberglass': [
    'Lower water just below return openings (NOT to first step)',
    'Remove skimmer cover plate if present (keep screws together)',
    'Install winter skimmer face plug from inside pool',
    'Remove return fittings, stair jets, water-feature fittings, skimmer basket',
    'Blow out every return individually (plug all but one, repeat)',
    'Blow out stair jets, fountains and water features separately',
    'Blow out skimmer and install skimmer face plug',
    'Blow out bottom drain — close valve during airflow for air lock',
    'Protect skimmer — antifreeze + Gizmo or foam kit, wrap lid in bag',
    'Remove accessible lights (save screws, no electrical)',
    'Blow out all equipment lines including heater separately',
    'Drain pump, filter, gauge, sight glass, gasket, heater drain plug',
    'Remove and drain salt cell (leave flow switch, disconnect wire only)',
    'Set valves open (bottom-drain closed to maintain air lock)',
    'Add winter closing kit after water is below returns',
  ],
};

export const REQUIRED_FINAL_PHOTOS = [
  'A wide picture of the completed pool',
  'A clear picture showing the final water level',
  'Pictures of every skimmer',
  'A picture of the equipment area',
  'A picture of the installed cover',
  'Pictures of any damage, unusual plumbing or parts left installed',
];

export const CLOSING_SAFETY_RULES = [
  'Never disconnect a hardwired pump or electrical wiring',
  'Never force a glued, cracked or damaged fitting',
  'Never leave water trapped inside equipment, valves or plumbing',
  'Blow each separate line individually whenever possible',
  'The heater must always be blown out separately',
  'Do not overpressurize plumbing',
  'Keep every drain plug, gasket, screw and small part together',
  'Take final pictures before leaving',
];

export const CLOSING_IDENTIFY_BEFORE_START = [
  'Pool type',
  'Number of skimmers and returns',
  'Bottom-drain configuration',
  'Heater, salt system and water features',
  'Underground plumbing or backwash lines',
  'Whether a winter cover is included',
  'Whether the pump is plugged in or hardwired',
  'Take pictures of any existing damage, cracked fittings or unusual plumbing',
];

export interface ProcedureStep {
  title: string;
  instructions: string[];
}

export const CLOSING_PROCEDURES: Record<PoolCategory, ProcedureStep[]> = {
  'above-ground-liner': [
    {
      title: 'Step 1 — Determine Whether a Cover Is Being Installed',
      instructions: [
        'When installing a cover: install before lowering the water. Remove stairs/ladder and any bricks/weights before lifting stairs. Do not allow weights to fall into the pool. Install skimmer foam kit, remove return fitting, install and secure winter cover, then place submersible pump and begin lowering water.',
        'When no cover: place the submersible pump immediately and begin lowering water. Remove stairs while pool drains. Leave stairs neatly on the deck unless customer requests another location.',
      ],
    },
    {
      title: 'Step 2 — Lower the Water',
      instructions: [
        'Stop water approximately 8 inches below the return opening.',
        'Measure from the return, not from the skimmer.',
        'Do not drain the pool lower than necessary.',
      ],
    },
    {
      title: 'Step 3 — Isolate the Bottom Drain',
      instructions: [
        'Move the valve below the skimmer to isolate the bottom-drain line.',
        'Confirm water will not rush back through the plumbing.',
        'Keep valve in required position while disconnecting equipment.',
        'Valve may need to be moved again when adding antifreeze.',
      ],
    },
    {
      title: 'Step 4 — Remove the Plumbing and Equipment',
      instructions: [
        'Remove all exposed plumbing designed to come apart: flexible hoses, pump connections, filter connections, salt cell, removable three-way valves, heater connections when removable.',
        'Underground plumbing remains installed and must be blown out.',
        'Leave all removed valves open so water cannot remain trapped.',
      ],
    },
    {
      title: 'Step 5 — Drain the Equipment',
      instructions: [
        'Pump: Remove drain plugs, empty pump, place plugs/gaskets in basket. Advise customer to store pump in garage.',
        'Sand Filter: Remove drain plug, pressure gauge, backwash sight glass, black sight-glass gasket. Do not force a glued/cracked gauge — leave it and take a picture.',
        'Heater: Disconnect removable unions, remove heater drain plug, blow out separately, leave heater outside.',
        'Salt System: Remove and drain salt cell, advise customer to store inside. For flow switch: disconnect wire from board only, do not unscrew, wrap wire around nearby hose.',
      ],
    },
    {
      title: 'Step 6 — Blow Out Fixed Plumbing',
      instructions: [
        'Blow out underground plumbing, underground backwash lines, heater plumbing, and any line that cannot be physically removed.',
        'Continue until the line is cleared of water.',
      ],
    },
    {
      title: 'Step 7 — Winterize the Bottom Drain',
      instructions: [
        'Pour pool antifreeze into the bottom-drain line until visible from the bottom-drain cover inside the pool.',
        'Close the bottom-drain valve.',
        'Insert a foam noodle into the accessible valve opening and secure it.',
        'Leave enough exposed so it can be removed during the opening.',
      ],
    },
    {
      title: 'Step 8 — Add the Closing Kit',
      instructions: [
        'Add the winter closing kit after the water has been lowered.',
        'Distribute around the pool according to required dosage.',
      ],
    },
    {
      title: 'Step 9 — Store the Equipment',
      instructions: [
        'Place removed equipment neatly beside shed, garage or customer-approved location.',
        'Preferably store inside: pump, salt cell, pressure gauge, small parts and gaskets.',
        'Sand filter and heater normally stay outside.',
      ],
    },
    {
      title: 'Step 10 — Final Pictures and Inspection',
      instructions: [
        'Take: one wide picture of completed pool, one clear picture showing skimmer/return/final water level, pictures of any damage.',
        'Confirm: water 8 inches below return, stairs removed, equipment drained, underground lines blown, bottom drain protected, winter kit added, cover secured, work area clean.',
      ],
    },
  ],
  'in-ground-liner': [
    {
      title: 'Step 1 — Lower the Water',
      instructions: [
        'Place submersible pump immediately.',
        'Stop water at the height of the first pool step.',
        'Do not use returns as water-level reference. Cover is installed at the end.',
      ],
    },
    {
      title: 'Step 2 — Remove Poolside Fittings',
      instructions: [
        'While water lowers, remove: all return fittings, stair jet fittings, water-feature fittings, skimmer basket.',
        'Skimmer flap can remain installed.',
        'Store all return fittings inside the skimmer basket, leave basket beside equipment.',
        'For threaded winter plugs: old Teflon tape does not need full removal — add new tape over it, wrap in direction plug tightens.',
      ],
    },
    {
      title: 'Step 3 — Blow Out Every Return Separately',
      instructions: [
        'Plug every return except one. Blow until only air or mist exits. Plug it.',
        'Open next return and repeat until every return is individually blown and plugged.',
        'Follow same procedure for stair jets, fountains, waterfalls and other water features.',
        'Do not blow several openings at once when they can be separated.',
      ],
    },
    {
      title: 'Step 4 — Blow Out the Skimmer',
      instructions: [
        'Blow from plumbing in front of pump. Isolate skimmer line.',
        'Blow until mostly air or mist comes from skimmer.',
        'Valve may be briefly closed and reopened for a controlled burst. Do not excessively pressurize.',
      ],
    },
    {
      title: 'Step 5 — Blow Out the Bottom Drain',
      instructions: [
        'Separate line: Isolate, blow until strong bubbles, close valve while air flows for air lock.',
        'Through skimmer: Wait until water below inlet, insert ~3 ft foam noodle (not too deep), plug inlet, plug skimmer line, add ~half bottle antifreeze.',
      ],
    },
    {
      title: 'Step 6 — Protect Every Skimmer',
      instructions: [
        'Every skimmer must have a proper Gizmo or complete skimmer foam kit in good condition.',
        'Do not accept random bottles, broken foam, half foam blocks, damaged Gizmos, or foam that will float out.',
        'After line is blown and plugged: add ~half bottle antifreeze, install Gizmo/foam kit, wrap lid in plastic bag, reinstall lid securely.',
        'Repeat for every skimmer.',
      ],
    },
    {
      title: 'Step 7 — Prepare the Pool Lights',
      instructions: [
        'Remove accessible deep-end lights designed to be removed.',
        'Do not damage cable. Do not lose retaining screw — store in pump basket.',
        'Do not open electrical connections. If light cannot be safely removed, leave it and document.',
      ],
    },
    {
      title: 'Step 8 — Blow Out the Equipment Lines',
      instructions: [
        'Disconnect plumbing toward filter when possible. Use multiport valve: Waste for backwash line, Recirculate for returns.',
        'Technician at pool must still blow each return separately.',
        'Do not move multiport handle while system is pressurized.',
      ],
    },
    {
      title: 'Step 9 — Blow Out the Heater Separately',
      instructions: [
        'Turn heater off. Disconnect removable unions. Blow through heater separately.',
        'Remove heater drain plug when present.',
        'Move bypass valves through positions to release trapped water. Leave appropriate valves open.',
        'Do not force glued, damaged or non-removable unions.',
      ],
    },
    {
      title: 'Step 10 — Drain the Equipment',
      instructions: [
        'Pump: Remove all drain plugs, empty pump and basket, store plugs in basket. Only remove pump if it plugs into outlet and has removable unions. Never remove hardwired pump.',
        'Sand Filter: Remove drain plug, pressure gauge, backwash sight glass, sight-glass gasket. Do not force damaged/glued parts.',
        'Salt System: Remove and drain salt cell. For flow switch: disconnect wire from board only when necessary, do not unscrew, wrap wire around nearby hose.',
        'Drain all other equipment: chlorinators, booster pumps, water-feature systems.',
      ],
    },
    {
      title: 'Step 11 — Set the Valves',
      instructions: [
        'Move every valve through positions to remove hidden water.',
        'Leave valves open whenever possible. Keep bottom-drain valve closed when required for air lock.',
        'Do not trap water between two closed valves.',
      ],
    },
    {
      title: 'Step 12 — Add the Closing Kit',
      instructions: [
        'Once water reaches first step, add winter closing kit.',
        'Distribute around pool. Do not allow concentrated chemicals to sit directly on liner.',
      ],
    },
    {
      title: 'Step 13 — Install the Cover Last',
      instructions: [
        'After all lines and equipment are winterized, position rectangular cover evenly.',
        'Secure using yellow rope and yellow stakes or picks. Secure all sides.',
        'Do not attach ropes to fragile plumbing or equipment. Avoid loose sections and tripping hazards.',
      ],
    },
    {
      title: 'Step 14 — Final Pictures and Inspection',
      instructions: [
        'Take pictures: final water level at first step, every skimmer, plugged returns, equipment area, installed cover, existing damage.',
        'Confirm: every return blown separately, skimmer and bottom drain blown, every skimmer protected, heater blown separately, drain plugs removed, hardwired equipment not disconnected, cover secure, parts stored, work area clean.',
      ],
    },
  ],
  'in-ground-concrete': [
    {
      title: 'Step 1 — Lower the Water',
      instructions: [
        'Begin lowering water immediately. Stop at first pool step.',
        'Install winter cover only after closing is complete.',
      ],
    },
    {
      title: 'Step 2 — Remove Pool Fittings',
      instructions: [
        'Remove return fittings, stair jets, water-feature fittings, skimmer baskets.',
        'Skimmer flap may remain installed. Store removed fittings inside skimmer basket.',
      ],
    },
    {
      title: 'Step 3 — Blow Out Returns Individually',
      instructions: [
        'Plug every return except one. Blow until only air or mist exits. Plug it. Open next. Repeat.',
        'Blow stair jets, fountains and water features separately.',
      ],
    },
    {
      title: 'Step 4 — Blow Out the Skimmer',
      instructions: [
        'Isolate skimmer line. Blow from front of pump until mostly air or mist exits.',
        'Plug the skimmer line.',
      ],
    },
    {
      title: 'Step 5 — Blow Out the Bottom Drain',
      instructions: [
        'Separate line: Blow until strong bubbles, close valve while air flows for air lock.',
        'Through skimmer: Wait until inlet exposed, insert ~3 ft foam noodle, plug inlet, add ~half bottle antifreeze.',
      ],
    },
    {
      title: 'Step 6 — Protect the Skimmer',
      instructions: [
        'Add ~half bottle antifreeze. Install proper Gizmo or complete foam kit.',
        'Do not use broken foam or random bottles. Wrap lid in plastic bag and reinstall.',
      ],
    },
    {
      title: 'Step 7 — Prepare Lights and Water Features',
      instructions: [
        'Remove accessible deep-end lights designed to be removed. Save retaining screw. Do not open electrical wiring.',
        'Blow out every separate water feature.',
      ],
    },
    {
      title: 'Step 8 — Winterize the Equipment',
      instructions: [
        'Blow out: backwash line, return plumbing, skimmer line, bottom-drain line, water-feature lines, heater.',
        'Heater must be disconnected and blown separately when unions allow it.',
        'Remove: pump drain plugs, filter drain plug, pressure gauge, sight glass, gasket, heater drain plug.',
        'Do not disconnect a hardwired pump.',
      ],
    },
    {
      title: 'Step 9 — Winterize the Salt System',
      instructions: [
        'Remove and drain salt cell. Leave flow switch screwed in. Disconnect only its wire when necessary.',
        'Wrap wire around nearby hose.',
      ],
    },
    {
      title: 'Step 10 — Set Valves and Add the Closing Kit',
      instructions: [
        'Move valves through all positions. Leave open so water cannot remain trapped.',
        'Keep bottom-drain valve closed only to maintain air lock.',
        'Add winter closing kit once water reaches first step.',
      ],
    },
    {
      title: 'Step 11 — Install the Cover',
      instructions: [
        'Install cover last. Center it. Secure using yellow rope and stakes.',
        'Secure every side. Keep ropes away from fragile equipment and walking areas.',
      ],
    },
    {
      title: 'Step 12 — Final Pictures and Inspection',
      instructions: [
        'Confirm: water at first step, every line blown separately, every skimmer protected, heater blown separately, drain plugs removed, equipment winterized, cover secure, parts stored, property clean.',
      ],
    },
  ],
  'fiberglass': [
    {
      title: 'Step 1 — Lower the Water',
      instructions: [
        'Begin lowering water immediately. Stop just below return openings.',
        'Do NOT lower to first step — returns must be exposed for removal, blowing and plugging.',
      ],
    },
    {
      title: 'Step 2 — Prepare the Skimmer Face',
      instructions: [
        'A winter skimmer face plug must be installed from inside the pool.',
        'If a decorative/protective cover plate is present: remove it, keep screws/parts together, clean skimmer face if required.',
        'Install proper skimmer face plug. Confirm it seals completely.',
        'Do not install face plug over existing cover plate.',
      ],
    },
    {
      title: 'Step 3 — Remove Pool Fittings',
      instructions: [
        'Once water is below returns, remove: return fittings, stair jets, water-feature fittings, skimmer basket.',
        'Store all return fittings inside skimmer basket.',
      ],
    },
    {
      title: 'Step 4 — Blow Out Every Return Separately',
      instructions: [
        'Plug every return except one. Blow until only air or mist exits. Plug it. Open next. Repeat.',
        'Repeat for stair jets, fountains and water features.',
      ],
    },
    {
      title: 'Step 5 — Blow Out the Skimmer and Bottom Drain',
      instructions: [
        'Skimmer: Isolate line, blow until mostly air/mist, plug plumbing line, install skimmer face plug.',
        'Separate bottom drain: Blow until strong bubbles, close valve while air flows for air lock.',
        'Bottom drain through skimmer: Wait until inlet exposed, insert ~3 ft noodle, plug inlet, add ~half bottle antifreeze.',
      ],
    },
    {
      title: 'Step 6 — Protect the Skimmer',
      instructions: [
        'Even with face plug: add ~half bottle antifreeze when required.',
        'Install approved internal skimmer protection (Gizmo or complete foam kit when design requires).',
        'Do not use random bottles or broken foam. Wrap lid in plastic bag and reinstall.',
      ],
    },
    {
      title: 'Step 7 — Prepare Lights and Water Features',
      instructions: [
        'Remove accessible lights designed to be removed. Save all screws. Do not touch electrical wiring.',
        'Blow every water feature separately.',
      ],
    },
    {
      title: 'Step 8 — Blow Out the Equipment',
      instructions: [
        'Blow out: skimmer line, bottom-drain line, returns, backwash line, stair jets, water features, heater.',
        'Heater must be blown out separately by disconnecting removable unions.',
      ],
    },
    {
      title: 'Step 9 — Drain the Equipment',
      instructions: [
        'Remove: pump drain plugs, filter drain plug, pressure gauge, sight glass, gasket, heater drain plug, accessible equipment drain plugs.',
        'Do not disconnect a hardwired pump. Only remove pump when plugged into outlet with removable unions.',
      ],
    },
    {
      title: 'Step 10 — Winterize the Salt System',
      instructions: [
        'Remove and drain salt cell. Do not unscrew flow switch. Disconnect only wire when necessary.',
        'Wrap wire neatly around nearby hose.',
      ],
    },
    {
      title: 'Step 11 — Set Valves and Add the Closing Kit',
      instructions: [
        'Move all valves through positions. Leave open so water cannot be trapped.',
        'Keep bottom-drain valve closed to maintain air lock.',
        'Add winter closing kit after water is just below returns.',
      ],
    },
    {
      title: 'Step 12 — Install the Cover Last',
      instructions: [
        'Position cover evenly. Secure with approved rope, stakes or cover system.',
        'Secure all sides. Keep ropes away from fragile plumbing and walking areas.',
      ],
    },
    {
      title: 'Step 13 — Final Pictures and Inspection',
      instructions: [
        'Take pictures: water below returns, skimmer face plug, every plugged return, skimmer protection, equipment area, installed cover.',
        'Confirm: water just below returns, skimmer cover plate removed when required, face plug sealed, every return blown separately, bottom drain protected, heater blown separately, equipment drained, cover secure, all parts stored, property clean.',
      ],
    },
  ],
};
