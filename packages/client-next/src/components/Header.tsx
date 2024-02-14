import React from "react";

export const Header = () => {
  return (
    <header id="main-header">
      <div></div>
      <div className="spacer"></div>
      <div className="box">
        <div className="user-card">
          <div className="user-card--overview">
            <div className="user-name"></div>
            <div className="user-instance"></div>
          </div>
          <img src="#" alt="User Avatar" className="user-avatar" />
        </div>
      </div>
    </header>
  );
};
