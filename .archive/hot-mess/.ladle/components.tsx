import type { GlobalProvider } from "@ladle/react";
import { MemoryRouter } from "react-router-dom";
import "../src/index.css";

/**
 * One router for every story (PageStory navigates it; never nest another).
 * The dark shell matches the app's default theme.
 */
export const Provider: GlobalProvider = ({ children }) => {
  return (
    <MemoryRouter>
      <div className="bg-[#09090b] text-zinc-100 min-h-screen">{children}</div>
    </MemoryRouter>
  );
};
