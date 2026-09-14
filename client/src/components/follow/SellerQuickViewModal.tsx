import { X, MapPin, ExternalLink, TreePine, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Orchard } from '@/types';

interface SellerQuickViewModalProps {
  sellerName: string;
  orchard: Orchard | null;
  onClose: () => void;
}

export function SellerQuickViewModal({ sellerName, orchard, onClose }: SellerQuickViewModalProps) {
  const navigate = useNavigate();

  if (!orchard) return null;

  const handleViewDetails = () => {
    onClose();
    navigate(`/orchards/${orchard.slug}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadein">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-sand bg-paper shadow-2xl animate-fadeup">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand px-6 py-4 bg-cream/50">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-forest">Latest Listing</span>
            <h3 className="font-serif text-lg font-bold text-ink">{sellerName}'s Orchard</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-faint hover:bg-chip hover:text-ink transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {orchard.thumbnail && (
            <div className="relative h-44 w-full overflow-hidden rounded-xl bg-sand">
              <img
                src={orchard.thumbnail}
                alt={orchard.gardenName}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-3 right-3 rounded-lg bg-paper/90 backdrop-blur-md px-3 py-1 text-sm font-bold text-terra shadow-sm">
                {formatCurrency(orchard.price)} / {orchard.rentType}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-serif text-xl font-bold text-ink mb-1">{orchard.gardenName}</h4>
            <p className="flex items-center gap-1.5 text-xs text-sub mb-3">
              <MapPin className="h-3.5 w-3.5 text-faint" />
              {orchard.district}, {orchard.state}
            </p>
            <p className="text-sm leading-relaxed text-sub line-clamp-3 mb-4">{orchard.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-sand bg-cream p-3 text-xs">
            <div className="flex items-center gap-2">
              <TreePine className="h-4 w-4 text-forest" />
              <div>
                <div className="text-faint font-semibold">Trees</div>
                <div className="font-bold text-ink">{orchard.totalTrees?.toLocaleString() || 'N/A'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-forest" />
              <div>
                <div className="text-faint font-semibold">Harvest Window</div>
                <div className="font-bold text-ink">
                  {orchard.estimatedHarvestDate ? formatDate(orchard.estimatedHarvestDate) : 'Seasonal'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-sand px-6 py-4 bg-cream/30">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleViewDetails} className="flex items-center gap-1.5">
            <span>View Full Orchard</span>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
