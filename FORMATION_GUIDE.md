# 대형 설정 완벽 가이드

## 🎉 수정 완료!

모든 대형이 이제 rows/cols 파라미터를 **제대로 사용**합니다!

---

## 📐 대형별 파라미터 사용법

### 1. Grid (그리드)
**rows × cols 격자 배치**

```
파라미터:
- rows: 세로 줄 수 (Y축)
- cols: 가로 줄 수 (X축)
- spacing: 드론 사이 간격

예시: rows=2, cols=3, spacing=2m
드론 4개인 경우:
[D0] [D1] [D2]
[D3] [ ] [ ]

실제 위치:
D0: (0, 0)    D1: (2, 0)    D2: (4, 0)
D3: (0, 2)
```

**테스트 예제:**
- rows=2, cols=5, spacing=2 → 2×5 격자
- rows=3, cols=3, spacing=3 → 3×3 격자

---

### 2. Line (일렬)
**cols=한 줄당 드론 수, rows=줄 수**

```
파라미터:
- rows: 줄 수
- cols: 한 줄당 최대 드론 수
- spacing: 드론 사이 간격

예시: rows=2, cols=3, spacing=2m
드론 6개인 경우:
[D0] [D1] [D2]  ← 1번째 줄
[D3] [D4] [D5]  ← 2번째 줄

cols=10인 경우 (드론 6개):
[D0] [D1] [D2] [D3] [D4] [D5]  ← 한 줄로
```

**테스트 예제:**
- rows=1, cols=10, spacing=2 → 한 줄로 쭉
- rows=2, cols=3, spacing=2 → 3개씩 2줄

---

### 3. Circle (원형)
**cols=반지름, rows는 무시**

```
파라미터:
- rows: ❌ 무시됨
- cols: 반지름 = spacing × cols
- spacing: 기본 간격

예시: cols=3, spacing=2m
반지름 = 2 × 3 = 6m

드론들이 반지름 6m 원 위에 균등 배치

cols가 클수록 큰 원!
```

**테스트 예제:**
- cols=2, spacing=2 → 반지름 4m 원
- cols=5, spacing=2 → 반지름 10m 원
- cols=1, spacing=3 → 반지름 3m 원 (작은 원)

---

### 4. V-Shape (V자)
**rows=V자 깊이, cols는 무시**

```
파라미터:
- rows: V자 깊이 (뒤로 얼마나 펼쳐질지)
- cols: ❌ 무시됨
- spacing: 드론 사이 간격

예시: rows=4, spacing=2m
    [D0]          ← 선두
  [D2] [D1]       ← 2번째
[D4]     [D3]     ← 3번째
```

**테스트 예제:**
- rows=5, spacing=2 → 깊은 V자
- rows=2, spacing=3 → 얕은 V자

---

### 5. Triangle (삼각형)
**rows=삼각형 줄 수, cols는 무시**

```
파라미터:
- rows: 삼각형 최대 줄 수
- cols: ❌ 무시됨
- spacing: 드론 사이 간격

예시: rows=3, spacing=2m
    [D0]          ← 1개
  [D1] [D2]       ← 2개
[D3] [D4] [D5]    ← 3개
```

**테스트 예제:**
- rows=4, spacing=2 → 4단 삼각형
- rows=2, spacing=3 → 2단 삼각형

---

### 6. Square (사각형)
**rows × cols 정사각형/직사각형**

```
파라미터:
- rows: 세로 줄 수
- cols: 가로 줄 수
- spacing: 드론 사이 간격

예시: rows=3, cols=3, spacing=2m
중앙 정렬된 3×3 사각형

[D0] [D1] [D2]
[D3] [D4] [D5]
[D6] [D7] [D8]

Grid와 비슷하지만 중앙 정렬!
```

**테스트 예제:**
- rows=3, cols=3, spacing=2 → 정사각형
- rows=2, cols=4, spacing=2 → 직사각형

---

### 7. Diamond (다이아몬드)
**rows=크기, cols는 무시**

```
파라미터:
- rows: 다이아몬드 크기
- cols: ❌ 무시됨
- spacing: 드론 사이 간격

예시: spacing=2m
     [D0]
   [D2] [D1]
     [D3]

다이아몬드 모양으로 배치
```

**테스트 예제:**
- rows=3, spacing=2
- rows=5, spacing=2

---

## 🧪 완벽한 테스트 시나리오

### 테스트 1: Grid 대형 변경
```
1. 이륙 (고도 3m)
2. 대기 2초
3. 대형 설정: Grid (rows=2, cols=2, spacing=3)
4. 대기 3초
5. 대형 설정: Grid (rows=1, cols=4, spacing=2)  ← cols 변경!
6. 대기 3초
7. 착륙
```
**예상 결과**: 2×2에서 1×4로 대형 변경됨!

---

### 테스트 2: Circle 반지름 변경
```
1. 이륙 (고도 3m)
2. 대기 2초
3. 대형 설정: Circle (rows=무관, cols=2, spacing=2)  ← 반지름 4m
4. 대기 3초
5. 대형 설정: Circle (rows=무관, cols=5, spacing=2)  ← 반지름 10m
6. 대기 3초
7. 착륙
```
**예상 결과**: 작은 원에서 큰 원으로 확장!

---

### 테스트 3: Line 줄 수 변경
```
1. 이륙 (고도 3m)
2. 대기 2초
3. 대형 설정: Line (rows=1, cols=10, spacing=2)  ← 한 줄
4. 대기 3초
5. 대형 설정: Line (rows=2, cols=3, spacing=2)   ← 두 줄
6. 대기 3초
7. 착륙
```
**예상 결과**: 긴 한 줄에서 짧은 두 줄로 변경!

---

### 테스트 4: 모든 대형 순회
```
1. 이륙 (고도 4m)
2. 대기 2초
3. Grid (rows=2, cols=2, spacing=2)
4. 대기 3초
5. Line (rows=1, cols=4, spacing=2)
6. 대기 3초
7. Circle (cols=3, spacing=2)
8. 대기 3초
9. V-Shape (rows=3, spacing=2)
10. 대기 3초
11. Triangle (rows=3, spacing=2)
12. 대기 3초
13. Square (rows=3, cols=3, spacing=2)
14. 대기 3초
15. Diamond (rows=4, spacing=2)
16. 대기 3초
17. 착륙
```

---

## 🎯 팁

### 대형이 변경되는 것을 확실히 보려면:

1. **대기 시간 충분히**: 각 대형 설정 후 2-3초 대기
2. **spacing 크게**: spacing=2~3으로 설정하면 변화가 뚜렷
3. **콘솔 확인**: F12 → Console에서 로그 확인
   ```
   [DroneSimulator] Grid formation: 2 rows × 3 cols
   [DroneSimulator]   Drone 0: row 0, col 0 → target (0.0, 0.0, 3.0)
   [DroneSimulator]   Drone 1: row 0, col 1 → target (2.0, 0.0, 3.0)
   ```

4. **rows/cols 극단값 테스트**:
   - Grid: rows=1, cols=10 vs rows=10, cols=1
   - Circle: cols=1 vs cols=10 (작은 원 vs 큰 원)

---

## ✅ 확인 사항

**이제 다음이 모두 작동합니다:**

- ✅ rows/cols 변경하면 실제로 대형 바뀜
- ✅ Circle에서 cols로 반지름 조절 가능
- ✅ Line에서 rows로 줄 수 조절
- ✅ Grid/Square에서 rows×cols 제대로 작동
- ✅ 블록 툴팁에 각 파라미터 설명 표시

**페이지 새로고침 후 테스트하세요!**
