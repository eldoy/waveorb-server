function nginxName(domain, name) {
  domain = domain.replace(/\*\./g, '').replace(/\./g, '-')
  return `/etc/nginx/conf.d/${domain}_${name}.conf`
}

module.exports = { nginxName }
