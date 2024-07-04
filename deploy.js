const fs = require('fs')
const {
  rmdir,
  mkdir,
  run,
  exist,
  read,
  write,
  get,
  exit,
  regexp,
  env
} = require('extras')
const nginx = require('./lib/nginx.js')
const util = require('./lib/util.js')

const mode = process.env.WAVEORB_DEPLOY_ENV
const from = process.env.WAVEORB_DEPLOY_BRANCH

const APPTYPES = { web: 'web', service: 'service', lib: 'lib' }

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
name = name
  .trim()
  .replace(' ', '_')
  .toLowerCase()
  .replace(/\.git$/, '')

process.chdir('/root')

// Make sure /root/apps/docs/{data,log} exists or create it
mkdir(`apps/${name}/data`)
mkdir(`apps/${name}/log`)

process.chdir(`/root/apps/${name}`)
rmdir('tmp')
const remote = from ? ` --branch ${from}` : ''
run(`git clone ${repo} --depth 1${remote} tmp`)

if (!exist('tmp')) {
  exit(`Can't clone repo: ${repo}!`)
}

process.chdir(`tmp`)

// Write mode to .env file
if (mode) {
  write('.env', mode)
}

const revision = get('git rev-parse --short HEAD')
const branch = get(`git rev-parse --abbrev-ref HEAD`)
console.log(`Revision ${revision} on ${branch} branch`)

// Fail if revision already exists
if (exist(`/root/apps/${name}/${revision}`)) {
  exit('Revision already exists!\n\nPlease push an update and deploy again.\n')
}

// Find waveorb config file
const config = env('waveorb.json', mode)

console.log(`Using config:`)
console.log(config)

if (!config.domains || !config.domains.length) {
  exit('Config domains field is missing!')
}

// Find package.json file
if (!exist(`package.json`)) {
  exit('File package.json is missing!')
}
const pkg = read(`package.json`)

// Allow simple domain setting
if (typeof config.domains == 'string') {
  const { domains, redirects, ssl } = config
  config.domains = [{ names: domains, redirects, ssl }]
  delete config.redirects
  delete config.ssl
}

// Install packages
console.log('Installing npm packages...')
run('rm package-lock.json')
run(`npm i --omit=dev`)

// Build
if (pkg.scripts?.build) {
  console.log('Building app...')
  run(`npm run build`)
}

const {
  proxy,
  basicauth,
  ssr,
  sitemapdir,
  errordir,
  redirectmain,
  apptype = APPTYPES.web
} = config

if (!APPTYPES[apptype]) {
  exit(`App type must be one of ${Object.keys(APPTYPES).join()}`)
}

const dist = `/root/apps/${name}/current/dist`
const data = `/root/apps/${name}/data`

if (apptype == APPTYPES.web) {
  // For each domain
  for (let domain of config.domains) {
    // Support string for domain
    if (typeof domain == 'string') {
      domain = { names: domain }
    }

    // Make sure nginx config for this app exists or create it
    // If create, also add Let's Encrypt certificate
    if (!domain.names) {
      exit('Domain names field is missing!')
    }

    // Skip if it's an IP address, doesn't need nginx config
    if (regexp.ip.test(domain.names)) {
      console.log('Found ip address, skipping...')
      continue
    }

    const names = domain.names.replace(/\s+/, ' ')
    const main = names.split(' ')[0]

    console.log(`Processsing ${main}...`)

    const certDir = main.replace(/\*\./g, '')
    const cert = domain.cert || `/etc/letsencrypt/live/${certDir}/fullchain.pem`
    const key = domain.key || `/etc/letsencrypt/live/${certDir}/privkey.pem`
    const ssl = domain.ssl !== false
    const dryRun = !!domain.dryRun
    const redirects = domain.redirects || []

    // Set up nginx config template
    const template = nginx({
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
    })

    const nginxConf = util.nginxName(main, name)

    // Set up SSL certificate if it doesn't exist
    if (ssl && !exist(cert)) {
      // Need plain http to validate domain
      write(nginxConf, template({ ssl: false }))
      run(`systemctl restart nginx`)

      const emailOption = config.email
        ? `--email ${config.email}`
        : `--register-unsafely-without-email`

      const domainOption = names
        .split(' ')
        .map((n) => `-d ${n}`)
        .join(' ')

      const certbotCommand = `certbot certonly --nginx --agree-tos --no-eff-email ${
        dryRun ? '--dry-run ' : ''
      }${emailOption} ${domainOption}`
      console.log(certbotCommand)

      // Install certificate
      run(certbotCommand)
    }

    // Write config based on preference
    write(nginxConf, template({ ssl }))
  }

  if (basicauth) {
    const [user, password] = basicauth.split(':')
    run(`htpasswd -b -c ${data}/.htpasswd ${user} ${password}`)
  }

  // Cron jobs
  const { jobs = [] } = config
  if (jobs.length) {
    const existing = run(`crontab -l`).stdout.trim().split('\n')
    const all = [...new Set(existing.concat(jobs))].join('\n')
    if (all) run(`echo "${all}" | crontab -`)
  }

  // Build sitemap
  if (config.sitemap && pkg.scripts?.sitemap) {
    run(`npm run sitemap`)
  }

  // Apply migrations
  if (pkg.scripts?.migrate) {
    run(`npm run migrate`)
  }
}

// Move stuff into place
process.chdir(`/root/apps/${name}`)
run(`mv tmp ${revision}`)

// Record previous revision
const prev = exist('current') ? fs.readlinkSync('current') : ''

// Symlink to new revision
run(`ln -sfn ${revision} current`)

if (prev) {
  console.log(`Removing previous revision ${prev}`)
  rmdir(prev)
}

if (apptype == APPTYPES.web) {
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

  process.chdir(`/root/apps/${name}/current`)

  // Ping servers
  if (config.ping && pkg.scripts?.ping) {
    run(`npm run ping`)
  }
}

console.log('\nDeployed.\n')
