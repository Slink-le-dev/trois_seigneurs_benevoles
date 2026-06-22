import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import {
  Affectation,
  Benevole,
  MainCouranteEvent,
  Parcours,
  PointExtraction,
  Poste,
  PosteParcours,
  PosteStatut,
  PosteTypeCode,
} from '../types';

export function useAppData(isAdmin: boolean, currentUserId: string | null = null) {
  const [parcours, setParcours] = useState<Parcours[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [posteParcours, setPosteParcoursState] = useState<PosteParcours[]>([]);
  const [benevoles, setBenevoles] = useState<Benevole[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [pointsExtraction, setPointsExtraction] = useState<PointExtraction[]>([]);
  const [mainCourante, setMainCourante] = useState<MainCouranteEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const benevolesTable = isAdmin ? 'benevoles' : 'benevoles_public';

    const [parcoursRes, postesRes, posteParcoursRes, benevolesRes, affectationsRes, pointsExtractionRes, mainCouranteRes] = await Promise.all([
      supabase.from('parcours').select('*').order('created_at'),
      supabase.from('postes').select('*').order('created_at'),
      supabase.from('poste_parcours').select('*'),
      supabase.from(benevolesTable).select('*').order('nom'),
      supabase.from('affectations').select('*'),
      supabase.from('points_extraction').select('*').order('created_at'),
      supabase.from('main_courante').select('*').is('deleted_at', null).order('date_evenement', { ascending: false }).order('created_at', { ascending: false }),
    ]);

    if (parcoursRes.data) setParcours(parcoursRes.data as Parcours[]);
    if (postesRes.data) setPostes(postesRes.data as Poste[]);
    if (posteParcoursRes.data) setPosteParcoursState(posteParcoursRes.data as PosteParcours[]);
    if (benevolesRes.data) {
      setBenevoles(
        (benevolesRes.data as any[]).map((b) => ({
          id: b.id,
          nom: b.nom,
          telephone: b.telephone ?? null,
          created_at: b.created_at,
        }))
      );
    }
    if (affectationsRes.data) setAffectations(affectationsRes.data as Affectation[]);
    if (pointsExtractionRes.data) setPointsExtraction(pointsExtractionRes.data as PointExtraction[]);
    if (mainCouranteRes.data) setMainCourante(mainCouranteRes.data as MainCouranteEvent[]);

    setLoading(false);
  }, [isAdmin]);

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
  }, []);

  const getParcoursIdsForPoste = useCallback(
    (posteId: string) => posteParcours.filter((pp) => pp.poste_id === posteId).map((pp) => pp.parcours_id),
    [posteParcours]
  );

  const getAffectationsForPoste = useCallback(
    (posteId: string) => affectations.filter((a) => a.poste_id === posteId),
    [affectations]
  );

  // ---- Parcours ----

  async function createParcours(data: Partial<Parcours>) {
    const { data: row, error } = await supabase.from('parcours').insert(data).select().single();
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

  // ---- Postes ----

  async function createPoste(data: Partial<Poste>, parcoursIds: string[]) {
    const numero = data.numero ?? (postes.length ? Math.max(...postes.map((p) => p.numero)) + 1 : 1);
    const { data: row, error } = await supabase.from('postes').insert({ ...data, numero }).select().single();
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
    const { data: row, error } = await supabase.from('points_extraction').insert({ ...data, lettre }).select().single();
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
    const { data: row, error } = await supabase
      .from('main_courante')
      .update({ ...data, updated_by: currentUserId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    const event = row as MainCouranteEvent;
    setMainCourante((c) => c.map((m) => (m.id === id ? event : m)));
    return event;
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
    benevoles,
    affectations,
    pointsExtraction,
    mainCourante,
    loading,
    refreshAll,
    getParcoursIdsForPoste,
    getAffectationsForPoste,
    createParcours,
    updateParcours,
    deleteParcoursGpx,
    createPoste,
    updatePoste,
    deletePoste,
    setPosteParcoursLinks,
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
    createMainCourante,
    updateMainCourante,
    deleteMainCourante,
  };
}

export type AppData = ReturnType<typeof useAppData>;
