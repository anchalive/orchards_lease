import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '@/components/ui';

export function EmptyFollowingState() {
  const navigate = useNavigate();

  return (
    <EmptyState
      emoji="⭐"
      title="No followed sellers yet"
      description="Follow your favorite orchard owners to receive instant notifications when they publish new listings or update seasonal harvest details."
      action={
        <Button onClick={() => navigate('/explore')} size="lg">
          Explore Orchards &amp; Sellers
        </Button>
      }
    />
  );
}
