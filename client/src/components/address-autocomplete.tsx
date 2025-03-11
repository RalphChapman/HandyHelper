import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onError?: (error: string) => void;
}

const libraries: ("places")[] = ["places"];

export function AddressAutocomplete({ value, onChange, onError }: AddressAutocompleteProps) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isKeyMissing, setIsKeyMissing] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setIsKeyMissing(true);
      console.warn("Google Maps API key is not configured");
      // Don't show error to user, just fallback to manual input
    }
  }, [apiKey]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "", // Provide empty string as fallback
    libraries,
  });

  useEffect(() => {
    if (loadError) {
      console.error("Google Maps load error:", loadError);
      // Don't show error to user, just fallback to manual input
      setIsKeyMissing(true);
    }
  }, [loadError]);

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        onChange(place.formatted_address);
      } else {
        console.warn("No address returned from place selection");
        // Don't show error, just keep current value
      }
    }
  };

  // Return basic input if API key is missing or there's an error
  if (isKeyMissing || loadError) {
    return (
      <Input 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your address"
      />
    );
  }

  if (!isLoaded) {
    return <Input value={value} disabled placeholder="Loading address verification..." />;
  }

  return (
    <Autocomplete
      onLoad={setAutocomplete}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: "us" },
        fields: ["formatted_address"],
        types: ["address"]
      }}
    >
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing your address..."
      />
    </Autocomplete>
  );
}