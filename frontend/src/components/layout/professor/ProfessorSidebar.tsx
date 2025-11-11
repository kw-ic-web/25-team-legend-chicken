import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import CommonSidebar from "../CommonSidebar";
import CreateClassModal from "../../modal/createClass/CreateClassModal";
import CreateClassCompleteModal from "../../modal/createClass/CreateClassCompleteModal";
import { getMyInfo } from "../../../api/auth";
import { getLectures, type Lecture } from "../../../api/professor";

const ProfessorSidebar: React.FC = () => {
  // 방송 시작 관련 모달 로직은 추후 필요 시 다시 연결
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateCompleteOpen, setIsCreateCompleteOpen] = useState(false);
  const [createdClass, setCreatedClass] = useState({
    title: "",
    capacity: 0,
    startDate: "",
    endDate: "",
  });
  const navigate = useNavigate();

  // 교수 정보
  const [professorInfo, setProfessorInfo] = useState({
    name: "",
    title: "강의자",
    affiliation: "광운대학교 정보융합학부", // API에 없으므로 기본값 유지
    currentLectures: 0,
  });

  // 곧 다가올 강의
  const [upcomingLectures, setUpcomingLectures] = useState<
    Array<{
      title: string;
      time: string;
      countdown: string;
    }>
  >([]);

  // 내 강의 목록
  const [myLectures, setMyLectures] = useState<
    Array<{
      title: string;
      participants: number;
    }>
  >([]);

  const fetchData = useCallback(async () => {
    try {
      // 교수 정보와 강의 목록을 병렬로 조회
      // GET /api/myinfo - 내 정보 조회
      const [myInfoResponse, lecturesResponse] = await Promise.all([
        getMyInfo().catch((error) => {
          console.error("내 정보 조회 실패:", error);
          return null;
        }),
        getLectures().catch((error) => {
          console.error("강의 목록 조회 실패:", error);
          return null;
        }),
      ]);

      // 교수 정보 업데이트 (GET /api/myinfo 응답 사용)
      if (myInfoResponse?.success && myInfoResponse.user) {
        setProfessorInfo({
          name: myInfoResponse.user.name,
          title: "강의자",
          affiliation: "광운대학교 정보융합학부", // API에 없으므로 기본값 유지
          currentLectures: lecturesResponse?.lectures.length || 0,
        });
      }

      // 강의 목록 처리
      if (lecturesResponse?.lectures) {
        const now = new Date();
        const upcoming: Array<{
          title: string;
          time: string;
          countdown: string;
        }> = [];
        const myLecturesList: Array<{
          title: string;
          participants: number;
        }> = [];

        lecturesResponse.lectures.forEach((lecture: Lecture) => {
          // 내 강의 목록에 추가
          myLecturesList.push({
            title: lecture.name,
            participants: lecture.student_count,
          });

          // 곧 다가올 강의 찾기 (classes의 첫 번째 날짜 기준)
          if (lecture.classes && lecture.classes.length > 0) {
            const firstClass = lecture.classes[0];
            if (firstClass.date) {
              const classDate = new Date(firstClass.date);
              if (classDate > now) {
                const diffTime = classDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 7) {
                  // 7일 이내 강의만 표시
                  const hours = classDate.getHours();
                  const minutes = classDate.getMinutes();
                  const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

                  upcoming.push({
                    title: lecture.name,
                    time: timeStr,
                    countdown: diffDays === 0 ? "오늘" : `D-${diffDays}`,
                  });
                }
              }
            }
          }
        });

        // 날짜순으로 정렬 (가까운 날짜가 먼저)
        upcoming.sort((a, b) => {
          const aDays = parseInt(a.countdown.replace(/[^0-9]/g, "") || "999");
          const bDays = parseInt(b.countdown.replace(/[^0-9]/g, "") || "999");
          return aDays - bDays;
        });

        setUpcomingLectures(upcoming.slice(0, 3)); // 최대 3개만 표시
        setMyLectures(myLecturesList.slice(0, 4)); // 최대 4개만 표시
      }
    } catch (error) {
      console.error("데이터 로드 오류:", error);
    }
  }, []);

  // 데이터 로드
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = () => {
      fetchData();
    };
    window.addEventListener("myinfo:update", handler);
    return () => {
      window.removeEventListener("myinfo:update", handler);
    };
  }, [fetchData]);

  return (
    <>
      <CommonSidebar
        userType="professor"
        userInfo={professorInfo}
        upcomingLectures={upcomingLectures}
        myLectures={myLectures}
        additionalContent={
          <div className="px-6 pt-3 pb-6">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="w-full border-2 border-[#3A6EFF] text-[#3A6EFF] font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 hover:bg-[#3A6EFF] hover:text-white"
            >
              <Plus className="w-5 h-5" />
              <span>새로운 강좌 만들기</span>
            </button>
          </div>
        }
      />

      {/* 강좌 개설 모달 */}
      <CreateClassModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={({ title, capacity, startDate, endDate }) => {
          setCreatedClass({ title, capacity, startDate, endDate });
          setIsCreateOpen(false);
          setIsCreateCompleteOpen(true);
        }}
      />

      {/* 개설 완료 모달 */}
      <CreateClassCompleteModal
        isOpen={isCreateCompleteOpen}
        onClose={() => setIsCreateCompleteOpen(false)}
        title={createdClass.title}
        capacity={createdClass.capacity}
        startDate={createdClass.startDate}
        endDate={createdClass.endDate}
        onEdit={() => {
          setIsCreateCompleteOpen(false);
          setIsCreateOpen(true);
        }}
        onGoDashboard={() => {
          setIsCreateCompleteOpen(false);
          navigate("/professor/dashboard");
        }}
      />
    </>
  );
};

export default ProfessorSidebar;
