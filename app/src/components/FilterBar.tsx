import { Parcours, POSTE_STATUTS, POSTE_TYPES, PosteStatut, PosteTypeCode } from '../types';

interface FilterBarProps {
  parcours: Parcours[];
  filterParcoursIds: string[];
  setFilterParcoursIds: (ids: string[]) => void;
  filterTypes: PosteTypeCode[];
  setFilterTypes: (types: PosteTypeCode[]) => void;
  filterStatuts: PosteStatut[];
  setFilterStatuts: (statuts: PosteStatut[]) => void;
  showPois: boolean;
  setShowPois: (show: boolean) => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function FilterBar({
  parcours,
  filterParcoursIds,
  setFilterParcoursIds,
  filterTypes,
  setFilterTypes,
  filterStatuts,
  setFilterStatuts,
  showPois,
  setShowPois,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4 text-sm p-2 bg-white border-b">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-500">Parcours :</span>
        {parcours.map((p) => (
          <label key={p.id} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={filterParcoursIds.length === 0 || filterParcoursIds.includes(p.id)}
              onChange={() => setFilterParcoursIds(toggle(filterParcoursIds, p.id))}
            />
            <span style={{ color: p.couleur }}>●</span> {p.nom}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-500">Type :</span>
        {POSTE_TYPES.map((t) => (
          <label key={t.code} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={filterTypes.length === 0 || filterTypes.includes(t.code)}
              onChange={() => setFilterTypes(toggle(filterTypes, t.code))}
            />
            {t.emoji} {t.label}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-500">Statut :</span>
        {POSTE_STATUTS.map((s) => (
          <label key={s.code} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={filterStatuts.length === 0 || filterStatuts.includes(s.code)}
              onChange={() => setFilterStatuts(toggle(filterStatuts, s.code))}
            />
            <span style={{ color: s.couleur }}>●</span> {s.label}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showPois} onChange={(e) => setShowPois(e.target.checked)} />
          Points d'intérêt du GPX (POI)
        </label>
      </div>
    </div>
  );
}
