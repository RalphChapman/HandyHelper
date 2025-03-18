import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { z } from "zod";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
}

const addressSchema = z.string().min(5, "Please enter a complete address");

// Common address components for suggestions
const streetSuffixes = [
  "Street", "St", "Avenue", "Ave", "Road", "Rd", "Boulevard", "Blvd",
  "Lane", "Ln", "Drive", "Dr", "Court", "Ct", "Circle", "Cir",
  "Place", "Pl", "Way", "Parkway", "Pkwy"
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Generate suggestions based on the last word being typed
    const words = newValue.split(' ');
    const lastWord = words[words.length - 1].toLowerCase();

    if (lastWord.length > 0) {
      const matchingSuffixes = streetSuffixes.filter(suffix => 
        suffix.toLowerCase().startsWith(lastWord)
      );
      setSuggestions(matchingSuffixes);
    } else {
      setSuggestions([]);
    }

    if (isDirty) {
      validateAddress(newValue);
    }
  };

  const handleBlur = () => {
    // Hide suggestions after a short delay to allow clicking them
    setTimeout(() => setSuggestions([]), 200);
    setIsDirty(true);
    validateAddress(value);
  };

  const applySuggestion = (suggestion: string) => {
    const words = value.split(' ');
    words[words.length - 1] = suggestion;
    const newValue = words.join(' ');
    onChange(newValue);
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
        placeholder="Enter your full address (e.g. 123 Main St)"
        className={error && isDirty ? "border-red-500" : ""}
      />
      {error && isDirty && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1">
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