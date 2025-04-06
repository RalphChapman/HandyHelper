/**
 * Google Calendar Refresh Token Helper
 * 
 * This script helps generate a new refresh token for Google Calendar API integration.
 * 
 * Steps:
 * 1. Set your Google API credentials in the environment variables
 * 2. Run this script: npx tsx server/utils/refresh-token-helper.ts
 * 3. Follow the instructions printed to the console
 * 4. Set the new refresh token in your GOOGLE_CALENDAR_REFRESH_TOKEN environment variable
 */

import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import open from 'open';

// Read credentials from environment variables
const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

// Validation
if (!clientId || !clientSecret) {
  console.error('ERROR: Missing required environment variables:');
  if (!clientId) console.error('- GOOGLE_CALENDAR_CLIENT_ID');
  if (!clientSecret) console.error('- GOOGLE_CALENDAR_CLIENT_SECRET');
  console.error('\nPlease set these variables and try again.');
  process.exit(1);
}

// Configure OAuth client
const redirectUri = 'http://localhost:3000/auth/google/callback';
const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri
);

// Server to handle the OAuth callback
const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url!, true);
    const { pathname, query } = parsedUrl;
    
    if (pathname === '/auth/google/callback') {
      // Get the authorization code
      const code = query.code as string;
      
      if (code) {
        // Exchange the code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        
        // Display the tokens
        console.log('\n==================================================');
        console.log('AUTHENTICATION SUCCESSFUL!');
        console.log('==================================================');
        
        if (tokens.refresh_token) {
          console.log('\nHere is your refresh token:');
          console.log('--------------------------------------------------');
          console.log(tokens.refresh_token);
          console.log('--------------------------------------------------');
          console.log('\nAdd this to your environment variables as:');
          console.log('GOOGLE_CALENDAR_REFRESH_TOKEN=<the-token-above>\n');
          
          // Reminder about keeping the token secure
          console.log('IMPORTANT: Keep this token secure! It provides access to your Google Calendar.');
        } else {
          console.log('\nNO REFRESH TOKEN RECEIVED!');
          console.log('This can happen if your Google account has already generated a refresh token for this application.');
          console.log('To force a new refresh token, you must first revoke access:');
          console.log('1. Go to https://myaccount.google.com/permissions');
          console.log('2. Find and remove access for your application');
          console.log('3. Run this script again\n');
        }
        
        // Return success response
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head><title>Google Calendar Authentication</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #4285f4;">Authentication Complete!</h1>
              ${tokens.refresh_token 
                ? '<p>✅ Successfully generated a refresh token!</p><p>Please check your terminal for the token and next steps.</p>' 
                : '<p>⚠️ No refresh token was generated. Please check your terminal for instructions.</p>'}
              <p>You can close this window now.</p>
            </body>
          </html>
        `);
        
        // Close the server after a short delay
        setTimeout(() => {
          server.close();
          console.log('Closing helper server...');
          process.exit(0);
        }, 3000);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Error: No authorization code received</h1></body></html>');
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  } catch (error) {
    console.error('Error handling request:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error');
  }
});

// Start the local server
server.listen(3000, () => {
  console.log('\n==================================================');
  console.log('GOOGLE CALENDAR REFRESH TOKEN HELPER');
  console.log('==================================================');
  console.log('\nLocal server started at http://localhost:3000');
  
  // Generate the authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent'  // Force consent screen to always appear, ensuring refresh token is generated
  });
  
  console.log('\nFollow these steps:');
  console.log('1. Click the link below or copy it to your browser:');
  console.log('--------------------------------------------------');
  console.log(authUrl);
  console.log('--------------------------------------------------');
  console.log('2. Sign in with your Google account');
  console.log('3. Grant the requested permissions\n');
  
  // Try to open the browser automatically
  try {
    open(authUrl);
    console.log('Opening browser automatically...');
  } catch (error) {
    console.log('Could not open browser automatically. Please copy the URL above and open it manually.');
  }
});