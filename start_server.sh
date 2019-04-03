#!/usr/bin/env bash
nvm use 11
export PORT=3000
immortal -l groundweb.log node server.js
