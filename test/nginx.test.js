const nginx = require('../lib/nginx.js')

const config = {
  proxy: 'http://localhost:5000',
  domains: [
    {
      names: 'entangle.no www.entangle.no',
      cert: '/etc/letsencrypt/live/entangle.no/fullchain.pem',
      key: '/etc/letsencrypt/live/entangle.no/privkey.pem'
    }
  ],
  redirects: [ '/about.html', '/' ]
}

const template = nginx({
  name: 'hello',
  proxy: config.proxy,
  domain: config.domains[0],
  ssl: true
})
console.log(template)