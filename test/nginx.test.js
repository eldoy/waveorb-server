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
  domain: config.domains[0],
  proxy: config.proxy,
  ssl: true
})
console.log(template)