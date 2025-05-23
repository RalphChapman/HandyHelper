import nodemailer from "nodemailer";
import { analyzeProjectDescription } from "./grok";

const createTransporter = () => {
  try {
    if (!process.env.EMAIL_APP_PASSWORD) {
      throw new Error("EMAIL_APP_PASSWORD environment variable must be set");
    }

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "chapman.ralph@gmail.com", // Keep this as the primary email for SMTP auth
        pass: process.env.EMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } catch (error) {
    console.error("[EMAIL] Failed to create transporter:", error);
    throw error;
  }
};

const transporter = createTransporter();

const sendQuoteNotification = async (quoteRequest: any) => {
  console.log("[EMAIL] Sending quote notification with data:", {
    ...quoteRequest,
    email: quoteRequest.email,
    serviceName: quoteRequest.serviceName,
    description: quoteRequest.description
  });

  // Get AI analysis of the project
  let aiAnalysis = "AI analysis not available";
  try {
    aiAnalysis = await analyzeProjectDescription(quoteRequest.description);
  } catch (error) {
    console.error("Failed to get AI analysis:", error);
  }

  const serviceInfo = `Service Requested: ${quoteRequest.serviceName}`;
  // Determine recipient list - don't include customer email if it's not provided
  const recipientList = quoteRequest.email 
    ? [quoteRequest.email, "chapman.ralph@gmail.com", "ralph.chapman2024@gmail.com"] 
    : ["chapman.ralph@gmail.com", "ralph.chapman2024@gmail.com"];
    
  console.log("[EMAIL] Recipients:", recipientList);
    
  const message = {
    from: '"HandyPro Service" <chapman.ralph@gmail.com>',
    to: recipientList.join(", "),
    subject: "New Quote Request",
    text: `
New quote request received:

Name: ${quoteRequest.name}
${quoteRequest.email ? `Email: ${quoteRequest.email}` : ''}
${quoteRequest.phone ? `Phone: ${quoteRequest.phone}` : ''}
${serviceInfo}
Address: ${quoteRequest.address}

Project Description:
${quoteRequest.description}

Professional Analysis:
${aiAnalysis.split('\n').map(line => {
  // For text emails, we'll keep the formatting simpler but still clear
  if (line.match(/cost considerations|pricing|budget|payment/i)) {
    return `\n${line.toUpperCase()}`;
  } 
  else if (line.match(/estimated cost range|price range|typical pricing|cost estimate|approximate cost|expected price/i)) {
    return `\n>> ${line} <<`;
  }
  else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
    return `  • ${line.substring(1).trim()}`;
  }
  else {
    return line;
  }
}).join('\n')}

Visit our website: https://handyhelper.replit.app/

Contact Information:
Ralph Chapman
Phone: (864) 361-3730
Email: chapman.ralph@gmail.com, ralph.chapman2024@gmail.com
LinkedIn: linkedin.com/in/ralph-chapman

Best regards,
HandyPro Service Team
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; margin-bottom: 24px;">New Quote Request</h2>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="color: #1e293b; margin-bottom: 16px;">Customer Information</h3>
          <p style="margin: 8px 0;"><strong>Name:</strong> ${quoteRequest.name}</p>
          ${quoteRequest.email ? `<p style="margin: 8px 0;"><strong>Email:</strong> ${quoteRequest.email}</p>` : ''}
          ${quoteRequest.phone ? `<p style="margin: 8px 0;"><strong>Phone:</strong> ${quoteRequest.phone}</p>` : ''}
          <p style="margin: 8px 0;"><strong>${serviceInfo}</strong></p>
          <p style="margin: 8px 0;"><strong>Address:</strong> ${quoteRequest.address}</p>
        </div>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="color: #1e293b; margin-bottom: 16px;">Project Description</h3>
          <p style="line-height: 1.6; white-space: pre-wrap;">${quoteRequest.description}</p>
        </div>

        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="color: #1e293b; margin-bottom: 16px;">Professional Analysis</h3>
          <div style="line-height: 1.6; white-space: pre-wrap;">
            ${aiAnalysis.split('\n').map(line => {
              // Check for cost sections
              if (line.match(/cost considerations|pricing|budget|payment/i)) {
                return `<p style="margin: 16px 0 8px 0; font-size: 18px; font-weight: 600; color: #92400e;">${line}</p>`;
              } 
              // Check for cost range mentions
              else if (line.match(/estimated cost range|price range|typical pricing|cost estimate|approximate cost|expected price/i)) {
                // Highlight any dollar amounts in the line
                const highlightedLine = line.replace(/(\$[\d,]+(?:\s*-\s*\$[\d,]+)?|\$[\d,]+(?:\.\d+)?)/g, 
                  '<strong style="color: #15803d;">$1</strong>');
                
                return `<p style="margin: 8px 0; font-weight: 600; background-color: #fef3c7; padding: 8px 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">${highlightedLine}</p>`;
              } 
              // Regular lines with dollar amounts get subtle highlighting
              else if (line.match(/\$[\d,]+/)) {
                const highlightedLine = line.replace(/(\$[\d,]+(?:\s*-\s*\$[\d,]+)?|\$[\d,]+(?:\.\d+)?)/g, 
                  '<strong style="color: #15803d;">$1</strong>');
                
                return `<p style="margin: 8px 0;">${highlightedLine}</p>`;
              } 
              // Bullet points
              else if (line.trim().startsWith('-')) {
                return `<p style="margin: 4px 0 4px 20px;">• ${line.substring(1)}</p>`;
              }
              else if (line.trim().startsWith('*')) {
                return `<p style="margin: 4px 0 4px 20px;">• ${line.substring(1)}</p>`;
              }
              else {
                return `<p style="margin: 8px 0;">${line}</p>`;
              }
            }).join('')}
          </div>
        </div>

        <!-- Digital Business Card Section -->
        <div style="margin-top: 24px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: white;">
          <h3 style="color: #1e293b; margin-bottom: 16px;">Your Professional Handyman</h3>

          <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 250px;">
              <h4 style="color: #2563eb; margin: 0 0 16px 0;">Ralph Chapman</h4>

              <div style="margin-bottom: 16px;">
                <p style="margin: 8px 0; display: flex; align-items: center;">
                  <span style="color: #64748b; margin-right: 8px;">📞</span>
                  <a href="tel:(864) 361-3730" style="color: #2563eb; text-decoration: none;">(864) 361-3730</a>
                </p>

                <p style="margin: 8px 0; display: flex; align-items: center;">
                  <span style="color: #64748b; margin-right: 8px;">✉️</span>
                  <a href="mailto:chapman.ralph@gmail.com,ralph.chapman2024@gmail.com" style="color: #2563eb; text-decoration: none;">chapman.ralph@gmail.com, ralph.chapman2024@gmail.com</a>
                </p>

                <p style="margin: 8px 0; display: flex; align-items: center;">
                  <span style="color: #64748b; margin-right: 8px;">🔗</span>
                  <a href="https://linkedin.com/in/ralph-chapman" style="color: #2563eb; text-decoration: none;">linkedin.com/in/ralph-chapman</a>
                </p>

                <p style="margin: 8px 0; display: flex; align-items: center;">
                  <span style="color: #64748b; margin-right: 8px;">🌐</span>
                  <a href="https://handyhelper.replit.app" style="color: #2563eb; text-decoration: none;">handyhelper.replit.app</a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top: 24px; color: #64748b; text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 4px 0;">Best regards,</p>
          <p style="margin: 4px 0;">HandyPro Service Team</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.verify();
    console.log("[EMAIL] Attempting to send email to:", message.to);
    
    // We found that modified subject lines helps with delivery to secondary email
    // So let's permanently update the main message subject
    message.subject = "[HandyPro] " + message.subject;
    
    console.log("[EMAIL] Updated subject line to help with deliverability:", message.subject);
    
    // Now send the original message
    const result = await transporter.sendMail(message);
    console.log("[EMAIL] Email sent successfully");
    return result;
  } catch (error) {
    console.error("[EMAIL] Failed to send email:", error);
    throw error;
  }
};

const sendBookingConfirmation = async (booking: any) => {
  // Check if we have a calendar event
  const hasCalendarEvent = booking.calendarEvent && booking.calendarEvent.htmlLink;
  const appointmentDate = new Date(booking.appointmentDate);
  const formattedDate = appointmentDate.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const message = {
    from: '"HandyPro Service" <chapman.ralph@gmail.com>',
    to: [booking.clientEmail, "chapman.ralph@gmail.com", "ralph.chapman2024@gmail.com"].join(", "),
    subject: "Booking Confirmation - HandyPro Service",
    text: `
Thank you for your booking!

Booking Details:
Name: ${booking.clientName}
Email: ${booking.clientEmail}
Phone: ${booking.clientPhone}
Appointment Date: ${formattedDate}
${booking.notes ? `\nAdditional Notes: ${booking.notes}` : ''}
${hasCalendarEvent ? `\nThis appointment has been added to our calendar. You should receive a calendar invitation shortly.` : ''}

We will review your booking and confirm the appointment shortly.

Best regards,
HandyPro Service Team
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; margin-bottom: 24px;">Thank you for your booking!</h2>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="color: #1e293b; margin-bottom: 16px;">Booking Details</h3>
          <p style="margin: 8px 0;"><strong>Name:</strong> ${booking.clientName}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${booking.clientEmail}</p>
          <p style="margin: 8px 0;"><strong>Phone:</strong> ${booking.clientPhone}</p>
          <p style="margin: 8px 0;"><strong>Appointment Date:</strong> ${formattedDate}</p>
          ${booking.notes ? `<p style="margin: 8px 0;"><strong>Additional Notes:</strong> ${booking.notes}</p>` : ''}
        </div>

        ${hasCalendarEvent ? `
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #10b981;">
          <h3 style="color: #047857; margin-top: 0; margin-bottom: 16px;">📅 Calendar Appointment Created</h3>
          <p style="margin: 0 0 16px 0;">This appointment has been added to our calendar. You should receive a calendar invitation in your email shortly.</p>
          <a href="${booking.calendarEvent.htmlLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 10px 16px; border-radius: 4px; text-decoration: none; font-weight: bold;">View in Google Calendar</a>
        </div>
        ` : `
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0;">We will review your booking and confirm the appointment shortly. If you need to make any changes or have questions, please contact us.</p>
        </div>
        `}

        <!-- Digital Business Card Section -->
        <div style="margin-top: 24px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: white;">
          <h3 style="color: #1e293b; margin-bottom: 16px;">Your Professional Handyman</h3>

          <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 250px;">
              <h4 style="color: #2563eb; margin: 0 0 16px 0;">Ralph Chapman</h4>

              <div style="margin-bottom: 16px;">
                <p style="margin: 8px 0; display: flex; align-items: center;">
                  <span style="color: #64748b; margin-right: 8px;">📞</span>
                  <a href="tel:(864) 361-3730" style="color: #2563eb; text-decoration: none;">(864) 361-3730</a>
                </p>

                <p style="margin: 8px 0; display: flex; align-items: center;">
                  <span style="color: #64748b; margin-right: 8px;">✉️</span>
                  <a href="mailto:chapman.ralph@gmail.com,ralph.chapman2024@gmail.com" style="color: #2563eb; text-decoration: none;">chapman.ralph@gmail.com, ralph.chapman2024@gmail.com</a>
                </p>

                <p style="margin: 8px 0; display: flex; align-items: center;">
                  <span style="color: #64748b; margin-right: 8px;">🔗</span>
                  <a href="https://linkedin.com/in/ralph-chapman" style="color: #2563eb; text-decoration: none;">linkedin.com/in/ralph-chapman</a>
                </p>

                <p style="margin: 8px 0; display: flex; align-items: center;">
                  <span style="color: #64748b; margin-right: 8px;">🌐</span>
                  <a href="https://handyhelper.replit.app" style="color: #2563eb; text-decoration: none;">handyhelper.replit.app</a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top: 24px; color: #64748b; text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 4px 0;">Best regards,</p>
          <p style="margin: 4px 0;">HandyPro Service Team</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.verify();
    
    // Add consistent prefix to subject line to help with deliverability
    message.subject = "[HandyPro] " + message.subject;
    console.log("[EMAIL] Attempting to send booking email to:", message.to);
    console.log("[EMAIL] Updated subject line to help with deliverability:", message.subject);
    
    const result = await transporter.sendMail(message);
    console.log("[EMAIL] Booking email sent successfully");
    return result;
  } catch (error) {
    console.error("[EMAIL] Failed to send booking confirmation:", error);
    throw error;
  }
};

const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  console.log("[EMAIL] Initiating password reset email to:", email);

  try {
    // Generate reset link
    const encodedToken = encodeURIComponent(resetToken);
    const baseUrl = process.env.VITE_APP_URL || 'https://handyhelper.replit.app';
    const resetLink = `${baseUrl}/reset-password?token=${encodedToken}`;

    console.log("[EMAIL] Generated reset link:", resetLink);

    const message = {
      from: '"HandyPro Service" <chapman.ralph@gmail.com>',
      to: [email, "chapman.ralph@gmail.com", "ralph.chapman2024@gmail.com"].join(", "),
      subject: "Password Reset Request",
      text: `
Hello,

You recently requested to reset your password for your HandyPro Service account. Click the link below to reset it:

${resetLink}

If you did not request a password reset, please ignore this email or contact us if you have concerns.

This password reset link is only valid for 1 hour.

Best regards,
HandyPro Service Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; margin-bottom: 24px;">Password Reset Request</h2>
          <p style="margin-bottom: 16px;">Hello,</p>

          <p style="margin-bottom: 16px;">You recently requested to reset your password for your HandyPro Service account. Click the button below to reset it:</p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Your Password
            </a>
          </div>

          <p style="margin-bottom: 16px; color: #64748b;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="margin-bottom: 16px; word-break: break-all; color: #2563eb;">
            ${resetLink}
          </p>

          <p style="margin-bottom: 16px; color: #64748b;">If you did not request a password reset, please ignore this email or contact us if you have concerns.</p>

          <p style="margin-bottom: 16px; color: #64748b;">This password reset link is only valid for 1 hour.</p>

          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 4px 0; color: #64748b;">Best regards,</p>
            <p style="margin: 4px 0; color: #64748b;">HandyPro Service Team</p>
          </div>
        </div>
      `
    };

    // Add consistent prefix to subject line to help with deliverability
    message.subject = "[HandyPro] " + message.subject;
    console.log("[EMAIL] Attempting to send password reset email to:", message.to);
    console.log("[EMAIL] Updated subject line to help with deliverability:", message.subject);
    
    const result = await transporter.sendMail(message);
    console.log("[EMAIL] Password reset email sent successfully");
    return result;
  } catch (error) {
    console.error("[EMAIL] Failed to send password reset email:", error);
    throw error;
  }
};

// Test function to diagnose email sending issues
const testEmailSending = async () => {
  console.log("[EMAIL] Running diagnostic test email");
  
  try {
    await transporter.verify();
    console.log("[EMAIL] SMTP connection verified successfully");
    
    // Test 1: Direct email to both addresses (comma separated)
    const test1 = {
      from: '"HandyPro Service Test" <chapman.ralph@gmail.com>',
      to: "chapman.ralph@gmail.com, ralph.chapman2024@gmail.com",
      subject: "Email Test 1 - Direct comma-separated",
      text: "This is a test email to debug email delivery issues. Test type: Direct comma-separated recipients."
    };
    
    // Test 2: Array joined with comma
    const recipientsList = ["chapman.ralph@gmail.com", "ralph.chapman2024@gmail.com"];
    const test2 = {
      from: '"HandyPro Service Test" <chapman.ralph@gmail.com>',
      to: recipientsList.join(", "),
      subject: "Email Test 2 - Array join",
      text: "This is a test email to debug email delivery issues. Test type: Array joined with comma."
    };
    
    // Test 3: Individual emails
    const test3a = {
      from: '"HandyPro Service Test" <chapman.ralph@gmail.com>',
      to: "chapman.ralph@gmail.com",
      subject: "Email Test 3A - Primary email only",
      text: "This is a test email to debug email delivery issues. Test type: Primary email only."
    };
    
    const test3b = {
      from: '"HandyPro Service Test" <chapman.ralph@gmail.com>',
      to: "ralph.chapman2024@gmail.com",
      subject: "Email Test 3B - Secondary email only",
      text: "This is a test email to debug email delivery issues. Test type: Secondary email only."
    };
    
    console.log("[EMAIL] Sending test email 1 (Direct comma)");
    await transporter.sendMail(test1);
    console.log("[EMAIL] Test 1 sent successfully");
    
    console.log("[EMAIL] Sending test email 2 (Array join)");
    await transporter.sendMail(test2);
    console.log("[EMAIL] Test 2 sent successfully");
    
    console.log("[EMAIL] Sending test email 3A (Primary only)");
    await transporter.sendMail(test3a);
    console.log("[EMAIL] Test 3A sent successfully");
    
    console.log("[EMAIL] Sending test email 3B (Secondary only)");
    await transporter.sendMail(test3b);
    console.log("[EMAIL] Test 3B sent successfully");
    
    console.log("[EMAIL] All test emails sent successfully");
    return true;
  } catch (error) {
    console.error("[EMAIL] Test email failed:", error);
    return false;
  }
};

export { sendPasswordResetEmail, sendQuoteNotification, sendBookingConfirmation, testEmailSending };