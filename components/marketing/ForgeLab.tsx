'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Play, 
  Save, 
  Layers, 
  Image as ImageIcon, 
  Type, 
  Hash,
  Trash2, 
  Settings,
  FlaskConical,
  Loader2,
  Eraser,
  Download,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import Hyperspeed, { hyperspeedPresets } from '@/components/visual/Hyperspeed';

interface ForgeLabProps {
  ventureId: string;
  brandDNA?: any;
}

type InputType = 'image' | 'text' | 'number';

interface AppInput {
  id: string;
  label: string;
  type: InputType;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}

interface ForgeApp {
  id: string;
  name: string;
  description: string;
  inputs: AppInput[];
  template: string; // The prompt template "A photo of {{image}}..."
  workflow: {
    tools: string[];  // e.g. ['rembg']
    model: string;    // 'flux', 'nano-banana'
  };
  createdAt?: string;
}

const makeInputId = () => {
  try {
    return `input_${crypto.randomUUID().slice(0, 8)}`;
  } catch {
    return `input_${Date.now()}`;
  }
};

export function ForgeLab({ ventureId }: ForgeLabProps) {
  const [apps, setApps] = useState<ForgeApp[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const normalizeApp = (app: ForgeApp): ForgeApp => ({
    ...app,
    inputs: Array.isArray(app.inputs) ? app.inputs : [],
    workflow: {
      tools: Array.isArray(app.workflow?.tools) ? app.workflow.tools : [],
      model: typeof app.workflow?.model === 'string' ? app.workflow.model : 'google/nano-banana',
    },
  });

  // 1. Backend Sync: Load Apps
  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/apps`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Fehler beim Laden der Apps');
      setApps(Array.isArray(data) ? data.map(normalizeApp) : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ventureId]);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const handleAppCreated = async () => {
    try {
      const defaultInputId = 'produkt';
      const newAppData = {
        name: 'Neue KI-App',
        description: 'Beschreibe, was diese App macht...',
        inputs: [
          {
            id: defaultInputId,
            label: 'Produkt',
            type: 'text',
            placeholder: 'z.B. Leder-Rucksack',
            required: true
          }
        ],
        template: `Ein professionelles Foto von [${defaultInputId}]`,
        workflow: { tools: [], model: 'google/nano-banana' }
      };

      const res = await fetch(`/api/ventures/${ventureId}/marketing/apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppData)
      });
      
      if (!res.ok) throw new Error('App konnte nicht erstellt werden');
      const savedApp = normalizeApp(await res.json());
      
      setApps([savedApp, ...apps]);
      setSelectedAppId(savedApp.id);
      setIsEditing(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAppUpdate = async (updated: ForgeApp) => {
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/apps/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen');
      
      const saved = normalizeApp(await res.json());
      setApps(apps.map(a => a.id === saved.id ? saved : a));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAppDelete = async (appId: string) => {
    if (!confirm('App wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/apps/${appId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Löschen fehlgeschlagen');
      
      setApps(apps.filter(a => a.id !== appId));
      if (selectedAppId === appId) setSelectedAppId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const activeApp = apps.find(a => a.id === selectedAppId) || null;

  return (
    <div className="flex h-[800px] rounded-3xl overflow-hidden border border-white/10 bg-[#0A0A0B]">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 flex flex-col bg-black/20">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-instrument-serif text-white flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#FF9900]" />
            Forge Lab
          </h2>
          <button 
            onClick={handleAppCreated}
            title="Neue App erstellen"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && <div className="p-4 text-center text-[10px] text-white/20">Lade Apps...</div>}
          {!loading && apps.length === 0 && (
            <div className="p-8 text-center text-[10px] text-white/20">
              Noch keine Apps.<br/>Erstelle dein erstes KI-Tool.
            </div>
          )}
          {apps.map(app => (
            <div
              key={app.id}
              role="button"
              tabIndex={0}
              aria-pressed={selectedAppId === app.id}
              onClick={() => { setSelectedAppId(app.id); setIsEditing(false); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedAppId(app.id);
                  setIsEditing(false);
                }
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all group relative cursor-pointer ${
                selectedAppId === app.id
                  ? 'bg-[#FF9900]/10 border-[#FF9900]/50 text-white'
                  : 'bg-transparent border-transparent hover:bg-white/5 text-white/60'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-xs">{app.name}</span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                    className="p-1 hover:text-[#FF9900] transition-colors"
                    title="Konfigurieren"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleAppDelete(app.id); }}
                    className="p-1 hover:text-red-500 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] opacity-60 line-clamp-2">{app.description || 'Keine Beschreibung'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="m-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        {!activeApp ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-16 h-16 rounded-3xl bg-[#FF9900]/10 flex items-center justify-center mb-6">
               <FlaskConical className="w-8 h-8 text-[#FF9900] opacity-40" />
            </div>
            <h3 className="text-xl font-instrument-serif text-white mb-2">Willkommen im Forge Lab</h3>
            <p className="text-sm text-white/40 text-center max-w-sm mb-8 leading-relaxed">
              Baue deine eigenen spezialisierten KI-Workflows. Verbinde Tools wie Hintergrund-Entfernung mit deinen eigenen Prompts zu einer fertigen "App".
            </p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
               <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-[10px] font-bold text-[#FF9900] uppercase tracking-widest">Schritt 1: Definieren</div>
                  <p className="text-[10px] text-white/40">Lege fest, welche Bilder oder Texte der Nutzer hochladen muss.</p>
               </div>
               <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-[10px] font-bold text-[#FF9900] uppercase tracking-widest">Schritt 2: Automatisieren</div>
                  <p className="text-[10px] text-white/40">Nutze Tools wie "RemBG" und verknüpfe alles in einer Prompt-Vorlage.</p>
               </div>
            </div>
          </div>
        ) : isEditing ? (
          <AppBuilder 
            app={activeApp} 
            onUpdate={handleAppUpdate}
            onClose={() => setIsEditing(false)}
          />
        ) : (
          <AppRunner 
            app={activeApp} 
            ventureId={ventureId}
            onEdit={() => setIsEditing(true)}
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// BUILDER COMPONENT
// ==========================================

function AppBuilder({ app, onUpdate, onClose }: { app: ForgeApp, onUpdate: (app: ForgeApp) => void, onClose: () => void }) {
  const [localApp, setLocalApp] = useState(app);

  const addInput = (type: InputType) => {
    const id = makeInputId();
    const newInput: AppInput = {
      id,
      label: type === 'image' ? 'Neues Bild' : type === 'number' ? 'Neue Zahl' : 'Neues Textfeld',
      type,
      required: true,
      placeholder: type === 'text' || type === 'number' ? 'Hier eingeben...' : undefined
    };
    setLocalApp({ ...localApp, inputs: [...localApp.inputs, newInput] });
  };

  const removeInput = (id: string) => {
    setLocalApp({ ...localApp, inputs: localApp.inputs.filter(i => i.id !== id) });
  };

  const updateInput = (id: string, updates: Partial<AppInput>) => {
    setLocalApp({
      ...localApp,
      inputs: localApp.inputs.map(i => i.id === id ? { ...i, ...updates } : i)
    });
  };

  const inputIdRegex = /^[a-zA-Z0-9_]+$/;
  const idCounts = localApp.inputs.reduce<Record<string, number>>((acc, input) => {
    const key = input.id.trim();
    if (!key) return acc;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const duplicateIds = Object.keys(idCounts).filter((id) => idCounts[id] > 1);
  const invalidIds = localApp.inputs
    .map((input) => input.id)
    .filter((id) => !id.trim() || !inputIdRegex.test(id));
  const validationErrors = [
    !localApp.name.trim() ? 'App-Name fehlt.' : null,
    duplicateIds.length > 0 ? `Doppelte IDs: ${duplicateIds.join(', ')}` : null,
    invalidIds.length > 0 ? 'Ungültige IDs (nur a-z, 0-9, _).' : null
  ].filter(Boolean) as string[];
  const canSave = validationErrors.length === 0;

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0B]">
      {/* Header */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/20">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-[#FF9900]/20 flex items-center justify-center text-[#FF9900] font-bold">
            <Settings className="w-4 h-4" />
          </div>
          <input 
            value={localApp.name}
            onChange={(e) => setLocalApp({ ...localApp, name: e.target.value })}
            className="bg-transparent text-white font-bold text-sm focus:outline-none border-b border-transparent focus:border-[#FF9900]"
            placeholder="App Name"
          />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-white/60 hover:text-white">Abbrechen</button>
          <button 
            onClick={() => canSave && onUpdate(localApp)}
            disabled={!canSave}
            className="px-4 py-2 rounded-lg bg-[#FF9900] text-black text-xs font-bold hover:brightness-110 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3 h-3" />
            Änderungen speichern
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Left: Configuration */}
        <div className="border-r border-white/10 p-6 overflow-y-auto space-y-8">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">App Beschreibung</h3>
              <span title="Wird dem Nutzer als Hilfe angezeigt.">
                <HelpCircle className="w-3 h-3 text-white/20" />
              </span>
            </div>
            <textarea 
              value={localApp.description}
              onChange={(e) => setLocalApp({ ...localApp, description: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-xs focus:border-[#FF9900] outline-none resize-none"
              placeholder="Was macht diese App?"
              rows={2}
            />
          </div>

          {/* Inputs Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Benutzereingaben</h3>
                 <span title="Definiere die Felder, die der Nutzer ausfüllen soll.">
                    <HelpCircle className="w-3 h-3 text-white/20" />
                 </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => addInput('text')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center gap-2 text-[10px]">
                  <Type className="w-3 h-3" /> + Text
                </button>
                <button onClick={() => addInput('number')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center gap-2 text-[10px]">
                  <Hash className="w-3 h-3" /> + Zahl
                </button>
                <button onClick={() => addInput('image')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center gap-2 text-[10px]">
                  <ImageIcon className="w-3 h-3" /> + Bild
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {validationErrors.length > 0 && (
                <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {validationErrors.join(' ')}
                </div>
              )}
              {localApp.inputs.map((input) => (
                <div key={input.id} className="p-3 rounded-xl border border-white/10 bg-white/5 group">
                  <div className="flex items-center gap-3 mb-2">
                    {input.type === 'image' ? (
                      <ImageIcon className="w-4 h-4 text-[#FF9900]" />
                    ) : input.type === 'number' ? (
                      <Hash className="w-4 h-4 text-[#FF9900]" />
                    ) : (
                      <Type className="w-4 h-4 text-[#FF9900]" />
                    )}
                    <input 
                      value={input.label}
                      onChange={(e) => updateInput(input.id, { label: e.target.value })}
                      className="flex-1 bg-transparent text-xs font-bold text-white focus:outline-none"
                      placeholder="Anzeige-Name (z.B. Dein Produkt)"
                    />
                    <button onClick={() => removeInput(input.id)} className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-black/40 border border-white/5 rounded px-3 py-1.5">
                       <span className="text-[9px] text-white/30 font-mono">ID:</span>
                       <input 
                        value={input.id}
                        onChange={(e) => updateInput(input.id, { id: e.target.value.replace(/\s/g, '_') })}
                        className="bg-transparent text-[10px] text-white/60 font-mono focus:outline-none w-full"
                        placeholder="Variable Name"
                        title="Dies ist die ID für den Prompt."
                      />
                    </div>
                    <label className="flex items-center gap-2 text-[9px] text-white/40">
                      <input
                        type="checkbox"
                        checked={input.required !== false}
                        onChange={(e) => updateInput(input.id, { required: e.target.checked })}
                        className="rounded border-white/20 bg-black/40 text-[#FF9900]"
                      />
                      Required
                    </label>
                  </div>
                  {(input.type === 'text' || input.type === 'number') && (
                    <div className="mt-2 flex items-center gap-2 bg-black/40 border border-white/5 rounded px-3 py-1.5">
                      <span className="text-[9px] text-white/30">Placeholder:</span>
                      <input
                        value={input.placeholder || ''}
                        onChange={(e) => updateInput(input.id, { placeholder: e.target.value })}
                        className="bg-transparent text-[10px] text-white/60 focus:outline-none w-full"
                        placeholder="Optionaler Hinweistext"
                      />
                    </div>
                  )}
                </div>
              ))}
              {localApp.inputs.length === 0 && (
                <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-white/20 text-[10px] uppercase tracking-widest">
                  Keine Eingaben definiert
                </div>
              )}
            </div>
          </div>

          {/* Workflow Section */}
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tools & KI-Modell</h3>
                <span title="Lege fest, welche KI und welche Tools genutzt werden.">
                    <HelpCircle className="w-3 h-3 text-white/20" />
                </span>
             </div>
             <div className="space-y-2">
               <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
                  <input 
                    type="checkbox"
                    checked={localApp.workflow.tools.includes('rembg')}
                    onChange={(e) => {
                      const newTools = e.target.checked 
                        ? [...localApp.workflow.tools, 'rembg']
                        : localApp.workflow.tools.filter(t => t !== 'rembg');
                      setLocalApp({ ...localApp, workflow: { ...localApp.workflow, tools: newTools } });
                    }}
                    className="rounded border-white/20 bg-black/40 text-[#FF9900]"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white">Auto Hintergrund-Entferner</div>
                    <div className="text-[10px] text-white/50">Bereinigt alle Bilder vor der Generierung.</div>
                  </div>
                  <Eraser className="w-4 h-4 text-white/40" />
               </div>

               <div className="p-3 rounded-xl border border-white/10 bg-white/5 space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40">Basis-Modell</label>
                  <select
                    value={localApp.workflow.model}
                    onChange={(e) => setLocalApp({ ...localApp, workflow: { ...localApp.workflow, model: e.target.value } })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="google/nano-banana">Nano Banana (Schnell)</option>
                    <option value="google/nano-banana-pro">Nano Banana Pro (Qualität)</option>
                  </select>
               </div>
             </div>
          </div>

        </div>

        {/* Right: Template Editor */}
        <div className="p-6 flex flex-col h-full bg-[#0A0A0B]">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Prompt Vorlage</h3>
                <span title="Schreibe hier den Master-Prompt. Platzhalter werden automatisch ersetzt.">
                    <HelpCircle className="w-3 h-3 text-white/20" />
                </span>
             </div>
             <span className="text-[9px] text-white/30">Nutze [id] für Platzhalter</span>
          </div>
          <div className="flex-1 relative">
            <textarea
              value={localApp.template}
              onChange={(e) => setLocalApp({ ...localApp, template: e.target.value })}
              className="w-full h-full bg-white/5 border border-white/10 rounded-xl p-6 text-sm font-mono text-white/80 focus:border-[#FF9900] outline-none resize-none leading-relaxed"
              placeholder="A professional studio photography of [produkt], standing on a [hintergrund]..."
            />
            {/* Variable Suggestions */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2 p-3 bg-black/60 backdrop-blur rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                 <Lightbulb className="w-3 h-3 text-[#FF9900]" />
                 <span className="text-[9px] text-white/60 font-bold uppercase tracking-widest">Klicken zum Einfügen</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {localApp.inputs.length === 0 && <span className="text-[9px] text-white/20 italic">Füge Eingaben hinzu, um Variablen zu sehen</span>}
                {localApp.inputs.map(input => (
                  <button
                    key={input.id}
                    type="button"
                    onClick={() => setLocalApp({ ...localApp, template: localApp.template + `[${input.id}]` })}
                    className="px-2 py-1 rounded bg-[#FF9900]/10 border border-[#FF9900]/30 text-[#FF9900] text-[10px] font-mono hover:bg-[#FF9900]/20 transition-colors whitespace-nowrap"
                  >
                    [{input.id}]
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// RUNNER COMPONENT
// ==========================================

function AppRunner({ app, ventureId, onEdit }: { app: ForgeApp, ventureId: string, onEdit: () => void }) {
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const missingRequired = app.inputs.filter((input) => {
    const isRequired = input.required !== false;
    if (!isRequired) return false;
    const value = inputValues[input.id];
    if (input.type === 'image') return !(value instanceof File);
    if (input.type === 'number') return value === undefined || value === null || value === '';
    return !value;
  });

  const run = async () => {
    if (missingRequired.length > 0) {
      alert(`Bitte fülle die Pflichtfelder aus: ${missingRequired.map(i => i.label).join(', ')}`);
      return;
    }
    setIsGenerating(true);
    setResult(null);
    setLogs(['Forge Lab Sequenz gestartet...']);

    try {
      const processedInputs = { ...inputValues };

      // Step 1: Tool Execution (e.g., RemBG)
      if (app.workflow.tools.includes('rembg')) {
        for (const input of app.inputs) {
          if (input.type === 'image' && inputValues[input.id]) {
            addLog(`Schritt 1/2: Hintergrund entfernen für "${input.label}"...`);
            
            const formData = new FormData();
            formData.append('image', inputValues[input.id]);

            const res = await fetch(`/api/ventures/${ventureId}/marketing/tools/rembg`, {
              method: 'POST',
              body: formData
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'RemBG fehlgeschlagen');
            
            processedInputs[input.id] = data.asset.url;
            addLog(`Hintergrund erfolgreich entfernt.`);
          }
        }
      }

      // Step 2: Build Prompt
      let prompt = app.template;
      for (const input of app.inputs) {
        const token = `[${input.id}]`;
        if (input.type === 'text' || input.type === 'number') {
           const value = processedInputs[input.id] ?? '';
           prompt = prompt.split(token).join(String(value));
        } else {
           const replacement = input.label || 'image';
           prompt = prompt.split(token).join(replacement);
        }
      }
      
      addLog(`Schritt 2/2: Generiere Visual mit ${app.workflow.model.split('/').pop()}...`);
      
      const genFormData = new FormData();
      genFormData.append('model', app.workflow.model);
      genFormData.append('prompt', prompt);
      genFormData.append('mode', app.inputs.some(i => i.type === 'image') ? 'image-to-image' : 'text-to-image');
      genFormData.append('originTag', 'forge-lab');
      
      for (const input of app.inputs) {
        if (input.type === 'image') {
           const val = processedInputs[input.id];
           if (typeof val === 'string' && val.startsWith('http')) {
             const blobRes = await fetch(val);
             const blob = await blobRes.blob();
             genFormData.append('images', blob, 'processed_input.png');
           } else if (val instanceof File) {
             genFormData.append('images', val);
           }
        }
      }

      const res = await fetch(`/api/ventures/${ventureId}/marketing/nano-banana`, {
        method: 'POST',
        body: genFormData
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Generierung fehlgeschlagen');
      
      if (data.assets && data.assets.length > 0) {
        setResult(data.assets[0].url);
        addLog('Workflow erfolgreich abgeschlossen.');
      } else {
        throw new Error('Keine Bilder vom Generator erhalten');
      }

    } catch (err: any) {
      addLog(`FEHLER: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0B]">
      {/* Header */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/20">
        <div className="flex items-center gap-3">
           <h2 className="text-sm font-bold text-white">{app.name}</h2>
           <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">
             {app.workflow.model.split('/').pop()}
           </span>
        </div>
        <button onClick={onEdit} className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-2 transition-colors">
           <Settings className="w-3 h-3" /> Konfiguration bearbeiten
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Left: Inputs */}
        <div className="p-8 space-y-6 overflow-y-auto border-r border-white/10">
          <div className="space-y-1 mb-6">
            <h3 className="text-xs font-bold text-white/80">Eingabe-Parameter</h3>
            <p className="text-[10px] text-white/40">{app.description || 'Fülle die Felder aus, um den KI-Workflow zu starten.'}</p>
          </div>

          <div className="space-y-6">
            {app.inputs.map(input => (
              <div key={input.id} className="space-y-2">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                   {input.label}{input.required !== false ? ' *' : ''}
                 </label>
                 {input.type === 'text' ? (
                   <input 
                      type="text"
                      placeholder={input.placeholder || 'Hier eingeben...'}
                      onChange={(e) => setInputValues({ ...inputValues, [input.id]: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                   />
                 ) : input.type === 'number' ? (
                   <input
                     type="number"
                     placeholder={input.placeholder || '0'}
                     onChange={(e) => setInputValues({ ...inputValues, [input.id]: e.target.value })}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                   />
                 ) : (
                   <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/40 px-6 py-8 text-white/50 text-xs cursor-pointer hover:bg-white/5 transition-colors group">
                        {inputValues[input.id] ? (
                          <div className="text-[#FF9900] font-bold flex flex-col items-center gap-2">
                            <CheckCircleIcon className="w-6 h-6" />
                            <span className="text-[10px]">{inputValues[input.id].name}</span>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="w-6 h-6 mb-1 opacity-20 group-hover:opacity-100 transition-opacity" />
                            <span className="text-[10px] uppercase tracking-widest font-bold">Bild auswählen</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setInputValues({ ...inputValues, [input.id]: e.target.files?.[0] })}
                        />
                    </label>
                   </div>
                 )}
              </div>
            ))}
          </div>

          <button
            onClick={run}
            disabled={isGenerating || missingRequired.length > 0}
            className="w-full mt-10 relative group overflow-hidden rounded-2xl bg-[#FF9900] p-4 text-black font-black uppercase tracking-[0.2em] text-xs hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Workflow ausführen
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
          </button>
          {missingRequired.length > 0 && (
            <div className="text-[10px] text-red-400 mt-2">
              Pflichtfelder fehlen: {missingRequired.map(i => i.label).join(', ')}
            </div>
          )}

          {/* Logs */}
          <div className="mt-8">
             <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 px-1">Live Ausführungs-Log</div>
             <div className="p-4 rounded-xl bg-black/60 border border-white/10 h-40 overflow-y-auto font-mono text-[10px] text-[#FF9900]/60 space-y-1.5 scrollbar-hide">
                {logs.length === 0 && <div className="text-white/10 italic">Warte auf Start...</div>}
                {logs.map((log, i) => <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">{log}</div>)}
             </div>
          </div>
        </div>

        {/* Right: Output */}
        <div className="bg-black/60 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
           {isGenerating && !result && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                 <div className="absolute inset-0 pointer-events-none">
                    <Hyperspeed
                      className="absolute inset-0"
                      effectOptions={hyperspeedPresets.three}
                    />
                 </div>
                 <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                 
                 <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="relative scale-125">
                      <Sparkles className="w-10 h-10 text-[#FF9900] animate-pulse" />
                      <div className="absolute inset-0 animate-ping">
                        <Sparkles className="w-10 h-10 text-[#FF9900] opacity-30" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Vision wird geschmiedet</p>
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-[bounce_1s_ease-in-out_0s_infinite]" />
                        <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-[bounce_1s_ease-in-out_0.2s_infinite]" />
                        <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-[bounce_1s_ease-in-out_0.4s_infinite]" />
                      </div>
                    </div>
                 </div>
              </div>
           )}

           {result ? (
             <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(212,175,55,0.15)] border border-[#FF9900]/20 group">
                <img src={result} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                   <div className="flex gap-2">
                      <a 
                        href={result} 
                        target="_blank"
                        className="flex-1 bg-white text-black text-[10px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#FF9900] transition-all"
                      >
                        <Download className="w-4 h-4" /> Download
                      </a>
                   </div>
                </div>
             </div>
           ) : (
             <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 relative">
                   <Layers className="w-8 h-8 text-white/10" />
                   <div className="absolute inset-0 border-2 border-dashed border-white/5 rounded-full animate-[spin_20s_linear_infinite]" />
                </div>
                <h4 className="text-white/40 font-bold text-xs uppercase tracking-widest mb-2">Vorschau</h4>
                <p className="text-[10px] text-white/20 max-w-[200px] mx-auto">Sobald der Workflow abgeschlossen ist, erscheint hier dein generiertes Asset.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
