import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <motion.div
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
            >
              <motion.img
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                src="/logo.svg"
                alt="HVAC Logo"
                className="h-8 w-8 mr-2"
              />
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">
                HVAC Simulation
              </span>
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/login")}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
            >
              Login
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              <span className="block text-gray-900">Advanced HVAC</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 mt-2 pb-3">
                Simulation System
              </span>
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="mt-6 max-w-md mx-auto text-lg md:text-xl text-gray-600 md:max-w-3xl"
            >
              Experience the next generation of HVAC system design and analysis
              with our cutting-edge simulation platform.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-8"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/login")}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-lg font-medium shadow-lg hover:shadow-xl"
              >
                Get Started
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute w-96 h-96 bg-blue-100 rounded-full -top-10 -left-16 blur-3xl opacity-30"></div>
          <div className="absolute w-96 h-96 bg-blue-200 rounded-full top-1/2 -right-16 blur-3xl opacity-30"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-1 gap-8 md:grid-cols-3"
          >
            <Feature
              icon="🔬"
              title="Advanced Simulation"
              description="Real-time 3D simulation with accurate physical modeling of HVAC systems."
              delay={0}
            />
            <Feature
              icon="📊"
              title="Data Analytics"
              description="Comprehensive analysis tools for system performance optimization."
              delay={0.2}
            />
            <Feature
              icon="🎓"
              title="Training Portal"
              description="Interactive learning modules for HVAC professionals and students."
              delay={0.4}
            />
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © 2025 HVAC Simulation System. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <FooterLink href="#" text="Privacy Policy" />
              <FooterLink href="#" text="Terms of Service" />
              <FooterLink href="#" text="Contact" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Feature = ({ icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.8 }}
    whileHover={{ y: -5 }}
    className="bg-white/50 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
  >
    <div className="text-4xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </motion.div>
);

const FooterLink = ({ href, text }) => (
  <motion.a
    href={href}
    whileHover={{ scale: 1.05 }}
    className="text-gray-500 hover:text-blue-600 transition-colors"
  >
    {text}
  </motion.a>
);

export default HomePage;
