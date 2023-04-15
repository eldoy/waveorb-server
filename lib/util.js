function nginxName(domain, name) {
  domain = domain.replace(/\*\./g, '').replace(/\./g, '-')
  return `/etc/nginx/conf.d/${domain}-${name}.conf`
}

module.exports = { nginxName }
