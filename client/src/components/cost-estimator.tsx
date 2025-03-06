import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, DollarSign } from "lucide-react";

interface CostEstimatorProps {
  description: string;
  onEstimateChange?: (estimate: number) => void;
}

interface CostBreakdown {
  labor: number;
  materials: number;
  permits: number;
  overhead: number;
}

interface EstimateResult {
  estimate: number;
  breakdown: CostBreakdown;
  factors: string[];
}

export function CostEstimator({ description, onEstimateChange }: CostEstimatorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [parameters, setParameters] = useState({
    squareFootage: 100,
    quality: 'standard' as const,
    timeline: 'standard' as const,
    location: 'Charleston, SC'
  });

  useEffect(() => {
    if (!description) return;
    
    const debounceTimer = setTimeout(() => {
      getEstimate();
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [description, parameters]);

  async function getEstimate() {
    if (!description) return;

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/estimate-cost", {
        description,
        parameters
      });
      const data = await response.json();
      setEstimate(data);
      onEstimateChange?.(data.estimate);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get cost estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Cost Estimator
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Square Footage</Label>
          <Slider
            value={[parameters.squareFootage]}
            onValueChange={(values) => setParameters({ ...parameters, squareFootage: values[0] })}
            min={50}
            max={5000}
            step={50}
          />
          <div className="text-sm text-muted-foreground">{parameters.squareFootage} sq ft</div>
        </div>

        <div className="space-y-2">
          <Label>Quality Level</Label>
          <Select
            value={parameters.quality}
            onValueChange={(value: 'basic' | 'standard' | 'premium') => 
              setParameters({ ...parameters, quality: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Timeline</Label>
          <Select
            value={parameters.timeline}
            onValueChange={(value: 'standard' | 'expedited') => 
              setParameters({ ...parameters, timeline: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="expedited">Expedited</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {estimate && (
          <div className="space-y-4 pt-4 border-t">
            <div className="text-2xl font-bold">
              ${estimate.estimate.toLocaleString()}
            </div>
            
            <div className="space-y-2">
              <Label>Cost Breakdown</Label>
              <div className="space-y-1 text-sm">
                {Object.entries(estimate.breakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key}</span>
                    <span>${value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Key Factors</Label>
              <ul className="list-disc list-inside text-sm space-y-1">
                {estimate.factors.map((factor, index) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
