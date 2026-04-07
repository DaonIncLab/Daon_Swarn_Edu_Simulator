import * as Blockly from "blockly";

const directionOptions: [string, string][] = [
  ["위로 ⬆️", "up"],
  ["아래로 ⬇️", "down"],
  ["왼쪽 ⬅️", "left"],
  ["오른쪽 ➡️", "right"],
  ["앞으로 ⬆️", "forward"],
  ["뒤로 ⬇️", "backward"],
];

Blockly.Blocks["drone_move_direction"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("➡️ 드론")
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID");
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown(directionOptions), "DIRECTION")
      .appendField("이동");
    this.appendDummyInput()
      .appendField("거리(m)")
      .appendField(new Blockly.FieldNumber(1, 0.2, 20, 0.1), "DISTANCE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setTooltip("드론을 지정한 방향으로 상대 이동합니다.");
  },
};

Blockly.Blocks["drone_move_direction_all"] = {
  init: function () {
    this.appendDummyInput().appendField("➡️ 모든 드론");
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown(directionOptions), "DIRECTION")
      .appendField("이동");
    this.appendDummyInput()
      .appendField("거리(m)")
      .appendField(new Blockly.FieldNumber(1, 0.2, 20, 0.1), "DISTANCE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setTooltip("모든 드론을 지정한 방향으로 상대 이동합니다.");
  },
};

Blockly.Blocks["drone_move_xyz"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("🎯 드론")
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
      .appendField("좌표 이동");
    this.appendDummyInput()
      .appendField("X:")
      .appendField(new Blockly.FieldNumber(0, -50, 50, 0.1), "X")
      .appendField("Y:")
      .appendField(new Blockly.FieldNumber(0, -50, 50, 0.1), "Y")
      .appendField("Z:")
      .appendField(new Blockly.FieldNumber(0, -20, 20, 0.1), "Z");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setTooltip("드론을 XYZ 상대 좌표로 이동합니다.");
  },
};

Blockly.Blocks["drone_rotate"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("🔄 드론")
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
      .appendField("회전");
    this.appendDummyInput().appendField(
      new Blockly.FieldDropdown([
        ["시계방향 ↻", "CW"],
        ["반시계방향 ↺", "CCW"],
      ]),
      "DIRECTION",
    );
    this.appendDummyInput()
      .appendField("각도(°)")
      .appendField(new Blockly.FieldNumber(90, 1, 360, 1), "DEGREES");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setTooltip("드론을 제자리에서 회전합니다.");
  },
};
