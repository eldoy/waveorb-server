Each app can have a file like this (app/config/server.yml):

server: 45.32.236.124
domains:
  - docs.com
  - www.docs.com
redirects:
  - /from-url: /to-url.html


# Save about server
# curl http://169.254.169.254/v1.json | json_pp -json_opt pretty,canonical


Can build be done without server? Just load app, run actions. Can use test lib for this?

### Remove email server if needed
systemctl stop exim4
systemctl disable exim4
apt-get remove exim4 exim4-base exim4-config exim4-daemon-light

### Install wildcard certificate
certbot certonly --manual -d '*.7i.no' --agree-tos --no-bootstrap --manual-public-ip-logging-ok --preferred-challenges dns-01 --no-eff-email --server https://acme-v02.api.letsencrypt.org/directory