# Waveorb server

Contains a boot script to install all the software needed to run Waveorb apps.

Includes:

* NodeJS
* NGINX Loadbalancer
* Certbot Let's Encrypt SSL
* Public Key authentication (no password)
* Firewall

Made for [the Waveorb Web App Development Framework.](https://waveorb.com)

### Setup

Create a server on for example [Vultr VPS](https://vultr.com). Add your SSH key there so you can ssh to it without a password.

Choose Debian 10 as operating system. Once it's running, log in to your server and run this command:
```sh
curl https://raw.githubusercontent.com/eldoy/waveorb-server/master/install.sh | sh
```

When all is done your are ready to deploy your waveorb application.

MIT Licensed. Enjoy!
