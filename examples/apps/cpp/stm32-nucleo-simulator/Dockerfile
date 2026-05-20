FROM ubuntu:24.04 AS builder

RUN apt-get update && apt-get install -y \
  build-essential \
  cmake \
  git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN cmake -S . -B build && cmake --build build --target stm32_nucleo_simulator

FROM ubuntu:24.04

RUN apt-get update && apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/build/stm32_nucleo_simulator /usr/local/bin/stm32_nucleo_simulator
COPY openapi.yaml /app/openapi.yaml
COPY web /app/web

EXPOSE 8081

CMD ["stm32_nucleo_simulator", "--host", "0.0.0.0", "--port", "8081", "--openapi", "/app/openapi.yaml", "--web", "/app/web"]
