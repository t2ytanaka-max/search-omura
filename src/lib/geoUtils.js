import * as turf from '@turf/turf';

/**
 * Generates a buffer polygon from a series of coordinates.
 * @param {Array} points - Array of {lat, lng} objects.
 * @param {number} radiusInMeters - Buffer radius (default 15m).
 * @returns {GeoJSON.Feature} - A Polygon or MultiPolygon feature.
 */
export const generateBuffer = (points, radiusInMeters = 15) => {
  if (points.length < 2) return null;

  // Convert points to LineString coordinates [lng, lat]
  const coordinates = points.map(p => [p.lng, p.lat]);
  
  // Create a LineString
  const line = turf.lineString(coordinates);
  
  // Simplify the line to reduce points while maintaining shape
  const simplified = turf.simplify(line, { tolerance: 0.00001, highQuality: false });

  // Generate buffer (radius is in kilometers for turf)
  const buffer = turf.buffer(simplified, radiusInMeters / 1000, { units: 'kilometers' });
  
  return buffer;
};

/**
 * Combines multiple GeoJSON features into one.
 */
export const combineFeatures = (features) => {
  if (!features || features.length === 0) return null;
  if (features.length === 1) return features[0];
  
  let combined = features[0];
  for (let i = 1; i < features.length; i++) {
    combined = turf.union(combined, features[i]);
  }
  return combined;
};
