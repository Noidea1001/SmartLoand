import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { LayoutProvider } from "../../context/LayoutContext";
import { ThemeProvider } from "../../context/ThemeContext";

export default function AppLayout() {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <div className="app-layout">
          <Sidebar />
          <div className="app-content">
            <Topbar />
            <main className="app-main">
              <Outlet />
            </main>
          </div>
        </div>
      </LayoutProvider>
    </ThemeProvider>
  );
}
