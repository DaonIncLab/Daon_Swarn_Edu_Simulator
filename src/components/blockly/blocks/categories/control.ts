import * as Blockly from "blockly";

export function registerControlBlocks() {
  Blockly.Blocks["control_wait"] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldNumber(2, 0.1, 60, 0.1), "DURATION")
        .appendField("초 대기");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("지정한 시간 동안 다음 시나리오 단계로 진행하지 않습니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["control_repeat"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("반복")
        .appendField(new Blockly.FieldNumber(3, 1, 100, 1), "TIMES")
        .appendField("번");
      this.appendStatementInput("DO").appendField("실행");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("블록들을 지정 횟수만큼 반복합니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["control_for"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("For")
        .appendField(new Blockly.FieldVariable("i"), "VAR")
        .appendField("=")
        .appendField(new Blockly.FieldNumber(1, -100, 100, 1), "FROM")
        .appendField("부터");
      this.appendDummyInput()
        .appendField(new Blockly.FieldNumber(10, -100, 100, 1), "TO")
        .appendField("까지")
        .appendField(new Blockly.FieldNumber(1, 1, 10, 1), "BY")
        .appendField("씩");
      this.appendStatementInput("DO").appendField("실행");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("변수를 사용하는 반복문입니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["control_if"] = {
    init: function () {
      this.appendValueInput("CONDITION").setCheck("Boolean").appendField("만약");
      this.appendStatementInput("DO_IF").appendField("이면 실행");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("조건이 참일 때 실행합니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["control_if_else"] = {
    init: function () {
      this.appendValueInput("CONDITION").setCheck("Boolean").appendField("만약");
      this.appendStatementInput("DO_IF").appendField("이면 실행");
      this.appendStatementInput("DO_ELSE").appendField("아니면 실행");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("조건에 따라 실행 분기를 선택합니다.");
      this.setHelpUrl("");
    },
  };

  Blockly.Blocks["control_while"] = {
    init: function () {
      this.appendValueInput("CONDITION")
        .setCheck("Boolean")
        .appendField("While");
      this.appendStatementInput("DO").appendField("조건이 참인 동안");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("고급 블록: 조건이 참인 동안 반복합니다.");
      this.setHelpUrl("");
    },
  };
}
