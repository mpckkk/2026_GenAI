\getenv app_password APP_DB_PASSWORD
\getenv keycloak_password KEYCLOAK_DB_PASSWORD
CREATE ROLE celloras LOGIN PASSWORD :'app_password';
CREATE ROLE keycloak LOGIN PASSWORD :'keycloak_password';
CREATE DATABASE celloras OWNER celloras;
CREATE DATABASE keycloak OWNER keycloak;
REVOKE CONNECT ON DATABASE celloras FROM PUBLIC;
REVOKE CONNECT ON DATABASE keycloak FROM PUBLIC;
GRANT CONNECT ON DATABASE celloras TO celloras;
GRANT CONNECT ON DATABASE keycloak TO keycloak;
