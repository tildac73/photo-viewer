import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.scss';

const Navbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/wardrobe', label: 'Wardrobe'},
    { path: '/upload', label: 'Upload' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-style">Style</span>
          <span className="logo-me">ME</span>
        </Link>

        <ul className="navbar-menu">
          {navItems.map((item) => (
            <li key={item.path} className="navbar-item">
              <Link
                to={item.path}
                className={`navbar-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;