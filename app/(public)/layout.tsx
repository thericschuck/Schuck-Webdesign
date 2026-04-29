import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { CustomCursor } from "@/components/public/CustomCursor";
import { FloatingCTA } from "@/components/public/FloatingCTA";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CustomCursor />
      <Navbar />
      {children}
      <Footer />
      <FloatingCTA />
    </>
  );
}
