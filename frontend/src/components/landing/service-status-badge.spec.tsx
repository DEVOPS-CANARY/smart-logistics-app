import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ServiceStatusBadge from "./service-status-badge";

describe("ServiceStatusBadge", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls the readiness endpoint", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    render(<ServiceStatusBadge />);

    await screen.findByText("All systems operational");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/health\/readiness$/),
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("shows degraded when the API is not ready", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    render(<ServiceStatusBadge />);

    expect(await screen.findByText("Service degraded")).toBeInTheDocument();
  });

  it("shows degraded when the API is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    render(<ServiceStatusBadge />);

    expect(await screen.findByText("Service degraded")).toBeInTheDocument();
  });
});
