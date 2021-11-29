#!/bin/sh

ffmpeg -re -f flv -listen 1 \
  -i rtmp://0.0.0.0:1935/live/app \
  -c:a aac \
  -c:v h264 -profile:v baseline \
  -map v:0 -b:0 1000k -s:0 640x360 \
  -map v:0 -b:0 500k -s:1 320x180 \
  -map a:0 \
  -adaptation_sets "id=0,streams=v id=1,streams=a" \
  -window_size 5 \
  -remove_at_exit 1 \
  -movflags +faststart \
  -f dash ${PWD}/../dash-data/1.mpd
