import { useState } from 'react';

export default function CopyCoords({ lat, lng }: { lat: number; lng: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copier les coordonnées GPS"
      onClick={() => {
        navigator.clipboard.writeText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="ml-1 inline-flex items-center text-gray-400 hover:text-gray-600"
    >
      {copied ? (
        <span className="text-green-600 text-xs font-medium">✓</span>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}
