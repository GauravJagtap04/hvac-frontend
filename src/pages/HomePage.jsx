import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";

const HomePage = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const heroRef = useRef(null);

  const y = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1),rgba(17,24,39,0.8))]"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 3}px`,
                height: `${Math.random() * 3}px`,
                background: `rgba(59, 130, 246, ${Math.random() * 0.5})`,
                animation: `float ${Math.random() * 10 + 5}s linear infinite`,
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <motion.nav className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <motion.div className="flex items-center space-x-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center"
              >
                <img src="/logo.svg" alt="HVAC Logo" className="h-6 w-6" />
              </motion.div>
              <span className="text-xl font-medium text-white">
                HVAC Simulation
              </span>
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/login")}
              className="px-6 py-2.5 bg-transparent text-blue-400 rounded-lg font-medium transition-all border border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-400 hover:text-white flex items-center gap-2 shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              Login
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.div
        ref={heroRef}
        style={{ y, opacity }}
        className="relative pt-24 pb-32 flex flex-col items-center bg-slate-950"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-full h-full bg-grid-white/[0.02] -z-10" />
          <div className="absolute w-full h-full bg-slate-950/80 backdrop-blur-3xl -z-10" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                <span className="block text-white mb-2">Advanced HVAC</span>
                <span className="block text-blue-500">Simulation Suite</span>
              </h1>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="w-24 h-1 bg-blue-500 mx-auto mt-8"
              />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-8 text-xl text-slate-400 max-w-2xl mx-auto font-normal"
            >
              Comprehensive HVAC system simulation platform with real-time
              monitoring, 3D visualization, and advanced analytics for multiple
              system types
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mt-10 flex justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/login")}
                className="px-8 py-4 bg-blue-500 text-white rounded-lg text-lg font-medium transition-all hover:bg-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Get Started
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Features Section */}
      <div className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ staggerChildren: 0.2 }}
            className="grid grid-cols-1 gap-8 md:grid-cols-3"
          >
            <Feature
              icon="🔄"
              title="Multiple HVAC Systems"
              description="Simulate Split Systems, VRF, Chilled Water, and Heat Pump HVAC configurations with precision."
              delay={0}
            />
            <Feature
              icon="📊"
              title="Data Analytics"
              description="Real-time performance analysis, efficiency metrics, and system optimization recommendations."
              delay={0.2}
            />
            <Feature
              icon="🔌"
              title="IoT Integration"
              description="MQTT support for virtual sensor connectivity and real-time data monitoring."
              delay={0.4}
            />
            <Feature
              icon="🎮"
              title="3D Simulation"
              description="Interactive 3D models for comprehensive system visualization and analysis."
              delay={0.2}
            />
            <Feature
              icon="📈"
              title="Performance Tracking"
              description="Monitor system efficiency, energy consumption, and operational metrics in real-time."
              delay={0.4}
            />
            <Feature
              icon="🔍"
              title="System Analysis"
              description="Detailed component-level analysis and performance optimization tools."
              delay={0.6}
            />
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <img src="/logo.svg" alt="HVAC Logo" className="h-5 w-5" />
                </div>
                <span className="text-lg font-medium text-white">
                  HVAC Simulation
                </span>
              </div>
              <p className="text-slate-300 text-sm mb-6 max-w-md">
                Advanced HVAC simulation tools for professionals. Optimize your
                systems for efficiency, performance, and sustainability.
              </p>
              <div className="flex space-x-4">
                <SocialLink icon="twitter" href="#" />
                <SocialLink icon="linkedin" href="#" />
                <SocialLink icon="github" href="#" />
              </div>
            </div>

            <div>
              <h3 className="text-white font-medium mb-4">Products</h3>
              <ul className="space-y-2">
                <FooterListItem href="#" text="Split Systems" />
                <FooterListItem href="#" text="VRF Systems" />
                <FooterListItem href="#" text="Chilled Water" />
                <FooterListItem href="#" text="Heat Pumps" />
              </ul>
            </div>

            {/* ...existing code... */}
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-slate-400">
              © 2025 HVAC Simulation System. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <FooterLink href="#" text="Privacy Policy" />
              <FooterLink href="#" text="Terms of Service" />
              <FooterLink href="#" text="Cookies" />
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
          100% {
            transform: translateY(0px);
          }
        }
      `}</style>
    </div>
  );
};

const Feature = ({ icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.8 }}
    whileHover={{ y: -4 }}
    className="group bg-slate-900 rounded-lg p-8 transition-all border border-slate-800"
  >
    <motion.div className="text-3xl mb-4" whileHover={{ scale: 1.1 }}>
      {icon}
    </motion.div>
    <h3 className="text-xl font-medium text-white mb-3">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

const FooterLink = ({ href, text }) => (
  <a
    href={href}
    className="text-slate-300 hover:text-blue-400 text-sm transition-colors relative z-20"
  >
    {text}
  </a>
);

const FooterListItem = ({ href, text }) => (
  <li className="relative z-20">
    <a
      href={href}
      className="text-slate-300 hover:text-blue-400 text-sm transition-all block hover:translate-x-1"
    >
      {text}
    </a>
  </li>
);

const SocialLink = ({ icon, href }) => {
  const getIcon = () => {
    switch (icon) {
      case "twitter":
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
          </svg>
        );
      case "github":
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "linkedin":
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.5 21.5h-5v-13h5v13zM4 6.5C2.5 6.5 1.5 5.3 1.5 4s1-2.4 2.5-2.4c1.6 0 2.5 1 2.6 2.5 0 1.4-1 2.5-2.6 2.5zm11.5 6c-1 0-2 1-2 2v7h-5v-13h5V10s1.6-1.5 4-1.5c3 0 5 2.2 5 6.3v6.7h-5v-7c0-1-1-2-2-2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <a
      href={href}
      className="text-slate-300 hover:text-blue-400 transition-all p-2 rounded-full border border-slate-700 hover:border-blue-500 relative z-20"
    >
      {getIcon()}
    </a>
  );
};

export default HomePage;
