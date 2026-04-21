/**
 * Geocodificação
 * - Preferência: Google Maps API (se NEXT_PUBLIC_GOOGLE_MAPS_API_KEY configurada)
 * - Fallback: OpenStreetMap Nominatim (sem chave, respeita rate limits)
 * - Último recurso: retornar null (geocodificação manual)
 */

export interface GeocodingResult {
  latitude: number
  longitude: number
  formatted_address: string
  neighborhood?: string
  city?: string
  state?: string
  cep?: string
  source: 'google' | 'nominatim' | 'manual'
}

// ============================================================
// Google Maps Geocoder
// ============================================================

async function geocodeWithGoogle(address: string): Promise<GeocodingResult | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return null

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}&language=pt-BR&region=BR`
    )
    if (!response.ok) return null
    const data = await response.json()

    if (data.status !== 'OK' || !data.results?.[0]) return null

    const result = data.results[0]
    const location = result.geometry.location
    const components = result.address_components

    const getComponent = (type: string) =>
      components.find((c: { types: string[]; long_name: string }) =>
        c.types.includes(type)
      )?.long_name

    return {
      latitude: location.lat,
      longitude: location.lng,
      formatted_address: result.formatted_address,
      neighborhood: getComponent('sublocality_level_1') || getComponent('neighborhood'),
      city:
        getComponent('administrative_area_level_2') ||
        getComponent('locality'),
      state: getComponent('administrative_area_level_1'),
      cep: getComponent('postal_code'),
      source: 'google',
    }
  } catch {
    return null
  }
}

// ============================================================
// OpenStreetMap Nominatim Geocoder
// ============================================================

async function geocodeWithNominatim(address: string): Promise<GeocodingResult | null> {
  try {
    // Adiciona Brasil ao endereço para melhorar resultado
    const query = address.includes('Brasil') ? address : `${address}, Brasil`

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1&countrycodes=br`,
      {
        headers: {
          'User-Agent': 'LeilaoAnalytics/1.0 (contact@leilaoanalytics.com)',
        },
      }
    )

    if (!response.ok) return null
    const data = await response.json()

    if (!data?.[0]) return null

    const r = data[0]
    const addr = r.address || {}

    return {
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      formatted_address: r.display_name,
      neighborhood: addr.suburb || addr.neighbourhood || addr.quarter,
      city:
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.county,
      state: addr.state,
      cep: addr.postcode,
      source: 'nominatim',
    }
  } catch {
    return null
  }
}

// ============================================================
// API pública (chamada do frontend via route handler)
// ============================================================

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  // Tenta Google primeiro
  const googleResult = await geocodeWithGoogle(address)
  if (googleResult) return googleResult

  // Fallback: Nominatim
  const nominatimResult = await geocodeWithNominatim(address)
  if (nominatimResult) return nominatimResult

  return null
}

// ============================================================
// Busca reversa (lat/lng → endereço)
// ============================================================

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (key) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&language=pt-BR`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'OK' && data.results?.[0]) {
          const r = data.results[0]
          const components = r.address_components
          const getComponent = (type: string) =>
            components.find((c: { types: string[]; long_name: string }) =>
              c.types.includes(type)
            )?.long_name

          return {
            latitude: lat,
            longitude: lng,
            formatted_address: r.formatted_address,
            neighborhood:
              getComponent('sublocality_level_1') || getComponent('neighborhood'),
            city:
              getComponent('administrative_area_level_2') ||
              getComponent('locality'),
            state: getComponent('administrative_area_level_1'),
            cep: getComponent('postal_code'),
            source: 'google',
          }
        }
      }
    } catch {}
  }

  // Fallback Nominatim
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          'User-Agent': 'LeilaoAnalytics/1.0 (contact@leilaoanalytics.com)',
        },
      }
    )
    if (response.ok) {
      const data = await response.json()
      const addr = data.address || {}
      return {
        latitude: lat,
        longitude: lng,
        formatted_address: data.display_name,
        neighborhood: addr.suburb || addr.neighbourhood,
        city: addr.city || addr.town || addr.municipality,
        state: addr.state,
        cep: addr.postcode,
        source: 'nominatim',
      }
    }
  } catch {}

  return null
}

// ============================================================
// Helpers
// ============================================================

export function buildAddressString(parts: {
  address?: string
  neighborhood?: string
  city?: string
  state?: string
  cep?: string
}): string {
  return [parts.address, parts.neighborhood, parts.city, parts.state, parts.cep]
    .filter(Boolean)
    .join(', ')
}
