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

public class GameManager : MonoBehaviour
{
    // React에 메시지 전송
    [DllImport("__Internal")]
    private static extern void OnMessageToReact(string message);

    // React로부터 메시지 수신
    public void ReceiveMessage(string messageJson)
    {
        Debug.Log($"Received from React: {messageJson}");

        // JSON 파싱 및 명령 처리
        // TODO: JSON 파싱 로직 구현
    }

    // Unity에서 React로 텔레메트리 전송 예시
    void SendTelemetryToReact()
    {
        var telemetry = new
        {
            type = "telemetry",
            data = new
            {
                droneId = "drone-1",
                position = new { x = 0f, y = 5f, z = 0f },
                altitude = 5f,
                battery = 85,
                flightMode = "GUIDED",
                isArmed = true
            },
            timestamp = System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        string json = JsonUtility.ToJson(telemetry);
        OnMessageToReact(json);
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
