# PortWatch

로컬 개발 중 리스닝 중인 TCP 포트와 점유 프로세스를 macOS 메뉴바에서 확인하고, 클릭 한 번으로 종료하는 유틸리티.

Tauri 2 + React + TypeScript. 백엔드는 `lsof`를 `-F`(필드) 모드로 실행해 파싱하고, `kill(2)` 시스템 콜로 프로세스를 종료한다.

## 기능 (구현 범위: P0 + P1)

- **포트 목록**: LISTEN 상태 TCP 포트 — 포트 번호, 프로세스명, PID, 사용자, 주소
- **자동 갱신**: 기본 3초 폴링, 설정에서 1~10초 조절. 팝오버가 보일 때만 폴링(유휴 시 CPU 절약)
- **프로세스 종료**: 행 hover 시 `kill`(SIGTERM) / `-9`(SIGKILL) 버튼
- **시스템 프로세스 확인**: PID ≤ 1000 또는 root 소유 프로세스는 종료 전 확인 모달 + `SYS` 배지
- **검색/필터**: 포트 번호·프로세스명 텍스트 검색, 포트 범위(min–max) 필터
- **정렬**: Port / Process / PID 컬럼 클릭 정렬
- 메뉴바 트레이 아이콘 클릭 → 트레이 앵커 팝오버 토글, 포커스 아웃 시 자동 숨김(릴리스), `Esc`로 닫기
- Dock 아이콘 없는 메뉴바 전용 앱(Accessory)

## 개발

```bash
pnpm install
pnpm tauri dev
```

메뉴바에 아이콘이 뜬다. 클릭하면 포트 목록 팝오버가 열린다.
(개발 모드에서는 devtools 사용을 위해 포커스 아웃 자동 숨김이 비활성화된다.)

## 빌드 / 패키징 (`.app` / `.dmg`)

```bash
pnpm tauri build
```

산출물: `src-tauri/target/release/bundle/` 아래 `.app`, `.dmg`.
v1은 코드사이닝 없이 로컬 설치용. 배포 시 Apple Developer 인증서 필요.

## 테스트

```bash
cd src-tauri && cargo test    # lsof -F 파서 유닛 테스트
```

## 구조

```
src/                     React 프론트엔드
  App.tsx                메인 팝오버 (리스트/필터/정렬/폴링)
  api.ts                 Tauri invoke 래퍼
  hooks.ts               윈도우 활성 감지, 폴링 간격 저장
  components/            PortRow, ConfirmDialog
src-tauri/src/
  lib.rs                 커맨드 등록, 트레이/팝오버, activation policy
  ports.rs               lsof -F 파싱 (+ 유닛 테스트)
src-tauri/gen_icon.py    앱 아이콘 생성 스크립트 (의존성 없음)
```
