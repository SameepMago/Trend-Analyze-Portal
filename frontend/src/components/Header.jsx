import React from 'react';
import { TrendingUp, Film, Tv } from 'lucide-react';

const Header = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo">
          <TrendingUp className="logo-icon" />
          <h1>Trending Program Analyzer</h1>
        </div>
        <p className="subtitle">
          Discover trending movies and TV shows from entertainment keywords
        </p>
      </div>
    </header>
  );
};

export default Header;
