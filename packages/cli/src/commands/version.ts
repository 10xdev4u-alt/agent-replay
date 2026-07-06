/**
 * version — print the installed agent-replay version.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export async function version(_args: string[] = []): Promise<number> {
  // Walk up to the package root for package.json. tsup bundles src so the
  // file lives at dist/commands/version.js in prod — two levels up.
  for (const depth of ["..", "../..", "../../.."]) {
    try {
      const pkgPath = join(here, depth, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (typeof pkg.version === "string") {
        console.log(pkg.version);
        return 0;
      }
    } catch {
      // keep walking
    }
  }
  console.log("0.0.0-unknown");
  return 0;
}
