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

# Install zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh) --unattended"
sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME="norm"/g' /root/.zshrc
sed -i '/DISABLE_AUTO_UPDATE/s/^# //g' /root/.zshrc
chsh -s /usr/bin/zsh root

# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.zshrc

# Install NodeJS
nvm install --lts
nvm use --lts

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
wget https://nginx.org/download/nginx-1.19.7.tar.gz
tar zxvf nginx-1.19.7.tar.gz
rm nginx-1.19.7.tar.gz

git clone https://github.com/google/ngx_brotli.git
cd ngx_brotli && git submodule update --init && cd ~
cd ~/nginx-1.19.7

until apt install -y libpcre3 libpcre3-dev zlib1g zlib1g-dev openssl libssl-dev; do sleep 1; done

./configure --with-compat --add-dynamic-module=../ngx_brotli
make modules
cp objs/*.so /etc/nginx/modules
chmod 644 /etc/nginx/modules/*.so

cd ~
rm -rf ~/ngx_brotli
rm -rf ~/nginx-1.19.7

# Start nginx
systemctl enable nginx
systemctl start nginx

# Set up firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Install cronjobs
(crontab -l 2>/dev/null; echo "20 3 * * * certbot renew --noninteractive --post-hook 'systemctl restart nginx'") | crontab -

# Reboot
reboot now
