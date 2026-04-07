import { log } from "@/utils/logger";

import "./flightBlocks";
import "./movementBlocks";
import "./groupBlocks";
import "./controlBlocks";
import "./variablesLogicBlocks";
import "./settingsBlocks";

export function registerDroneBlocks() {
  log.info("Scenario-oriented Blockly blocks registered", {
    context: "droneBlocks",
  });
}
