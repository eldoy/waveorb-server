const { run } = require('extras')

run(`git reset --hard`)
run(`git pull`)
run(`npm i`)
run(`apt-get update && apt-get upgrade -y`)
run(`npm i -g npm`)
