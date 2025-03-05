import nodemailer from "nodemailer";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "chapman.ralph@gmail.com",
    pass: process.env.EMAIL_APP_PASSWORD // Gmail App Password
  }
});

export async function sendQuoteNotification(quoteRequest: any) {
  const serviceInfo = `Service Requested: ${quoteRequest.serviceId}`;
  
  const message = {
    from: '"HandyPro Service" <chapman.ralph@gmail.com>',
    to: "chapman.ralph@gmail.com",
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
    `
  };

  return transporter.sendMail(message);
}
