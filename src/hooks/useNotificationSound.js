import { useRef, useCallback } from "react";

export const useNotificationSound = () => {
  const audioRef = useRef(
    new Audio("/sounds/universfield-positive-notification-alert-351299.mp3")
  );

  const playAlert = useCallback(() => {
    const audio = audioRef.current;
    audio.currentTime = 0;
    
    // Play ko promise ki tarah handle karein
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Autoplay blocked by browser. Click anywhere on the page to enable sound.", error);
      });
    }
  }, []);

  return playAlert;
};