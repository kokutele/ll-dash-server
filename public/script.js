const videoEl = document.querySelector("#video-player")
const startEl = document.querySelector("#btn-start")

const start = () => {
  const url = '/dash/1.mpd'

  const player = dashjs.MediaPlayer().create()
  player.initialize( videoEl, url, true )
  player.updateSettings({
    streaming: {
         lowLatencyEnabled: true, 
          delay: {
            liveDelay: 3
         },
         liveCatchup: {
            minDrift: 0.02,
            maxDrift: 0,
            playbackRate: 0.5,
            latencyThreshold: 60    
          }
    }
  });
  console.log( player )

  videoEl.addEventListener('loadedmetadata', async () => {
    await videoEl.play()
      .then( () => console.log('video play succeeded' ))
      .catch( err => console.error( err.message ))
  }, false )
}

startEl.addEventListener("click", start, false )