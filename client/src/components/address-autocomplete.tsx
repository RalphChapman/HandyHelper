import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import type { Libraries } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onError?: (error: string) => void;
}

// Define libraries array as a constant to prevent unnecessary reloads
const libraries: Libraries = ["places"];

export function AddressAutocomplete({ value, onChange, onError }: AddressAutocompleteProps) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  // Get API key from environment
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Debug: Log API key presence
  useEffect(() => {
    if (!apiKey) {
      console.error('Google Maps API key is missing');
      onError?.('Google Maps API key is not configured');
    }
  }, [apiKey, onError]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries,
  });

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    try {
      console.log('Autocomplete component loaded successfully');
      setAutocomplete(autocomplete);
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
      onError?.('Failed to initialize address search');
    }
  }, [onError]);

  const onPlaceChanged = useCallback(() => {
    try {
      if (autocomplete) {
        const place = autocomplete.getPlace();
        console.log('Place selected:', place);

        if (!place.geometry) {
          console.error('No geometry returned for selected place');
          onError?.('Please select a valid address from the dropdown');
          return;
        }

        const formattedAddress = place.formatted_address;
        if (formattedAddress) {
          console.log('Selected address:', formattedAddress);
          onChange(formattedAddress);
        } else {
          console.error('No formatted address returned');
          onError?.('Selected place does not have a valid address');
        }
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      onError?.('Failed to get address details');
    }
  }, [autocomplete, onChange, onError]);

  // Handle loading error
  if (loadError) {
    console.error('Error loading Google Maps:', loadError);
    onError?.('Failed to load Google Maps. Please try entering your address manually.');
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
    return (
      <div className="flex items-center gap-2">
        <Input disabled placeholder="Loading address search..." />
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  // Return the Autocomplete component when everything is loaded
  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{ 
        componentRestrictions: { country: "us" },
        types: ['address']
      }}
    >
      <Input 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing your address"
      />
    </Autocomplete>
  );
}