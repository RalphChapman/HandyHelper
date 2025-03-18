import { useEffect, useState } from 'react';

let isScriptLoaded = false;
let isScriptLoading = false;
let scriptLoadPromise: Promise<void> | null = null;

export const loadGoogleMapsScript = (): Promise<void> => {
  if (isScriptLoaded) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      reject(new Error('Google Maps API key is not configured'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.addEventListener('load', () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      resolve();
    });

    script.addEventListener('error', (error) => {
      isScriptLoading = false;
      reject(error);
    });

    document.head.appendChild(script);
    isScriptLoading = true;
  });

  return scriptLoadPromise;
};

export const useGoogleMapsScript = () => {
  const [isLoaded, setIsLoaded] = useState(isScriptLoaded);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isScriptLoaded && !isScriptLoading) {
      loadGoogleMapsScript()
        .then(() => setIsLoaded(true))
        .catch((err) => setError(err));
    }
  }, []);

  return { isLoaded, error };
};
