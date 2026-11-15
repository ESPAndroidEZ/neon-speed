#!/usr/bin/env bash
# Overnight runner: keeps Claude Code working through docs/overnight/queue.md while you sleep.
# When a usage limit stops a session, it sleeps until the limit resets and starts a new session.
#
# RUNS Claude with --dangerously-skip-permissions (no permission prompts, owner's own risk).
# Safety rails it adds: works only on a branch overnight/<date> (never main), refuses a dirty
# tracked tree, one instance at a time, stops on docs/overnight/STOP, UNTIL, MAX_RUNS or no progress.
#
# Usage:   scripts/overnight.sh                 (start now, until the queue is empty)
#          UNTIL=07:30 scripts/overnight.sh     (do not start new sessions after 07:30)
#          touch docs/overnight/STOP            (finish the current session, then stop)
# Env:     UNTIL=HH:MM  MAX_RUNS=40  MAX_IDLE=3  RUN_TIMEOUT=5400  MODEL=<alias>  KEEP_AWAKE=1
#          ALLOW_DIRTY=1  CLAUDE_BIN=claude  (CLAUDE_BIN lets you test the loop with a stub)
set -u
cd "$(dirname "$0")/.." || exit 1

CLAUDE_BIN=${CLAUDE_BIN:-claude}
QUEUE=docs/overnight/queue.md
PROMPT_FILE=docs/overnight/prompt.md
STOP_FILE=docs/overnight/STOP
LOG_DIR=logs/overnight
UNTIL=${UNTIL:-}
MAX_RUNS=${MAX_RUNS:-40}
MAX_IDLE=${MAX_IDLE:-12}
RUN_TIMEOUT=${RUN_TIMEOUT:-5400}
MODEL=${MODEL:-}
KEEP_AWAKE=${KEEP_AWAKE:-1}
MAX_WAIT=21600   # never sleep more than 6 h for one limit
MARGIN=${LIMIT_MARGIN:-120}   # extra seconds after the announced reset
MODE=${MODE:-tmux}            # tmux = interactive session you can watch and /resume; print = headless claude -p
TMUX_SESSION=${TMUX_SESSION:-neon}
QUIET=${QUIET_SECS:-90}       # tmux mode: seconds of silence (and no "esc to interrupt") before a session counts as finished
NICE=${NICE_LEVEL:-10}        # lower CPU priority for Claude and everything it spawns (headless Chromium etc.)
PROBE=${PROBE_SECS:-1200}    # first wait when the reset time cannot be parsed (grows by 50 % steps)

mkdir -p "$LOG_DIR"
say() { printf '[%s] %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOG_DIR/runner.log"; }

# --- single instance -------------------------------------------------------------------------
exec 9>"$LOG_DIR/.lock"
flock -n 9 || { echo "another overnight.sh is already running"; exit 1; }

# --- preconditions ---------------------------------------------------------------------------
command -v "$CLAUDE_BIN" >/dev/null || { echo "'$CLAUDE_BIN' not found in PATH"; exit 1; }
[[ ${MODE:-tmux} == print ]] || command -v tmux >/dev/null || { echo "tmux not found (or use MODE=print)"; exit 1; }
[[ -f $QUEUE && -f $PROMPT_FILE ]] || { echo "missing $QUEUE or $PROMPT_FILE"; exit 1; }
if [[ -z ${ALLOW_DIRTY:-} ]] && [[ -n $(git status --porcelain --untracked-files=no) ]]; then
  echo "Tracked files have uncommitted changes (commit or stash them, or ALLOW_DIRTY=1):"
  git status --short --untracked-files=no
  exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ $branch != overnight/* ]]; then
  branch="overnight/$(date +%F)"
  git rev-parse --verify -q "$branch" >/dev/null && git checkout "$branch" || git checkout -b "$branch" || exit 1
fi
# Commit the queue files themselves so the first session starts from a clean tree.
git add "$QUEUE" "$PROMPT_FILE" docs/overnight scripts/overnight.sh 2>/dev/null
git diff --cached --quiet || git commit -q -m "Overnight queue and runner" || true
say "branch $branch, $(grep -c '^- \[ \]' "$QUEUE") open tasks, runs<=$MAX_RUNS until=${UNTIL:-queue empty}"

# --- keep Windows awake while the script runs (WSL dies when the PC sleeps) -----------------------
awake_pid=
if [[ $KEEP_AWAKE == 1 ]] && command -v powershell.exe >/dev/null; then
  powershell.exe -NoProfile -Command "Add-Type -Namespace W -Name P -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint f);'; [void][W.P]::SetThreadExecutionState(0x80000001); Start-Sleep -Seconds 43200" >/dev/null 2>&1 &
  awake_pid=$!
  say "keep-awake started (pid $awake_pid)"
fi
cleanup() {
  [[ -n $awake_pid ]] && kill "$awake_pid" 2>/dev/null
  tmux kill-session -t "$TMUX_SESSION" 2>/dev/null
  say "runner exit"
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP

# --- helpers ---------------------------------------------------------------------------------
deadline=
if [[ -n $UNTIL ]]; then
  deadline=$(date -d "$UNTIL" +%s) || exit 1
  (( deadline <= $(date +%s) )) && deadline=$(date -d "tomorrow $UNTIL" +%s)
fi
should_stop() {
  [[ -f $STOP_FILE ]] && { say "STOP file found"; return 0; }
  [[ -n $deadline ]] && (( $(date +%s) >= deadline )) && { say "UNTIL reached"; return 0; }
  return 1
}
open_tasks() { grep -c '^- \[ \]' "$QUEUE"; }
progress_key() { echo "$(git rev-parse HEAD 2>/dev/null) $(md5sum < "$QUEUE")"; }

# Sleep in 30 s slices so STOP / UNTIL still work. Returns 1 if we should stop.
nap() {
  local end=$(( $(date +%s) + $1 ))
  while (( $(date +%s) < end )); do
    should_stop && return 1
    sleep $(( end - $(date +%s) < 30 ? end - $(date +%s) : 30 ))
  done
  return 0
}

# Seconds until the limit resets, parsed from the CLI message; empty if unknown.
# Handles "...limit reached|<epoch>" and "resets 3am (Europe/Sofia)" / "resets 3:30 pm".
limit_wait() {
  local t=$1 now epoch when zone target
  now=$(date +%s)
  epoch=$(grep -oE 'limit reached\|[0-9]{10}' <<<"$t" | tail -1 | grep -oE '[0-9]{10}$')
  if [[ -n $epoch ]]; then echo $(( epoch - now + MARGIN )); return; fi
  when=$(grep -oiE 'resets? (at )?[0-9]{1,2}(:[0-9]{2})? ?(am|pm)' <<<"$t" | tail -1 | sed -E 's/^resets? (at )?//I')
  [[ -z $when ]] && return
  zone=$(grep -oE '\([A-Za-z_]+/[A-Za-z_]+\)' <<<"$t" | tail -1 | tr -d '()')
  target=$(TZ=${zone:-${TZ:-}} date -d "$when" +%s 2>/dev/null) || return
  (( target <= now )) && target=$(TZ=${zone:-${TZ:-}} date -d "tomorrow $when" +%s)
  echo $(( target - now + MARGIN ))
}

# --- one Claude session ----------------------------------------------------------------------
# print: headless `claude -p` (hidden from /resume). tmux (default): a normal interactive session
# inside tmux session $TMUX_SESSION: visible in /resume, watch it with `tmux attach -t neon`.
run_session_print() {
  local args=(-p "$(cat "$PROMPT_FILE")" --dangerously-skip-permissions)
  [[ -n $MODEL ]] && args+=(--model "$MODEL")
  nice -n "$NICE" timeout -k 30 "$RUN_TIMEOUT" "$CLAUDE_BIN" "${args[@]}" </dev/null >"$log" 2>&1
  code=$?
  tail_txt=$(tail -n 8 "$log")
}

run_session_tmux() {
  local sid transcript start now pane age
  sid=$(cat /proc/sys/kernel/random/uuid)
  transcript="$HOME/.claude/projects/$(pwd | sed 's#[^A-Za-z0-9]#-#g')/$sid.jsonl"
  start=$(date +%s); code=0
  tmux kill-session -t "$TMUX_SESSION" 2>/dev/null
  local cmd="nice -n $NICE $CLAUDE_BIN --dangerously-skip-permissions --session-id $sid ${MODEL:+--model $MODEL} 'Follow the instructions in docs/overnight/prompt.md exactly.'"
  tmux new-session -d -s "$TMUX_SESSION" -x 200 -y 50 -c "$PWD" -e "PATH=$PATH" "$cmd" || { code=1; tail_txt=; : >"$log"; return; }
  say "session $sid started (tmux attach -t $TMUX_SESSION, or /resume)"
  while tmux has-session -t "$TMUX_SESSION" 2>/dev/null; do
    sleep 15
    now=$(date +%s)
    if (( now - start > RUN_TIMEOUT )); then say "session timeout"; code=124; break; fi
    # Memory guard: below 1.5 GB available, kill stray headless browsers (the usual culprit), never Claude.
    if (( $(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo) < 1500 )); then
      say "low memory: killing headless browsers"; pkill chrome-headless 2>/dev/null
    fi
    pane=$(tmux capture-pane -p -J -t "$TMUX_SESSION" -S -60 2>/dev/null) || break
    grep -q 'esc to interrupt' <<<"$pane" && continue
    [[ -f $transcript ]] || { (( now - start > 300 )) && { say "no transcript after 5 min, giving up on session"; code=2; break; }; continue; }
    age=$(( now - $(stat -c %Y "$transcript") ))
    (( age >= QUIET && now - start >= 120 )) && break   # idle: finished a task, or stopped at a limit
  done
  tmux capture-pane -p -J -t "$TMUX_SESSION" -S -200 2>/dev/null >"$log"
  tail_txt=$(grep -v '^\s*$' "$log" | tail -n 30)
  if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    tmux send-keys -t "$TMUX_SESSION" Escape; sleep 1
    tmux send-keys -t "$TMUX_SESSION" "/exit" Enter
    for _ in 1 2 3 4 5 6 7 8; do sleep 2; tmux has-session -t "$TMUX_SESSION" 2>/dev/null || break; done
    tmux kill-session -t "$TMUX_SESSION" 2>/dev/null
  fi
}

# --- main loop -------------------------------------------------------------------------------
run=0 idle=0 unknown_waits=0
last_key=$(progress_key)
while true; do
  should_stop && break
  (( $(open_tasks) == 0 )) && { say "queue empty, done"; break; }
  (( run >= MAX_RUNS )) && { say "MAX_RUNS reached"; break; }
  run=$((run + 1))
  log="$LOG_DIR/run-$(date +%m%d-%H%M%S)-$run.log"
  say "run $run start ($(open_tasks) open) -> $log"

  if [[ $MODE == print ]]; then run_session_print; else run_session_tmux; fi
  say "run $run ended (exit=$code), $(wc -l <"$log") log lines"

  if grep -q 'OVERNIGHT-DONE' <<<"$tail_txt"; then
    say "agent reported OVERNIGHT-DONE"; break
  fi

  if ! grep -q 'OVERNIGHT-CONTINUE' <<<"$tail_txt" \
     && grep -qiE "limit reached|usage limit|hit your limit|limit will reset|resets [0-9]" <<<"$tail_txt"; then
    wait_s=$(limit_wait "$tail_txt")
    if [[ -z $wait_s ]] || (( wait_s < 1 || wait_s > MAX_WAIT )); then
      unknown_waits=$((unknown_waits + 1))
      wait_s=$(( PROBE + PROBE / 2 * (unknown_waits < 4 ? unknown_waits - 1 : 3) ))   # 20, 30, 40, 50 min
      say "usage limit, reset time unknown -> probing again in $((wait_s / 60)) min"
    else
      unknown_waits=0
      say "usage limit, sleeping $((wait_s / 60)) min (until $(date -d "+${wait_s} seconds" '+%F %T'))"
    fi
    nap "$wait_s" || break
    continue
  fi
  unknown_waits=0

  key=$(progress_key)
  if [[ $key == "$last_key" ]]; then
    idle=$((idle + 1)); say "no progress ($idle/$MAX_IDLE)"
    (( idle >= MAX_IDLE )) && { say "giving up: $MAX_IDLE runs without progress"; break; }
    # An unrecognised usage-limit message looks like "no progress": back off long (2 min, then 30 min) so we outlast it.
    nap $(( idle >= 2 ? 1800 : 120 )) || break
  else
    idle=0; last_key=$key
    nap 10 || break
  fi
done

say "finished: $run runs, $(open_tasks) open tasks left, branch $(git rev-parse --abbrev-ref HEAD)"
