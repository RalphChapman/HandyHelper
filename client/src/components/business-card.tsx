import { QRCodeSVG } from "qrcode.react";
import { LinkedinIcon, Mail, Phone, Globe, Share2, Twitter, MessageSquare, UserPlus } from "lucide-react";
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
    email: "chapman.ralph@gmail.com, ralph.chapman2024@gamail.com",
    linkedin: "linkedin.com/in/ralph-chapman",
    company: "HandyPro Services",
    jobTitle: "Professional Handyman"
  };

  // Generate sharing text
  const shareText = `Need professional handyman services? Contact ${contactInfo.name}\nPhone: ${contactInfo.phone}\nWebsite: ${websiteUrl}`;
  const encodedShareText = encodeURIComponent(shareText);
  
  // Default text message
  const smsText = `Hi Ralph, I'd like to discuss a home improvement project.`;
  const encodedSmsText = encodeURIComponent(smsText);

  // Share URLs for different platforms with mobile app support
  const shareUrls = {
    // Twitter - mobile app uses twitter:// scheme
    twitter: isClient && isMobile 
      ? `twitter://post?message=${encodedShareText}` 
      : `https://twitter.com/intent/tweet?text=${encodedShareText}`,
    
    // Facebook - mobile app uses fb:// scheme
    facebook: isClient && isMobile
      ? `fb://share?text=${encodedShareText}&href=${encodeURIComponent(websiteUrl)}`
      : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(websiteUrl)}&quote=${encodedShareText}`,
    
    // LinkedIn - mobile app uses linkedin:// scheme
    linkedin: isClient && isMobile
      ? `linkedin://shareArticle?mini=true&url=${encodeURIComponent(websiteUrl)}&title=Handyman%20Services&summary=${encodedShareText}`
      : `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(websiteUrl)}&summary=${encodedShareText}`,
    
    // Email - uses mailto: protocol (works on both desktop and mobile)
    email: `mailto:?subject=Professional Handyman Services&body=${encodedShareText}`,
    
    // SMS - uses sms: protocol (works primarily on mobile)
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

  // Share contact information as a contact card (vCard)
  const shareContact = async () => {
    // Create vCard format string
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${contactInfo.name}
ORG:${contactInfo.company}
TITLE:${contactInfo.jobTitle}
TEL;TYPE=WORK,VOICE:${contactInfo.phone}
EMAIL;TYPE=WORK:${contactInfo.email}
URL:${websiteUrl}
NOTE:Professional handyman services in Charleston.
END:VCARD`;

    // Check if Web Share API is available
    if (isClient && navigator.share) {
      try {
        // First try to share just the contact info as text (widely supported)
        await navigator.share({
          title: 'Ralph Chapman Contact',
          text: `${contactInfo.name}\n${contactInfo.jobTitle}, ${contactInfo.company}\nPhone: ${contactInfo.phone}\nEmail: ${contactInfo.email}\nWebsite: ${websiteUrl}`,
        });
        
        toast({
          title: "Sharing contact",
          description: "Contact information is being shared.",
        });
        return;
      } catch (err) {
        // If basic sharing fails, try file sharing if browser might support it
        try {
          // Check if we can share files (not all browsers support this)
          // @ts-ignore - Some browsers don't have canShare
          if (navigator.canShare && navigator.canShare({ files: [new File(['test'], 'test.txt')] })) {
            const contactFile = new File([vCard], 'ralph-chapman.vcf', { type: 'text/vcard' });
            
            await navigator.share({
              title: 'Ralph Chapman Contact',
              text: 'Contact information for Ralph Chapman',
              files: [contactFile],
            });
            
            toast({
              title: "Sharing contact",
              description: "The contact card is being shared.",
            });
            return;
          }
        } catch (fileErr) {
          // Fallback to vCard download if file sharing failed
          downloadVCard(vCard);
        }
      }
    } else {
      // Fallback for browsers without Web Share API
      downloadVCard(vCard);
    }
  };

  // Download vCard helper function
  const downloadVCard = (vCardData: string) => {
    try {
      // Create a Blob with the vCard data
      const blob = new Blob([vCardData], { type: 'text/vcard' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ralph-chapman.vcf';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: "Contact download started",
        description: "The contact card file is being downloaded.",
      });
    } catch (err) {
      toast({
        title: "Failed to download contact",
        description: "Please try another sharing option.",
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
                href={isClient && isMobile 
                  ? `linkedin://profile/${contactInfo.linkedin.replace('linkedin.com/in/', '')}`
                  : `https://${contactInfo.linkedin}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-primary"
              >
                <LinkedinIcon className="h-4 w-4" />
                {contactInfo.linkedin}
                {isClient && isMobile && (
                  <span className="text-xs text-blue-600 ml-1 font-medium">
                    (LinkedIn app)
                  </span>
                )}
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

            {/* Add to contacts button (mobile only) */}
            {isClient && isMobile && (
              <Button
                onClick={shareContact}
                className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add to Contacts
              </Button>
            )}

            {/* Share buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Prepare enhanced share text for Facebook that includes complete contact information
                  const enhancedFacebookShareText = isClient && isMobile 
                    ? `${contactInfo.name} | ${contactInfo.jobTitle} at ${contactInfo.company}

Contact Information:
📞 ${contactInfo.phone} 
✉️ ${contactInfo.email}
🔗 ${websiteUrl}
💼 ${contactInfo.linkedin}

Professional handyman services in Charleston. Specializing in home repairs, improvements, and maintenance with 20+ years of experience. Quality craftsmanship and reliable service guaranteed.`
                    : shareText;

                  // Encode the enhanced text for sharing
                  const encodedEnhancedText = encodeURIComponent(enhancedFacebookShareText);
                  
                  if (isClient && isMobile) {
                    // For mobile, we'll use the Web Share API if available since it provides the best
                    // experience across different platforms
                    if (navigator.share) {
                      navigator.share({
                        title: 'Professional Handyman Services',
                        text: enhancedFacebookShareText,
                        url: websiteUrl
                      }).catch(() => {
                        // If sharing fails, open the Facebook app or website
                        tryFacebookShare();
                      });
                    } else {
                      // If Web Share API is not available, try Facebook-specific methods
                      tryFacebookShare();
                    }
                  } else {
                    // Use standard web sharing for desktop
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(websiteUrl)}&quote=${encodedEnhancedText}`, '_blank');
                  }
                  
                  // Helper function to attempt Facebook sharing in various ways
                  function tryFacebookShare() {
                    // First try Facebook's mobile app intent
                    const fbAppIntent = `intent://facebook.com/#Intent;scheme=https;package=com.facebook.katana;end`;
                    const fbAppUrl = `fb://composer?text=${encodedEnhancedText}`;
                    
                    // The FB app URL scheme is not reliable for sharing full text content
                    // Try deep link to Facebook's composer
                    window.location.href = fbAppUrl;
                    
                    // Fallback to web if app URL fails (will happen after a short timeout)
                    setTimeout(() => {
                      // Use Facebook's web sharing which has better text support
                      const fbWebUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(websiteUrl)}&quote=${encodedEnhancedText}`;
                      window.open(fbWebUrl, '_blank');
                    }, 300);
                  }
                }}
                className="flex items-center gap-2"
              >
                <SiFacebook className="h-4 w-4" />
                Facebook
                {isClient && isMobile && <span className="text-xs">📱</span>}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Prepare enhanced share text for Twitter that includes formatted contact information
                  // Note: Twitter has a 280 character limit, so we need to keep it concise
                  const enhancedTwitterShareText = isClient && isMobile 
                    ? `${contactInfo.name}, ${contactInfo.jobTitle}
📞 ${contactInfo.phone} 
✉️ ${contactInfo.email}
🔗 ${websiteUrl}
Professional handyman services in Charleston.`
                    : shareText;

                  // Encode the enhanced text for sharing
                  const encodedEnhancedText = encodeURIComponent(enhancedTwitterShareText);
                  
                  if (isClient && isMobile) {
                    // For mobile, try Web Share API first for consistent experience
                    if (navigator.share) {
                      navigator.share({
                        title: 'Professional Handyman Services',
                        text: enhancedTwitterShareText,
                        url: websiteUrl
                      }).catch(() => {
                        // If sharing fails, try Twitter-specific methods
                        tryTwitterShare();
                      });
                    } else {
                      // If Web Share API is not available, use Twitter-specific methods
                      tryTwitterShare();
                    }
                  } else {
                    // Use standard web sharing for desktop
                    window.open(`https://twitter.com/intent/tweet?text=${encodedShareText}`, '_blank');
                  }
                  
                  // Helper function to attempt Twitter sharing in various ways
                  function tryTwitterShare() {
                    // Different Twitter app URL schemes
                    const twitterAppUrls = [
                      `twitter://post?message=${encodedEnhancedText}`,
                      `twitterrific:///post?text=${encodedEnhancedText}`,
                      `tweetbot:///post?text=${encodedEnhancedText}`
                    ];
                    
                    // Try the first Twitter app URL
                    window.location.href = twitterAppUrls[0];
                    
                    // Fallback to web if app URL fails (will happen after a timeout)
                    setTimeout(() => {
                      const twitterWebUrl = `https://twitter.com/intent/tweet?text=${encodedEnhancedText}`;
                      window.open(twitterWebUrl, '_blank');
                    }, 300);
                  }
                }}
                className="flex items-center gap-2"
              >
                <Twitter className="h-4 w-4" />
                Tweet
                {isClient && isMobile && <span className="text-xs">📱</span>}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Prepare enhanced share text for LinkedIn that includes professional contact details
                  const enhancedLinkedInShareText = isClient && isMobile 
                    ? `${contactInfo.name} | ${contactInfo.jobTitle} at ${contactInfo.company}

Contact Information:
📞 ${contactInfo.phone} 
✉️ ${contactInfo.email}
🔗 ${websiteUrl}

Professional handyman services in Charleston. Specializing in home repairs, improvements, and maintenance with 20+ years of experience. Quality craftsmanship and reliable service guaranteed.`
                    : shareText;

                  // Encode the enhanced text for sharing
                  const encodedEnhancedText = encodeURIComponent(enhancedLinkedInShareText);
                  
                  if (isClient && isMobile) {
                    // For mobile, try Web Share API first for consistent experience
                    if (navigator.share) {
                      navigator.share({
                        title: 'Professional Handyman Services',
                        text: enhancedLinkedInShareText,
                        url: websiteUrl
                      }).catch(() => {
                        // If sharing fails, try LinkedIn-specific methods
                        tryLinkedInShare();
                      });
                    } else {
                      // If Web Share API is not available, use LinkedIn-specific methods
                      tryLinkedInShare();
                    }
                  } else {
                    // Use standard web sharing for desktop
                    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(websiteUrl)}&summary=${encodedShareText}`, '_blank');
                  }
                  
                  // Helper function to attempt LinkedIn sharing in various ways
                  function tryLinkedInShare() {
                    // Create a short title and formatted message for LinkedIn
                    const title = "Professional Handyman Services";
                    
                    // LinkedIn app URL scheme
                    const linkedinAppUrl = `linkedin://shareArticle?mini=true&url=${encodeURIComponent(websiteUrl)}&title=${encodeURIComponent(title)}&summary=${encodedEnhancedText}`;
                    window.location.href = linkedinAppUrl;
                    
                    // Fallback to web if app URL fails (will happen after a timeout)
                    setTimeout(() => {
                      // LinkedIn web sharing has better text support
                      const linkedinWebUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(websiteUrl)}&summary=${encodedEnhancedText}&title=${encodeURIComponent(title)}`;
                      window.open(linkedinWebUrl, '_blank');
                    }, 300);
                  }
                }}
                className="flex items-center gap-2"
              >
                <LinkedinIcon className="h-4 w-4" />
                Share
                {isClient && isMobile && <span className="text-xs">📱</span>}
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