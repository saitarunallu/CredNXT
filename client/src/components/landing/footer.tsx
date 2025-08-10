import { Shield, IndianRupee } from "lucide-react";

export default function Footer() {
  const productLinks = [
    { name: "Features", href: "#features" },
    { name: "How it Works", href: "#how-it-works" },
    { name: "Technology", href: "#technology" },
    { name: "Pricing", href: "#" },
    { name: "API", href: "#" }
  ];

  const companyLinks = [
    { name: "About", href: "#about" },
    { name: "Careers", href: "#" },
    { name: "Press", href: "#" },
    { name: "Privacy", href: "#" },
    { name: "Terms", href: "#" }
  ];

  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.getElementById(href.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-navy rounded-lg flex items-center justify-center relative">
                <Shield className="w-6 h-6 text-white" />
                <IndianRupee className="w-3 h-3 text-white absolute" />
              </div>
              <span className="text-xl font-bold">CredNXT</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              Revolutionizing peer-to-known-person lending with secure, transparent, and legally-backed financial agreements.
            </p>
            <p className="text-sm text-gray-400">
              © 2025 CredNXT. All rights reserved.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-gray-300">
              {productLinks.map((link, index) => (
                <li key={index}>
                  <button 
                    onClick={() => scrollToSection(link.href)}
                    className="hover:text-white transition-colors text-left"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-gray-300">
              {companyLinks.map((link, index) => (
                <li key={index}>
                  <button 
                    onClick={() => scrollToSection(link.href)}
                    className="hover:text-white transition-colors text-left"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>Made with ❤️ for better financial relationships</p>
        </div>
      </div>
    </footer>
  );
}
