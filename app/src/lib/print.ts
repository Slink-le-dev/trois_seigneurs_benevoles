import { formatCreneau } from './format';
import { Affectation, Benevole, POSTE_TYPES, Poste } from '../types';

export function printFeuilleDeRoute(poste: Poste, parcoursNoms: string[], affectations: Affectation[], benevoles: Benevole[]) {
  const win = window.open('', '_blank', 'width=600,height=800');
  if (!win) return;

  const types = poste.types
    .map((t) => POSTE_TYPES.find((pt) => pt.code === t))
    .filter(Boolean)
    .map((pt) => `${pt!.emoji} ${pt!.label}`)
    .join(', ');

  const benevolesRows = affectations
    .map((a) => {
      const b = benevoles.find((x) => x.id === a.benevole_id);
      return `<tr><td>${b?.nom ?? '?'}</td><td>${b?.telephone ?? ''}</td><td>${formatCreneau(a.heure_debut, a.heure_fin) ?? '—'}</td></tr>`;
    })
    .join('');

  win.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Feuille de route — N°${poste.numero} ${poste.nom}</title>
        <style>
          body { font-family: sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          td, th { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 14px; }
          .meta { font-size: 14px; margin: 4px 0; }
        </style>
      </head>
      <body>
        <h1>N°${poste.numero} — ${poste.nom}</h1>
        <p class="meta"><strong>Parcours :</strong> ${parcoursNoms.join(', ') || '—'}</p>
        <p class="meta"><strong>Type(s) :</strong> ${types || '—'}</p>
        <p class="meta"><strong>Coordonnées GPS :</strong> ${poste.lat.toFixed(5)}, ${poste.lng.toFixed(5)}</p>
        <p class="meta"><strong>Notes :</strong> ${poste.notes ?? '—'}</p>
        <table>
          <thead><tr><th>Bénévole</th><th>Téléphone</th><th>Créneau</th></tr></thead>
          <tbody>${benevolesRows || '<tr><td colspan="3">Aucun bénévole affecté</td></tr>'}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
}
