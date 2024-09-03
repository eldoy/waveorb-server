const extras = require('extras')

extras.exec(`git reset --hard`)
extras.exec(`git pull`)
extras.exec(`npm i`)
extras.exec(`apt-get update && apt-get upgrade -y`)
extras.exec(`npm i -g npm`)
