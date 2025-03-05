import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Wrench, Shield, Clock, Award } from "lucide-react";

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
    {
      icon: <Award className="h-6 w-6" />,
      title: "Licensed & Insured",
      description: "Fully licensed professionals you can trust",
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
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
    </div>
  );
}
