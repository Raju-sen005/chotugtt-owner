import { useCallback, useEffect, useRef } from "react";

const NOTIFICATION_SOUND = "/sounds/new.mp3";

export const useNotificationSound = () => {
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);

  /*
   * --------------------------------------------------
   * CREATE AUDIO INSTANCE
   * --------------------------------------------------
   */
  useEffect(() => {
    const audio = new Audio(NOTIFICATION_SOUND);

    audio.preload = "auto";
    audio.volume = 1.0;

    audioRef.current = audio;

    /*
     * Start loading the audio resource.
     * This does NOT bypass autoplay policy.
     */
    audio.load();

    return () => {
      audio.pause();

      try {
        audio.currentTime = 0;
      } catch {
        // Ignore cleanup error.
      }

      audio.removeAttribute("src");

      audioRef.current = null;
      audioUnlockedRef.current = false;
    };
  }, []);

  /*
   * --------------------------------------------------
   * UNLOCK AUDIO
   * --------------------------------------------------
   */
  const unlockAudio = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio) {
      return false;
    }

    if (audioUnlockedRef.current) {
      return true;
    }

    try {
      /*
       * Mute while unlocking.
       * User will NOT hear the sound.
       */
      audio.muted = true;
      audio.volume = 0;

      audio.currentTime = 0;

      const playPromise = audio.play();

      if (playPromise !== undefined) {
        await playPromise;
      }

      /*
       * Stop immediately.
       */
      audio.pause();
      audio.currentTime = 0;

      /*
       * Restore normal state.
       */
      audio.muted = false;
      audio.volume = 1.0;

      audioUnlockedRef.current = true;

      console.log("🔓 Notification audio unlocked");

      return true;
    } catch (error) {
      audio.muted = false;
      audio.volume = 1.0;

      if (error?.name !== "NotAllowedError") {
        console.warn(
          "🔊 Notification audio unlock failed:",
          error?.message || error
        );
      }

      return false;
    }
  }, []);

  /*
   * --------------------------------------------------
   * FIRST USER INTERACTION
   * --------------------------------------------------
   */
  useEffect(() => {
    let active = true;

    const handleUserInteraction = async () => {
      if (!active) {
        return;
      }

      if (audioUnlockedRef.current) {
        return;
      }

      const unlocked = await unlockAudio();

      if (unlocked) {
        removeListeners();
      }
    };

    const removeListeners = () => {
      window.removeEventListener(
        "pointerdown",
        handleUserInteraction
      );

      window.removeEventListener(
        "keydown",
        handleUserInteraction
      );

      window.removeEventListener(
        "touchstart",
        handleUserInteraction
      );
    };

    window.addEventListener(
      "pointerdown",
      handleUserInteraction,
      {
        passive: true,
      }
    );

    window.addEventListener(
      "keydown",
      handleUserInteraction,
      {
        passive: true,
      }
    );

    window.addEventListener(
      "touchstart",
      handleUserInteraction,
      {
        passive: true,
      }
    );

    return () => {
      active = false;
      removeListeners();
    };
  }, [unlockAudio]);

  /*
   * --------------------------------------------------
   * PLAY ALERT
   * --------------------------------------------------
   */
  const playAlert = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      console.warn(
        "🔊 Notification audio is not initialized."
      );

      return;
    }

    /*
     * Browser has not received a user gesture yet.
     *
     * Don't call play() repeatedly.
     */
    if (!audioUnlockedRef.current) {
      console.warn(
        "🔊 Notification sound skipped: waiting for user interaction."
      );

      return;
    }

    try {
      /*
       * Stop previous sound.
       */
      audio.pause();
      audio.currentTime = 0;

      /*
       * Normal playback.
       */
      audio.muted = false;
      audio.volume = 1.0;

      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error?.name === "NotAllowedError") {
            /*
             * Browser permission may have changed.
             * Allow next user interaction to unlock again.
             */
            audioUnlockedRef.current = false;

            console.warn(
              "🔊 Notification playback blocked by browser."
            );

            return;
          }

          console.warn(
            "🔊 Notification playback failed:",
            error?.message || error
          );
        });
      }
    } catch (error) {
      console.error(
        "🔊 Notification sound error:",
        error?.message || error
      );
    }
  }, []);

  /*
   * IMPORTANT:
   * Existing API preserved.
   */
  return playAlert;
};
