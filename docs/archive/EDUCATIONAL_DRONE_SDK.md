# Educational Drone SDK Reference

교육용 드론의 SDK 명령어 레퍼런스 문서입니다. 이 문서는 DJI Tello, Parrot Mambo, HighGreat Fylo EDU 드론의 제어 명령어를 정리합니다.

## Table of Contents

- [DJI Tello SDK](#dji-tello-sdk)
  - [Connection & Setup](#connection--setup)
  - [Flight Control](#flight-control)
  - [Movement Commands](#movement-commands)
  - [Flip Maneuvers](#flip-maneuvers)
  - [Telemetry & State](#telemetry--state)
  - [Video Control](#video-control)
  - [Mission Pads (EDU)](#mission-pads-edu)
  - [Network & Configuration](#network--configuration)
- [Parrot Mambo SDK](#parrot-mambo-sdk)
  - [Connection & Setup](#connection--setup-1)
  - [Takeoff & Landing](#takeoff--landing)
  - [Flight Control](#flight-control-1)
  - [Accessories](#accessories)
  - [Camera](#camera)
  - [Sensor Management](#sensor-management)
  - [Utilities](#utilities)
- [HighGreat Fylo EDU SDK](#highgreat-fylo-edu-sdk)
  - [Overview](#overview)
  - [Connection & Setup](#connection--setup-2)
  - [Event Blocks](#event-blocks)
  - [Flight Operations](#flight-operations)
  - [Movement & Navigation](#movement--navigation)
  - [Advanced Features](#advanced-features)
  - [Light & LED Control](#light--led-control)
  - [Camera & Media](#camera--media)
  - [Control & Status](#control--status)

---

## DJI Tello SDK

DJI Tello는 3가지 SDK 버전이 있습니다:
- **SDK 1.3**: 일반 Tello 지원
- **SDK 2.0**: Tello EDU 지원 (SDK 1.3 포함)
- **SDK 3.0**: Tello EDU/Talent 지원 (SDK 2.0 포함)

Python 라이브러리: [DJITelloPy](https://github.com/damiafuentes/DJITelloPy)

### Connection & Setup

| 명령어 | 설명 |
|--------|------|
| `connect()` | SDK 모드로 진입 (드론 제어 전 필수) |
| `end()` | Tello 객체 종료 |
| `send_keepalive()` | 15초 후 자동 착륙 방지 |

### Flight Control

| 명령어 | 설명 |
|--------|------|
| `takeoff()` | 자동 이륙 |
| `land()` | 자동 착륙 |
| `initiate_throw_takeoff()` | 던지기 이륙 (5초 내) |
| `emergency()` | 긴급 정지 (모든 모터 즉시 정지) |
| `turn_motor_on()` | 모터 켜기 (냉각용) |
| `turn_motor_off()` | 모터 끄기 |

### Movement Commands

| 명령어 | 파라미터 | 설명 |
|--------|----------|------|
| `move_up(x)` | 20-500 cm | 위로 이동 |
| `move_down(x)` | 20-500 cm | 아래로 이동 |
| `move_left(x)` | 20-500 cm | 왼쪽으로 이동 |
| `move_right(x)` | 20-500 cm | 오른쪽으로 이동 |
| `move_forward(x)` | 20-500 cm | 앞으로 이동 |
| `move_back(x)` | 20-500 cm | 뒤로 이동 |
| `rotate_clockwise(x)` | 1-360 degrees | 시계방향 회전 |
| `rotate_counter_clockwise(x)` | 1-360 degrees | 반시계방향 회전 |
| `go_xyz_speed(x, y, z, speed)` | x,y,z: -500~500 cm<br>speed: 10-100 cm/s | 상대 좌표로 이동 |
| `curve_xyz_speed(x1, y1, z1, x2, y2, z2, speed)` | 두 점 사이 곡선 비행 | 곡선 경로로 비행 |

### Flip Maneuvers

| 명령어 | 설명 |
|--------|------|
| `flip_left()` | 왼쪽 플립 |
| `flip_right()` | 오른쪽 플립 |
| `flip_forward()` | 앞쪽 플립 |
| `flip_back()` | 뒤쪽 플립 |

### Telemetry & State

| 명령어 | 반환값 | 설명 |
|--------|--------|------|
| `get_battery()` | 0-100% | 배터리 잔량 |
| `get_height()` | cm | 현재 높이 |
| `get_distance_tof()` | cm | ToF 센서 거리 |
| `get_temperature()` | °C | 평균 온도 |
| `get_pitch()` | degrees | 피치 각도 |
| `get_roll()` | degrees | 롤 각도 |
| `get_yaw()` | degrees | 요 각도 |
| `get_flight_time()` | seconds | 비행 시간 |

### Video Control

| 명령어 | 설명 |
|--------|------|
| `streamon()` | 비디오 스트리밍 활성화 |
| `streamoff()` | 비디오 스트리밍 비활성화 |
| `set_video_bitrate(rate)` | 비트레이트 설정 (auto, 1-5 Mbps) |
| `set_video_fps(fps)` | 프레임레이트 설정 (5, 15, 30 fps) |
| `set_video_resolution(resolution)` | 해상도 설정 (480p, 720p) |
| `set_video_direction(direction)` | 카메라 방향 전환 (forward/downward) |

### Mission Pads (EDU)

Tello EDU 모델에서만 지원되는 미션 패드 관련 기능입니다.

| 명령어 | 설명 |
|--------|------|
| `enable_mission_pads()` | 미션 패드 감지 활성화 |
| `disable_mission_pads()` | 미션 패드 감지 비활성화 |
| `set_mission_pad_detection_direction(direction)` | 감지 방향 설정 (0: 하향, 1: 전방, 2: 양방향) |
| `get_mission_pad_id()` | 미션 패드 ID 반환 |
| `get_mission_pad_distance_x()` | 미션 패드와의 X 거리 |
| `get_mission_pad_distance_y()` | 미션 패드와의 Y 거리 |
| `get_mission_pad_distance_z()` | 미션 패드와의 Z 거리 |

### Network & Configuration

| 명령어 | 설명 |
|--------|------|
| `set_wifi_credentials(ssid, password)` | WiFi 설정 구성 |
| `connect_to_wifi(ssid, password)` | WiFi 네트워크 연결 (EDU 전용) |
| `set_speed(speed)` | 비행 속도 설정 (10-100 cm/s) |
| `send_rc_control(roll, pitch, yaw, throttle)` | RC 제어 값 전송 (4채널) |

---

## Parrot Mambo SDK

Parrot Mambo는 BLE(Bluetooth Low Energy) 또는 WiFi를 통해 제어할 수 있는 교육용 미니드론입니다.

Python 라이브러리: [pyparrot](https://github.com/amymcgovern/pyparrot)

### Connection & Setup

| 명령어 | 파라미터 | 설명 |
|--------|----------|------|
| `Mambo(address, use_wifi)` | address: 하드웨어 주소<br>use_wifi: True/False | Mambo 객체 생성 (기본값: BLE) |
| `connect(num_retries)` | 재시도 횟수 | BLE 또는 WiFi로 연결 |
| `disconnect()` | - | 연결 종료 |

### Takeoff & Landing

| 명령어 | 설명 |
|--------|------|
| `safe_takeoff()` | 권장 이륙 방법 (비행 상태 모니터링) |
| `safe_land()` | 권장 착륙 방법 (착륙 상태 확인) |
| `takeoff()` | 단일 이륙 명령 (권장하지 않음) |
| `land()` | 단일 착륙 명령 (권장하지 않음) |
| `turn_on_auto_takeoff()` | 던지기 모드 활성화 |

### Flight Control

| 명령어 | 파라미터 | 설명 |
|--------|----------|------|
| `hover()` | - | 호버링 (제자리 비행) |
| `set_flat_trim()` | - | 플랫 트림으로 안정화 |
| `flip(direction)` | front, back, right, left | 플립 실행 |
| `turn_degrees(degrees)` | -180~180 degrees | 제자리 회전 |
| `fly_direct(roll, pitch, yaw, vertical)` | 각 -100~100% | 수동 제어 (roll, pitch, yaw, vertical) |
| `set_max_tilt(degrees)` | degrees | 최대 기울기 설정 |
| `set_max_vertical_speed(speed)` | m/s | 최대 수직 속도 설정 |

### Accessories

Mambo는 집게(Claw)와 총(Gun) 액세서리를 지원합니다.

| 명령어 | 설명 |
|--------|------|
| `open_claw()` | 집게 열기 |
| `close_claw()` | 집게 닫기 |
| `fire_gun()` | 총 발사 |

### Camera

Mambo의 하향 카메라를 통한 사진 촬영 기능입니다.

| 명령어 | 설명 |
|--------|------|
| `take_picture()` | 하향 카메라로 사진 촬영 |
| `get_groundcam_pictures_names()` | 저장된 사진 목록 반환 |
| `get_groundcam_picture(name)` | 특정 사진 가져오기 |

### Sensor Management

| 명령어 | 설명 |
|--------|------|
| `ask_for_state_update()` | 모든 드론 상태 데이터 요청 (액세서리 상태 포함) |
| `set_user_sensor_callback(function)` | 센서 업데이트 콜백 함수 설정 |

### Utilities

| 명령어 | 설명 |
|--------|------|
| `smart_sleep(seconds)` | 스레드 안전 대기 (BLE 알림 지원) |

### Swing-Specific Commands

Parrot Swing(Mambo 변형) 전용 명령어입니다.

| 명령어 | 파라미터 | 설명 |
|--------|----------|------|
| `set_plane_gear_box(mode)` | gear_1, gear_2, gear_3 | Swing 각도 조정 |
| `set_flying_mode(mode)` | quadricopter, plane | 비행 모드 전환 |

---

## HighGreat Fylo EDU SDK

HighGreat Fylo EDU는 편대 비행(Formation Flight)을 지원하는 교육용 드론으로, Scratch와 Python 프로그래밍을 모두 지원합니다.

### Overview

- **제조사**: HighGreat (高巨创新科技 / Shenzhen Gaoju Innovation Technology)
- **지원 언어**: Scratch (블록 코딩), Python
- **연결 방식**: WiFi / Ground Repeater (지상 중계기)
- **특징**:
  - 실내외 비행 가능
  - 무선 위치 측정 시스템 (별도 인프라 불필요)
  - 편대 비행 및 군집 제어
  - 풀컬러 LED 라이트 쇼
  - QR 코드 및 컬러 추적
  - AI 비전 기능 (Hula 모델)

Python 라이브러리: [pyfylo](https://pypi.org/project/pyfylo/) (활성화 필요)

### Connection & Setup

| 명령어 | 설명 |
|--------|------|
| `pip install pyfylo` | pyfylo 패키지 설치 (Python ≥3.6, Windows x64) |
| `import pyfylo` | 모듈 임포트 |
| `api = pyfylo.UserApi()` | UserApi 객체 생성 (시리얼 포트 연결) |
| `pyfylo.get_version()` | 버전 확인 |

**중요**: pyfylo는 사용 전 활성화가 필요합니다. 제조사(highgreat@hg-fly.com)에 연락하여 활성화 도구와 완전한 문서를 요청해야 합니다.

### Event Blocks

Scratch/블록 코딩 모드에서 사용하는 이벤트 블록입니다.

| 블록 명령어 | 설명 |
|-----------|------|
| When [icon] clicked | 실행 버튼 클릭 시 프로그램 시작 |
| When [space] key pressed | 특정 키 입력 시 실행 |
| When I receive [message] | 브로드캐스트 메시지 수신 시 실행 |
| Broadcast [message] | 다른 스크립트로 메시지 전송 |
| Broadcast [message] and wait | 메시지 전송 후 모든 수신 스크립트 완료 대기 |

### Flight Operations

| 명령어 | 파라미터 | 설명 |
|--------|----------|------|
| Take off | - | 이륙 (기본 고도 100cm, 모든 비행 프로그램 필수) |
| Landing | - | 착륙 (비행 시퀀스 완료, 필수) |
| Set height to [value] | cm | 비행 고도 조정 (최소 안전 고도: 50cm) |
| Pause flight | - | 조이스틱 1초 홀드로 일시정지 |
| Stop program | - | 실행 중단 및 착륙 시퀀스 시작 |
| Reset | - | 드론과 스테이지를 초기 상태로 리셋 |

**좌표 시스템**: 드론은 이륙 지점을 원점(0,0,0)으로 XYZ 좌표계를 설정합니다.

### Movement & Navigation

| 명령어 | 파라미터 | 설명 |
|--------|----------|------|
| Move [direction] [distance] | 방향, 거리(cm) | 지정 방향으로 이동 |
| Rotate [direction] | 방향 | 드론 회전 제어 |
| Arc flight | 곡선 파라미터 | 곡선 비행 경로 실행 |
| Draw vertical circle | - | 동체 0.75m 위 중심점 기준 원형 궤도 |
| One click fly around | - | 기수 1.5m 전방 기준 궤도 비행 |
| Rotate in place | - | 360도 제자리 회전 |

### Advanced Features

Fylo EDU의 고급 비전 및 자동화 기능입니다.

| 명령어 | 파라미터/조건 | 설명 |
|--------|--------------|------|
| Follow QR code | 고도 1-2.2m | QR 코드 위치 추적 |
| Follow color | 색상 지정 | 특정 색상 감지 및 추적 |
| Line patrol | - | 지상 라인 따라가기 |
| One click bounce | - | 상하 이동 시퀀스 실행 |
| One click flip | - | 손가락 슬라이드 방향으로 롤 실행 |

### Light & LED Control

| 명령어 | 파라미터 | 설명 |
|--------|----------|------|
| Turn [color] light on/off | 색상 | LED 인디케이터 제어 |
| Set light to [color] | 색상 | 조명 색상 출력 지정 |
| Lasing | - | 레이저 송신기 활성화 |

**편대 라이트 쇼**: LED와 비행 동작을 동기화하여 군집 드론 라이트 쇼 구현 가능

### Camera & Media

| 명령어 | 제한 사항 | 설명 |
|--------|----------|------|
| Take photo | - | 정지 이미지 캡처 |
| Record video | 최대 8분/세션 | 비디오 녹화 시작 |

### Control & Status

| 명령어 | 정보 | 설명 |
|--------|------|------|
| WiFi connection status | 링크 품질 | 연결 상태 표시 |
| Battery level monitoring | 잔량 % | 배터리 잔량 표시 |
| Aircraft health status | 시스템 진단 | 상태 표시 (녹색=정상, 빨강=비정상) |
| Image transmission toggle | - | 카메라 피드 활성화/비활성화 |

### Formation Flight (편대 비행)

Fylo EDU의 핵심 기능으로, 여러 대의 드론을 동시에 제어할 수 있습니다.

**특징**:
- 단일 또는 다중 드론 편대 비행 지원
- 드론 간 무선 동기화
- 프로그래밍된 안무 실행
- LED 라이트 쇼 동기화
- 시뮬레이터를 통한 사전 테스트 가능

**패키지 구성** (표준):
- Fylo EDU 드론 10대
- 배터리 34개 (고속 충전)
- 베이스 스테이션
- 충전기
- 프로펠러 및 기타 액세서리

---

## SDK 비교

| 기능 | DJI Tello | Parrot Mambo | HighGreat Fylo EDU |
|------|-----------|--------------|-------------------|
| 연결 방식 | WiFi | BLE / WiFi | WiFi / Ground Repeater |
| 프로그래밍 복잡도 | 쉬움 | 중간 | 중간~고급 |
| 프로그래밍 언어 | Python | Python | Scratch + Python |
| 비디오 스트리밍 | 지원 (720p) | 제한적 | 카메라 (녹화) |
| 미션 패드 | EDU 모델 지원 | 미지원 | QR 코드 추적 |
| 액세서리 | 미지원 | 집게, 총 지원 | LED 라이트 쇼 |
| 센서 접근 | 제한적 | 확장 가능 | AI 비전 (컬러, QR) |
| 편대 비행 | 3.0 SDK (제한적) | 미지원 | 핵심 기능 (10대 동시) |
| 교육 목적 | 초급~중급 | 초급 | 중급~고급 (STEAM) |
| 실내외 비행 | 실내 위주 | 실내 위주 | 실내외 모두 |
| 가격대 | 저렴 | 저렴 | 중간 (세트 판매) |

## 참고 문서

### DJI Tello
- [DJITelloPy Documentation](https://djitellopy.readthedocs.io/)
- [Tello SDK 2.0 User Guide](https://dl-cdn.ryzerobotics.com/downloads/Tello/Tello%20SDK%202.0%20User%20Guide.pdf)
- [Tello SDK 3.0 User Guide](https://dl.djicdn.com/downloads/RoboMaster+TT/Tello_SDK_3.0_User_Guide_en.pdf)

### Parrot Mambo
- [pyparrot Documentation](https://pyparrot.readthedocs.io/)
- [Parrot Developer Portal](https://developer.parrot.com/)
- [pyparrot GitHub Repository](https://github.com/amymcgovern/pyparrot)

### HighGreat Fylo EDU
- [pyfylo on PyPI](https://pypi.org/project/pyfylo/)
- [HighGreat Official Website](https://en.hg-fly.com/)
- [Fylo EDU Product Page](https://en.hg-fly.com/eudcational/31.html)
- [Hula APP User Manual](https://ds-api.hg-fly.net/manuals/Hula_EN.html)
- Contact: highgreat@hg-fly.com / +86 199 2491 8168

---

## 사용 예시

### DJI Tello 기본 비행

```python
from djitellopy import Tello

tello = Tello()
tello.connect()

print(f"Battery: {tello.get_battery()}%")

tello.takeoff()
tello.move_up(50)
tello.rotate_clockwise(90)
tello.move_forward(100)
tello.land()

tello.end()
```

### Parrot Mambo 기본 비행

```python
from pyparrot.Minidrone import Mambo

mambo = Mambo()
success = mambo.connect(num_retries=3)

if success:
    mambo.safe_takeoff(5)
    mambo.smart_sleep(2)
    mambo.flip(direction="front")
    mambo.smart_sleep(2)
    mambo.safe_land(5)
    mambo.disconnect()
```

### HighGreat Fylo EDU 기본 설정

```python
import pyfylo

# pyfylo 버전 확인
print(f"pyfylo version: {pyfylo.get_version()}")

# UserApi 객체 생성 (시리얼 포트 연결)
api = pyfylo.UserApi()

# 참고: 세부 API 명령어는 pyfylo 설치 후
# doc/html/English/index.html 또는 doc/html/中文/index.html에서 확인
# 활성화 도구와 완전한 문서는 제조사에 문의: highgreat@hg-fly.com
```

**Scratch 블록 코딩 예시** (FyloEDU 앱):

```
이벤트: When [시작] clicked
비행: Take off
이동: Move [forward] [100] cm
회전: Rotate [clockwise] 90 degrees
조명: Set light to [blue]
동작: One click flip
비행: Landing
```

**편대 비행 워크플로우**:
1. FyloEDU 시뮬레이터에서 편대 안무 설계
2. 여러 드론에 프로그램 동기화
3. 베이스 스테이션을 통해 편대 제어
4. LED 라이트 쇼와 비행 동작 통합

---

## 추가 정보

### 드론 선택 가이드

| 용도 | 추천 드론 | 이유 |
|------|----------|------|
| 입문자 개인 학습 | DJI Tello | 저렴, 간단한 API, 풍부한 커뮤니티 |
| 초등 교육 | Parrot Mambo | 안전 설계, 재미있는 액세서리 |
| 중고등 STEAM | Fylo EDU | 편대 비행, 고급 프로그래밍 |
| 대학 연구 | DJI Tello EDU | 미션 패드, SDK 3.0 |
| 드론 쇼 교육 | Fylo EDU | 군집 제어, LED 라이트 쇼 |

### 학습 경로

**초급** (Scratch/블록 코딩):
1. Fylo EDU 또는 Tello로 블록 코딩 시작
2. 기본 비행 패턴 학습
3. 간단한 자동화 시퀀스

**중급** (Python):
1. DJI Tello + djitellopy로 Python 기초
2. 센서 데이터 읽기 및 처리
3. 조건부 비행 로직

**고급** (편대 제어):
1. Fylo EDU로 다중 드론 제어
2. 동기화 알고리즘 구현
3. 비전 기반 자율 비행

---

*Last Updated: 2025-11-25*
