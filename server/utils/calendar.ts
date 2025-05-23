import { google } from 'googleapis';
import type { Booking } from '@shared/schema';

// Initialize Google Calendar client
let oauth2Client: any = null;
let calendar: any = null;
let lastRefreshToken: string | null = null;

// Lazy initialization when credentials are available
export function initCalendarClient(forceReInit = false) {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
  
  // Check if we need to reinitialize due to credential changes or force flag
  const tokenChanged = refreshToken !== lastRefreshToken;
  
  if (oauth2Client && calendar && !tokenChanged && !forceReInit) {
    // We already have a client initialized with the same refresh token
    return true;
  }
  
  // Clear existing clients to ensure we use fresh credentials
  oauth2Client = null;
  calendar = null;
  
  // Log masked values to debug without exposing full credentials
  console.log('[CALENDAR] Initializing calendar client with credentials:', {
    clientId: clientId ? `${clientId.substring(0, 5)}...${clientId.substring(clientId.length - 5)}` : 'Missing',
    clientSecret: clientSecret ? 'Present' : 'Missing',
    refreshToken: refreshToken ? `${refreshToken.substring(0, 5)}...${refreshToken.substring(refreshToken.length - 5)}` : 'Missing',
    tokenChanged: tokenChanged ? 'Yes' : 'No',
    forceReInit: forceReInit ? 'Yes' : 'No'
  });
  
  if (!clientId || !clientSecret || !refreshToken) {
    console.log('[CALENDAR] Missing credentials, calendar integration disabled');
    return false;
  }
  
  try {
    oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://handypro-charleston.com/auth/google/callback' // Production URL for redirect
    );
    
    // Set refresh token and auth parameters
    oauth2Client.setCredentials({ 
      refresh_token: refreshToken,
      // Force token refresh on next API call
      expiry_date: 1 
    });
    
    // Store current refresh token for future change detection
    lastRefreshToken = refreshToken;
    
    // Add a token refresh handler to detect invalid tokens
    oauth2Client.on('tokens', (tokens: { refresh_token?: string; access_token?: string; expiry_date?: number }) => {
      console.log('[CALENDAR] Token refreshed successfully');
      if (tokens.refresh_token) {
        console.log('[CALENDAR] Received new refresh token - store this for future use!');
        // Log partially masked token for debugging
        const maskedToken = tokens.refresh_token ? 
          `${tokens.refresh_token.substring(0, 5)}...${tokens.refresh_token.substring(tokens.refresh_token.length - 5)}` : 
          'Not provided';
        console.log('[CALENDAR] New refresh token (masked):', maskedToken);
        
        // Update the environment variable with the new token
        process.env.GOOGLE_CALENDAR_REFRESH_TOKEN = tokens.refresh_token;
        lastRefreshToken = tokens.refresh_token;
        
        console.log('[CALENDAR] Updated environment with new refresh token');
      }
    });
    
    calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    console.log('[CALENDAR] Google Calendar API client initialized successfully');
    return true;
  } catch (error) {
    console.error('[CALENDAR] Failed to initialize Google Calendar client:', error);
    return false;
  }
}

export async function checkCalendarConflicts(startTime: Date, endTime: Date): Promise<boolean> {
  if (!initCalendarClient()) {
    console.log('[CALENDAR] Calendar integration not configured, skipping conflict check');
    return false;
  }

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const conflicts = response.data.items || [];
    if (conflicts.length > 0) {
      console.log(`[CALENDAR] Found ${conflicts.length} conflicting events for time slot`);
    }
    return conflicts.length > 0;
  } catch (error) {
    console.error('[CALENDAR] Error checking conflicts:', error);
    // Don't throw error, just return false to allow booking
    return false;
  }
}

export async function createCalendarEvent(booking: Booking) {
  if (!initCalendarClient()) {
    console.log('[CALENDAR] Calendar integration not configured, skipping event creation');
    return null;
  }

  try {
    console.log('[CALENDAR] Creating calendar event for booking:', booking);

    // Calculate end time (1 hour after start)
    const startTime = new Date(booking.appointmentDate);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Check for conflicts
    const hasConflict = await checkCalendarConflicts(startTime, endTime);
    if (hasConflict) {
      throw new Error('Time slot is already booked in Google Calendar');
    }

    // Get the service name if serviceId is available
    let serviceName = 'Home Service';
    try {
      // We'll add code to fetch service name if needed
    } catch (err) {
      console.log('[CALENDAR] Could not fetch service name:', err);
    }

    // Create event
    const event = {
      summary: `Service Appointment - ${booking.clientName}`,
      description: `
Client Details:
Name: ${booking.clientName}
Email: ${booking.clientEmail}
Phone: ${booking.clientPhone}
Service: ${serviceName}
Reference ID: #${booking.id}

${booking.notes ? `Additional Notes: ${booking.notes}` : ''}
      `.trim(),
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/New_York',
      },
      attendees: [
        { email: booking.clientEmail }
      ],
      sendUpdates: 'all', // Send email notifications to attendees
      // Add a color based on service type (optional)
      colorId: '1', // Blue by default, can be customized
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }  // 1 hour before
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendNotifications: true
    });

    console.log('[CALENDAR] Event created:', response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error('[CALENDAR] Error creating event:', error);
    // Don't throw error, just return null to allow booking without calendar event
    return null;
  }
}

/**
 * Get available time slots based on Google Calendar
 * @param date The date to check availability
 * @returns Array of available time slots
 */
export async function getAvailableTimeSlots(date: Date): Promise<Date[]> {
  console.log('[CALENDAR] Checking availability for date:', date.toISOString().split('T')[0]);
  
  if (!initCalendarClient()) {
    console.log('[CALENDAR] Client not initialized, returning default time slots');
    // If calendar is not configured, return default business hours
    return getDefaultTimeSlots(date);
  }
  
  // Set start and end time for the full day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  try {
    console.log('[CALENDAR] Fetching events from calendar for date range:', {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    });
    
    // Get all events for the day
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    console.log(`[CALENDAR] Found ${response.data.items?.length || 0} events for the day`);
    
    // Get busy times
    const busyTimes = (response.data.items || []).map((event: any) => ({
      start: new Date(event.start.dateTime || event.start.date),
      end: new Date(event.end.dateTime || event.end.date)
    }));
    
    // Summarize busy periods (without exposing full details)
    if (busyTimes.length > 0) {
      console.log('[CALENDAR] Busy periods:');
      busyTimes.forEach((busyTime: { start: Date; end: Date }, index: number) => {
        console.log(`  Period ${index + 1}: ${busyTime.start.toLocaleTimeString()} - ${busyTime.end.toLocaleTimeString()}`);
      });
    }
    
    // Get all possible time slots (business hours)
    const allTimeSlots = getDefaultTimeSlots(date);
    console.log(`[CALENDAR] Generated ${allTimeSlots.length} potential time slots`);
    
    // Filter out time slots that overlap with busy times
    const availableTimeSlots = allTimeSlots.filter(timeSlot => {
      // Create a 1-hour appointment window
      const appointmentEnd = new Date(timeSlot.getTime() + 60 * 60 * 1000);
      
      // Check if this time slot overlaps with any busy time
      return !busyTimes.some((busyTime: { start: Date; end: Date }) => {
        const timeSlotStart = timeSlot.getTime();
        const timeSlotEnd = appointmentEnd.getTime();
        const busyStart = busyTime.start.getTime();
        const busyEnd = busyTime.end.getTime();
        
        // Check for overlap (if either start or end time is within a busy period)
        return (
          (timeSlotStart >= busyStart && timeSlotStart < busyEnd) || // Start time is within busy period
          (timeSlotEnd > busyStart && timeSlotEnd <= busyEnd) || // End time is within busy period
          (timeSlotStart <= busyStart && timeSlotEnd >= busyEnd) // Time slot completely contains busy period
        );
      });
    });
    
    console.log(`[CALENDAR] Found ${availableTimeSlots.length} available time slots`);
    return availableTimeSlots;
    
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching available time slots:', error);
    
    // Enhanced error reporting for token issues
    if (error?.response?.data?.error === 'invalid_grant') {
      console.error('[CALENDAR] Google API returned invalid_grant error. This usually means the refresh token is expired or has been revoked.');
      console.error('[CALENDAR] Please obtain a new refresh token and update the environment variable.');
    } else if (error?.code === 401 || error?.response?.status === 401) {
      console.error('[CALENDAR] Authentication error (401). The token may be invalid or expired.');
    }
    
    // In case of error, return default time slots
    return getDefaultTimeSlots(date);
  }
}

/**
 * Get default business hours time slots
 * @param date The date for which to generate time slots
 * @returns Array of time slots during business hours
 */
function getDefaultTimeSlots(date: Date): Date[] {
  const BUSINESS_HOURS_START = 9; // 9 AM
  const BUSINESS_HOURS_END = 17; // 5 PM
  const SLOT_DURATION = 60; // 60 minutes per slot
  
  const slots: Date[] = [];
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  
  // Generate time slots for each hour during business hours
  for (let hour = BUSINESS_HOURS_START; hour < BUSINESS_HOURS_END; hour++) {
    const slot = new Date(date);
    slot.setHours(hour, 0, 0, 0);
    
    // If it's today, only include future time slots
    if (!isToday || slot > today) {
      slots.push(slot);
    }
  }
  
  return slots;
}