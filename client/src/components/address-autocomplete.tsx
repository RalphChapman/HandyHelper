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
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Log API key status and initialization
  useEffect(() => {
    console.log("Initializing Google Maps with API key:", !!apiKey);
    if (!apiKey) {
      onError?.("Google Maps API key is not configured");
      console.error("Google Maps API key is missing");
    }
  }, [apiKey, onError]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries,
  });

  useEffect(() => {
    if (loadError) {
      console.error("Google Maps load error:", loadError);
      onError?.(`Error loading Google Maps: ${loadError.message}`);
    }
  }, [loadError, onError]);

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        console.log("Selected address:", place.formatted_address);
        onChange(place.formatted_address);
      } else {
        console.error("No address returned from place selection");
        onError?.("Failed to get address details");
      }
    }
  };

  if (!isLoaded) {
    return <Input value={value} disabled placeholder="Loading address verification..." />;
  }

  if (loadError) {
    return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
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
        placeholder="Enter your address"
      />
    </Autocomplete>
  );
}