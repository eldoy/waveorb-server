const extras = require('extras')

// Make sure /root/apps/docs/{shared,log} exists or create it

// cd /root/apps/docs

// git clone git@github.com/eldoy/waveorb-docs --depth 1 tmp

// cd to tmp

// Scan package.json and find next version number
// Do not deploy if version exists, abort

// Make sure nginx config for this app exists or create it
// If create, also add Let's Encrypt certificate
// Create using settings in app/config/server.yml
// Apply domains
// Apply redirects
// Make sure SSL certificate exists and is updated

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
