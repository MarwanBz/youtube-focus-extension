import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const messageArgs = args.filter((arg) => arg !== "--dry-run");
const commitMessage = messageArgs.join(" ").trim();

if (!commitMessage && !dryRun) {
  fail(
    "Usage: npm run verify:commit -- \"<commit message>\" [--dry-run]"
  );
}

ensureGitOk(["rev-parse", "--is-inside-work-tree"], "Not inside a git repository.");

const statusOutput = runGit(["status", "--porcelain=v1"]).stdout.trimEnd();
const statusLines = statusOutput ? statusOutput.split("\n") : [];

if (statusLines.length === 0) {
  fail("No git changes detected. Stage the intended files before running verify:commit.");
}

const stagedLines = [];
const unstagedOrUntrackedLines = [];

for (const line of statusLines) {
  const indexStatus = line[0];
  const worktreeStatus = line[1];

  if (indexStatus !== " " && indexStatus !== "?") {
    stagedLines.push(line);
  }

  if (worktreeStatus !== " " || indexStatus === "?") {
    unstagedOrUntrackedLines.push(line);
  }
}

if (stagedLines.length === 0) {
  fail("No staged changes detected. Stage the intended files first.");
}

if (unstagedOrUntrackedLines.length > 0) {
  fail(
    `Refusing to continue with unstaged or untracked changes present:\n${unstagedOrUntrackedLines.join("\n")}`
  );
}

runStep("npm run build", ["npm", "run", "build"]);
runStep("npm run lint", ["npm", "run", "lint"]);
runStep("npm test", ["npm", "test"]);

const postCheck = runGit(["status", "--porcelain=v1"]).stdout.trimEnd();
if (postCheck !== statusOutput) {
  fail(
    "Worktree changed during verification. Restage and rerun verify:commit to avoid committing unexpected changes."
  );
}

if (dryRun) {
  process.stdout.write("Verification passed in dry-run mode. No commit created.\n");
  process.exit(0);
}

runStep("git commit", ["git", "commit", "--no-gpg-sign", "-m", commitMessage]);

function runStep(label, command) {
  const result = spawnSync(command[0], command.slice(1), {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    fail(`${label} failed with exit code ${result.status ?? 1}.`);
  }
}

function runGit(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    fail(result.stderr?.trim() || `git ${args.join(" ")} failed.`);
  }

  return result;
}

function ensureGitOk(args, message) {
  const result = spawnSync("git", args, {
    stdio: "ignore",
  });

  if (result.status !== 0) {
    fail(message);
  }
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
