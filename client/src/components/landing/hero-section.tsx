import { Link } from "wouter";

export default function HeroSection() {
  return (
    <section className="bg-gradient-hero text-white section-padding lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up">
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
              Lend & Borrow with
              <span className="text-blue-200"> People You Know</span>
            </h1>
            <p className="text-xl lg:text-2xl text-blue-100 mb-8 leading-relaxed">
              CredNXT revolutionizes peer-to-known-person lending with secure, transparent, and legally-backed financial agreements between friends, family, and trusted contacts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login" className="w-full sm:w-auto">
                <button 
                  className="btn-white-solid shadow-xl shadow-glow w-full" 
                  data-testid="button-start-lending"
                >
                  Start Lending Today
                </button>
              </Link>
              <button 
                className="btn-outline-white w-full sm:w-auto"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-request-demo"
              >
                Request Demo
              </button>
            </div>
            
            <div className="mt-12 grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-200">100%</div>
                <div className="text-blue-100">Secure</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-200">Legal</div>
                <div className="text-blue-100">Contracts</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-200">24/7</div>
                <div className="text-blue-100">Support</div>
              </div>
            </div>
          </div>
          
          <div className="animate-float">
            <div className="bg-card-enhanced rounded-card shadow-card hover:shadow-card-hover transition-all duration-300 card-padding-lg border border-white/20 animate-scale-in">
              <div className="bg-accent/50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Dashboard Overview</h3>
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">Active</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-lg font-bold text-blue-600 break-words">₹2,45,000</div>
                    <div className="text-gray-600 text-xs">Amount Lent</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-lg font-bold text-emerald-600 break-words">₹45,000</div>
                    <div className="text-gray-600 text-xs">Amount Borrowed</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-navy-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-xs">AK</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 text-sm">Amit Kumar</div>
                      <div className="text-xs text-gray-600">Due: Jan 15, 2025</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-semibold text-gray-900 text-sm">₹25,000</div>
                    <div className="text-xs text-green-600">On Time</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-xs">PS</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 text-sm">Priya Singh</div>
                      <div className="text-xs text-gray-600">Due: Feb 20, 2025</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-semibold text-gray-900 text-sm">₹50,000</div>
                    <div className="text-xs text-blue-600">Pending</div>
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
