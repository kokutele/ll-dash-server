# ll-dash-server

## run dash-packager( ffmpeg )

need ffmpeg v4.3.1 or higher, maybe
( `sudo snap install ffmpeg` will work on Ubuntu20.04 )

* on ubuntu20

```bash
$ sudo add-apt-repository ppa:savoury1/ffmpeg4 
$ sudo apt-get update && apt-get install -y ffmpeg \
```

or

```bash
$ sudo snap install ffmpeg
```

* run script

```
$ cd scripts
$ ./ll-rtmpsrc.sh
```

then inject mp4 stream via rtmp on port 1935.

## run dash-server

```
$ node index.js
```

then open `http://localhost:5000`

## env

* PORT
  - port number of http server ( default: 5000 )
* LOG_LEVEL
  - log level ( 'trace', 'debug', 'info', 'warn', 'error' and 'fatal'. default: 'info' )
* DASH_DIR
  - directory to store files created by dash-packager ( default `dash-data/` )

## running on docker

### build

* dash-packager (ffmpeg)

```bash
$ docker build -t dash-packager scripts/
```

* dash-server (nodejs)

```bash
$ docker build -t dash-server .
```

### run

* dash-packager

```bash
$ docker run -it -p 1935:1935 -v ${PWD}/dash-data:/dash-data dash-packager
```

* dash-server

```bash
$ docker run --rm -p 5000:5000 -v ${PWD}/dash-data:/dash-data dash-server
```

---
&copy; kensaku.komatsu