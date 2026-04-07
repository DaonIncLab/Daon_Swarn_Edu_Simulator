import * as Blockly from "blockly";

export function registerSettingsBlocks() {
  Blockly.Blocks["drone_set_speed"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("시나리오 속도")
        .appendField(new Blockly.FieldNumber(2, 0.5, 10, 0.5), "SPEED")
        .appendField("m/s");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
      this.setTooltip("이후 이동 명령에 적용되는 시나리오 전역 속도를 설정합니다.");
      this.setHelpUrl("");
    },
  };
}
