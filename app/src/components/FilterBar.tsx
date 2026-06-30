import { useState } from 'react';
import { Parcours, POSTE_MATERIELS, POSTE_STATUTS, POSTE_TYPES, PosteMaterielCode, PosteStatut, PosteTypeCode } from '../types';

interface FilterBarProps {
  parcours: Parcours[];
  filterParcoursIds: string[];
  setFilterParcoursIds: (ids: string[]) => void;
  filterTypes: PosteTypeCode[];
  setFilterTypes: (types: PosteTypeCode[]) => void;
  filterStatuts: PosteStatut[];
  setFilterStatuts: (statuts: PosteStatut[]) => void;
  filterMateriel: PosteMaterielCode[];
  setFilterMateriel: (materiel: PosteMaterielCode[]) => void;
  parcoursVisibility: Record<string, boolean>;
  setParcoursVisibility: (v: Record<string, boolean>) => void;
  showPois: boolean;
  setShowPois: (show: boolean) => void;
  showExtractions: boolean;
  setShowExtractions: (show: boolean) => void;
  showAbris: boolean;
  setShowAbris: (show: boolean) => void;
  searchBenevole: string;
  setSearchBenevole: (v: string) => void;
  onlyFormation: boolean;
  setOnlyFormation: (v: boolean) => void;
  onlyPointPassage: boolean;
  setOnlyPointPassage: (v: boolean) => void;
}

const ACCENT = '#005F61';

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FunnelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export default function FilterBar({
  parcours,
  filterParcoursIds,
  setFilterParcoursIds,
  filterTypes,
  setFilterTypes,
  filterStatuts,
  setFilterStatuts,
  filterMateriel,
  setFilterMateriel,
  parcoursVisibility,
  setParcoursVisibility,
  showPois,
  setShowPois,
  showExtractions,
  setShowExtractions,
  showAbris,
  setShowAbris,
  searchBenevole,
  setSearchBenevole,
  onlyFormation,
  setOnlyFormation,
  onlyPointPassage,
  setOnlyPointPassage,
}: FilterBarProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [draftParcoursIds, setDraftParcoursIds] = useState(filterParcoursIds);
  const [draftTypes, setDraftTypes] = useState(filterTypes);
  const [draftStatuts, setDraftStatuts] = useState(filterStatuts);
  const [draftMateriel, setDraftMateriel] = useState(filterMateriel);
  const [draftVisibility, setDraftVisibility] = useState(parcoursVisibility);
  const [draftShowPois, setDraftShowPois] = useState(showPois);
  const [draftShowExtractions, setDraftShowExtractions] = useState(showExtractions);
  const [draftShowAbris, setDraftShowAbris] = useState(showAbris);
  const [draftOnlyFormation, setDraftOnlyFormation] = useState(onlyFormation);
  const [draftOnlyPointPassage, setDraftOnlyPointPassage] = useState(onlyPointPassage);

  const hasActiveFilters =
    filterParcoursIds.length > 0 ||
    filterTypes.length > 0 ||
    filterStatuts.length > 0 ||
    filterMateriel.length > 0 ||
    showPois ||
    showExtractions ||
    showAbris ||
    onlyFormation ||
    onlyPointPassage ||
    parcours.some((p) => parcoursVisibility[p.id] === false);

  function openPopup() {
    setDraftParcoursIds(filterParcoursIds);
    setDraftTypes(filterTypes);
    setDraftStatuts(filterStatuts);
    setDraftMateriel(filterMateriel);
    setDraftVisibility(parcoursVisibility);
    setDraftShowPois(showPois);
    setDraftShowExtractions(showExtractions);
    setDraftShowAbris(showAbris);
    setDraftOnlyFormation(onlyFormation);
    setDraftOnlyPointPassage(onlyPointPassage);
    setShowPopup(true);
  }

  function handleApply() {
    setFilterParcoursIds(draftParcoursIds);
    setFilterTypes(draftTypes);
    setFilterStatuts(draftStatuts);
    setFilterMateriel(draftMateriel);
    setParcoursVisibility(draftVisibility);
    setShowPois(draftShowPois);
    setShowExtractions(draftShowExtractions);
    setShowAbris(draftShowAbris);
    setOnlyFormation(draftOnlyFormation);
    setOnlyPointPassage(draftOnlyPointPassage);
    setShowPopup(false);
  }

  function handleReset() {
    setFilterParcoursIds([]);
    setFilterTypes([]);
    setFilterStatuts([]);
    setFilterMateriel([]);
    setParcoursVisibility({});
    setShowPois(false);
    setShowExtractions(false);
    setShowAbris(false);
    setOnlyFormation(false);
    setOnlyPointPassage(false);
    setShowPopup(false);
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-white border-b text-sm">
      <div className="relative">
        <input
          type="text"
          placeholder="Rechercher un bénévole par nom…"
          value={searchBenevole}
          onChange={(e) => setSearchBenevole(e.target.value)}
          className="border rounded px-2 py-1 pr-7 text-sm w-56"
        />
        {searchBenevole && (
          <button
            type="button"
            onClick={() => setSearchBenevole('')}
            aria-label="Réinitialiser la recherche"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 leading-none"
          >
            ×
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={openPopup}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded border hover:bg-gray-50"
        style={hasActiveFilters ? { borderColor: ACCENT, color: ACCENT } : undefined}
      >
        <span className="relative inline-flex">
          <FunnelIcon />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT }} />
          )}
        </span>
        Filtres
      </button>

      {showPopup && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-[1000] p-4"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">Filtres</h2>
              <button onClick={() => setShowPopup(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-500 uppercase text-xs mb-2">Parcours</h3>
                <div className="flex flex-wrap gap-3">
                  {parcours.map((p) => (
                    <label key={p.id} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={draftParcoursIds.length === 0 || draftParcoursIds.includes(p.id)}
                        onChange={() => setDraftParcoursIds(toggle(draftParcoursIds, p.id))}
                      />
                      <span style={{ color: p.couleur }}>●</span> {p.nom}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-500 uppercase text-xs mb-2">Traces GPX</h3>
                <div className="flex flex-wrap gap-3">
                  {parcours.map((p) => (
                    <label key={p.id} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={draftVisibility[p.id] !== false}
                        onChange={() =>
                          setDraftVisibility({ ...draftVisibility, [p.id]: draftVisibility[p.id] === false })
                        }
                      />
                      <span style={{ color: p.couleur }}>●</span> {p.nom}
                    </label>
                  ))}
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={draftShowPois} onChange={(e) => setDraftShowPois(e.target.checked)} />
                    Points d'intérêt (POI)
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-500 uppercase text-xs mb-2">Type</h3>
                <div className="flex flex-wrap gap-3">
                  {POSTE_TYPES.map((t) => (
                    <label key={t.code} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={draftTypes.length === 0 || draftTypes.includes(t.code)}
                        onChange={() => setDraftTypes(toggle(draftTypes, t.code))}
                      />
                      {t.emoji} {t.label}
                    </label>
                  ))}
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={draftShowExtractions}
                      onChange={(e) => setDraftShowExtractions(e.target.checked)}
                    />
                    🚑 Points d'extraction
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={draftShowAbris}
                      onChange={(e) => setDraftShowAbris(e.target.checked)}
                    />
                    🏠 Abris temporaires
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-500 uppercase text-xs mb-2">Bénévoles</h3>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={draftOnlyFormation}
                      onChange={(e) => setDraftOnlyFormation(e.target.checked)}
                    />
                    Avec bénévole formé (médecin, infirmier, pompier, PSC1…)
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-500 uppercase text-xs mb-2">Matériel</h3>
                <div className="flex flex-wrap gap-3">
                  {POSTE_MATERIELS.map((m) => (
                    <label key={m.code} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={draftMateriel.includes(m.code)}
                        onChange={() => setDraftMateriel(toggle(draftMateriel, m.code))}
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-500 uppercase text-xs mb-2">Caractéristiques</h3>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={draftOnlyPointPassage}
                      onChange={(e) => setDraftOnlyPointPassage(e.target.checked)}
                    />
                    Point de passage intermédiaire
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-500 uppercase text-xs mb-2">Statut</h3>
                <div className="flex flex-wrap gap-3">
                  {POSTE_STATUTS.map((s) => (
                    <label key={s.code} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={draftStatuts.length === 0 || draftStatuts.includes(s.code)}
                        onChange={() => setDraftStatuts(toggle(draftStatuts, s.code))}
                      />
                      <span style={{ color: s.couleur }}>●</span> {s.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2 mt-5 pt-3 border-t">
              <button className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50" onClick={handleReset}>
                Réinitialiser
              </button>
              <button
                className="text-sm px-3 py-1.5 text-white rounded"
                style={{ backgroundColor: ACCENT }}
                onClick={handleApply}
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
