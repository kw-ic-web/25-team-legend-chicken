import React from "react";
import { Link } from "react-router-dom";

const Header: React.FC = () => {
  return (
    <header
      className="text-white py-4 px-6 shadow-lg"
      style={{
        backgroundImage:
          "linear-gradient(-60deg, rgba(37,99,235,1) 0%, rgba(37,99,235,1) 50%, rgba(34,197,94,1) 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <Link
          to="/"
          className="text-2xl font-bold text-white hover:text-white/90 transition-colors"
        >
          Lec-Q
        </Link>
      </div>
    </header>
  );
};

export default Header;
