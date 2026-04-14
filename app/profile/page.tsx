'use client';

import { useState, useEffect, useRef } from 'react';
import PageShell from '@/components/PageShell';
import AuthGuard from '@/components/AuthGuard';
import { 
  User, MapPin, Briefcase, 
  Save, CheckCircle, 
  Camera, Loader2,
  Trophy, 
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const skillOptions = ['Tech', 'Marketing', 'Sales', 'Operations', 'Finance', 'Legal', 'Creative', 'E-Commerce'];

type Tab = 'identity' | 'expertise' | 'security';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [, setUploadError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('identity');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
  const MAX_AVATAR_DIMENSION = 1400;
  
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    phone: '',
    birthday: '',
    address_street: '',
    address_city: '',
    address_zip: '',
    address_country: 'Germany',
    instagram: '',
    linkedin: '',
    bio: '',
    skills: [] as string[],
    goal: ''
  });

  const normalizeProfileData = (data: any) => ({
    name: data?.name || '',
    image: data?.image || '',
    phone: data?.phone || '',
    birthday: data?.birthday || '',
    address_street: data?.address_street || '',
    address_city: data?.address_city || '',
    address_zip: data?.address_zip || '',
    address_country: data?.address_country || 'Germany',
    instagram: data?.instagram || '',
    linkedin: data?.linkedin || '',
    bio: data?.bio || '',
    skills: Array.isArray(data?.skills) ? data.skills : [],
    goal: data?.goal || ''
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const data = await res.json();
          setFormData(prev => ({ ...prev, ...normalizeProfileData(data) }));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    loadProfile();
  }, []);

  const loadImage = (file: File) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Image load failed'));
      };
      img.src = objectUrl;
    });

  const compressImage = async (file: File) => {
    const img = await loadImage(file);
    const scale = Math.min(
      1,
      MAX_AVATAR_DIMENSION / Math.max(img.width || 1, img.height || 1)
    );
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Image export failed'))),
        'image/jpeg',
        0.82
      );
    });
    const nextName = file.name.replace(/\.[^.]+$/, '.jpg');
    return new File([blob], nextName, { type: 'image/jpeg' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');
    try {
      const preparedFile =
        file.size > MAX_AVATAR_BYTES ? await compressImage(file) : file;
      const response = await fetch(`/api/me/update-image?filename=${encodeURIComponent(preparedFile.name)}`, {
        method: 'POST',
        body: preparedFile,
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Upload fehlgeschlagen');

      setFormData(prev => ({ ...prev, image: payload.url }));
    } catch (error) {
      console.error('Upload failed', error);
      setUploadError('Upload fehlgeschlagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) 
        ? prev.skills.filter(s => s !== skill) 
        : [...prev.skills, skill]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/me/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Dossier wird geladen</span>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <PageShell>
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          
          {/* PROFILE HEADER - PRO STYLE */}
          <div className="relative mb-12 rounded-[2.5rem] overflow-hidden border border-white/10 glass-card">
            {/* Cover Image Placeholder */}
            <div className="h-48 md:h-64 w-full bg-linear-to-br from-[#1a1a1a] via-[#0a0a0a] to-[#050505] relative overflow-hidden">
               <div className="absolute inset-0 bg-grid-small opacity-20" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
            </div>

            <div className="px-8 pb-10 -mt-16 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
                {/* Avatar Section */}
                <div className="relative group self-start">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-[#0f0f0f] border-4 border-[#050505] overflow-hidden shadow-2xl relative">
                    {formData.image ? (
                      <img src={formData.image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-black text-[#FF9900]">
                        {formData.name?.charAt(0) || '?'}
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 text-[#FF9900] animate-spin" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-3 bg-[#FF9900] rounded-2xl text-black shadow-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                </div>

                {/* Basic Info */}
                <div className="flex-1 pb-2">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-5xl font-instrument-serif text-white">{formData.name || 'Neuer Operator'}</h1>
                    <span className="px-2 py-0.5 rounded-md bg-[#FF9900]/10 border border-[#FF9900]/30 text-[9px] font-black text-[#FF9900] uppercase tracking-widest">Founder</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-white/40 text-sm">
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-4 h-4 text-[#FF9900]" />
                      {formData.address_city || 'Standort unbekannt'}
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Briefcase className="w-4 h-4 text-[#FF9900]" />
                      {formData.skills.slice(0, 2).join(', ') || 'Keine Expertise angegeben'}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3 mb-2 self-start md:self-end">
                   <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3.5 bg-white text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#FF9900] transition-all disabled:opacity-50"
                   >
                     {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     Dossier Sichern
                   </button>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="grid lg:grid-cols-[280px_1fr] gap-12">
            
            {/* SIDEBAR NAVIGATION */}
            <aside className="space-y-8">
              <nav className="flex flex-col gap-1">
                <button 
                  onClick={() => setActiveTab('identity')}
                  className={cn(
                    "flex items-center gap-3 px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all",
                    activeTab === 'identity' ? "bg-white/5 text-[#FF9900] border border-white/10" : "text-white/30 hover:text-white hover:bg-white/5"
                  )}
                >
                  <User className="w-4 h-4" /> Identity
                </button>
                <button 
                  onClick={() => setActiveTab('expertise')}
                  className={cn(
                    "flex items-center gap-3 px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all",
                    activeTab === 'expertise' ? "bg-white/5 text-[#FF9900] border border-white/10" : "text-white/30 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Trophy className="w-4 h-4" /> Expertise
                </button>
                <button 
                  onClick={() => setActiveTab('security')}
                  className={cn(
                    "flex items-center gap-3 px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all",
                    activeTab === 'security' ? "bg-white/5 text-[#FF9900] border border-white/10" : "text-white/30 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Lock className="w-4 h-4" /> Sicherheit
                </button>
              </nav>

              <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.02] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Status</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-green-500 uppercase">Aktiv</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Karma</span>
                  <span className="text-[10px] font-bold text-white tracking-widest">1,240 XP</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Dossier</span>
                  <span className="text-[10px] font-bold text-[#FF9900] tracking-widest">85% Ready</span>
                </div>
              </div>
            </aside>

            {/* CONTENT AREA */}
            <main className="space-y-12 pb-32">
              <AnimatePresence mode="wait">
                
                {activeTab === 'identity' && (
                  <motion.div
                    key="identity"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-10"
                  >
                    {/* Identity Group */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-1 h-6 bg-[#FF9900] rounded-full" />
                        <h2 className="text-xl font-instrument-serif text-white tracking-wide">Basis Informationen</h2>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Vollständiger Name</label>
                          <input 
                            type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:bg-white/[0.06] outline-none transition-all placeholder:text-white/10"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Geburtsdatum</label>
                          <input 
                            type="date" value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:bg-white/[0.06] outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Kontakt Kanal (Signal/WA)</label>
                          <input 
                            type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                            placeholder="+49 151..."
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:bg-white/[0.06] outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Primäre Region</label>
                          <input 
                            type="text" value={formData.address_city} onChange={e => setFormData({...formData, address_city: e.target.value})}
                            placeholder="z.B. Berlin, Deutschland"
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:bg-white/[0.06] outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Socials Group */}
                    <div className="space-y-6 pt-6 border-t border-white/5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-1 h-6 bg-[#FF9900] rounded-full" />
                        <h2 className="text-xl font-instrument-serif text-white tracking-wide">Digitale Präsenz</h2>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="relative group">
                          <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#FF9900] transition-colors" />
                          <input 
                            type="text" value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})}
                            placeholder="LinkedIn URL"
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm text-white focus:border-[#FF9900] focus:bg-white/[0.06] outline-none transition-all"
                          />
                        </div>
                        <div className="relative group">
                          <Camera className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#FF9900] transition-colors" />
                          <input 
                            type="text" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})}
                            placeholder="Instagram Profile"
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm text-white focus:border-[#FF9900] focus:bg-white/[0.06] outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'expertise' && (
                  <motion.div
                    key="expertise"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-12"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-1 h-6 bg-[#FF9900] rounded-full" />
                        <h2 className="text-xl font-instrument-serif text-white tracking-wide">Skills & Expertise</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skillOptions.map(skill => (
                          <button
                            key={skill} onClick={() => handleToggleSkill(skill)}
                            className={cn(
                              "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                              formData.skills.includes(skill) 
                                ? "bg-[#FF9900] border-[#FF9900] text-black" 
                                : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10"
                            )}
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-white/5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-1 h-6 bg-[#FF9900] rounded-full" />
                        <h2 className="text-xl font-instrument-serif text-white tracking-wide">Strategische Bio</h2>
                      </div>
                      <textarea 
                        value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})}
                        placeholder="Deine Erfahrung, deine Erfolge, dein Fokus..."
                        className="w-full min-h-[200px] bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-6 text-sm text-white focus:border-[#FF9900] focus:bg-white/[0.06] outline-none transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'security' && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-10"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-1 h-6 bg-red-500 rounded-full" />
                        <h2 className="text-xl font-instrument-serif text-white tracking-wide">Sicherheits & Versanddaten</h2>
                      </div>
                      
                      <div className="glass-card p-8 rounded-[2rem] border border-white/5 space-y-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Anschrift (Straße & Hausnummer)</label>
                          <input 
                            type="text" value={formData.address_street} onChange={e => setFormData({...formData, address_street: e.target.value})}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[#FF9900] outline-none transition-all"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">PLZ</label>
                            <input 
                              type="text" value={formData.address_zip} onChange={e => setFormData({...formData, address_zip: e.target.value})}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[#FF9900] outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Stadt</label>
                            <input 
                              type="text" value={formData.address_city} onChange={e => setFormData({...formData, address_city: e.target.value})}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[#FF9900] outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 rounded-[2rem] border border-white/10 bg-white/[0.02] flex items-center justify-between">
                       <div>
                          <h4 className="text-white font-bold text-sm mb-1">Zwei-Faktor Authentifizierung</h4>
                          <p className="text-white/40 text-[10px] uppercase tracking-widest">Erhöhe die Sicherheit deines Accounts</p>
                       </div>
                       <div className="px-4 py-2 rounded-lg border border-white/10 text-[9px] font-black text-white/30 uppercase tracking-widest">In Kürze</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status Indicator */}
              <AnimatePresence>
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-green-500 font-bold text-[11px] uppercase tracking-widest bg-green-500/5 border border-green-500/20 p-4 rounded-2xl"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Profil erfolgreich mit der Forge synchronisiert
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
