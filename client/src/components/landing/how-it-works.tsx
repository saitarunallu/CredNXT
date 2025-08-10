export default function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Sign Up & Verify",
      description: "Create your account with phone OTP authentication. Set up your profile and verify your identity."
    },
    {
      number: "2",
      title: "Build Your Circle",
      description: "Import contacts manually or via CSV. Invite trusted friends and family to join your known circle."
    },
    {
      number: "3",
      title: "Create & Send Offers",
      description: "Define loan terms, interest rates, and repayment schedules. Send secure offers to your contacts."
    },
    {
      number: "4",
      title: "Track & Manage",
      description: "Monitor payments, receive automated reminders, and download legal contracts for your records."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-gradient mb-6">
            How CredNXT Works
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Simple, secure, and transparent lending in just a few steps
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center group relative">
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400"></div>
              )}
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-all shadow-lg shadow-blue-200">
                <span className="text-2xl font-bold text-white">{step.number}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
