module.exports = function ({
  names,
  main,
  proxy,
  cert,
  key,
  dist,
  data,
  redirects,
  basicauth,
  ssr,
  sitemapdir,
  errordir,
  redirectmain
}) {
  function formattedRedirects() {
    return redirects
      .map((r) => {
        let [from, to, type = 'permanent'] = r.split(' ')
        return `rewrite ${from} ${to} ${type};`
      })
      .join('\n  ')
  }

  function redirectToMain(protocol) {
    if (redirectmain === false) return ''
    if (names.split(' ').length < 2) return ''
    return `if ($host != ${main}) {
      rewrite ^/(.*)$ ${protocol}://${main}/$1 permanent;
    }`
  }

  function locations() {
    var dir = errordir || '/usr/share/nginx/html'
    return `error_page 404 /404.html;
  location = /404.html {
    root ${dir};
    internal;
  }

  error_page 500 502 503 504 /50x.html;
  location = /50x.html {
    root ${dir};
    internal;
  }

  ${(function () {
    if (typeof basicauth == 'string') {
      return `auth_basic "Login required";
    auth_basic_user_file ${data}/.htpasswd;
    `
    }
    return ''
  })()}

  ${(function () {
    if (sitemapdir) {
      return `location /sitemap.xml {
    root ${sitemapdir};
  }

  location /sitemaps/ {
    root ${sitemapdir};
    autoindex on;
  }
  `
    }
    return ''
  })()}

  ${(function () {
    if (ssr) {
      return `location @app {
    proxy_pass ${proxy};
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Host $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location / {
    root ${dist};
    try_files $uri @app;
  }
  `
    }
    return `location / {
    root ${dist};
  }`
  })()}

  ${(function () {
    if (proxy) {
      return `location /api {
    proxy_pass ${proxy};
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Host $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_redirect off;
    proxy_cache_bypass $http_upgrade;
  }`
    }
    return ''
  })()}
  `
  }

  function plain() {
    return `server {
  listen 80;
  server_name ${names};
  ${formattedRedirects()}

  ${redirectToMain('http')}

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
  ${formattedRedirects()}
  ssl_certificate ${cert};
  ssl_certificate_key ${key};

  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ssl_prefer_server_ciphers on;
  ssl_ciphers 'EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH';

  default_type "text/html";

  ${redirectToMain('https')}

  ${locations()}
}`
  }

  return function ({ ssl = true }) {
    return ssl ? secure() : plain()
  }
}
