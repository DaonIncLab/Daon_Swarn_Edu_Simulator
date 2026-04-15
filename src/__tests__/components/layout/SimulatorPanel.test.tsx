import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { SimulatorPanel } from "@/components/layout/SimulatorPanel";
import { ConnectionMode, ConnectionStatus } from "@/constants/connection";
import { PlaybackStatus } from "@/stores/useFlightRecordingStore";

vi.mock("@/components/visualization/Drone3DView", () => ({
  Drone3DView: () => <div data-testid="drone-3d-view" />,
}));

vi.mock("@/components/visualization/PlaybackControls", () => ({
  PlaybackControls: () => <div data-testid="playback-controls" />,
}));

vi.mock("@/components/visualization/RecordingPanel", () => ({
  RecordingPanel: () => <div data-testid="recording-panel" />,
}));

vi.mock("@/components/simulator/UnitySimulatorPanel", () => ({
  UnitySimulatorPanel: () => <div data-testid="unity-simulator-panel" />,
}));

vi.mock("@/stores/useConnectionStore", () => ({
  useConnectionStore: vi.fn(),
}));

vi.mock("@/stores/useFlightRecordingStore", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/stores/useFlightRecordingStore")>();
  return {
    ...actual,
    useFlightRecordingStore: vi.fn(),
  };
});

vi.mock("@/services/connection", () => ({
  getConnectionManager: vi.fn(),
}));

import { useConnectionStore } from "@/stores/useConnectionStore";
import { useFlightRecordingStore } from "@/stores/useFlightRecordingStore";
import { getConnectionManager } from "@/services/connection";

describe("SimulatorPanel", () => {
  const emergencyStop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useConnectionStore).mockReturnValue({
      mode: ConnectionMode.MAVLINK,
      status: ConnectionStatus.CONNECTED,
    } as any);

    vi.mocked(useFlightRecordingStore).mockReturnValue({
      playback: {
        recording: null,
        status: PlaybackStatus.IDLE,
      },
    } as any);

    vi.mocked(getConnectionManager).mockReturnValue({
      emergencyStop,
    } as any);
  });

  test("shows emergency stop button in MAVLink mode when connected", () => {
    render(<SimulatorPanel />);
    expect(
      screen.getByRole("button", { name: /긴급 정지/i }),
    ).toBeInTheDocument();
  });

  test("calls ConnectionManager.emergencyStop when emergency button is clicked", async () => {
    emergencyStop.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<SimulatorPanel />);
    await user.click(screen.getByRole("button", { name: /긴급 정지/i }));

    expect(emergencyStop).toHaveBeenCalledTimes(1);
  });
});
