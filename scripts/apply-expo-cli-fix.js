const fs = require("node:fs");
const path = require("node:path");

const targetPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo",
  "node_modules",
  "@expo",
  "cli",
  "build",
  "src",
  "start",
  "startAsync.js",
);

const brokenBlock =
  "    if (!_env.env.EXPO_NO_DEPENDENCY_VALIDATION && !settings.webOnly && !options.devClient) {\n" +
  "        await (0, _profile.profile)(_validateDependenciesVersions.validateDependenciesVersionsAsync)(projectRoot, exp, pkg);\n" +
  "    }\n";

const fixedBlock =
  "    if (!_env.env.EXPO_NO_DEPENDENCY_VALIDATION && !settings.webOnly && !options.devClient) {\n" +
  "        try {\n" +
  "            await (0, _profile.profile)(_validateDependenciesVersions.validateDependenciesVersionsAsync)(projectRoot, exp, pkg);\n" +
  "        } catch (error) {\n" +
  "            const message = String(error == null ? void 0 : error.message || error);\n" +
  "            if (message.includes('Body is unusable: Body has already been read')) {\n" +
  "                _log.warn('Skipping Expo dependency validation due to a local CLI fetch bug. Metro will continue starting.');\n" +
  "            } else {\n" +
  "                throw error;\n" +
  "            }\n" +
  "        }\n" +
  "    }\n";

function main() {
  if (!fs.existsSync(targetPath)) {
    console.log("[expo-cli-fix] Target file not found, skipping.");
    return;
  }

  const current = fs.readFileSync(targetPath, "utf8");

  if (current.includes("Skipping Expo dependency validation due to a local CLI fetch bug.")) {
    console.log("[expo-cli-fix] Patch already applied.");
    return;
  }

  if (!current.includes(brokenBlock)) {
    console.log("[expo-cli-fix] Expected Expo CLI block not found, skipping.");
    return;
  }

  const updated = current.replace(brokenBlock, fixedBlock);
  fs.writeFileSync(targetPath, updated, "utf8");
  console.log("[expo-cli-fix] Patch applied.");
}

main();
