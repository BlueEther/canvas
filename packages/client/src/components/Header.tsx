import { User } from "./Header/User";

export const Header = () => {
  return (
    <header id="main-header">
      <div></div>
      <div className="spacer"></div>
      <div className="box">
        <User />
      </div>
    </header>
  );
};
