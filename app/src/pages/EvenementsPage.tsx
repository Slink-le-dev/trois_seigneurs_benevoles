import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import AdminLogin from './AdminLogin';
import { supabase } from '../lib/supabaseClient';
import { useSession } from '../lib/useSession';
import { Evenement } from '../types';

export default function EvenementsPage() {
  const { session, loading: sessionLoading, signOut } = useSession();

  if (sessionLoading) return <div className="p-6 text-center text-gray-500">Chargement…</div>;
  if (!session) return <AdminLogin />;

  return <EvenementsContent onSignOut={signOut} />;
}

function formatDate(debut: string, fin?: string | null) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const d = new Date(debut + 'T12:00:00').toLocaleDateString('fr-FR', opts);
  if (fin) {
    const f = new Date(fin + 'T12:00:00').toLocaleDateString('fr-FR', opts);
    return `${d} – ${f}`;
  }
  return d;
}

function EvenementsContent({ onSignOut }: { onSignOut: () => void }) {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('evenements')
      .select('*')
      .order('date_debut', { ascending: false })
      .then(({ data }) => {
        setEvenements(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-[#00C389] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo VO2max Tarascon" className="h-8 w-8 rounded-full" />
          <h1 className="font-semibold">Espace organisateur</h1>
        </div>
        <button onClick={onSignOut} className="text-sm underline opacity-80 hover:opacity-100">
          Déconnexion
        </button>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <h2 className="text-xl font-bold text-gray-800 mb-5">Mes évènements</h2>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement…</div>
        ) : evenements.length === 0 ? (
          <div className="text-center text-gray-400 py-12">Aucun évènement trouvé.</div>
        ) : (
          <div className="space-y-3">
            {evenements.map((evt) => (
              <Link
                key={evt.id}
                to={`/admin/${evt.slug}`}
                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-[#00C389] hover:shadow-sm transition-all group"
              >
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-[#005F61]">{evt.nom}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{formatDate(evt.date_debut, evt.date_fin)}</div>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-[#00C389] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
