import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import Logo from "@/components/ui/logo";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Logo size="md" />
            <span className="text-xl font-bold text-navy-900">CredNXT</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('features')}
              className="text-gray-600 hover:text-navy-600 transition-colors"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="text-gray-600 hover:text-navy-600 transition-colors"
            >
              How it Works
            </button>
            <button 
              onClick={() => scrollToSection('technology')}
              className="text-gray-600 hover:text-navy-600 transition-colors"
            >
              Technology
            </button>
            <button 
              onClick={() => scrollToSection('about')}
              className="text-gray-600 hover:text-navy-600 transition-colors"
            >
              About
            </button>
            <Link href="/login">
              <Button className="bg-navy-600 text-white px-4 py-2 rounded-lg hover:bg-navy-700 transition-colors">
                Get Started
              </Button>
            </Link>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            <button 
              onClick={() => scrollToSection('features')}
              className="block w-full text-left px-4 py-2 text-gray-600 hover:text-navy-600 transition-colors"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left px-4 py-2 text-gray-600 hover:text-navy-600 transition-colors"
            >
              How it Works
            </button>
            <button 
              onClick={() => scrollToSection('technology')}
              className="block w-full text-left px-4 py-2 text-gray-600 hover:text-navy-600 transition-colors"
            >
              Technology
            </button>
            <button 
              onClick={() => scrollToSection('about')}
              className="block w-full text-left px-4 py-2 text-gray-600 hover:text-navy-600 transition-colors"
            >
              About
            </button>
            <Link href="/login">
              <Button className="w-full bg-navy-600 text-white px-4 py-2 rounded-lg hover:bg-navy-700 transition-colors">
                Get Started
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
