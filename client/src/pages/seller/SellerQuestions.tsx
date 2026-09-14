import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { questionService } from '@/services/question.service';
import type { Question } from '@/types';
import { Button, Textarea, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { 
  MessageSquare, 
  CheckCircle, 
  Trash2, 
  ExternalLink,
  Edit3,
  Calendar,
  HelpCircle
} from 'lucide-react';
import { getErrorMessage } from '@/lib/apiClient';
import { sellerService, type InquiryAnalytics } from '@/services/seller.service';

type QuestionStatusFilter = 'all' | 'unanswered' | 'answered';

export default function SellerQuestions() {
  const toast = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<QuestionStatusFilter>('all');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [analytics, setAnalytics] = useState<InquiryAnalytics | null>(null);

  const loadQuestions = () => {
    setLoading(true);
    questionService
      .listSellerQuestions({
        page,
        limit: 10,
        status: filter,
      })
      .then((res) => {
        setQuestions(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages);
          setTotalQuestions(res.meta.total);
        }
      })
      .catch((err) => {
        toast.error(getErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadQuestions();
  }, [filter, page]);

  useEffect(() => {
    sellerService.inquiryAnalytics().then(setAnalytics).catch(() => {});
  }, []);

  const handleFilterChange = (newFilter: QuestionStatusFilter) => {
    setFilter(newFilter);
    setPage(1);
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

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-[26px]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-faint">Orchard Management 🌳</p>
          <h1 className="mt-0.5 font-serif text-[28px] font-semibold">Questions &amp; Answers</h1>
        </div>
      </div>

      {/* Inquiry Analytics (Issue #118) */}
      {analytics && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-sand bg-cream/60 p-4">
            <p className="text-xs text-faint">Total inquiries</p>
            <p className="text-xl font-semibold">{analytics.totalInquiries}</p>
          </div>
          <div className="rounded-xl border border-sand bg-cream/60 p-4">
            <p className="text-xs text-faint">Avg response time</p>
            <p className="text-xl font-semibold">
              {analytics.avgResponseTimeHours != null ? `${analytics.avgResponseTimeHours}h` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-sand bg-cream/60 p-4">
            <p className="text-xs text-faint">Conversion rate</p>
            <p className="text-xl font-semibold">{analytics.conversionRate}%</p>
          </div>
          
            <a
            href={sellerService.exportInquiriesUrl}
            className="flex items-center justify-center rounded-xl border border-sand bg-cream/60 p-4 text-sm font-semibold text-forest hover:bg-cream"
          >
            Export CSV
          </a>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-sand">
        <div className="flex gap-6">
          {(['all', 'unanswered', 'answered'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleFilterChange(tab)}
              className={`pb-3 text-sm font-bold capitalize transition-colors ${
                filter === tab
                  ? 'border-b-2 border-forest text-forest'
                  : 'text-sub hover:text-ink'
              }`}
            >
              {tab === 'all' ? 'All Questions' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="space-y-4 py-8">
          <div className="h-28 w-full animate-pulse rounded-2xl bg-sand/20" />
          <div className="h-28 w-full animate-pulse rounded-2xl bg-sand/20" />
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          emoji="🌿"
          title="All caught up"
          description={`No ${filter !== 'all' ? filter : ''} questions from renters at the moment.`}
        />
      ) : (
        <div className="space-y-5">
          {questions.map((q) => {
            const orchardName = typeof q.orchard === 'object' ? q.orchard.gardenName : 'Your Orchard';
            const orchardSlug = typeof q.orchard === 'object' ? q.orchard.slug : '';
            const isEditing = replyingToId === q._id;

            return (
              <div
                key={q._id}
                className="rounded-2xl border border-sand bg-cream p-5 shadow-sm transition-all hover:border-forest/20"
              >
                {/* Orchard Reference Banner */}
                <div className="mb-3.5 flex items-center justify-between border-b border-sand/60 pb-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-forest" />
                    <span className="text-xs font-bold text-faint uppercase tracking-wider">Question for:</span>
                    {orchardSlug ? (
                      <Link
                        to={`/orchards/${orchardSlug}`}
                        className="inline-flex items-center gap-1 text-[13.5px] font-bold text-forest hover:text-forest-dark hover:underline"
                      >
                        {orchardName}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-[13.5px] font-bold text-ink">{orchardName}</span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-faint font-semibold">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(q.createdAt)}
                  </span>
                </div>

                {/* Question Info */}
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-forest-light text-xs font-bold text-cream">
                    {q.askedBy?.name?.slice(0, 2).toUpperCase() || 'RE'}
                  </span>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-sub">
                      {q.askedBy?.name} <span className="font-semibold text-faint">({q.askedBy?.email || 'Renter'})</span>
                    </div>
                    <p className="mt-1 text-[15px] font-semibold text-ink leading-relaxed">
                      {q.question}
                    </p>
                  </div>
                </div>

                {/* Answers / Forms */}
                {q.answer ? (
                  <div className="mt-4 rounded-xl border border-sand/40 bg-white/50 p-4 ml-12">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle className={`mt-0.5 h-4 w-4 flex-none ${q.isOfficialAnswer ? 'text-emerald-600' : 'text-faint'}`} />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[12.5px] font-bold text-ink">Your Answer:</span>
                            {q.isOfficialAnswer && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-950 border border-emerald-200">
                                Official Answer
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[13.5px] text-[#3a4632] leading-relaxed">
                            {q.answer}
                          </p>
                        </div>
                      </div>

                      {/* Reply Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartReply(q)}
                          title="Edit Reply"
                          className="rounded-lg p-1.5 text-faint hover:bg-chip hover:text-forest transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleOfficial(q._id, !!q.isOfficialAnswer)}
                          title={q.isOfficialAnswer ? "Remove Official Status" : "Mark as Official"}
                          className={`rounded-lg p-1.5 transition-colors ${
                            q.isOfficialAnswer ? 'text-emerald-700 hover:bg-emerald-50' : 'text-faint hover:bg-chip'
                          }`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnswer(q._id)}
                          title="Delete Reply"
                          className="rounded-lg p-1.5 text-[#a05a45] hover:bg-[#f3e7e1] transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  !isEditing && (
                    <div className="mt-4 ml-12">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStartReply(q)}
                        className="flex items-center gap-1.5"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Answer Question
                      </Button>
                    </div>
                  )
                )}

                {/* Reply Edit Form */}
                {isEditing && (
                  <div className="mt-4 ml-12 rounded-xl border border-sand/40 bg-white/50 p-4">
                    <h4 className="mb-2 text-xs font-bold text-faint uppercase tracking-wider">
                      {q.answer ? 'Edit Answer' : 'Write Answer'}
                    </h4>
                    <Textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Write your answer clearly for all renters to read..."
                      className="min-h-[80px] text-sm"
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
                        Publish Answer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-sand pt-4.5">
          <span className="text-xs font-semibold text-faint">
            Page {page} of {totalPages} ({totalQuestions} questions)
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
    </main>
  );
}