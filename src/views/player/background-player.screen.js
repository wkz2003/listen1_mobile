import React, {useRef, useState} from 'react';
import Video from 'react-native-video';
import MusicControl from 'react-native-music-control';
import LApi from '../../api/client';
import PlayerContainer from '../../state/player.state';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

export default function BackgroundPlayers() {
  const video = useRef(null);
  const [url, setUrl] = useState('');
  const {
    seek,
    setCurrent,
    setDuration,
    nowplayingTrack,
    isPlaying,
    playMode,
    nextTrack,
    pause,
    prevTrack,
    play,
    loadFail,
  } = PlayerContainer.useContainer();

  useEffectOnce(() => {
    MusicControl.enableBackgroundMode(true);

    MusicControl.on('play', () => {
      play();
    });
    MusicControl.on('pause', () => {
      pause();
    });
    MusicControl.on('nextTrack', () => {
      nextTrack();
    });
    MusicControl.on('previousTrack', () => {
      prevTrack();
    });

    MusicControl.enableControl('play', true);
    MusicControl.enableControl('pause', true);
    MusicControl.enableControl('stop', false);
    MusicControl.enableControl('nextTrack', true);
    MusicControl.enableControl('previousTrack', true);
    MusicControl.enableControl('changePlaybackPosition', true);
  });

  useUpdateEffect(() => {
    if (nowplayingTrack) {
      setCurrent(0);
      doLoadTrack(nowplayingTrack.id);
      MusicControl.setNowPlaying({
        title: nowplayingTrack.title,
        artwork: nowplayingTrack.img_url,
        artist: nowplayingTrack.artist,
        album: nowplayingTrack.album,
      });
    }
  }, [nowplayingTrack]);
  useUpdateEffect(() => {
    if (seek) {
      video.current.seek(seek);
    }
  }, [seek]);

  useUpdateEffect(() => {
    MusicControl.updatePlayback({
      state: isPlaying ? MusicControl.STATE_PLAYING : MusicControl.STATE_PAUSED,
    });
  }, [isPlaying]);

  function doLoadTrack(trackId) {
    setUrl('');
    trackId &&
      LApi.bootstrapTrack(trackId).then((url) => {
        if (!url) {
          // resource not available
          loadFail();
          return;
        }
        setUrl(url);
      });
  }

  const onLoad = (payload) => {
    setCurrent(0);
    setDuration(payload.duration);
  };

  function onProgress(payload) {
    MusicControl.updatePlayback({
      elapsedTime: payload.currentTime,
    });
    setCurrent(payload.currentTime);
  }

  function onEnd() {
    if (playMode === 2) {
      video.current.seek(0);
    } else {
      nextTrack();
    }
  }

  function onSeek({currentTime}) {
    setCurrent(currentTime);
  }

  function onAudioFocusChanged(event: {hasAudioFocus: boolean}) {
    if (isPlaying && !event.hasAudioFocus) {
      pause();
    }
  }

  return url ? (
    <Video
      ref={video}
      source={{uri: url}}
      style={{width: 0, height: 0}}
      rate={1}
      paused={!isPlaying}
      volume={1}
      muted={false}
      resizeMode={'contain'}
      progressUpdateInterval={250.0} // [iOS] Interval to fire onProgress (default to ~250ms)
      onLoad={onLoad} // Callback when video loads
      onProgress={onProgress} // Callback every ~250ms with currentTime
      onEnd={onEnd}
      onSeek={onSeek}
      repeat={false}
      ignoreSilentSwitch="ignore"
      playInBackground // Audio continues to play when app entering background.
      playWhenInactive // [iOS] Video continues to play when control or notification center are shown.
      onAudioBecomingNoisy={pause} // Callback when audio is becoming noisy - should pause video
      onAudioFocusChanged={onAudioFocusChanged} // Callback when audio focus has been lost - pause if focus has been lost
    />
  ) : null;
}
