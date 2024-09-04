const fs = require('fs')
const extras = require('extras')
const nginx = require('./lib/nginx.js')
const util = require('./lib/util.js')

const mode = process.env.WAVEORB_DEPLOY_ENV
const from = process.env.WAVEORB_DEPLOY_BRANCH

const APPTYPES = { web: 'web', service: 'service', lib: 'lib' }

const repo = process.argv[2]
if (!repo) {
  extras.exit(`Repository URL is missing!`)
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
extras.exec(`mkdir -p apps/${name}/data`)
extras.exec(`mkdir -p apps/${name}/log`)

process.chdir(`/root/apps/${name}`)
extras.exec(`rm -rf tmp`)

const remote = from ? ` --branch ${from}` : ''
extras.exec(`git clone ${repo} --depth 1${remote} tmp`)

if (!extras.exist('tmp')) {
  extras.exit(`Can't clone repo: ${repo}!`)
}

process.chdir(`tmp`)

// Write mode to .env file
if (mode) {
  extras.write('.env', mode)
}

const revision = extras.capture(`git rev-parse --short HEAD`)
const branch = extras.capture(`git rev-parse --abbrev-ref HEAD`)
console.log(`Revision ${revision} on ${branch} branch`)

// Fail if revision already exists
if (extras.exist(`/root/apps/${name}/${revision}`)) {
  extras.exit(
    'Revision already exists!\n\nPlease push an update and deploy again.\n'
  )
}

// Find waveorb config file
const config = extras.env('waveorb.json', mode)

console.log(`Using config:`)
console.log(config)

if (!config.domains || !config.domains.length) {
  extras.exit('Config domains field is missing!')
}

// Find package.json file
if (!extras.exist(`package.json`)) {
  extras.exit('File package.json is missing!')
}
const pkg = extras.read(`package.json`)

// Allow simple domain setting
if (typeof config.domains == 'string') {
  const { domains, redirects, ssl } = config
  config.domains = [{ names: domains, redirects, ssl }]
  delete config.redirects
  delete config.ssl
}

// Install packages
console.log('Installing npm packages...')
extras.exec(`npm i --omit=dev`)

// Build
if (pkg.scripts?.build) {
  console.log('Building app...')
  extras.exec(`npm run build`)
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
  extras.exit(`App type must be one of ${Object.keys(APPTYPES).join()}`)
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
      extras.exit('Domain names field is missing!')
    }

    // Skip if it's an IP address, doesn't need nginx config
    if (extras.regexp.ip.test(domain.names)) {
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
    if (ssl && !extras.exist(cert)) {
      // Need plain http to validate domain
      extras.write(nginxConf, template({ ssl: false }))
      extras.exec(`systemctl restart nginx`)

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
      extras.exec(certbotCommand)
    }

    // Write config based on preference
    extras.write(nginxConf, template({ ssl }))
  }

  if (basicauth) {
    const [user, password] = basicauth.split(':')
    extras.exec(`htpasswd -b -c ${data}/.htpasswd ${user} ${password}`)
  }

  // Cron jobs
  const { jobs = [] } = config
  if (jobs.length) {
    const existing = extras.capture(`crontab -l`).split('\n')
    const all = [...new Set(existing.concat(jobs))].join('\n')
    if (all) {
      extras.exec(`echo "${all}" | crontab -`)
    }
  }

  // Build sitemap
  if (config.sitemap && pkg.scripts?.sitemap) {
    extras.exec(`npm run sitemap`)
  }

  // Apply migrations
  if (pkg.scripts?.migrate) {
    extras.exec(`npm run migrate`)
  }
}

// Move stuff into place
process.chdir(`/root/apps/${name}`)
extras.exec(`mv tmp ${revision}`)

// Record previous revision
const prev = extras.exist('current') ? fs.readlinkSync('current') : ''

// Symlink to new revision
extras.exec(`ln -sfn ${revision} current`)

if (prev) {
  console.log(`Removing previous revision ${prev}`)
  extras.exec(`rm -rf ${prev}`)
}

if (apptype == APPTYPES.web) {
  // Reload services
  extras.exec(`systemctl daemon-reload`)

  // Restart nginx
  extras.exec(`systemctl restart nginx`)

  // Start app service if proxy
  if (proxy) {
    extras.exec(`systemctl enable app@${name}`)
    extras.exec(`systemctl restart app@${name}`)
  } else {
    extras.exec(`systemctl stop app@${name}`)
    extras.exec(`systemctl disable app@${name}`)
  }

  process.chdir(`/root/apps/${name}/current`)

  // Ping servers
  if (config.ping && pkg.scripts?.ping) {
    extras.exec(`npm run ping`)
  }
}

console.log('\nDeployed.\n')
