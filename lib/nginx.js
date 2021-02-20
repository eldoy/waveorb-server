module.exports = function({ names, main, proxy, cert, key, dir }) {

  function locations() {
    return `location / {
    index index.html;
    root ${dir};
  }

  location /api {
    proxy_pass ${proxy};
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_redirect off;
    proxy_cache_bypass $http_upgrade;
  }`
  }

  function plain() {
    return `server {
  listen 80;
  server_name ${names};

  if ($host != ${main}) {
    rewrite ^/(.*)$ http://${main}/$1 permanent;
  }

  ${locations()}
}`
  }

  function secure() {
    return `server {
  listen 80;
  server_name ${names};
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name ${names};
  ssl_certificate ${cert};
  ssl_certificate_key ${key};

  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ssl_prefer_server_ciphers on;
  ssl_ciphers 'EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH';

  if ($host != ${main}) {
    rewrite ^/(.*)$ https://${main}/$1 permanent;
  }

  ${locations()}
}`
  }

  return function({ ssl = true }) {
    return ssl ? secure() : plain()
  }
}
