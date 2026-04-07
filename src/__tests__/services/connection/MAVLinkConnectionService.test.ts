import { describe, expect, test, beforeEach, vi } from "vitest";
import { MessageType } from "@/constants/commands";
import { MAVLinkConnectionService } from "@/services/connection/MAVLinkConnectionService";
import type { Command } from "@/types/websocket";
import { coordinateConverter } from "@/services/mavlink/CoordinateConverter";
import { createGlobalPositionInt } from "@/services/mavlink/MAVLinkMessages";
import { createMAVLinkPacket, MAV_MSG_ID, packFloat, serializePacket } from "@/services/mavlink/MAVLinkProtocol";
import { MAV_MODE_FLAG, MAV_STATE } from "@/types/mavlink";

function createAttitudePacket({
  roll = 0,
  pitch = 0,
  yaw = 0,
  systemId = 1,
}: {
  roll?: number;
  pitch?: number;
  yaw?: number;
  systemId?: number;
}) {
  const payload = new Uint8Array(28);
  payload.set(packFloat(roll), 4);
  payload.set(packFloat(pitch), 8);
  payload.set(packFloat(yaw), 12);

  return serializePacket(
    createMAVLinkPacket(MAV_MSG_ID.ATTITUDE, payload, systemId, 1),
  );
}

function createBatteryStatusPacket({
  batteryRemaining = 100,
  systemId = 1,
}: {
  batteryRemaining?: number;
  systemId?: number;
}) {
  const payload = new Uint8Array(36);
  payload[33] = batteryRemaining & 0xff;

  return serializePacket(
    createMAVLinkPacket(MAV_MSG_ID.BATTERY_STATUS, payload, systemId, 1),
  );
}

function createHeartbeatPacket({
  systemStatus = MAV_STATE.ACTIVE,
  baseMode = MAV_MODE_FLAG.SAFETY_ARMED,
  systemId = 1,
}: {
  systemStatus?: number;
  baseMode?: number;
  systemId?: number;
}) {
  const payload = new Uint8Array(9);
  payload[6] = baseMode;
  payload[8] = systemStatus;

  return serializePacket(
    createMAVLinkPacket(MAV_MSG_ID.HEARTBEAT, payload, systemId, 1),
  );
}

describe("MAVLinkConnectionService", () => {
  beforeEach(() => {
    coordinateConverter.resetHome();
  });

  test("emits normalized telemetry messages from GLOBAL_POSITION_INT", () => {
    const service = new MAVLinkConnectionService();
    const messageListener = vi.fn();

    service.setMessageListener(messageListener);

    const packet = serializePacket(
      createGlobalPositionInt(
        1000,
        37.7749,
        -122.4194,
        15,
        10,
        1.5,
        -0.5,
        0,
        90,
      ),
    );

    (service as any)._handleIncomingPacket(packet);

    expect(messageListener).toHaveBeenCalledTimes(1);
    expect(messageListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.TELEMETRY,
        timestamp: expect.any(Number),
        drones: [
          expect.objectContaining({
            id: 1,
            position: expect.objectContaining({
              x: expect.closeTo(0, 5),
              y: expect.closeTo(0, 5),
              z: 10,
            }),
            velocity: { x: 1.5, y: -0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            battery: 100,
            status: "landed",
            isActive: false,
          }),
        ],
      }),
    );
  });

  test("keeps multiple systems and accumulates attitude, heartbeat, and battery state", () => {
    const service = new MAVLinkConnectionService();
    const messageListener = vi.fn();

    service.setMessageListener(messageListener);

    const droneOneBasePacket = createGlobalPositionInt(
      1000,
      37.7749,
      -122.4194,
      15,
      12,
      2,
      0,
      -0.2,
      45,
    );
    const droneTwoBasePacket = createGlobalPositionInt(
      1000,
      37.7750,
      -122.4193,
      16,
      8,
      0,
      1,
      0,
      180,
    );

    const droneOnePacket = serializePacket(
      createMAVLinkPacket(
        MAV_MSG_ID.GLOBAL_POSITION_INT,
        droneOneBasePacket.payload,
        1,
        1,
      ),
    );
    const droneTwoPacket = serializePacket(
      createMAVLinkPacket(
        MAV_MSG_ID.GLOBAL_POSITION_INT,
        droneTwoBasePacket.payload,
        2,
        1,
      ),
    );

    (service as any)._handleIncomingPacket(droneOnePacket);
    (service as any)._handleIncomingPacket(droneTwoPacket);
    (service as any)._handleIncomingPacket(
      createAttitudePacket({
        yaw: Math.PI / 2,
        systemId: 2,
      }),
    );
    (service as any)._handleIncomingPacket(
      createHeartbeatPacket({
        systemId: 2,
        baseMode: MAV_MODE_FLAG.SAFETY_ARMED,
        systemStatus: MAV_STATE.ACTIVE,
      }),
    );
    (service as any)._handleIncomingPacket(
      createBatteryStatusPacket({
        systemId: 2,
        batteryRemaining: 77,
      }),
    );

    const lastMessage =
      messageListener.mock.calls[messageListener.mock.calls.length - 1]?.[0];

    expect(lastMessage).toEqual(
      expect.objectContaining({
        type: MessageType.TELEMETRY,
        drones: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            position: expect.objectContaining({ z: 12 }),
          }),
          expect.objectContaining({
            id: 2,
            battery: 77,
            status: "flying",
            isActive: true,
            rotation: expect.objectContaining({
              z: expect.closeTo(90, 5),
            }),
          }),
        ]),
      }),
    );
  });

  test("batches flattened commands into a single mission upload", async () => {
    const service = new MAVLinkConnectionService();
    coordinateConverter.setHome(37.7749, -122.4194, 0);
    (service as any).transport = {
      isOpen: () => true,
      sendPacket: vi.fn().mockResolvedValue(undefined),
    };
    (service as any).missionPositionCache.set(1, {
      x: 0,
      y: 0,
      z: 0,
      heading: 0,
      lastUpdatedAt: Date.now(),
    });

    const commands: Command[] = [
      {
        action: "takeoff",
        params: { altitude: 5, droneId: 1 },
      },
      {
        action: "move_direction",
        params: { droneId: 1, direction: "forward", distance: 2 },
      },
      {
        action: "land",
        params: { droneId: 1 },
      },
    ];

    let capturedMissionItems: Array<{ seq: number; command: number }> = [];
    vi.spyOn(service as any, "_executeBufferedMission").mockImplementation(
      async function mockExecuteBufferedMission(this: any) {
        capturedMissionItems = this.pendingMissionItems.map((item: any) => ({
          seq: item.seq,
          command: item.command,
        }));
        this._clearMissionBuffer();
        this._clearPendingMissionTargetCache();
        this._resetMissionUploadState();
      },
    );

    const result = await service.sendCommands(commands);

    expect(result.success).toBe(true);
    expect(capturedMissionItems).toHaveLength(3);
    expect(capturedMissionItems.map((item) => item.seq)).toEqual([0, 1, 2]);
  });

  test("rejects wait commands in mission batches", async () => {
    const service = new MAVLinkConnectionService();
    (service as any).transport = {
      isOpen: () => true,
      sendPacket: vi.fn().mockResolvedValue(undefined),
    };

    const result = await service.sendCommands([
      {
        action: "wait",
        params: { duration: 1 },
      },
      {
        action: "takeoff",
        params: { altitude: 5, droneId: 1 },
      },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Mission batch does not support wait");
  });

  test("resolves mission completion when final item is reached", async () => {
    const service = new MAVLinkConnectionService();

    const completionPromise = (service as any)._awaitMissionCompletion(2, 1000);
    (service as any)._processMissionItemReached(new Uint8Array([2, 0]));

    await expect(completionPromise).resolves.toBe(2);
  });
});
