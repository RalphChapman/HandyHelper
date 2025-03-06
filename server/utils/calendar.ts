import { google } from 'googleapis';

// Initialize Google Calendar client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CALENDAR_CLIENT_ID,
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

export async function checkCalendarConflicts(startTime: Date, endTime: Date): Promise<boolean> {
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return (response.data.items || []).length > 0;
  } catch (error) {
    console.error('[CALENDAR] Error checking conflicts:', error);
    throw error;
  }
}

export async function createCalendarEvent(booking: any) {
  try {
    console.log('[CALENDAR] Creating calendar event for booking:', booking);

    // Calculate end time (1 hour after start)
    const startTime = new Date(booking.appointmentDate);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Check for conflicts
    const hasConflict = await checkCalendarConflicts(startTime, endTime);
    if (hasConflict) {
      throw new Error('Time slot is already booked');
    }

    // Create event
    const event = {
      summary: `Service Appointment - ${booking.clientName}`,
      description: `
Client Details:
Name: ${booking.clientName}
Email: ${booking.clientEmail}
Phone: ${booking.clientPhone}

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
        { email: booking.clientEmail },
        { email: 'chapman.ralph@gmail.com' }
      ],
      sendUpdates: 'all', // Send email notifications to attendees
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    console.log('[CALENDAR] Event created:', response.data);
    return response.data;
  } catch (error) {
    console.error('[CALENDAR] Error creating event:', error);
    throw error;
  }
}
