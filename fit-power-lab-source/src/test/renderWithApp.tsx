import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { AppProvider } from "@/app/AppContext";
import type { AppState } from "@/app/appState";

/**
 * Renders a component inside the app state and translations, starting from `initial`.
 * Nothing is read from or written to localStorage.
 */
export function renderWithApp(ui: ReactElement, initial: Partial<AppState> = {}) {
  return render(<AppProvider initial={initial}>{ui}</AppProvider>);
}
