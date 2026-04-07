import * as Blockly from "blockly";
import { FieldColourHsvSliders } from "@blockly/field-colour-hsv-sliders";

export function registerGroupBlocks() {
  Blockly.Blocks["group_formation"] = {
    init: function () {
      this.appendDummyInput().appendField("모든 드론");
      this.appendDummyInput()
        .appendField(
          new Blockly.FieldDropdown([
            ["삼각", "triangle"],
            ["사각", "square"],
            ["별", "star"],
            ["화살표", "arrow"],
            ["격자", "grid"],
            ["브이", "v_shape"],
          ]),
          "FORMATION",
        )
        .appendField("대형");
      this.appendDummyInput().appendField("적용");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(250);
      this.setTooltip("군집 비행 대형을 설정합니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["group_led_color"] = {
    init: function () {
      this.appendDummyInput().appendField("모든 드론 LED 색상");
      this.appendDummyInput()
        .appendField(new FieldColourHsvSliders("#ff0000"), "COLOUR")
        .appendField("변경");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(250);
      this.setTooltip("군집 LED 색상을 변경합니다.");
      this.setHelpUrl("");
    },
  };
}
