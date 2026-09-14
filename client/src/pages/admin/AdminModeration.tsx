import { useEffect, useState } from 'react';
import { AlertTriangle, Star } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { orchardService } from '@/services/orchard.service';
import { questionService } from '@/services/question.service';
import { reviewService } from '@/services/review.service';
import { StarRating } from '@/components/orchard/StarRating';
import { Spinner } from '@/components/ui';

import { useToast } from '@/context/ToastContext';
import { orchardSurface } from '@/lib/gradients';
import { timeAgo, titleCase } from '@/lib/format';
import { getErrorMessage } from '@/lib/apiClient';
import type { Orchard, User, Question } from '@/types';

interface ReportedReview {
  _id: string;
  rating?: number;
  comment: string;
  orchardId?: { gardenName: string };
  renterId?: { name: string };
  isReported?: boolean;
  isHidden?: boolean;
  createdAt: string;
}


export default function AdminModeration() {
  const toast = useToast();
  const [pending, setPending] = useState<Orchard[]>([]);
  const [reports, setReports] = useState<ReportedReview[]>([]);
  const [reportedQuestions, setReportedQuestions] = useState<Question[]>([]);
  const [featured, setFeatured] = useState<Orchard[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      adminService.moderationQueue(),
      adminService.reportedReviews(),
      orchardService.getFeatured(),
      questionService.listAllQuestions({ status: 'reported' }),
    ])
      .then(([p, r, f, q]) => {
        setPending(p);
        setReports(r as ReportedReview[]);
        setFeatured(f);
        setReportedQuestions(q.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const moderate = async (id: string, action: 'approve' | 'reject' | 'unfeature', msg: string) => {
    try {
      await adminService.moderate(id, action);
      toast.success(msg);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading)
    return (
      <main className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </main>
    );

  return (
    <main className="mx-auto max-w-[1240px] px-6 pb-16 pt-6">
      <div className="mb-[18px]">
        <h1 className="font-serif text-[27px] font-semibold">Orchard moderation</h1>
        <p className="mt-1 text-[13.5px] text-faint">Review submissions, reports and featured placements</p>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-[320px] flex-[2_1_460px] flex-col gap-[18px]">
          {/* Pending submissions */}
          <section className="rounded-[18px] border border-sand bg-cream p-[22px]">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="font-serif text-[18px] font-semibold">Pending submissions</h2>
              <span className="rounded-full bg-[#fbf2dd] px-2.5 py-[3px] text-xs font-bold text-[#a9772b]">
                {pending.length} new
              </span>
            </div>
            {pending.length === 0 ? (
              <p className="py-4 text-center text-sm text-faint">No submissions awaiting review.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {pending.map((o) => {
                  const seller = o.sellerId as User;
                  return (
                    <div key={o._id} className="flex flex-wrap items-center gap-3.5 rounded-[13px] border border-chip p-3">
                      <div className="h-[52px] w-[52px] flex-none rounded-[10px]" style={orchardSurface(o.thumbnail, o.fruitTypes, o._id)} />
                      <div className="min-w-[160px] flex-1 basis-[180px]">
                        <div className="font-serif text-[15.5px] font-semibold">{o.gardenName}</div>
                        <div className="mt-0.5 text-[12.5px] text-faint">
                          {seller?.name || 'Seller'} · {o.state} · {o.fruitTypes[0]}
                        </div>
                      </div>
                      <div className="flex flex-none gap-2">
                        <button onClick={() => moderate(o._id, 'approve', 'Listing approved')} className="rounded-[9px] bg-forest px-[15px] py-2.5 text-[12.5px] font-bold text-cream">
                          Approve
                        </button>
                        <button onClick={() => moderate(o._id, 'reject', 'Listing rejected')} className="rounded-[9px] bg-[#f3e7e1] px-[15px] py-2.5 text-[12.5px] font-semibold text-[#a05a45]">
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Report queue */}
          <section className="rounded-[18px] border border-sand bg-cream p-[22px]">
            <h2 className="mb-3.5 font-serif text-[18px] font-semibold">Reported Reviews Queue</h2>
            {reports.length === 0 ? (
              <p className="py-4 text-center text-sm text-faint">No open reported reviews.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {reports.map((r) => (
                  <div key={r._id} className="rounded-xl border border-sand bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-ink">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>{r.orchardId?.gardenName || 'Orchard'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.rating && <StarRating value={r.rating} size="sm" />}
                        <span className="text-[11px] text-faint">{timeAgo(r.createdAt)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-sub mb-3 italic">"{r.comment}"</p>
                    <div className="text-[11px] text-faint mb-3">By: {r.renterId?.name || 'Renter'}</div>
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-chip">
                      <button
                        onClick={async () => {
                          try {
                            await reviewService.moderateReview(r._id, 'dismiss');
                            toast.success('Report dismissed');
                            load();
                          } catch (err) {
                            toast.error(getErrorMessage(err));
                          }
                        }}
                        className="rounded-lg border border-sand bg-cream px-3 py-1 text-xs font-bold text-forest hover:border-forest"
                      >
                        Dismiss Report
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await reviewService.moderateReview(r._id, r.isHidden ? 'unhide' : 'hide');
                            toast.success(r.isHidden ? 'Review unhidden' : 'Review hidden');
                            load();
                          } catch (err) {
                            toast.error(getErrorMessage(err));
                          }
                        }}
                        className="rounded-lg border border-sand bg-white px-3 py-1 text-xs font-bold text-ink hover:bg-chip"
                      >
                        {r.isHidden ? 'Unhide' : 'Hide Review'}
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Permanently delete this reported review?')) {
                            try {
                              await reviewService.moderateReview(r._id, 'delete');
                              toast.success('Review deleted');
                              load();
                            } catch (err) {
                              toast.error(getErrorMessage(err));
                            }
                          }
                        }}
                        className="rounded-lg bg-[#f3e7e1] px-3 py-1 text-xs font-bold text-[#a05a45] hover:bg-[#ecd9d0]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>


          {/* Reported Q&A Queue */}
          <section className="rounded-[18px] border border-sand bg-cream p-[22px]">
            <h2 className="mb-3.5 font-serif text-[18px] font-semibold">Reported Q&amp;A Queue</h2>
            {reportedQuestions.length === 0 ? (
              <p className="py-4 text-center text-sm text-faint">No reported questions or answers.</p>
            ) : (
              <div className="flex flex-col gap-3.5">
                {reportedQuestions.map((q) => {
                  const orchardName = typeof q.orchard === 'object' ? q.orchard.gardenName : 'Orchard';
                  return (
                    <div key={q._id} className="rounded-xl border border-sand bg-white p-4.5 shadow-sm">
                      <div className="mb-2 flex items-center justify-between text-xs text-faint font-semibold">
                        <span className="font-bold text-forest">{orchardName}</span>
                        <span>Asked by {q.askedBy?.name}</span>
                      </div>
                      
                      {/* Question Content */}
                      <div className="mb-2.5">
                        <div className="text-[10px] font-bold text-faint uppercase tracking-wider mb-0.5">Question:</div>
                        <p className="text-sm font-semibold text-ink leading-relaxed">{q.question}</p>
                      </div>

                      {/* Reply Content */}
                      {q.answer && (
                        <div className="mb-2.5 border-l-2 border-sand pl-3.5 py-0.5">
                          <div className="text-[10px] font-bold text-faint uppercase tracking-wider mb-0.5">Seller Reply:</div>
                          <p className="text-sm text-sub leading-relaxed">{q.answer}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 border-t border-chip pt-2.5 mt-2.5">
                        <button
                          onClick={async () => {
                            if (window.confirm('Delete this entire question?')) {
                              try {
                                await questionService.deleteQuestion(q._id);
                                toast.success('Question deleted');
                                load();
                              } catch (err) {
                                toast.error(getErrorMessage(err));
                              }
                            }
                          }}
                          className="rounded-lg bg-[#f3e7e1] px-3.5 py-1.5 text-[11.5px] font-bold text-[#a05a45] hover:bg-[#ecd9d0]"
                        >
                          Delete Question
                        </button>
                        
                        {q.answer && (
                          <button
                            onClick={async () => {
                              if (window.confirm('Delete/clear the seller reply?')) {
                                try {
                                  await questionService.deleteAnswer(q._id);
                                  toast.success('Seller reply cleared');
                                  load();
                                } catch (err) {
                                  toast.error(getErrorMessage(err));
                                }
                              }
                            }}
                            className="rounded-lg bg-chip px-3.5 py-1.5 text-[11.5px] font-bold text-ink hover:bg-sand"
                          >
                            Delete Reply Only
                          </button>
                        )}
                        
                        <button
                          onClick={async () => {
                            try {
                              await questionService.dismissReport(q._id);
                              toast.success('Report dismissed');
                              load();
                            } catch (err) {
                              toast.error(getErrorMessage(err));
                            }
                          }}
                          className="ml-auto rounded-lg border border-sand bg-cream px-3.5 py-1.5 text-[11.5px] font-bold text-forest hover:border-forest"
                        >
                          Dismiss Report
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Featured */}
        <section className="min-w-[280px] flex-1 basis-[280px] rounded-[18px] border border-sand bg-cream p-[22px]">
          <div className="mb-3.5 flex items-center gap-2">
            <Star className="h-[18px] w-[18px] fill-gold text-gold" />
            <h2 className="font-serif text-[18px] font-semibold">Featured orchards</h2>
          </div>
          {featured.length === 0 ? (
            <p className="py-4 text-center text-sm text-faint">No featured orchards.</p>
          ) : (
            featured.map((o) => (
              <div key={o._id} className="flex items-center gap-2.5 border-t border-chip py-2.5">
                <div className="h-10 w-10 flex-none rounded-[10px]" style={orchardSurface(o.thumbnail, o.fruitTypes, o._id)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">{o.gardenName}</div>
                  <div className="truncate text-[11.5px] text-faint">
                    {o.district}, {o.state}
                  </div>
                </div>
                <button onClick={() => moderate(o._id, 'unfeature', 'Removed from featured')} className="flex-none text-[11.5px] font-semibold text-[#a05a45]">
                  Remove
                </button>
              </div>
            ))
          )}
          <p className="mt-3 text-[11px] text-faint">{titleCase('tip')}: feature orchards from the listing moderation actions.</p>
        </section>
      </div>
    </main>
  );
}
