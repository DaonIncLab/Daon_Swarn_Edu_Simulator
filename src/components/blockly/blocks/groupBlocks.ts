import * as Blockly from "blockly";
import { FieldColourHsvSliders } from "@blockly/field-colour-hsv-sliders";

Blockly.Blocks["group_formation"] = {
  init: function () {
    this.appendDummyInput().appendField("🤝 모든 드론");
    this.appendDummyInput()
      .appendField(
        new Blockly.FieldDropdown([
          ["🔺 삼각", "triangle"],
          ["🟧 사각", "square"],
          ["⭐ 별", "star"],
          ["➡️ 화살표", "arrow"],
          ["🧩 격자", "grid"],
          ["✅ 브이", "v_shape"],
        ]),
        "FORMATION",
      )
      .appendField("대형 비행");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(250);
    this.setTooltip("모든 드론을 지정한 대형으로 정렬합니다.");
  },
};

Blockly.Blocks["group_led_color"] = {
  init: function () {
    this.appendDummyInput().appendField("🤝 모든 드론 LED 색상");
    this.appendDummyInput()
      .appendField(new FieldColourHsvSliders("#ff0000"), "COLOUR")
      .appendField("변경");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(250);
    this.setTooltip("모든 드론의 LED 색상을 변경합니다.");
  },
};
