import { useState } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { followService } from '@/services/follow.service';
import { getErrorMessage } from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import { useNavigate } from 'react-router-dom';

interface FollowButtonProps {
  sellerId: string;
  sellerName?: string;
  isFollowing: boolean;
  followerCount?: number;
  onFollowChange?: (isFollowing: boolean, newCount?: number) => void;
  variant?: 'primary' | 'outline' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FollowButton({
  sellerId,
  sellerName = 'seller',
  isFollowing: initialFollowing,
  followerCount: initialCount,
  onFollowChange,
  variant = 'primary',
  size = 'md',
  className,
}: FollowButtonProps) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const isRenter = user?.role === 'renter';
  const isSelf = user?._id === sellerId || user?.id === sellerId;

  // Don't render for self
  if (isSelf) return null;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.info('Please log in as a renter to follow sellers');
      navigate('/login');
      return;
    }

    if (!isRenter) {
      toast.info('Only renters can follow sellers');
      return;
    }

    setLoading(true);
    try {
      if (following) {
        await followService.unfollowSeller(sellerId);
        const nextCount = count !== undefined ? Math.max(0, count - 1) : undefined;
        setFollowing(false);
        setCount(nextCount);
        toast.success(`Unfollowed ${sellerName}`);
        onFollowChange?.(false, nextCount);
      } else {
        await followService.followSeller(sellerId);
        const nextCount = count !== undefined ? count + 1 : undefined;
        setFollowing(true);
        setCount(nextCount);
        toast.success(`Now following ${sellerName}`);
        onFollowChange?.(true, nextCount);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-xl gap-2 font-semibold',
    lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5 font-bold',
  }[size];

  const primaryStyles = following
    ? 'border border-sand bg-chip text-ink hover:bg-red-50 hover:text-red-600 hover:border-red-200'
    : 'bg-forest text-cream hover:bg-forest-dark shadow-sm';

  const outlineStyles = following
    ? 'border border-sand bg-cream text-ink hover:bg-red-50 hover:text-red-600 hover:border-red-200'
    : 'border border-forest text-forest hover:bg-forest hover:text-cream';

  const styleClass = variant === 'primary' ? primaryStyles : outlineStyles;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200 disabled:opacity-60 cursor-pointer',
        sizeStyles,
        styleClass,
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : following ? (
        <>
          <UserCheck className="h-4 w-4 text-emerald-600" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          <span>Follow Seller</span>
        </>
      )}
      {count !== undefined && <span className="text-xs opacity-75">({count})</span>}
    </button>
  );
}
