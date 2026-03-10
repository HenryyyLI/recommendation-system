import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { fetchClientInfo, fetchRandomClients, BackendClient } from '@/api/clients';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowRight, RotateCcw, LogIn, Loader2 } from 'lucide-react';
import LoginHeroPanel from '@/components/LoginHeroPanel';
import avatarU1 from '@/assets/avatars/u1.jpg';
import avatarU2 from '@/assets/avatars/u2.jpg';
import avatarU3 from '@/assets/avatars/u3.jpg';
import avatarU4 from '@/assets/avatars/u4.jpg';
import avatarU5 from '@/assets/avatars/u5.jpg';
import avatarU6 from '@/assets/avatars/u6.jpg';
import avatarU7 from '@/assets/avatars/u7.jpg';
import avatarU8 from '@/assets/avatars/u8.jpg';
import avatarU9 from '@/assets/avatars/u9.jpg';
import avatarU10 from '@/assets/avatars/u10.jpg';

/* ── Gender-based avatar & name pools ── */
const MALE_AVATARS = [avatarU1, avatarU3, avatarU5, avatarU7, avatarU9];
const FEMALE_AVATARS = [avatarU2, avatarU4, avatarU6, avatarU8, avatarU10];
const MALE_NAMES = ['James', 'Marcus', 'Alex', 'David', 'Lucas', 'Oliver', 'Noah', 'Ethan', 'Liam', 'William'];
const FEMALE_NAMES = ['Emily', 'Sophie', 'Isabella', 'Olivia', 'Amelia', 'Mia', 'Charlotte', 'Ava', 'Emma', 'Luna'];

const FALLBACK_CLIENT_IDS = ['2820558652430377474'];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function buildUserFromBackend(id: string, data: BackendClient): User {
  const genderRaw = data.ClientGender?.toLowerCase() || '';
  const gender: 'male' | 'female' = (genderRaw === 'female' || genderRaw === 'f') ? 'female' : 'male';
  const h = hashCode(id);
  const avatar = gender === 'female'
    ? FEMALE_AVATARS[h % FEMALE_AVATARS.length]
    : MALE_AVATARS[h % MALE_AVATARS.length];
  const name = gender === 'female'
    ? FEMALE_NAMES[h % FEMALE_NAMES.length]
    : MALE_NAMES[h % MALE_NAMES.length];

  return {
    id,
    name,
    gender,
    age: data.Age || 25,
    avatar,
    country: data.ClientCountry || 'US',
    segment: data.ClientSegment,
    totalPurchases: data.TotalPurchases,
    totalSpendEuro: data.TotalSpendEuro,
    avgOrderValue: data.AvgOrderValue,
    firstPurchaseDate: data.FirstPurchaseDate,
    lastPurchaseDate: data.LastPurchaseDate,
    topCategories: [data.TopCategory1, data.TopCategory2, data.TopCategory3].filter(Boolean),
  };
}

const CARD_W = 128;
const GAP = 16;
const STEP = CARD_W + GAP;
const REPEATS = 15;

type Phase = 'loading' | 'idle' | 'rolling' | 'selected' | 'welcome';

const LoginPage = () => {
  const navigate = useNavigate();
  const setUser = useUserStore((s) => s.setUser);
  const existingUser = useUserStore((s) => s.user);
  const [phase, setPhase] = useState<Phase>('loading');
  const [realUsers, setRealUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const stripRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [clientIdInput, setClientIdInput] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');

  /* Redirect if already logged in */
  useEffect(() => {
    if (existingUser) navigate('/feed', { replace: true });
  }, [existingUser, navigate]);

  /* Fetch random real clients on mount */
  useEffect(() => {
    const loadUsers = async () => {
      let clientIds: string[] = [];

      // Try fetching random clients from backend
      try {
        const randomClients = await fetchRandomClients(10);
        if (randomClients.length > 0) {
          const users: User[] = randomClients.map((c) => buildUserFromBackend(String(c.ClientID), c));
          setRealUsers(users);
          setPhase('idle');
          return;
        }
      } catch {
        // fall through to fallback
      }

      // Fallback: use hardcoded IDs
      clientIds = FALLBACK_CLIENT_IDS;
      const users: User[] = [];
      const results = await Promise.allSettled(
        clientIds.map(async (id) => {
          const data = await fetchClientInfo(id);
          return buildUserFromBackend(id, data);
        }),
      );
      results.forEach((r) => {
        if (r.status === 'fulfilled') users.push(r.value);
      });
      setRealUsers(users);
      setPhase('idle');
    };
    loadUsers();
  }, []);

  const strip = (() => {
    if (realUsers.length === 0) return [];
    const arr: User[] = [];
    for (let i = 0; i < REPEATS; i++) arr.push(...realUsers);
    return arr;
  })();

  const startRoll = useCallback(() => {
    if (realUsers.length === 0) return;
    setPhase('rolling');
    setSelectedUser(null);
    setSelectedIndex(-1);

    const targetUserIdx = Math.floor(Math.random() * realUsers.length);
    const rotations = 5 + Math.floor(Math.random() * 3);
    const containerWidth = containerRef.current?.clientWidth || 400;
    const centerOffset = (containerWidth - CARD_W) / 2;
    const targetInStrip = rotations * realUsers.length + targetUserIdx;
    const endPos = targetInStrip * STEP - centerOffset;

    if (stripRef.current) {
      stripRef.current.style.transition = 'none';
      stripRef.current.style.transform = 'translateX(0px)';
    }

    const startTime = performance.now();
    const duration = 4500;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const pos = endPos * eased;

      if (stripRef.current) {
        stripRef.current.style.transform = `translateX(-${pos}px)`;
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        const user = realUsers[targetUserIdx];
        setSelectedUser(user);
        setSelectedIndex(targetInStrip);
        setPhase('selected');
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [realUsers]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const loginWithUser = (user: User) => {
    setUser(user);
    setPhase('welcome');
    setTimeout(() => navigate('/feed'), 800);
  };

  const handleEnter = () => {
    if (selectedUser) loginWithUser(selectedUser);
  };

  const handleManualLogin = async () => {
    const id = clientIdInput.trim();
    if (!id) return;
    setManualLoading(true);
    setManualError('');
    try {
      const data = await fetchClientInfo(id);
      const user = buildUserFromBackend(id, data);
      loginWithUser(user);
    } catch {
      setManualError('Client ID not found');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen overflow-hidden">
      <LoginHeroPanel />

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 bg-background relative min-w-0">
        {/* Mobile brand */}
        <div className="lg:hidden mb-10 sm:mb-16 text-center px-2">
          <h1
            className="text-3xl sm:text-5xl font-extrabold tracking-[-0.04em] text-gradient-primary"
            style={{ fontFamily: 'var(--font-display-alt)' }}
          >
            NexPick
          </h1>
          <p className="mt-2 text-[10px] sm:text-xs text-muted-foreground tracking-[0.2em] sm:tracking-[0.3em] uppercase" style={{ fontFamily: 'var(--font-body)' }}>
            Personalized Shopping
          </p>
        </div>

        <div className="w-full max-w-lg space-y-6 sm:space-y-8">
          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              {phase === 'loading' && 'Loading profiles...'}
              {phase === 'idle' && 'Find Your Profile'}
              {phase === 'rolling' && 'Selecting...'}
              {phase === 'selected' && `Hey, ${selectedUser?.name?.split(' ')[0]}!`}
              {phase === 'welcome' && 'Preparing your feed...'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {phase === 'idle' && (realUsers.length > 0 ? 'Spin to discover your persona' : 'Enter a Client ID to get started')}
              {phase === 'selected' && `${selectedUser?.country} · Age ${selectedUser?.age}`}
            </p>
          </div>

          {/* Carousel */}
          {realUsers.length > 0 && (
            <div className="relative">
              <div className="absolute left-1/2 -translate-x-1/2 top-2 bottom-2 w-[96px] sm:w-[136px] rounded-2xl border-2 border-primary/20 z-10 pointer-events-none bg-primary/5" />
              <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />

              <div ref={containerRef} className="overflow-hidden rounded-2xl py-6">
                <div
                  ref={stripRef}
                  className="flex"
                  style={{ gap: GAP, willChange: 'transform' }}
                >
                  {strip.map((user, idx) => {
                    const isSelected = phase === 'selected' && idx === selectedIndex;
                    return (
                      <div
                        key={idx}
                        className="shrink-0 flex flex-col items-center gap-2.5 transition-all duration-300"
                        style={{ width: CARD_W }}
                      >
                        <div
                          className={`w-20 h-20 rounded-2xl overflow-hidden transition-all duration-500 ${
                            isSelected
                              ? 'ring-3 ring-primary shadow-lg shadow-primary/20 scale-110'
                              : phase === 'selected'
                              ? 'opacity-30 scale-90'
                              : 'ring-2 ring-border'
                          }`}
                        >
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium text-center truncate w-full transition-opacity duration-300 ${
                            phase === 'selected' && !isSelected ? 'opacity-30' : ''
                          }`}
                        >
                          {user.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 px-4">
            {phase === 'loading' && (
              <Button disabled className="w-full h-14 text-base rounded-2xl" size="lg">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading profiles...
              </Button>
            )}

            {phase === 'idle' && realUsers.length > 0 && (
              <Button
                onClick={startRoll}
                className="w-full h-14 text-base font-semibold gap-2.5 rounded-2xl shadow-lg shadow-primary/25"
                size="lg"
              >
                <Sparkles className="h-5 w-5" />
                Start
              </Button>
            )}

            {phase === 'rolling' && (
              <Button disabled className="w-full h-14 text-base rounded-2xl" size="lg">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                Finding your profile...
              </Button>
            )}

            {phase === 'selected' && (
              <>
                <Button
                  onClick={handleEnter}
                  className="w-full h-14 text-base font-semibold gap-2 rounded-2xl shadow-lg shadow-primary/25"
                  size="lg"
                >
                  Continue as {selectedUser?.name?.split(' ')[0]}
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  onClick={startRoll}
                  variant="ghost"
                  className="w-full h-12 rounded-2xl text-muted-foreground gap-2"
                  size="lg"
                >
                  <RotateCcw className="h-4 w-4" />
                  Try another
                </Button>
              </>
            )}

            {phase === 'welcome' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Loading your feed...</span>
              </div>
            )}
          </div>

          {/* Manual Client ID Login */}
          {phase !== 'welcome' && (
            <div className="px-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or enter Client ID</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); handleManualLogin(); }}
                className="flex gap-2"
              >
                <Input
                  placeholder="e.g. 2820558652430377474"
                  value={clientIdInput}
                  onChange={(e) => { setClientIdInput(e.target.value); setManualError(''); }}
                  className="flex-1 h-12 rounded-xl bg-muted/40 border-none"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  className="h-12 px-5 rounded-xl gap-2"
                  disabled={manualLoading || !clientIdInput.trim()}
                >
                  {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Login
                </Button>
              </form>
              {manualError && (
                <p className="text-xs text-destructive text-center">{manualError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
