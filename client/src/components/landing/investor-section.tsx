import { CheckCircle } from "lucide-react";

export default function InvestorSection() {
  const marketData = [
    { label: "Global P2P Market Size", value: "₹5.6L Cr" },
    { label: "Expected CAGR", value: "29.7%" },
    { label: "Target by 2030", value: "₹58L Cr" }
  ];

  const advantages = [
    "First P2KP focused platform",
    "Legal contract automation",
    "Relationship preservation focus",
    "Enterprise-grade security"
  ];

  const roadmap = [
    { quarter: "Q4 2025", features: ["MVP Launch", "Core P2KP Features"] },
    { quarter: "Q1 2026", features: ["Mobile App", "Advanced Analytics"] },
    { quarter: "Q2 2026", features: ["AI Risk Assessment", "Credit Scoring"] },
    { quarter: "Q3 2026", features: ["International Expansion", "Enterprise Solutions"] }
  ];

  return (
    <section className="py-20 bg-gradient-hero text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Partner with CredNXT
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Join us in revolutionizing the ₹4L Cr+ peer-to-peer lending market with technology that puts relationships first.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-glass rounded-xl p-8 shadow-glow">
            <h3 className="text-xl font-semibold mb-4">Market Opportunity</h3>
            <div className="space-y-3">
              {marketData.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-blue-200">{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-glass rounded-xl p-8 shadow-glow">
            <h3 className="text-xl font-semibold mb-4">Our Advantage</h3>
            <ul className="space-y-3 text-blue-100">
              {advantages.map((advantage, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>{advantage}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-glass rounded-xl p-8 shadow-glow">
            <h3 className="text-xl font-semibold mb-4">Investment Opportunities</h3>
            <div className="space-y-4">
              <button 
                className="btn-white-solid w-full"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-download-pitch"
              >
                Download Pitch Deck
              </button>
              <button 
                className="btn-outline-white w-full"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-schedule-meeting"
              >
                Schedule Meeting
              </button>
              <p className="text-sm text-blue-200 text-center">
                Contact: partnerships@crednxt.com
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold mb-8">Roadmap & Vision</h3>
          <div className="grid md:grid-cols-4 gap-6">
            {roadmap.map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-lg font-semibold text-blue-300 mb-2">{item.quarter}</div>
                {item.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="text-sm">{feature}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
