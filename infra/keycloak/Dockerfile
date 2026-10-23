FROM quay.io/keycloak/keycloak:26.7.5

# Production deployments replace the checkout directory. Bake the theme and
# realm into the image so a running container cannot retain a stale bind mount.
COPY infra/keycloak/realm.json /opt/keycloak/data/import/celloras-realm.json
COPY infra/keycloak/themes/celloras /opt/keycloak/themes/celloras
