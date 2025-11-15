import React from "react";
import { MessageCircle, ThumbsUp, Users, AlertCircle } from "lucide-react";
import StatCard from "./StatCard";
import type { StatsData } from "./types";

interface StatsSectionProps {
  stats: StatsData;
}

const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={MessageCircle}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
        title="총 질문 수"
        value={`${stats.totalQuestions}개`}
      />
      <StatCard
        icon={ThumbsUp}
        iconBgColor="bg-green-100"
        iconColor="text-green-600"
        title="총 UPVOTE수"
        value={`${stats.totalUpvotes}개`}
      />
      <StatCard
        icon={Users}
        iconBgColor="bg-purple-100"
        iconColor="text-purple-600"
        title="참여 학생 비율"
        value={`${stats.participationRate}%`}
      />
      <StatCard
        icon={AlertCircle}
        iconBgColor="bg-orange-100"
        iconColor="text-orange-600"
        title="가장 어려운 개념"
        value={stats.mostDifficultConcept}
      />
    </div>
  );
};

export default StatsSection;

