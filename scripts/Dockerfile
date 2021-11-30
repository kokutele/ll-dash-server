FROM ubuntu:20.04

RUN apt-get update && apt-get install -y software-properties-common \
  && add-apt-repository ppa:savoury1/ffmpeg4 \
  && apt-get update && apt-get install -y ffmpeg \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini

EXPOSE 1935
RUN mkdir /app && mkdir /dash-data
WORKDIR /app
COPY ll-rtmpsrc.sh .

ENTRYPOINT ["/tini", "--"]
CMD [ "/app/ll-rtmpsrc.sh" ]