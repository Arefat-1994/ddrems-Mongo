import React from 'react';
import './BrandLogo.css';

const BrandLogo = ({ size = 'large', showSlogan = true, colorMode = 'light' }) => {
  return (
    <div className={`brand-logo-container vertical ${size} ${colorMode}-mode`}>
      <div className="brand-logo-main">
        <div className="brand-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M5 21V7L13 3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 21V11L13 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M9 13H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M9 17H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="brand-text">
          <div className="brand-text-row">
            <span className="brand-name-orange">DIRE DAWA</span>
            <span className="brand-name-sky">REAL ESTATE</span>
          </div>
        </div>
      </div>
      {showSlogan && (
        <div className="brand-slogan">
          <div className="slogan-line"></div>
          <p>Experiencing the excellence of life</p>
          <div className="slogan-line"></div>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
