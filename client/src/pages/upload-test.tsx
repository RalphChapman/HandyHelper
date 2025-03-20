import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';

export default function UploadTest() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);
    setUploadedFileUrl(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('testFile', selectedFile);

      // Log the FormData contents
      console.log('Submitting file:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      });

      // Send request
      const response = await fetch('/api/upload-test', {
        method: 'POST',
        body: formData
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Error response:', errorData);
        } catch (parseError) {
          try {
            errorMessage = await response.text();
          } catch (textError) {
            console.error('Failed to parse error response');
          }
        }
        
        throw new Error(errorMessage);
      }

      // Process successful response
      const result = await response.json();
      console.log('Upload result:', result);
      
      setUploadResult(result);
      
      if (result.success && result.file?.url) {
        setUploadedFileUrl(result.file.url);
        toast({
          title: "Upload Successful",
          description: "File was successfully uploaded and saved on the server."
        });
      } else {
        toast({
          title: "Upload Issue",
          description: "File was processed but there may be issues. Check the details.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to format JSON for display
  const formatJson = (json: any) => {
    return JSON.stringify(json, null, 2);
  };

  return (
    <div className="container mx-auto py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-center mb-8">Upload Diagnostic Tool</h1>
      <p className="text-gray-600 text-center mb-8">
        This tool helps diagnose file upload issues in different environments.
        <br />
        Current environment: <span className="font-bold">{process.env.NODE_ENV || 'development'}</span>
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Test</CardTitle>
          <CardDescription>Select a file to test the upload functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="file" className="block text-sm font-medium">
                Select Image
              </label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/gif"
                className="w-full"
              />
              {selectedFile && (
                <p className="text-sm text-gray-500">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={isUploading || !selectedFile}
              className="w-full"
            >
              {isUploading ? 'Uploading...' : 'Test Upload'}
              {!isUploading && <Upload className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          {error && (
            <div className="mt-4 p-4 border border-red-300 bg-red-50 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              {uploadResult.success ? (
                <><CheckCircle className="h-5 w-5 text-green-500 mr-2" /> Upload Successful</>
              ) : (
                <><AlertCircle className="h-5 w-5 text-amber-500 mr-2" /> Upload Issues</>
              )}
            </CardTitle>
            <CardDescription>
              {uploadResult.success 
                ? 'The file was successfully uploaded and verified on the server' 
                : 'The file was uploaded but there may be issues'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadedFileUrl && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">Uploaded Image:</h3>
                <div className="border rounded-lg overflow-hidden mb-2 p-2 bg-gray-50">
                  <img 
                    src={uploadedFileUrl} 
                    alt="Uploaded file" 
                    className="max-h-64 mx-auto"
                    onError={() => {
                      toast({
                        title: "Image Load Error",
                        description: "Could not load the uploaded image. The URL might be incorrect.",
                        variant: "destructive"
                      });
                    }}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Image URL: <code className="bg-gray-100 p-1 rounded">{uploadedFileUrl}</code>
                </p>
              </div>
            )}
            
            <h3 className="font-medium mb-2">Server Response:</h3>
            <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto text-xs max-h-96">
              {formatJson(uploadResult)}
            </pre>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-gray-500">
              This diagnostic information can help identify issues with file uploads.
            </p>
          </CardFooter>
        </Card>
      )}

      <div className="mt-8 border-t pt-6">
        <h2 className="text-xl font-bold mb-4">Debugging Instructions</h2>
        <div className="space-y-2">
          <p>If uploads are failing, check:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Server has proper write permissions to the uploads directory</li>
            <li>The uploads directory exists in the expected location</li>
            <li>Network path is correctly configured for uploads in production</li>
            <li>Content Security Policy (CSP) allows loading images from your domain</li>
            <li>The file size is under the limit (10MB)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}