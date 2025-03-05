import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Wrench, Shield, Clock } from "lucide-react";
import { InlineWidget } from "react-calendly";

export default function Home() {
  const features = [
    {
      icon: <Wrench className="h-6 w-6" />,
      title: "Expert Service",
      description: "Professional handymen with years of experience",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Guaranteed Work",
      description: "All repairs backed by our satisfaction guarantee",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Fast Response",
      description: "Quick response times for all service requests",
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Professional Handyman Services
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Quality repairs and maintenance for your home or business, done right the first time.
          </p>
          <Link href="/services">
            <Button size="lg" className="text-lg px-8">
              View Our Services
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 text-center border rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-primary/10 rounded-full text-primary">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-6">Meet Your Handyman</h2>
            <div className="space-y-4 text-left">
              <p className="text-gray-700 leading-relaxed">
                I'm Ralph Chapman, an electrical engineer with 18 years of professional experience and a dedicated residential remodel hobbyist for over 30 years. My journey began right out of high school as a maintenance mechanic, where I earned journeyman certifications as an electrician, machinist, and welder—skills that laid the foundation for my hands-on expertise.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Over the years, I've slow-flipped two homes across eight years, revamping kitchens, bathrooms, hardwood floors, tile, landscaping, porches, and fences. For three decades, I've also volunteered and taken side jobs, contributing to foundations, concrete, structural work, electrical systems, plumbing, framing, sheetrock, and finish carpentry—all while thriving as an electrical engineer.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Recently relocated to Charleston, I'm excited to tackle new residential repair and remodel projects. Beyond work, I volunteer at the Greenville Woodworkers Guild, honing my craft on diverse projects like kitchen cabinets, end tables, cutting boards, Adirondack chairs, bowls, candle holders, and bookshelves.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">Schedule a Service</h2>
          <div className="max-w-4xl mx-auto">
            <InlineWidget 
              url="https://calendly.com/your-calendly-url"
              styles={{
                height: '700px'
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}