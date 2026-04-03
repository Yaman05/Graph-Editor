import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "@/components/ErrorBoundary";

function Crashy({ shouldCrash }) {
  if (shouldCrash) {
    throw new Error("Synthetic crash");
  }

  return <p>Recovered child</p>;
}

function RecoveryHarness() {
  const [shouldCrash, setShouldCrash] = useState(true);

  return (
    <>
      <button onClick={() => setShouldCrash(false)}>Stabilize</button>
      <ErrorBoundary>
        <Crashy shouldCrash={shouldCrash} />
      </ErrorBoundary>
    </>
  );
}

describe("ErrorBoundary integration", () => {
  it("shows fallback UI when a child crashes", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      render(
        <ErrorBoundary>
          <Crashy shouldCrash={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/synthetic crash/i)).toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("recovers after the error condition is removed and user retries", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      render(<RecoveryHarness />);

      await user.click(screen.getByRole("button", { name: /stabilize/i }));
      await user.click(screen.getByRole("button", { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText(/recovered child/i)).toBeInTheDocument();
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
