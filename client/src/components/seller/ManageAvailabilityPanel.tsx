import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Wrench, Sprout, Lock, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { availabilityService } from '@/services/availability.service';
import type { OrchardAvailabilityResponse, BlockedDate } from '@/types';
import { AvailabilityCalendar } from '@/components/orchard/AvailabilityCalendar';
import { BlockedDateModal } from '@/components/seller/BlockedDateModal';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/apiClient';
import { formatDate } from '@/lib/format';

interface ManageAvailabilityPanelProps {
  orchardId: string;
  gardenName: string;
  onClose?: () => void;
}

export const ManageAvailabilityPanel: React.FC<ManageAvailabilityPanelProps> = ({
  orchardId,
  gardenName,
  onClose,
}) => {
  const toast = useToast();
  const [availability, setAvailability] = useState<OrchardAvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<BlockedDate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await availabilityService.getAvailability(orchardId);
      setAvailability(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orchardId, refreshKey]);

  const handleDelete = async (blockId: string) => {
    if (!window.confirm('Are you sure you want to remove this blocked date period?')) return;
    setDeletingId(blockId);
    try {
      await availabilityService.deleteBlockedDate(orchardId, blockId);
      toast.success('Blocked date removed successfully');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const getReasonBadge = (reason: string) => {
    const r = reason?.toLowerCase();
    if (r === 'maintenance') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 border border-amber-300">
          <Wrench className="h-3 w-3 text-amber-700" /> Maintenance
        </span>
      );
    }
    if (r === 'harvest') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-900 border border-purple-300">
          <Sprout className="h-3 w-3 text-purple-700" /> Harvest Block
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800 border border-slate-300">
        <Lock className="h-3 w-3 text-slate-600" /> Personal Use
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand pb-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-ink">Availability &amp; Blocked Dates</h2>
          <p className="text-xs text-faint">Manage blocked dates for maintenance, harvest, or personal use at "{gardenName}"</p>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl border border-sand bg-white px-3 py-2 text-xs font-bold text-ink hover:bg-chip transition-colors"
            >
              Close
            </button>
          )}
          <button
            onClick={() => {
              setEditingBlock(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-bold text-cream hover:bg-forest-dark transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Block Dates
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Calendar & Blocked Dates List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Calendar View */}
        <div className="lg:col-span-7">
          <AvailabilityCalendar
            orchardId={orchardId}
            key={refreshKey}
            isOwner
            onManageClick={() => {
              setEditingBlock(null);
              setModalOpen(true);
            }}
          />
        </div>

        {/* Right Column: Blocked Dates Management List */}
        <div className="lg:col-span-5 rounded-2xl border border-sand bg-cream p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-chip pb-3">
            <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
              <Calendar className="h-4 w-4 text-forest" /> Blocked Date Periods
            </h3>
            <span className="text-xs font-bold text-faint">
              {availability?.blockedDates?.length || 0} active
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-faint flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-forest" /> Loading blocked dates...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span>{error}</span>
            </div>
          ) : !availability?.blockedDates || availability.blockedDates.length === 0 ? (
            <div className="py-8 text-center text-xs text-faint italic border border-dashed border-sand rounded-xl p-4">
              No date blocks currently configured for this orchard. Click "+ Block Dates" above to add maintenance or harvest periods.
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {availability.blockedDates.map((block) => (
                <div
                  key={block._id}
                  className="rounded-xl border border-sand bg-white p-3.5 shadow-sm hover:border-forest/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    {getReasonBadge(block.reason)}
                    {block._id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingBlock(block);
                            setModalOpen(true);
                          }}
                          className="p-1 rounded-lg text-sub hover:bg-chip hover:text-ink transition-colors"
                          title="Edit block"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(block._id!)}
                          disabled={deletingId === block._id}
                          className="p-1 rounded-lg text-terra/80 hover:bg-red-50 hover:text-terra transition-colors disabled:opacity-50"
                          title="Remove block"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs font-bold text-ink">
                    {formatDate(block.startDate)} &ndash; {formatDate(block.endDate)}
                  </div>

                  {block.note && (
                    <p className="mt-1 text-[11.5px] text-faint line-clamp-2">{block.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Dialog */}
      {modalOpen && (
        <BlockedDateModal
          orchardId={orchardId}
          existingBlock={editingBlock}
          onClose={() => setModalOpen(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
};

export default ManageAvailabilityPanel;
