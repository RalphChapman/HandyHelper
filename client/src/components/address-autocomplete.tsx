import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import type { Libraries } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { useState, useCallback } from "react";
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

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

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

  if (loadError) {
    return (
      <Input 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your address"
      />
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2">
        <Input disabled placeholder="Loading address search..." />
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

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