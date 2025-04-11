import { useEffect, useState } from 'react';

let isScriptLoaded = false;
let isScriptLoading = false;
let scriptLoadCallbacks: (() => void)[] = [];

export const useGoogleMaps = () => {
  const [isLoaded, setIsLoaded] = useState(isScriptLoaded);

  useEffect(() => {
    if (isScriptLoaded) {
      setIsLoaded(true);
      return;
    }

    if (isScriptLoading) {
      scriptLoadCallbacks.push(() => setIsLoaded(true));
      return;
    }

    isScriptLoading = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      setIsLoaded(true);
      scriptLoadCallbacks.forEach(callback => callback());
      scriptLoadCallbacks = [];
    };

    script.onerror = () => {
      isScriptLoading = false;
      console.error('Failed to load Google Maps script');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if component unmounts before script loads
      if (!isScriptLoaded) {
        const index = scriptLoadCallbacks.findIndex(cb => cb === setIsLoaded);
        if (index !== -1) {
          scriptLoadCallbacks.splice(index, 1);
        }
      }
    };
  }, []);

  return isLoaded;
}; 