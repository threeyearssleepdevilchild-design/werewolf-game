import { useEffect, useRef } from 'react';

function FoolBGM({ isFoolTrue }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (isFoolTrue && audioRef.current) {
      console.log('ばかの本物判定！BGMを再生します');
      
      // BGMを再生
      audioRef.current.play().catch(error => {
        console.error('BGM再生エラー:', error);
      });

      // ゲーム終了時に停止
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      };
    }
  }, [isFoolTrue]);

  if (!isFoolTrue) return null;

  return (
    <audio 
      ref={audioRef} 
      src="/sounds/fool_bgm.mp3" 
      loop
      volume={0.3}
    />
  );
}

export default FoolBGM;