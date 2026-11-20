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

-- Leaderboards (W2, server/api/scores.php). One row per player and board: their best lap, with its 10 Hz ghost
-- (checked for plausibility on submit, see server/api/scores-lib.php). Board key = "map:WEATHER-LEVEL:tier" or "daily:<day>:map:WEATHER-LEVEL".
CREATE TABLE IF NOT EXISTS lb_names (
  player_id CHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(16) NOT NULL,
  updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_name_player FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE=InnoDB CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS scores (
  board VARCHAR(48) CHARACTER SET ascii NOT NULL,
  player_id CHAR(64) NOT NULL,
  ms INT UNSIGNED NOT NULL,
  car VARCHAR(16) CHARACTER SET ascii NOT NULL,
  ghost MEDIUMTEXT NOT NULL,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (board, player_id),
  KEY idx_board_ms (board, ms),
  CONSTRAINT fk_score_player FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE=InnoDB;
-- Submit log for the rate limits (rows older than a day are pruned by scores.php).
CREATE TABLE IF NOT EXISTS lb_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  player_id CHAR(64) NOT NULL,
  ip_hash CHAR(16) NOT NULL,
  KEY idx_player_at (player_id, at),
  KEY idx_ip_at (ip_hash, at)
) ENGINE=InnoDB;
