import L from 'leaflet';
import { POSTE_STATUTS, PosteStatut } from '../types';

export function posteIcon(numero: number, couleur: string, statut: PosteStatut, alerteNonPourvu: boolean, hideStatut = false): L.DivIcon {
  const statutInfo = POSTE_STATUTS.find((s) => s.code === statut) ?? POSTE_STATUTS[0];
  const borderColor = hideStatut ? '#fff' : statutInfo.couleur;
  const alerteRing = !hideStatut && alerteNonPourvu && statut !== 'desactive' ? ', 0 0 0 3px #dc2626' : '';

  const html = `
    <div style="
      width:28px;height:28px;border-radius:50%;
      background:${couleur};border:2.5px solid ${borderColor};
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

export function extractionIcon(lettre: string): L.DivIcon {
  const html = `
    <div style="
      width:26px;height:26px;border-radius:6px;
      background:#dc2626;border:2.5px solid #fff;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 1px 3px rgba(0,0,0,.5);
      color:#fff;font-weight:700;font-size:13px;line-height:1;
      text-shadow:0 0 2px rgba(0,0,0,.7);
    ">${lettre}</div>
  `;

  return L.divIcon({
    html,
    className: 'poste-marker-icon',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export function abriIcon(numero: number): L.DivIcon {
  const html = `
    <div style="
      width:26px;height:26px;border-radius:6px;
      background:#7c3aed;border:2.5px solid #fff;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 1px 3px rgba(0,0,0,.5);
      color:#fff;font-weight:700;font-size:13px;line-height:1;
      text-shadow:0 0 2px rgba(0,0,0,.7);
    ">${numero}</div>
  `;

  return L.divIcon({
    html,
    className: 'poste-marker-icon',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}
