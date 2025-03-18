import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { z } from "zod";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
}

const addressSchema = z.string().min(5, "Please enter a complete address");

// Common address components for suggestions
const streetTypes = [
  "Street", "Avenue", "Road", "Boulevard", "Lane", "Drive", "Court", "Circle",
  "Place", "Way", "Parkway", "Plaza", "Terrace", "Walk"
];

const streetDirections = ["N", "S", "E", "W", "NE", "NW", "SE", "SW"];

const unitTypes = ["Apt", "Unit", "Suite", "#"];

const commonStreetNames = [
  "Main", "Oak", "Pine", "Maple", "Cedar", "Elm", "Washington", "Park",
  "Lake", "Hill", "River", "Valley", "Forest", "Highland", "Madison"
];

export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAddress = (address: string) => {
    try {
      addressSchema.parse(address);
      setError(null);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
    }
  };

  const generateSuggestions = (input: string) => {
    const parts = input.trim().split(/\s+/);
    const lastWord = parts[parts.length - 1].toLowerCase();
    const prevWord = parts[parts.length - 2]?.toLowerCase();
    let newSuggestions: string[] = [];

    // If starts with number, suggest street names
    if (parts.length === 1 && /^\d+$/.test(lastWord)) {
      newSuggestions = commonStreetNames.map(name => `${lastWord} ${name}`);
    }
    // If previous word is a number, suggest street names
    else if (parts.length === 2 && /^\d+$/.test(parts[0])) {
      newSuggestions = commonStreetNames
        .filter(name => name.toLowerCase().startsWith(lastWord))
        .map(name => `${parts[0]} ${name}`);
    }
    // If previous word is a street name, suggest street types
    else if (parts.length >= 2 && commonStreetNames.some(name => 
      name.toLowerCase() === prevWord?.toLowerCase())) {
      newSuggestions = streetTypes
        .filter(type => type.toLowerCase().startsWith(lastWord))
        .map(type => `${parts.slice(0, -1).join(" ")} ${type}`);
    }
    // If last word might be starting a unit/apt number
    else if (parts.length >= 3 && unitTypes.some(type => type.toLowerCase().startsWith(lastWord))) {
      newSuggestions = unitTypes.map(type => `${parts.slice(0, -1).join(" ")} ${type}`);
    }
    // Suggest directions if appropriate
    else if (parts.length >= 3 && streetDirections.some(dir => dir.toLowerCase().startsWith(lastWord))) {
      newSuggestions = streetDirections
        .filter(dir => dir.toLowerCase().startsWith(lastWord))
        .map(dir => `${parts.slice(0, -1).join(" ")} ${dir}`);
    }

    return newSuggestions;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Generate suggestions
    const newSuggestions = generateSuggestions(newValue);
    setSuggestions(newSuggestions);

    if (isDirty) {
      validateAddress(newValue);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setSuggestions([]), 200);
    setIsDirty(true);
    validateAddress(value);
  };

  const applySuggestion = (suggestion: string) => {
    onChange(suggestion);
    setSuggestions([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="space-y-2 relative">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Enter address (e.g. 123 Main Street)"
        className={error && isDirty ? "border-red-500" : ""}
      />
      {error && isDirty && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onMouseDown={() => applySuggestion(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}