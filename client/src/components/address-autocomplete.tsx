import { useLoadScript } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

const libraries: ("places")[] = ["places"];

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
}

export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
    libraries,
  });

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocomplete) {
      const newAutocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "us" },
        types: ["address"]
      });

      newAutocomplete.addListener("place_changed", () => {
        const place = newAutocomplete.getPlace();
        if (place.formatted_address) {
          onChange(place.formatted_address);
        }
      });

      setAutocomplete(newAutocomplete);
    }
  }, [isLoaded, onChange]);

  if (loadError) {
    console.error("Google Maps Error:", loadError);
    return (
      <Input 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your address"
      />
    );
  }

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
      {!isLoaded && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  );
}