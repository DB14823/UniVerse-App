const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "SWIFT_STRICT_CONCURRENCY";

// This block is injected BEFORE the closing `end` of the post_install hook,
// so it runs AFTER react_native_post_install() and wins.
const PATCH_BLOCK = [
  "    # Suppress Swift 6 strict concurrency errors — runs after react_native_post_install",
  "    installer.pods_project.targets.each do |target|",
  "      target.build_configurations.each do |config|",
  "        config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
  "        config.build_settings['SWIFT_VERSION'] = '5.9'",
  "        # Also patch the xcconfig file directly so it wins over any pod source",
  "        xcconfig_ref = config.base_configuration_reference",
  "        if xcconfig_ref",
  "          xcconfig_path = xcconfig_ref.real_path.to_s",
  "          if File.exist?(xcconfig_path)",
  "            content = File.read(xcconfig_path)",
  "            new_content = content.gsub(/^SWIFT_VERSION = .*$/, 'SWIFT_VERSION = 5.9')",
  "            File.write(xcconfig_path, new_content) if new_content != content",
  "          end",
  "        end",
  "      end",
  "    end",
].join("\n");

// We search for the closing sequence of the react_native_post_install call
// followed by the end of the post_install block.
// In the generated Podfile this looks like:
//     )
//   end
// end
const HOOK_CLOSE = "    )\n  end\nend";
const PATCHED_CLOSE = `    )\n${PATCH_BLOCK}\n  end\nend`;

const withSwiftConcurrency = (config) => {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );
      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes(MARKER)) {
        console.log("[withSwiftConcurrency] Already patched, skipping.");
        return config;
      }

      if (!podfile.includes(HOOK_CLOSE)) {
        console.warn(
          "[withSwiftConcurrency] Could not find expected Podfile closing sequence — patch not applied.\n" +
            "Podfile tail:\n" +
            podfile.slice(-500),
        );
        return config;
      }

      podfile = podfile.replace(HOOK_CLOSE, PATCHED_CLOSE);

      fs.writeFileSync(podfilePath, podfile);
      console.log(
        "[withSwiftConcurrency] Patched Podfile successfully (injected after react_native_post_install).",
      );
      return config;
    },
  ]);
};

module.exports = withSwiftConcurrency;
