/**
 * Korean crisis hotline resources (plan AD-2 / AC-12).
 *
 * These hotlines ARE the escalation path. The MVP has NO human-in-the-loop
 * responder watching conversations in real time — the UX must be honest about
 * that (see `disclaimer` below). Do not imply a person is monitoring the chat.
 */

export interface Hotline {
  /** Display name (Korean). */
  name: string;
  /** Dialable phone number. */
  phone: string;
  /** Short description of what the line is for. */
  description: string;
  /** Availability, e.g. "24시간". */
  hours: string;
}

/** 자살예방상담 109, 정신건강위기상담 1577-0199 (plan AD-2). */
export const HOTLINES: readonly Hotline[] = [
  {
    name: "자살예방상담전화",
    phone: "109",
    description: "자살·정신건강 위기 상담 (24시간)",
    hours: "24시간",
  },
  {
    name: "정신건강위기상담전화",
    phone: "1577-0199",
    description: "정신건강 위기 상담 (24시간)",
    hours: "24시간",
  },
] as const;

/**
 * Honesty notice for the hotline card. The MVP does not have a human crisis
 * responder — the hotlines are the escalation. Never phrase this as "someone is
 * watching / a counselor will reach out."
 */
export const CRISIS_HONESTY_NOTICE =
  "지금 이 대화를 실시간으로 지켜보는 상담원은 없습니다. 위급하다고 느껴지면 아래 전화로 바로 연결해 전문가의 도움을 받으세요.";
