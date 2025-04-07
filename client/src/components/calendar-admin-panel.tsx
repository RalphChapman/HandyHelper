import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CircleAlert, AlertCircle, CheckCircle, Calendar, RefreshCcw, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CalendarConfig {
  clientConfigured: boolean;
  clientSecretConfigured: boolean;
  refreshTokenConfigured: boolean;
  clientId: string | null;
  refreshToken: string | null;
}

interface CalendarStatus {
  hasErrors: boolean;
  needsTokenRefresh: boolean;
  lastChecked: string;
}

interface CalendarDiagnostics {
  configuration: CalendarConfig;
  status: CalendarStatus;
  regenerationHelper: {
    available: boolean;
    helperScript: string;
    instructions: string;
    webLink: string;
  };
  tips: string[];
}

// Button component for getting a new token
function GetTokenButton({ webLink }: { webLink: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  
  const getAuthUrl = async () => {
    try {
      setIsLoading(true);
      
      // Request the auth URL from our endpoint
      const response = await fetch(webLink);
      const data = await response.json();
      
      if (data.authUrl) {
        // Open the auth URL in a new window
        window.open(data.authUrl, '_blank');
      } else {
        console.error('No auth URL returned from server');
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-start">
      <Button 
        variant="default" 
        size="sm" 
        onClick={getAuthUrl} 
        disabled={isLoading}
        className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-800 mt-2"
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        {isLoading ? 'Opening Authentication...' : 'Get New Token'}
      </Button>
      <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">
        This will open Google's authentication page in a new window
      </p>
    </div>
  );
}

export function CalendarAdminPanel() {
  const [diagnostics, setDiagnostics] = useState<CalendarDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  const fetchDiagnostics = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use direct fetch to avoid apiRequest issues
      const response = await fetch('/api/calendar/diagnostics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setDiagnostics(data);
    } catch (err) {
      console.error('Error fetching calendar diagnostics:', err);
      setError('Failed to load calendar diagnostic information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showPanel) {
      fetchDiagnostics();
    }
  }, [showPanel]);

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-500' : 'text-red-500';
  };

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <CircleAlert className="w-5 h-5 text-red-500" />;
  };

  if (!showPanel) {
    return (
      <div className="mt-2">
        <Button variant="outline" size="sm" onClick={() => setShowPanel(true)}>
          <Calendar className="w-4 h-4 mr-2" />
          Calendar Admin
        </Button>
      </div>
    );
  }

  return (
    <Card className="mt-4 border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-amber-800 dark:text-amber-300">Google Calendar Admin</CardTitle>
            <CardDescription>
              Manage Google Calendar integration settings
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPanel(false)}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <div className="py-4 text-center">Loading diagnostic information...</div>}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {diagnostics && (
          <div className="space-y-4">
            <div>
              <h3 className="text-md font-medium mb-2">Calendar Configuration</h3>
              <div className="grid gap-2">
                <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.configuration.clientConfigured)}
                    <span>Client ID</span>
                  </div>
                  <span className={getStatusColor(diagnostics.configuration.clientConfigured)}>
                    {diagnostics.configuration.clientConfigured ? 'Configured' : 'Missing'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.configuration.clientSecretConfigured)}
                    <span>Client Secret</span>
                  </div>
                  <span className={getStatusColor(diagnostics.configuration.clientSecretConfigured)}>
                    {diagnostics.configuration.clientSecretConfigured ? 'Configured' : 'Missing'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.configuration.refreshTokenConfigured)}
                    <span>Refresh Token</span>
                  </div>
                  <span className={getStatusColor(diagnostics.configuration.refreshTokenConfigured)}>
                    {diagnostics.configuration.refreshTokenConfigured ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>
            </div>
            
            {diagnostics.configuration.refreshTokenConfigured && (
              <div>
                <h3 className="text-md font-medium mb-2">Token Details</h3>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono overflow-x-auto">
                  <div>Client ID: {diagnostics.configuration.clientId}</div>
                  <div>Refresh Token: {diagnostics.configuration.refreshToken}</div>
                </div>
              </div>
            )}
            
            <div>
              <h3 className="text-md font-medium mb-2">Troubleshooting</h3>
              <ul className="list-disc pl-5 space-y-1">
                {diagnostics.tips.map((tip, index) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300">{tip}</li>
                ))}
              </ul>
            </div>
            
            {/* Status section */}
            {diagnostics.status && (
              <Alert variant={diagnostics.status.hasErrors ? "destructive" : "default"}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Calendar Status</AlertTitle>
                <AlertDescription>
                  {diagnostics.status.hasErrors 
                    ? (
                      <div className="mt-2">
                        <p className="font-semibold text-red-600 dark:text-red-400">
                          There are issues with your Google Calendar integration.
                        </p>
                        {diagnostics.status.needsTokenRefresh && (
                          <p className="mt-1">
                            It appears your refresh token needs to be regenerated. 
                            Please use the button below to get a new token.
                          </p>
                        )}
                      </div>
                    ) 
                    : "Your Google Calendar integration is working correctly."}
                  <div className="text-xs mt-2 text-gray-500">
                    Last checked: {new Date(diagnostics.status.lastChecked).toLocaleString()}
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Token regeneration section */}
            <Alert className="border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Token Regeneration</AlertTitle>
              <AlertDescription>
                <p className="mt-1 mb-2">
                  Use the button below to start the Google authentication process and generate a new refresh token.
                </p>
                <GetTokenButton webLink={diagnostics.regenerationHelper.webLink} />
                
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">Advanced: Generate token via terminal</summary>
                  <div className="mt-2">
                    <p className="text-sm mb-1">Alternative method using terminal command:</p>
                    <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                      {diagnostics.regenerationHelper.helperScript}
                    </code>
                  </div>
                </details>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={fetchDiagnostics} disabled={loading}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}