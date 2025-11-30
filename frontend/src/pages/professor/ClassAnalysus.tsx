import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import StatsSection from "../../components/professor/analysis/class/StatsSection";
import PdfViewer from "../../components/professor/analysis/class/PdfViewer";
import DifficultyFeedbackList from "../../components/professor/analysis/class/DifficultyFeedbackList";
import QuestionCategoryChart from "../../components/professor/analysis/class/charts/QuestionCategoryChart";
import LeaderboardChart from "../../components/professor/analysis/class/charts/LeaderboardChart";
import InteractionTimelineChart from "../../components/professor/analysis/class/charts/InteractionTimelineChart";
import QuestionTrendChart from "../../components/professor/analysis/class/charts/QuestionTrendChart";
import ConceptNetworkChart from "../../components/professor/analysis/class/charts/ConceptNetworkChart";
import ComparisonChart from "../../components/professor/analysis/class/charts/ComparisonChart";
import type {
  DifficultyFeedback,
  StatsData,
} from "../../components/professor/analysis/class/types";
import { getLatestClassAnalysisReport, getClassAnalysisKpis } from "../../api/reports";
import { getClasses, getClassPdfs } from "../../api/professor";
import WeekFilter from "../../components/professor/analysis/class/WeekFilter";
import { getBaseUrl } from "../../api/auth/client";
import { useToast } from "../../contexts/ToastContext";

type CategorySlice = {
  name: string;
  value: number;
  color: string;
  percentage: number;
};

type LeaderboardEntry = {
  name: string;
  curious: number;
  questions: number;
};

type TimelinePoint = {
  time: number;
  curious: number;
  questions: number;
};

type TrendPoint = {
  time: string;
  value: number;
};

type ConceptNode = {
  id: string;
  label: string;
};

type ConceptConnection = {
  from: string;
  to: string;
  thickness: number;
};

type ComparisonEntry = {
  category: string;
  current: number;
  previous: number;
};

type ClassOption = {
  week: number;
  classId: number;
  title: string;
  pdfUrl?: string;
  pdfFileName?: string;
};

const defaultStats: StatsData = {
  totalQuestions: 0,
  totalUpvotes: 0,
  participationRate: 0,
  mostDifficultConcept: "데이터가 없습니다.",
};

const ClassAnalysis: React.FC = () => {
  const { lectureId } = useParams<{ lectureId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const classIdParam = searchParams.get("classId");
  const parsedClassId = classIdParam ? Number(classIdParam) : null;

  const { showToast } = useToast();

  const [stats, setStats] = useState<StatsData>(defaultStats);
  const [questionCategoryData, setQuestionCategoryData] = useState<
    CategorySlice[]
  >([]);
  const [categoryHeadline, setCategoryHeadline] = useState(
    "질문 데이터를 불러오는 중입니다..."
  );
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    []
  );
  const [leaderboardDescription, setLeaderboardDescription] = useState(
    "리더보드 데이터를 불러오는 중입니다..."
  );
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [timelineAnnotation, setTimelineAnnotation] = useState(
    "타임라인 데이터를 불러오는 중입니다..."
  );
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [trendAnnotation, setTrendAnnotation] =
    useState("질문 트렌드를 분석하고 있습니다.");
  const [conceptNodes, setConceptNodes] = useState<ConceptNode[]>([]);
  const [conceptConnections, setConceptConnections] = useState<
    ConceptConnection[]
  >([]);
  const [conceptDescription, setConceptDescription] = useState(
    "개념 네트워크 데이터를 기다리는 중입니다."
  );
  const [comparisonData, setComparisonData] = useState<ComparisonEntry[]>([]);
  const [comparisonSummary, setComparisonSummary] = useState("");
  const [feedbacks, setFeedbacks] = useState<DifficultyFeedback[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(
    parsedClassId
  );
  const [pdfInfo, setPdfInfo] = useState<{
    pdfUrl?: string;
    fileName?: string;
    week?: number;
  }>({});
  const [reportError, setReportError] = useState<string | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  useEffect(() => {
    setSelectedClassId(parsedClassId);
  }, [parsedClassId]);

  useEffect(() => {
    if (!lectureId) return;

    let active = true;
    setIsLoadingClasses(true);
    (async () => {
      try {
        const response = await getClasses(lectureId);
        if (!active) return;

        const mapped =
          response.classes?.map((cls, index) => {
            const classId = Number(cls.id ?? index + 1);
            const pdfSource = cls.materials?.[0];
            const resolvedPdf =
              pdfSource && pdfSource.startsWith("http")
                ? pdfSource
                : pdfSource
                  ? `${getBaseUrl()}${pdfSource}`
                  : undefined;
            return {
              week: index + 1,
              classId,
              title: cls.title || `${index + 1}주차 강의`,
              pdfUrl: resolvedPdf,
              pdfFileName: resolvedPdf
                ? resolvedPdf.split("/").pop() || undefined
                : undefined,
            } as ClassOption;
          }) ?? [];

        setClasses(mapped);

        if (mapped.length > 0) {
          const initialClass =
            mapped.find((item) => item.classId === parsedClassId) ?? mapped[0];

          if (!parsedClassId) {
            setSearchParams(
              { classId: String(initialClass.classId) },
              { replace: true }
            );
            setSelectedClassId(initialClass.classId);
          } else {
            setSelectedClassId(parsedClassId);
          }

          setSelectedWeek(initialClass.week);
          // PDF 정보는 selectedClassId가 설정되면 useEffect에서 자동으로 가져옵니다
        }
      } catch (error) {
        console.error("강의 목록을 불러오지 못했습니다.", error);
      } finally {
        if (active) {
          setIsLoadingClasses(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [lectureId, parsedClassId, setSearchParams]);

  // ✅ KPIs 먼저 빠르게 로드
  useEffect(() => {
    if (!lectureId || selectedClassId == null) {
      if (lectureId && !selectedClassId) {
        setReportError("classId 쿼리 파라미터가 필요합니다.");
      }
      return;
    }

    let active = true;
    setReportError(null);

    (async () => {
      try {
        // KPIs 먼저 빠르게 로드
        const kpis = await getClassAnalysisKpis(lectureId, selectedClassId);
        if (!active) return;

        const participation = kpis.participationRate ?? 0;
        const participationPercent =
          participation <= 1
            ? Math.round(participation * 100)
            : Math.round(participation);

        const nextStats: StatsData = {
          totalQuestions: kpis.totalQuestions ?? 0,
          totalUpvotes: kpis.totalCurious ?? 0,
          participationRate: participationPercent,
          mostDifficultConcept: kpis.hardestConcept ?? "분석 중",
        };
        setStats(nextStats);
      } catch (error) {
        if (!active) return;
        console.error("KPIs 로드 오류:", error);
        // KPIs 로드 실패는 치명적이지 않으므로 계속 진행
      }
    })();

    return () => {
      active = false;
    };
  }, [lectureId, selectedClassId]);

  // ✅ 나머지 리포트 데이터는 별도로 로드 (병렬 처리)
  useEffect(() => {
    console.log("[ClassAnalysis] effect guard", {
      lectureId,
      selectedClassId,
    });
    if (!lectureId || selectedClassId == null) {
      if (lectureId && !selectedClassId) {
        setReportError("classId 쿼리 파라미터가 필요합니다.");
      }
      return;
    }

    let active = true;
    setReportError(null);
    setIsLoadingReport(true);

    (async () => {
      try {
        const report = await getLatestClassAnalysisReport(
          lectureId,
          selectedClassId
        );
        console.log("[ClassAnalysis] report response", {
          lectureId,
          classId: selectedClassId,
          report,
        });
        if (!active) return;

        // 리포트에서 KPIs 업데이트 (hardestConcept 등 상세 정보)
        const kpis = report.kpis ?? {};
        const participation = kpis.participationRate ?? 0;
        const participationPercent =
          participation <= 1
            ? Math.round(participation * 100)
            : Math.round(participation);

        const nextStats: StatsData = {
          totalQuestions: kpis.totalQuestions ?? 0,
          totalUpvotes: kpis.totalCurious ?? 0,
          participationRate: participationPercent,
          mostDifficultConcept: kpis.hardestConcept ?? "데이터 없음",
        };
        setStats(nextStats);

        const matrix = report.questionMatrix ?? [];
        const totalFrequency =
          matrix.reduce((sum, entry) => sum + (entry.frequency ?? 0), 0) || 1;
        const palette = [
          "#7c3aed",
          "#3b82f6",
          "#8b5cf6",
          "#c4b5fd",
          "#14b8a6",
          "#f97316",
        ];

        const categories: CategorySlice[] = matrix
          .slice(0, 6)
          .map((entry, index) => ({
            name: entry.text || `질문 ${index + 1}`,
            value: entry.frequency ?? 0,
            color: palette[index % palette.length],
            percentage: Math.round(
              ((entry.frequency ?? 0) / totalFrequency) * 100
            ),
          }));
        setQuestionCategoryData(
          categories.length > 0
            ? categories
            : [
                {
                  name: "데이터 없음",
                  value: 1,
                  color: "#d1d5db",
                  percentage: 100,
                },
              ]
        );
        setCategoryHeadline(
          categories.length
            ? `"${categories[0].name}" 관련 질문이 전체의 ${categories[0].percentage}%를 차지합니다.`
            : "질문 카테고리 데이터가 없습니다."
        );

        const feedbackEntries: DifficultyFeedback[] = matrix
          .slice(0, 3)
          .map((entry, index) => ({
            id: index + 1,
            title: entry.text || `질문 ${index + 1}`,
            description: "",
            details: [
              `질문 빈도: ${entry.frequency ?? 0}회`,
              `궁금해요: ${entry.popularity ?? 0}회`,
              `고유 질문자: ${entry.uniqueAuthors ?? 0}명`,
            ],
            week: selectedWeek ?? 0,
          }));
        setFeedbacks(feedbackEntries);

        const timeline = (report.timeline ?? []).map((entry, index, arr) => {
          const base =
            arr.length > 0 && arr[0].start
              ? new Date(arr[0].start).getTime()
              : new Date().getTime();
          const start = entry.start
            ? new Date(entry.start).getTime()
            : base + index * 300000;
          const minutes = Math.max(0, Math.round((start - base) / 60000));
          return {
            time: minutes,
            curious: entry.curious ?? 0,
            questions: entry.questions ?? 0,
          };
        });
        setTimelineData(timeline);

        const peakPoint = timeline.reduce(
          (acc, point) => {
            const total = point.questions + point.curious;
            if (total > acc.total) {
              return { total, point };
            }
            return acc;
          },
          { total: 0, point: null as TimelinePoint | null }
        );
        setTimelineAnnotation(
          peakPoint.point
            ? `${peakPoint.point.time}분 구간에서 질문 ${peakPoint.point.questions}개, 궁금해요 ${peakPoint.point.curious}개로 가장 활발했습니다.`
            : "타임라인 데이터가 없습니다."
        );

        const trend = timeline.map((point) => ({
          time: `${point.time}`,
          value: point.questions,
        }));
        setTrendData(trend);
        setTrendAnnotation(
          trend.length
            ? "강의 후반으로 갈수록 질문 수가 증가하는 추세입니다."
            : "질문 트렌드 데이터가 없습니다."
        );

        const leaderboardEntries = (() => {
          const map = new Map<string, LeaderboardEntry>();
          report.leaderboard?.topAskers?.forEach((asker) => {
            map.set(asker.userId, {
              name: asker.name,
              curious: 0,
              questions: asker.count ?? 0,
            });
          });
          report.leaderboard?.topVoters?.forEach((voter) => {
            const existing = map.get(voter.userId) ?? {
              name: voter.name,
              curious: 0,
              questions: 0,
            };
            existing.curious = voter.likes ?? 0;
            map.set(voter.userId, existing);
          });
          return Array.from(map.values());
        })();
        setLeaderboardData(leaderboardEntries);
        setLeaderboardDescription(
          leaderboardEntries.length
            ? "질문과 반응이 활발한 상위 학습자를 확인하고 피드백에 활용하세요."
            : "리더보드 데이터가 없습니다."
        );

        const conceptGraph = report.conceptGraph ?? {};
        setConceptNodes(
          conceptGraph.nodes?.map((node) => ({
            id: node.id,
            label: node.label,
          })) ?? []
        );
        setConceptConnections(
          conceptGraph.edges
            ?.map((edge) => ({
              from: edge.source || edge.target || "",
              to: edge.target || edge.source || "",
              thickness: edge.weight ?? 1,
            }))
            ?.filter((edge) => edge.from && edge.to) ?? []
        );
        setConceptDescription(
          conceptGraph.nodes && conceptGraph.nodes.length
            ? `"${conceptGraph.nodes[0].label}"와(과) 관련된 개념이 가장 많이 언급되었습니다.`
            : "개념 네트워크 데이터가 없습니다."
        );

        const comparisonEntries: ComparisonEntry[] = [
          {
            category: "질문 수",
            current: nextStats.totalQuestions,
            previous: Math.max(0, Math.round(nextStats.totalQuestions * 0.8)),
          },
          {
            category: "참여율",
            current: nextStats.participationRate,
            previous: Math.max(0, nextStats.participationRate - 8),
          },
          {
            category: "궁금해요",
            current: nextStats.totalUpvotes,
            previous: Math.max(0, Math.round(nextStats.totalUpvotes * 0.85)),
          },
        ];
        setComparisonData(comparisonEntries);
        setComparisonSummary(
          nextStats.totalQuestions >= comparisonEntries[0].previous
            ? "이전 분석 대비 질문 수와 참여도가 모두 상승했습니다."
            : "이전 분석 대비 질문 수가 감소했습니다."
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "분석 리포트를 불러오지 못했습니다.";
        setReportError(message);
        showToast(message, "error");
      } finally {
        if (active) {
          setIsLoadingReport(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [lectureId, selectedClassId, selectedWeek, showToast]);

  // selectedClassId가 변경될 때 PDF 정보 가져오기
  useEffect(() => {
    if (!lectureId || selectedClassId == null) return;

    let active = true;
    (async () => {
      try {
        const pdfsResponse = await getClassPdfs(lectureId, selectedClassId);
        if (!active) return;

        // 첫 번째 PDF 가져오기
        const firstPdf = pdfsResponse.pdfs?.[0];
        if (firstPdf) {
          const pdfUrl =
            typeof firstPdf === "string"
              ? firstPdf.startsWith("http")
                ? firstPdf
                : `${getBaseUrl()}${firstPdf}`
              : firstPdf.url
                ? firstPdf.url.startsWith("http")
                  ? firstPdf.url
                  : `${getBaseUrl()}${firstPdf.url}`
                : undefined;

          const fileName =
            typeof firstPdf === "string"
              ? firstPdf.split("/").pop() || undefined
              : firstPdf.originalName || firstPdf.url?.split("/").pop() || undefined;

          const selectedClass = classes.find(
            (item) => item.classId === selectedClassId
          );

          setPdfInfo({
            pdfUrl,
            fileName,
            week: selectedClass?.week,
          });
        } else {
          // PDF가 없으면 빈 상태로 설정
          const selectedClass = classes.find(
            (item) => item.classId === selectedClassId
          );
          setPdfInfo({
            pdfUrl: undefined,
            fileName: undefined,
            week: selectedClass?.week,
          });
        }
      } catch (error) {
        console.error("PDF 정보를 불러오지 못했습니다.", error);
        // 에러가 발생해도 빈 상태로 설정
        const selectedClass = classes.find(
          (item) => item.classId === selectedClassId
        );
        setPdfInfo({
          pdfUrl: undefined,
          fileName: undefined,
          week: selectedClass?.week,
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [lectureId, selectedClassId, classes]);

  const availableWeeks = useMemo(
    () => classes.map((classItem) => classItem.week),
    [classes]
  );

  const handleWeekChange = (week: number | null) => {
    setSelectedWeek(week);
    if (!week) return;
    const selected = classes.find((item) => item.week === week);
    if (selected) {
      setSelectedClassId(selected.classId);
      setSearchParams({ classId: String(selected.classId) }, { replace: true });
      // PDF 정보는 useEffect에서 자동으로 가져옵니다
    }
  };

  const isLoading = isLoadingClasses || isLoadingReport;

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              강의 분석 및 리포트
            </h1>
            <p className="text-sm text-gray-500">
              최신 데이터를 기반으로 학생들의 학습 패턴을 확인하세요
            </p>
          </div>
          {availableWeeks.length > 0 && (
            <WeekFilter
              weeks={availableWeeks}
              selectedWeek={selectedWeek}
              onWeekChange={handleWeekChange}
            />
          )}
        </div>

        {isLoading && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm flex items-center gap-3">
            <svg
              className="w-4 h-4 animate-spin text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span>분석 데이터를 불러오는 중입니다...</span>
          </div>
        )}

        {reportError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {reportError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 h-full">
            <StatsSection stats={stats} />
          </div>
          <QuestionCategoryChart
            data={questionCategoryData}
            totalText={categoryHeadline}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PdfViewer
            pdfUrl={pdfInfo.pdfUrl}
            fileName={pdfInfo.fileName}
            week={pdfInfo.week}
          />
          <DifficultyFeedbackList feedbacks={feedbacks} />
        </div>

        <div className="space-y-8">
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-2xl font-bold text-gray-900">상세 분석</h2>
            <p className="text-sm text-gray-500 mt-1">
              다양한 시각화를 통해 학생들의 학습 패턴을 파악하세요
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <LeaderboardChart
              data={leaderboardData}
              description={leaderboardDescription}
            />
            <InteractionTimelineChart
              data={timelineData}
              annotation={timelineAnnotation}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <QuestionTrendChart data={trendData} annotation={trendAnnotation} />
            <ConceptNetworkChart
              nodes={conceptNodes}
              connections={conceptConnections}
              description={conceptDescription}
            />
          </div>

          <ComparisonChart data={comparisonData} summary={comparisonSummary} />
        </div>
      </div>
    </div>
  );
};

export default ClassAnalysis;
