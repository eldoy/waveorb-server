const { exist, run, env } = require('extras')
const util = require('./lib/util.js')

const name = process.argv[2]

if (!name) {
  console.log(`\nName not found.\n`)
  console.log(`Usage:\n  node remove.js <name>\n`)
  process.exit()
}

console.log({ name })

const file = `/root/apps/${name}/current/waveorb.json`
if (!exist(file)) {
  console.log(`Config file ${file} doesn't exist.`)
  process.exit()
}

const config = env(`/root/apps/${name}/current/waveorb.json`)
console.log(config)

if (!config.domains) {
  console.log(`No domains found.`)
  process.exit()
}

let domains = []

function first(str) {
  return str.split(' ')[0]
}

if (typeof config.domains == 'string') {
  domains.push(first(config.domains))
} else {
  config.domains.forEach(function (d) {
    if (typeof d == 'string') {
      domains.push(first(d))
    } else if (d.names) {
      domains.push(first(d.names))
    }
  })
}

console.log({ domains })
if (!domains.length) {
  console.log(`No domains found.`)
  process.exit()
}

const service = `app@${name}`

// Stop service
run(`systemctl stop ${service}`)

// Disable service
run(`systemctl disable ${service}`)

for (const domain of domains) {
  // Remove nginx config
  const nginxConf = util.nginxName(domain, name)

  run(`rm ${nginxConf}`)

  // Remove certificate
  run(`certbot delete --non-interactive --cert-name ${domain}`)
}

// Delete app
run(`rm -rf /root/apps/${name}`)
