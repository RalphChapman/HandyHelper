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

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries,
  });

  useEffect(() => {
    if (!apiKey) {
      console.error("Google Maps API key is not configured");
      setIsKeyMissing(true);
      onError?.("Address verification is not available at the moment. You can still enter your address manually.");
    }
  }, [apiKey, onError]);

  useEffect(() => {
    if (loadError) {
      console.error("Google Maps load error:", loadError);
      setIsKeyMissing(true);
      onError?.("Failed to load address verification service. You can still enter your address manually.");
    }
  }, [loadError, onError]);

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        console.log("Selected address:", place.formatted_address);
        onChange(place.formatted_address);
      } else {
        console.warn("No address returned from place selection");
        onError?.("Could not verify the selected address. Please check and try again.");
      }
    }
  };

  // Return basic input if API key is missing or there's an error
  if (isKeyMissing || loadError) {
    return (
      <Input 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your address manually"
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
        fields: ["formatted_address", "address_components"],
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