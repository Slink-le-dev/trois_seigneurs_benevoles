import * as turf from '@turf/turf';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import ElevationPanel from './ElevationPanel';
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
  PosteMissionCode,
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
  filterMissions?: PosteMissionCode[];
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
  showKmMarkers?: boolean;
  hidePersonnelInfo?: boolean;
  alwaysShowElevation?: boolean;
  onElevationParcoursChange?: (parcoursId: string) => void;
  onElevationNextRavitUpdate?: (info: { km: number; nom: string } | null) => void;
}

const COULEUR_SANS_PARCOURS = '#6b7280';

function withoutPois(fc: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  return { ...fc, features: fc.features.filter((f) => f.geometry?.type !== 'Point') };
}

function getKmMarkers(fc: GeoJSON.FeatureCollection): Array<{ position: [number, number]; km: number }> {
  const allCoords: number[][] = [];
  for (const f of fc.features) {
    if (f.geometry?.type === 'LineString') {
      allCoords.push(...(f.geometry as GeoJSON.LineString).coordinates);
    } else if (f.geometry?.type === 'MultiLineString') {
      for (const seg of (f.geometry as GeoJSON.MultiLineString).coordinates) allCoords.push(...seg);
    }
  }
  if (allCoords.length < 2) return [];
  const line = turf.lineString(allCoords as [number, number][]);
  const totalKm = turf.length(line, { units: 'kilometers' });
  const markers: Array<{ position: [number, number]; km: number }> = [];
  for (let km = 1; km <= Math.floor(totalKm); km++) {
    const pt = turf.along(line, km, { units: 'kilometers' });
    const [lng, lat] = pt.geometry.coordinates;
    markers.push({ position: [lat, lng], km });
  }
  return markers;
}

const ELEVATION_HOVER_ICON = L.divIcon({
  className: '',
  html: `<div style="width:12px;height:12px;background:#f97316;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const USER_LOCATION_ICON = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.35),0 2px 6px rgba(0,0,0,0.25)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapPanner({ position }: { position: [number, number] | null }) {
  const map = useMap();
  const didPan = useRef(false);
  useEffect(() => {
    if (position && !didPan.current) {
      map.setView(position, Math.max(map.getZoom(), 15));
      didPan.current = true;
    }
    if (!position) didPan.current = false;
  }, [position, map]);
  return null;
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
  filterMissions,
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
  showKmMarkers = true,
  hidePersonnelInfo = false,
  alwaysShowElevation = false,
  onElevationParcoursChange,
  onElevationNextRavitUpdate,
}: MapViewProps) {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [tracking, setTracking] = useState(false);
  const [showElevation, setShowElevation] = useState(alwaysShowElevation);
  const [elevationHoverPos, setElevationHoverPos] = useState<[number, number] | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  function toggleTracking() {
    if (tracking) {
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      setTracking(false);
      setUserPosition(null);
    } else {
      if (!navigator.geolocation) { alert('La géolocalisation n\'est pas disponible sur cet appareil.'); return; }
      setTracking(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
        () => { setTracking(false); setUserPosition(null); },
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
    }
  }

  const query = searchBenevole.trim().toLowerCase();
  const visiblePostes = postes.filter((p) => {
    if (filterTypes?.length && !p.types.some((t) => filterTypes.includes(t))) return false;
    if (filterStatuts?.length && !filterStatuts.includes(p.statut)) return false;
    if (filterParcoursIds?.length) {
      const ids = getParcoursIdsForPoste(p.id);
      if (!ids.some((id) => filterParcoursIds.includes(id))) return false;
    }
    if (filterMateriel?.length && !p.materiel?.some((m) => filterMateriel.includes(m))) return false;
    if (filterMissions?.length && !(p.missions ?? []).some((m) => filterMissions.includes(m))) return false;
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
    let candidats = parcours.filter((p) => ids.includes(p.id));
    if (!candidats.length) return COULEUR_SANS_PARCOURS;
    if (filterParcoursIds?.length) {
      const actifs = candidats.filter((p) => filterParcoursIds.includes(p.id));
      if (actifs.length) candidats = actifs;
    }
    const plusLong = candidats.reduce((max, p) => ((p.distance_km ?? 0) > (max.distance_km ?? 0) ? p : max));
    return plusLong.couleur;
  }

  return (
    <div className="relative h-full w-full">
    <button
      type="button"
      onClick={toggleTracking}
      title="Ma position"
      className={`absolute top-[80px] left-[10px] z-[1000] w-[30px] h-[30px] rounded-sm shadow flex items-center justify-center border border-gray-400 transition-colors ${tracking ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        <circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
      </svg>
    </button>
    {!alwaysShowElevation && (
      <button
        type="button"
        onClick={() => setShowElevation((v) => !v)}
        title="Profil d'élévation"
        className={`absolute top-[118px] left-[10px] z-[1000] w-[30px] h-[30px] rounded-sm shadow flex items-center justify-center border border-gray-400 transition-colors ${showElevation ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </button>
    )}
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
      <MapPanner position={userPosition} />
      {userPosition && <Marker position={userPosition} icon={USER_LOCATION_ICON} interactive={false} />}
      {elevationHoverPos && <Marker position={elevationHoverPos} icon={ELEVATION_HOVER_ICON} interactive={false} />}
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

      {showKmMarkers && parcours
        .filter((p) => p.gpx_geojson && parcoursVisibility[p.id] !== false && (!filterParcoursIds?.length || filterParcoursIds.includes(p.id)))
        .flatMap((p) =>
          getKmMarkers(withoutPois(p.gpx_geojson!)).map(({ position, km }) => (
            <Marker
              key={`km-${p.id}-${km}`}
              position={position}
              icon={L.divIcon({
                className: '',
                html: `<div style="transform:translate(-50%,-50%);background:white;border:2px solid ${p.couleur};border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:${p.couleur};box-shadow:0 1px 2px rgba(0,0,0,0.2)">${km}</div>`,
              })}
              interactive={false}
            />
          ))
        )}

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
            icon={posteIcon(poste.numero, couleurPourPoste(poste.id), poste.statut, nonPourvu, hidePersonnelInfo)}
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
                {!hidePersonnelInfo && (
                  <>
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
                  </>
                )}
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
    {showElevation && (
      <ElevationPanel
        parcours={parcours}
        postes={postes}
        getParcoursIdsForPoste={getParcoursIdsForPoste}
        filterParcoursIds={filterParcoursIds}
        userPosition={tracking ? userPosition : null}
        onHoverPosition={setElevationHoverPos}
        onParcoursChange={onElevationParcoursChange}
        onNextRavitUpdate={onElevationNextRavitUpdate}
        onClose={() => { setShowElevation(false); setElevationHoverPos(null); }}
      />
    )}
    </div>
  );
}
