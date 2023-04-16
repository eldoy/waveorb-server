function nginxName(domain, name) {
  domain = domain.replace(/\*\./g, '').replace(/\./g, '-')
  return `/etc/nginx/conf.d/${name}_${domain}.conf`
}

module.exports = { nginxName }
