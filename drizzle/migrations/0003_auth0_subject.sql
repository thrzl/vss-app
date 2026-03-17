ALTER TABLE users ADD COLUMN auth0_subject text;
CREATE UNIQUE INDEX users_auth0_subject_unique ON users (auth0_subject);
