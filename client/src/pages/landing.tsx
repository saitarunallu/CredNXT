import Navigation from "@/components/landing/navigation";
import HeroSection from "@/components/landing/hero-section";
import ProblemSolution from "@/components/landing/problem-solution";
import FeaturesSection from "@/components/landing/features-section";
import HowItWorks from "@/components/landing/how-it-works";
import TechnologySection from "@/components/landing/technology-section";
import AboutSection from "@/components/landing/about-section";
import InvestorSection from "@/components/landing/investor-section";
import ContactSection from "@/components/landing/contact-section";
import Footer from "@/components/landing/footer";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <ProblemSolution />
      <FeaturesSection />
      <HowItWorks />
      <TechnologySection />
      <AboutSection />
      <InvestorSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
