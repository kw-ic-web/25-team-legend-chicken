import React from "react";
import { MessageCircle, ThumbsUp, Users, AlertCircle } from "lucide-react";
import StatCard from "./StatCard";
import type { StatsData } from "./types";

interface StatsSectionProps {
  stats: StatsData;
}

const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Realtime KPI
          </p>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            이번 수업 핵심 지표
          </h2>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
          최신 데이터
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={MessageCircle}
          iconBgColor="bg-gradient-to-br from-sky-50 to-sky-100"
          iconColor="text-sky-600"
          title="총 질문 수"
          value={`${stats.totalQuestions}개`}
        />
        <StatCard
          icon={ThumbsUp}
          iconBgColor="bg-gradient-to-br from-emerald-50 to-emerald-100"
          iconColor="text-emerald-600"
          title="총 UPVOTE수"
          value={`${stats.totalUpvotes}개`}
        />
        <StatCard
          icon={Users}
          iconBgColor="bg-gradient-to-br from-violet-50 to-violet-100"
          iconColor="text-violet-600"
          title="참여 학생 비율"
          value={`${stats.participationRate}%`}
        />
        <StatCard
          icon={AlertCircle}
          iconBgColor="bg-gradient-to-br from-amber-50 to-amber-100"
          iconColor="text-amber-600"
          title="가장 어려운 개념"
          value={stats.mostDifficultConcept}
        />
      </div>
    </section>
  );
};

export default StatsSection;
