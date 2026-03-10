const broadcastId = 999;

export const convertBlockToUnityMessage = (
  action: string,
  params: {
    direction?: string;
    distance?: number;
    droneId?: number;
    altitude?: number;
    duration?: number;
    x?: number;
    y?: number;
    z?: number;
    speed?: number;
    r?: number;
    g?: number;
    b?: number;
    formation?: string;
  },
) => {
  const missionItems = [];

  switch (action) {
    case "takeoff":
      missionItems.push({
        droneId: params.droneId! - 1,
        command: "up",
        distance: params.altitude,
      });
      break;

    case "land":
      missionItems.push({
        droneId: params.droneId! - 1,
        command: "down",
        distance: params.distance,
      });
      break;

    case "move_direction":
      missionItems.push({
        droneId: params.droneId! - 1,
        command: params.direction,
        distance: params.distance,
      });
      break;

    case "rotate":
      missionItems.push({
        droneId: params.droneId! - 1,
        command: params.direction == "CW" ? "rightrotate" : "leftrotate",
        distance: params.distance,
      });
      break;

    case "move_direction_all":
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
      break;

    case "hover":
      missionItems.push({
        droneId: params.droneId! - 1,
        command: "hover",
        distance: 0,
      });
      break;

    case "emergency":
      missionItems.push({
        droneId: params.droneId! - 1,
        command: "emergencystop",
        distance: 0,
      });
      break;

    case "move_xyz":
      missionItems.push({
        droneId: params.droneId! - 1,
        command: "moveto",
        distance: params.speed,
        hasTarget: true,
        x: params.x,
        y: params.y,
        z: params.z,
      });
      break;

    case "set_led_color":
      missionItems.push({
        droneId: broadcastId,
        commnad: "ledcolor",
        distance: 0,
        hasColor: true,
        r: params.r,
        g: params.g,
        b: params.b,
      });
      break;

    case "set_formation":
      missionItems.push({
        droneId: broadcastId,
        command: convertUnityFormation(params.formation!),
        distance: 0,
      });
  }

  return missionItems;
};

const convertUnityFormation = (formation: string) => {
  switch (formation) {
    case "grid":
      return "formgrid";
    case "v_shape":
      return "formv";
    case "triangle":
      return "formtriangle";
    case "square":
      return "formsquare";
    case "arrow":
      return "formarrow";
    case "star":
      return "formstar";
  }
};
