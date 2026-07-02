import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError("Identifiants incorrects.");
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 w-full max-w-sm space-y-3">
        <h1 className="text-lg font-semibold text-center">Espace organisateur</h1>
        <input
          type="email"
          placeholder="Email"
          required
          className="border rounded w-full px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          required
          className="border rounded w-full px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={busy} className="bg-blue-600 text-white w-full py-2 rounded">
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <a href="/benevoles" className="block text-center text-sm text-gray-500 underline">
          Retour à la vue bénévole
        </a>
      </form>
    </div>
  );
}
