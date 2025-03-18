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
    // Check if script is already loaded
    if (window.google?.maps?.places) {
      setIsLoading(false);
      initializeAutocomplete();
      return;
    }

    // Load Google Maps JavaScript API script
    const script = document.createElement('script');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;

    script.onload = () => {
      setIsLoading(false);
      initializeAutocomplete();
    };

    script.onerror = (error) => {
      console.error("Failed to load Google Maps JavaScript API:", error);
      setIsLoading(false);
    };

    document.head.appendChild(script);

    function initializeAutocomplete() {
      if (!inputRef.current || !window.google?.maps?.places) return;

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "us" },
        types: ["address"],
        fields: ["formatted_address"]
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          onChange(place.formatted_address);
        }
      });
    }

    return () => {
      const script = document.querySelector(`script[src^="https://maps.googleapis.com/maps/api/js"]`);
      if (script) {
        document.head.removeChild(script);
      }
    };
  }, [onChange]);

  if (isLoading) {
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