import { CheckCircle } from "lucide-react";

export default function AboutSection() {
  const advantages = [
    {
      title: "Lower Risk",
      description: "Lending to people you know reduces default risk significantly"
    },
    {
      title: "Faster Approval",
      description: "No credit checks or lengthy bank processes required"
    },
    {
      title: "Better Terms",
      description: "Negotiate flexible interest rates and repayment schedules"
    },
    {
      title: "Preserved Relationships",
      description: "Clear terms and automated reminders prevent misunderstandings"
    }
  ];

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6">
            About CredNXT
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Founded in 2025, CredNXT is pioneering the future of peer-to-known-person lending with technology-driven solutions that preserve relationships and protect interests.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Our Mission</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              We believe that lending between people who know and trust each other should be simple, secure, and transparent. CredNXT bridges the gap between informal handshake deals and complex banking systems, providing the legal protection and technological sophistication needed for modern financial relationships.
            </p>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Our platform empowers individuals to help each other financially while maintaining the trust and relationships that matter most.
            </p>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-navy-600">2025</div>
                <div className="text-gray-600 text-sm">Founded</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-navy-600">100%</div>
                <div className="text-gray-600 text-sm">Secure</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-navy-600">24/7</div>
                <div className="text-gray-600 text-sm">Support</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Why P2KP Lending?</h3>
            <div className="space-y-4">
              {advantages.map((advantage, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-navy-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{advantage.title}</h4>
                    <p className="text-gray-600 text-sm">{advantage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
