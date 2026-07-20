import { useEffect, useRef, useState } from 'react';
import defaultLogo from '../assets/logo-las-quatras-cabanas.png';
import { supabase } from '../lib/supabaseClient';

const PRESET_COLORS = [
  '#00C389', '#00a874', '#005F61', '#0ea5e9', '#2563eb', '#1d4ed8',
  '#7c3aed', '#9333ea', '#db2777', '#ec4899', '#dc2626', '#b91c1c',
  '#f97316', '#ea580c', '#eab308', '#d97706', '#16a34a', '#15803d',
  '#F3EA5D', '#fbbf24', '#374151', '#6b7280', '#ffffff', '#000000',
];

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setHex(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function handleHex(v: string) {
    setHex(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
  }

  return (
    <div className="flex-1">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
        >
          <span className="w-5 h-5 rounded border border-gray-200 flex-shrink-0" style={{ background: value }} />
          <span className="font-mono text-gray-700 flex-1 text-left">{value}</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border rounded-xl shadow-xl p-3 w-56">
            <div className="grid grid-cols-6 gap-1.5 mb-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onChange(c); setHex(c); setOpen(false); }}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: value === c ? '#111' : c === '#ffffff' ? '#d1d5db' : 'transparent' }}
                  title={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded border border-gray-200 flex-shrink-0" style={{ background: hex }} />
              <input
                type="text"
                value={hex}
                onChange={(e) => handleHex(e.target.value)}
                maxLength={7}
                placeholder="#000000"
                className="flex-1 border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#00C389]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const [organisateurNom, setOrganisateurNom] = useState('');
  const [telephonePcSecurite, setTelephonePcSecurite] = useState('');
  const [couleurPrincipale, setCouleurPrincipale] = useState('#00C389');
  const [couleurSecondaire, setCouleurSecondaire] = useState('#F3EA5D');
  const [couleurTertiaire, setCouleurTertiaire] = useState('#374151');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    supabase.from('app_settings').select('organisateur_nom, telephone_pc_securite, couleur_principale, couleur_secondaire, couleur_tertiaire, logo_url').single()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        setOrganisateurNom(d.organisateur_nom ?? '');
        setTelephonePcSecurite(d.telephone_pc_securite ?? '');
        setCouleurPrincipale(d.couleur_principale ?? '#00C389');
        setCouleurSecondaire(d.couleur_secondaire ?? '#F3EA5D');
        setCouleurTertiaire(d.couleur_tertiaire ?? '#374151');
        setLogoUrl(d.logo_url ?? null);
      });
  }, []);

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    setLogoError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const path = `logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (uploadError) {
      setLogoError(uploadError.message);
      setLogoUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
    // Append version param so browsers fetch fresh after each upload
    const freshUrl = `${urlData.publicUrl}?v=${Date.now()}`;
    await supabase.from('app_settings').update({ logo_url: freshUrl }).eq('id', 1);
    setLogoUrl(freshUrl);
    setLogoUploading(false);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    await supabase.from('app_settings').update({
      organisateur_nom: organisateurNom,
      telephone_pc_securite: telephonePcSecurite,
      couleur_principale: couleurPrincipale,
      couleur_secondaire: couleurSecondaire,
      couleur_tertiaire: couleurTertiaire,
    }).eq('id', 1);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-lg font-bold text-gray-900">Profil organisateur</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* ---- Informations ---- */}
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide text-gray-500">Informations</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'organisateur</label>
              <input
                type="text"
                value={organisateurNom}
                onChange={(e) => setOrganisateurNom(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                placeholder="Nom du club ou de l'organisation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numéro PC sécurité</label>
              <input
                type="tel"
                value={telephonePcSecurite}
                onChange={(e) => setTelephonePcSecurite(e.target.value)}
                placeholder="06 00 00 00 00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C389]"
              />
              <p className="text-xs text-gray-400 mt-1">Affiché sur les vues Admin, Bénévoles et Participant</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo de l'organisation</label>
              <div className="flex items-center gap-4">
                <img
                  src={logoUrl ?? defaultLogo}
                  alt="Logo actuel"
                  className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                />
                <div className="flex-1">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="px-3 py-1.5 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {logoUploading ? 'Téléchargement…' : logoUrl ? 'Modifier le logo' : 'Ajouter un logo'}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG ou SVG · format carré recommandé</p>
                  {logoError && <p className="text-xs text-red-600 mt-1">{logoError}</p>}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <ColorPicker label="Couleur principale" value={couleurPrincipale} onChange={setCouleurPrincipale} />
              <ColorPicker label="Couleur secondaire" value={couleurSecondaire} onChange={setCouleurSecondaire} />
              <ColorPicker label="Couleur tertiaire" value={couleurTertiaire} onChange={setCouleurTertiaire} />
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 flex-wrap">
              <span className="text-xs text-gray-500">Aperçu :</span>
              <span
                className="px-3 py-1 rounded-full text-white text-xs font-medium"
                style={{ background: couleurPrincipale }}
              >
                Principale
              </span>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium border-b-2"
                style={{ borderColor: couleurSecondaire, color: couleurPrincipale }}
              >
                Secondaire
              </span>
              <span
                className="px-3 py-1 rounded-full text-white text-xs font-medium"
                style={{ background: couleurTertiaire }}
              >
                Tertiaire
              </span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60"
              style={{ background: couleurPrincipale }}
            >
              {saving ? 'Enregistrement…' : saveSuccess ? '✓ Enregistré' : 'Enregistrer le profil'}
            </button>
          </form>

          {/* ---- Mot de passe ---- */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-4">Mot de passe</h3>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>
              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              {passwordSuccess && <p className="text-sm text-green-600">✓ Mot de passe modifié avec succès.</p>}
              <button
                type="submit"
                disabled={passwordSaving}
                className="w-full py-2 rounded-lg text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-60"
              >
                {passwordSaving ? 'Modification…' : 'Modifier le mot de passe'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
