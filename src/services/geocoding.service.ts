import logger from '../utils/logger';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface ReverseGeocodeResult {
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

/**
 * Convert an address string to lat/lng coordinates using Google Maps Geocoding API.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      logger.warn('Google Maps API key not configured, using mock geocode data');
      return mockGeocode();
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if ((data as any).status === 'OK' && (data as any).results.length > 0) {
      const location = (data as any).results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: (data as any).results[0].formatted_address,
      };
    }

    return null;
  } catch (error) {
    logger.error('Geocoding error', { error, address });
    return null;
  }
}

/**
 * Convert lat/lng coordinates to an address using Google Maps Reverse Geocoding.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      logger.warn('Google Maps API key not configured, using mock reverse geocode data');
      return mockReverseGeocode();
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if ((data as any).status === 'OK' && (data as any).results.length > 0) {
      const result = (data as any).results[0];
      
      let city = '';
      let state = '';
      let pincode = '';

      for (const component of result.address_components) {
        if (component.types.includes('locality')) {
          city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
        if (component.types.includes('postal_code')) {
          pincode = component.long_name;
        }
      }

      return {
        addressLine: result.formatted_address,
        city,
        state,
        pincode,
      };
    }

    return null;
  } catch (error) {
    logger.error('Reverse geocoding error', { error, lat, lng });
    return null;
  }
}

// ─── Mock Implementations for Development ─────────────────────────────────────

function mockGeocode(): GeocodeResult {
  return {
    latitude: 23.2599, // Bhopal coordinates
    longitude: 77.4126,
    formattedAddress: 'Bhopal, Madhya Pradesh, India',
  };
}

function mockReverseGeocode(): ReverseGeocodeResult {
  return {
    addressLine: 'TT Nagar Stadium',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462003',
  };
}
