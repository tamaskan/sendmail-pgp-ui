docker pull ghcr.io/tamaskan/sendmail-pgp-ui:latest

meant to be run along the vaultwarden-instance:
vaultwarden.website -> vaultwarden container
vaultwarden.website/pgp/ -> this container

env:
SENDMAIL_SMART_HOST
SENDMAIL_SMART_PORT
SENDMAIL_SMART_LOGIN
SENDMAIL_SMART_PASSWORD

if you use authelia, set buffers: read: 8192 write: 8192 for long urls
