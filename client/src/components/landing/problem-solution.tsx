import { CheckCircle, XCircle } from "lucide-react";

export default function ProblemSolution() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6">
            The P2KP Lending Revolution
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            In 2025, traditional lending is broken. Banks are slow, apps are impersonal. 
            CredNXT bridges the gap with peer-to-known-person lending that's secure, transparent, and human.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-red-600">The Problems We Solve</h3>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Informal lending lacks legal protection</h4>
                  <p className="text-gray-600">Handshake deals between friends and family often lead to disputes and damaged relationships.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Traditional banks are slow and bureaucratic</h4>
                  <p className="text-gray-600">Weeks of paperwork, credit checks, and approvals for urgent financial needs.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">P2P lending apps connect strangers</h4>
                  <p className="text-gray-600">High-risk lending to unknown individuals with limited accountability.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-green-600">Our Solution</h3>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Legally binding digital contracts</h4>
                  <p className="text-gray-600">Every agreement is documented with enforceable terms and automated compliance.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Instant lending between known contacts</h4>
                  <p className="text-gray-600">Lend only to people in your trusted circle with immediate approvals.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Automated payment tracking & reminders</h4>
                  <p className="text-gray-600">Smart notifications and payment management preserve relationships.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
