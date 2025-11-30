import React, { useState, useEffect, useCallback } from "react";
import CommonSidebar from "../CommonSidebar";
import { joinLecture, getMyLectures } from "../../../api/student";
import { getLectures, type Lecture } from "../../../api/professor";
import { getMyInfo } from "../../../api/auth";
import { getBaseUrl } from "../../../api/auth/client";
import { X, BookOpen, CheckCircle, AlertCircle } from "lucide-react";

const StudentSidebar: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lectureId, setLectureId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 학생 정보
  const [studentInfo, setStudentInfo] = useState({
    id: "",
    name: "",
    title: "학생",
    affiliation: "광운대학교 정보융합학부", // API에 없으므로 기본값 유지
    profileImage: undefined as string | undefined,
  });

  // 참여 중인 강의
  const [myLectures, setMyLectures] = useState<
    Array<{
      title: string;
      participants?: number;
      subtitle?: string;
      meta?: string;
      lectureId?: string;
    }>
  >([]);

  // 곧 다가올 강의
  const [upcomingLectures, setUpcomingLectures] = useState<
    Array<{
      title: string;
      time: string;
      countdown: string;
      lectureId: string;
      classDate: Date;
    }>
  >([]);

  const fetchData = useCallback(async () => {
    try {
      // 학생 정보와 강의 목록을 병렬로 조회
      // getLectures API는 학생도 사용 가능하고 classes 정보를 포함함
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

      // 학생 정보 업데이트
      if (myInfoResponse?.success && myInfoResponse.user) {
        const profileImage = myInfoResponse.user.profile_image
          ? myInfoResponse.user.profile_image.startsWith("http")
            ? myInfoResponse.user.profile_image
            : `${getBaseUrl()}${myInfoResponse.user.profile_image}`
          : undefined;
        
        setStudentInfo({
          id: myInfoResponse.user.id,
          name: myInfoResponse.user.name,
          title: "학생",
          affiliation: "광운대학교 정보융합학부", // API에 없으므로 기본값 유지
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
          subtitle?: string;
          meta?: string;
          lectureId: string;
        }> = [];

        lecturesResponse.lectures.forEach((lecture: Lecture) => {
          // 내 강의 목록에 추가
          myLecturesList.push({
            title: lecture.name,
            subtitle: lecture.professor_name
              ? `${lecture.professor_name} 교수님`
              : undefined,
            meta: lecture.schedule,
            lectureId: lecture.lecture_id,
          });

          // 곧 다가올 강의 찾기 (모든 클래스 확인하여 가장 가까운 다음 강의 찾기)
          if (lecture.classes && lecture.classes.length > 0) {
            let closestClass: { date: Date; lectureId: string; title: string } | null = null;
            
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
            if (closestClass) {
              // 날짜만 비교하여 정확한 일수 계산
              const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const classDateOnly = new Date(closestClass.date.getFullYear(), closestClass.date.getMonth(), closestClass.date.getDate());
              const diffDays = Math.ceil((classDateOnly.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));

              if (diffDays >= 0 && diffDays <= 7) {
                const hours = closestClass.date.getHours();
                const minutes = closestClass.date.getMinutes();
                const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

                upcoming.push({
                  title: closestClass.title,
                  time: timeStr,
                  countdown: `D-${diffDays}`,
                  lectureId: closestClass.lectureId,
                  classDate: closestClass.date,
                });
              }
            }
          }
        });
        
        // 날짜순으로 정렬 (가까운 날짜가 먼저)
        upcoming.sort((a, b) => a.classDate.getTime() - b.classDate.getTime());
        
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

  // 강좌 참가 성공 후 데이터 새로고침을 위한 이벤트 리스너
  useEffect(() => {
    const handler = () => {
      fetchData();
    };
    window.addEventListener("lecture:joined", handler);
    return () => {
      window.removeEventListener("lecture:joined", handler);
    };
  }, [fetchData]);

  // 프로필 정보 업데이트 이벤트 리스너
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

    // 10초마다 업데이트
    const interval = setInterval(updateCountdown, 10000);

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 빈 배열로 설정하여 한 번만 실행

  const handleJoinLecture = async () => {
    if (!lectureId.trim()) {
      setErrorMessage("강좌 ID를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await joinLecture(lectureId.trim());
      setSuccessMessage(
        `강좌에 성공적으로 참가했습니다!\n강좌명: ${response.lecture.name}\n현재 인원: ${response.current_count}/${response.max_count}`
      );
      setLectureId("");
      // 3초 후 모달 닫기
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage(null);
        // 강의 목록 새로고침
        fetchData();
        // 이벤트 발생시켜 다른 컴포넌트도 업데이트 가능하도록
        window.dispatchEvent(new Event("lecture:joined"));
      }, 3000);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "강좌 참가에 실패했습니다.";
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setLectureId("");
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <>
      <CommonSidebar
        userType="student"
        userInfo={studentInfo}
        myLectures={myLectures}
        upcomingLectures={upcomingLectures}
        additionalContent={
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <BookOpen className="w-5 h-5" />
              <span>강좌 참가하기</span>
            </button>
          </div>
        }
      />

      {/* 강좌 참가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                강좌 참가하기
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-6">
              <div className="mb-4">
                <label
                  htmlFor="lectureId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  강좌 ID
                </label>
                <input
                  id="lectureId"
                  type="text"
                  value={lectureId}
                  onChange={(e) => setLectureId(e.target.value)}
                  placeholder="예: LEC-D1897635"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !isLoading) {
                      handleJoinLecture();
                    }
                  }}
                />
                <p className="mt-2 text-xs text-gray-500">
                  교수님으로부터 받은 강좌 ID를 입력해주세요.
                </p>
              </div>

              {/* 성공 메시지 */}
              {successMessage && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-800 whitespace-pre-line">
                      {successMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* 에러 메시지 */}
              {errorMessage && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800">{errorMessage}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isLoading}
              >
                취소
              </button>
              <button
                onClick={handleJoinLecture}
                disabled={isLoading || !lectureId.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>참가 중...</span>
                  </>
                ) : (
                  <span>참가하기</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentSidebar;
