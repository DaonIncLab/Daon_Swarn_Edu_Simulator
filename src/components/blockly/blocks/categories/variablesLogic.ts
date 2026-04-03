import * as Blockly from "blockly";

export function registerVariablesLogicBlocks() {
  Blockly.Blocks["var_set"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("변수")
        .appendField(new Blockly.FieldVariable("value"), "VAR")
        .appendField("=");
      this.appendValueInput("VALUE").setCheck("Number");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("변수에 값을 저장합니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["var_get"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("변수")
        .appendField(new Blockly.FieldVariable("value"), "VAR");
      this.setOutput(true, "Number");
      this.setColour(120);
      this.setTooltip("변수 값을 가져옵니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["math_arithmetic"] = {
    init: function () {
      this.appendValueInput("A").setCheck("Number");
      this.appendDummyInput().appendField(
        new Blockly.FieldDropdown([
          ["+", "ADD"],
          ["-", "MINUS"],
          ["x", "MULTIPLY"],
          ["/", "DIVIDE"],
        ]),
        "OP",
      );
      this.appendValueInput("B").setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setColour(120);
      this.setTooltip("수식을 계산합니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["math_number"] = {
    init: function () {
      this.appendDummyInput().appendField(new Blockly.FieldNumber(0), "NUM");
      this.setOutput(true, "Number");
      this.setColour(120);
      this.setTooltip("숫자 값입니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["logic_compare"] = {
    init: function () {
      this.appendValueInput("A").setCheck("Number");
      this.appendDummyInput().appendField(
        new Blockly.FieldDropdown([
          ["=", "EQ"],
          ["!=", "NEQ"],
          ["<", "LT"],
          ["<=", "LTE"],
          [">", "GT"],
          [">=", "GTE"],
        ]),
        "OP",
      );
      this.appendValueInput("B").setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setColour(120);
      this.setTooltip("두 값을 비교합니다.");
      this.setHelpUrl("");
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
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["logic_negate"] = {
    init: function () {
      this.appendValueInput("BOOL").setCheck("Boolean").appendField("NOT");
      this.setOutput(true, "Boolean");
      this.setColour(120);
      this.setTooltip("참/거짓을 반전합니다.");
      this.setHelpUrl("");
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
      this.setTooltip("불리언 리터럴입니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["sensor_battery"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("드론")
        .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
        .appendField("배터리(%)");
      this.setOutput(true, "Number");
      this.setColour(120);
      this.setTooltip("드론 배터리 값을 반환합니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["sensor_altitude"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("드론")
        .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
        .appendField("고도(m)");
      this.setOutput(true, "Number");
      this.setColour(120);
      this.setTooltip("드론 고도 값을 반환합니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["sensor_pitch"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("드론")
        .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
        .appendField("Pitch");
      this.setOutput(true, "Number");
      this.setColour(120);
      this.setTooltip("고급 블록: 드론 Pitch를 반환합니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["sensor_roll"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("드론")
        .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
        .appendField("Roll");
      this.setOutput(true, "Number");
      this.setColour(120);
      this.setTooltip("고급 블록: 드론 Roll을 반환합니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["sensor_yaw"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("드론")
        .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
        .appendField("Yaw");
      this.setOutput(true, "Number");
      this.setColour(120);
      this.setTooltip("고급 블록: 드론 Yaw를 반환합니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["sensor_flight_time"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("드론")
        .appendField(new Blockly.FieldNumber(1, 1, 100, 1), "DRONE_ID")
        .appendField("비행 시간(초)");
      this.setOutput(true, "Number");
      this.setColour(120);
      this.setTooltip("고급 블록: 드론 비행 시간을 반환합니다.");
      this.setHelpUrl("");
    },
  };
}
