import nodemailer from "nodemailer";
import { analyzeProjectDescription } from "./grok";

if (!process.env.EMAIL_APP_PASSWORD) {
  throw new Error("EMAIL_APP_PASSWORD environment variable must be set");
}

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "chapman.ralph@gmail.com",
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Verify transporter connection
transporter.verify(function(error, success) {
  if (error) {
    console.error("[EMAIL] SMTP Connection Error:", error);
  } else {
    console.log("[EMAIL] Server is ready to send messages");
  }
});

export async function sendQuoteNotification(quoteRequest: any) {
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

  const message = {
    from: '"HandyPro Service" <chapman.ralph@gmail.com>',
    to: [quoteRequest.email, "chapman.ralph@gmail.com"].join(", "),
    subject: "New Quote Request",
    text: `
New quote request received:

Name: ${quoteRequest.name}
Email: ${quoteRequest.email}
Phone: ${quoteRequest.phone}
${serviceInfo}
Address: ${quoteRequest.address}

Project Description:
${quoteRequest.description}

AI Analysis:
${aiAnalysis}

Visit our website: https://handyhelper.replit.app/

Contact Information:
Ralph Chapman
Phone: (864) 361-3730
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; margin-bottom: 24px;">New Quote Request</h2>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="color: #1e293b; margin-bottom: 16px;">Customer Information</h3>
          <p style="margin: 8px 0;"><strong>Name:</strong> ${quoteRequest.name}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${quoteRequest.email}</p>
          <p style="margin: 8px 0;"><strong>Phone:</strong> ${quoteRequest.phone}</p>
          <p style="margin: 8px 0;"><strong>${serviceInfo}</strong></p>
          <p style="margin: 8px 0;"><strong>Address:</strong> ${quoteRequest.address}</p>
        </div>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="color: #1e293b; margin-bottom: 16px;">Project Description</h3>
          <p style="line-height: 1.6; white-space: pre-wrap;">${quoteRequest.description}</p>
        </div>

        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="color: #1e293b; margin-bottom: 16px;">Professional Analysis</h3>
          <div style="line-height: 1.6; white-space: pre-wrap;">${aiAnalysis.split('\n').map(line => 
            line.trim().startsWith('-') ? 
              `<p style="margin: 4px 0 4px 20px;">• ${line.substring(1)}</p>` : 
              line.trim().startsWith('*') ? 
                `<p style="margin: 4px 0 4px 20px;">• ${line.substring(1)}</p>` :
                `<p style="margin: 8px 0;">${line}</p>`
          ).join('')}</div>
        </div>

        <div style="margin-top: 24px; padding: 20px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 8px 0;"><strong>Visit our website:</strong> <a href="https://handyhelper.replit.app/" style="color: #2563eb;">https://handyhelper.replit.app/</a></p>
          <div style="margin-top: 16px;">
            <h4 style="color: #1e293b; margin-bottom: 8px;">Contact Information:</h4>
            <p style="margin: 4px 0;">Ralph Chapman</p>
            <p style="margin: 4px 0;">Phone: (864) 361-3730</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    // Verify connection before sending
    await transporter.verify();
    console.log("[EMAIL] Attempting to send email to:", message.to);
    const result = await transporter.sendMail(message);
    console.log("[EMAIL] Email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("[EMAIL] Failed to send email:", error);
    throw error;
  }
}

export async function sendBookingConfirmation(booking: any) {
  console.log("[EMAIL] Sending booking confirmation with data:", {
    ...booking,
    clientEmail: booking.clientEmail,
    clientName: booking.clientName
  });

  const message = {
    from: '"HandyPro Service" <chapman.ralph@gmail.com>',
    to: [booking.clientEmail, "chapman.ralph@gmail.com"].join(", "),
    subject: "Booking Confirmation",
    text: `
Thank you for your booking!

Booking Details:
Name: ${booking.clientName}
Email: ${booking.clientEmail}
Phone: ${booking.clientPhone}
Appointment Date: ${new Date(booking.appointmentDate).toLocaleString()}
${booking.notes ? `\nAdditional Notes: ${booking.notes}` : ''}

We will review your booking and confirm the appointment shortly. If you need to make any changes or have questions, please contact us:

Ralph Chapman
Phone: (864) 361-3730
Website: https://handyhelper.replit.app/

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
          <p style="margin: 8px 0;"><strong>Appointment Date:</strong> ${new Date(booking.appointmentDate).toLocaleString()}</p>
          ${booking.notes ? `<p style="margin: 8px 0;"><strong>Additional Notes:</strong> ${booking.notes}</p>` : ''}
        </div>

        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px;">
          <p style="margin: 0;">We will review your booking and confirm the appointment shortly. If you need to make any changes or have questions, please contact us.</p>
        </div>

        <div style="margin-top: 24px; padding: 20px; border-top: 1px solid #e2e8f0;">
          <h4 style="color: #1e293b; margin-bottom: 8px;">Contact Information:</h4>
          <p style="margin: 4px 0;">Ralph Chapman</p>
          <p style="margin: 4px 0;">Phone: (864) 361-3730</p>
          <p style="margin: 8px 0;"><strong>Visit our website:</strong> <a href="https://handyhelper.replit.app/" style="color: #2563eb;">https://handyhelper.replit.app/</a></p>
        </div>

        <div style="margin-top: 24px; color: #64748b;">
          <p style="margin: 4px 0;">Best regards,</p>
          <p style="margin: 4px 0;">HandyPro Service Team</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.verify();
    console.log("[EMAIL] Attempting to send booking confirmation to:", message.to);
    const result = await transporter.sendMail(message);
    console.log("[EMAIL] Booking confirmation sent successfully:", result);
    return result;
  } catch (error) {
    console.error("[EMAIL] Failed to send booking confirmation:", error);
    throw error;
  }
}