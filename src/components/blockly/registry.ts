export type BlocklyCategoryId =
  | "flight"
  | "movement"
  | "group"
  | "control"
  | "variables_logic"
  | "settings";

export interface BlocklyCategoryDefinition {
  id: BlocklyCategoryId;
  name: string;
  colour: string;
}

export interface BlocklyBlockMetadata {
  type: string;
  category: BlocklyCategoryId;
  displayName: string;
  defaultFields?: Record<string, string | number>;
  planMapping: string;
  status: "active" | "advanced" | "hidden";
}

export const blockCategories: BlocklyCategoryDefinition[] = [
  { id: "flight", name: "🚁 비행", colour: "230" },
  { id: "movement", name: "➡️ 이동", colour: "160" },
  { id: "group", name: "🤝 군집", colour: "250" },
  { id: "control", name: "🔁 제어", colour: "210" },
  { id: "variables_logic", name: "📦 변수·판단", colour: "120" },
  { id: "settings", name: "⚙️ 설정", colour: "330" },
];

export const blockRegistry: BlocklyBlockMetadata[] = [
  {
    type: "drone_takeoff",
    category: "flight",
    displayName: "개별 이륙",
    defaultFields: { DRONE_ID: 1, ALTITUDE: 2 },
    planMapping: "takeoff",
    status: "active",
  },
  {
    type: "drone_land",
    category: "flight",
    displayName: "개별 착륙",
    defaultFields: { DRONE_ID: 1 },
    planMapping: "land",
    status: "active",
  },
  {
    type: "drone_takeoff_all",
    category: "flight",
    displayName: "전체 이륙",
    defaultFields: { ALTITUDE: 2 },
    planMapping: "takeoff_all",
    status: "active",
  },
  {
    type: "drone_land_all",
    category: "flight",
    displayName: "전체 착륙",
    planMapping: "land_all",
    status: "active",
  },
  {
    type: "drone_hover",
    category: "flight",
    displayName: "위치 유지",
    defaultFields: { DRONE_ID: 1 },
    planMapping: "hover",
    status: "active",
  },
  {
    type: "control_wait",
    category: "flight",
    displayName: "대기",
    defaultFields: { DURATION: 2 },
    planMapping: "wait",
    status: "active",
  },
  {
    type: "drone_move_direction_all",
    category: "movement",
    displayName: "전체 방향 이동",
    defaultFields: { DIRECTION: "forward", DISTANCE: 3 },
    planMapping: "move_direction_all",
    status: "active",
  },
  {
    type: "drone_move_direction",
    category: "movement",
    displayName: "개별 방향 이동",
    defaultFields: { DRONE_ID: 1, DIRECTION: "forward", DISTANCE: 1 },
    planMapping: "move_direction",
    status: "active",
  },
  {
    type: "drone_move_xyz",
    category: "movement",
    displayName: "좌표 이동",
    defaultFields: { DRONE_ID: 1, X: 0, Y: 0, Z: 0 },
    planMapping: "move_drone",
    status: "active",
  },
  {
    type: "drone_rotate",
    category: "movement",
    displayName: "회전",
    defaultFields: { DRONE_ID: 1, DIRECTION: "CW", DEGREES: 90 },
    planMapping: "rotate",
    status: "active",
  },
  {
    type: "group_formation",
    category: "group",
    displayName: "대형 비행",
    defaultFields: { FORMATION: "triangle" },
    planMapping: "set_formation",
    status: "active",
  },
  {
    type: "group_led_color",
    category: "group",
    displayName: "LED 색상",
    defaultFields: { COLOUR: "#ff0000" },
    planMapping: "set_led_color",
    status: "active",
  },
  {
    type: "control_repeat",
    category: "control",
    displayName: "반복",
    defaultFields: { TIMES: 3 },
    planMapping: "repeat",
    status: "active",
  },
  {
    type: "control_for",
    category: "control",
    displayName: "For 반복",
    defaultFields: { FROM: 1, TO: 10, BY: 1 },
    planMapping: "for_loop",
    status: "active",
  },
  {
    type: "control_if",
    category: "control",
    displayName: "조건문",
    planMapping: "if",
    status: "active",
  },
  {
    type: "control_if_else",
    category: "control",
    displayName: "조건문 분기",
    planMapping: "if_else",
    status: "active",
  },
  {
    type: "control_while",
    category: "control",
    displayName: "While 반복",
    planMapping: "while_loop",
    status: "advanced",
  },
  {
    type: "var_set",
    category: "variables_logic",
    displayName: "변수 저장",
    planMapping: "variable_set",
    status: "active",
  },
  {
    type: "var_get",
    category: "variables_logic",
    displayName: "변수 읽기",
    planMapping: "variable_get",
    status: "active",
  },
  {
    type: "math_arithmetic",
    category: "variables_logic",
    displayName: "수식",
    defaultFields: { OP: "ADD" },
    planMapping: "math_expr",
    status: "active",
  },
  {
    type: "math_number",
    category: "variables_logic",
    displayName: "숫자",
    defaultFields: { NUM: 0 },
    planMapping: "number",
    status: "active",
  },
  {
    type: "logic_compare",
    category: "variables_logic",
    displayName: "비교",
    defaultFields: { OP: "GT" },
    planMapping: "logic_compare",
    status: "active",
  },
  {
    type: "logic_operation",
    category: "variables_logic",
    displayName: "논리 연산",
    defaultFields: { OP: "AND" },
    planMapping: "logic_operation",
    status: "active",
  },
  {
    type: "logic_negate",
    category: "variables_logic",
    displayName: "부정",
    planMapping: "logic_negate",
    status: "active",
  },
  {
    type: "logic_boolean",
    category: "variables_logic",
    displayName: "참/거짓",
    defaultFields: { BOOL: "TRUE" },
    planMapping: "logic_boolean",
    status: "active",
  },
  {
    type: "sensor_battery",
    category: "variables_logic",
    displayName: "배터리",
    defaultFields: { DRONE_ID: 1 },
    planMapping: "sensor_battery",
    status: "active",
  },
  {
    type: "sensor_altitude",
    category: "variables_logic",
    displayName: "고도",
    defaultFields: { DRONE_ID: 1 },
    planMapping: "sensor_altitude",
    status: "active",
  },
  {
    type: "sensor_pitch",
    category: "variables_logic",
    displayName: "Pitch",
    defaultFields: { DRONE_ID: 1 },
    planMapping: "sensor_pitch",
    status: "advanced",
  },
  {
    type: "sensor_roll",
    category: "variables_logic",
    displayName: "Roll",
    defaultFields: { DRONE_ID: 1 },
    planMapping: "sensor_roll",
    status: "advanced",
  },
  {
    type: "sensor_yaw",
    category: "variables_logic",
    displayName: "Yaw",
    defaultFields: { DRONE_ID: 1 },
    planMapping: "sensor_yaw",
    status: "advanced",
  },
  {
    type: "sensor_flight_time",
    category: "variables_logic",
    displayName: "비행 시간",
    defaultFields: { DRONE_ID: 1 },
    planMapping: "sensor_flight_time",
    status: "advanced",
  },
  {
    type: "drone_set_speed",
    category: "settings",
    displayName: "드론 속도",
    defaultFields: { SPEED: 2 },
    planMapping: "scenario_speed",
    status: "active",
  },
  {
    type: "drone_rc_control",
    category: "settings",
    displayName: "RC 제어",
    planMapping: "removed",
    status: "hidden",
  },
  {
    type: "mission_add_waypoint",
    category: "settings",
    displayName: "웨이포인트 추가",
    planMapping: "removed",
    status: "hidden",
  },
  {
    type: "mission_goto_waypoint",
    category: "settings",
    displayName: "웨이포인트 이동",
    planMapping: "removed",
    status: "hidden",
  },
  {
    type: "mission_execute",
    category: "settings",
    displayName: "미션 실행",
    planMapping: "removed",
    status: "hidden",
  },
  {
    type: "mission_clear",
    category: "settings",
    displayName: "미션 초기화",
    planMapping: "removed",
    status: "hidden",
  },
];

export function getCategoryBlocks(categoryId: BlocklyCategoryId) {
  return blockRegistry
    .filter(
      (block) => block.category === categoryId && block.status === "active",
    )
    .map((block) => ({
      kind: "block" as const,
      type: block.type,
      fields: block.defaultFields,
    }));
}
