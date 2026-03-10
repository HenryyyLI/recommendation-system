import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { useCartStore } from '@/store/useCartStore';
import { useTrackingStore } from '@/store/useTrackingStore';
import { useIsMobile } from '@/hooks/use-mobile';
import UserDropdown from '@/components/UserDropdown';
import { Home, ShoppingCart, User, Moon, Sun } from 'lucide-react';
import logoImg from '@/assets/logo.png';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const totalItems = useCartStore((s) => s.totalItems);
  const track = useTrackingStore((s) => s.track);
  const isMobile = useIsMobile();
  const cartCount = totalItems();

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  const isLoginPage = location.pathname === '/';
  if (isLoginPage) return <Outlet />;

  const handleCartClick = () => {
    if (user) {
      track({ eventType: 'cart_click', clientId: user.id, page: location.pathname.slice(1) || 'feed' });
    }
    navigate('/cart');
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/feed', onClick: () => navigate('/feed') },
    { icon: ShoppingCart, label: 'Cart', path: '/cart', badge: cartCount, onClick: handleCartClick },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen">
      {/* Desktop top nav */}
      {!isMobile && (
        <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <button onClick={() => navigate('/feed')} className="flex items-center gap-2.5 group">
              <div className="h-7 w-7 rounded-lg overflow-hidden">
                <img src={logoImg} alt="NexPick" className="h-full w-full object-cover" />
              </div>
              <span
                className="text-lg font-bold tracking-[-0.02em] text-foreground"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                NexPick
              </span>
            </button>
            <div className="flex items-center gap-1.5">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={item.onClick}
                  className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium leading-none transition-all ${
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.badge ? (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
              <button
                onClick={toggleDark}
                className="h-8 w-8 -ml-1.5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <UserDropdown />
            </div>
          </div>
        </nav>
      )}

      <Outlet />

      {/* Mobile bottom tab */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl safe-area-pb">
          <div className="flex items-center justify-around h-14">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={item.onClick}
                className={`relative flex flex-col items-center gap-0.5 py-1 px-5 transition ${
                  isActive(item.path) ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {item.badge ? (
                  <span className="absolute -top-0.5 right-2 h-4 w-4 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
            {user && (
              <button
                onClick={() => navigate('/profile')}
                className={`flex flex-col items-center gap-0.5 py-1 px-5 transition ${
                  isActive('/profile') || isActive('/orders') ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                <User className="h-5 w-5" />
                <span className="text-[10px] font-medium">Profile</span>
              </button>
            )}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
