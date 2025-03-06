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

        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px;">
          <h3 style="color: #1e293b; margin-bottom: 16px;">Professional Analysis</h3>
          <div style="line-height: 1.6; white-space: pre-wrap;">${aiAnalysis.split('\n').map(line => 
            line.trim().startsWith('-') ? 
              `<p style="margin: 4px 0 4px 20px;">• ${line.substring(1)}</p>` : 
              line.trim().startsWith('*') ? 
                `<p style="margin: 4px 0 4px 20px;">• ${line.substring(1)}</p>` :
                `<p style="margin: 8px 0;">${line}</p>`
          ).join('')}</div>
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