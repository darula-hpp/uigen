FROM ubuntu:24.04 AS builder

RUN apt-get update && apt-get install -y \
  build-essential \
  cmake \
  git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN cmake -S . -B build && cmake --build build --target esp32_simulator

FROM ubuntu:24.04

RUN apt-get update && apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/build/esp32_simulator /usr/local/bin/esp32_simulator
COPY openapi.yaml /app/openapi.yaml
COPY web /app/web

EXPOSE 8080

CMD ["esp32_simulator", "--host", "0.0.0.0", "--port", "8080", "--openapi", "/app/openapi.yaml", "--web", "/app/web"]
