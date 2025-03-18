import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
}

export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('Starting Maps script load...');
    const script = document.createElement('script');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log('API Key available:', !!apiKey);

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;

    script.onload = () => {
      console.log('Maps script loaded successfully');
      if (!inputRef.current) return;

      try {
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "us" },
          types: ["address"]
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address) {
            onChange(place.formatted_address);
          }
        });

        setIsLoading(false);
        console.log('Autocomplete initialized successfully');
      } catch (error) {
        console.error('Error initializing autocomplete:', error);
        setIsLoading(false);
      }
    };

    script.onerror = (error) => {
      console.error('Error loading Maps script:', error);
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      const loadedScript = document.querySelector(`script[src^="https://maps.googleapis.com/maps/api/js"]`);
      if (loadedScript && loadedScript.parentNode) {
        loadedScript.parentNode.removeChild(loadedScript);
      }
    };
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing your address"
        className="pr-8"
      />
      {isLoading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  );
}