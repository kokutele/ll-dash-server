# ll-dash-server

## run ffmpeg

need ffmpeg v4.3.1 or higher, maybe
( `sudo snap install ffmpeg` will work on Ubuntu20.04 )

```
$ cd scripts
$ ./ll-rtmpsrc.sh
```

then inject mp4 stream via rtmp on port 1935.

## run server

```
$ node index.js
```

then open `http://localhost:5000`

## env

* port
  - port number of http server ( default: 5000 )

---
&copy; kensaku.komatsu