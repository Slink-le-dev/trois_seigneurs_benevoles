import { formatCreneau } from './format';
import {
  Affectation,
  Benevole,
  MainCouranteCommentaire,
  MainCouranteEvent,
  MainCouranteJournalEntry,
  POSTE_TYPES,
  Poste,
} from '../types';
import { JOURNAL_FIELD_LABELS, formatAppelant, formatJournalValue, formatPosteName } from './mainCourante';

function formatDatetime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

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

export function printMainCourante(
  events: MainCouranteEvent[],
  postes: Poste[],
  benevoles: Benevole[],
  journal: MainCouranteJournalEntry[],
  commentaires: MainCouranteCommentaire[]
) {
  const win = window.open('', '_blank', 'width=1000,height=800');
  if (!win) return;

  type ActivityItem =
    | { kind: 'creation'; created_at: string; created_by: string }
    | (MainCouranteJournalEntry & { kind: 'journal' })
    | (MainCouranteCommentaire & { kind: 'comment' });

  const tickets = events
    .map((event) => {
      const poste = postes.find((p) => p.id === event.poste_origine_id);
      const recepteur = benevoles.find((b) => b.id === event.benevole_recepteur_id);

      const activity: ActivityItem[] = ([
        { kind: 'creation', created_at: event.created_at, created_by: event.created_by },
        ...journal.filter((j) => j.event_id === event.id).map((j) => ({ ...j, kind: 'journal' as const })),
        ...commentaires.filter((c) => c.event_id === event.id).map((c) => ({ ...c, kind: 'comment' as const })),
      ] as ActivityItem[]).sort((a, b) => a.created_at.localeCompare(b.created_at));

      const activityRows = activity
        .map((item) => {
          if (item.kind === 'creation') {
            return `<div class="activity-row">${formatDatetime(item.created_at)} · ${item.created_by} — Créé</div>`;
          }
          if (item.kind === 'comment') {
            return `<div class="activity-row">${formatDatetime(item.created_at)} · ${item.created_by} — Commentaire : ${item.contenu}</div>`;
          }
          return `<div class="activity-row">${formatDatetime(item.created_at)} · ${item.created_by} — ${
            JOURNAL_FIELD_LABELS[item.champ] ?? item.champ
          } : ${formatJournalValue(item.champ, item.ancienne_valeur, postes, benevoles)} → ${formatJournalValue(
            item.champ,
            item.nouvelle_valeur,
            postes,
            benevoles
          )}</div>`;
        })
        .join('');

      const abandonRows = event.abandon
        ? `
          <div class="meta-row"><span>Lieu de départ</span><span>${event.lieu_depart ?? '—'}</span></div>
          <div class="meta-row"><span>Lieu d'arrivée</span><span>${event.lieu_arrivee_attendue ?? '—'}</span></div>
          <div class="meta-row"><span>Heure estimée d'arrivée</span><span>${event.heure_arrivee_estimee ?? '—'}</span></div>
          <div class="meta-row"><span>Heure d'arrivée effective</span><span>${event.heure_arrivee_effective ?? '—'}</span></div>
          <div class="meta-row"><span>Lien de suivi GPS</span><span>${event.lien_suivi_gps ?? '—'}</span></div>
        `
        : '';

      return `
        <div class="ticket">
          <h2>N°${event.numero} — ${event.objet ?? '—'}</h2>
          <div class="meta">
            <div class="meta-row"><span>Date et heure</span><span>${formatDatetime(event.created_at)}</span></div>
            <div class="meta-row"><span>Poste</span><span>${poste ? `N°${poste.numero} — ${poste.nom}` : '—'}</span></div>
            <div class="meta-row"><span>Appelant → Récepteur</span><span>${formatAppelant(benevoles, event)} → ${
        recepteur?.nom ?? '—'
      }</span></div>
            <div class="meta-row"><span>Parcours</span><span>${event.course ?? '—'}</span></div>
            <div class="meta-row"><span>Dossard</span><span>${event.dossard ?? '—'}</span></div>
            <div class="meta-row"><span>Description</span><span>${event.commentaire ?? '—'}</span></div>
            <div class="meta-row"><span>Statut</span><span>${event.statut}</span></div>
            <div class="meta-row"><span>Abandon</span><span>${event.abandon ? 'Oui' : 'Non'}</span></div>
            ${abandonRows}
          </div>
          <h3>Historique</h3>
          <div class="activity">${activityRows}</div>
        </div>
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
          .ticket { border: 1px solid #ccc; border-radius: 4px; padding: 12px 16px; margin-bottom: 16px; page-break-inside: avoid; }
          .ticket h2 { font-size: 15px; margin: 0 0 8px; }
          .ticket h3 { font-size: 12px; text-transform: uppercase; color: #666; margin: 12px 0 6px; }
          .meta-row { display: flex; gap: 8px; font-size: 12px; padding: 2px 0; }
          .meta-row span:first-child { width: 180px; color: #555; flex-shrink: 0; }
          .activity-row { font-size: 11px; color: #333; padding: 2px 0; border-top: 1px solid #eee; }
          .activity-row:first-child { border-top: none; }
        </style>
      </head>
      <body>
        <h1>Main courante</h1>
        ${tickets || '<p>Aucun événement.</p>'}
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
}
