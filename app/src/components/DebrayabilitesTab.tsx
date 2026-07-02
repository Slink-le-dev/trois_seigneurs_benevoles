import { AppSettings } from '../types';

interface DebrayabilitesTabProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

interface Toggle {
  key: keyof AppSettings;
  label: string;
  description: string;
}

const TOGGLES: Toggle[] = [
  {
    key: 'show_denivele',
    label: 'Dénivelé positif',
    description: 'Afficher le D+ cumulé et le D+ restant dans la section Parcours des fiches de poste',
  },
];

export default function DebrayabilitesTab({ settings, onUpdateSettings }: DebrayabilitesTabProps) {
  return (
    <div className="p-6 max-w-xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Débrayabilités</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ces paramètres contrôlent les informations visibles sur la vue bénévole.
        </p>
      </div>

      <div className="border rounded-lg divide-y">
        {TOGGLES.map(({ key, label, description }) => {
          const enabled = settings[key] as boolean;
          return (
            <div key={key} className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{description}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => onUpdateSettings({ [key]: !enabled } as Partial<AppSettings>)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  enabled ? 'bg-[#005F61]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
