import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { useTrackingStore } from '@/store/useTrackingStore';
import { LogOut, User, Package } from 'lucide-react';

const UserDropdown = () => {
  const [open, setOpen] = useState(false);
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const flush = useTrackingStore((s) => s.flush);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    await flush();
    logout();
    navigate('/');
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-border hover:ring-primary transition-all duration-200"
      >
        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-card shadow-xl py-1 animate-scale-in origin-top-right z-50">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm text-card-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{user.country} · {user.gender === 'male' ? 'He/Him' : 'She/Her'}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => { navigate('/profile'); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-card-foreground hover:bg-muted/60 transition"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Profile
            </button>
            <button
              onClick={() => { navigate('/orders'); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-card-foreground hover:bg-muted/60 transition"
            >
              <Package className="h-4 w-4 text-muted-foreground" />
              Orders
            </button>
          </div>
          <div className="border-t border-border py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
