const { run } = require('extras')

run(`git reset --hard`)
run(`git pull`)
run(`npm i`)
run(`apt update && apt upgrade -y`)
