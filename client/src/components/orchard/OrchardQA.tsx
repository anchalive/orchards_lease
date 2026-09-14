import { useEffect, useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { questionService } from '@/services/question.service';
import type { Question } from '@/types';
import { Button, Textarea } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { 
  Search, 
  MessageSquare, 
  CheckCircle, 
  Trash2, 
  Flag, 
  CornerDownRight, 
  Edit3, 
  X,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/apiClient';

interface OrchardQAProps {
  orchardId: string;
  sellerId: string;
}

export function OrchardQA({ orchardId, sellerId }: OrchardQAProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Forms state
  const [newQuestion, setNewQuestion] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  // Replying/Editing answer state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Check roles
  const isSellerOwner = user && String(user._id || user.id) === String(sellerId) && user.role === 'seller';
  const isAdmin = user && user.role === 'admin';
  const canAsk = user && user.role === 'renter';

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadQuestions = () => {
    setLoading(true);
    questionService
      .listOrchardQuestions(orchardId, {
        page,
        limit: 5,
        sort: sortOrder,
        q: debouncedSearch,
      })
      .then((res) => {
        setQuestions(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages);
          setTotalQuestions(res.meta.total);
        }
        setError('');
      })
      .catch((err) => {
        setError(getErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadQuestions();
  }, [orchardId, page, sortOrder, debouncedSearch]);

  const handleAskQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setSubmittingQuestion(true);
    try {
      await questionService.createQuestion(orchardId, newQuestion.trim());
      toast.success('Your question has been posted!');
      setNewQuestion('');
      setPage(1);
      loadQuestions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleStartReply = (q: Question) => {
    setReplyingToId(q._id);
    setAnswerText(q.answer || '');
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setAnswerText('');
  };

  const handlePostAnswer = async (questionId: string) => {
    if (!answerText.trim()) return;

    setSubmittingAnswer(true);
    try {
      await questionService.answerQuestion(questionId, answerText.trim());
      toast.success('Answer published successfully');
      setReplyingToId(null);
      setAnswerText('');
      loadQuestions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleToggleOfficial = async (questionId: string, currentStatus: boolean) => {
    try {
      await questionService.markOfficial(questionId, !currentStatus);
      toast.success(`Marked answer as ${!currentStatus ? 'Official' : 'Regular'}`);
      loadQuestions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteAnswer = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;

    try {
      await questionService.deleteAnswer(questionId);
      toast.success('Reply deleted');
      loadQuestions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleReportQuestion = async (questionId: string) => {
    try {
      await questionService.reportQuestion(questionId);
      toast.success('Question reported to moderation');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('Admin Action: Delete this question entirely?')) return;

    try {
      await questionService.deleteQuestion(questionId);
      toast.success('Question deleted');
      loadQuestions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="rounded-[18px] border border-sand bg-cream p-5 md:p-[26px]">
      
      {/* Top Filter and Search Control */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-faint" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by keywords..."
            className="w-full rounded-xl border border-sand bg-white pl-9 pr-4 py-2.5 text-[13.5px] font-semibold text-ink outline-none placeholder:text-faint focus:border-forest/60 focus:ring-1 focus:ring-forest/60 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-faint hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <label className="text-[12px] font-bold text-faint uppercase tracking-wider">Sort</label>
          <select
            value={sortOrder}
            onChange={(e: any) => setSortOrder(e.target.value)}
            className="rounded-xl border border-sand bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-forest transition-all"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Ask Question Form */}
      {canAsk ? (
        <form onSubmit={handleAskQuestion} className="mb-8 rounded-2xl border border-sand bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-serif text-[15px] font-bold text-ink">Have a question about this orchard?</h3>
          <Textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask about harvest quality, facilities, water availability..."
            className="min-h-[80px] text-sm"
            maxLength={1000}
            required
          />
          <div className="mt-3 flex items-center justify-between text-xs text-faint font-semibold">
            <span>{newQuestion.length}/1000 characters</span>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submittingQuestion}
              disabled={!newQuestion.trim() || newQuestion.trim().length < 3}
            >
              Post Question
            </Button>
          </div>
        </form>
      ) : !user ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-chip/60 p-3.5 text-xs font-semibold text-sub">
          <AlertCircle className="h-4 w-4 text-forest" />
          <span>Please log in as a renter to post questions.</span>
        </div>
      ) : null}

      {/* Questions List */}
      {loading ? (
        <div className="flex flex-col gap-4 py-6">
          <div className="h-20 w-full animate-pulse rounded-xl bg-sand/30" />
          <div className="h-20 w-full animate-pulse rounded-xl bg-sand/30" />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 p-4 text-center text-sm font-semibold text-terra">
          {error}
        </div>
      ) : questions.length === 0 ? (
        <div className="py-10 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-faint" />
          <p className="text-sm font-bold text-sub">No questions found</p>
          <p className="mt-1 text-xs text-faint">
            {debouncedSearch ? "Try clearing your search query" : "Be the first to ask a question!"}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {questions.map((q) => {
            const isEditing = replyingToId === q._id;
            return (
              <div
                key={q._id}
                className="group relative rounded-xl border border-sand bg-white p-4.5 transition-all hover:border-forest/30 shadow-sm"
              >
                {/* Question Info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-forest-light text-[12.5px] font-bold text-cream">
                      {q.askedBy?.name?.slice(0, 2).toUpperCase() || '??'}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[13.5px] font-bold text-ink">{q.askedBy?.name || 'Renter'}</span>
                        <span className="text-[11px] font-semibold text-faint">{formatDate(q.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 text-[14.5px] font-semibold leading-relaxed text-[#2c3523]">{q.question}</p>
                    </div>
                  </div>

                  {/* Actions (Report/Admin Delete) */}
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                    {user && user.role === 'renter' && (
                      <button
                        onClick={() => handleReportQuestion(q._id)}
                        title="Report Question"
                        className="rounded-lg p-1.5 text-faint hover:bg-chip hover:text-terra transition-colors"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteQuestion(q._id)}
                        title="Delete Question (Admin)"
                        className="rounded-lg p-1.5 text-[#a05a45] hover:bg-[#f3e7e1] transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Seller Answer Section */}
                {q.answer ? (
                  <div className="mt-4 border-t border-sand/50 pt-3.5 pl-6.5 relative">
                    <div className="absolute left-1.5 top-4 text-faint">
                      <CornerDownRight className="h-4 w-4" />
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#f4f0e3] border border-sand text-[11.5px] font-bold text-forest">
                          SE
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                            <span className="text-[13px] font-bold text-ink">Seller Answer</span>
                            {q.isOfficialAnswer && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800 border border-emerald-200">
                                <CheckCircle className="h-3 w-3 text-emerald-600" />
                                Official Answer
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#3a4632]">{q.answer}</p>
                        </div>
                      </div>

                      {/* Reply Management Actions for Owner / Admin */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        {isSellerOwner && (
                          <>
                            <button
                              onClick={() => handleStartReply(q)}
                              title="Edit Answer"
                              className="rounded-lg p-1.5 text-faint hover:bg-chip hover:text-forest transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleOfficial(q._id, !!q.isOfficialAnswer)}
                              title={q.isOfficialAnswer ? "Remove Official Status" : "Mark as Official"}
                              className={cn(
                                "rounded-lg p-1.5 transition-colors",
                                q.isOfficialAnswer ? "text-emerald-700 hover:bg-emerald-50" : "text-faint hover:bg-chip"
                              )}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAnswer(q._id)}
                              title="Delete Answer"
                              className="rounded-lg p-1.5 text-[#a05a45] hover:bg-[#f3e7e1] transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteAnswer(q._id)}
                            title="Delete Reply (Admin)"
                            className="rounded-lg p-1.5 text-[#a05a45] hover:bg-[#f3e7e1] transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Answer Inline form for Seller */
                  isSellerOwner && !isEditing && (
                    <div className="mt-3.5 pl-6.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartReply(q)}
                        className="flex items-center gap-1.5"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Answer Question
                      </Button>
                    </div>
                  )
                )}

                {/* Inline Editing Form */}
                {isEditing && (
                  <div className="mt-4 border-t border-sand/50 pt-3.5 pl-6.5">
                    <h4 className="mb-2 text-xs font-bold text-faint uppercase tracking-wider">
                      {q.answer ? 'Edit Answer' : 'Write Answer'}
                    </h4>
                    <Textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Write your response clearly..."
                      className="min-h-[85px] text-sm"
                      maxLength={2000}
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelReply}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={submittingAnswer}
                        onClick={() => handlePostAnswer(q._id)}
                        disabled={!answerText.trim()}
                      >
                        Save Answer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-sand pt-4.5">
          <span className="text-xs font-semibold text-faint">
            Showing Page {page} of {totalPages} ({totalQuestions} questions)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
