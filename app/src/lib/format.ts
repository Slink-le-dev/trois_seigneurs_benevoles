export function formatCreneau(heureDebut: string | null, heureFin: string | null): string | null {
  if (!heureDebut && !heureFin) return null;
  const d = heureDebut ? heureDebut.slice(0, 5) : '?';
  const f = heureFin ? heureFin.slice(0, 5) : '?';
  return `${d}–${f}`;
}
