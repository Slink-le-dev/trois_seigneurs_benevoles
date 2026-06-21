import L from 'leaflet';
import { POSTE_STATUTS, PosteStatut } from '../types';

export function posteIcon(numero: number, couleur: string, statut: PosteStatut, alerteNonPourvu: boolean): L.DivIcon {
  const statutInfo = POSTE_STATUTS.find((s) => s.code === statut) ?? POSTE_STATUTS[0];
  const alerteRing = alerteNonPourvu ? ', 0 0 0 3px #dc2626' : '';

  const html = `
    <div style="
      width:28px;height:28px;border-radius:50%;
      background:${couleur};border:2.5px solid ${statutInfo.couleur};
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 1px 3px rgba(0,0,0,.5)${alerteRing};
      color:#fff;font-weight:700;font-size:12px;line-height:1;
      text-shadow:0 0 2px rgba(0,0,0,.7);
    ">${numero}</div>
  `;

  return L.divIcon({
    html,
    className: 'poste-marker-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}
