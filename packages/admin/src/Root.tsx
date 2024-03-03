import { Outlet } from "react-router-dom";
import { NavbarWrapper } from "./components/navbar/NavbarWrapper";
import { SidebarWrapper } from "./components/sidebar/Sidebar";

export const Root = () => {
  return (
    <section className="flex">
      <SidebarWrapper />
      <NavbarWrapper>
        <Outlet />
      </NavbarWrapper>
    </section>
  );
};
