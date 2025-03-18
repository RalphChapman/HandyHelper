import { Input } from "@/components/ui/input";
import { useState } from "react";
import { z } from "zod";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
}

const addressSchema = z.string().min(5, "Please enter a complete address");

export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

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

    if (isDirty) {
      validateAddress(newValue);
    }
  };

  const handleBlur = () => {
    setIsDirty(true);
    validateAddress(value);
  };

  return (
    <div className="space-y-2">
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Enter your full address"
        className={error && isDirty ? "border-red-500" : ""}
      />
      {error && isDirty && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}