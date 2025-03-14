import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { useLocation } from "wouter";

export default function ResetPasswordPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.includes('?') ? location.split('?')[1] : '');
  const token = params.get('token');

  // Validate token format (should be a 64-character hex string)
  const isValidToken = token && /^[a-f0-9]{64}$/.test(token);

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