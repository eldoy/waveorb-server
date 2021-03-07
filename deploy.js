const fs = require('fs')
const { rmdir, mkdir, run, exist, read, write, get, exit } = require('extras')
const nginx = require('./lib/nginx.js')

const repo = process.argv[2]
if (!repo) {
  exit(`Repository URL is missing!`)
}
console.log(`Deploying repository ${repo}`)

// Extract name
let name = process.argv[3]
if (!name) {
  name = repo.split('/').reverse()[0]
}
name = name.trim().replace(' ', '_').toLowerCase()

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

const revision = get('git rev-parse --short HEAD')
const branch = get(`git rev-parse --abbrev-ref HEAD`)
console.log(`Revision ${revision} on ${branch} branch`)

// Fail if revision already exists
if (exist(`/root/apps/${name}/${revision}`)) {
  exit('Revision already exists!\n\nPlease push an update and deploy again.\n')
}

// Find waveorb file
if (!exist(`waveorb.json`)) {
  exit('Waveorb file missing!')
}
const config = read(`waveorb.json`)

if (!config.domains || !config.domains.length) {
  exit('Config domains field is missing!')
}

// Find package.json file
if (!exist(`package.json`)) {
  exit('File package.json is missing!')
}
const pkg = read(`package.json`)

if (!pkg.scripts?.build) {
  exit('Build script not found in package.json')
}

// Allow simple domain setting
if (typeof config.domains == 'string') {
  const { domains, redirects, ssl } = config
  config.domains = [{ names: domains, redirects, ssl }]
  delete config.redirects
  delete config.ssl
}

// Install packages
console.log('Installing npm packages...')
run(`npm i`)

// Build
run(`npm run build`)

// For each domain
for (const domain of config.domains) {
  // Support string for domain
  if (typeof domain == 'string' ) {
    domain = { names: domain }
  }

  // Make sure nginx config for this app exists or create it
  // If create, also add Let's Encrypt certificate
  if (!domain.names) {
    exit('Domain names field is missing!')
  }

  const names = domain.names.replace(/\s+/, ' ')
  const main = names.split(' ')[0]

  console.log(`Serving ${main}`)

  const proxy = config.proxy
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

// Cron jobs
const { jobs = [] } = config
if (jobs.length) {
  const existing = run(`crontab -l`).stdout.trim().split('\n')
  const all = [...new Set(existing.concat(jobs))].join('\n')
  if (all) run(`echo "${all}" | crontab -`)
}

// Apply migrations
if (pkg.scripts?.migrate) {
  run(`npm run migrate`)
}

// Move stuff into place
process.chdir('..')
run(`mv tmp ${revision}`)

// Record previous revision
const prev = exist('current') ? fs.readlinkSync('current') : ''

// Symlink to new revision
run(`ln -sfn ${revision} current`)

if (prev) {
  console.log(`Removing previous revision ${prev}`)
  rmdir(prev)
}

// Reload services
run(`systemctl daemon-reload`)

// Restart nginx
run(`systemctl restart nginx`)

// Start app service if proxy
if (proxy) {
  run(`systemctl enable app@${name}`)
  run(`systemctl restart app@${name}`)
} else {
  run(`systemctl stop app@${name}`)
  run(`systemctl disable app@${name}`)
}

console.log('\nDeployed.\n')
