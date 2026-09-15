import { useCallback, useEffect, useRef } from "react";

const NOTIFICATION_SOUND = "/sounds/new.mp3";

export const useNotificationSound = () => {
  const audioRef = useRef(null);

  const unlockedRef = useRef(false);
  const pendingSoundRef = useRef(false);
  const unlockInProgressRef = useRef(false);

  /*
   * --------------------------------------------------
   * CREATE AUDIO
   * --------------------------------------------------
   */
  useEffect(() => {
    const audio = new Audio(NOTIFICATION_SOUND);

    audio.preload = "auto";
    audio.volume = 1;

    audioRef.current = audio;

    /*
     * Preload the sound.
     */
    audio.load();

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, []);

  /*
   * --------------------------------------------------
   * ACTUALLY PLAY SOUND
   * --------------------------------------------------
   */
  const playSoundNow = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;

      const playPromise = audio.play();

      if (playPromise?.catch) {
        playPromise.catch((error) => {
          /*
           * Browser can still reject playback.
           * Keep the sound pending so the next user
           * interaction can retry it.
           */
          if (error?.name === "NotAllowedError") {
            console.warn(
              "🔊 Audio still blocked by browser. Keeping sound pending."
            );

            unlockedRef.current = false;
            pendingSoundRef.current = true;
          } else {
            console.warn(
              "🔊 Notification sound playback failed:",
              error
            );
          }
        });
      }
    } catch (error) {
      console.warn(
        "🔊 Notification sound playback error:",
        error
      );

      pendingSoundRef.current = true;
    }
  }, []);

  /*
   * --------------------------------------------------
   * UNLOCK AUDIO
   * --------------------------------------------------
   *
   * Browser autoplay policy requires a user gesture.
   *
   * We intentionally unlock the audio from:
   * pointerdown
   * keydown
   * touchstart
   */
  const unlockAudio = useCallback(() => {
    const audio = audioRef.current;

    if (!audio || unlockedRef.current || unlockInProgressRef.current) {
      return;
    }

    unlockInProgressRef.current = true;

    try {
      audio.muted = true;
      audio.currentTime = 0;

      const unlockPromise = audio.play();

      if (unlockPromise?.then) {
        unlockPromise
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;

            unlockedRef.current = true;
            unlockInProgressRef.current = false;

            console.log("🔓 Notification audio unlocked");

            /*
             * IMPORTANT:
             *
             * If an order arrived before the user
             * interacted with the page, don't lose
             * that notification.
             */
            if (pendingSoundRef.current) {
              pendingSoundRef.current = false;

              /*
               * Play directly after successful unlock.
               */
              playSoundNow();
            }
          })
          .catch(() => {
            audio.muted = false;
            unlockInProgressRef.current = false;

            /*
             * Still locked.
             * Keep pending sound.
             */
            pendingSoundRef.current =
              pendingSoundRef.current || false;
          });
      } else {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;

        unlockedRef.current = true;
        unlockInProgressRef.current = false;

        console.log("🔓 Notification audio unlocked");

        if (pendingSoundRef.current) {
          pendingSoundRef.current = false;
          playSoundNow();
        }
      }
    } catch (error) {
      audio.muted = false;
      unlockInProgressRef.current = false;

      console.warn(
        "🔊 Notification audio unlock failed:",
        error
      );
    }
  }, [playSoundNow]);

  /*
   * --------------------------------------------------
   * GLOBAL USER INTERACTION LISTENER
   * --------------------------------------------------
   */
  useEffect(() => {
    const events = [
      "pointerdown",
      "touchstart",
      "keydown",
    ];

    const handleInteraction = () => {
      unlockAudio();
    };

    events.forEach((eventName) => {
      document.addEventListener(
        eventName,
        handleInteraction,
        {
          capture: true,
          passive: true,
        }
      );
    });

    return () => {
      events.forEach((eventName) => {
        document.removeEventListener(
          eventName,
          handleInteraction,
          true
        );
      });
    };
  }, [unlockAudio]);

  /*
   * --------------------------------------------------
   * PUBLIC PLAY ALERT
   * --------------------------------------------------
   */
  const playAlert = useCallback(() => {
    /*
     * Audio not created yet.
     */
    if (!audioRef.current) {
      pendingSoundRef.current = true;

      console.log(
        "🔊 Notification sound queued: audio not ready"
      );

      return;
    }

    /*
     * Browser audio is not unlocked yet.
     *
     * IMPORTANT:
     * Do NOT discard the notification.
     */
    if (!unlockedRef.current) {
      pendingSoundRef.current = true;

      console.log(
        "🔊 Notification sound queued: waiting for user interaction."
      );

      return;
    }

    /*
     * Audio is unlocked.
     */
    playSoundNow();
  }, [playSoundNow]);

  return playAlert;
};
