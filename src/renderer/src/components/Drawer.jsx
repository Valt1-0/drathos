import React, { useState } from "react";
import {
  FaHome,
  FaBars,
  FaWeebly,
  FaTrash,
  FaStreetView,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

const menuItems = [
  { label: "Home", icon: <FaHome />, path: "/" },
  // { label: "About", icon: <FaInfoCircle />, path: "/about" },
  // { label: "Services", icon: <FaCogs />, path: "/services" },
  // { label: "Contact", icon: <FaPhone />, path: "/contact" },
  { label: "Profile", icon: <FaWeebly />, path: "/profile" },
  { label: "Delete", icon: <FaTrash /> },
  { label: "MViewer", icon: <FaStreetView />, path: "/mviewer" },
];

const Drawer = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  let text = "";

  const handlerDeleteUserData = () => {
    if (confirm("Are you sure you want to delete your account?")) {
      window.store.clear();
    } else {
      text = "You didn't delete your account!";
    }
  };

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
          {menuItems.map((item, index) =>
            item.label === "Delete" ? (
              <button
                onClick={() => {
                  handlerDeleteUserData();
                }}
                key={index}
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
              </button>
            ) : (
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
            ),
          )}
        </nav>

        {/* User Info */}
        {user && (
          <div className="absolute bottom-4 w-full text-center">
            <img
              src={user.profilePicture}
              alt="User Avatar"
              className={`mx-auto rounded-full border-2 border-gray-300 transition-all duration-300 ${
                isOpen ? "w-16 h-16" : "w-8 h-8"
              }`}
            />
            {isOpen && (
              <p className="mt-2 text-sm text-gray-400">{user.username}</p>
            )}
          </div>
        )}
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
