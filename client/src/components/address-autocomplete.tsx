import { Input } from "@/components/ui/input";
import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useGoogleMapsScript } from "@/lib/maps-loader";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
}

export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const { isLoaded, error } = useGoogleMapsScript();
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocomplete) {
      const newAutocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "us" },
        types: ['address']
      });

      newAutocomplete.addListener('place_changed', () => {
        const place = newAutocomplete.getPlace();
        if (place.formatted_address) {
          onChange(place.formatted_address);
        }
      });

      setAutocomplete(newAutocomplete);
    }
  }, [isLoaded, onChange]);

  if (error) {
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
    <Input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Start typing your address"
    />
  );
}