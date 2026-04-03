import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";

vi.mock("@/components/GraphEditor/GraphEditor", () => ({
  default: () => <div data-testid="editor-page">Editor Route Loaded</div>,
}));

vi.mock("@/components/ui/background-paths", () => ({
  BackgroundPaths: ({ title, onLaunch }) => (
    <div>
      <h1>{title}</h1>
      <button onClick={onLaunch}>Open Graph Editor</button>
    </div>
  ),
}));

describe("App routing integration", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("navigates from home to editor route", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open graph editor/i }));

    await waitFor(() => {
      expect(screen.getByTestId("editor-page")).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/editor");
  });

  it("redirects unknown routes to home", async () => {
    window.history.pushState({}, "", "/totally-unknown-path");

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
    expect(screen.getByRole("heading", { name: /graph editor/i })).toBeInTheDocument();
  });
});
