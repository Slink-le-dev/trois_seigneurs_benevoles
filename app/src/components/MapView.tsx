import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { posteIcon } from '../lib/icons';
import { Affectation, Benevole, Parcours, POSTE_STATUTS, POSTE_TYPES, Poste, PosteStatut, PosteTypeCode } from '../types';

interface MapViewProps {
  parcours: Parcours[];
  parcoursVisibility: Record<string, boolean>;
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
  showPois?: boolean;
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
  parcoursVisibility,
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
  showPois = false,
}: MapViewProps) {
  const visiblePostes = postes.filter((p) => {
    if (filterTypes?.length && !p.types.some((t) => filterTypes.includes(t))) return false;
    if (filterStatuts?.length && !filterStatuts.includes(p.statut)) return false;
    if (filterParcoursIds?.length) {
      const ids = getParcoursIdsForPoste(p.id);
      if (!ids.some((id) => filterParcoursIds.includes(id))) return false;
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
      className={placingMode ? 'cursor-crosshair' : ''}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitToData parcours={parcours} postes={postes} />
      {placingMode && <MapClickHandler onClick={onMapClickCreate} />}

      {parcours
        .filter((p) => p.gpx_geojson && parcoursVisibility[p.id] !== false)
        .map((p) => (
          <GeoJSON
            key={`${p.id}-${p.couleur}-${showPois}`}
            data={(showPois ? p.gpx_geojson! : withoutPois(p.gpx_geojson!)) as any}
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
              <div className="text-xs leading-snug max-w-[220px]">
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
                          return `${b?.nom ?? '?'} (${a.heure_debut.slice(0, 5)}–${a.heure_fin.slice(0, 5)})`;
                        })
                        .join(', ')}
                </div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
