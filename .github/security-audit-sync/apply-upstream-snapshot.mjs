#!/usr/bin/env node

import process from "node:process";
import { syncSingleSkillSnapshot } from "../upstream-sync/lib/snapshot.mjs";

try {
  syncSingleSkillSnapshot({
    sourceId: "security-audit",
    label: "Cloudflare",
    logLabel: "Cloudflare security-audit",
    upstreamSkillPath: "skills/security-audit",
    localSkillPath: "skills/security/security-audit",
  });
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 2;
}
