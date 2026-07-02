import { Affectation, Benevole, Poste } from '../types';
import { printRavitaillement } from '../lib/print';

interface ExportTabProps {
  postes: Poste[];
  benevoles: Benevole[];
  affectations: Affectation[];
}

export default function ExportTab({ postes, benevoles, affectations }: ExportTabProps) {
  function getAffectationsForPoste(posteId: string) {
    return affectations.filter((a) => a.poste_id === posteId);
  }

  const countRavitaillement = postes.filter(
    (p) => p.types.includes('eau') || p.types.includes('nourriture')
  ).length;

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <h2 className="text-lg font-semibold">Exports</h2>

      <div className="border rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium mb-1">Points de ravitaillement</h3>
            <p className="text-sm text-gray-500">
              Tableau des postes 💧 Ravitaillement eau et 🍴 Ravitaillement nourriture
              avec les bénévoles affectés et une colonne «&nbsp;Quantités&nbsp;» à remplir à la main.
            </p>
            <p className="text-xs text-gray-400 mt-1">{countRavitaillement} poste{countRavitaillement !== 1 ? 's' : ''} concerné{countRavitaillement !== 1 ? 's' : ''}</p>
          </div>
          <button
            className="shrink-0 text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
            onClick={() => printRavitaillement(postes, benevoles, getAffectationsForPoste)}
          >
            Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}
