import React, { useMemo, useState } from "react";
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ---------------- Types ----------------
interface Question {
  id: number;
  lectureName: string;
  question: string;
  timestamp: string; // e.g. "2024-01-15 14:30"
  status: "pending" | "answered" | "rejected";
  answer?: string;
}

// ---------------- Demo Data ----------------
const initialData: Question[] = [
  {
    id: 1,
    lectureName: "데이터베이스 개론",
    question: "정규화가 무엇인지 설명해주세요.",
    timestamp: "2024-01-15 14:30",
    status: "answered",
    answer:
      "정규화는 데이터베이스의 중복을 줄이고 이상 현상을 방지해 데이터 일관성과 무결성을 높이는 설계 절차입니다.",
  },
  {
    id: 2,
    lectureName: "웹 프로그래밍",
    question: "React와 Vue의 차이점은 무엇인가요?",
    timestamp: "2024-01-14 16:45",
    status: "pending",
  },
  {
    id: 3,
    lectureName: "운영체제",
    question: "컨텍스트 스위칭이 성능에 미치는 영향은?",
    timestamp: "2024-01-12 10:15",
    status: "rejected",
  },
];

// ---------------- Helpers ----------------
const statusMeta: Record<
  Question["status"],
  { label: string; icon: React.ReactNode; className: string }
> = {
  pending: {
    label: "대기중",
    icon: <Clock className="h-4 w-4" />,
    className:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800",
  },
  answered: {
    label: "답변완료",
    icon: <CheckCircle2 className="h-4 w-4" />,
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800",
  },
  rejected: {
    label: "거부됨",
    icon: <XCircle className="h-4 w-4" />,
    className:
      "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-800",
  },
};

const parseTs = (ts: string) => new Date(ts.replace(/-/g, "/").replace(" ", "T"));

// ---------------- Component ----------------
const MyQuestions: React.FC = () => {
  const [questions] = useState<Question[]>(initialData);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Question["status"]>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let list = [...questions];
    if (status !== "all") list = list.filter((i) => i.status === status);
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(
        (i) =>
          i.lectureName.toLowerCase().includes(t) ||
          i.question.toLowerCase().includes(t) ||
          i.answer?.toLowerCase().includes(t)
      );
    }
    list.sort((a, b) =>
      sort === "newest"
        ? parseTs(b.timestamp).getTime() - parseTs(a.timestamp).getTime()
        : parseTs(a.timestamp).getTime() - parseTs(b.timestamp).getTime()
    );
    return list;
  }, [questions, q, status, sort]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-8">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              내 질문 내역
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              총 <span className="font-medium">{filtered.length}</span>개 결과
            </p>
          </div>

          {/* Controls */}
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
            <div className="relative flex-1 sm:min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="강의명, 질문, 답변 검색..."
                className="w-full rounded-xl border border-slate-200 bg-white/90 pl-9 pr-3 py-2.5 text-sm shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:shadow transition dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white/90 pl-9 pr-9 py-2.5 text-sm shadow-sm outline-none dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="all">전체 상태</option>
                  <option value="pending">대기중</option>
                  <option value="answered">답변완료</option>
                  <option value="rejected">거부됨</option>
                </select>
                <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>

              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white/90 pl-3 pr-8 py-2.5 text-sm shadow-sm outline-none dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 grid grid-cols-1 gap-4">
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            filtered.map((item) => (
              <QuestionCard
                key={item.id}
                data={item}
                expanded={expandedId === item.id}
                onToggle={() =>
                  setExpandedId((id) => (id === item.id ? null : item.id))
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------- Subcomponents ----------------
const QuestionCard: React.FC<{
  data: Question;
  expanded: boolean;
  onToggle: () => void;
}> = ({ data, expanded, onToggle }) => {
  const meta = statusMeta[data.status];

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:shadow-md dark:bg-slate-900/60 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
              title={data.status}
            >
              {meta.icon}
              {meta.label}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <time className="text-xs text-slate-500 dark:text-slate-400">
              {data.timestamp}
            </time>
          </div>

          <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
            {data.lectureName}
          </h3>
          <p className="mt-1 flex items-start gap-2 text-[15px] text-slate-700 dark:text-slate-300">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {data.question}
          </p>
        </div>

        <button
          onClick={onToggle}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
        >
          {expanded ? (
            <>
              접기 <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              상세보기 <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* Details with CSS-only transition (no framer-motion) */}
      <div
        className={`overflow-hidden transition-all duration-200 ${expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className={`rounded-xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700 ${expanded ? "mt-4" : "mt-0"}`}>
          {data.status === "answered" && data.answer ? (
            <div>
              <div className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                답변
              </div>
              <p className="mt-1 leading-relaxed">{data.answer}</p>
            </div>
          ) : data.status === "pending" ? (
            <p className="italic text-slate-500">아직 답변 대기중입니다.</p>
          ) : (
            <p className="italic text-slate-500">질문이 거부되었습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
    <div className="grid place-items-center rounded-full bg-slate-100 p-4 dark:bg-slate-800">
      <Search className="h-6 w-6 text-slate-400" />
    </div>
    <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
      질문 내역이 없습니다
    </h3>
    <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
      아직 등록된 질문이 없어요. 페이지 상단의 입력 폼 또는 강의 상세 페이지에서 새로운 질문을 남겨보세요.
    </p>
  </div>
);

export default MyQuestions;
