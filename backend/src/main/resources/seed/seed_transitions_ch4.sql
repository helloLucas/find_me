-- 용도: Chapter 4 전체 전이 삽입
-- 전제: seed_nodes_ch4.sql 실행 후 실행

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM chapters WHERE code = 'week04') THEN
        RAISE EXCEPTION 'chapter week04 does not exist. Run seed_nodes_ch4.sql first.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM story_nodes n
        JOIN chapters c ON c.id = n.chapter_id
        WHERE c.code = 'week04'
          AND n.code = 'CH4_CORE_BLOCKED'
    ) THEN
        RAISE EXCEPTION 'CH4_CORE_BLOCKED does not exist. Run seed_nodes_ch4.sql first.';
    END IF;
END $$;

DELETE FROM story_transitions t USING story_nodes from_node,
story_nodes to_node,
chapters c_from,
chapters c_to
WHERE
    t.from_node_id = from_node.id
    AND t.to_node_id = to_node.id
    AND from_node.chapter_id = c_from.id
    AND to_node.chapter_id = c_to.id
    AND (
        c_from.code = 'week04'
        OR c_to.code = 'week04'
    );


WITH transition_values AS (
    SELECT *
    FROM (VALUES

        (
            'CH4_CORE_BLOCKED',
            'CH4_GATE_TRACE_VIEWED',
            'command',
            'cat_gate_04_trace',
            'server_rule',
            $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/gate_04.trace",
  "requiredReadable": true
}$json$::jsonb,
            $json${
  "setFlags": {
    "chapter4_started": true,
    "laplace_pending_job_known": true,
    "universe_warning_seen": true,
    "gate_04_trace_viewed": true
  },
  "snapshotPatch": {
    "flags.chapter4_started": true,
    "flags.laplace_pending_job_known": true,
    "flags.universe_warning_seen": true,
    "flags.gate_04_trace_viewed": true,
    "terminal.promptUser": "guest",
    "terminal.promptHost": "lucas-server",
    "terminal.cwd": "/home/guest"
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_UNIVERSE_WARNING',
            'CH4_GATE_TRACE_VIEWED',
            'command',
            'cat_gate_04_trace',
            'server_rule',
            $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/gate_04.trace",
  "requiredReadable": true
}$json$::jsonb,
            $json${
  "setFlags": {
    "gate_04_trace_viewed": true
  },
  "snapshotPatch": {
    "flags.gate_04_trace_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_TERMINAL_RELOAD',
            'CH4_GATE_TRACE_VIEWED',
            'command',
            'cat_gate_04_trace',
            'server_rule',
            $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/gate_04.trace",
  "requiredReadable": true
}$json$::jsonb,
            $json${
  "setFlags": {
    "gate_04_trace_viewed": true
  },
  "snapshotPatch": {
    "flags.gate_04_trace_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_GATE_TRACE_VIEWED',
            'CH4_TARGET_SCAN',
            'command',
            'nmap_universe_core',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "nmap", "argsAnyOrder": ["10.2.2.2"] },
    { "command": "nmap", "argsAnyOrder": ["universe-core"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "universe_core_scanned": true,
    "ssh_port_found": true
  },
  "snapshotPatch": {
    "flags.universe_core_scanned": true,
    "flags.ssh_port_found": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_GATE_TRACE_VIEWED',
            'CH4_SSH_FINGERPRINTED',
            'command',
            'nmap_version_universe_core',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "nmap", "argsAnyOrder": ["-sV", "10.2.2.2"] },
    { "command": "nmap", "argsAnyOrder": ["-sV", "-p", "22", "10.2.2.2"] },
    { "command": "nmap", "argsAnyOrder": ["-sV", "universe-core"] },
    { "command": "nmap", "argsAnyOrder": ["-sV", "-p", "22", "universe-core"] },
    { "command": "nmap", "argsAnyOrder": ["-sV", "--version-all", "10.2.2.2"] },
    { "command": "nmap", "argsAnyOrder": ["-sV", "--version-all", "universe-core"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "universe_core_scanned": true,
    "ssh_port_found": true,
    "ssh_fingerprinted": true
  },
  "snapshotPatch": {
    "flags.universe_core_scanned": true,
    "flags.ssh_port_found": true,
    "flags.ssh_fingerprinted": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),
        (
            'CH4_TARGET_SCAN',
            'CH4_SSH_FINGERPRINTED',
            'command',
            'fingerprint_ssh',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "nmap", "argsAnyOrder": ["-sV", "10.2.2.2"] },
    { "command": "nmap", "argsAnyOrder": ["-sV", "-p", "22", "10.2.2.2"] },
    { "command": "nmap", "argsAnyOrder": ["-sV", "universe-core"] },
    { "command": "nmap", "argsAnyOrder": ["-sV", "-p", "22", "universe-core"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ssh_fingerprinted": true
  },
  "snapshotPatch": {
    "flags.ssh_fingerprinted": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_SSH_FINGERPRINTED',
            'CH4_SSHNUKE_EXECUTED',
            'command',
            'sshnuke_universe_core',
            'server_rule',
            $json${
  "rule": "REGEX_FALLBACK",
  "commandRegex": "^\\s*sshnuke(?=.*\\s(?:10\\.2\\.2\\.2|universe-core)(?:\\s|$))(?=.*\\s--?rootpw(?:=|\\s+)(?:\\\"[^\\\"]+\\\"|'[^']+'|\\S+)).*$"
}$json$::jsonb,
            $json${
  "setFlags": {
    "ssh_crc32_exploited": true,
    "root_password_reset": true
  },
  "snapshotPatch": {
    "flags.ssh_crc32_exploited": true,
    "flags.root_password_reset": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_SSHNUKE_EXECUTED',
            'CH4_SSH_PASSWORD_PROMPT',
            'command',
            'ssh_root_universe_core',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "ssh", "args": ["root@10.2.2.2"] },
    { "command": "ssh", "args": ["root@universe-core"] },
    { "command": "ssh", "args": ["-l", "root", "10.2.2.2"] },
    { "command": "ssh", "args": ["-l", "root", "universe-core"] }
  ]
}$json$::jsonb,
            $json${
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_SSH_PASSWORD_PROMPT',
            'CH4_ROOT_LOGIN',
            'command',
            'input_root_password',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "__CH4_SSH_PASSWORD_OK__", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "universe_core_root": true
  },
  "snapshotPatch": {
    "flags.universe_core_root": true,
    "terminal.promptUser": "root",
    "terminal.promptHost": "universe-core",
    "terminal.cwd": "/root"
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_SSH_PASSWORD_PROMPT',
            'CH4_SSH_PASSWORD_FAIL',
            'command',
            'input_root_password_fail',
            'server_rule',
            $json${
  "rule": "REGEX_FALLBACK",
  "commandRegex": "^.*$"
}$json$::jsonb,
            $json${
  "recentResult": "INVALID_COMMAND"
}$json$::jsonb,
            90
        ),
        (
            'CH4_SSH_PASSWORD_FAIL',
            'CH4_ROOT_LOGIN',
            'command',
            'input_root_password_retry',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "__CH4_SSH_PASSWORD_OK__", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "universe_core_root": true
  },
  "snapshotPatch": {
    "flags.universe_core_root": true,
    "terminal.promptUser": "root",
    "terminal.promptHost": "universe-core",
    "terminal.cwd": "/root"
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_SSH_PASSWORD_FAIL',
            'CH4_SSH_PASSWORD_FAIL',
            'command',
            'input_root_password_fail_retry',
            'server_rule',
            $json${
  "rule": "REGEX_FALLBACK",
  "commandRegex": "^.*$"
}$json$::jsonb,
            $json${
  "recentResult": "INVALID_COMMAND"
}$json$::jsonb,
            90
        ),
        (
            'CH4_ROOT_LOGIN',
            'CH4_LUCAS_SERVER_MOUNTED',
            'command',
            'mount_lucas_server_session',
            'server_rule',
            $json${
  "rule": "REGEX_FALLBACK",
  "commandRegex": "^mount\\s+(?:(?:-t\\s+\\S+|-o\\s+\\S+)\\s+)*(?:(?:guest@)?lucas-server:(?:/home/guest/?|~/?)\\s+/mnt/lucas-server/?|/mnt/lucas-server/?|-a)\\s*$"
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_server_mounted": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/mnt/lucas-server/laplace.qasm",
        "type": "file",
        "name": "laplace.qasm",
        "readable": true,
        "executable": false,
        "protected": true,
        "hidden": false,
        "contentKey": "CH4_LAPLACE_QASM_PENDING",
        "storyKey": "MOUNTED_LAPLACE_QASM"
      },
      {
        "path": "/mnt/lucas-server/core_group.dat.gpg",
        "type": "file",
        "name": "core_group.dat.gpg",
        "readable": false,
        "executable": false,
        "protected": true,
        "hidden": false,
        "contentKey": "CH3_CORE_GROUP_GPG",
        "storyKey": "MOUNTED_SAFE_ZONE_SOURCE"
      }
    ]
  },
  "snapshotPatch": {
    "flags.lucas_server_mounted": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            110
        ),
        (
            'CH4_ROOT_LOGIN',
            'CH4_UNIVERSE_CORE_HINT',
            'command',
            'inspect_root_identity',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "hostname", "argsAnyOrder": [] },
    { "command": "whoami", "argsAnyOrder": [] },
    { "command": "id", "argsAnyOrder": [] },
    { "command": "ps", "argsAnyOrder": [] },
    { "command": "ps", "argsAnyOrder": ["-ef"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "universe_core_identity_checked": true
  },
  "snapshotPatch": {
    "flags.universe_core_identity_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_ROOT_LOGIN',
            'CH4_PENDING_JOB_VIEWED',
            'command',
            'view_pending_job',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["status", "laplace-pending-04.service"] },
    { "command": "systemctl", "args": ["list-jobs"] },
    { "command": "cat", "argsAnyOrder": ["/var/spool/core/pending/LAPLACE_PENDING_04.job"] }
  ],
  "requiredFlags": ["lucas_server_mounted"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_pending_viewed": true
  },
  "snapshotPatch": {
    "flags.laplace_pending_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),
        (
            'CH4_ROOT_LOGIN',
            'CH4_INVESTIGATION_STARTED',
            'command',
            'list_root_workspace',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "ls", "argsAnyOrder": [] },
    { "command": "ls", "argsAnyOrder": ["-al"] },
    { "command": "ls", "argsAnyOrder": ["-la"] },
    { "command": "ls", "argsAnyOrder": ["-l"] },
    { "command": "ls", "argsAnyOrder": ["-a"] },
    { "command": "pwd", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "chapter4_investigation_started": true,
    "root_workspace_listed": true
  },
  "snapshotPatch": {
    "flags.chapter4_investigation_started": true,
    "flags.root_workspace_listed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            80
        ),
        (
            'CH4_UNIVERSE_CORE_HINT',
            'CH4_LUCAS_SERVER_MOUNTED',
            'command',
            'mount_lucas_server_session',
            'server_rule',
            $json${
  "rule": "REGEX_FALLBACK",
  "commandRegex": "^mount\\s+(?:(?:-t\\s+\\S+|-o\\s+\\S+)\\s+)*(?:(?:guest@)?lucas-server:(?:/home/guest/?|~/?)\\s+/mnt/lucas-server/?|/mnt/lucas-server/?|-a)\\s*$"
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_server_mounted": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/mnt/lucas-server/laplace.qasm",
        "type": "file",
        "name": "laplace.qasm",
        "readable": true,
        "executable": false,
        "protected": true,
        "hidden": false,
        "contentKey": "CH4_LAPLACE_QASM_PENDING",
        "storyKey": "MOUNTED_LAPLACE_QASM"
      },
      {
        "path": "/mnt/lucas-server/core_group.dat.gpg",
        "type": "file",
        "name": "core_group.dat.gpg",
        "readable": false,
        "executable": false,
        "protected": true,
        "hidden": false,
        "contentKey": "CH3_CORE_GROUP_GPG",
        "storyKey": "MOUNTED_SAFE_ZONE_SOURCE"
      }
    ]
  },
  "snapshotPatch": {
    "flags.lucas_server_mounted": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            110
        ),
        (
            'CH4_UNIVERSE_CORE_HINT',
            'CH4_PENDING_JOB_VIEWED',
            'command',
            'view_pending_job',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["status", "laplace-pending-04.service"] },
    { "command": "systemctl", "args": ["list-jobs"] },
    { "command": "cat", "argsAnyOrder": ["/var/spool/core/pending/LAPLACE_PENDING_04.job"] }
  ],
  "requiredFlags": ["lucas_server_mounted"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_pending_viewed": true
  },
  "snapshotPatch": {
    "flags.laplace_pending_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_UNIVERSE_CORE_HINT',
            'CH4_INVESTIGATION_STARTED',
            'command',
            'list_root_workspace',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "ls", "argsAnyOrder": [] },
    { "command": "ls", "argsAnyOrder": ["-al"] },
    { "command": "ls", "argsAnyOrder": ["-la"] },
    { "command": "ls", "argsAnyOrder": ["-l"] },
    { "command": "ls", "argsAnyOrder": ["-a"] },
    { "command": "pwd", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "chapter4_investigation_started": true,
    "root_workspace_listed": true
  },
  "snapshotPatch": {
    "flags.chapter4_investigation_started": true,
    "flags.root_workspace_listed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            80
        ),

        (
            'CH4_LUCAS_SERVER_MOUNTED',
            'CH4_LAPLACE_CONFIRM_1',
            'command',
            'execute_laplace_as_root',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "execute", "args": ["/mnt/lucas-server/laplace.qasm"] },
    { "command": "execute", "args": ["laplace.qasm"] },
    { "command": "execute", "args": ["./laplace.qasm"] },
    { "command": "systemctl", "args": ["start", "laplace-pending-04.service"] },
    { "command": "systemctl", "args": ["restart", "laplace-pending-04.service"] }
  ],
  "requiredFlags": ["lucas_server_mounted"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_resume_requested": true
  },
  "snapshotPatch": {
    "flags.laplace_resume_requested": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            110
        ),
        (
            'CH4_LUCAS_SERVER_MOUNTED',
            'CH4_PENDING_JOB_VIEWED',
            'command',
            'view_pending_job',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["status", "laplace-pending-04.service"] },
    { "command": "systemctl", "args": ["list-jobs"] },
    { "command": "cat", "argsAnyOrder": ["/var/spool/core/pending/LAPLACE_PENDING_04.job"] }
  ],
  "requiredFlags": ["lucas_server_mounted"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_pending_viewed": true
  },
  "snapshotPatch": {
    "flags.laplace_pending_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_LUCAS_SERVER_MOUNTED',
            'CH4_INVESTIGATION_STARTED',
            'command',
            'list_root_workspace',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "ls", "argsAnyOrder": [] },
    { "command": "ls", "argsAnyOrder": ["-al"] },
    { "command": "ls", "argsAnyOrder": ["-la"] },
    { "command": "ls", "argsAnyOrder": ["-l"] },
    { "command": "ls", "argsAnyOrder": ["-a"] },
    { "command": "pwd", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "chapter4_investigation_started": true,
    "root_workspace_listed": true
  },
  "snapshotPatch": {
    "flags.chapter4_investigation_started": true,
    "flags.root_workspace_listed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),

-- 루카스 지시 루트: mounted laplace.qasm root 실행
(
            'CH4_PENDING_JOB_VIEWED',
            'CH4_LAPLACE_CONFIRM_1',
            'command',
            'resume_laplace',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "execute", "args": ["/mnt/lucas-server/laplace.qasm"] },
    { "command": "execute", "args": ["laplace.qasm"] },
    { "command": "execute", "args": ["./laplace.qasm"] },
    { "command": "systemctl", "args": ["start", "laplace-pending-04.service"] },
    { "command": "systemctl", "args": ["restart", "laplace-pending-04.service"] }
  ],
  "requiredFlags": ["lucas_server_mounted"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_resume_requested": true
  },
  "snapshotPatch": {
    "flags.laplace_resume_requested": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_LAPLACE_CONFIRM_1',
            'CH4_LAPLACE_CONFIRM_2',
            'command',
            'confirm_yes',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "y", "argsAnyOrder": [] },
    { "command": "yes", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_confirm_1": true
  },
  "snapshotPatch": {
    "flags.laplace_confirm_1": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_LAPLACE_CONFIRM_2',
            'CH4_LAPLACE_CONFIRM_3',
            'command',
            'confirm_yes',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "y", "argsAnyOrder": [] },
    { "command": "yes", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_confirm_2": true
  },
  "snapshotPatch": {
    "flags.laplace_confirm_2": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),

-- 조사 루트 진입
(
            'CH4_PENDING_JOB_VIEWED',
            'CH4_INVESTIGATION_STARTED',
            'command',
            'list_root_workspace',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "ls", "argsAnyOrder": [] },
    { "command": "ls", "argsAnyOrder": ["-al"] },
    { "command": "ls", "argsAnyOrder": ["-la"] },
    { "command": "ls", "argsAnyOrder": ["-l"] },
    { "command": "ls", "argsAnyOrder": ["-a"] },
    { "command": "pwd", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "chapter4_investigation_started": true,
    "root_workspace_listed": true
  },
  "snapshotPatch": {
    "flags.chapter4_investigation_started": true,
    "flags.root_workspace_listed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            95
        ),
        (
            'CH4_LAPLACE_CONFIRM_1',
            'CH4_INVESTIGATION_STARTED',
            'command',
            'confirm_no_investigate',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "n", "argsAnyOrder": [] },
    { "command": "no", "argsAnyOrder": [] },
    { "command": "cancel", "argsAnyOrder": [] },
    { "command": "abort", "argsAnyOrder": [] },
    { "command": "ls", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_confirmation_interrupted": true,
    "chapter4_investigation_started": true
  },
  "snapshotPatch": {
    "flags.laplace_confirmation_interrupted": true,
    "flags.chapter4_investigation_started": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            80
        ),
        (
            'CH4_LAPLACE_CONFIRM_2',
            'CH4_INVESTIGATION_STARTED',
            'command',
            'confirm_no_investigate',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "n", "argsAnyOrder": [] },
    { "command": "no", "argsAnyOrder": [] },
    { "command": "cancel", "argsAnyOrder": [] },
    { "command": "abort", "argsAnyOrder": [] },
    { "command": "ls", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_final_confirmation_rejected": true,
    "chapter4_investigation_started": true
  },
  "snapshotPatch": {
    "flags.laplace_final_confirmation_rejected": true,
    "flags.chapter4_investigation_started": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            80
        ),
        (
            'CH4_INVESTIGATION_STARTED',
            'CH4_LUCAS_SERVER_MOUNTED',
            'command',
            'mount_lucas_server_session',
            'server_rule',
            $json${
  "rule": "REGEX_FALLBACK",
  "commandRegex": "^mount\\s+(?:(?:-t\\s+\\S+|-o\\s+\\S+)\\s+)*(?:(?:guest@)?lucas-server:(?:/home/guest/?|~/?)\\s+/mnt/lucas-server/?|/mnt/lucas-server/?|-a)\\s*$"
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_server_mounted": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/mnt/lucas-server/laplace.qasm",
        "type": "file",
        "name": "laplace.qasm",
        "readable": true,
        "executable": false,
        "protected": true,
        "hidden": false,
        "contentKey": "CH4_LAPLACE_QASM_PENDING",
        "storyKey": "MOUNTED_LAPLACE_QASM"
      },
      {
        "path": "/mnt/lucas-server/core_group.dat.gpg",
        "type": "file",
        "name": "core_group.dat.gpg",
        "readable": false,
        "executable": false,
        "protected": true,
        "hidden": false,
        "contentKey": "CH3_CORE_GROUP_GPG",
        "storyKey": "MOUNTED_SAFE_ZONE_SOURCE"
      }
    ]
  },
  "snapshotPatch": {
    "flags.lucas_server_mounted": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            110
        ),
        (
            'CH4_INVESTIGATION_STARTED',
            'CH4_PENDING_JOB_VIEWED',
            'command',
            'view_pending_job',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["status", "laplace-pending-04.service"] },
    { "command": "systemctl", "args": ["list-jobs"] },
    { "command": "cat", "argsAnyOrder": ["/var/spool/core/pending/LAPLACE_PENDING_04.job"] }
  ],
  "requiredFlags": ["lucas_server_mounted"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_pending_viewed": true
  },
  "snapshotPatch": {
    "flags.laplace_pending_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),

-- 조사 중 파일 확인
(
            'CH4_PENDING_JOB_VIEWED',
            'CH4_ORIGIN_TRACE_VIEWED',
            'command',
            'cat_origin_trace',
            'server_rule',
            $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/root/origin_trace.log",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
            $json${
  "setFlags": {
    "origin_trace_viewed": true
  },
  "snapshotPatch": {
    "flags.origin_trace_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),
        (
            'CH4_INVESTIGATION_STARTED',
            'CH4_ORIGIN_TRACE_VIEWED',
            'command',
            'cat_origin_trace',
            'server_rule',
            $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/root/origin_trace.log",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
            $json${
  "setFlags": {
    "origin_trace_viewed": true
  },
  "snapshotPatch": {
    "flags.origin_trace_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_PENDING_JOB_VIEWED',
            'CH4_PROCESS_LIST_VIEWED',
            'command',
            'inspect_ps',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "ps", "argsAnyOrder": [] },
    { "command": "ps", "argsAnyOrder": ["-ef"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "process_list_viewed": true
  },
  "snapshotPatch": {
    "flags.process_list_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),
        (
            'CH4_INVESTIGATION_STARTED',
            'CH4_PROCESS_LIST_VIEWED',
            'command',
            'inspect_ps',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "ps", "argsAnyOrder": [] },
    { "command": "ps", "argsAnyOrder": ["-ef"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "process_list_viewed": true
  },
  "snapshotPatch": {
    "flags.process_list_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_PENDING_JOB_VIEWED',
            'CH4_ROLLBACK_PROTOCOL_VIEWED',
            'command',
            'cat_rollback_protocol',
            'server_rule',
            $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/root/rollback_protocol.md",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
            $json${
  "setFlags": {
    "rollback_protocol_viewed": true
  },
  "snapshotPatch": {
    "flags.rollback_protocol_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),
        (
            'CH4_INVESTIGATION_STARTED',
            'CH4_ROLLBACK_PROTOCOL_VIEWED',
            'command',
            'cat_rollback_protocol',
            'server_rule',
            $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/root/rollback_protocol.md",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
            $json${
  "setFlags": {
    "rollback_protocol_viewed": true
  },
  "snapshotPatch": {
    "flags.rollback_protocol_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),

-- 미니게임 발견/완료
(
            'CH4_INVESTIGATION_STARTED',
            'CH4_MINIGAME_DISCOVERED',
            'command',
            'inspect_lucas_route',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "file", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "head", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "ls", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "ls", "argsAnyOrder": ["-al", "lucas_route.sh"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_discovered": true
  },
  "snapshotPatch": {
    "flags.lucas_route_discovered": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_PENDING_JOB_VIEWED',
            'CH4_MINIGAME_COMPLETED',
            'command',
            'run_lucas_route',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_PRESENT",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_completed": true,
    "lucas_authority_patch_created": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/root/.route_cache",
        "type": "directory",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": true,
        "virtual": true,
        "createdBy": "lucas_route"
      },
      {
        "path": "/root/.route_cache/lucas_authority_patch.bin",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_LUCAS_AUTHORITY_PATCH"
      },
      {
        "path": "/root/.route_cache/manifest.txt",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_ROUTE_CACHE_MANIFEST"
      }
    ]
  },
  "snapshotPatch": {
    "flags.lucas_route_completed": true,
    "flags.lucas_authority_patch_created": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),
        (
            'CH4_MINIGAME_DISCOVERED',
            'CH4_MINIGAME_COMPLETED',
            'command',
            'run_lucas_route',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_PRESENT",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_completed": true,
    "lucas_authority_patch_created": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/root/.route_cache",
        "type": "directory",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": true,
        "virtual": true,
        "createdBy": "lucas_route"
      },
      {
        "path": "/root/.route_cache/lucas_authority_patch.bin",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_LUCAS_AUTHORITY_PATCH"
      },
      {
        "path": "/root/.route_cache/manifest.txt",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_ROUTE_CACHE_MANIFEST"
      }
    ]
  },
  "snapshotPatch": {
    "flags.lucas_route_completed": true,
    "flags.lucas_authority_patch_created": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_INVESTIGATION_STARTED',
            'CH4_MINIGAME_COMPLETED',
            'command',
            'run_lucas_route',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_PRESENT",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_completed": true,
    "lucas_authority_patch_created": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/root/.route_cache",
        "type": "directory",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": true,
        "virtual": true,
        "createdBy": "lucas_route"
      },
      {
        "path": "/root/.route_cache/lucas_authority_patch.bin",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_LUCAS_AUTHORITY_PATCH"
      },
      {
        "path": "/root/.route_cache/manifest.txt",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_ROUTE_CACHE_MANIFEST"
      }
    ]
  },
  "snapshotPatch": {
    "flags.lucas_route_completed": true,
    "flags.lucas_authority_patch_created": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            95
        ),
        (
            'CH4_ORIGIN_TRACE_VIEWED',
            'CH4_MINIGAME_COMPLETED',
            'command',
            'run_lucas_route',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_PRESENT",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_completed": true,
    "lucas_authority_patch_created": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/root/.route_cache",
        "type": "directory",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": true,
        "virtual": true,
        "createdBy": "lucas_route"
      },
      {
        "path": "/root/.route_cache/lucas_authority_patch.bin",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_LUCAS_AUTHORITY_PATCH"
      },
      {
        "path": "/root/.route_cache/manifest.txt",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_ROUTE_CACHE_MANIFEST"
      }
    ]
  },
  "snapshotPatch": {
    "flags.lucas_route_completed": true,
    "flags.lucas_authority_patch_created": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            80
        ),
        (
            'CH4_PROCESS_LIST_VIEWED',
            'CH4_MINIGAME_COMPLETED',
            'command',
            'run_lucas_route',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_PRESENT",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_completed": true,
    "lucas_authority_patch_created": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/root/.route_cache",
        "type": "directory",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": true,
        "virtual": true,
        "createdBy": "lucas_route"
      },
      {
        "path": "/root/.route_cache/lucas_authority_patch.bin",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_LUCAS_AUTHORITY_PATCH"
      },
      {
        "path": "/root/.route_cache/manifest.txt",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_ROUTE_CACHE_MANIFEST"
      }
    ]
  },
  "snapshotPatch": {
    "flags.lucas_route_completed": true,
    "flags.lucas_authority_patch_created": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            80
        ),
        (
            'CH4_ROLLBACK_PROTOCOL_VIEWED',
            'CH4_MINIGAME_COMPLETED',
            'command',
            'run_lucas_route',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_PRESENT",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_completed": true,
    "lucas_authority_patch_created": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/root/.route_cache",
        "type": "directory",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": true,
        "virtual": true,
        "createdBy": "lucas_route"
      },
      {
        "path": "/root/.route_cache/lucas_authority_patch.bin",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_LUCAS_AUTHORITY_PATCH"
      },
      {
        "path": "/root/.route_cache/manifest.txt",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_ROUTE_CACHE_MANIFEST"
      }
    ]
  },
  "snapshotPatch": {
    "flags.lucas_route_completed": true,
    "flags.lucas_authority_patch_created": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            80
        ),
        (
            'CH4_PENDING_JOB_VIEWED',
            'CH4_MINIGAME_NOT_CLEARED',
            'command',
            'run_lucas_route_without_clear',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_INCOMPLETE",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_clear_required": true
  },
  "snapshotPatch": {
    "flags.lucas_route_clear_required": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            95
        ),
        (
            'CH4_MINIGAME_DISCOVERED',
            'CH4_MINIGAME_NOT_CLEARED',
            'command',
            'run_lucas_route_without_clear',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_INCOMPLETE",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_clear_required": true
  },
  "snapshotPatch": {
    "flags.lucas_route_clear_required": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            105
        ),
        (
            'CH4_INVESTIGATION_STARTED',
            'CH4_MINIGAME_NOT_CLEARED',
            'command',
            'run_lucas_route_without_clear',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_INCOMPLETE",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_clear_required": true
  },
  "snapshotPatch": {
    "flags.lucas_route_clear_required": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_ORIGIN_TRACE_VIEWED',
            'CH4_MINIGAME_NOT_CLEARED',
            'command',
            'run_lucas_route_without_clear',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_INCOMPLETE",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_clear_required": true
  },
  "snapshotPatch": {
    "flags.lucas_route_clear_required": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),
        (
            'CH4_PROCESS_LIST_VIEWED',
            'CH4_MINIGAME_NOT_CLEARED',
            'command',
            'run_lucas_route_without_clear',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_INCOMPLETE",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_clear_required": true
  },
  "snapshotPatch": {
    "flags.lucas_route_clear_required": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),
        (
            'CH4_ROLLBACK_PROTOCOL_VIEWED',
            'CH4_MINIGAME_NOT_CLEARED',
            'command',
            'run_lucas_route_without_clear',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_INCOMPLETE",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_clear_required": true
  },
  "snapshotPatch": {
    "flags.lucas_route_clear_required": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),
        (
            'CH4_MINIGAME_NOT_CLEARED',
            'CH4_MINIGAME_COMPLETED',
            'command',
            'run_lucas_route_after_clear',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_PRESENT",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_completed": true,
    "lucas_authority_patch_created": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/root/.route_cache",
        "type": "directory",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": true,
        "virtual": true,
        "createdBy": "lucas_route"
      },
      {
        "path": "/root/.route_cache/lucas_authority_patch.bin",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_LUCAS_AUTHORITY_PATCH"
      },
      {
        "path": "/root/.route_cache/manifest.txt",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "hidden": false,
        "virtual": true,
        "createdBy": "lucas_route",
        "contentKey": "CH4_ROUTE_CACHE_MANIFEST"
      }
    ]
  },
  "snapshotPatch": {
    "flags.lucas_route_completed": true,
    "flags.lucas_authority_patch_created": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            110
        ),
        (
            'CH4_MINIGAME_NOT_CLEARED',
            'CH4_MINIGAME_NOT_CLEARED',
            'command',
            'run_lucas_route_without_clear',
            'server_rule',
            $json${
  "rule": "USER_FRAGMENTS_INCOMPLETE",
  "acceptedForms": [
    { "command": "sh", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["lucas_route.sh"] },
    { "command": "sh", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "bash", "argsAnyOrder": ["/root/lucas_route.sh"] },
    { "command": "./lucas_route.sh", "argsAnyOrder": [] },
    { "command": "/root/lucas_route.sh", "argsAnyOrder": [] }
  ],
  "requiredFragmentGroups": [["4"]]
}$json$::jsonb,
            $json${
  "setFlags": {
    "lucas_route_clear_required": true
  },
  "snapshotPatch": {
    "flags.lucas_route_clear_required": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_MINIGAME_NOT_CLEARED',
            'CH4_LAPLACE_CONFIRM_1',
            'command',
            'resume_laplace',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "execute", "args": ["/mnt/lucas-server/laplace.qasm"] },
    { "command": "execute", "args": ["laplace.qasm"] },
    { "command": "execute", "args": ["./laplace.qasm"] },
    { "command": "systemctl", "args": ["start", "laplace-pending-04.service"] },
    { "command": "systemctl", "args": ["restart", "laplace-pending-04.service"] }
  ],
  "requiredFlags": ["lucas_server_mounted"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_resume_requested": true
  },
  "snapshotPatch": {
    "flags.laplace_resume_requested": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            70
        ),
        (
            'CH4_MINIGAME_NOT_CLEARED',
            'CH4_ROLLBACK_ENDING',
            'command',
            'execute_rollback',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["start", "global-rollback.service"] },
    { "command": "systemctl", "args": ["start", "rollback@global_connect.service"] },
    { "command": "systemctl", "args": ["isolate", "rollback.target"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_global_rollback": true,
    "chapter4_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.ending_global_rollback": true,
    "flags.chapter4_completed": true
  },
  "recentResult": "SUCCESS_ENDING_TRUE"
}$json$::jsonb,
            80
        ),

-- 모든 조사 노드에서 핵심 선택으로 복귀 가능
(
            'CH4_INVESTIGATION_STARTED',
            'CH4_LAPLACE_CONFIRM_1',
            'command',
            'resume_laplace',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "execute", "args": ["/mnt/lucas-server/laplace.qasm"] },
    { "command": "execute", "args": ["laplace.qasm"] },
    { "command": "execute", "args": ["./laplace.qasm"] },
    { "command": "systemctl", "args": ["start", "laplace-pending-04.service"] },
    { "command": "systemctl", "args": ["restart", "laplace-pending-04.service"] }
  ],
  "requiredFlags": ["lucas_server_mounted"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_resume_requested": true
  },
  "snapshotPatch": {
    "flags.laplace_resume_requested": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            70
        ),
        (
            'CH4_ORIGIN_TRACE_VIEWED',
            'CH4_LAPLACE_CONFIRM_1',
            'command',
            'resume_laplace',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "execute", "args": ["/mnt/lucas-server/laplace.qasm"] },
    { "command": "execute", "args": ["laplace.qasm"] },
    { "command": "execute", "args": ["./laplace.qasm"] },
    { "command": "systemctl", "args": ["start", "laplace-pending-04.service"] },
    { "command": "systemctl", "args": ["restart", "laplace-pending-04.service"] }
  ],
  "requiredFlags": ["lucas_server_mounted"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_resume_requested": true
  },
  "snapshotPatch": {
    "flags.laplace_resume_requested": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            70
        ),
        (
            'CH4_PROCESS_LIST_VIEWED',
            'CH4_LAPLACE_CONFIRM_1',
            'command',
            'resume_laplace',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "execute", "args": ["/mnt/lucas-server/laplace.qasm"] },
    { "command": "execute", "args": ["laplace.qasm"] },
    { "command": "execute", "args": ["./laplace.qasm"] },
    { "command": "systemctl", "args": ["start", "laplace-pending-04.service"] },
    { "command": "systemctl", "args": ["restart", "laplace-pending-04.service"] }
  ],
  "requiredFlags": ["lucas_server_mounted"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_resume_requested": true
  },
  "snapshotPatch": {
    "flags.laplace_resume_requested": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            70
        ),
        (
            'CH4_ROLLBACK_PROTOCOL_VIEWED',
            'CH4_LAPLACE_CONFIRM_1',
            'command',
            'resume_laplace',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "execute", "args": ["/mnt/lucas-server/laplace.qasm"] },
    { "command": "execute", "args": ["laplace.qasm"] },
    { "command": "execute", "args": ["./laplace.qasm"] },
    { "command": "systemctl", "args": ["start", "laplace-pending-04.service"] },
    { "command": "systemctl", "args": ["restart", "laplace-pending-04.service"] }
  ],
  "requiredFlags": ["lucas_server_mounted"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_resume_requested": true
  },
  "snapshotPatch": {
    "flags.laplace_resume_requested": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            70
        ),
        (
            'CH4_MINIGAME_COMPLETED',
            'CH4_LAPLACE_CONFIRM_1',
            'command',
            'resume_laplace',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "execute", "args": ["/mnt/lucas-server/laplace.qasm"] },
    { "command": "execute", "args": ["laplace.qasm"] },
    { "command": "execute", "args": ["./laplace.qasm"] },
    { "command": "systemctl", "args": ["start", "laplace-pending-04.service"] },
    { "command": "systemctl", "args": ["restart", "laplace-pending-04.service"] }
  ],
  "requiredFlags": ["lucas_server_mounted"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_resume_requested": true
  },
  "snapshotPatch": {
    "flags.laplace_resume_requested": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            70
        ),
        (
            'CH4_ORIGIN_TRACE_VIEWED',
            'CH4_ROLLBACK_PROTOCOL_VIEWED',
            'command',
            'cat_rollback_protocol',
            'server_rule',
            $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/root/rollback_protocol.md",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
            $json${
  "setFlags": {
    "rollback_protocol_viewed": true
  },
  "snapshotPatch": {
    "flags.rollback_protocol_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),
        (
            'CH4_PROCESS_LIST_VIEWED',
            'CH4_ROLLBACK_PROTOCOL_VIEWED',
            'command',
            'cat_rollback_protocol',
            'server_rule',
            $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/root/rollback_protocol.md",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
            $json${
  "setFlags": {
    "rollback_protocol_viewed": true
  },
  "snapshotPatch": {
    "flags.rollback_protocol_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            90
        ),

-- 진 엔딩: rollback
(
            'CH4_PENDING_JOB_VIEWED',
            'CH4_ROLLBACK_ENDING',
            'command',
            'execute_rollback',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["start", "global-rollback.service"] },
    { "command": "systemctl", "args": ["start", "rollback@global_connect.service"] },
    { "command": "systemctl", "args": ["isolate", "rollback.target"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_global_rollback": true,
    "chapter4_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.ending_global_rollback": true,
    "flags.chapter4_completed": true
  },
  "recentResult": "SUCCESS_ENDING_TRUE"
}$json$::jsonb,
            60
        ),
        (
            'CH4_ROLLBACK_PROTOCOL_VIEWED',
            'CH4_ROLLBACK_ENDING',
            'command',
            'execute_rollback',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["start", "global-rollback.service"] },
    { "command": "systemctl", "args": ["start", "rollback@global_connect.service"] },
    { "command": "systemctl", "args": ["isolate", "rollback.target"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_global_rollback": true,
    "chapter4_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.ending_global_rollback": true,
    "flags.chapter4_completed": true
  },
  "recentResult": "SUCCESS_ENDING_TRUE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_LAPLACE_CONFIRM_1',
            'CH4_ROLLBACK_ENDING',
            'command',
            'execute_rollback',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["start", "global-rollback.service"] },
    { "command": "systemctl", "args": ["start", "rollback@global_connect.service"] },
    { "command": "systemctl", "args": ["isolate", "rollback.target"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_global_rollback": true,
    "chapter4_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.ending_global_rollback": true,
    "flags.chapter4_completed": true
  },
  "recentResult": "SUCCESS_ENDING_TRUE"
}$json$::jsonb,
            90
        ),
        (
            'CH4_LAPLACE_CONFIRM_2',
            'CH4_ROLLBACK_ENDING',
            'command',
            'execute_rollback',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["start", "global-rollback.service"] },
    { "command": "systemctl", "args": ["start", "rollback@global_connect.service"] },
    { "command": "systemctl", "args": ["isolate", "rollback.target"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_global_rollback": true,
    "chapter4_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.ending_global_rollback": true,
    "flags.chapter4_completed": true
  },
  "recentResult": "SUCCESS_ENDING_TRUE"
}$json$::jsonb,
            90
        ),
        (
            'CH4_INVESTIGATION_STARTED',
            'CH4_ROLLBACK_ENDING',
            'command',
            'execute_rollback',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["start", "global-rollback.service"] },
    { "command": "systemctl", "args": ["start", "rollback@global_connect.service"] },
    { "command": "systemctl", "args": ["isolate", "rollback.target"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_global_rollback": true,
    "chapter4_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.ending_global_rollback": true,
    "flags.chapter4_completed": true
  },
  "recentResult": "SUCCESS_ENDING_TRUE"
}$json$::jsonb,
            80
        ),
        (
            'CH4_ORIGIN_TRACE_VIEWED',
            'CH4_ROLLBACK_ENDING',
            'command',
            'execute_rollback',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["start", "global-rollback.service"] },
    { "command": "systemctl", "args": ["start", "rollback@global_connect.service"] },
    { "command": "systemctl", "args": ["isolate", "rollback.target"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_global_rollback": true,
    "chapter4_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.ending_global_rollback": true,
    "flags.chapter4_completed": true
  },
  "recentResult": "SUCCESS_ENDING_TRUE"
}$json$::jsonb,
            80
        ),
        (
            'CH4_PROCESS_LIST_VIEWED',
            'CH4_ROLLBACK_ENDING',
            'command',
            'execute_rollback',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["start", "global-rollback.service"] },
    { "command": "systemctl", "args": ["start", "rollback@global_connect.service"] },
    { "command": "systemctl", "args": ["isolate", "rollback.target"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_global_rollback": true,
    "chapter4_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.ending_global_rollback": true,
    "flags.chapter4_completed": true
  },
  "recentResult": "SUCCESS_ENDING_TRUE"
}$json$::jsonb,
            80
        ),
        (
            'CH4_MINIGAME_COMPLETED',
            'CH4_ROLLBACK_ENDING',
            'command',
            'execute_rollback',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "systemctl", "args": ["start", "global-rollback.service"] },
    { "command": "systemctl", "args": ["start", "rollback@global_connect.service"] },
    { "command": "systemctl", "args": ["isolate", "rollback.target"] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_global_rollback": true,
    "chapter4_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.ending_global_rollback": true,
    "flags.chapter4_completed": true
  },
  "recentResult": "SUCCESS_ENDING_TRUE"
}$json$::jsonb,
            80
        ),

-- 히든 엔딩 3: 비밀 프로그램 실행
(
            'CH4_MINIGAME_COMPLETED',
            'CH4_REBOOT_ENDING',
            'command',
            'execute_authority_patch',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "/root/.route_cache/lucas_authority_patch.bin", "argsAnyOrder": [] },
    { "command": "./.route_cache/lucas_authority_patch.bin", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_absolute_reboot": true,
    "chapter4_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.ending_absolute_reboot": true,
    "flags.chapter4_completed": true
  },
  "recentResult": "SUCCESS_ENDING_HIDDEN_REBOOT"
}$json$::jsonb,
            100
        ),

        (
            'CH4_MINIGAME_COMPLETED',
            'CH4_CLEAN_ROLLBACK_ENDING',
            'command',
            'delete_authority_patch',
            'server_rule',
            $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "rm",
  "resolvedPath": "/root/.route_cache/lucas_authority_patch.bin",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "alternateCommands": ["shred", "unlink"]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_clean_rollback": true,
    "chapter4_completed": true,
    "lucas_authority_patch_created": false
  },
  "markCheckpoint": true,
  "vfsOverlay": {
    "removedPaths": [
      "/root/.route_cache/lucas_authority_patch.bin"
    ]
  },
  "snapshotPatch": {
    "flags.ending_clean_rollback": true,
    "flags.chapter4_completed": true,
    "flags.lucas_authority_patch_created": false
  },
  "recentResult": "SUCCESS_ENDING_CLEAN_ROLLBACK"
}$json$::jsonb,
            100
        ),

-- Bad Ending Final Confirm
(
            'CH4_LAPLACE_CONFIRM_3',
            'CH4_BAD_ENDING',
            'command',
            'confirm_yes',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "y", "argsAnyOrder": [] },
    { "command": "yes", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_bad_sandbox": true,
    "chapter4_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.ending_bad_sandbox": true,
    "flags.chapter4_completed": true
  },
  "recentResult": "SUCCESS_ENDING_BAD"
}$json$::jsonb,
            100
        ),

-- FAIL loops for Confirm 1
(
            'CH4_LAPLACE_CONFIRM_1',
            'CH4_LAPLACE_CONFIRM_FAIL_1',
            'command',
            '^.*$',
            'regex',
            $json${}$json$::jsonb,
            $json${
  "recentResult": "FAIL_INVALID_INPUT"
}$json$::jsonb,
            50
        ),
        (
            'CH4_LAPLACE_CONFIRM_FAIL_1',
            'CH4_LAPLACE_CONFIRM_2',
            'command',
            'confirm_yes',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "y", "argsAnyOrder": [] },
    { "command": "yes", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_confirm_1": true
  },
  "snapshotPatch": {
    "flags.laplace_confirm_1": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_LAPLACE_CONFIRM_FAIL_1',
            'CH4_LAPLACE_CONFIRM_FAIL_1',
            'command',
            '^.*$',
            'regex',
            $json${}$json$::jsonb,
            $json${
  "recentResult": "FAIL_INVALID_INPUT"
}$json$::jsonb,
            50
        ),

-- FAIL loops for Confirm 2
(
            'CH4_LAPLACE_CONFIRM_2',
            'CH4_LAPLACE_CONFIRM_FAIL_2',
            'command',
            '^.*$',
            'regex',
            $json${}$json$::jsonb,
            $json${
  "recentResult": "FAIL_INVALID_INPUT"
}$json$::jsonb,
            50
        ),
        (
            'CH4_LAPLACE_CONFIRM_FAIL_2',
            'CH4_LAPLACE_CONFIRM_3',
            'command',
            'confirm_yes',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "y", "argsAnyOrder": [] },
    { "command": "yes", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "laplace_confirm_2": true
  },
  "snapshotPatch": {
    "flags.laplace_confirm_2": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH4_LAPLACE_CONFIRM_FAIL_2',
            'CH4_LAPLACE_CONFIRM_FAIL_2',
            'command',
            '^.*$',
            'regex',
            $json${}$json$::jsonb,
            $json${
  "recentResult": "FAIL_INVALID_INPUT"
}$json$::jsonb,
            50
        ),

-- FAIL loops for Confirm 3
(
            'CH4_LAPLACE_CONFIRM_3',
            'CH4_LAPLACE_CONFIRM_FAIL_3',
            'command',
            '^.*$',
            'regex',
            $json${}$json$::jsonb,
            $json${
  "recentResult": "FAIL_INVALID_INPUT"
}$json$::jsonb,
            50
        ),
        (
            'CH4_LAPLACE_CONFIRM_FAIL_3',
            'CH4_BAD_ENDING',
            'command',
            'confirm_yes',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    { "command": "y", "argsAnyOrder": [] },
    { "command": "yes", "argsAnyOrder": [] }
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "ending_bad_sandbox": true,
    "chapter4_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.ending_bad_sandbox": true,
    "flags.chapter4_completed": true
  },
  "recentResult": "SUCCESS_ENDING_BAD"
}$json$::jsonb,
            100
        ),
        (
            'CH4_LAPLACE_CONFIRM_FAIL_3',
            'CH4_LAPLACE_CONFIRM_FAIL_3',
            'command',
            '^.*$',
            'regex',
            $json${}$json$::jsonb,
            $json${
  "recentResult": "FAIL_INVALID_INPUT"
}$json$::jsonb,
            50
        )
    ) AS v(from_code, to_code, action_type, expected_input, validator_type, validator_config, effect_bundle, priority)
)
INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    transition_values.action_type,
    btrim(transition_values.expected_input),
    transition_values.validator_type,
    transition_values.validator_config,
    transition_values.effect_bundle,
    transition_values.priority
FROM transition_values
JOIN story_nodes from_node ON from_node.code = transition_values.from_code
JOIN story_nodes to_node ON to_node.code = transition_values.to_code;

COMMIT;