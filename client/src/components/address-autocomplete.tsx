import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import type { Libraries } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onError?: (error: string) => void;
}

const libraries: Libraries = ["places"];

export function AddressAutocomplete({ value, onChange, onError }: AddressAutocompleteProps) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

  // Ensure API key exists
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      console.error('Google Maps API key is missing');
      setFallbackMode(true);
    }
  }, [apiKey]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries,
  });

  useEffect(() => {
    if (loadError) {
      console.error('Google Maps loading error:', loadError);
      setFallbackMode(true);
    }
  }, [loadError]);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    setAutocomplete(autocomplete);
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        onChange(place.formatted_address);
        setIsAddressSelected(true);
      }
    }
  }, [autocomplete, onChange]);

  // Show regular input if in fallback mode
  if (fallbackMode) {
    return (
      <Input 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your address"
      />
    );
  }

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2">
        <Input disabled placeholder="Loading address search..." />
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  // Return the Autocomplete component
  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{ 
        componentRestrictions: { country: "us" },
        types: ['address']
      }}
    >
      <Input 
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsAddressSelected(false);
        }}
        placeholder="Start typing your address"
        className={isAddressSelected ? "border-green-500" : undefined}
      />
    </Autocomplete>
  );
}