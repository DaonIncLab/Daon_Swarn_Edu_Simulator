const broadcastId = 999;

export const convertBlockToUnityMessage = (
  action: string,
  params: {
    direction?: string;
    distance?: number;
    droneId?: number;
    altitude?: number;
    duration?: number;
  },
) => {
  const missionItems = [];

  switch (action) {
    case "DRONE_TAKEOFF":
      missionItems.push({
        droneId: params.droneId! - 1,
        command: "up",
        distance: params.altitude,
      });
      break;

    case "DRONE_LAND":
      missionItems.push({
        droneId: params.droneId! - 1,
        command: "down",
        distance: params.distance,
      });
      break;

    case "DRONE_MOVE_DIRECTION":
      missionItems.push({
        droneId: params.droneId! - 1,
        command: params.direction,
        distance: params.distance,
      });
      break;

    case "DRONE_ROTATE":
      missionItems.push({
        droneId: params.droneId! - 1,
        command: params.direction == "CW" ? "rightrotate" : "leftrotate",
        distance: params.distance,
      });
      break;

    case "DRONE_MOVE_DIRECTION_ALL":
      missionItems.push({
        droneId: broadcastId,
        command: params.direction,
        distance: params.distance,
      });
      break;

    case "takeoff_all":
      missionItems.push({
        droneId: broadcastId,
        command: "takeoff",
        distance: params.altitude,
      });
      break;

    case "land_all":
      missionItems.push({
        droneId: broadcastId,
        command: "land",
        distance: params.distance,
      });
      break;

    case "wait":
      missionItems.push({
        droneId: broadcastId,
        command: "wait",
        distance: params.duration,
      });
  }

  return missionItems;
};
