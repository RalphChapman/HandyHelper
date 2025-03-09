import { QRCodeSVG } from "qrcode.react";
import { LinkedinIcon, Mail, Phone, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function BusinessCard() {
  const websiteUrl = "https://handyhelper.replit.app";
  const contactInfo = {
    name: "Ralph Chapman",
    phone: "(864) 361-3730",
    email: "chapman.ralph@gmail.com",
    linkedin: "linkedin.com/in/ralph-chapman"
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-primary">{contactInfo.name}</h2>

            <div className="space-y-2">
              <a 
                href={`tel:${contactInfo.phone}`} 
                className="flex items-center gap-2 text-gray-600 hover:text-primary"
              >
                <Phone className="h-4 w-4" />
                {contactInfo.phone}
              </a>

              <a 
                href={`mailto:${contactInfo.email}`}
                className="flex items-center gap-2 text-gray-600 hover:text-primary"
              >
                <Mail className="h-4 w-4" />
                {contactInfo.email}
              </a>

              <a 
                href={`https://${contactInfo.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-primary"
              >
                <LinkedinIcon className="h-4 w-4" />
                {contactInfo.linkedin}
              </a>

              <a 
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-primary"
              >
                <Globe className="h-4 w-4" />
                {websiteUrl.replace(/^https?:\/\//, '')}
              </a>
            </div>
          </div>

          <div className="p-2 bg-white rounded-lg">
            <QRCodeSVG 
              value={websiteUrl}
              size={100}
              level="H"
              includeMargin={true}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}