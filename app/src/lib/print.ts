import { formatCreneau } from './format';
import { Affectation, AppelantSpecial, Benevole, MainCouranteEvent, POSTE_TYPES, Poste } from '../types';

const APPELANT_SPECIAL_LABELS: Record<AppelantSpecial, string> = {
  coureur: 'Coureur',
  croix_rouge: 'Croix-Rouge',
  autre: 'Autre',
};

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

export function printMainCourante(events: MainCouranteEvent[], postes: Poste[], benevoles: Benevole[]) {
  const win = window.open('', '_blank', 'width=1000,height=800');
  if (!win) return;

  const rows = events
    .map((event) => {
      const poste = postes.find((p) => p.id === event.poste_origine_id);
      const appelant = event.appelant_special
        ? APPELANT_SPECIAL_LABELS[event.appelant_special]
        : benevoles.find((b) => b.id === event.benevole_appelant_id)?.nom ?? '—';
      const recepteur = benevoles.find((b) => b.id === event.benevole_recepteur_id);
      return `
        <tr>
          <td>${event.numero}</td>
          <td>${event.date_evenement ?? '—'}</td>
          <td>${new Date(event.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td>${poste ? `N°${poste.numero} — ${poste.nom}` : '—'}</td>
          <td>${appelant}</td>
          <td>${recepteur?.nom ?? '—'}</td>
          <td>${event.course ?? '—'}</td>
          <td>${event.objet ?? '—'}</td>
          <td>${event.dossard ?? '—'}</td>
          <td>${event.commentaire ?? '—'}</td>
          <td>${event.abandon ? 'Oui' : 'Non'}</td>
          <td>${event.date_depart ?? '—'}</td>
          <td>${event.lieu_depart ?? '—'}</td>
          <td>${event.lieu_arrivee_attendue ?? '—'}</td>
          <td>${event.heure_arrivee_estimee ?? '—'}</td>
          <td>${event.heure_arrivee_effective ?? '—'}</td>
          <td>${event.statut}</td>
        </tr>
      `;
    })
    .join('');

  win.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Main courante</title>
        <style>
          body { font-family: sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
          .small { font-size: 11px; color: #555; }
        </style>
      </head>
      <body>
        <h1>Main courante</h1>
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Date</th>
              <th>Heure saisie</th>
              <th>Poste</th>
              <th>Appelant</th>
              <th>Récepteur</th>
              <th>Parcours</th>
              <th>Objet</th>
              <th>Dossard</th>
              <th>Description</th>
              <th>Abandon</th>
              <th>Date départ</th>
              <th>Lieu départ</th>
              <th>Arrivée attendue</th>
              <th>Arrivée estimée</th>
              <th>Arrivée effective</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="17">Aucun événement</td></tr>'}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
}
