// Audio configuration - paths relative to the deployed app root
// Audio files to be placed in public/audio/
export const AUDIO_CONFIG = {
  tracks: [
    {
      id: 1,
      title: "Audio 1",
      filename: "Ruqyah Ain.mpeg",
      path: "/audio/Ruqyah Ain.mpeg",
      description: "Plays first"
    },
    {
      id: 2,
      title: "Audio 2",
      filename: "Ruqyah Jin.mpeg",
      path: "/audio/Ruqyah Jin.mpeg",
      description: "Automatically follows Audio 1"
    },
    {
      id: 3,
      title: "Audio 3",
      filename: "Surah Al-Baqarah.mpeg",
      path: "/audio/Surah Al-Baqarah.mpeg",
      description: "Repeats until sequence is restarted"
    }
  ]
};

export const IMAGE_CONFIG = {
  recitation1: "/images/Du'a For Full Protection.jpeg",
  recitation2: "/images/Protection Against Evil Eye.jpeg",
  recitation3: "/images/Daily_Dhikr.jpeg"
};
