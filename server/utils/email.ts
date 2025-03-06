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
      <h2>New Quote Request</h2>
      <p><strong>Name:</strong> ${quoteRequest.name}</p>
      <p><strong>Email:</strong> ${quoteRequest.email}</p>
      <p><strong>Phone:</strong> ${quoteRequest.phone}</p>
      <p><strong>${serviceInfo}</strong></p>
      <p><strong>Address:</strong> ${quoteRequest.address}</p>
      <h3>Project Description:</h3>
      <p>${quoteRequest.description}</p>
      <h3>AI Analysis:</h3>
      <p>${aiAnalysis}</p>
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