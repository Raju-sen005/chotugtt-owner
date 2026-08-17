import { useCallback, useEffect, useRef } from "react";

const NOTIFICATION_SOUND =
  "/sounds/new.mp3";

export const useNotificationSound = () => {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(NOTIFICATION_SOUND);

    audio.preload = "auto";
    audio.volume = 1.0;

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, []);

  const playAlert = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      console.warn("🔊 Notification audio is not initialized.");
      return;
    }

    try {
      // Previous announcement ko stop karo
      audio.pause();
      audio.currentTime = 0;

      audio.volume = 1.0;

      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn(
            "🔊 Notification audio was blocked by browser:",
            error
          );
        });
      }
    } catch (error) {
      console.error(
        "🔊 Notification sound error:",
        error
      );
    }
  }, []);

  return playAlert;
};