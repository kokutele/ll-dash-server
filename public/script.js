const videoEl = document.querySelector("#video-player")
const startEl = document.querySelector("#btn-start")
const lowLatencyEl = document.querySelector("#chk-lowlatency")

let useLowLatency = true

const start = () => {
  startEl.disabled = true
  lowLatencyEl.disabled = true

  const url = '/dash/1.mpd'

  // eslint-disable-next-line no-undef
  const player = dashjs.MediaPlayer().create()
  player.initialize( videoEl, url, true )
  
  const settings = useLowLatency ? {
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
  }: {
    streaming: {
      lowLatencyEnabled: false,
      lowLatencyEnabledByManifest: false,
      delay: {
        liveDelay: 30
      },
    }
  }

  player.updateSettings( settings )
   
  videoEl.addEventListener('loadedmetadata', async () => {
    await videoEl.play()
      .then( () => console.log('succeeded in playing video' ))
      .catch( err => console.error( err.message ))
  }, false )
}

startEl.addEventListener("click", start, false )
lowLatencyEl.addEventListener("click", ev => {
  useLowLatency = ev.target.checked
})