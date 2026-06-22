import { useMemo, useState } from 'react';
import { Affectation, POSTE_STATUTS, Poste } from '../types';

interface StatusDashboardProps {
  postes: Poste[];
  affectations: Affectation[];
  onSelectPoste: (id: string) => void;
}

const JOUR_REFERENCE_STORAGE_KEY = 'postes-signaleurs:jour-reference';

function dateLocale(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function StatusDashboard({ postes, affectations, onSelectPoste }: StatusDashboardProps) {
  const [heureSeuil, setHeureSeuil] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [jourReference, setJourReference] = useState(() => localStorage.getItem(JOUR_REFERENCE_STORAGE_KEY) ?? dateLocale(new Date()));

  function handleJourReferenceChange(value: string) {
    setJourReference(value);
    localStorage.setItem(JOUR_REFERENCE_STORAGE_KEY, value);
  }

  const estAujourdhui = jourReference === dateLocale(new Date());

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of POSTE_STATUTS) map[s.code] = 0;
    for (const p of postes) map[p.statut] = (map[p.statut] ?? 0) + 1;
    return map;
  }, [postes]);

  const postesEnRetard = useMemo(() => {
    if (!estAujourdhui) return [];
    return postes
      .filter((p) => p.statut === 'non_active')
      .map((p) => {
        const heuresDebut = affectations
          .filter((a) => a.poste_id === p.id)
          .map((a) => a.heure_debut)
          .filter((h): h is string => !!h);
        const premiereHeure = heuresDebut.sort()[0];
        return { poste: p, premiereHeure };
      })
      .filter(({ premiereHeure }) => premiereHeure && premiereHeure.slice(0, 5) < heureSeuil)
      .sort((a, b) => (a.premiereHeure ?? '').localeCompare(b.premiereHeure ?? ''));
  }, [postes, affectations, heureSeuil, estAujourdhui]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-sm uppercase text-gray-500 mb-2">Postes par statut</h2>
        <div className="flex gap-3 flex-wrap">
          {POSTE_STATUTS.map((s) => (
            <div key={s.code} className="flex items-center gap-1 px-2 py-1 rounded border text-sm">
              <span style={{ color: s.couleur }}>●</span> {s.label} : <strong>{counts[s.code] ?? 0}</strong>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-sm uppercase text-gray-500 mb-2">
          Postes non activés en retard
        </h2>
        <div className="flex flex-wrap gap-4 mb-2">
          <label className="text-sm flex items-center gap-2">
            Jour de référence :
            <input
              type="date"
              value={jourReference}
              onChange={(e) => handleJourReferenceChange(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </label>
          <label className="text-sm flex items-center gap-2">
            Heure de référence :
            <input type="time" value={heureSeuil} onChange={(e) => setHeureSeuil(e.target.value)} className="border rounded px-2 py-1" />
          </label>
        </div>
        {!estAujourdhui ? (
          <p className="text-sm text-gray-400">
            Les alertes ne s'affichent que pour le jour de référence sélectionné (aujourd'hui : {dateLocale(new Date())}).
          </p>
        ) : postesEnRetard.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun poste en retard pour cette heure.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {postesEnRetard.map(({ poste, premiereHeure }) => (
              <li key={poste.id}>
                <button className="text-red-600 underline" onClick={() => onSelectPoste(poste.id)}>
                  N°{poste.numero} — {poste.nom}
                </button>{' '}
                — prévu à {premiereHeure?.slice(0, 5)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
