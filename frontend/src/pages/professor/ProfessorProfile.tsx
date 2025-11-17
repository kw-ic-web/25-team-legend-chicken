import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyInfo, updateMyInfo, logoutUser } from "../../api/auth";
import { getBaseUrl } from "../../api/auth/client";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

const ProfessorProfile: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState("");
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    const fetchMyInfo = async () => {
      try {
        const response = await getMyInfo();
        const { user } = response;
        setName(user.name);
        setEmail(user.email);
        setPhone(user.phone ?? "");
        setUserType(user.user_type);
        setCurrentImage(user.profile_image ?? null);
      } catch (error) {
        console.error("내 정보 조회 실패:", error);
        const message =
          error instanceof Error
            ? error.message
            : "내 정보를 불러오지 못했습니다.";
        showToast(message, "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyInfo();
  }, [showToast]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resolvedProfileImage = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (!currentImage) return null;
    return currentImage.startsWith("http")
      ? currentImage
      : `${getBaseUrl()}${currentImage}`;
  }, [currentImage, previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedImage(null);
      setPreviewUrl(null);
      return;
    }
    setSelectedImage(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        password: password.trim() ? password.trim() : undefined,
        profile_image: selectedImage,
      };

      const response = await updateMyInfo(payload);
      const { user } = response;

      setName(user.name);
      setPhone(user.phone ?? "");
      setCurrentImage(user.profile_image ?? null);
      setSelectedImage(null);
      setPassword("");
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      window.dispatchEvent(new Event("myinfo:update"));

      showToast(response.message ?? "내 정보가 저장되었습니다.", "success");
    } catch (error) {
      console.error("내 정보 수정 실패:", error);
      const message =
        error instanceof Error
          ? error.message
          : "내 정보를 저장하는 중 오류가 발생했습니다.";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const response = await logoutUser();
      showToast(
        response.message ?? "정상적으로 로그아웃되었습니다.",
        "success"
      );
    } catch (error) {
      console.error("로그아웃 실패:", error);
      const message =
        error instanceof Error
          ? error.message
          : "로그아웃 중 오류가 발생했습니다.";
      showToast(message, "error");
      setIsLoggingOut(false);
      return;
    }

    localStorage.removeItem("lecq.token");
    logout();
    setIsLoggingOut(false);
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 600);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">내 정보</h1>

        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center text-gray-500">
            정보를 불러오는 중입니다...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-8"
          >
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                기본 정보
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    이름
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이름을 입력해주세요"
                    required
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full border border-gray-200 bg-gray-100 text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    연락처
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="연락처를 입력해주세요"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    사용자 유형
                  </label>
                  <input
                    type="text"
                    value={userType === "professor" ? "교수" : userType}
                    readOnly
                    className="w-full border border-gray-200 bg-gray-100 text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                비밀번호 변경
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="변경할 비밀번호 (선택)"
                  />
                  <p className="text-xs text-gray-500">
                    비밀번호를 변경하지 않으려면 비워두세요.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                프로필 이미지
              </h2>
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                  {resolvedProfileImage ? (
                    <img
                      src={resolvedProfileImage}
                      alt="프로필 이미지"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm text-gray-400">No Image</span>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  <input
                    id="profile-image"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500">
                    png, jpg, jpeg, gif, webp 형식을 지원합니다.
                  </p>
                </div>
              </div>
            </section>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg border border-red-500 text-red-600 hover:bg-red-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
              </button>
              <div className="flex items-center space-x-3">
                <button
                  type="reset"
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                  onClick={() => {
                    setPassword("");
                    setSelectedImage(null);
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }
                  }}
                >
                  변경 취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSaving}
                >
                  {isSaving ? "저장 중..." : "저장하기"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfessorProfile;
