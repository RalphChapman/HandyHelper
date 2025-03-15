import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onError?: (error: string) => void;
}

// Make libraries array static to avoid unnecessary reloads
const LIBRARIES: ("places")[] = ["places"];

export function AddressAutocomplete({ value, onChange, onError }: AddressAutocompleteProps) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isKeyMissing, setIsKeyMissing] = useState(false);

  // Get API key from environment
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Debug: Log the API key status (not the actual key)
  console.log("[AddressAutocomplete] API Key status:", apiKey ? "Present" : "Missing");

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries: LIBRARIES
  });

  // Handle missing API key
  useEffect(() => {
    if (!apiKey) {
      console.error("[AddressAutocomplete] Google Maps API key is missing in environment");
      setIsKeyMissing(true);
      onError?.("Address verification is temporarily unavailable. Please enter your address manually.");
    }
  }, [apiKey, onError]);

  // Handle script load errors
  useEffect(() => {
    if (loadError) {
      console.error("[AddressAutocomplete] Google Maps load error:", loadError);
      setIsKeyMissing(true);
      onError?.("Failed to load address verification. Please enter your address manually.");
    }
  }, [loadError, onError]);

  // Handle place selection
  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        console.log("[AddressAutocomplete] Selected address:", place.formatted_address);
        onChange(place.formatted_address);
      } else {
        console.warn("[AddressAutocomplete] No address returned from place selection");
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

  // Show loading state
  if (!isLoaded) {
    return <Input value={value} disabled placeholder="Loading address verification..." />;
  }

  // Return Autocomplete component
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