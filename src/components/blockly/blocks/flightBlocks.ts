import * as Blockly from "blockly";

Blockly.Blocks["drone_takeoff"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("🚁 드론")
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
      .appendField("이륙");
    this.appendDummyInput()
      .appendField("고도(m)")
      .appendField(new Blockly.FieldNumber(2, 0.5, 10, 0.5), "ALTITUDE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("드론을 지정된 고도로 이륙합니다.");
  },
};

Blockly.Blocks["drone_land"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("🛬 드론")
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
      .appendField("착륙");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("드론을 착륙합니다.");
  },
};

Blockly.Blocks["drone_takeoff_all"] = {
  init: function () {
    this.appendDummyInput().appendField("🚁 모든 드론 이륙");
    this.appendDummyInput()
      .appendField("고도(m)")
      .appendField(new Blockly.FieldNumber(2, 0.5, 10, 0.5), "ALTITUDE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("모든 드론을 지정된 고도로 이륙합니다.");
  },
};

Blockly.Blocks["drone_land_all"] = {
  init: function () {
    this.appendDummyInput().appendField("🛬 모든 드론 착륙");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("모든 드론을 착륙합니다.");
  },
};

Blockly.Blocks["drone_hover"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("📍 드론")
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
      .appendField("위치 유지");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("드론이 현재 위치를 유지합니다.");
  },
};

Blockly.Blocks["control_wait"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("⏱️")
      .appendField(new Blockly.FieldNumber(2, 0.1, 60, 0.1), "DURATION")
      .appendField("초 대기");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("지정된 시간 동안 다음 명령으로 넘어가지 않습니다.");
  },
};
