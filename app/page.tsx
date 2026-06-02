import HeroSection from "@/components/HeroSection";
import PainSection from "@/components/PainSection";
import ChatDemoSection from "@/components/ChatDemoSection";
import FeaturesSection from "@/components/FeaturesSection";
import BreathingDemoSection from "@/components/BreathingDemoSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PricingSection from "@/components/PricingSection";
import FaqSection from "@/components/FaqSection";
import FinalCtaSection from "@/components/FinalCtaSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main
      style={{
        backgroundImage: "url('/rome.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <HeroSection />
      <PainSection />
      <ChatDemoSection />
      <FeaturesSection />
      <BreathingDemoSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
      <Footer />
    </main>
  );
}
