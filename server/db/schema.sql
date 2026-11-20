-- Neon Speed server storage. One row per player (id = sha256 of the player code, the code itself is never stored),
-- one row per saved key (the game's save, save slots, achievements, stats, ghosts).
CREATE DATABASE IF NOT EXISTS neonspeed CHARACTER SET utf8mb4;
USE neonspeed;
CREATE TABLE IF NOT EXISTS players (
  id CHAR(64) NOT NULL PRIMARY KEY,
  created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_hash CHAR(16) NOT NULL DEFAULT '',
  KEY idx_ip_created (ip_hash, created)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS player_kv (
  player_id CHAR(64) NOT NULL,
  k VARCHAR(80) CHARACTER SET ascii NOT NULL,
  v MEDIUMTEXT NOT NULL,
  updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id, k),
  CONSTRAINT fk_kv_player FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Player feedback from the in-game form (server/api/feedback.php). Always stored; an email to the owner is attempted on top.
CREATE TABLE IF NOT EXISTS feedback (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_hash CHAR(16) NOT NULL DEFAULT '',
  kind VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  contact VARCHAR(120) NOT NULL DEFAULT '',
  meta VARCHAR(1000) NOT NULL DEFAULT '',
  mailed TINYINT NOT NULL DEFAULT 0,
  KEY idx_ip_created (ip_hash, created)
) ENGINE=InnoDB CHARACTER SET utf8mb4;
