import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { useLocation } from "wouter";

export default function ResetPasswordPage() {
  const [location] = useLocation();
  console.log("[ResetPassword] Current location:", location);

  // Parse token from URL
  let token = '';
  try {
    if (location.includes('?')) {
      const searchParams = new URLSearchParams(location.split('?')[1]);
      token = searchParams.get('token') || '';
      console.log("[ResetPassword] Token from URL:", token.substring(0, 8) + '...');
    }
  } catch (error) {
    console.error("[ResetPassword] Error parsing URL parameters:", error);
  }

  // Simple validation that token exists and is not empty
  const isValidToken = Boolean(token);
  console.log("[ResetPassword] Token validation:", isValidToken);

  if (!isValidToken) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This password reset link is invalid or has expired. Please request a new password reset link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={token} />
        </CardContent>
      </Card>
    </div>
  );
}