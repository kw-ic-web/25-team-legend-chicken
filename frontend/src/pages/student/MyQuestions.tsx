import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { getMyQuestions, type MyQuestionItem } from "../../api/student";
import { useToast } from "../../contexts/ToastContext";

// ---------------- Types ----------------
interface Question {
  id: string;
  lectureName: string;
  question: string;
  timestamp: string; // 포맷팅된 타임스탬프 (표시용) e.g. "2024-01-15 14:30"
  rawTimestamp: string; // 원본 타임스탬프 (정렬용) e.g. "2025-11-12T03:33:49.974Z"
  // 백엔드에 별도 상태 플래그는 없고, answer 유무로만 상태 판별
  status: "pending" | "answered";
  answer?: string;
}

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
};

// ---------------- Helpers ----------------
const formatTimestamp = (dateString: string): string => {
  try {
    // ISO 8601 형식 (예: "2025-11-12T03:33:49.974Z") 또는 다른 형식 처리
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
};

const mapApiQuestionToComponent = (item: MyQuestionItem): Question => {
  const hasAnswer = item.answer && item.answer.trim() !== "";
  const rawTimestamp = item.created_at || item.timestamp;
  return {
    id: item._id,
    lectureName: item.lecture_name || "알 수 없는 강의",
    question: item.text,
    timestamp: formatTimestamp(rawTimestamp),
    rawTimestamp: rawTimestamp,
    status: hasAnswer ? "answered" : "pending",
    answer: item.answer || undefined,
  };
};

// ---------------- Component ----------------
const MyQuestions: React.FC = () => {
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Question["status"]>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    (async () => {
      try {
        const response = await getMyQuestions(undefined, undefined, 200);
        if (!active) return;

        const mappedQuestions = response.questions.map(
          mapApiQuestionToComponent
        );
        setQuestions(mappedQuestions);
        setTotalCount(response.total_count);
      } catch (error) {
        console.error("질문 목록을 불러오지 못했습니다.", error);
        const message =
          error instanceof Error
            ? error.message
            : "질문 목록을 불러오지 못했습니다.";
        showToast(message, "error");
        setQuestions([]);
        setTotalCount(0);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [showToast]);

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
    list.sort((a, b) => {
      // 원본 타임스탬프를 사용하여 정렬 (ISO 8601 형식)
      try {
        const dateA = new Date(a.rawTimestamp).getTime();
        const dateB = new Date(b.rawTimestamp).getTime();

        if (isNaN(dateA) || isNaN(dateB)) {
          return 0; // 파싱 실패 시 원본 순서 유지
        }

        return sort === "newest" ? dateB - dateA : dateA - dateB;
      } catch {
        return 0;
      }
    });
    return list;
  }, [questions, q, status, sort]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              내 질문 내역
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              총 <span className="font-medium">{totalCount}</span>개 질문
              {filtered.length !== totalCount && (
                <span className="ml-1">
                  (필터링:{" "}
                  <span className="font-medium">{filtered.length}</span>개)
                </span>
              )}
            </p>
          </div>

          {/* Controls */}
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
            <div className="relative flex-1 sm:min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="강의명, 질문, 답변 검색..."
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm shadow-sm outline-none ring-0 placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:shadow transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="appearance-none rounded-xl border border-gray-200 bg-white pl-9 pr-9 py-2.5 text-sm shadow-sm outline-none"
                >
                  <option value="all">전체 상태</option>
                  <option value="pending">대기중</option>
                  <option value="answered">답변완료</option>
                </select>
                <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="appearance-none rounded-xl border border-gray-200 bg-white pl-3 pr-8 py-2.5 text-sm shadow-sm outline-none"
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-10 text-center shadow-md">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                질문 목록을 불러오는 중...
              </p>
            </div>
          ) : filtered.length === 0 ? (
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
    <div className="group rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
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
            <span className="text-xs text-gray-400">•</span>
            <time className="text-xs text-gray-500">{data.timestamp}</time>
          </div>

          <h3 className="mt-2 text-base font-semibold text-gray-900">
            {data.lectureName}
          </h3>
          <p className="mt-1 flex items-start gap-2 text-[15px] text-gray-700">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {data.question}
          </p>
        </div>

        <button
          onClick={onToggle}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.99]"
        >
          {expanded ? (
            <>
              접기 <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              답변보기 <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* Details with CSS-only transition (no framer-motion) */}
      <div
        className={`overflow-hidden transition-all duration-200 ${expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div
          className={`rounded-xl bg-white p-4 text-sm text-gray-700 border border-gray-200 ${expanded ? "mt-4" : "mt-0"}`}
        >
          {data.status === "answered" && data.answer ? (
            <div>
              <div className="text-[13px] font-medium text-gray-500">답변</div>
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
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-10 text-center bg-white shadow-md">
    <div className="grid place-items-center rounded-full bg-white p-4 border border-gray-200">
      <Search className="h-6 w-6 text-gray-400" />
    </div>
    <h3 className="mt-3 text-lg font-semibold text-gray-900">
      질문 내역이 없습니다
    </h3>
    <p className="mt-1 max-w-md text-sm text-gray-500">
      아직 등록된 질문이 없어요. 페이지 상단의 입력 폼 또는 강의 상세 페이지에서
      새로운 질문을 남겨보세요.
    </p>
  </div>
);

export default MyQuestions;
