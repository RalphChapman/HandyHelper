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

  // Log the API key availability (not the actual key)
  useEffect(() => {
    console.log("Google Maps API Key available:", !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  }, []);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    // Configure autocomplete options
    autocomplete.setOptions({
      componentRestrictions: { country: "us" },
      fields: ["formatted_address"],
      types: ["address"],
    });
    setAutocomplete(autocomplete);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        onChange(place.formatted_address);
      }
    }
  };

  if (loadError) {
    console.error("Google Maps load error:", loadError);
    onError?.("Error loading Google Maps API");
    return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  if (!isLoaded) {
    return <Input value={value} disabled placeholder="Loading address verification..." />;
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      restrictions={{ country: "us" }}
      fields={["formatted_address"]}
    >
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your address"
      />
    </Autocomplete>
  );
}