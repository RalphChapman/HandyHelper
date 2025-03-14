import nodemailer from "nodemailer";
import { analyzeProjectDescription } from "./grok";

// Create reusable transporter with better error handling
const createTransporter = () => {
  try {
    if (!process.env.EMAIL_APP_PASSWORD) {
      throw new Error("EMAIL_APP_PASSWORD environment variable must be set");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "chapman.ralph@gmail.com",
        pass: process.env.EMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true, // Enable debug logs
      logger: true // Enable built-in logger
    });

    // Non-blocking transporter verify
    transporter.verify()
      .then(() => {
        console.log("[EMAIL] Server is ready to send messages");
      })
      .catch((error) => {
        console.error("[EMAIL] SMTP Connection Error:", error);
        console.error("[EMAIL] Error details:", {
          code: error.code,
          command: error.command,
          response: error.response
        });
      });

    return transporter;
  } catch (error) {
    console.error("[EMAIL] Failed to create transporter:", error);
    if (error instanceof Error) {
      console.error("[EMAIL] Error stack:", error.stack);
    }
    throw error;
  }
};

const transporter = createTransporter();

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
    if (error instanceof Error) {
      console.error("[EMAIL] Error stack:", error.stack);
    }
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
Email: chapman.ralph@gmail.com
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
                  <a href="mailto:chapman.ralph@gmail.com" style="color: #2563eb; text-decoration: none;">chapman.ralph@gmail.com</a>
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
    // Verify connection before sending
    await transporter.verify();
    console.log("[EMAIL] Attempting to send email to:", message.to);
    const result = await transporter.sendMail(message);
    console.log("[EMAIL] Email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("[EMAIL] Failed to send email:", error);
    if (error instanceof Error) {
      console.error("[EMAIL] Error stack:", error.stack);
      console.error("[EMAIL] Error name:", error.name);
      console.error("[EMAIL] Error message:", error.message);
      if ('code' in error) {
        console.error("[EMAIL] Error code:", (error as any).code);
      }
    }
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
Email: chapman.ralph@gmail.com
LinkedIn: linkedin.com/in/ralph-chapman
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
                  <a href="mailto:chapman.ralph@gmail.com" style="color: #2563eb; text-decoration: none;">chapman.ralph@gmail.com</a>
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
    console.log("[EMAIL] Attempting to send booking confirmation to:", message.to);
    const result = await transporter.sendMail(message);
    console.log("[EMAIL] Booking confirmation sent successfully:", result);
    return result;
  } catch (error) {
    console.error("[EMAIL] Failed to send booking confirmation:", error);
    if (error instanceof Error) {
      console.error("[EMAIL] Error stack:", error.stack);
      console.error("[EMAIL] Error name:", error.name);
      console.error("[EMAIL] Error message:", error.message);
      if ('code' in error) {
        console.error("[EMAIL] Error code:", (error as any).code);
      }
    }
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  console.log("[EMAIL] Initiating password reset email to:", email);

  try {
    const resetLink = `https://handyhelper.replit.app/password-reset?token=${resetToken}`;

    const message = {
      from: '"HandyPro Service" <chapman.ralph@gmail.com>',
      to: email,
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

          <p style="margin-bottom: 16px; color: #64748b;">If you did not request a password reset, please ignore this email or contact us if you have concerns.</p>

          <p style="margin-bottom: 16px; color: #64748b;">This password reset link is only valid for 1 hour.</p>

          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 4px 0; color: #64748b;">Best regards,</p>
            <p style="margin: 4px 0; color: #64748b;">HandyPro Service Team</p>
          </div>
        </div>
      `
    };

    console.log("[EMAIL] Attempting to send password reset email");
    const result = await transporter.sendMail(message);
    console.log("[EMAIL] Password reset email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("[EMAIL] Failed to send password reset email:", error);
    // Include full error details in logs
    if (error instanceof Error) {
      console.error("[EMAIL] Error stack:", error.stack);
      console.error("[EMAIL] Error name:", error.name);
      console.error("[EMAIL] Error message:", error.message);
      if ('code' in error) {
        console.error("[EMAIL] Error code:", (error as any).code);
      }
    }
    throw error;
  }
}