import { Input } from "@/components/ui/input";
import { useState } from "react";
import { z } from "zod";

interface AddressInputProps {
  value: string;
  onChange: (address: string) => void;
}

const addressSchema = z.string().min(5, "Address must be at least 5 characters long");

export function AddressInput({ value, onChange }: AddressInputProps) {
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    try {
      addressSchema.parse(newValue);
      setError(null);
      onChange(newValue);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
    }
  };

  return (
    <div className="space-y-2">
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Enter your full address"
        className={error ? "border-red-500" : ""}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}