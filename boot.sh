#!/bin/bash

apt-get update && apt-get -y install curl
curl https://raw.githubusercontent.com/eldoy/waveorb-server/master/install.sh | sh
