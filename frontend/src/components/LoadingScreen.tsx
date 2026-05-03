import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="premium-loading-screen">
      <div className="loading-content">
        <div className="logo-pulse">
          <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink Logo" />
        </div>
        <div className="loading-bar-container">
          <div className="loading-bar-fill"></div>
        </div>
        <p className="loading-text">Preparing your dashboard...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
