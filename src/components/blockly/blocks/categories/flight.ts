import * as Blockly from "blockly";

export function registerFlightBlocks() {
  Blockly.Blocks["drone_takeoff"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("드론")
        .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
        .appendField("이륙");
      this.appendDummyInput()
        .appendField("고도(m)")
        .appendField(new Blockly.FieldNumber(2, 0.5, 10, 0.5), "ALTITUDE");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("드론을 지정한 고도로 이륙시킵니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["drone_land"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("드론")
        .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
        .appendField("착륙");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("드론을 착륙시킵니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["drone_takeoff_all"] = {
    init: function () {
      this.appendDummyInput().appendField("모든 드론 이륙");
      this.appendDummyInput()
        .appendField("고도(m)")
        .appendField(new Blockly.FieldNumber(2, 0.5, 10, 0.5), "ALTITUDE");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("모든 드론을 지정한 고도로 이륙시킵니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["drone_land_all"] = {
    init: function () {
      this.appendDummyInput().appendField("모든 드론 착륙");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("모든 드론을 착륙시킵니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["drone_hover"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("드론")
        .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
        .appendField("위치 유지");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("드론이 현재 위치와 자세를 유지합니다.");
      this.setHelpUrl("");
    },
  };
}
