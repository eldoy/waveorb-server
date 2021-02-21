const { rmdir, mkdir, run, exist, read, write } = require('extras')
const nginx = require('./lib/nginx.js')

function exit(msg, code = 1) {
  console.log(msg)
  process.exit(code)
}

const repo = process.argv[2]
if (!repo) {
  exit(`Repository URL is missing!`)
}
console.log(repo)

// Extract name
let name = process.argv[3]
if (!name) {
  name = repo.split('/').reverse()[0]
}
name = name.trim().replace(' ', '_').toLowerCase()
console.log(name)

process.chdir('/root')

// Make sure /root/apps/docs/{shared,log} exists or create it
mkdir(`apps/${name}/data`)
mkdir(`apps/${name}/log`)

process.chdir(`apps/${name}`)
rmdir('tmp')
run(`git clone ${repo} --depth 1 tmp`)

if (!exist('tmp')) {
  exit(`Can't clone repo: ${repo}!`)
}

process.chdir('tmp')

// Find waveorb file
const wfile = `waveorb.json`
if (!exist(wfile)) {
  exit('Waveorb file missing!')
}

const revision = run('git rev-parse --short HEAD', { silent: true }).stdout.trim()

console.log(`Revision found: ${revision}`)

// Fail if revision already exists
if (exist(`../${revision}`)) {
  exit('Revision already exists!\n\nPlease push an update and deploy again.')
}

const config = read(wfile)
console.log(config)

if (!config.proxy) {
  exit('Config proxy field is missing!')
}

if (!config.domains || !config.domains.length) {
  exit('Config domains field is missing or empty!')
}

// Allow simple domain setting
if (typeof config.domains == 'string') {
  config.domains = [{ names: config.domains }]
}

// Install packages
run(`npm i`)

// Build
run(`npm run build`)

// For each domain
for (const domain of config.domains) {
  // Make sure nginx config for this app exists or create it
  // If create, also add Let's Encrypt certificate
  if (!domain.names) {
    exit('Domain names field is missing!')
  }

  console.log(`Setting up ${domain.names}`)

  const names = domain.names.replace(/\s+/, ' ')
  const main = names.split(' ')[0]
  const proxy = config.proxy || 'http://localhost:5000'
  const cert = domain.cert || `/etc/letsencrypt/live/${main}/fullchain.pem`
  const key = domain.key || `/etc/letsencrypt/live/${main}/privkey.pem`
  const dir = `/root/apps/${name}/current/dist`
  const ssl = domain.ssl !== false
  const dryRun = !!domain.dryRun
  const redirects = domain.redirects || []

  // Set up nginx config template
  const template = nginx({ names, main, proxy, cert, key, dir, redirects })

  const nginxName = main.replace(/\./g, '-')
  const nginxConf = `/etc/nginx/conf.d/${nginxName}.conf`

  // Set up SSL certificate if it doesn't exist
  if (ssl && !exist(cert)) {

    // Need plain http to validate domain
    write(nginxConf, template({ ssl: false }))
    run(`systemctl restart nginx`)

    const emailOption = config.email
      ? `--email ${config.email}`
      : `--register-unsafely-without-email`

    const domainOption = names.split(' ').map(n => `-d ${n}`).join(' ')

    const certbotCommand = `certbot certonly --nginx --agree-tos --no-eff-email ${dryRun ? '--dry-run ' : ''}${emailOption} ${domainOption}`
    console.log(certbotCommand)

    // Install certificate
    run(certbotCommand)
  }

  // Write config based on preference
  write(nginxConf, template({ ssl }))
}

// Apply jobs? Later.
// Apply migrations
run(`npm run migrate`)

// Move stuff into place
process.chdir('..')
run(`mv tmp ${revision}`)
if (exist('current')) run(`rm current`)
run(`ln -s ${revision} current`)
run(`systemctl daemon-reload`)

// Restart nginx
run(`systemctl restart nginx`)

// Start app service
run(`systemctl enable app@${name}`)
run(`systemctl restart app@${name}`)

console.log('\nDeployed.\n')
