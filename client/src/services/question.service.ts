import api from '@/lib/apiClient';
import type { ApiResponse, Question } from '@/types';

interface QuestionFilters {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest';
  q?: string;
}

interface SellerQuestionFilters {
  page?: number;
  limit?: number;
  status?: 'all' | 'unanswered' | 'answered';
}

const cleanParams = (f: object) =>
  Object.fromEntries(
    Object.entries(f).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  );

export const questionService = {
  async listOrchardQuestions(orchardId: string, filters: QuestionFilters = {}) {
    const { data } = await api.get<ApiResponse<Question[]>>(`/orchards/${orchardId}/questions`, {
      params: cleanParams(filters),
    });
    return data;
  },

  async createQuestion(orchardId: string, question: string) {
    const { data } = await api.post<ApiResponse<Question>>(`/orchards/${orchardId}/questions`, {
      question,
    });
    return data.data;
  },

  async answerQuestion(questionId: string, answer: string) {
    const { data } = await api.put<ApiResponse<Question>>(`/questions/${questionId}/answer`, {
      answer,
    });
    return data.data;
  },

  async deleteAnswer(questionId: string) {
    const { data } = await api.delete<ApiResponse<Question>>(`/questions/${questionId}/answer`);
    return data.data;
  },

  async markOfficial(questionId: string, isOfficialAnswer: boolean) {
    const { data } = await api.patch<ApiResponse<Question>>(`/questions/${questionId}/official`, {
      isOfficialAnswer,
    });
    return data.data;
  },

  async reportQuestion(questionId: string) {
    await api.patch(`/questions/${questionId}/report`);
  },

  async deleteQuestion(questionId: string) {
    await api.delete(`/questions/${questionId}`);
  },

  async listSellerQuestions(filters: SellerQuestionFilters = {}) {
    const { data } = await api.get<ApiResponse<Question[]>>('/questions/seller', {
      params: cleanParams(filters),
    });
    return data;
  },

  async listAllQuestions(filters: { page?: number; limit?: number; status?: string; q?: string } = {}) {
    const { data } = await api.get<ApiResponse<Question[]>>('/questions', {
      params: cleanParams(filters),
    });
    return data;
  },

  async dismissReport(questionId: string) {
    await api.patch(`/questions/${questionId}/dismiss`);
  },
};
