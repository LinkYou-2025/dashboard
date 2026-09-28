export const prdMeta = {
  version: "13.0.0",
  createdAt: "2026-08-08",
  createdBy: "Chea Yunzi",
  updatedAt: "2026-09-28",
  updatedBy: "Chea Yunzi",
};

export const prdSections = [
  {
    heading: "1. 서비스 개요",
    body: "LinkU는 SNS·웹에서 발견한 링크를 저장하고, 감정과 상황에 따라 다시 꺼내볼 수 있도록 돕는 링크 큐레이션 서비스다. 저장된 링크는 AI가 자동으로 16개 카테고리로 분류되고, 사용자가 선택한 감정 태그와 결합해 홈 화면 추천과 월간 큐레이션에 활용된다.",
  },
  {
    heading: "2. 회원가입 프로세스",
    body: "총 3단계 — 계정정보(이메일·비밀번호) → 프로필 설정(닉네임·성별·직업) → 관심사 설정(목적 9종·관심분야 12종, 복수 선택). 회원가입 시 설정한 직업은 홈 화면의 상황 태그 8종을 결정하는 핵심 값이다.",
  },
  {
    heading: "3. 홈 화면 — 감정/상황 기반 추천",
    body: "감정 6종(즐거움·평온·설렘·슬픔·짜증·분노), 상황 8종(직업별), 링크 분류 카테고리 16종의 조합으로 추천 점수(EmotionScore + SituationScore, 최대 5점)를 계산한다. 저장 링크 3개 이상일 때 추천 기능이 활성화된다.",
  },
];

export type VersionEntry = {
  version: string;
  type: "MINOR" | "PATCH" | "최초";
  date: string;
  author?: string;
  note: string;
};

export const prdVersions: VersionEntry[] = [
  { version: "13.0.0", type: "MINOR", date: "2026-09-28", author: "Chea Yunzi", note: "감정/상황 추천 정책 · 폴더 색상 정책 통합" },
  { version: "12.1.0", type: "PATCH", date: "2026-09-02", author: "dinah05", note: "월간 큐레이션 예외 처리 조건 정정" },
  { version: "1.0.0", type: "최초", date: "2026-08-08", author: "full_avocado", note: "최초 작성" },
];

export type ConfirmationEntry = {
  type: "자체 승인" | "승인" | "반려";
  author: string;
  date: string;
  note: string;
};

export const confirmations: ConfirmationEntry[] = [
  { type: "자체 승인", author: "Chea Yunzi", date: "2026-09-28", note: "서비스 정책집 기반 통합 PRD 신규 반영 — 요구사항·화면 구성 변경 없음." },
  { type: "승인", author: "dinah05", date: "2026-09-02", note: "기획자 검토 완료, 12.1.0 반영." },
];

export type LinkedSpec = {
  title: string;
  slug: string;
  version?: string;
  status: "머지됨" | "승인됨" | "검토중";
};

export const linkedSpecs: LinkedSpec[] = [
  { title: "홈 화면 감정·상황 기반 추천", slug: "home-recommendation", version: "v1.2.0", status: "머지됨" },
  { title: "폴더 처리 및 색상 정책", slug: "folder-color-policy", version: "v1.0.0", status: "승인됨" },
  { title: "API 계약 요청 — GET /links/{id}", slug: "contract-request-014", status: "검토중" },
];

export const statusColors: Record<LinkedSpec["status"], { bg: string; text: string }> = {
  머지됨: { bg: "rgba(53,223,121,0.14)", text: "var(--positive)" },
  승인됨: { bg: "rgba(245,166,35,0.16)", text: "var(--amber)" },
  검토중: { bg: "rgba(255,255,255,0.06)", text: "var(--text-secondary)" },
};
