# Change the welcome message
printf "ᚠᚢᚦᚬᚱᚴᚼᚾᛁᛅᛦᛋᛏᛒᛘᛚ\n" > /etc/motd

# Set environment
echo "EDITOR=vim" >> /etc/environment
echo "NODE_ENV=production" >> /etc/environment

# Upgrade system
apk update && apk upgrade && sync

# Install packages
apk add zsh openssh nodejs npm nginx git ip6tables ufw certbot certbot-nginx

# Update npm
npm install -g npm

# Install mongodb
echo "http://dl-cdn.alpinelinux.org/alpine/v3.9/main" >> /etc/apk/repositories
echo "http://dl-cdn.alpinelinux.org/alpine/v3.9/community" >> /etc/apk/repositories
apk update
apk add mongodb mongodb-tools
mkdir -p /data/db/
rc-update add mongodb default
rc-service mongodb start

# Git configuration
git config --global pull.rebase false

# Optional configuration
if [ -n "$GIT_CONFIG_NAME" ]; then
  echo "Setting global git user name to $GIT_CONFIG_NAME"
  git config --global user.name "$GIT_CONFIG_NAME"
fi

if [ -n "$GIT_CONFIG_EMAIL" ]; then
  echo "Setting global git user email to $GIT_CONFIG_EMAIL"
  git config --global user.email "$GIT_CONFIG_EMAIL"
fi

# Install zsh
apk add zsh
chsh -s /bin/zsh root

# Install default files
git clone --depth 1 https://github.com/eldoy/waveorb-server.git
base=$HOME/waveorb-server/config
cp $base/etc/ssh/* /etc/ssh
cp $base/etc/nginx/*.conf /etc/nginx
cp $base/.vimrc $HOME
cp $base/.zshrc $HOME
cd $HOME/waveorb-server && npm i
cd $HOME

# Install certbot
apk add certbot certbot-nginx
crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | crontab -

# Enable services
rc-update add nginx default

# SSH keys
cat /dev/zero | ssh-keygen -q -N "" -t rsa

# Set up firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Post install messages
printf "\nPlease add this ssh key to your git account:\n\n"
cat $HOME/.ssh/id_rsa.pub

printf "\n\nDone!\n\nRebooting...\n\n"

# Reboot
reboot now
