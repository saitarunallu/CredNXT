import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Menu, X, IndianRupee } from "lucide-react";

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
    <nav className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center shadow-lg relative">
              <Shield className="w-6 h-6 text-white" />
              <IndianRupee className="w-3 h-3 text-white absolute" />
            </div>
            <span className="text-xl font-bold text-foreground">CredNXT</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('features')}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              How it Works
            </button>
            <button 
              onClick={() => scrollToSection('technology')}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Technology
            </button>
            <button 
              onClick={() => scrollToSection('about')}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              About
            </button>
            <Link href="/login">
              <Button size="default" className="shadow-glow-sm">
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
          <div className="md:hidden border-t border-border py-4 space-y-2">
            <button 
              onClick={() => scrollToSection('features')}
              className="block w-full text-left px-4 py-2 text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left px-4 py-2 text-muted-foreground hover:text-primary transition-colors"
            >
              How it Works
            </button>
            <button 
              onClick={() => scrollToSection('technology')}
              className="block w-full text-left px-4 py-2 text-muted-foreground hover:text-primary transition-colors"
            >
              Technology
            </button>
            <button 
              onClick={() => scrollToSection('about')}
              className="block w-full text-left px-4 py-2 text-muted-foreground hover:text-primary transition-colors"
            >
              About
            </button>
            <Link href="/login">
              <Button className="w-full">
                Get Started
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
