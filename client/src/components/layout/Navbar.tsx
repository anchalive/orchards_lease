import { useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, LogOut, User as UserIcon, ChevronDown, Navigation, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMarketplace } from '@/context/MarketplaceContext';
import { useLocation } from '@/context/LocationContext';
import { avatarGradient, initialsOf } from '@/lib/avatar';
import { cn } from '@/lib/cn';

function Leaf() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <ellipse cx="9" cy="10" rx="5" ry="7.5" fill="#cfe3c2" transform="rotate(-32 9 10)" />
      <ellipse cx="15" cy="10" rx="5" ry="7.5" fill="#fffdf7" transform="rotate(32 15 10)" />
      <line x1="12" y1="9" x2="12" y2="21" stroke="#cfe3c2" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Badge({ count, tone }: { count: number; tone: 'terra' | 'forest' | 'gold' }) {
  if (!count) return null;
  const bg = tone === 'terra' ? 'bg-terra' : tone === 'gold' ? 'bg-gold' : 'bg-forest';
  return (
    <span className={cn('inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] px-[5px] text-[11px] font-bold text-cream', bg)}>
      {count}
    </span>
  );
}

const navBtn = 'rounded-[9px] px-3 py-2.5 text-[13.5px] font-semibold text-ink hover:bg-chip transition-colors';
const navBtnFlex = `${navBtn} flex items-center gap-1.5`;

const ADMIN_TABS = [
  ['overview', 'Overview'],
  ['users', 'Users'],
  ['moderation', 'Moderation'],
  ['analytics', 'Analytics'],
  ['system', 'System'],
] as const;

export function Navbar() {
  const { user, logout } = useAuth();
  const { savedIds, compareIds, bookingCount } = useMarketplace();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');

  const role = user?.role;
  const isRenter = !user || role === 'renter';
  const isSeller = role === 'seller';
  const isAdmin = role === 'admin';

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/explore');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q) next.set('search', q);
      else next.delete('search');
      return next;
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-paper/[.86] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-5 px-6 py-3">
        <Link to={isAdmin ? '/admin' : isSeller ? '/seller' : '/explore'} className="flex flex-none items-center gap-2.5">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-forest">
            <Leaf />
          </span>
          <span className="font-serif text-[21px] font-semibold tracking-[-.01em]">OrchardLease</span>
        </Link>

        {isRenter && (
          <form onSubmit={submitSearch} className="flex min-w-[200px] flex-1 basis-[280px] items-center gap-2.5 rounded-xl border border-sand bg-cream px-3.5 py-2.5">
            <Search className="h-[18px] w-[18px] text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search orchards, fruit, district…"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            />
          </form>
        )}

        <nav className="ml-auto flex flex-none items-center gap-1">
          {isRenter && (
            <>
              <NavLink to="/explore" className={navBtn}>
                Explore
              </NavLink>
              {user && (
                <>
                  <NavLink to="/wishlist" className={navBtnFlex}>
                    Saved <Badge count={savedIds.size} tone="terra" />
                  </NavLink>
                  <NavLink to="/compare" className={navBtnFlex}>
                    Compare <Badge count={compareIds.length} tone="forest" />
                  </NavLink>
                  <NavLink to="/bookings" className={navBtnFlex}>
                    Bookings <Badge count={bookingCount} tone="forest" />
                  </NavLink>
                  <NavLink to="/lease-history" className={navBtn}>
                    Lease History
                  </NavLink>
                  <NavLink to="/following" className={navBtn}>
                    Following
                  </NavLink>
                </>
              )}
              <LocationPill />
            </>
          )}

          {isSeller && (
            <>
              <NavLink to="/seller" end className={navBtn}>
                Dashboard
              </NavLink>
              <NavLink to="/seller/orchards" className={navBtn}>
                My orchards
              </NavLink>
              <NavLink to="/seller/bookings" className={navBtn}>
                Bookings
              </NavLink>
              <NavLink to="/seller/lease-history" className={navBtn}>
                Lease History
              </NavLink>
              <NavLink to="/seller/questions" className={navBtn}>
                Q&A
              </NavLink>
            </>
          )}

          {isAdmin &&
            ADMIN_TABS.map(([key, label]) => (
              <NavLink
                key={key}
                to={`/admin/${key}`}
                className={({ isActive }) =>
                  cn(
                    'rounded-[9px] px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
                    isActive ? 'bg-avail text-forest' : 'text-ink hover:bg-chip'
                  )
                }
              >
                {label}
              </NavLink>
            ))}

          {user ? (
            <div className="relative ml-1.5">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-full border border-sand bg-cream py-1 pl-1.5 pr-2.5"
              >
                <span
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[12px] font-bold text-cream"
                  style={{ background: avatarGradient(role) }}
                >
                  {initialsOf(user.name)}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-faint" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-50 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-[46px] z-[60] w-[228px] animate-fadeup overflow-hidden rounded-[14px] border border-sand bg-cream shadow-card">
                    <div className="flex items-center gap-2.5 border-b border-chip px-4 py-3.5">
                      <span
                        className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-[13px] font-bold text-cream"
                        style={{ background: avatarGradient(role) }}
                      >
                        {initialsOf(user.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{user.name}</div>
                        <div className="text-[11.5px] capitalize text-faint">{role} account</div>
                      </div>
                    </div>
                    {!isAdmin && (
                      <Link
                        to={role === 'seller' ? '/seller/profile' : '/renter/profile'}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-semibold text-ink hover:bg-[#f4f0e3]"
                      >
                        <UserIcon className="h-4 w-4 text-sub" /> My profile
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 border-t border-chip px-4 py-2.5 text-[13.5px] font-semibold text-[#a05a45] hover:bg-[#f7ece6]"
                    >
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="ml-1.5 flex items-center gap-1">
              <button onClick={() => navigate('/login')} className={navBtn}>
                Log in
              </button>
              <button
                onClick={() => navigate('/register')}
                className="rounded-[9px] bg-forest px-4 py-2 text-[13.5px] font-bold text-cream hover:bg-forest-dark"
              >
                Sign up
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

function LocationPill() {
  const { userLocation, status, requestLocation, clearLocation } = useLocation();

  if (userLocation) {
    return (
      <div
        title="Location active — distances calculated automatically"
        className="flex items-center gap-1.5 rounded-[9px] border border-avail bg-[#f2f7ef] px-2.5 py-1.5 text-[12px] font-bold text-forest"
      >
        <Navigation className="h-3.5 w-3.5 fill-forest text-forest" />
        <span className="max-w-[110px] truncate">{userLocation.name || 'Near Location'}</span>
        <button
          type="button"
          onClick={clearLocation}
          title="Reset location"
          className="ml-0.5 text-[10px] text-faint hover:text-terra font-normal"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={requestLocation}
      disabled={status === 'locating'}
      title="Enable location to view distances to orchards"
      className="flex items-center gap-1.5 rounded-[9px] border border-sand bg-cream px-2.5 py-1.5 text-[12px] font-semibold text-sub hover:border-forest hover:text-forest transition-colors"
    >
      {status === 'locating' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-forest" />
      ) : (
        <Navigation className="h-3.5 w-3.5 text-forest" />
      )}
      <span>{status === 'locating' ? 'Locating…' : 'Near me'}</span>
    </button>
  );
}

