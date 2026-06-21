import { gpx as gpxToGeoJSON } from '@tmcw/togeojson';
import * as turf from '@turf/turf';

export interface ParsedGpx {
  geojson: GeoJSON.FeatureCollection;
  distanceKm: number;
  deniveleM: number;
}

export async function parseGpxFile(file: File): Promise<ParsedGpx> {
  const text = await file.text();
  const dom = new DOMParser().parseFromString(text, 'text/xml');
  const geojson = gpxToGeoJSON(dom) as GeoJSON.FeatureCollection;

  if (!geojson.features.length) {
    throw new Error('Aucun tracé trouvé dans ce fichier GPX.');
  }

  const distanceKm = Math.round(turf.length(geojson, { units: 'kilometers' }) * 10) / 10;
  const deniveleM = computeDenivelePositif(geojson);

  return { geojson, distanceKm, deniveleM };
}

function computeDenivelePositif(geojson: GeoJSON.FeatureCollection): number {
  let denivele = 0;

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (!geom) continue;

    const lines: number[][][] =
      geom.type === 'LineString'
        ? [geom.coordinates as number[][]]
        : geom.type === 'MultiLineString'
        ? (geom.coordinates as number[][][])
        : [];

    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        const prevEle = line[i - 1][2];
        const curEle = line[i][2];
        if (typeof prevEle === 'number' && typeof curEle === 'number') {
          const delta = curEle - prevEle;
          if (delta > 0) denivele += delta;
        }
      }
    }
  }

  return Math.round(denivele);
}
