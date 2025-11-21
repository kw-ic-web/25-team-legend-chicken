import React, { useMemo, useState } from "react";
import { PenSquare, Plus, Trash2 } from "lucide-react";
import Modal from "../common/Modal";
import type { LectureClass } from "../../api/professor";
import {
  addLectureClass,
  updateLectureClasses,
  deleteLectureClass,
} from "../../api/professor";

type ClassFormState = {
  title: string;
  description: string;
  date: string;
  materialsInput: string;
};

const defaultFormState: ClassFormState = {
  title: "",
  description: "",
  date: "",
  materialsInput: "",
};

interface ClassManagementPanelProps {
  lectureId: string;
  classes: LectureClass[];
  onRequestRefresh: () => Promise<void> | void;
  onShowToast: (message: string, type?: "success" | "error") => void;
}

const ClassManagementPanel: React.FC<ClassManagementPanelProps> = ({
  lectureId,
  classes,
  onRequestRefresh,
  onShowToast,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<LectureClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<LectureClass | null>(null);
  const [formState, setFormState] = useState<ClassFormState>(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => a.id - b.id);
  }, [classes]);

  const canManage = Boolean(lectureId);

  const handleOpenAdd = () => {
    setFormState({
      title: "",
      description: "",
      date: "",
      materialsInput: "",
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cls: LectureClass) => {
    setEditingClass(cls);
    setFormState({
      title: cls.title,
      description: cls.description,
      date: cls.date ? new Date(cls.date).toISOString().slice(0, 16) : "",
      materialsInput: (cls.materials || []).join("\n"),
    });
  };

  const handleCloseModals = () => {
    setIsAddModalOpen(false);
    setEditingClass(null);
    setDeletingClass(null);
    setFormState(defaultFormState);
  };

  const parseMaterials = () => {
    return formState.materialsInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  };

  const toISOString = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString();
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureId) return;
    setIsSubmitting(true);
    try {
      await addLectureClass(lectureId, {
        title: formState.title,
        description: formState.description,
        date: toISOString(formState.date),
        materials: parseMaterials(),
      });
      onShowToast("클래스가 추가되었습니다.", "success");
      await onRequestRefresh();
      handleCloseModals();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "클래스를 추가하는 중 오류가 발생했습니다.";
      onShowToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureId || !editingClass) return;
    setIsSubmitting(true);
    try {
      await updateLectureClasses(lectureId, {
        classes: [
          {
            id: editingClass.id,
            title: formState.title,
            description: formState.description,
            date: toISOString(formState.date),
            materials: parseMaterials(),
          },
        ],
      });
      onShowToast("클래스 정보가 수정되었습니다.", "success");
      await onRequestRefresh();
      handleCloseModals();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "클래스를 수정하는 중 오류가 발생했습니다.";
      onShowToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!lectureId || !deletingClass) return;
    setIsSubmitting(true);
    try {
      await deleteLectureClass(lectureId, deletingClass.id);
      onShowToast("클래스가 삭제되었습니다.", "success");
      await onRequestRefresh();
      handleCloseModals();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "클래스를 삭제하는 중 오류가 발생했습니다.";
      onShowToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          제목
        </label>
        <input
          type="text"
          value={formState.title}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, title: e.target.value }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="클래스 제목을 입력하세요"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          설명
        </label>
        <textarea
          value={formState.description}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, description: e.target.value }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="클래스 설명을 입력하세요"
          rows={3}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          일정
        </label>
        <input
          type="datetime-local"
          value={formState.date}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, date: e.target.value }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          자료 링크 (줄바꿈으로 구분)
        </label>
        <textarea
          value={formState.materialsInput}
          onChange={(e) =>
            setFormState((prev) => ({
              ...prev,
              materialsInput: e.target.value,
            }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/document.pdf"
          rows={4}
        />
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <button
          type="button"
          onClick={handleCloseModals}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          disabled={isSubmitting}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {isSubmitting ? "처리 중..." : "저장"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="mt-10 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">클래스 관리</h2>
          <p className="text-sm text-gray-500 mt-1">
            강좌에 포함된 클래스를 추가, 수정, 삭제할 수 있습니다.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          disabled={!canManage}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          <span>클래스 추가</span>
        </button>
      </div>

      <div className="p-6 overflow-x-auto">
        {sortedClasses.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-6">
            등록된 클래스가 없습니다. 상단의 버튼으로 클래스를 추가해 주세요.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  번호
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  제목
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  일정
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  자료 수
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedClasses.map((cls) => (
                <tr key={cls.id}>
                  <td className="px-4 py-3 text-sm text-gray-700">{cls.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {cls.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {cls.date ? new Date(cls.date).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {cls.materials?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(cls)}
                      className="inline-flex items-center px-3 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <PenSquare className="w-4 h-4 mr-1" />
                      수정
                    </button>
                    <button
                      onClick={() => setDeletingClass(cls)}
                      className="inline-flex items-center px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseModals}
        title="클래스 추가"
        size="lg"
      >
        {renderForm(handleAddClass)}
      </Modal>

      <Modal
        isOpen={Boolean(editingClass)}
        onClose={handleCloseModals}
        title="클래스 수정"
        size="lg"
      >
        {renderForm(handleEditClass)}
      </Modal>

      <Modal
        isOpen={Boolean(deletingClass)}
        onClose={handleCloseModals}
        title="클래스 삭제"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            선택한 클래스를 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <div className="font-semibold text-gray-900">
              {deletingClass?.title}
            </div>
            <div>{deletingClass?.description || "-"}</div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCloseModals}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              onClick={handleDeleteClass}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClassManagementPanel;
