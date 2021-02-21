const nginx = require('../lib/nginx.js')

const config = {
  proxy: 'http://localhost:5000',
  domains: [
    {
      names: 'entangle.no www.entangle.no',
      cert: '/etc/letsencrypt/live/entangle.no/fullchain.pem',
      key: '/etc/letsencrypt/live/entangle.no/privkey.pem',
      redirects: [
        '^/about.html$ http://example.com',
        '^/nils.html$ http://example.no'
      ]
    }
  ],

}

const name = 'hello'
const domain = config.domains[0]
const names = domain.names.replace(/\s+/, ' ')
const main = names.split(' ')[0]
const proxy = config.proxy || 'http://localhost:5000'
const cert = domain.cert || `/etc/letsencrypt/live/${main}/fullchain.pem`
const key = domain.key || `/etc/letsencrypt/live/${main}/privkey.pem`
const dir = `/root/apps/${name}/current/dist`
const redirects = domain.redirects || []

const template = nginx({
  names,
  main,
  proxy,
  cert,
  key,
  dir,
  redirects
})({ ssl: true })
console.log(template)