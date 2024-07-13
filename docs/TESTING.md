# Setup Dev environment

We're using Vagrant for development.

Vagrant needs to be accessible via ssh as root to simulate the production environment.

We will be using ubuntu-22.04.

Use this Vagrantfile:
```rb
Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-22.04"
  config.vm.hostname = "ecmaserver"
  config.vm.network :forwarded_port, guest: 22, host: 2260, id: 'ssh'
  config.vm.provision "shell" do |s|
    ssh_pub_key = File.read("#{Dir.home}/.ssh/id_rsa.pub").strip
    s.inline = <<-SHELL
      echo #{ssh_pub_key} >> /home/vagrant/.ssh/authorized_keys
      echo #{ssh_pub_key} >> /root/.ssh/authorized_keys
    SHELL
  end
end
```

Start vagrant with `vagrant up`.

To restart vagrant between tests, run `vagrant destroy -f && vagrant up`.

### Add SSH config

Add this to `~/.ssh/config`:
```
Host ecma
Hostname 127.0.0.1
User root
Port 2260
```

If the port doesn't work, run `vagrant ssh-config` to see the correct port.

You should now be able to enter the VM as root:

```
ssh root@ecma
```

### Restart and rebuild VM

Run `vagrant destroy -f && vagrant up` to restart and rebuild the VM.


### Manually add SSH key on provisioned VM

Copy you public ssh key to the clipboard: `cat ~/.ssh/id_rsa.pub | pbcopy`

Run `vagrant ssh` to enter the box.

Once inside the VM, run `sudo su -`, and paste your public ssh key into `/root/.ssh/authorized_keys`
```

Congratulations! 🎉