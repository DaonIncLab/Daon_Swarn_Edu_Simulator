import * as Blockly from "blockly";

Blockly.Blocks["var_set"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("📦 변수")
      .appendField(new Blockly.FieldVariable("altitude"), "VAR")
      .appendField("=");
    this.appendValueInput("VALUE").setCheck("Number");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("변수에 값을 저장합니다.");
  },
};

Blockly.Blocks["var_get"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("📦")
      .appendField(new Blockly.FieldVariable("altitude"), "VAR");
    this.setOutput(true, "Number");
    this.setColour(120);
    this.setTooltip("변수 값을 읽습니다.");
  },
};

Blockly.Blocks["math_arithmetic"] = {
  init: function () {
    this.appendValueInput("A").setCheck("Number");
    this.appendDummyInput().appendField(
      new Blockly.FieldDropdown([
        ["+", "ADD"],
        ["-", "MINUS"],
        ["×", "MULTIPLY"],
        ["÷", "DIVIDE"],
      ]),
      "OP",
    );
    this.appendValueInput("B").setCheck("Number");
    this.setInputsInline(true);
    this.setOutput(true, "Number");
    this.setColour(120);
    this.setTooltip("수식을 계산합니다.");
  },
};

Blockly.Blocks["math_number"] = {
  init: function () {
    this.appendDummyInput().appendField(new Blockly.FieldNumber(0), "NUM");
    this.setOutput(true, "Number");
    this.setColour(120);
    this.setTooltip("숫자 값입니다.");
  },
};

Blockly.Blocks["logic_compare"] = {
  init: function () {
    this.appendValueInput("A").setCheck("Number");
    this.appendDummyInput().appendField(
      new Blockly.FieldDropdown([
        ["=", "EQ"],
        ["≠", "NEQ"],
        ["<", "LT"],
        ["≤", "LTE"],
        [">", "GT"],
        ["≥", "GTE"],
      ]),
      "OP",
    );
    this.appendValueInput("B").setCheck("Number");
    this.setInputsInline(true);
    this.setOutput(true, "Boolean");
    this.setColour(120);
    this.setTooltip("두 값을 비교합니다.");
  },
};

Blockly.Blocks["logic_operation"] = {
  init: function () {
    this.appendValueInput("A").setCheck("Boolean");
    this.appendDummyInput().appendField(
      new Blockly.FieldDropdown([
        ["AND", "AND"],
        ["OR", "OR"],
      ]),
      "OP",
    );
    this.appendValueInput("B").setCheck("Boolean");
    this.setInputsInline(true);
    this.setOutput(true, "Boolean");
    this.setColour(120);
    this.setTooltip("논리 연산을 수행합니다.");
  },
};

Blockly.Blocks["logic_negate"] = {
  init: function () {
    this.appendValueInput("BOOL").setCheck("Boolean").appendField("NOT");
    this.setOutput(true, "Boolean");
    this.setColour(120);
    this.setTooltip("조건을 반전합니다.");
  },
};

Blockly.Blocks["logic_boolean"] = {
  init: function () {
    this.appendDummyInput().appendField(
      new Blockly.FieldDropdown([
        ["참", "TRUE"],
        ["거짓", "FALSE"],
      ]),
      "BOOL",
    );
    this.setOutput(true, "Boolean");
    this.setColour(120);
    this.setTooltip("참 또는 거짓 값입니다.");
  },
};

Blockly.Blocks["sensor_battery"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("🔋 드론")
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
      .appendField("배터리 (%)");
    this.setOutput(true, "Number");
    this.setColour(120);
    this.setTooltip("드론의 배터리를 읽습니다.");
  },
};

Blockly.Blocks["sensor_altitude"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("📏 드론")
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
      .appendField("고도 (m)");
    this.setOutput(true, "Number");
    this.setColour(120);
    this.setTooltip("드론의 고도를 읽습니다.");
  },
};

Blockly.Blocks["sensor_pitch"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("📐 드론")
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
      .appendField("Pitch (°)");
    this.setOutput(true, "Number");
    this.setColour(120);
    this.setTooltip("고급 센서 블록입니다.");
  },
};

Blockly.Blocks["sensor_roll"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("📐 드론")
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
      .appendField("Roll (°)");
    this.setOutput(true, "Number");
    this.setColour(120);
    this.setTooltip("고급 센서 블록입니다.");
  },
};

Blockly.Blocks["sensor_yaw"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("📐 드론")
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
      .appendField("Yaw (°)");
    this.setOutput(true, "Number");
    this.setColour(120);
    this.setTooltip("고급 센서 블록입니다.");
  },
};

Blockly.Blocks["sensor_flight_time"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("⏱️ 드론")
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
      .appendField("비행 시간 (초)");
    this.setOutput(true, "Number");
    this.setColour(120);
    this.setTooltip("고급 센서 블록입니다.");
  },
};
