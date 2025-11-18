# Unity WebGL Build 폴더

이 폴더에 Unity WebGL 빌드 파일을 배치합니다.

## 필요한 파일

Unity에서 WebGL로 빌드하면 다음 파일들이 생성됩니다:

```
public/unity/
├── Build/
│   ├── [ProjectName].loader.js
│   ├── [ProjectName].data
│   ├── [ProjectName].framework.js
│   └── [ProjectName].wasm
├── TemplateData/
│   └── (Unity 템플릿 파일들)
└── index.html (선택사항)
```

## Unity WebGL 빌드 방법

### 1. Unity 프로젝트 설정

1. Unity 에디터 열기
2. `File` → `Build Settings`
3. `Platform`에서 `WebGL` 선택
4. `Switch Platform` 클릭

### 2. Player Settings 구성

1. `Player Settings` 버튼 클릭
2. `Resolution and Presentation` 섹션:
   - `Default Canvas Width`: 1920
   - `Default Canvas Height`: 1080
3. `Publishing Settings` 섹션:
   - `Compression Format`: Gzip 또는 Disabled
   - `Enable Exceptions`: Explicitly Thrown Exceptions Only

### 3. C# 스크립트 설정 (Unity → React 통신)

Unity 프로젝트에 다음과 같은 GameManager 스크립트를 추가해야 합니다:

\`\`\`csharp
using UnityEngine;
using System.Runtime.InteropServices;
using System.Collections;
using System.Collections.Generic;

public class GameManager : MonoBehaviour
{
    // React에 메시지 전송
    [DllImport("__Internal")]
    private static extern void OnMessageToReact(string message);

    private List<DroneController> drones = new List<DroneController>();
    private bool isInitialized = false;

    void Start()
    {
        // 드론 초기화 (예: 4대의 드론)
        InitializeDrones(4);

        // 텔레메트리 루프 시작 (10Hz)
        StartCoroutine(TelemetryLoop());
    }

    void InitializeDrones(int count)
    {
        for (int i = 0; i < count; i++)
        {
            // 드론 생성 및 초기 위치 설정
            GameObject droneObj = new GameObject($"Drone_{i + 1}");
            DroneController drone = droneObj.AddComponent<DroneController>();
            drone.droneId = i + 1;
            drone.transform.position = new Vector3(i * 2f, 0f, 0f); // 초기 위치
            drones.Add(drone);
        }

        Debug.Log($"Initialized {count} drones");
    }

    // React로부터 메시지 수신
    public void ReceiveMessage(string messageJson)
    {
        Debug.Log($"Received from React: {messageJson}");

        // JSON 파싱
        var message = JsonUtility.FromJson<ReactMessage>(messageJson);

        switch (message.type)
        {
            case "request_init":
                SendInitMessage();
                break;
            case "execute_script":
                ExecuteCommands(message.data);
                break;
            case "emergency_stop":
                EmergencyStop();
                break;
            case "config":
                ApplyConfig(message.data);
                break;
        }
    }

    // 초기화 메시지 전송
    void SendInitMessage()
    {
        var positions = new List<Position>();
        foreach (var drone in drones)
        {
            positions.Add(new Position
            {
                x = drone.transform.position.x,
                y = drone.transform.position.y,
                z = drone.transform.position.z
            });
        }

        var init = new InitMessage
        {
            type = "init",
            data = new InitData
            {
                droneCount = drones.Count,
                positions = positions.ToArray()
            },
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        string json = JsonUtility.ToJson(init);
        OnMessageToReact(json);
        isInitialized = true;
        Debug.Log($"Sent init message with {drones.Count} drones");
    }

    // 텔레메트리 루프 (10Hz)
    IEnumerator TelemetryLoop()
    {
        while (true)
        {
            if (isInitialized)
            {
                SendTelemetry();
            }
            yield return new WaitForSeconds(0.1f); // 10Hz
        }
    }

    // 텔레메트리 전송
    void SendTelemetry()
    {
        var droneDataList = new List<DroneData>();

        foreach (var drone in drones)
        {
            droneDataList.Add(new DroneData
            {
                droneId = drone.droneId,
                position = new Position
                {
                    x = drone.transform.position.x,
                    y = drone.transform.position.y,
                    z = drone.transform.position.z
                },
                altitude = drone.transform.position.z,
                velocity = new Velocity
                {
                    x = drone.velocity.x,
                    y = drone.velocity.y,
                    z = drone.velocity.z
                },
                battery = drone.battery,
                flightMode = drone.flightMode,
                isArmed = drone.isArmed
            });
        }

        var telemetry = new TelemetryMessage
        {
            type = "telemetry",
            data = droneDataList.ToArray(),
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        string json = JsonUtility.ToJson(telemetry);
        OnMessageToReact(json);
    }

    // 명령 실행
    void ExecuteCommands(object commandData)
    {
        // 명령 파싱 및 드론에 적용
        Debug.Log("Executing commands...");
        // TODO: 명령 실행 로직 구현
    }

    // 비상 정지
    void EmergencyStop()
    {
        Debug.Log("EMERGENCY STOP");
        foreach (var drone in drones)
        {
            drone.Stop();
        }
    }

    // 설정 적용
    void ApplyConfig(object configData)
    {
        Debug.Log("Applying config...");
        // TODO: 설정 적용 로직
    }
}

// 메시지 데이터 구조체들
[System.Serializable]
public class ReactMessage
{
    public string type;
    public object data;
    public long timestamp;
}

[System.Serializable]
public class InitMessage
{
    public string type;
    public InitData data;
    public long timestamp;
}

[System.Serializable]
public class InitData
{
    public int droneCount;
    public Position[] positions;
}

[System.Serializable]
public class TelemetryMessage
{
    public string type;
    public DroneData[] data;
    public long timestamp;
}

[System.Serializable]
public class DroneData
{
    public int droneId;
    public Position position;
    public float altitude;
    public Velocity velocity;
    public int battery;
    public string flightMode;
    public bool isArmed;
}

[System.Serializable]
public class Position
{
    public float x;
    public float y;
    public float z;
}

[System.Serializable]
public class Velocity
{
    public float x;
    public float y;
    public float z;
}

// 드론 컨트롤러 (간단한 예시)
public class DroneController : MonoBehaviour
{
    public int droneId;
    public Vector3 velocity = Vector3.zero;
    public int battery = 100;
    public string flightMode = "STABILIZE";
    public bool isArmed = false;

    public void Stop()
    {
        velocity = Vector3.zero;
        isArmed = false;
    }
}
\`\`\`

### 4. jslib 파일 생성 (Unity → JavaScript 브릿지)

`Assets/Plugins/WebGL/ReactBridge.jslib` 파일 생성:

\`\`\`javascript
mergeInto(LibraryManager.library, {
    OnMessageToReact: function(message) {
        var messageStr = UTF8ToString(message);

        // React의 Unity 이벤트로 전송
        if (window.unityInstance) {
            window.dispatchEvent(new CustomEvent('OnMessageToReact', {
                detail: messageStr
            }));
        }
    }
});
\`\`\`

### 5. 빌드 실행

1. `File` → `Build Settings`
2. `Build` 버튼 클릭
3. 빌드 대상 폴더: 이 프로젝트의 `public/unity/` 선택

### 6. 빌드 파일 확인

빌드 완료 후 다음 파일들이 생성되었는지 확인:

- `Build/DroneSwarmSim.loader.js`
- `Build/DroneSwarmSim.data`
- `Build/DroneSwarmSim.framework.js`
- `Build/DroneSwarmSim.wasm`

## React 앱에서 사용하기

빌드가 완료되면, ConnectionPanel에서 **"Unity WebGL Embed"** 모드를 선택하여 사용할 수 있습니다.

## 주의사항

- Unity WebGL 빌드는 파일 크기가 클 수 있습니다 (수십 MB ~ 수백 MB)
- Git에 커밋하지 마세요 (.gitignore에 추가됨)
- 개발 중에는 Test Mode를 사용하는 것이 더 빠릅니다
- Unity WebGL은 로컬 호스트에서만 동작합니다 (file:// 프로토콜 불가)

## 테스트 없이 개발하기

Unity 빌드 없이 React 앱을 개발하려면:
1. Test Mode 사용
2. WebSocket 모드로 별도 Unity 서버 연결

Unity WebGL Embed 모드는 실제 Unity 빌드가 준비되었을 때만 사용하세요.
