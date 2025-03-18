import { Input } from "@/components/ui/input";
import { useState } from "react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onError?: (error: string) => void;
}

export function AddressAutocomplete({ value, onChange, onError }: AddressAutocompleteProps) {
  const [isValid, setIsValid] = useState(false);

  const validateAddress = (address: string) => {
    // Basic validation: Must contain street number, street name, city, state, and ZIP
    const hasStreetNumber = /\d+/.test(address);
    const hasStreetName = /[a-zA-Z]+/.test(address);
    const hasCityState = /[a-zA-Z]+,\s*[A-Z]{2}/.test(address);
    const hasZip = /\d{5}/.test(address);

    const isValidAddress = hasStreetNumber && hasStreetName && hasCityState && hasZip;
    setIsValid(isValidAddress);

    if (!isValidAddress && address.length > 0) {
      onError?.('Please enter a complete address (e.g., 123 Main St, Charleston, SC 12345)');
    }

    return isValidAddress;
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    validateAddress(newValue);
  };

  return (
    <Input 
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Enter full address (e.g., 123 Main St, Charleston, SC 12345)"
      className={isValid ? "border-green-500" : undefined}
    />
  );
}