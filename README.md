# Waveorb server

Contains a boot script to install all the software needed to run Waveorb apps.

Features:

* NodeJS
* NGINX Loadbalancer
* Certbot Let's Encrypt SSL
* MongoDB
* Firewall
* Public Key authentication (no password)

Made for [the Waveorb Web App Development Framework.](https://waveorb.com)

### Setup

To install a server on a [Vultr VPS](https://vultr.com), add this boot script to your account:
```sh
#!/bin/bash

apt-get update && apt-get -y install curl
curl https://raw.githubusercontent.com/eldoy/waveorb-server/master/install.sh | sh
```

Add your SSH key there too.

When all is done, use the Waveorb app to create your server and deploy your waveorb apps.

MIT Licensed. Enjoy!
