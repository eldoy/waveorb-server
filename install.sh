# Change the welcome message
printf "ᚠᚢᚦᚬᚱᚴᚼᚾᛁᛅᛦᛋᛏᛒᛘᛚ\n" > /etc/motd

# Set environment
echo "LC_ALL=en_US.UTF-8" >> /etc/environment
echo "EDITOR=vim" >> /etc/environment
echo "NODE_ENV=production" >> /etc/environment

# Set swappiness
sysctl vm.swappiness=10

# Set locale
echo "UTC" > /etc/timezone && \
dpkg-reconfigure -f noninteractive tzdata && \
sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
echo 'LANG=en_US.UTF-8' > /etc/default/locale && \
dpkg-reconfigure --frontend=noninteractive locales && \
update-locale LANG=en_US.UTF-8

# Update
until apt update && apt upgrade -y; do sleep 1; done
until apt autoremove -y; do sleep 1; done

# Install packages
until apt install -y build-essential rsync certbot ufw gnupg2 git zsh vim wget; do sleep 1; done

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
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh) --unattended"
sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME="norm"/g' $HOME/.zshrc
sed -i '/DISABLE_AUTO_UPDATE/s/^# //g' $HOME/.zshrc
chsh -s /usr/bin/zsh root

# Install NodeJS
curl -fsSL https://deb.nodesource.com/setup_14.x | bash -
apt install -y nodejs

# Update npm
npm install -g npm

# Install nginx package
wget https://nginx.org/keys/nginx_signing.key
apt-key add nginx_signing.key
rm nginx_signing.key
printf "deb https://nginx.org/packages/mainline/debian/ `lsb_release -sc` nginx \ndeb-src https://nginx.org/packages/mainline/debian/ `lsb_release -sc` nginx \n" >> /etc/apt/sources.list.d/nginx_mainline.list
apt update
until apt install -y nginx python-certbot-nginx; do sleep 1; done
# Other modules:
# nginx-module-geoip nginx-module-image-filter nginx-module-njs nginx-module-perl nginx-module-xslt

# Install brotli
until apt install -y libpcre3 libpcre3-dev zlib1g zlib1g-dev openssl libssl-dev; do sleep 1; done

wget https://nginx.org/download/nginx-1.19.7.tar.gz
tar zxvf nginx-1.19.7.tar.gz
rm nginx-1.19.7.tar.gz

git clone https://github.com/google/ngx_brotli.git
cd $HOME/ngx_brotli && git submodule update --init
cd $HOME/nginx-1.19.7
./configure --with-compat --add-dynamic-module=../ngx_brotli
make modules
cp objs/*.so /etc/nginx/modules
chmod 644 /etc/nginx/modules/*.so

cd $HOME
rm -rf $HOME/ngx_brotli
rm -rf $HOME/nginx-1.19.7

# Install default files
git clone --depth 1 https://github.com/eldoy/waveorb-server.git
base=$HOME/waveorb-server/config
cp $base/etc/ssh/* /etc/ssh
cp $base/etc/nginx/nginx.conf /etc/nginx
cp $base/etc/nginx/conf.d/default.conf /etc/nginx/conf.d
cp $base/etc/systemd/system/*.service /etc/systemd/system
cp $base/etc/mongod.conf /etc
cp $base/usr/share/nginx/html/*.html /usr/share/nginx/html
cp $base/usr/share/nginx/html/*.html /usr/share/nginx/html
cp $base/.vimrc $HOME
cd $HOME/waveorb-server && npm i
cd $HOME

# Install mongodb
# https://computingforgeeks.com/how-to-install-mongodb-on-debian/
# wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | sudo apt-key add -
# echo "deb http://repo.mongodb.org/apt/debian buster/mongodb-org/4.2 main" | sudo tee /etc/apt/sources.list.d/mongodb-org.list
# apt update
# until apt install -y mongodb-org; do sleep 1; done

# Enable and start services
systemctl daemon-reload

# Start nginx
systemctl enable nginx
systemctl restart nginx

# Start mongodb
# systemctl enable mongod
# systemctl restart mongod

# SSH keys
cat /dev/zero | ssh-keygen -q -N ""

# Set up firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Install cronjobs
(crontab -l 2>/dev/null; echo "20 3 * * * certbot renew --noninteractive --post-hook 'systemctl restart nginx'") | crontab -

# Install utilities
until apt install -y python3-pip tree; do sleep 1; done
pip3 install jc

# Post install messages
printf "\nPlease add this ssh key to your git account:\n\n"
cat $HOME/.ssh/id_rsa.pub

printf "\n\nDone!\n\nRebooting...\n\n"

# Reboot
reboot now
