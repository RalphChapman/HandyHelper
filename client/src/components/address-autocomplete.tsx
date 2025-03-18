import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { loadGoogleMapsScript } from "@/lib/maps-loader";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
}

export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        if (!inputRef.current) return;

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
      })
      .catch((error) => {
        console.error('Error loading Google Maps:', error);
        setIsLoading(false);
      });
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