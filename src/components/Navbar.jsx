import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Bell, CheckCheck, LogOut, Trash2, X } from "lucide-react";
import axios from "axios";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getNotificationDate = (notification) =>
  notification?.createdAt || notification?.updatedAt;

export default function Navbar() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const notificationRef = useRef(null);
  const previousNotificationIds = useRef(new Set());
  const isFirstNotificationLoad = useRef(true);

  // Navbar-specific notification audio (not useNotificationSound hook).
  const notificationAudioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const pendingSoundRef = useRef(false);
  const unlockInProgressRef = useRef(false);
  const playedNotificationIdsRef = useRef(new Set());

  useEffect(() => {
    const audio = new Audio(
      "/sounds/universfield-positive-notification-alert-351299.mp3",
    );
    audio.preload = "auto";
    audio.volume = 1;
    audio.loop = true;
    notificationAudioRef.current = audio;
    audio.load();

    return () => {
      audio.pause();
      audio.currentTime = 0;
      notificationAudioRef.current = null;
    };
  }, []);

  const stopNotificationSound = useCallback(() => {
    const audio = notificationAudioRef.current;
    pendingSoundRef.current = false;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }
  }, []);

  const playSoundNow = useCallback(() => {
    const audio = notificationAudioRef.current;
    if (!audio) {
      pendingSoundRef.current = true;
      return;
    }
    audio.loop = true;
    audio.muted = false;
    if (!audio.paused) return;

    audio.play().catch((error) => {
      if (error?.name === "NotAllowedError") {
        audioUnlockedRef.current = false;
        pendingSoundRef.current = true;
        console.warn("Navbar notification sound is waiting for user interaction.");
      } else {
        console.warn("Navbar notification sound playback failed:", error);
      }
    });
  }, []);

  const unlockNotificationAudio = useCallback(() => {
    const audio = notificationAudioRef.current;
    if (!audio || audioUnlockedRef.current || unlockInProgressRef.current) return;

    unlockInProgressRef.current = true;
    audio.muted = true;
    audio.currentTime = 0;

    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        audioUnlockedRef.current = true;
        unlockInProgressRef.current = false;
        if (pendingSoundRef.current) {
          pendingSoundRef.current = false;
          playSoundNow();
        }
      })
      .catch(() => {
        audio.muted = false;
        unlockInProgressRef.current = false;
      });
  }, [playSoundNow]);

  const playNotificationSound = useCallback(() => {
    if (!audioUnlockedRef.current) {
      pendingSoundRef.current = true;
      console.info("Navbar notification sound queued until user interaction.");
      return;
    }
    playSoundNow();
  }, [playSoundNow]);

  // Chrome requires a user gesture to unlock audio playback.
  useEffect(() => {
    const handleUserInteraction = () => unlockNotificationAudio();
    const events = ["pointerdown", "keydown", "touchstart"];

    events.forEach((eventName) => {
      document.addEventListener(eventName, handleUserInteraction, {
        capture: true,
        passive: true,
      });
    });

    return () => {
      events.forEach((eventName) => {
        document.removeEventListener(eventName, handleUserInteraction, true);
      })
    };
  }, [unlockNotificationAudio]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  useEffect(() => {
    if (unreadCount > 0) playNotificationSound();
    else stopNotificationSound();
  }, [unreadCount, playNotificationSound, stopNotificationSound]);

  const fetchNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (!user || user.role !== "OWNER") return;

      if (!silent) setIsLoadingNotifications(true);
      setNotificationError("");

      try {
        const response = await axios.get("/notifications");
        const data = response?.data;
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.notifications)
            ? data.notifications
            : Array.isArray(data?.data)
              ? data.data
              : [];

        if (isFirstNotificationLoad.current) {
          // First load par purani notifications ke liye sound nahi bajega
          isFirstNotificationLoad.current = false;

          previousNotificationIds.current = new Set(
            items.map((item) => String(item._id)),
          );
        } else {
          const newNotifications = items.filter(
            (item) => !previousNotificationIds.current.has(String(item._id)),
          );

          const unseenNotifications = newNotifications.filter((item) => {
            const id = String(item._id);
            if (playedNotificationIdsRef.current.has(id)) return false;
            playedNotificationIdsRef.current.add(id);
            return true;
          });

          if (unseenNotifications.length > 0) {
            playNotificationSound();
          }

          previousNotificationIds.current = new Set(
            items.map((item) => String(item._id)),
          );
        }

        setNotifications(items);
      } catch (error) {
        if (!silent) {
          setNotificationError(
            error?.response?.data?.message ||
              "Notifications could not be loaded.",
          );
        }
      } finally {
        if (!silent) setIsLoadingNotifications(false);
      }
    },
    [user, playNotificationSound],
  );


  // One socket notification listener; avoid duplicate sound attempts.
  useEffect(() => {
    const handleSupplyNotification = (event) => {
      const notification = event.detail;
      if (!notification?._id) return;

      const id = String(notification._id);
      if (!playedNotificationIdsRef.current.has(id)) {
        playedNotificationIdsRef.current.add(id);
        playNotificationSound();
      }
      fetchNotifications({ silent: true });
    };

    window.addEventListener("supply-notification-received", handleSupplyNotification);
    return () => {
      window.removeEventListener("supply-notification-received", handleSupplyNotification);
    };
  }, [fetchNotifications, playNotificationSound]);

  useEffect(() => {
    if (user?.role !== "OWNER") return;

    const timeoutId = window.setTimeout(() => fetchNotifications(), 0);
    const intervalId = window.setInterval(() => {
      fetchNotifications({ silent: true });
    }, 30000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [user?.role, fetchNotifications]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setIsNotificationOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleMarkAsRead = useCallback(async (notification) => {
    if (!notification?._id || notification.isRead) return;
    const notificationId = String(notification._id);

    setNotifications((current) =>
      current.map((item) =>
        String(item._id) === notificationId
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item,
      ),
    );

    try {
      await axios.patch(`/notifications/${notificationId}/read`);
    } catch (error) {
      setNotifications((current) =>
        current.map((item) =>
          String(item._id) === notificationId
            ? { ...item, isRead: false, readAt: null }
            : item,
        ),
      );
      console.error("Unable to mark notification as read", error);
    }
  }, []);

  const handleDeleteNotification = useCallback(async (notification) => {
    if (!notification?._id) return;
    const notificationId = String(notification._id);
    const previousNotifications = notifications;

    setNotifications((current) =>
      current.filter((item) => String(item._id) !== notificationId),
    );

    try {
      await axios.delete(`/notifications/${notificationId}`);
    } catch (error) {
      setNotifications(previousNotifications);
      setNotificationError(
        error?.response?.data?.message ||
          "Notification could not be deleted. Please try again.",
      );
      console.error("Unable to delete notification", error);
    }
  }, [notifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter((item) => !item.isRead);
    if (!unreadNotifications.length) return;

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt || new Date().toISOString(),
      })),
    );

    try {
      await axios.patch("/notifications/read-all");
    } catch (error) {
      setNotifications((current) =>
        current.map((item) =>
          unreadNotifications.some((unread) => unread._id === item._id)
            ? { ...item, isRead: false, readAt: null }
            : item,
        ),
      );
      console.error("Unable to mark all notifications as read", error);
    }
  }, [notifications]);

  const handleLogout = useCallback(async () => {
    try {
      await axios.post("/auth/logout");
      window.location.reload();
    } catch {
      console.error("Logout runtime error");
    }
  }, []);

  return (
    <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
      <div className="flex items-center gap-1.5 sm:gap-2 text-sm font-medium text-slate-600 min-w-0">
        {/* Tenant context is intentionally hidden in the navbar. */}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="hidden xs:flex sm:flex items-center gap-1.5 sm:gap-2 text-right">
          <p className="hidden sm:block text-sm font-semibold text-[var(--brand-navy)] truncate max-w-[120px]">
            {user?.name}
          </p>
          <span className="text-[9px] sm:text-[10px] bg-[var(--primary-light)] text-[var(--primary-dark)] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide whitespace-nowrap">
            {user?.role}
          </span>
        </div>

        {user?.role === "OWNER" && (
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotificationOpen((open) => !open);
                if (!isNotificationOpen) fetchNotifications();
              }}
              className="relative p-2 rounded-[14px] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer"
              title="Notifications"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              aria-expanded={isNotificationOpen}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold leading-none ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 top-full mt-2 w-[min(360px,calc(100vw-24px))] max-h-[min(520px,calc(100vh-100px))] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] z-50">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
                  <div>
                    <h3 className="font-display text-sm font-bold text-[var(--brand-navy)]">
                      Notifications
                    </h3>
                    <p className="text-xs text-slate-500">
                      {unreadCount
                        ? `${unreadCount} unread`
                        : "You're all caught up"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--primary)] hover:bg-slate-50"
                        title="Mark all as read"
                      >
                        <CheckCheck size={14} />
                        <span className="hidden sm:inline">Mark all read</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsNotificationOpen(false)}
                      className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Close notifications"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[420px]">
                  {isLoadingNotifications && notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      Loading notifications…
                    </div>
                  ) : notificationError && notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-red-600">
                        {notificationError}
                      </p>
                      <button
                        type="button"
                        onClick={() => fetchNotifications()}
                        className="mt-2 text-xs font-semibold text-[var(--primary)] hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell size={24} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">
                        No notifications yet
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Updates about your supply orders will appear here.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {notifications.map((notification) => (
                        <li key={notification._id}>
                          <div
                            className={`flex items-start gap-2 px-3 py-3 ${
                              notification.isRead ? "bg-white" : "bg-orange-50/60"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleMarkAsRead(notification)}
                              disabled={notification.isRead}
                              className="min-w-0 flex-1 text-left rounded-md hover:bg-slate-50/70 disabled:cursor-default"
                              title={notification.isRead ? "Already read" : "Mark as read"}
                            >
                              <div className="flex items-start gap-2.5">
                              {!notification.isRead && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800">
                                  {notification.title || "Supply Order Update"}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                  {notification.message ||
                                    "Your supply order has been updated."}
                                </p>
                                {notification.oldDeliveryDate &&
                                  notification.newDeliveryDate && (
                                    <div className="mt-2 rounded-md bg-white/80 border border-slate-100 px-2.5 py-2 text-xs">
                                      <p className="text-slate-500">
                                        Previous:{" "}
                                        <span className="font-medium text-slate-700">
                                          {formatDate(
                                            notification.oldDeliveryDate,
                                          )}
                                        </span>
                                      </p>
                                      <p className="mt-0.5 text-slate-500">
                                        New date:{" "}
                                        <span className="font-semibold text-orange-700">
                                          {formatDate(
                                            notification.newDeliveryDate,
                                          )}
                                        </span>
                                      </p>
                                    </div>
                                  )}
                                {notification.reason && (
                                  <p className="mt-1.5 text-xs text-slate-500">
                                    Reason: {notification.reason}
                                  </p>
                                )}
                                <p className="mt-2 text-[10px] text-slate-400">
                                  {formatDate(
                                    getNotificationDate(notification),
                                  )}
                                </p>
                              </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNotification(notification)}
                              className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete notification"
                              aria-label={`Delete notification: ${notification.title || "Supply order update"}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {notificationError && notifications.length > 0 && (
                    <p className="px-4 py-2 text-xs text-red-500">
                      {notificationError}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-all cursor-pointer shrink-0"
          title="Sign Out"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
