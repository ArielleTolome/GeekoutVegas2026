FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install system utilities and Playwright dependencies
RUN apt-get update && apt-get install -y \
    wget curl jq btop zip unzip build-essential tldr \
    libgbm-dev libnss3 libatk-bridge2.0-0 libgtk-3-0 \
    libxkbcommon0 libglib2.0-0 libasound2 \
    && rm -rf /var/lib/apt/lists/*

USER vscode
