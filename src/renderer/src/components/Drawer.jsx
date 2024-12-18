import React, { useState } from "react";
import { FaHome, FaInfoCircle, FaCogs, FaPhone, FaBars } from "react-icons/fa";
import { Link } from "react-router-dom";
import logo from "../assets/drathos2.png";
import { FaWeebly } from "react-icons/fa6";

const menuItems = [
  { label: "Home", icon: <FaHome />, path: "/" },
  { label: "About", icon: <FaInfoCircle />, path: "/about" },
  { label: "Services", icon: <FaCogs />, path: "/services" },
  { label: "Contact", icon: <FaPhone />, path: "/contact" },
  { label: "Welcome", icon: <FaWeebly />, path: "/welcome" },
];

const Drawer = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full bg-gray-900 text-white transition-all duration-300 ${
          isOpen ? "w-48" : "w-16"
        }`}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-4 text-xl text-[#66FCF1] hover:text-white focus:outline-none"
        >
          <FaBars />
        </button>

        <nav className="mt-10 space-y-4">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className="group flex items-center hover:bg-gray-800 px-4 py-2 rounded-md cursor-pointer"
            >
              <div className="text-2xl text-[#66FCF1] group-hover:text-white">
                {item.icon}
              </div>
              <span
                className={`ml-4 transition-opacity duration-300 ${
                  isOpen ? "opacity-100" : "opacity-0"
                } ${isOpen ? "block" : "hidden"}`}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-4 w-full text-center">
          <img
            src={logo}
            alt="Drathos Logo"
            className={`mx-auto transition-all duration-300 ${
              isOpen ? "w-16 h-16" : "w-8 h-8"
            }`}
          />
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 flex-1 bg-gray-100 ${
          isOpen ? "ml-48" : "ml-16"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default Drawer;
