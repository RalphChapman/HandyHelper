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

  // If API key is missing, just return the basic input
  if (!apiKey) {
    return (
      <Input 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your address"
      />
    );
  }

  // Return basic input if there's an error
  if (isKeyMissing) {
    return (
      <Input 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your address"
      />
    );
  }

  // Return basic input while loading
  return (
    <Input 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter your address"
    />
  );
}