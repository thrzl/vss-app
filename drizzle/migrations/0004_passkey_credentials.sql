CREATE TABLE passkey_credentials (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  credential_id text NOT NULL,
  public_key text NOT NULL,
  counter integer NOT NULL DEFAULT 0,
  transports text,
  backed_up integer NOT NULL DEFAULT 0,
  created_at text NOT NULL DEFAULT (current_timestamp),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
);

CREATE UNIQUE INDEX passkey_credentials_credential_id_unique
  ON passkey_credentials (credential_id);

CREATE INDEX passkey_credentials_user_id_idx
  ON passkey_credentials (user_id);
