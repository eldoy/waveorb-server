const { rmdir, mkdir, run, exist, read, write } = require('extras')
const template = require('./lib/nginx.js')

function exit(msg, code = 1) {
  console.log(msg)
  process.exit(code)
}

const repo = process.argv[2]
console.log(repo)
let name = process.argv[3]
if (!name) {
  name = repo.split('/').reverse()[0]
  console.log(name)
}

// Make name safe
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
rmdir(`.git`)

// Scan package.json and find next version number
// Do not deploy if version exists, abort
const pkg = read('package.json')

console.log(pkg)
if (!pkg.version) {
  exit('Version is missing!')
}

// Find waveorb file
const wfile = `waveorb.json`
if (!exist(wfile)) {
  exit('Waveorb file missing!')
}
const config = read(wfile)

console.log(config)

if (!config.proxy) {
  exit('Config proxy field is missing!')
}

if (!config.domains || !config.domains.length) {
  exit('Config domains field is missing!')
}

const conf = `/etc/nginx/conf.d/${name}.conf`

// For each domain
for (const domain of config.domains) {

  // Make sure nginx config for this app exists or create it
  // If create, also add Let's Encrypt certificate


  if (!exist(conf)) {
    const content = template({
      name,
      proxy: config.proxy,
      domain: config.domains[0],
      ssl: true
    })

    write(conf, content)
    console.log(content)
  }



  // Apply domains
  // Apply redirects
  // Make sure SSL certificate exists and is updated





}

// Apply jobs
// Apply migrations

// npm i
// npm run serve:build (using waveorb build)
// npm run build
// cd ..
// mv tmp version-number

// ln -s current to version-number

// Restart systemctl restart @app-name.service
// Restart nginx if certificate changed


// Start service:
// systemctl daemon-reload
// systemctl enable app@name
// systemctl restart app@name
