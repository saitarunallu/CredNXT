import { Link } from "wouter";

export default function HeroSection() {
  return (
    <section className="bg-gradient-hero text-white py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up">
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
              Lend & Borrow with
              <span className="text-blue-300"> People You Know</span>
            </h1>
            <p className="text-xl lg:text-2xl text-blue-100 mb-8 leading-relaxed">
              CredNXT revolutionizes peer-to-known-person lending with secure, transparent, and legally-backed financial agreements between friends, family, and trusted contacts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <button 
                  className="btn-white-solid shadow-xl shadow-glow" 
                  data-testid="button-start-lending"
                >
                  Start Lending Today
                </button>
              </Link>
              <button 
                className="btn-outline-white"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-request-demo"
              >
                Request Demo
              </button>
            </div>
            
            <div className="mt-12 grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-300">100%</div>
                <div className="text-blue-100">Secure</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-300">Legal</div>
                <div className="text-blue-100">Contracts</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-300">24/7</div>
                <div className="text-blue-100">Support</div>
              </div>
            </div>
          </div>
          
          <div className="animate-float">
            <div className="bg-card-enhanced rounded-2xl shadow-2xl p-6 lg:p-8 border border-white/30">
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Dashboard Overview</h3>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Active</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-2xl font-bold text-navy-600">₹2,45,000</div>
                    <div className="text-gray-600 text-sm">Amount Lent</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">₹45,000</div>
                    <div className="text-gray-600 text-sm">Amount Borrowed</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-navy-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">AK</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Amit Kumar</div>
                      <div className="text-sm text-gray-600">Due: Jan 15, 2025</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">₹25,000</div>
                    <div className="text-sm text-green-600">On Time</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">PS</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Priya Singh</div>
                      <div className="text-sm text-gray-600">Due: Feb 20, 2025</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">₹50,000</div>
                    <div className="text-sm text-blue-600">Pending</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
