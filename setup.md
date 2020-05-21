# Portfolio Setup
1. Create user `qarren`.
1. Copy ssh keys to `~/.ssh` and `~/.ssh/authorized_keys`.
1. Disable password authentication in `/etc/ssh/sshd_config`.
  1. Restart `sshd`.
1. Create `/var/sites`.
1. Install `nginx`.
1. Make `nginx` a service. `sudo systemctl enable nginx`
1. Add sites to `/var/sites/`.
1. Copy `nginx` configs to `/etc/nginx/conf.d/`.
1. Setup `certbot`?
1. Install `postfix`
  1. https://serverfault.com/questions/328727/forward-incoming-mail-on-linux-server
  1. Make `postfix` a service.
  1. Enable `sfmt` as a firewalld service.
  1. Set up `postfix` forwarding by adding virualdomains to `/etc/postfix/main.cfg` and updating the virtual tables.
