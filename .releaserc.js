module.exports = {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        parserOpts: {
          headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
          headerCorrespondence: ["type", "scope", "subject"],
          noteKeywords: ["BREAKING CHANGE", "BREAKING"],
          issuePrefixes: ["#"],
        },
        releaseRules: [
          // Breaking changes -> major
          { breaking: true, release: "major" },
          // All feat commits -> major (including feat!)
          { type: "feat", release: "major" },
          { type: "revert", release: "patch" },
          { type: "fix", release: "patch" },
          { type: "perf", release: "patch" },
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
      },
    ],
    [
      "@semantic-release/gitlab",
      {
        gitlabUrl: "https://lab.ssafy.com",
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["k8s/*.yaml", "package.json"],
        message:
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
  ],
};
