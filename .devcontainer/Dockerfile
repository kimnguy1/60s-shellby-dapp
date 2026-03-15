FROM mcr.microsoft.com/devcontainers/base:ubuntu

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates git jq \
  && rm -rf /var/lib/apt/lists/*

# Install Node LTS (for common web tooling)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get update \
  && apt-get install -y --no-install-recommends nodejs \
  && npm install -g pnpm \
  && rm -rf /var/lib/apt/lists/*
