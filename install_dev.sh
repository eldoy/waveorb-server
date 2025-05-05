# Change the welcome message
printf 'ᚠᚢᚦᚬᚱᚴᚼᚾᛁᛅᛦᛋᛏᛒᛘᛚ\n' > /etc/motd

# Set environment
echo 'LC_ALL=en_US.UTF-8' >> /etc/environment
echo 'EDITOR=vim' >> /etc/environment
echo 'NODE_ENV=production' >> /etc/environment

# Disable interactive restart
sed -i "/#\$nrconf{restart} = 'i';/s/.*/\$nrconf{restart} = 'a';/" /etc/needrestart/needrestart.conf

# Install swap file
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

# Set swappiness
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# Set locale
echo 'UTC' > /etc/timezone
dpkg-reconfigure -f noninteractive tzdata
sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen
echo 'LANG=en_US.UTF-8' > /etc/default/locale
dpkg-reconfigure --frontend=noninteractive locales
update-locale LANG=en_US.UTF-8

# Update
until apt-get update && apt-get upgrade -y; do sleep 1; done
until apt-get autoremove -y; do sleep 1; done

# Install packages
until apt-get install -y build-essential rsync certbot ufw gnupg2 git vim wget apache2-utils; do sleep 1; done

# Install utilities
until apt-get install -y python3-pip tree; do sleep 1; done
pip3 install jc

# Install MongoDB
mkdir -p /data/db
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
until apt-get install -y mongodb-org; do sleep 1; done

# Install Redis
until apt-get install -y redis-server; do sleep 1; done

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
until apt-get install -y zsh; do sleep 1; done
chsh -s /usr/bin/zsh root

# Install NodeJS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
until apt-get install -y nodejs; do sleep 1; done

# Update npm
npm install -g npm

# Install NGINX
# wget https://nginx.org/keys/nginx_signing.key
# apt-key add nginx_signing.key
# rm nginx_signing.key
# until apt-get install -y nginx python3-certbot-nginx; do sleep 1; done

# Install default files
git clone --depth 1 https://github.com/eldoy/waveorb-server.git
base=$HOME/waveorb-server/config
cp $base/etc/ssh/* /etc/ssh
cp $base/etc/nginx/*.conf /etc/nginx
cp $base/etc/systemd/system/*.service /etc/systemd/system
cp $base/.vimrc $HOME
cp $base/.zshrc $HOME
cd $HOME/waveorb-server && npm i
cd $HOME

# Enable and start services
systemctl daemon-reload

# Enable services
# systemctl enable nginx
systemctl enable mongod
systemctl enable redis

# SSH keys
cat /dev/zero | ssh-keygen -q -N ""

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
