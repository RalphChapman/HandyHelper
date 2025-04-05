import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import type { Supply } from "@shared/schema";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

// Form schema for creating a new supply
const supplyFormSchema = z.object({
  clientName: z.string().min(2, { message: "Client name is required" }),
  description: z.string().min(3, { message: "Description is required" }),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
  totalPrice: z.coerce.number().positive(),
  purchaseDate: z.string(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type SupplyFormValues = z.infer<typeof supplyFormSchema>;

export default function SuppliesPage() {
  const [filterClient, setFilterClient] = useState("");
  const [isAddSupplyOpen, setIsAddSupplyOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form setup
  const form = useForm<SupplyFormValues>({
    resolver: zodResolver(supplyFormSchema),
    defaultValues: {
      clientName: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      purchaseDate: new Date().toISOString().split("T")[0],
      invoiceNumber: "",
      notes: "",
    },
  });

  // Watch quantity and unit price to calculate total price
  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unitPrice");

  // Update total price when quantity or unit price changes
  form.setValue("totalPrice", quantity * unitPrice);

  // Query supplies
  const { data: supplies, isLoading } = useQuery<Supply[]>({
    queryKey: ["/api/supplies"],
    throwOnError: false,
  });

  // Query filtered supplies
  const { data: filteredSupplies, isLoading: isLoadingFiltered } = useQuery<Supply[]>({
    queryKey: ["/api/supplies/client", filterClient],
    queryFn: () => apiRequest<Supply[]>(`/api/supplies/client/${encodeURIComponent(filterClient)}`),
    enabled: !!filterClient,
    throwOnError: false,
  });

  // Create supply mutation
  const createSupplyMutation = useMutation({
    mutationFn: (data: SupplyFormValues) => {
      return apiRequest<Supply>("/api/supplies", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Supply added",
        description: "The supply has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/supplies"] });
      if (filterClient) {
        queryClient.invalidateQueries({ queryKey: ["/api/supplies/client", filterClient] });
      }
      setIsAddSupplyOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add supply: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update payment status mutation
  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ id, paid, paymentMethod }: { id: number; paid: boolean; paymentMethod?: string }) => {
      return apiRequest<Supply>(`/api/supplies/${id}/payment`, {
        method: "PATCH",
        body: JSON.stringify({ paid, paymentMethod }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Payment status updated",
        description: "The payment status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/supplies"] });
      if (filterClient) {
        queryClient.invalidateQueries({ queryKey: ["/api/supplies/client", filterClient] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update payment status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form submission
  function onSubmit(data: SupplyFormValues) {
    createSupplyMutation.mutate(data);
  }

  // Handle marking as paid
  function handleMarkAsPaid(supply: Supply) {
    updatePaymentStatusMutation.mutate({
      id: supply.id,
      paid: true,
      paymentMethod: "Credit Card",
    });
  }

  // Handle marking as unpaid
  function handleMarkAsUnpaid(supply: Supply) {
    updatePaymentStatusMutation.mutate({
      id: supply.id,
      paid: false,
    });
  }

  // Get display data
  const displaySupplies = filterClient && filteredSupplies ? filteredSupplies : supplies;
  const displayLoading = filterClient ? isLoadingFiltered : isLoading;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Customer Supplies Management</h1>
      
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex gap-4 flex-wrap">
          <Input
            className="max-w-xs"
            placeholder="Filter by client name"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          />
          {filterClient && (
            <Button variant="outline" onClick={() => setFilterClient("")}>
              Clear Filter
            </Button>
          )}
        </div>
        <Button onClick={() => setIsAddSupplyOpen(true)}>Add New Supply</Button>
      </div>

      {displayLoading ? (
        <div className="text-center py-8">Loading supplies...</div>
      ) : displaySupplies && displaySupplies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displaySupplies.map((supply: Supply) => (
            <Card key={supply.id} className="h-full flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{supply.description}</CardTitle>
                    <CardDescription>Client: {supply.clientName}</CardDescription>
                  </div>
                  <Badge variant={supply.paid ? "default" : "outline"}>
                    {supply.paid ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Quantity:</span>
                    <span>{supply.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Unit Price:</span>
                    <span>${parseFloat(supply.unitPrice.toString()).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Price:</span>
                    <span>${parseFloat(supply.totalPrice.toString()).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Purchase Date:</span>
                    <span>{format(new Date(supply.purchaseDate), "MMM d, yyyy")}</span>
                  </div>
                  {supply.invoiceNumber && (
                    <div className="flex justify-between">
                      <span className="font-medium">Invoice:</span>
                      <span>{supply.invoiceNumber}</span>
                    </div>
                  )}
                  {supply.paid && (
                    <>
                      <div className="flex justify-between">
                        <span className="font-medium">Payment Date:</span>
                        <span>{format(new Date(supply.paymentDate!), "MMM d, yyyy")}</span>
                      </div>
                      {supply.paymentMethod && (
                        <div className="flex justify-between">
                          <span className="font-medium">Payment Method:</span>
                          <span>{supply.paymentMethod}</span>
                        </div>
                      )}
                    </>
                  )}
                  {supply.notes && (
                    <div>
                      <span className="font-medium">Notes:</span>
                      <p className="text-sm mt-1">{supply.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                {!supply.paid ? (
                  <Button 
                    className="w-full" 
                    onClick={() => handleMarkAsPaid(supply)}
                    disabled={updatePaymentStatusMutation.isPending}
                  >
                    Mark as Paid
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    variant="outline" 
                    onClick={() => handleMarkAsUnpaid(supply)}
                    disabled={updatePaymentStatusMutation.isPending}
                  >
                    Mark as Unpaid
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {filterClient
              ? `No supplies found for client "${filterClient}"`
              : "No supplies found. Start by adding your first supply."}
          </p>
        </div>
      )}

      {/* Add Supply Dialog */}
      <Dialog open={isAddSupplyOpen} onOpenChange={setIsAddSupplyOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Supply</DialogTitle>
            <DialogDescription>
              Add details about a supply purchased for a client.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Unit Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="totalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" readOnly {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddSupplyOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSupplyMutation.isPending}
                >
                  {createSupplyMutation.isPending ? "Adding..." : "Add Supply"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}