import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { formatCreneau } from '../lib/format';
import { abriIcon, extractionIcon, posteIcon } from '../lib/icons';
import {
  AbriTemporaire,
  Affectation,
  Benevole,
  Parcours,
  PointExtraction,
  POSTE_STATUTS,
  POSTE_TYPES,
  Poste,
  PosteMaterielCode,
  PosteStatut,
  PosteTypeCode,
} from '../types';

interface MapViewProps {
  parcours: Parcours[];
  parcoursVisibility?: Record<string, boolean>;
  postes: Poste[];
  benevoles: Benevole[];
  getParcoursIdsForPoste: (posteId: string) => string[];
  getAffectationsForPoste: (posteId: string) => Affectation[];
  isAdmin: boolean;
  selectedPosteId: string | null;
  onSelectPoste: (posteId: string) => void;
  placingMode?: boolean;
  onMapClickCreate?: (lat: number, lng: number) => void;
  onMovePoste?: (id: string, lat: number, lng: number) => void;
  filterTypes?: PosteTypeCode[];
  filterStatuts?: PosteStatut[];
  filterParcoursIds?: string[];
  filterMateriel?: PosteMaterielCode[];
  searchBenevole?: string;
  onlyFormation?: boolean;
  onlyPointPassage?: boolean;
  pointsExtraction?: PointExtraction[];
  showExtractions?: boolean;
  selectedExtractionId?: string | null;
  onSelectExtraction?: (id: string) => void;
  placingModeExtraction?: boolean;
  onMapClickCreateExtraction?: (lat: number, lng: number) => void;
  onMoveExtraction?: (id: string, lat: number, lng: number) => void;
  abrisTemporaires?: AbriTemporaire[];
  showAbris?: boolean;
  selectedAbriId?: string | null;
  onSelectAbri?: (id: string) => void;
  placingModeAbri?: boolean;
  onMapClickCreateAbri?: (lat: number, lng: number) => void;
  onMoveAbri?: (id: string, lat: number, lng: number) => void;
}

const COULEUR_SANS_PARCOURS = '#6b7280';

function withoutPois(fc: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  return { ...fc, features: fc.features.filter((f) => f.geometry?.type !== 'Point') };
}

function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitToData({ parcours, postes }: { parcours: Parcours[]; postes: Poste[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    const bounds = L.latLngBounds([]);
    parcours.forEach((p) => {
      if (!p.gpx_geojson) return;
      try {
        bounds.extend(L.geoJSON(p.gpx_geojson as any).getBounds());
      } catch {
        // ignore
      }
    });
    postes.forEach((p) => bounds.extend([p.lat, p.lng]));

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
      fitted.current = true;
    }
  }, [parcours, postes, map]);

  return null;
}

export default function MapView({
  parcours,
  parcoursVisibility = {},
  postes,
  benevoles,
  getParcoursIdsForPoste,
  getAffectationsForPoste,
  isAdmin,
  selectedPosteId,
  onSelectPoste,
  placingMode,
  onMapClickCreate,
  onMovePoste,
  filterTypes,
  filterStatuts,
  filterParcoursIds,
  filterMateriel,
  searchBenevole = '',
  onlyFormation = false,
  onlyPointPassage = false,
  pointsExtraction = [],
  showExtractions = false,
  selectedExtractionId = null,
  onSelectExtraction,
  placingModeExtraction,
  onMapClickCreateExtraction,
  onMoveExtraction,
  abrisTemporaires = [],
  showAbris = false,
  selectedAbriId = null,
  onSelectAbri,
  placingModeAbri,
  onMapClickCreateAbri,
  onMoveAbri,
}: MapViewProps) {
  const query = searchBenevole.trim().toLowerCase();
  const visiblePostes = postes.filter((p) => {
    if (filterTypes?.length && !p.types.some((t) => filterTypes.includes(t))) return false;
    if (filterStatuts?.length && !filterStatuts.includes(p.statut)) return false;
    if (filterParcoursIds?.length) {
      const ids = getParcoursIdsForPoste(p.id);
      if (!ids.some((id) => filterParcoursIds.includes(id))) return false;
    }
    if (filterMateriel?.length && !p.materiel?.some((m) => filterMateriel.includes(m))) return false;
    if (onlyPointPassage && !p.point_passage_intermediaire) return false;
    if (query) {
      const aff = getAffectationsForPoste(p.id);
      const hasMatch = aff.some((a) => benevoles.find((b) => b.id === a.benevole_id)?.nom.toLowerCase().includes(query));
      if (!hasMatch) return false;
    }
    if (onlyFormation) {
      const aff = getAffectationsForPoste(p.id);
      const hasFormation = aff.some((a) => benevoles.find((b) => b.id === a.benevole_id)?.formation !== 'aucune');
      if (!hasFormation) return false;
    }
    return true;
  });

  function couleurPourPoste(posteId: string): string {
    const ids = getParcoursIdsForPoste(posteId);
    const candidats = parcours.filter((p) => ids.includes(p.id));
    if (!candidats.length) return COULEUR_SANS_PARCOURS;
    const plusLong = candidats.reduce((max, p) => ((p.distance_km ?? 0) > (max.distance_km ?? 0) ? p : max));
    return plusLong.couleur;
  }

  return (
    <MapContainer
      center={[45.9, 6.1]}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
      className={placingMode || placingModeExtraction || placingModeAbri ? 'cursor-crosshair' : ''}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitToData parcours={parcours} postes={postes} />
      {placingMode && <MapClickHandler onClick={onMapClickCreate} />}
      {placingModeExtraction && <MapClickHandler onClick={onMapClickCreateExtraction} />}
      {placingModeAbri && <MapClickHandler onClick={onMapClickCreateAbri} />}

      {parcours
        .filter((p) => p.gpx_geojson && parcoursVisibility[p.id] !== false && (!filterParcoursIds?.length || filterParcoursIds.includes(p.id)))
        .map((p) => (
          <GeoJSON
            key={`${p.id}-${p.couleur}`}
            data={withoutPois(p.gpx_geojson!) as any}
            style={{ color: p.couleur, weight: 4, opacity: 0.85 }}
          />
        ))}

      {visiblePostes.map((poste) => {
        const aff = getAffectationsForPoste(poste.id);
        const nonPourvu = aff.length === 0;
        const statutInfo = POSTE_STATUTS.find((s) => s.code === poste.statut)!;
        const parcoursNoms = parcours.filter((p) => getParcoursIdsForPoste(poste.id).includes(p.id)).map((p) => p.nom);
        const typesLabels = poste.types
          .map((t) => POSTE_TYPES.find((pt) => pt.code === t))
          .filter(Boolean)
          .map((pt) => `${pt!.emoji} ${pt!.label}`);

        return (
          <Marker
            key={poste.id}
            position={[poste.lat, poste.lng]}
            icon={posteIcon(poste.numero, couleurPourPoste(poste.id), poste.statut, nonPourvu)}
            draggable={isAdmin}
            eventHandlers={{
              click: () => onSelectPoste(poste.id),
              dragend: (e) => {
                const pos = (e.target as L.Marker).getLatLng();
                onMovePoste?.(poste.id, pos.lat, pos.lng);
              },
            }}
            opacity={selectedPosteId === poste.id ? 1 : 0.95}
          >
            <Tooltip>
              <div className="text-xs leading-snug w-60 max-h-64 overflow-y-auto break-words">
                <div className="font-semibold mb-0.5">
                  {poste.numero}. {poste.nom}
                </div>
                <div>Parcours : {parcoursNoms.join(', ') || '—'}</div>
                <div>Type(s) : {typesLabels.join(', ') || '—'}</div>
                <div>
                  Statut : <span style={{ color: statutInfo.couleur }}>●</span> {statutInfo.label}
                </div>
                <div>
                  Bénévoles :{' '}
                  {aff.length === 0
                    ? 'aucun'
                    : aff
                        .map((a) => {
                          const b = benevoles.find((x) => x.id === a.benevole_id);
                          const creneau = formatCreneau(a.heure_debut, a.heure_fin);
                          return `${b?.nom ?? '?'}${creneau ? ` (${creneau})` : ''}`;
                        })
                        .join(', ')}
                </div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}

      {showExtractions &&
        pointsExtraction.map((point) => (
          <Marker
            key={point.id}
            position={[point.lat, point.lng]}
            icon={extractionIcon(point.lettre)}
            draggable={isAdmin}
            eventHandlers={{
              click: () => onSelectExtraction?.(point.id),
              dragend: (e) => {
                const pos = (e.target as L.Marker).getLatLng();
                onMoveExtraction?.(point.id, pos.lat, pos.lng);
              },
            }}
            opacity={selectedExtractionId === point.id ? 1 : 0.95}
          >
            <Tooltip>
              <div className="text-xs leading-snug">
                <span className="font-semibold">{point.lettre}.</span> {point.libelle}
              </div>
            </Tooltip>
          </Marker>
        ))}

      {showAbris &&
        abrisTemporaires.map((abri) => (
          <Marker
            key={abri.id}
            position={[abri.lat, abri.lng]}
            icon={abriIcon(abri.numero)}
            draggable={isAdmin}
            eventHandlers={{
              click: () => onSelectAbri?.(abri.id),
              dragend: (e) => {
                const pos = (e.target as L.Marker).getLatLng();
                onMoveAbri?.(abri.id, pos.lat, pos.lng);
              },
            }}
            opacity={selectedAbriId === abri.id ? 1 : 0.95}
          >
            <Tooltip>
              <div className="text-xs leading-snug">
                <span className="font-semibold">N°{abri.numero}.</span> {abri.nom} ({abri.capacite} pers.)
              </div>
            </Tooltip>
          </Marker>
        ))}
    </MapContainer>
  );
}
