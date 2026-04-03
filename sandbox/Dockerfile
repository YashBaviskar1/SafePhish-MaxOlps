FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    file \
    libimage-exiftool-perl \
    python3 \
    python3-pip \
    yara \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir oletools peepdf-3

WORKDIR /sandbox

COPY analyze.py .
COPY rules.yar .

ENTRYPOINT ["python3", "/sandbox/analyze.py"]
