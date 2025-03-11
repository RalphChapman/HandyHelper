import { QRCodeSVG } from "qrcode.react";
import { LinkedinIcon, Mail, Phone, Globe, Share2, Twitter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiFacebook } from "react-icons/si";

export function BusinessCard() {
  const websiteUrl = "https://handyhelper.replit.app";
  const { toast } = useToast();
  const contactInfo = {
    name: "Ralph Chapman",
    phone: "(864) 361-3730",
    email: "chapman.ralph@gmail.com",
    linkedin: "linkedin.com/in/ralph-chapman"
  };

  // Generate sharing text
  const shareText = `Need professional handyman services? Contact ${contactInfo.name}\nPhone: ${contactInfo.phone}\nWebsite: ${websiteUrl}`;
  const encodedShareText = encodeURIComponent(shareText);

  // Share URLs for different platforms
  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedShareText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(websiteUrl)}&quote=${encodedShareText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(websiteUrl)}&summary=${encodedShareText}`,
    email: `mailto:?subject=Professional Handyman Services&body=${encodedShareText}`
  };

  // Copy to clipboard function
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to clipboard",
        description: "Business card information has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again or use the share buttons.",
        variant: "destructive",
      });
    }
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

            {/* Share buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(shareUrls.facebook, '_blank')}
                className="flex items-center gap-2"
              >
                <SiFacebook className="h-4 w-4" />
                Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(shareUrls.twitter, '_blank')}
                className="flex items-center gap-2"
              >
                <Twitter className="h-4 w-4" />
                Tweet
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(shareUrls.linkedin, '_blank')}
                className="flex items-center gap-2"
              >
                <LinkedinIcon className="h-4 w-4" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Copy
              </Button>
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