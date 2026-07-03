import { formatCreneau } from './format';
import {
  AbriTemporaire,
  Affectation,
  BENEVOLE_FORMATIONS,
  Benevole,
  MainCouranteCommentaire,
  MainCouranteEvent,
  MainCouranteJournalEntry,
  POSTE_MATERIELS,
  POSTE_MISSIONS,
  POSTE_TYPES,
  PointExtraction,
  Poste,
} from '../types';
import { JOURNAL_FIELD_LABELS, formatAppelant, formatJournalValue, formatPosteName } from './mainCourante';

function formatDatetime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export interface ParcoursInfoPrint {
  nom: string;
  stats?: { kmCumules: number; kmRestants: number; kmProchainRavitaillement: number | null };
}

export function printFeuilleDeRoute(
  poste: Poste,
  parcoursData: ParcoursInfoPrint[],
  affectations: Affectation[],
  benevoles: Benevole[],
  abrisEvacuation: AbriTemporaire[],
  extractionsEvacuation: PointExtraction[],
) {
  const win = window.open('', '_blank', 'width=700,height=900');
  if (!win) return;

  const types = poste.types
    .map((t) => POSTE_TYPES.find((pt) => pt.code === t))
    .filter(Boolean)
    .map((pt) => `${pt!.emoji} ${pt!.label}`)
    .join(', ');

  const materielLabels = (poste.materiel ?? [])
    .map((c) => POSTE_MATERIELS.find((m) => m.code === c)?.label)
    .filter(Boolean)
    .join(', ');

  const missionsItems = (poste.missions ?? [])
    .map((c) => POSTE_MISSIONS.find((m) => m.code === c)?.label)
    .filter(Boolean)
    .map((l) => `<li>${l}</li>`)
    .join('');

  const abrisItems = abrisEvacuation.length
    ? abrisEvacuation.map((a) => `<li>N°${a.numero} — ${a.nom}</li>`).join('')
    : '<li style="color:#999">—</li>';

  const extractionsItems = extractionsEvacuation.length
    ? extractionsEvacuation.map((e) => `<li>${e.lettre} — ${e.libelle}</li>`).join('')
    : '<li style="color:#999">—</li>';

  const benevolesRows = affectations
    .map((a) => {
      const b = benevoles.find((x) => x.id === a.benevole_id);
      const formation = BENEVOLE_FORMATIONS.find((f) => f.code === b?.formation)?.label ?? '—';
      const creneau = formatCreneau(a.heure_debut, a.heure_fin) ?? '—';
      return `<tr>
        <td>${b?.nom ?? '?'}</td>
        <td>${b?.telephone ?? '—'}</td>
        <td>${formation}</td>
        <td>${creneau}</td>
      </tr>`;
    })
    .join('');

  win.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Feuille de route — N°${poste.numero} ${poste.nom}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: sans-serif; padding: 28px; color: #111; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; }
          .pc-securite { font-size: 12px; color: #555; text-align: right; white-space: nowrap; }
          h1 { font-size: 22px; margin: 0 0 6px; }
          h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: #555; margin: 18px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
          .row { display: flex; gap: 8px; padding: 3px 0; }
          .row .lbl { width: 180px; flex-shrink: 0; color: #555; }
          ul { margin: 0; padding-left: 18px; }
          ul li { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th { background: #f3f4f6; font-size: 12px; text-align: left; padding: 5px 8px; border: 1px solid #ddd; }
          td { padding: 5px 8px; border: 1px solid #ddd; font-size: 12px; vertical-align: top; }
          .evacuation-sub { font-size: 12px; font-weight: 600; margin: 8px 0 3px; color: #333; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>N°${poste.numero} — ${poste.nom}</h1>
          <div class="pc-securite"><strong>N° téléphone PC Sécurité</strong><br>06 31 26 25 86</div>
        </div>

        <h2>Informations</h2>
        <div class="row"><span class="lbl">Coordonnées GPS</span><span>${poste.lat.toFixed(5)}, ${poste.lng.toFixed(5)}</span></div>
        <div class="row"><span class="lbl">Parcours</span><span style="display:flex;flex-direction:column;gap:6px">${
          parcoursData.length === 0
            ? '—'
            : parcoursData.map((p) => `
              <div>
                <div style="font-weight:600">${p.nom}</div>
                ${p.stats ? `<div style="font-size:11px;color:#555;margin-top:2px;display:flex;gap:14px;flex-wrap:wrap">
                  <span>Km cumulés : <strong>${p.stats.kmCumules} km</strong></span>
                  <span>Km restants : <strong>${p.stats.kmRestants} km</strong></span>
                  <span>Prochain ravitaillement : <strong>${p.stats.kmProchainRavitaillement !== null ? p.stats.kmProchainRavitaillement + ' km' : '—'}</strong></span>
                </div>` : ''}
              </div>`).join('')
        }</span></div>
        <div class="row"><span class="lbl">Type(s)</span><span>${types || '—'}</span></div>
        ${poste.point_passage_intermediaire ? '<div class="row"><span class="lbl">Point de passage interm.</span><span>📍 Oui</span></div>' : ''}

        <h2>Matériel disponible</h2>
        <p style="margin:2px 0">${materielLabels || '—'}</p>

        <h2>Missions</h2>
        ${missionsItems ? `<ul>${missionsItems}</ul>` : '<p style="margin:2px 0;color:#999">—</p>'}

        <h2>Plan d'évacuation</h2>
        <p class="evacuation-sub">🏠 Abri temporaire</p>
        <ul>${abrisItems}</ul>
        <p class="evacuation-sub">🚑 Point d'extraction</p>
        <ul>${extractionsItems}</ul>

        <h2>Bénévoles affectés</h2>
        <table>
          <thead><tr><th>Nom</th><th>Téléphone</th><th>Formation</th><th>Créneau</th></tr></thead>
          <tbody>${benevolesRows || '<tr><td colspan="4" style="color:#999">Aucun bénévole affecté</td></tr>'}</tbody>
        </table>

        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
}

export function printRavitaillement(
  postes: Poste[],
  benevoles: Benevole[],
  getAffectationsForPoste: (posteId: string) => Affectation[],
) {
  const win = window.open('', '_blank', 'width=820,height=600');
  if (!win) return;

  const ravPostes = postes
    .filter((p) => p.types.includes('eau') || p.types.includes('nourriture'))
    .sort((a, b) => a.numero - b.numero);

  const rows = ravPostes
    .map((p) => {
      const aff = getAffectationsForPoste(p.id);
      const benevolesNames = aff
        .map((a) => benevoles.find((b) => b.id === a.benevole_id)?.nom ?? '?')
        .join(', ');
      const types = p.types
        .filter((t) => t === 'eau' || t === 'nourriture')
        .map((t) => POSTE_TYPES.find((pt) => pt.code === t))
        .filter(Boolean)
        .map((pt) => `${pt!.emoji} ${pt!.label}`)
        .join(', ');
      return `<tr>
        <td>${p.numero}</td>
        <td>${p.nom}</td>
        <td>${benevolesNames || '—'}</td>
        <td>${types}</td>
        <td class="quantites"></td>
      </tr>`;
    })
    .join('');

  win.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Points de ravitaillement</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 18px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f3f4f6; font-size: 12px; text-align: left; padding: 6px 8px; border: 1px solid #ccc; font-weight: 600; }
          td { padding: 6px 8px; border: 1px solid #ccc; font-size: 12px; vertical-align: top; }
          .nom { width: 130px; }
          .benevoles { width: 140px; }
          .type { width: 120px; }
          .quantites { width: 320px; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        <h1>Points de ravitaillement</h1>
        <table>
          <thead>
            <tr>
              <th style="width:36px">N°</th>
              <th class="nom">Nom du poste</th>
              <th class="benevoles">Bénévoles affectés</th>
              <th class="type">Type</th>
              <th class="quantites">Quantités</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="color:#999;text-align:center;padding:12px">Aucun poste de ravitaillement</td></tr>'}
          </tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
}

export function printRadios(
  postes: Poste[],
  benevoles: Benevole[],
  getAffectationsForPoste: (posteId: string) => Affectation[],
) {
  const win = window.open('', '_blank', 'width=900,height=600');
  if (!win) return;

  const radioPostes = postes
    .filter((p) => (p.materiel ?? []).includes('radio'))
    .sort((a, b) => a.numero - b.numero);

  const rows = radioPostes
    .map((p) => {
      const aff = getAffectationsForPoste(p.id);
      const benevolesNames = aff
        .map((a) => benevoles.find((b) => b.id === a.benevole_id)?.nom ?? '?')
        .join(', ');
      return `<tr>
        <td>${p.numero}</td>
        <td>${p.nom}</td>
        <td>${benevolesNames || '—'}</td>
        <td class="signature"></td>
        <td class="signature"></td>
      </tr>`;
    })
    .join('');

  win.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Registre des radios</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 18px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f3f4f6; font-size: 12px; text-align: left; padding: 6px 8px; border: 1px solid #ccc; font-weight: 600; }
          td { padding: 6px 8px; border: 1px solid #ccc; font-size: 12px; vertical-align: top; }
          .num { width: 36px; }
          .nom { width: 130px; }
          .benevoles { width: 140px; }
          .signature { width: 220px; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        <h1>Registre des radios</h1>
        <table>
          <thead>
            <tr>
              <th class="num">N°</th>
              <th class="nom">Nom du poste</th>
              <th class="benevoles">Bénévoles affectés</th>
              <th class="signature">Nom, date et heure du retrait</th>
              <th class="signature">Nom, date et heure de restitution</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="color:#999;text-align:center;padding:12px">Aucun poste équipé d\'une radio</td></tr>'}
          </tbody>
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
