import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: ReturnType<typeof useLoginMutation>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
  registerMutation: ReturnType<typeof useRegisterMutation>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function useLoginMutation() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      try {
        console.log('Attempting login with username:', credentials.username);
        // Don't use apiRequest as it throws on !res.ok
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials)
        });
        
        // Handle the response and parse JSON
        const data = await res.json();
        
        // Check if the response is ok
        if (!res.ok) {
          throw new Error(data.message || 'Login failed');
        }
        
        return data;
      } catch (error: any) {
        console.error('Login error:', error);
        throw error;
      }
    },
    onSuccess: (user: User) => {
      console.log('Login successful:', user.username);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Success",
        description: "Successfully logged in!",
      });
    },
    onError: (error: Error) => {
      console.error('Login mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });
}

function useLogoutMutation() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      try {
        // Use direct fetch instead of apiRequest
        const res = await fetch("/api/logout", {
          method: "POST"
        });
        
        if (!res.ok) {
          throw new Error('Logout failed');
        }
      } catch (error: any) {
        console.error('Logout error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Success",
        description: "Successfully logged out!",
      });
    },
    onError: (error: Error) => {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    },
  });
}

function useRegisterMutation() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (userData: InsertUser) => {
      try {
        console.log('Attempting registration for:', userData.username);
        // Use direct fetch instead of apiRequest
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData)
        });
        
        // Handle the response and parse JSON
        const data = await res.json();
        
        // Check if the response is ok
        if (!res.ok) {
          throw new Error(data.message || 'Registration failed');
        }
        
        return data;
      } catch (error: any) {
        console.error('Registration error:', error);
        throw error;
      }
    },
    onSuccess: (user: User) => {
      console.log('Registration successful:', user.username);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Success",
        description: "Registration successful! You are now logged in.",
      });
    },
    onError: (error: Error) => {
      console.error('Registration mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Registration failed. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user");
        if (res.status === 401) return null;
        if (!res.ok) {
          throw new Error('Failed to fetch user');
        }
        return res.json();
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },
  });

  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const registerMutation = useRegisterMutation();

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}