export const hello = () => {
  console.log('world!')
}

export const getContentType = ext => {
  switch( ext ) {
  case 'txt':
    return 'text/plain'
  case 'mp4':
    return 'video/mp4'
  case 'm4s':
    return 'video/iso.segment'
  case 'mpd':
    return 'application/dash+xml'
  default: 
    return 'application/octet-stream'
  }
}