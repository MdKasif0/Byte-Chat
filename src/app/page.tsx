"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const GreenShape = () => (
  <svg width="144" height="149" viewBox="0 0 144 149" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 0.5H114C130.577 0.5 144 13.9233 144 30.5V114.5C144 131.077 130.577 144.5 114 144.5H30C13.4233 144.5 0 131.077 0 114.5V30.5C0 13.9233 13.4233 0.5 30 0.5Z" fill="#8F9D8A"/>
    <path d="M12.9233 42.641C12.9233 39.5857 16.582 37.6074 19.349 39.135L29.3567 44.865C31.5459 46.0944 31.5459 49.1866 29.3567 50.416L19.349 56.146C16.582 57.6736 12.9233 55.6953 12.9233 52.64V42.641Z" fill="#1E1E1E"/>
    <path d="M51.1398 108.977C60.5958 112.75 72.8258 112.75 82.2818 108.977" stroke="#1E1E1E" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="50.5" cy="85.5" r="4.5" fill="#1E1E1E"/>
    <circle cx="83.5" cy="85.5" r="4.5" fill="#1E1E1E"/>
  </svg>
);

const PinkShape = () => (
  <svg width="145" height="145" viewBox="0 0 145 145" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="72.5" cy="72.5" r="72.5" fill="#F4B9B1"/>
    <path d="M125.423 60.641C125.423 57.5857 129.082 55.6074 131.849 57.135L141.857 62.865C144.046 64.0944 144.046 67.1866 141.857 68.416L131.849 74.146C129.082 75.6736 125.423 73.6953 125.423 70.64V60.641Z" fill="#1E1E1E"/>
    <path d="M56.1398 103.977C65.5958 107.75 77.8258 107.75 87.2818 103.977" stroke="#1E1E1E" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="55.5" cy="80.5" r="4.5" fill="#1E1E1E"/>
    <circle cx="88.5" cy="80.5" r="4.5" fill="#1E1E1E"/>
  </svg>
);

const YellowShape = () => (
  <svg width="168" height="151" viewBox="0 0 168 151" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M84 0L167.136 150.75H0.864166L84 0Z" fill="#FBCB71"/>
    <path d="M69.1398 103.977C78.5958 107.75 90.8258 107.75 100.282 103.977" stroke="#1E1E1E" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="68.5" cy="80.5" r="4.5" fill="#1E1E1E"/>
    <circle cx="101.5" cy="80.5" r="4.5" fill="#1E1E1E"/>
  </svg>
);

const Starburst = () => (
  <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 20L110.153 53.633L146.334 44.7214L137.423 80.9021L171.056 91.0558L137.423 101.21L146.334 137.39L110.153 128.478L100 162.111L89.8474 128.478L53.6658 137.39L62.5773 101.21L28.9442 91.0558L62.5773 80.9021L53.6658 44.7214L89.8474 53.633L100 20Z" fill="#A8B5E0"/>
  </svg>
);

export default function Home() {
  return (
    <div className="flex h-screen flex-col bg-[#F3F4F6] overflow-hidden">
      {/* Header with progress bars */}
      <header className="flex w-full justify-center items-center gap-2 p-4 pt-8">
        <div className="h-1.5 w-16 rounded-full bg-[#F0D3CB]"></div>
        <div className="h-1.5 w-16 rounded-full bg-[#E49C8C]"></div>
        <div className="h-1.5 w-16 rounded-full bg-[#F0D3CB]"></div>
      </header>

      {/* Main content with shapes */}
      <main className="flex-1 relative flex items-center justify-center">
        {/* Floating Shapes */}
        <motion.div
          className="absolute top-[15%] left-[5%]"
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <GreenShape />
        </motion.div>
        <motion.div
          className="absolute top-[35%] right-[-5%]"
          animate={{ y: [10, -10, 10] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <PinkShape />
        </motion.div>
         <motion.div
          className="absolute bottom-[20%] left-[20%]"
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <YellowShape />
        </motion.div>

        {/* Starburst text container */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80">
          <Starburst />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl sm:text-5xl font-lora font-bold text-center leading-tight text-white drop-shadow-md">
              Let&apos;s<br/>
              Connect<br/>
              with New<br/>
              Friends
            </h1>
          </div>
        </div>
      </main>

      {/* Footer button */}
      <footer className="w-full p-6 pb-12">
        <Link href="/login" passHref>
          <motion.button 
            className="w-full bg-[#E49C8C] text-white font-semibold flex items-center justify-between p-4 rounded-full shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-lg">Let&apos;s get Started</span>
            <span className="bg-white/30 rounded-full p-2">
              <ArrowUpRight className="h-6 w-6 text-white" />
            </span>
          </motion.button>
        </Link>
      </footer>
    </div>
  );
}
