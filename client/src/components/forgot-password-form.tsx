import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordValues) {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/forgot-password", {
        email: data.email,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to process request");
      }

      setResetToken(result.resetToken);

      toast({
        title: "Success",
        description: "Password reset token generated successfully.",
      });

      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Processing..." : "Get Reset Token"}
          </Button>
        </form>
      </Form>

      {resetToken && (
        <div className="rounded-lg border p-4 bg-muted/50">
          <h3 className="font-semibold mb-2">Your Password Reset Token</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Copy this token and use it in the password reset form to create a new password.
            This token will expire in 1 hour.
          </p>
          <div className="p-2 bg-background rounded border break-all">
            {resetToken}
          </div>
        </div>
      )}
    </div>
  );
}