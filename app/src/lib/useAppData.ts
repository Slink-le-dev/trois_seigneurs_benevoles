import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import {
  AbriTemporaire,
  Affectation,
  AppSettings,
  Benevole,
  MainCouranteCommentaire,
  MainCouranteEvent,
  MainCouranteJournalEntry,
  Parcours,
  PointExtraction,
  Poste,
  PosteAbri,
  PosteExtraction,
  PosteParcours,
  PosteStatut,
  PosteTypeCode,
} from '../types';

export function useAppData(isAdmin: boolean, currentUserId: string | null = null, currentUserLabel: string | null = null, evenementId: string | null = null) {
  const [parcours, setParcours] = useState<Parcours[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [posteParcours, setPosteParcoursState] = useState<PosteParcours[]>([]);
  const [posteAbris, setPosteAbris] = useState<PosteAbri[]>([]);
  const [posteExtractions, setPosteExtractions] = useState<PosteExtraction[]>([]);
  const [benevoles, setBenevoles] = useState<Benevole[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [pointsExtraction, setPointsExtraction] = useState<PointExtraction[]>([]);
  const [abrisTemporaires, setAbrisTemporaires] = useState<AbriTemporaire[]>([]);
  const [mainCourante, setMainCourante] = useState<MainCouranteEvent[]>([]);
  const [mainCouranteJournal, setMainCouranteJournal] = useState<MainCouranteJournalEntry[]>([]);
  const [mainCouranteCommentaires, setMainCouranteCommentaires] = useState<MainCouranteCommentaire[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ show_denivele: true, show_gpx_download_participant: true, show_gpx_download_benevoles: true, organisateur_nom: '', couleur_principale: '#00C389', couleur_secondaire: '#F3EA5D' });
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const benevolesTable = isAdmin ? 'benevoles' : 'benevoles_public';

    const byEvent = <T extends object>(q: T) =>
      evenementId ? (q as any).eq('evenement_id', evenementId) : q;

    const [
      parcoursRes,
      postesRes,
      posteParcoursRes,
      posteAbrisRes,
      posteExtractionsRes,
      benevolesRes,
      affectationsRes,
      pointsExtractionRes,
      abrisTemporairesRes,
      mainCouranteRes,
      settingsRes,
    ] = await Promise.all([
      byEvent(supabase.from('parcours').select('*').order('created_at')),
      byEvent(supabase.from('postes').select('*').order('created_at')),
      supabase.from('poste_parcours').select('*'),
      supabase.from('poste_abris').select('*'),
      supabase.from('poste_extractions').select('*'),
      supabase.from(benevolesTable).select('*').order('nom'),
      supabase.from('affectations').select('*'),
      byEvent(supabase.from('points_extraction').select('*').order('created_at')),
      byEvent(supabase.from('abris_temporaires').select('*').order('created_at')),
      supabase.from('main_courante').select('*').is('deleted_at', null).order('date_evenement', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('app_settings').select('*').single(),
    ]);

    if (parcoursRes.data) setParcours(parcoursRes.data as Parcours[]);
    if (postesRes.data) setPostes(postesRes.data as Poste[]);
    if (posteParcoursRes.data) setPosteParcoursState(posteParcoursRes.data as PosteParcours[]);
    if (posteAbrisRes.data) setPosteAbris(posteAbrisRes.data as PosteAbri[]);
    if (posteExtractionsRes.data) setPosteExtractions(posteExtractionsRes.data as PosteExtraction[]);
    if (benevolesRes.data) {
      setBenevoles(
        (benevolesRes.data as any[]).map((b) => ({
          id: b.id,
          nom: b.nom,
          telephone: b.telephone ?? null,
          formation: b.formation ?? 'aucune',
          created_at: b.created_at,
        }))
      );
    }
    if (affectationsRes.data) setAffectations(affectationsRes.data as Affectation[]);
    if (pointsExtractionRes.data) setPointsExtraction(pointsExtractionRes.data as PointExtraction[]);
    if (abrisTemporairesRes.data) setAbrisTemporaires(abrisTemporairesRes.data as AbriTemporaire[]);
    if (mainCouranteRes.data) setMainCourante(mainCouranteRes.data as MainCouranteEvent[]);
    if (settingsRes.data) setSettings(settingsRes.data as AppSettings);

    if (isAdmin) {
      const [journalRes, commentairesRes] = await Promise.all([
        supabase.from('main_courante_journal').select('*').order('created_at'),
        supabase.from('main_courante_commentaires').select('*').order('created_at'),
      ]);
      if (journalRes.data) setMainCouranteJournal(journalRes.data as MainCouranteJournalEntry[]);
      if (commentairesRes.data) setMainCouranteCommentaires(commentairesRes.data as MainCouranteCommentaire[]);
    }

    setLoading(false);
  }, [isAdmin, evenementId]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Realtime : statuts (et créations/suppressions) de postes visibles par tous
  useEffect(() => {
    const channel = supabase
      .channel('postes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'postes' }, (payload) => {
        setPostes((current) => {
          if (payload.eventType === 'DELETE') {
            return current.filter((p) => p.id !== (payload.old as any).id);
          }
          const incoming = payload.new as Poste;
          if (evenementId && incoming.evenement_id !== evenementId) return current;
          const exists = current.some((p) => p.id === incoming.id);
          return exists
            ? current.map((p) => (p.id === incoming.id ? incoming : p))
            : [...current, incoming];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [evenementId]);

  const getParcoursIdsForPoste = useCallback(
    (posteId: string) => posteParcours.filter((pp) => pp.poste_id === posteId).map((pp) => pp.parcours_id),
    [posteParcours]
  );

  const getAffectationsForPoste = useCallback(
    (posteId: string) => affectations.filter((a) => a.poste_id === posteId),
    [affectations]
  );

  const getAbriIdsForPoste = useCallback(
    (posteId: string) => posteAbris.filter((pa) => pa.poste_id === posteId).map((pa) => pa.abri_id),
    [posteAbris]
  );

  const getExtractionIdsForPoste = useCallback(
    (posteId: string) => posteExtractions.filter((pe) => pe.poste_id === posteId).map((pe) => pe.extraction_id),
    [posteExtractions]
  );

  // ---- Parcours ----

  async function createParcours(data: Partial<Parcours>) {
    const payload = evenementId ? { ...data, evenement_id: evenementId } : data;
    const { data: row, error } = await supabase.from('parcours').insert(payload).select().single();
    if (error) throw error;
    setParcours((c) => [...c, row as Parcours]);
    return row as Parcours;
  }

  async function updateParcours(id: string, data: Partial<Parcours>) {
    const { data: row, error } = await supabase.from('parcours').update(data).eq('id', id).select().single();
    if (error) throw error;
    setParcours((c) => c.map((p) => (p.id === id ? (row as Parcours) : p)));
  }

  async function deleteParcoursGpx(id: string) {
    await updateParcours(id, { gpx_geojson: null, distance_km: null, denivele_m: null });
  }

  async function deleteParcours(id: string) {
    const { error } = await supabase.from('parcours').delete().eq('id', id);
    if (error) throw error;
    setParcours((c) => c.filter((p) => p.id !== id));
    setPosteParcoursState((c) => c.filter((pp) => pp.parcours_id !== id));
  }

  // ---- Postes ----

  async function createPoste(data: Partial<Poste>, parcoursIds: string[]) {
    const numero = data.numero ?? (postes.length ? Math.max(...postes.map((p) => p.numero)) + 1 : 1);
    const payload = evenementId ? { ...data, numero, evenement_id: evenementId } : { ...data, numero };
    const { data: row, error } = await supabase.from('postes').insert(payload).select().single();
    if (error) throw error;
    const poste = row as Poste;
    setPostes((c) => [...c, poste]);
    if (parcoursIds.length) await setPosteParcoursLinks(poste.id, parcoursIds);
    return poste;
  }

  async function updatePoste(id: string, data: Partial<Poste>) {
    const { data: row, error } = await supabase.from('postes').update(data).eq('id', id).select().single();
    if (error) throw error;
    setPostes((c) => c.map((p) => (p.id === id ? (row as Poste) : p)));
  }

  async function deletePoste(id: string) {
    const { error } = await supabase.from('postes').delete().eq('id', id);
    if (error) throw error;
    setPostes((c) => c.filter((p) => p.id !== id));
    setPosteParcoursState((c) => c.filter((pp) => pp.poste_id !== id));
    setAffectations((c) => c.filter((a) => a.poste_id !== id));
  }

  async function setPosteParcoursLinks(posteId: string, parcoursIds: string[]) {
    await supabase.from('poste_parcours').delete().eq('poste_id', posteId);
    if (parcoursIds.length) {
      await supabase.from('poste_parcours').insert(parcoursIds.map((parcours_id) => ({ poste_id: posteId, parcours_id })));
    }
    setPosteParcoursState((c) => [
      ...c.filter((pp) => pp.poste_id !== posteId),
      ...parcoursIds.map((parcours_id) => ({ poste_id: posteId, parcours_id })),
    ]);
  }

  async function setPosteAbrisLinks(posteId: string, abriIds: string[]) {
    await supabase.from('poste_abris').delete().eq('poste_id', posteId);
    if (abriIds.length) {
      await supabase.from('poste_abris').insert(abriIds.map((abri_id) => ({ poste_id: posteId, abri_id })));
    }
    setPosteAbris((c) => [
      ...c.filter((pa) => pa.poste_id !== posteId),
      ...abriIds.map((abri_id) => ({ poste_id: posteId, abri_id })),
    ]);
  }

  async function setPosteExtractionsLinks(posteId: string, extractionIds: string[]) {
    await supabase.from('poste_extractions').delete().eq('poste_id', posteId);
    if (extractionIds.length) {
      await supabase.from('poste_extractions').insert(extractionIds.map((extraction_id) => ({ poste_id: posteId, extraction_id })));
    }
    setPosteExtractions((c) => [
      ...c.filter((pe) => pe.poste_id !== posteId),
      ...extractionIds.map((extraction_id) => ({ poste_id: posteId, extraction_id })),
    ]);
  }

  async function setPosteStatut(posteId: string, statut: PosteStatut) {
    await updatePoste(posteId, { statut, statut_updated_at: new Date().toISOString() });
  }

  async function setPosteTypes(posteId: string, types: PosteTypeCode[]) {
    await updatePoste(posteId, { types });
  }

  async function movePoste(posteId: string, lat: number, lng: number) {
    await updatePoste(posteId, { lat, lng });
  }

  // ---- Bénévoles & affectations ----

  async function createBenevole(data: Partial<Benevole>) {
    const { data: row, error } = await supabase.from('benevoles').insert(data).select().single();
    if (error) throw error;
    setBenevoles((c) => [...c, row as Benevole]);
    return row as Benevole;
  }

  async function updateBenevole(id: string, data: Partial<Benevole>) {
    const { data: row, error } = await supabase.from('benevoles').update(data).eq('id', id).select().single();
    if (error) throw error;
    setBenevoles((c) => c.map((b) => (b.id === id ? (row as Benevole) : b)));
  }

  async function deleteBenevole(id: string) {
    const { error } = await supabase.from('benevoles').delete().eq('id', id);
    if (error) throw error;
    setBenevoles((c) => c.filter((b) => b.id !== id));
    setAffectations((c) => c.filter((a) => a.benevole_id !== id));
  }

  async function createAffectation(data: Partial<Affectation>) {
    const { data: row, error } = await supabase.from('affectations').insert(data).select().single();
    if (error) throw error;
    setAffectations((c) => [...c, row as Affectation]);
    return row as Affectation;
  }

  async function deleteAffectation(id: string) {
    const { error } = await supabase.from('affectations').delete().eq('id', id);
    if (error) throw error;
    setAffectations((c) => c.filter((a) => a.id !== id));
  }

  // ---- Points d'extraction ----

  function nextLettreExtraction(): string {
    const used = new Set(pointsExtraction.map((p) => p.lettre));
    for (let i = 0; i < 26; i++) {
      const lettre = String.fromCharCode(65 + i);
      if (!used.has(lettre)) return lettre;
    }
    return '';
  }

  async function createPointExtraction(data: Partial<PointExtraction>) {
    const lettre = data.lettre ?? nextLettreExtraction();
    const base = { ...data, lettre };
    const payload = evenementId ? { ...base, evenement_id: evenementId } : base;
    const { data: row, error } = await supabase.from('points_extraction').insert(payload).select().single();
    if (error) throw error;
    const point = row as PointExtraction;
    setPointsExtraction((c) => [...c, point]);
    return point;
  }

  async function updatePointExtraction(id: string, data: Partial<PointExtraction>) {
    const { data: row, error } = await supabase.from('points_extraction').update(data).eq('id', id).select().single();
    if (error) throw error;
    setPointsExtraction((c) => c.map((p) => (p.id === id ? (row as PointExtraction) : p)));
  }

  async function deletePointExtraction(id: string) {
    const { error } = await supabase.from('points_extraction').delete().eq('id', id);
    if (error) throw error;
    setPointsExtraction((c) => c.filter((p) => p.id !== id));
  }

  async function moveExtraction(id: string, lat: number, lng: number) {
    await updatePointExtraction(id, { lat, lng });
  }

  // ---- Abris temporaires ----

  async function createAbriTemporaire(data: Partial<AbriTemporaire>) {
    const numero = data.numero ?? (abrisTemporaires.length ? Math.max(...abrisTemporaires.map((a) => a.numero)) + 1 : 1);
    const base = { ...data, numero };
    const payload = evenementId ? { ...base, evenement_id: evenementId } : base;
    const { data: row, error } = await supabase.from('abris_temporaires').insert(payload).select().single();
    if (error) throw error;
    const abri = row as AbriTemporaire;
    setAbrisTemporaires((c) => [...c, abri]);
    return abri;
  }

  async function updateAbriTemporaire(id: string, data: Partial<AbriTemporaire>) {
    const { data: row, error } = await supabase.from('abris_temporaires').update(data).eq('id', id).select().single();
    if (error) throw error;
    setAbrisTemporaires((c) => c.map((a) => (a.id === id ? (row as AbriTemporaire) : a)));
  }

  async function deleteAbriTemporaire(id: string) {
    const { error } = await supabase.from('abris_temporaires').delete().eq('id', id);
    if (error) throw error;
    setAbrisTemporaires((c) => c.filter((a) => a.id !== id));
  }

  async function moveAbriTemporaire(id: string, lat: number, lng: number) {
    await updateAbriTemporaire(id, { lat, lng });
  }

  async function createMainCourante(data: Partial<MainCouranteEvent>) {
    if (!currentUserId) throw new Error('Utilisateur non authentifié.');
    const { data: row, error } = await supabase
      .from('main_courante')
      .insert({ ...data, created_by: currentUserId })
      .select()
      .single();
    if (error) throw error;
    const event = row as MainCouranteEvent;
    setMainCourante((c) => [event, ...c]);
    return event;
  }

  async function updateMainCourante(id: string, data: Partial<MainCouranteEvent>) {
    if (!currentUserId) throw new Error('Utilisateur non authentifié.');
    const before = mainCourante.find((m) => m.id === id);
    const { data: row, error } = await supabase
      .from('main_courante')
      .update({ ...data, updated_by: currentUserId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    const event = row as MainCouranteEvent;
    setMainCourante((c) => c.map((m) => (m.id === id ? event : m)));

    if (before) {
      const auteur = currentUserLabel ?? currentUserId;
      const journalEntries = Object.keys(data)
        .filter((champ) => (before as any)[champ] !== (event as any)[champ])
        .map((champ) => ({
          event_id: id,
          created_by: auteur,
          champ,
          ancienne_valeur: (before as any)[champ] != null ? String((before as any)[champ]) : null,
          nouvelle_valeur: (event as any)[champ] != null ? String((event as any)[champ]) : null,
        }));
      if (journalEntries.length) {
        const { data: rows } = await supabase.from('main_courante_journal').insert(journalEntries).select();
        if (rows) setMainCouranteJournal((c) => [...c, ...(rows as MainCouranteJournalEntry[])]);
      }
    }

    return event;
  }

  async function createMainCouranteCommentaire(eventId: string, contenu: string) {
    if (!currentUserId) throw new Error('Utilisateur non authentifié.');
    const { data: row, error } = await supabase
      .from('main_courante_commentaires')
      .insert({ event_id: eventId, created_by: currentUserLabel ?? currentUserId, contenu })
      .select()
      .single();
    if (error) throw error;
    const commentaire = row as MainCouranteCommentaire;
    setMainCouranteCommentaires((c) => [...c, commentaire]);
    return commentaire;
  }

  async function updateSettings(partial: Partial<AppSettings>) {
    const next = { ...settings, ...partial };
    const { error } = await supabase.from('app_settings').update(next).eq('id', 1);
    if (error) throw error;
    setSettings(next);
  }

  async function deleteMainCourante(id: string) {
    if (!currentUserId) throw new Error('Utilisateur non authentifié.');
    const { data: row, error } = await supabase
      .from('main_courante')
      .update({ deleted_at: new Date().toISOString(), deleted_by: currentUserId })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setMainCourante((c) => c.filter((m) => m.id !== id));
    return row as MainCouranteEvent;
  }

  return {
    parcours,
    postes,
    posteParcours,
    posteAbris,
    posteExtractions,
    benevoles,
    affectations,
    pointsExtraction,
    abrisTemporaires,
    mainCourante,
    mainCouranteJournal,
    mainCouranteCommentaires,
    loading,
    refreshAll,
    getParcoursIdsForPoste,
    getAffectationsForPoste,
    getAbriIdsForPoste,
    getExtractionIdsForPoste,
    createParcours,
    updateParcours,
    deleteParcoursGpx,
    deleteParcours,
    createPoste,
    updatePoste,
    deletePoste,
    setPosteParcoursLinks,
    setPosteAbrisLinks,
    setPosteExtractionsLinks,
    setPosteStatut,
    setPosteTypes,
    movePoste,
    createBenevole,
    updateBenevole,
    deleteBenevole,
    createAffectation,
    deleteAffectation,
    createPointExtraction,
    updatePointExtraction,
    deletePointExtraction,
    moveExtraction,
    createAbriTemporaire,
    updateAbriTemporaire,
    deleteAbriTemporaire,
    moveAbriTemporaire,
    createMainCourante,
    updateMainCourante,
    deleteMainCourante,
    createMainCouranteCommentaire,
    settings,
    updateSettings,
  };
}

export type AppData = ReturnType<typeof useAppData>;
