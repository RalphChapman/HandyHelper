import { QRCodeSVG } from "qrcode.react";
import { LinkedinIcon, Mail, Phone, Globe, Share2, Twitter, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiFacebook } from "react-icons/si";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";

export function BusinessCard() {
  const websiteUrl = "https://handyhelper.replit.app";
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true on component mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const contactInfo = {
    name: "Ralph Chapman",
    phone: "(864) 361-3730",
    phoneClean: "8643613730", // Clean version without special characters
    email: "chapman.ralph@gmail.com",
    linkedin: "linkedin.com/in/ralph-chapman"
  };

  // Generate sharing text
  const shareText = `Need professional handyman services? Contact ${contactInfo.name}\nPhone: ${contactInfo.phone}\nWebsite: ${websiteUrl}`;
  const encodedShareText = encodeURIComponent(shareText);
  
  // Default text message
  const smsText = `Hi Ralph, I'd like to discuss a home improvement project.`;
  const encodedSmsText = encodeURIComponent(smsText);

  // Share URLs for different platforms
  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedShareText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(websiteUrl)}&quote=${encodedShareText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(websiteUrl)}&summary=${encodedShareText}`,
    email: `mailto:?subject=Professional Handyman Services&body=${encodedShareText}`,
    sms: `sms:${contactInfo.phoneClean}?body=${encodedSmsText}`
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

  // Phone link handler - uses native app on mobile
  const getPhoneLink = () => {
    // Use tel: protocol which opens the native phone app on mobile
    return `tel:${contactInfo.phoneClean}`;
  };

  // Email link handler - uses native app on mobile
  const getEmailLink = () => {
    // Use mailto: protocol which opens the native email app on mobile
    return `mailto:${contactInfo.email}`;
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-primary">{contactInfo.name}</h2>

            <div className="space-y-2">
              {/* Phone link with mobile app support */}
              <a 
                href={getPhoneLink()}
                className="flex items-center gap-2 text-gray-600 hover:text-primary"
              >
                <Phone className="h-4 w-4" />
                <span>{contactInfo.phone}</span>
                {isClient && isMobile && (
                  <span className="text-xs text-green-600 ml-1 font-medium">
                    (Call)
                  </span>
                )}
              </a>

              {/* SMS link - only visible on mobile */}
              {isClient && isMobile && (
                <a 
                  href={shareUrls.sms}
                  className="flex items-center gap-2 text-gray-600 hover:text-primary"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Text Message</span>
                  <span className="text-xs text-green-600 ml-1 font-medium">
                    (Opens messaging app)
                  </span>
                </a>
              )}

              {/* Email link with mobile app support */}
              <a 
                href={getEmailLink()}
                className="flex items-center gap-2 text-gray-600 hover:text-primary"
              >
                <Mail className="h-4 w-4" />
                <span>{contactInfo.email}</span>
                {isClient && isMobile && (
                  <span className="text-xs text-green-600 ml-1 font-medium">
                    (Email)
                  </span>
                )}
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

            {/* Mobile-specific quick actions */}
            {isClient && isMobile && (
              <div className="mt-4 flex gap-2">
                <Button 
                  onClick={() => window.location.href = getPhoneLink()}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button 
                  onClick={() => window.location.href = shareUrls.sms}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Text
                </Button>
                <Button 
                  onClick={() => window.location.href = getEmailLink()}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                  size="sm"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>
            )}

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