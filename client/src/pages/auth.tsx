import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Wrench, Shield, Clock } from "lucide-react";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { SiGoogle } from 'react-icons/si';
import { signInWithGoogle } from "@/lib/firebase";

const authSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address"),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, loginMutation, registerMutation } = useAuth();

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const loginForm = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema.omit({ email: true })),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  async function onLogin(data: AuthFormValues) {
    try {
      await loginMutation.mutateAsync(data);
      setLocation("/");
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  async function onRegister(data: AuthFormValues) {
    try {
      await registerMutation.mutateAsync({
        ...data,
        role: "user" // Add default role
      });
      setLocation("/");
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      setLocation("/");
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Failed to sign in with Google. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          {/* Left Column - Auth Forms */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">
                  Welcome to HandyPro Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <div className="space-y-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleGoogleSignIn}
                      >
                        <SiGoogle className="h-4 w-4" />
                        Sign in with Google
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Or continue with
                          </span>
                        </div>
                      </div>

                      <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                          <FormField
                            control={loginForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex items-center justify-between">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="link" className="px-0">Forgot Password?</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reset Your Password</DialogTitle>
                                </DialogHeader>
                                <ForgotPasswordForm />
                              </DialogContent>
                            </Dialog>

                            <Button
                              type="submit"
                              className="w-32"
                              disabled={loginMutation.isPending}
                            >
                              {loginMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Logging in...
                                </>
                              ) : (
                                'Login'
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  </TabsContent>

                  <TabsContent value="register">
                    <div className="space-y-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleGoogleSignIn}
                      >
                        <SiGoogle className="h-4 w-4" />
                        Sign up with Google
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Or continue with
                          </span>
                        </div>
                      </div>

                      <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                          <FormField
                            control={registerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
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

                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="submit"
                            className="w-full"
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating account...
                              </>
                            ) : (
                              'Register'
                            )}
                          </Button>
                        </form>
                      </Form>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Hero Section */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Your Trusted Home Service Partner
              </h1>
              <p className="text-lg text-gray-600">
                Join HandyPro Services for reliable, professional home improvement and maintenance services.
              </p>
            </div>

            <div className="grid gap-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wrench className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Expert Services</h3>
                  <p className="text-gray-600">Access a wide range of professional home improvement services.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Verified Professionals</h3>
                  <p className="text-gray-600">All our service providers are thoroughly vetted and qualified.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Convenient Booking</h3>
                  <p className="text-gray-600">Easy scheduling and real-time updates on your service requests.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}