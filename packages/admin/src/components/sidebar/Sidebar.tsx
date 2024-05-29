import { useState } from "react";
import { Sidebar } from "./sidebar.styles";
import { SidebarItem } from "./sidebar-item";
import { SidebarMenu } from "./sidebar-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faClock,
  faCog,
  faHashtag,
  faHome,
  faServer,
  faShieldHalved,
  faSquare,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useLocation } from "react-router-dom";
import { CollapseItems } from "./collapse-items";

export const SidebarWrapper = () => {
  const { pathname } = useLocation();
  // const { collapsed, setCollapsed } = useSidebarContext();

  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className="h-screen z-[202] sticky top-0">
      {collapsed ? (
        <div className={Sidebar.Overlay()} onClick={() => setCollapsed(true)} />
      ) : null}
      <div
        className={Sidebar({
          collapsed: collapsed,
        })}
      >
        <div className={Sidebar.Header()}>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faSquare} />
            <div className="flex flex-col gap-4">
              <h3 className="text-xl font-medium m-0 text-default-900 -mb-4 whitespace-nowrap">
                Canvas
              </h3>
              <span className="text-xs font-medium text-default-500">
                {window.location.host}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between h-full">
          <div className={Sidebar.Body()}>
            <SidebarItem
              title="Home"
              icon={<FontAwesomeIcon icon={faHome} />}
              isActive={pathname === "/"}
              href="/"
            />
            <CollapseItems
              icon={<FontAwesomeIcon icon={faChartBar} />}
              title="Stats"
              items={["Pixels"]}
            />
            <SidebarMenu title="Accounts">
              <SidebarItem
                isActive={pathname === "/accounts"}
                title="Accounts"
                icon={<FontAwesomeIcon icon={faUsers} />}
                href="/accounts"
              />
              <SidebarItem
                isActive={pathname === "/instances"}
                title="Instances"
                icon={<FontAwesomeIcon icon={faServer} />}
                href="/instances"
              />
              <SidebarItem
                isActive={pathname === "/accounts/settings"}
                title="Settings"
                icon={<FontAwesomeIcon icon={faCog} />}
                href="/accounts/settings"
              />
            </SidebarMenu>

            <SidebarMenu title="Clans">
              <SidebarItem
                isActive={pathname === "/clans"}
                title="Clans"
                icon={<FontAwesomeIcon icon={faShieldHalved} />}
                href="/clans"
              />
              <SidebarItem
                isActive={pathname === "/clans/settings"}
                title="Settings"
                icon={<FontAwesomeIcon icon={faCog} />}
                href="/clans/settings"
              />
            </SidebarMenu>

            <SidebarMenu title="Chat">
              <SidebarItem
                isActive={pathname === "/chat/rooms"}
                title="Rooms"
                icon={<FontAwesomeIcon icon={faHashtag} />}
                href="/chat/rooms"
              />
              <SidebarItem
                isActive={pathname === "/chat/settings"}
                title="Settings"
                icon={<FontAwesomeIcon icon={faCog} />}
                href="/chat/settings"
              />
            </SidebarMenu>

            <SidebarMenu title="Service">
              <SidebarItem
                isActive={pathname === "/chat/rooms"}
                title="Shards"
                icon={<FontAwesomeIcon icon={faServer} />}
                href="/chat/rooms"
              />
              <SidebarItem
                isActive={pathname === "/chat/rooms"}
                title="Timelapse"
                icon={<FontAwesomeIcon icon={faClock} />}
                href="/chat/rooms"
              />
              <SidebarItem
                isActive={pathname === "/service/settings"}
                title="Settings"
                icon={<FontAwesomeIcon icon={faCog} />}
                href="/service/settings"
              />
            </SidebarMenu>
          </div>
          <div className={Sidebar.Footer()}></div>
        </div>
      </div>
    </aside>
  );
};
