import { Lock, Users, FileText, Bell, DollarSign, Download } from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      icon: Lock,
      title: "OTP Authentication",
      description: "Secure phone-based login with JWT sessions. No passwords to remember, just your mobile number.",
      color: "bg-navy-100 text-navy-600"
    },
    {
      icon: Users,
      title: "Known Circle Management",
      description: "Build your trusted contact network. Add manually or bulk upload CSV. Only verified contacts can participate.",
      color: "bg-green-100 text-green-600"
    },
    {
      icon: FileText,
      title: "Smart Offer Creation",
      description: "Comprehensive loan forms with flexible terms: fixed/reducing interest, EMI options, and partial payments.",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: Bell,
      title: "Automated Reminders",
      description: "Smart notification system: T-7, T-3, T-1, due date, and post-due reminders via email and SMS.",
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: DollarSign,
      title: "Payment Tracking",
      description: "Real-time payment updates, partial payment support, and outstanding balance computation.",
      color: "bg-yellow-100 text-yellow-600"
    },
    {
      icon: Download,
      title: "Legal PDF Contracts",
      description: "Auto-generated legal agreements with secure S3 storage. Download anytime for legal protection.",
      color: "bg-red-100 text-red-600"
    }
  ];

  return (
    <section id="features" className="section-padding bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-gradient mb-6">
            Everything You Need for Safe Lending
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Comprehensive tools designed to make peer-to-known-person lending secure, transparent, and effortless.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-card-enhanced card-padding-lg rounded-card shadow-card hover:shadow-card-hover hover:shadow-glow-sm transition-all duration-300 transform hover:-translate-y-3 border border-white/20 animate-scale-in group">
              <div className={`w-14 h-14 ${feature.color} rounded-card flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
