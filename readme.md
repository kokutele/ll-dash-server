# ll-dash-server

## run ffmpeg

need ffmpeg v4.3.1 or higher, maybe
( `sudo snap install ffmpeg` will work on Ubuntu20.04 )

```
$ cd scripts
$ ./rtmpsrc.sh
```

then inject mp4 stream via rtmp on port 1935.

## run server

```
$ node index.js
```