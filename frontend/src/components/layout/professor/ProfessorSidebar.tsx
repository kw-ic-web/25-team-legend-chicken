import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import CommonSidebar from "../CommonSidebar";
import CreateClassModal from "../../modal/createClass/CreateClassModal";
import CreateClassCompleteModal from "../../modal/createClass/CreateClassCompleteModal";
import { getMyInfo } from "../../../api/auth";
import { getBaseUrl } from "../../../api/auth/client";
import {
  getLectures,
  createLecture,
  type Lecture,
} from "../../../api/professor";

type ClosestClassType = {
  date: Date;
  lectureId: string;
  title: string;
};

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
    id: "",
    name: "",
    title: "강의자",
    affiliation: "광운대학교 정보융합학부", // API에 없으므로 기본값 유지
    currentLectures: 0,
    profileImage: undefined as string | undefined,
  });

  // 곧 다가올 강의 (실시간 계산된 데이터)
  const [upcomingLectures, setUpcomingLectures] = useState<
    Array<{
      title: string;
      time: string;
      countdown: string;
      lectureId: string;
      classDate: Date; // 원본 날짜 저장
    }>
  >([]);

  // 내 강의 목록
  const [myLectures, setMyLectures] = useState<
    Array<{
      title: string;
      participants: number;
      lectureId: string;
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
        const profileImage = myInfoResponse.user.profile_image
          ? myInfoResponse.user.profile_image.startsWith("http")
            ? myInfoResponse.user.profile_image
            : `${getBaseUrl()}${myInfoResponse.user.profile_image}`
          : undefined;
        
        setProfessorInfo({
          id: myInfoResponse.user.id,
          name: myInfoResponse.user.name,
          title: "강의자",
          affiliation: "광운대학교 정보융합학부", // API에 없으므로 기본값 유지
          currentLectures: lecturesResponse?.lectures.length || 0,
          profileImage: profileImage,
        });
      }

      // 강의 목록 처리
      if (lecturesResponse?.lectures) {
        const now = new Date();
        const upcoming: Array<{
          title: string;
          time: string;
          countdown: string;
          lectureId: string;
          classDate: Date;
        }> = [];
        const myLecturesList: Array<{
          title: string;
          participants: number;
          lectureId: string;
        }> = [];

        lecturesResponse.lectures.forEach((lecture: Lecture) => {
          // 내 강의 목록에 추가
          myLecturesList.push({
            title: lecture.name,
            participants: lecture.student_count,
            lectureId: lecture.lecture_id,
          });

          // 곧 다가올 강의 찾기 (모든 클래스 확인하여 가장 가까운 다음 강의 찾기)
          if (lecture.classes && lecture.classes.length > 0) {
            let closestClass: ClosestClassType | null = null;
            
            // 모든 클래스 중에서 가장 가까운 미래 강의 찾기
            lecture.classes.forEach((cls) => {
              if (cls.date) {
                const classDate = new Date(cls.date);
              if (classDate > now) {
                  if (!closestClass || classDate < closestClass.date) {
                    closestClass = {
                      date: classDate,
                      lectureId: lecture.lecture_id,
                      title: lecture.name,
                    };
                  }
                }
              }
            });

            // 가장 가까운 강의가 7일 이내인 경우 추가
            if (closestClass !== null) {
              // 타입 추론을 위한 명시적 타입 지정
              const closest: ClosestClassType = closestClass;
              // 날짜만 비교하여 정확한 일수 계산
              const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const classDateOnly = new Date(closest.date.getFullYear(), closest.date.getMonth(), closest.date.getDate());
              const diffDays = Math.ceil((classDateOnly.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));

              if (diffDays >= 0 && diffDays <= 7) {
                const hours = closest.date.getHours();
                const minutes = closest.date.getMinutes();
                  const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

                  upcoming.push({
                  title: closest.title,
                    time: timeStr,
                  countdown: `D-${diffDays}`,
                  lectureId: closest.lectureId,
                  classDate: closest.date, // 원본 날짜 저장
                  });
              }
            }
          }
        });

        // 날짜순으로 정렬 (가까운 날짜가 먼저)
        upcoming.sort((a, b) => {
          return a.classDate.getTime() - b.classDate.getTime();
        });

        setUpcomingLectures(upcoming.slice(0, 3)); // 최대 3개만 표시
        setMyLectures(myLecturesList); // 모든 강의 표시 (스크롤 가능)
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

  // 실시간 카운트다운 업데이트 (10초마다)
  useEffect(() => {
    if (upcomingLectures.length === 0) return;

    const updateCountdown = () => {
      const now = new Date();
      setUpcomingLectures((prev) => {
        const updated = prev
          .map((lecture) => {
            const classDate = lecture.classDate;
            if (!classDate || classDate <= now) {
              // 이미 지난 강의는 제외
              return null;
            }

            // 날짜만 비교하여 정확한 일수 계산
            const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const classDateOnly = new Date(classDate.getFullYear(), classDate.getMonth(), classDate.getDate());
            const diffDays = Math.ceil((classDateOnly.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // 지난 강의나 7일을 넘어가면 제외
            if (diffDays < 0 || diffDays > 7) {
              return null;
            }

            const hours = classDate.getHours();
            const minutes = classDate.getMinutes();
            const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

            return {
              ...lecture,
              countdown: `D-${diffDays}`,
              time: timeStr,
            };
          })
          .filter((lecture): lecture is NonNullable<typeof lecture> => lecture !== null)
          .sort((a, b) => a.classDate.getTime() - b.classDate.getTime())
          .slice(0, 3);
        
        return updated;
      });
    };

    // 즉시 한 번 업데이트
    updateCountdown();

    // 10초마다 업데이트 (더 자주 업데이트하면 실시간 느낌)
    const interval = setInterval(updateCountdown, 10000);

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 빈 배열로 설정하여 한 번만 실행

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
              className="inline-flex items-center justify-center space-x-1 rounded-md border border-[#3A6EFF] text-[#1F3A93] font-medium text-xs px-3 py-1.5 bg-white hover:bg-[#3A6EFF] hover:text-white transition-colors duration-150 shadow-sm"
            >
              <Plus className="w-3 h-3" />
              <span>새로운 강좌 만들기</span>
            </button>
          </div>
        }
      />

      {/* 강좌 개설 모달 */}
      <CreateClassModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async ({
          title,
          description,
          capacity,
          startDate,
          endDate,
          thumbnailFile,
        }) => {
          try {
            // 교수 정보 가져오기
            const myInfo = await getMyInfo();
            if (!myInfo.success || !myInfo.user) {
              throw new Error("교수 정보를 불러올 수 없습니다.");
            }

            // schedule 생성 (시작일-종료일 형식)
            const schedule = `${startDate} ~ ${endDate}`;

            // API 호출
            await createLecture({
              name: title,
              schedule: schedule,
              student_count: capacity,
              professor_name: myInfo.user.name,
              professor_email: myInfo.user.email,
              professor_phone: myInfo.user.phone || "",
              lecture_description: description || "",
              learning_method: "",
              target_audience: "",
              references: [],
              classes: [],
              thumbnail: thumbnailFile,
            });

            // 성공 시 완료 모달 표시
            setCreatedClass({ title, capacity, startDate, endDate });
            setIsCreateOpen(false);
            setIsCreateCompleteOpen(true);

            // 강의 목록 새로고침
            fetchData();
          } catch (error) {
            console.error("강좌 개설 실패:", error);
            const message =
              error instanceof Error
                ? error.message
                : "강좌 개설 중 오류가 발생했습니다.";
            alert(message);
          }
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
