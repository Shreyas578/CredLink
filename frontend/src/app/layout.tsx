import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Web3Provider } from "@/lib/web3";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "CredLink — On-Chain Credit Passport",
  description: "Decentralized credit reputation system built on Creditcoin testnet. Upload payment proofs, verify with AI, and mint your Credit Passport NFT.",
  keywords: ["creditcoin", "credit score", "blockchain", "DeFi", "NFT", "credit passport"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body className={`${outfit.variable} font-sans bg-[#070b12] text-white antialiased min-h-screen`}>
        <Web3Provider>
          <Navbar />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
          <footer className="border-t border-white/10 py-6 text-center text-gray-600 text-sm">
            Built on Creditcoin Testnet · CredLink © 2026
          </footer>
        </Web3Provider>
      </body>
    </html>
  );
}
