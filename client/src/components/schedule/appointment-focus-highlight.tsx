import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useAppointmentContext } from './appointment-context';
import { useResourceContext } from '../resources/resource-context';
import { AppointmentFocusSpotlight, type SpotlightHole } from './appointment-focus-spotlight';

/** Spotlight: 0.5s fade in/out (`AppointmentFocusSpotlight` transition). */
const SPOTLIGHT_FADE_MS = 500;

/** Transient highlight (e.g. “Focus on schedule”): hold at full opacity before fade-out. */
const SPOTLIGHT_HOLD_MS = 2000;

/** How long the transient highlight id stays set after a focus — should cover scroll + spotlight. */
const HIGHLIGHT_CLEAR_MS = 5200;

/** Padding around the event rect for the spotlight hole (smaller = tighter crop). */
const SPOTLIGHT_HOLE_PAD_PX = 4;

/**
 * Schedule is lazy-loaded; after navigating from e.g. `/requests` the highlight effect can run
 * before `schedule-calendar` paints `[data-appointment-id]`. Retry until the node exists.
 */
const SCROLL_TO_EVENT_RETRY_MS = 50;
const SCROLL_TO_EVENT_RETRY_MAX = 60;

function holeFromElement(el: Element): SpotlightHole {
  const r = el.getBoundingClientRect();
  const pad = SPOTLIGHT_HOLE_PAD_PX;
  return {
    top: r.top - pad,
    left: r.left - pad,
    right: r.right + pad,
    bottom: r.bottom + pad,
  };
}

/**
 * When `highlightAppointmentId` is set (from `focusAppointmentOnSchedule`), scrolls the event into view
 * and runs a short viewport spotlight. When the appointment drawer is open for an existing appointment,
 * keeps the spotlight on that event until the drawer closes (no focus ring on the calendar cell).
 * Rendered inside `ScheduleProvider`.
 */
export function AppointmentFocusHighlight() {
  const {
    appointments,
    isLoadingAppointments,
    highlightAppointmentId,
    setHighlightAppointmentId,
    currentAppointment,
  } = useAppointmentContext();
  const { isLoadingResources } = useResourceContext();
  const { pathname } = useLocation();

  const modalSpotlightId =
    currentAppointment?._id != null && String(currentAppointment._id).trim() !== ''
      ? String(currentAppointment._id)
      : null;

  const lastScrolledHighlightRef = useRef<string | null>(null);
  const spotlightTimersRef = useRef<number[]>([]);
  const modalHoleClearTimeoutRef = useRef<number | undefined>(undefined);
  const [spotlightHole, setSpotlightHole] = useState<SpotlightHole | null>(null);
  const [spotlightVisible, setSpotlightVisible] = useState(false);

  const clearSpotlightTimers = useCallback(() => {
    spotlightTimersRef.current.forEach(tid => window.clearTimeout(tid));
    spotlightTimersRef.current = [];
  }, []);

  useEffect(() => {
    if (modalSpotlightId) {
      clearSpotlightTimers();
    }
  }, [modalSpotlightId, clearSpotlightTimers]);

  useEffect(() => {
    lastScrolledHighlightRef.current = null;
  }, [highlightAppointmentId]);

  useEffect(() => {
    if (highlightAppointmentId || modalSpotlightId) {
      return;
    }
    clearSpotlightTimers();
    setSpotlightHole(null);
    setSpotlightVisible(false);
  }, [highlightAppointmentId, modalSpotlightId, clearSpotlightTimers]);

  useEffect(() => {
    if (isLoadingAppointments || isLoadingResources) {
      if (modalSpotlightId) {
        return;
      }
      clearSpotlightTimers();
      setSpotlightHole(null);
      setSpotlightVisible(false);
      lastScrolledHighlightRef.current = null;
    }
  }, [isLoadingAppointments, isLoadingResources, modalSpotlightId, clearSpotlightTimers]);

  useEffect(() => {
    if (!highlightAppointmentId || modalSpotlightId) {
      return;
    }
    const drop = window.setTimeout(() => {
      setHighlightAppointmentId(null);
      lastScrolledHighlightRef.current = null;
      clearSpotlightTimers();
      setSpotlightHole(null);
      setSpotlightVisible(false);
    }, HIGHLIGHT_CLEAR_MS);
    return () => window.clearTimeout(drop);
  }, [highlightAppointmentId, modalSpotlightId, setHighlightAppointmentId, clearSpotlightTimers]);

  /** Drawer open on an existing appointment: keep dimmer + hole in sync until close. */
  useEffect(() => {
    if (!modalSpotlightId) {
      return;
    }

    window.clearTimeout(modalHoleClearTimeoutRef.current);
    modalHoleClearTimeoutRef.current = undefined;

    let cancelled = false;
    const id = modalSpotlightId;
    let observedEl: Element | null = null;
    let ro: ResizeObserver | null = null;

    const stopObserving = () => {
      ro?.disconnect();
      ro = null;
      observedEl = null;
    };

    const sync = () => {
      if (cancelled) {
        return;
      }
      const el = document.querySelector(`[data-appointment-id="${CSS.escape(id)}"]`);
      if (!el) {
        stopObserving();
        setSpotlightHole(null);
        setSpotlightVisible(false);
        return;
      }
      if (el !== observedEl) {
        stopObserving();
        observedEl = el;
        ro = new ResizeObserver(() => {
          if (!cancelled && observedEl) {
            setSpotlightHole(holeFromElement(observedEl));
          }
        });
        ro.observe(el);
      }
      setSpotlightHole(holeFromElement(el));
      requestAnimationFrame(() => {
        if (!cancelled) {
          setSpotlightVisible(true);
        }
      });
    };

    sync();

    const onScrollOrResize = () => sync();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);

    return () => {
      cancelled = true;
      stopObserving();
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      setSpotlightVisible(false);
      window.clearTimeout(modalHoleClearTimeoutRef.current);
      modalHoleClearTimeoutRef.current = window.setTimeout(() => {
        modalHoleClearTimeoutRef.current = undefined;
        setSpotlightHole(null);
      }, SPOTLIGHT_FADE_MS);
    };
  }, [modalSpotlightId, appointments, pathname]);

  /** Transient “jump to event” spotlight (no drawer). */
  useEffect(() => {
    if (modalSpotlightId) {
      return;
    }

    if (!highlightAppointmentId) {
      return;
    }

    const id = highlightAppointmentId;
    const hasEvent = appointments.some(a => String(a._id) === String(id));
    if (!hasEvent) {
      return;
    }

    if (isLoadingAppointments || isLoadingResources) {
      return;
    }

    if (lastScrolledHighlightRef.current === id) {
      return;
    }

    let cancelled = false;

    const showSpotlightForElement = (target: Element) => {
      if (cancelled) {
        return;
      }
      clearSpotlightTimers();
      setSpotlightHole(holeFromElement(target));
      requestAnimationFrame(() => {
        if (!cancelled) {
          setSpotlightVisible(true);
        }
      });
      const fadeOutAt = SPOTLIGHT_FADE_MS + SPOTLIGHT_HOLD_MS;
      const tFade = window.setTimeout(() => {
        if (!cancelled) {
          setSpotlightVisible(false);
        }
      }, fadeOutAt);
      const tRemove = window.setTimeout(() => {
        if (!cancelled) {
          setSpotlightHole(null);
          setSpotlightVisible(false);
        }
      }, fadeOutAt + SPOTLIGHT_FADE_MS);
      spotlightTimersRef.current.push(tFade, tRemove);
    };

    const scrollOnce = (): boolean => {
      if (cancelled) {
        return false;
      }
      const el = document.querySelector(`[data-appointment-id="${CSS.escape(id)}"]`);
      if (!el) {
        return false;
      }
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
      lastScrolledHighlightRef.current = id;
      showSpotlightForElement(el);
      return true;
    };

    if (scrollOnce()) {
      return () => {
        cancelled = true;
        clearSpotlightTimers();
      };
    }

    let retryTimerId: number | undefined;
    let attempt = 0;

    const tick = () => {
      if (cancelled) {
        return;
      }
      if (scrollOnce()) {
        return;
      }
      attempt += 1;
      if (attempt < SCROLL_TO_EVENT_RETRY_MAX) {
        retryTimerId = window.setTimeout(tick, SCROLL_TO_EVENT_RETRY_MS) as unknown as number;
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (retryTimerId !== undefined) {
        window.clearTimeout(retryTimerId);
      }
      clearSpotlightTimers();
    };
  }, [
    appointments,
    highlightAppointmentId,
    modalSpotlightId,
    clearSpotlightTimers,
    isLoadingAppointments,
    isLoadingResources,
    pathname,
  ]);

  return <AppointmentFocusSpotlight hole={spotlightHole} visible={spotlightVisible} />;
}
