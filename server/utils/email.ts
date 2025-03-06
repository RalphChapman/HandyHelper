import nodemailer from "nodemailer";
import { analyzeProjectDescription } from "./grok";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "chapman.ralph@gmail.com",
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

export async function sendQuoteNotification(quoteRequest: any) {
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

  return transporter.sendMail(message);
}