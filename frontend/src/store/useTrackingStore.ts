import { create } from 'zustand';
import { TrackingEvent } from '@/types';
import apiClient from '@/api/client';

const BUFFER_THRESHOLD = 5;
const FLUSH_INTERVAL = 15000;

const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

interface TrackingState {
  buffer: TrackingEvent[];
  track: (event: Omit<TrackingEvent, 'timestamp' | 'sessionId'>) => void;
  flush: () => Promise<void>;
}

/**
 * Send clientId/productId as strings — Pydantic on the backend coerces
 * string → Python int without JS precision loss for BigInt IDs.
 */
function mapEvent(e: TrackingEvent) {
  return {
    eventType: e.eventType,
    clientId: e.clientId,
    productId: e.productId || undefined,
    timestamp: e.timestamp,
    sessionId: e.sessionId || sessionId,
    page: e.page,
    position: e.position,
    metadata: e.metadata,
  };
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
  buffer: [],

  track: (event) => {
    const fullEvent: TrackingEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      sessionId,
    };

    const newBuffer = [...get().buffer, fullEvent];

    if (newBuffer.length >= BUFFER_THRESHOLD) {
      set({ buffer: [] });
      flushEvents(newBuffer);
    } else {
      set({ buffer: newBuffer });
    }
  },

  flush: async () => {
    const events = get().buffer;
    if (events.length === 0) return;
    set({ buffer: [] });
    await flushEvents(events);
  },
}));

async function flushEvents(events: TrackingEvent[]) {
  try {
    const apiEvents = events.map(mapEvent);
    await apiClient.post('/api/v1/events/batch', { events: apiEvents });
    console.log('[Tracking] Flushed', events.length, 'events');
  } catch (error) {
    console.warn('[Tracking] Flush failed, re-buffering:', error);
    useTrackingStore.setState((state) => ({
      buffer: [...events, ...state.buffer],
    }));
  }
}

if (typeof window !== 'undefined') {
  // Use Blob with correct Content-Type for sendBeacon
  window.addEventListener('beforeunload', () => {
    const { buffer } = useTrackingStore.getState();
    if (buffer.length > 0) {
      const apiEvents = buffer.map(mapEvent);
      const url = `${apiClient.defaults.baseURL}/api/v1/events/batch`;
      const blob = new Blob(
        [JSON.stringify({ events: apiEvents })],
        { type: 'application/json' },
      );
      navigator.sendBeacon(url, blob);
    }
  });

  setInterval(() => {
    useTrackingStore.getState().flush();
  }, FLUSH_INTERVAL);
}
