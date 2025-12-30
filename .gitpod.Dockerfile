FROM gitpod/workspace-full:latest

# 1. Install System Tools (wget, jq, etc.)
RUN sudo apt-get update && sudo apt-get install -y \
    wget curl jq btop zip unzip build-essential tldr \
    libgbm-dev libnss3 libatk-bridge2.0-0 libgtk-3-0

# 2. Install Claude Code (Global Binary)
RUN curl -fsSL https://claude.ai/install.sh | bash

# 3. Bake Node Modules into the Image
# We create a folder, copy your package.json, and install.
# This makes the node_modules part of the "OS" for the student.
WORKDIR /home/gitpod/prebuild
COPY --chown=gitpod:gitpod package.json ./
RUN npm install && npm cache clean --force

# 4. Pre-install Playwright Browser (Crucial for Cloners)
RUN npx playwright install chromium --with-deps

# 5. Set the final working directory
WORKDIR /workspace
