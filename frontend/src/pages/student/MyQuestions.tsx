import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { getMyQuestions } from "../../api/student";

// ---------------- Types ----------------
type QuestionStatus = "pending" | "answered" | "rejected";

interface Question {
  id: string;
  lectureId: string;
  lectureName: string;
  classId?: number;
  question: string;
  timestamp: string;
  status: QuestionStatus;
  answer?: string;
  page?: number;
  section?: string;
  upvoteCount?: number;
}

// ---------------- Helpers ----------------
const statusMeta: Record<
  QuestionStatus,
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

const parseTs = (ts: string) => {
  const parsed = new Date(ts);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return new Date(ts.replace(/-/g, "/").replace(" ", "T"));
};

const formatTimestamp = (ts: string) => {
  const date = parseTs(ts);
  if (Number.isNaN(date.getTime())) return ts;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ---------------- Component ----------------
const MyQuestions: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | QuestionStatus>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lectureInput, setLectureInput] = useState("");
  const [classInput, setClassInput] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{
    lectureId?: string;
    classId?: number;
  }>({});

  const fetchQuestions = useCallback(
    async (opts?: { showSkeleton?: boolean }) => {
      const showSkeleton = opts?.showSkeleton ?? true;
      if (showSkeleton) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      try {
        const response = await getMyQuestions({
          lectureId: appliedFilters.lectureId,
          classId: appliedFilters.classId,
          limit: 200,
        });
        const mapped: Question[] = response.questions.map((item) => ({
          id: item._id,
          lectureId: item.lecture_id,
          lectureName: item.lecture_name,
          classId: item.class_id,
          question: item.text,
          timestamp:
            item.updated_at ||
            item.created_at ||
            item.timestamp ||
            new Date().toISOString(),
          status: item.answer ? "answered" : "pending",
          answer: item.answer,
          page: item.page,
          section: item.section,
          upvoteCount: item.upvote_count,
        }));
        setQuestions(mapped);
        setTotalCount(response.total_count ?? mapped.length);
        setExpandedId(null);
      } catch (err) {
        console.error("내 질문 목록 조회 실패:", err);
        const message =
          err instanceof Error ? err.message : "질문 목록을 불러오지 못했습니다.";
        setError(message);
      } finally {
        if (showSkeleton) {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [appliedFilters]
  );

  useEffect(() => {
    fetchQuestions({ showSkeleton: true });
  }, [fetchQuestions]);

  const handleApplyFilters = () => {
    const nextFilters: { lectureId?: string; classId?: number } = {};
    if (lectureInput.trim()) {
      nextFilters.lectureId = lectureInput.trim();
    }
    if (classInput.trim()) {
      const parsed = Number(classInput.trim());
      if (!Number.isNaN(parsed)) {
        nextFilters.classId = parsed;
      } else {
        setError("클래스 ID는 숫자여야 합니다.");
        return;
      }
    }
    setAppliedFilters(nextFilters);
  };

  const handleResetFilters = () => {
    setLectureInput("");
    setClassInput("");
    setAppliedFilters({});
  };

  const handleRefresh = () => {
    fetchQuestions({ showSkeleton: false });
  };

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
              총{" "}
              <span className="font-medium">
                {totalCount ?? filtered.length}
              </span>
              개 결과
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

          {/* Filter inputs */}
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                강좌 ID
              </label>
              <input
                value={lectureInput}
                onChange={(e) => setLectureInput(e.target.value)}
                placeholder="예: LEC-32AEBA14"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:shadow transition dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                클래스 ID
              </label>
              <input
                value={classInput}
                onChange={(e) => setClassInput(e.target.value)}
                placeholder="예: 1"
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:shadow transition dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApplyFilters}
                className="w-full sm:w-auto rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
              >
                필터 적용
              </button>
              {(appliedFilters.lectureId || appliedFilters.classId !== undefined) && (
                <button
                  onClick={handleResetFilters}
                  className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-200"
                >
                  초기화
                </button>
              )}
              <button
                onClick={handleRefresh}
                className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-200"
                disabled={isRefreshing}
              >
                {isRefreshing ? "새로고침 중..." : "새로고침"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <ErrorBanner
            message={error}
            onRetry={() => fetchQuestions({ showSkeleton: true })}
          />
        )}

        {/* Content */}
        <div className="mt-6 grid grid-cols-1 gap-4">
          {isLoading ? (
            <LoadingState />
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
              {formatTimestamp(data.timestamp)}
            </time>
          </div>

          <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
            {data.lectureName}
          </h3>
          <p className="mt-1 flex items-start gap-2 text-[15px] text-slate-700 dark:text-slate-300">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {data.question}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium dark:bg-slate-800">
              강좌 ID: {data.lectureId}
            </span>
            {typeof data.classId === "number" && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium dark:bg-slate-800">
                클래스 #{data.classId}
              </span>
            )}
            {typeof data.page === "number" && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium dark:bg-slate-800">
                페이지 {data.page}
              </span>
            )}
            {data.section && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium dark:bg-slate-800">
                섹션 {data.section}
              </span>
            )}
            {typeof data.upvoteCount === "number" && data.upvoteCount > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium dark:bg-slate-800">
                공감 {data.upvoteCount}
              </span>
            )}
          </div>
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

      {/* Details with CSS-only transition */}
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

const LoadingState: React.FC = () => (
  <>
    {Array.from({ length: 3 }).map((_, idx) => (
      <div
        key={idx}
        className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40"
      />
    ))}
  </>
);

const ErrorBanner: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
    <div className="flex items-center justify-between gap-2">
      <span>{message}</span>
      <button
        onClick={onRetry}
        className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100 dark:bg-red-900/60 active:scale-[0.98]"
      >
        다시 시도
      </button>
    </div>
  </div>
);

export default MyQuestions;
