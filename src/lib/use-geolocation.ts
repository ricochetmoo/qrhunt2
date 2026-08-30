"use client";

import { useCallback, useState } from "react";

export type Coordinates = { latitude: string; longitude: string; accuracy: number };

const DECIMALS = 6; // ~0.1 m; more digits just pads the stored text.

function describeError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission was denied. Allow location access for this site and try again.";
    case error.POSITION_UNAVAILABLE:
      return "Your location is currently unavailable.";
    case error.TIMEOUT:
      return "Timed out trying to get your location.";
    default:
      return "Could not get your location.";
  }
}

/**
 * One-shot browser geolocation. `request()` resolves with formatted decimal
 * strings suitable for the `qr_codes.latitude/longitude` text columns.
 */
export function useGeolocation() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useCallback((): Promise<Coordinates | null> => {
    // Checked at call time (not render) so server and client markup match.
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not supported by this browser.");
      return Promise.resolve(null);
    }

    setPending(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPending(false);
          resolve({
            latitude: position.coords.latitude.toFixed(DECIMALS),
            longitude: position.coords.longitude.toFixed(DECIMALS),
            accuracy: position.coords.accuracy,
          });
        },
        (positionError) => {
          setPending(false);
          setError(describeError(positionError));
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      );
    });
  }, []);

  return { request, pending, error };
}
