import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fragmentApi } from '../../shared/api/fragmentApi';
import {
  BASE_PLAYER_STATS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ENEMY_BASE,
  EXP_ORB,
  FINAL_BOSS_TIMING,
  GAME_SECONDS,
  MAIN_BOSS_TIMING,
  MID_BOSS_TIMINGS,
  RARITY_COLOR,
  SKILL_LABELS,
  SYSTEM_TEXT,
  getEnemyMultipliers,
  getExpToNextLevel,
  getPhaseName,
  getSpawnRatePerSecond,
  pickCards,
} from './rules';
import type {
  Enemy,
  EnemyKind,
  GameStatus,
  Hazard,
  HudState,
  ItemDrop,
  ItemKind,
  Mine,
  Orb,
  Projectile,
  Rarity,
  RuntimeState,
  SkillId,
  UpgradeCard,
} from './types';

type UnitSpriteKey =
  | 'player'
  | 'enemy_noise'
  | 'enemy_runner'
  | 'enemy_worm'
  | 'enemy_drone'
  | 'enemy_golem'
  | 'boss_cache'
  | 'boss_process'
  | 'boss_firewall'
  | 'boss_reaper';

type SpriteStore = Record<string, HTMLImageElement[]>;

const UNIT_SPRITE_PATHS: Record<UnitSpriteKey, string[]> = {
  player: [
    '/minigames/lucas-survival/sprites/units/player_0.png',
    '/minigames/lucas-survival/sprites/units/player_1.png',
  ],
  enemy_noise: [
    '/minigames/lucas-survival/sprites/units/enemy_noise_0.png',
    '/minigames/lucas-survival/sprites/units/enemy_noise_1.png',
  ],
  enemy_runner: [
    '/minigames/lucas-survival/sprites/units/enemy_runner_0.png',
    '/minigames/lucas-survival/sprites/units/enemy_runner_1.png',
  ],
  enemy_worm: [
    '/minigames/lucas-survival/sprites/units/enemy_worm_0.png',
    '/minigames/lucas-survival/sprites/units/enemy_worm_1.png',
  ],
  enemy_drone: [
    '/minigames/lucas-survival/sprites/units/enemy_drone_0.png',
    '/minigames/lucas-survival/sprites/units/enemy_drone_1.png',
  ],
  enemy_golem: [
    '/minigames/lucas-survival/sprites/units/enemy_golem_0.png',
    '/minigames/lucas-survival/sprites/units/enemy_golem_1.png',
  ],
  boss_cache: [
    '/minigames/lucas-survival/sprites/units/boss_cache_0.png',
    '/minigames/lucas-survival/sprites/units/boss_cache_1.png',
  ],
  boss_process: [
    '/minigames/lucas-survival/sprites/units/boss_process_0.png',
    '/minigames/lucas-survival/sprites/units/boss_process_1.png',
  ],
  boss_firewall: [
    '/minigames/lucas-survival/sprites/units/boss_firewall_0.png',
    '/minigames/lucas-survival/sprites/units/boss_firewall_1.png',
  ],
  boss_reaper: [
    '/minigames/lucas-survival/sprites/units/boss_reaper_0.png',
    '/minigames/lucas-survival/sprites/units/boss_reaper_1.png',
  ],
};

const ITEM_SPRITE_PATHS: Record<ItemKind, string[]> = {
  small_heal: ['/minigames/lucas-survival/sprites/items/small_heal.png'],
  big_heal: ['/minigames/lucas-survival/sprites/items/big_heal.png'],
  magnet_core: ['/minigames/lucas-survival/sprites/items/magnet_core.png'],
  clock_booster: ['/minigames/lucas-survival/sprites/items/clock_booster.png'],
  shield_shard: ['/minigames/lucas-survival/sprites/items/shield_shard.png'],
  emp_bomb: ['/minigames/lucas-survival/sprites/items/emp_bomb.png'],
  overclock_chip: ['/minigames/lucas-survival/sprites/items/overclock_chip.png'],
  repair_nanites: ['/minigames/lucas-survival/sprites/items/repair_nanites.png'],
  data_vacuum: ['/minigames/lucas-survival/sprites/items/data_vacuum.png'],
  firewall_battery: ['/minigames/lucas-survival/sprites/items/firewall_battery.png'],
  critical_patch: ['/minigames/lucas-survival/sprites/items/critical_patch.png'],
  cooldown_cache: ['/minigames/lucas-survival/sprites/items/cooldown_cache.png'],
  revival_fragment: ['/minigames/lucas-survival/sprites/items/revival_fragment.png'],
  boss_key_fragment: ['/minigames/lucas-survival/sprites/items/boss_key_fragment.png'],
  xp_compressor: ['/minigames/lucas-survival/sprites/items/xp_compressor.png'],
  glitch_decoy: ['/minigames/lucas-survival/sprites/items/glitch_decoy.png'],
  damage_amplifier: ['/minigames/lucas-survival/sprites/items/damage_amplifier.png'],
  emergency_escape_protocol: ['/minigames/lucas-survival/sprites/items/emergency_escape_protocol.png'],
  upgrade_chest: ['/minigames/lucas-survival/sprites/items/upgrade_chest.png'],
  packet_battery: ['/minigames/lucas-survival/sprites/items/overclock_chip.png'],
  kernel_patch: ['/minigames/lucas-survival/sprites/items/firewall_battery.png'],
  hot_cache: ['/minigames/lucas-survival/sprites/items/cooldown_cache.png'],
  rollback_token: ['/minigames/lucas-survival/sprites/items/repair_nanites.png'],
  vacuum_plus_plus_core: ['/minigames/lucas-survival/sprites/items/data_vacuum.png'],
  failover_shield: ['/minigames/lucas-survival/sprites/items/shield_shard.png'],
  data_leech: ['/minigames/lucas-survival/sprites/items/critical_patch.png'],
  clock_freeze_chip: ['/minigames/lucas-survival/sprites/items/clock_booster.png'],
  overheat_module: ['/minigames/lucas-survival/sprites/items/damage_amplifier.png'],
  boss_trace_key: ['/minigames/lucas-survival/sprites/items/boss_key_fragment.png'],
};

const EFFECT_SPRITE_PATHS: Record<string, string[]> = {
  projectile_player: [
    '/minigames/lucas-survival/sprites/effects/projectile_player_0.png',
    '/minigames/lucas-survival/sprites/effects/projectile_player_1.png',
  ],
  projectile_enemy: [
    '/minigames/lucas-survival/sprites/effects/projectile_enemy_0.png',
    '/minigames/lucas-survival/sprites/effects/projectile_enemy_1.png',
  ],
  orb_small: ['/minigames/lucas-survival/sprites/effects/skill_signal_orb_0.png'],
  orb_medium: ['/minigames/lucas-survival/sprites/effects/skill_signal_orb_1.png'],
  orb_large: ['/minigames/lucas-survival/sprites/effects/skill_signal_orb_2.png'],
  mine: ['/minigames/lucas-survival/sprites/effects/skill_memory_mine_0.png'],
  turret: ['/minigames/lucas-survival/sprites/effects/skill_proxy_turret_0.png'],
  decoy: ['/minigames/lucas-survival/sprites/items/glitch_decoy.png'],
};

const ALL_SKILL_IDS: SkillId[] = [
  'debug_shot',
  'signal_orb',
  'firewall_ring',
  'packet_storm',
  'memory_mine',
  'lucas_beam',
  'trace_blade',
  'null_grenade',
  'proxy_turret',
  'data_lightning',
  'black_ice_field',
  'recursive_drone',
  'quantum_spike',
  'system_purge',
  'ghost_fork',
  'checksum_burst',
  'port_snare',
  'stack_overflow',
  'mirror_packet',
  'thread_splitter',
  'latency_field',
  'root_access',
];

const CARD_ART_PATHS: Record<UpgradeCard['cardType'], string> = {
  new_skill: '/minigames/lucas-survival/sprites/cards/card_new_skill.png',
  skill_upgrade: '/minigames/lucas-survival/sprites/cards/card_skill_upgrade.png',
  stat_upgrade: '/minigames/lucas-survival/sprites/cards/card_stat_upgrade.png',
  survival_upgrade: '/minigames/lucas-survival/sprites/cards/card_survival_upgrade.png',
  economy_upgrade: '/minigames/lucas-survival/sprites/cards/card_economy_upgrade.png',
  evolution: '/minigames/lucas-survival/sprites/cards/card_evolution.png',
};

const SYSTEM_CARD_ART_BY_TYPE: Partial<Record<UpgradeCard['cardType'], string>> = {
  stat_upgrade: '/minigames/lucas-survival/sprites/items/overclock_chip.png',
  survival_upgrade: '/minigames/lucas-survival/sprites/items/firewall_battery.png',
  economy_upgrade: '/minigames/lucas-survival/sprites/items/xp_compressor.png',
};

const CARD_ART_BY_CARD_ID: Record<string, string> = {
  'move-speed': '/minigames/lucas-survival/sprites/items/clock_booster.png',
  'damage-amp': '/minigames/lucas-survival/sprites/items/damage_amplifier.png',
  'cooldown-compress': '/minigames/lucas-survival/sprites/items/cooldown_cache.png',
  'crit-code': '/minigames/lucas-survival/sprites/items/critical_patch.png',
  'crit-dmg': '/minigames/lucas-survival/sprites/items/overclock_chip.png',
  'defense-patch': '/minigames/lucas-survival/sprites/items/firewall_battery.png',
  regen: '/minigames/lucas-survival/sprites/items/repair_nanites.png',
  'hp-expand': '/minigames/lucas-survival/sprites/items/big_heal.png',
  'pickup-range': '/minigames/lucas-survival/sprites/items/data_vacuum.png',
  'exp-rate': '/minigames/lucas-survival/sprites/items/xp_compressor.png',
};

const SKILL_ICON_PATHS: Record<SkillId, string> = {
  debug_shot: '/minigames/lucas-survival/sprites/icons/skill_debug_shot.png',
  signal_orb: '/minigames/lucas-survival/sprites/effects/skill_signal_orb_1.png',
  firewall_ring: '/minigames/lucas-survival/sprites/effects/skill_firewall_ring_1.png',
  packet_storm: '/minigames/lucas-survival/sprites/effects/skill_packet_storm_1.png',
  memory_mine: '/minigames/lucas-survival/sprites/effects/skill_memory_mine_1.png',
  lucas_beam: '/minigames/lucas-survival/sprites/effects/skill_lucas_beam_1.png',
  trace_blade: '/minigames/lucas-survival/sprites/effects/skill_trace_blade_1.png',
  null_grenade: '/minigames/lucas-survival/sprites/effects/skill_null_grenade_1.png',
  proxy_turret: '/minigames/lucas-survival/sprites/effects/skill_proxy_turret_1.png',
  data_lightning: '/minigames/lucas-survival/sprites/effects/skill_data_lightning_1.png',
  black_ice_field: '/minigames/lucas-survival/sprites/effects/skill_black_ice_field_1.png',
  recursive_drone: '/minigames/lucas-survival/sprites/effects/skill_recursive_drone_1.png',
  quantum_spike: '/minigames/lucas-survival/sprites/effects/skill_quantum_spike_1.png',
  system_purge: '/minigames/lucas-survival/sprites/effects/skill_system_purge_1.png',
  ghost_fork: '/minigames/lucas-survival/sprites/effects/skill_ghost_fork_1.png',
  checksum_burst: '/minigames/lucas-survival/sprites/effects/skill_checksum_burst_1.png',
  port_snare: '/minigames/lucas-survival/sprites/effects/skill_port_snare_1.png',
  stack_overflow: '/minigames/lucas-survival/sprites/effects/skill_stack_overflow_1.png',
  mirror_packet: '/minigames/lucas-survival/sprites/effects/skill_mirror_packet_1.png',
  thread_splitter: '/minigames/lucas-survival/sprites/effects/skill_thread_splitter_1.png',
  latency_field: '/minigames/lucas-survival/sprites/effects/skill_latency_field_1.png',
  root_access: '/minigames/lucas-survival/sprites/effects/skill_root_access_1.png',
};

const SKILL_RARITY: Record<SkillId, Rarity> = {
  debug_shot: 'common',
  signal_orb: 'rare',
  firewall_ring: 'rare',
  packet_storm: 'epic',
  memory_mine: 'epic',
  lucas_beam: 'legendary',
  trace_blade: 'rare',
  null_grenade: 'rare',
  proxy_turret: 'epic',
  data_lightning: 'epic',
  black_ice_field: 'epic',
  recursive_drone: 'rare',
  quantum_spike: 'epic',
  system_purge: 'legendary',
  ghost_fork: 'rare',
  checksum_burst: 'epic',
  port_snare: 'rare',
  stack_overflow: 'epic',
  mirror_packet: 'rare',
  thread_splitter: 'rare',
  latency_field: 'epic',
  root_access: 'legendary',
};

const SKILL_DESCRIPTIONS: Record<SkillId, string> = {
  debug_shot: '가장 가까운 적을 자동 조준해 탄환을 발사한다. 중첩 시 발사 수와 관통이 증가한다.',
  signal_orb: '플레이어 주변을 도는 구체가 접촉 피해를 준다. 중첩 시 구체 수와 반경이 커진다.',
  firewall_ring: '주기적으로 원형 충격파를 방출한다. 중첩 시 범위와 화상 압박이 강화된다.',
  packet_storm: '다방향으로 탄막을 뿌려 다수를 정리한다. 중첩 시 탄막 밀도가 높아진다.',
  memory_mine: '이동 경로에 지뢰를 자동 설치한다. 중첩 시 폭발 반경과 잔류 위험이 늘어난다.',
  lucas_beam: '고체력 적 우선 레이저. 중첩 시 동시 대상 수와 채널 지속시간이 늘어난다.',
  trace_blade: '근거리 전방위 연속 베기. 중첩 시 콤보 횟수와 넉백이 강화된다.',
  null_grenade: '적 밀집 지점에 수류탄을 투척해 폭발+둔화를 건다. 중첩 시 투척 수가 늘어난다.',
  proxy_turret: '자동 사격 터렛을 배치한다. 중첩 시 터렛 개수와 유지시간이 증가한다.',
  data_lightning: '근처 적 사이로 연쇄 번개를 튕긴다. 중첩 시 연쇄 수와 사거리가 늘어난다.',
  black_ice_field: '둔화+지속피해 장판을 생성한다. 중첩 시 범위와 둔화 강도가 강화된다.',
  recursive_drone: '동반 드론이 자동 사격한다. 중첩 시 드론 수와 화망이 강화된다.',
  quantum_spike: '적 위치에 스파이크를 솟구치게 한다. 중첩 시 파동 수와 타격 면적이 커진다.',
  system_purge: '재사용 대기시간이 긴 화면 정화기. 중첩 시 파동 위력과 보스 압박력이 증가한다.',
  ghost_fork: '플레이어 위치에 지연 발동 X자 검기를 생성한다. 포위 상황 돌파에 강하다.',
  checksum_burst: '주기적으로 주변 적 현재 체력 비율 기반 추가 피해를 준다. 탱커/보스 대응형.',
  port_snare: '포트 트랩을 설치해 속박 + 취약을 건다. 제어 빌드 핵심.',
  stack_overflow: '적중 누적 시 연쇄 폭발을 유발한다. 다단 히트와 시너지가 높다.',
  mirror_packet: '특수 탄막이 벽/적중 후 1회 반사된다.',
  thread_splitter: '투사체가 비행 중 2갈래로 분열하고 전방위 탄막으로 확장된다.',
  latency_field: '원형 감속장을 생성해 적 이동/공격 주기를 낮춘다.',
  root_access: '20초 재사용 대기시간의 클러치 궁극. 2초 무적 + 모든 스킬 즉시 재사용.',
};

const ITEM_DESCRIPTIONS: Record<ItemKind, string> = {
  small_heal: '헬스 패킷: 체력 25 즉시 회복.',
  big_heal: '대형 헬스 패킷: 체력 60 즉시 회복.',
  magnet_core: '마그넷 코어: 화면 내 경험치 구슬을 즉시 흡수.',
  clock_booster: '클럭 부스터: 8초간 이동/공격 속도 증가.',
  shield_shard: '실드 조각: 다음 피해 1회 무효화.',
  emp_bomb: 'EMP 폭탄: 일반 적 광역 고피해, 보스는 경감 피해.',
  overclock_chip: '오버클럭 칩: 10초간 공격 속도 증가.',
  repair_nanites: '리페어 나나이트: 12초간 체력 재생.',
  data_vacuum: '데이터 베큠: 15초간 경험치 흡수 반경 증가.',
  firewall_battery: '파이어월 배터리: 10초간 받는 피해 감소.',
  critical_patch: '치명타 패치: 10초간 치명타 성능 증가.',
  cooldown_cache: '재사용 대기시간 캐시: 모든 스킬 남은 재사용 대기시간 50% 단축.',
  revival_fragment: '리바이벌 조각: 자동 부활 1회 충전.',
  boss_key_fragment: '보스 키 조각: 다음 카드 보상의 최소 등급 상향.',
  xp_compressor: '경험치 컴프레서: 12초간 경험치 획득량 증가.',
  glitch_decoy: '글리치 디코이: 6초간 적을 끄는 분신 생성.',
  damage_amplifier: '피해 증폭기: 9초간 전체 피해 증가.',
  emergency_escape_protocol: '비상 탈출 프로토콜: 짧은 무적 + 이동 속도 증가.',
  upgrade_chest: '업그레이드 상자: 카드 3장 즉시 선택.',
  packet_battery: '패킷 배터리: 10초간 발사체 수 +1.',
  kernel_patch: '커널 패치: 받는 피해 12% 영구 감소.',
  hot_cache: '핫 캐시: 다음 레벨업 카드 최소 Rare 보장.',
  rollback_token: '롤백 토큰: 최근 받은 피해 일부 회복 + 상태이상 해제.',
  vacuum_plus_plus_core: 'Vacuum++ Core: 8초간 드랍 자동 흡수 반경 대폭 증가.',
  failover_shield: '페일오버 실드: 치명 피해 1회 무효.',
  data_leech: '데이터 리치: 적 처치 시 낮은 확률 체력 흡수.',
  clock_freeze_chip: '클럭 프리즈 칩: 3초간 적 전체 30% 감속.',
  overheat_module: '오버히트 모듈: 12초간 공격력 +25%, 종료 후 3초 공격 속도 저하.',
  boss_trace_key: '보스 트레이스 키: 보스 대상 피해 +18% (최대 2중첩).',
};

const ITEM_LABELS: Record<ItemKind, string> = {
  small_heal: '헬스 패킷',
  big_heal: '대형 헬스 패킷',
  magnet_core: '마그넷 코어',
  clock_booster: '클럭 부스터',
  shield_shard: '실드 조각',
  emp_bomb: 'EMP 폭탄',
  overclock_chip: '오버클럭 칩',
  repair_nanites: '리페어 나나이트',
  data_vacuum: '데이터 베큠',
  firewall_battery: '파이어월 배터리',
  critical_patch: '치명타 패치',
  cooldown_cache: '재사용 대기시간 캐시',
  revival_fragment: '리바이벌 조각',
  boss_key_fragment: '보스 키 조각',
  xp_compressor: '경험치 컴프레서',
  glitch_decoy: '글리치 디코이',
  damage_amplifier: '피해 증폭기',
  emergency_escape_protocol: '비상 탈출 프로토콜',
  upgrade_chest: '업그레이드 상자',
  packet_battery: '패킷 배터리',
  kernel_patch: '커널 패치',
  hot_cache: '핫 캐시',
  rollback_token: '롤백 토큰',
  vacuum_plus_plus_core: 'Vacuum++ 코어',
  failover_shield: '페일오버 실드',
  data_leech: '데이터 리치',
  clock_freeze_chip: '클럭 프리즈 칩',
  overheat_module: '오버히트 모듈',
  boss_trace_key: '보스 트레이스 키',
};

const ITEM_VISUAL: Record<ItemKind, { ring: string; fill: string; tag: string }> = {
  small_heal: { ring: 'rgba(255, 120, 156, 0.95)', fill: 'rgba(255, 120, 156, 0.18)', tag: 'HEAL' },
  big_heal: { ring: 'rgba(255, 156, 192, 0.95)', fill: 'rgba(255, 156, 192, 0.2)', tag: 'HEAL+' },
  magnet_core: { ring: 'rgba(92, 231, 255, 0.96)', fill: 'rgba(92, 231, 255, 0.18)', tag: 'MAGNET' },
  clock_booster: { ring: 'rgba(255, 208, 112, 0.95)', fill: 'rgba(255, 208, 112, 0.2)', tag: 'HASTE' },
  shield_shard: { ring: 'rgba(164, 141, 255, 0.96)', fill: 'rgba(164, 141, 255, 0.2)', tag: 'SHIELD' },
  emp_bomb: { ring: 'rgba(255, 141, 118, 0.95)', fill: 'rgba(255, 141, 118, 0.2)', tag: 'EMP' },
  overclock_chip: { ring: 'rgba(255, 172, 97, 0.95)', fill: 'rgba(255, 172, 97, 0.2)', tag: 'OC' },
  repair_nanites: { ring: 'rgba(144, 255, 190, 0.95)', fill: 'rgba(144, 255, 190, 0.18)', tag: 'REPAIR' },
  data_vacuum: { ring: 'rgba(132, 255, 235, 0.95)', fill: 'rgba(132, 255, 235, 0.2)', tag: 'VAC' },
  firewall_battery: { ring: 'rgba(255, 150, 96, 0.95)', fill: 'rgba(255, 150, 96, 0.2)', tag: 'GUARD' },
  critical_patch: { ring: 'rgba(255, 128, 202, 0.95)', fill: 'rgba(255, 128, 202, 0.22)', tag: 'CRIT' },
  cooldown_cache: { ring: 'rgba(136, 203, 255, 0.95)', fill: 'rgba(136, 203, 255, 0.18)', tag: 'CDR' },
  revival_fragment: { ring: 'rgba(255, 242, 176, 0.95)', fill: 'rgba(255, 242, 176, 0.22)', tag: 'REVIVE' },
  boss_key_fragment: { ring: 'rgba(255, 216, 128, 0.95)', fill: 'rgba(255, 216, 128, 0.2)', tag: 'KEY' },
  xp_compressor: { ring: 'rgba(120, 231, 255, 0.96)', fill: 'rgba(120, 231, 255, 0.2)', tag: 'XP' },
  glitch_decoy: { ring: 'rgba(146, 255, 255, 0.98)', fill: 'rgba(146, 255, 255, 0.22)', tag: 'DECOY' },
  damage_amplifier: { ring: 'rgba(255, 112, 112, 0.96)', fill: 'rgba(255, 112, 112, 0.22)', tag: 'DMG' },
  emergency_escape_protocol: { ring: 'rgba(255, 161, 120, 0.96)', fill: 'rgba(255, 161, 120, 0.22)', tag: 'ESC' },
  upgrade_chest: { ring: 'rgba(255, 213, 124, 0.95)', fill: 'rgba(255, 213, 124, 0.2)', tag: 'CHEST' },
  packet_battery: { ring: 'rgba(255, 188, 103, 0.95)', fill: 'rgba(255, 188, 103, 0.2)', tag: 'AMMO+' },
  kernel_patch: { ring: 'rgba(124, 203, 255, 0.95)', fill: 'rgba(124, 203, 255, 0.2)', tag: 'KPATCH' },
  hot_cache: { ring: 'rgba(255, 218, 131, 0.95)', fill: 'rgba(255, 218, 131, 0.2)', tag: 'RARE' },
  rollback_token: { ring: 'rgba(130, 255, 187, 0.95)', fill: 'rgba(130, 255, 187, 0.2)', tag: 'ROLL' },
  vacuum_plus_plus_core: { ring: 'rgba(132, 255, 235, 0.95)', fill: 'rgba(132, 255, 235, 0.2)', tag: 'VAC++' },
  failover_shield: { ring: 'rgba(186, 162, 255, 0.95)', fill: 'rgba(186, 162, 255, 0.2)', tag: 'SAFE' },
  data_leech: { ring: 'rgba(255, 120, 168, 0.95)', fill: 'rgba(255, 120, 168, 0.2)', tag: 'LEECH' },
  clock_freeze_chip: { ring: 'rgba(149, 232, 255, 0.95)', fill: 'rgba(149, 232, 255, 0.2)', tag: 'FREEZE' },
  overheat_module: { ring: 'rgba(255, 123, 100, 0.95)', fill: 'rgba(255, 123, 100, 0.2)', tag: 'HEAT' },
  boss_trace_key: { ring: 'rgba(255, 204, 132, 0.95)', fill: 'rgba(255, 204, 132, 0.2)', tag: 'BOSS+' },
};

const ORB_GUIDE = [
  { id: 'exp_small', name: '경험치 조각(소)', value: '경험치 +3', image: '/minigames/lucas-survival/sprites/effects/skill_signal_orb_0.png' },
  { id: 'exp_medium', name: '경험치 조각(중)', value: '경험치 +8', image: '/minigames/lucas-survival/sprites/effects/skill_signal_orb_1.png' },
  { id: 'exp_large', name: '경험치 조각(대)', value: '경험치 +20', image: '/minigames/lucas-survival/sprites/effects/skill_signal_orb_2.png' },
];

const SKILL_FX_SCALE: Partial<Record<SkillId, number>> = {
  debug_shot: 1.2,
  signal_orb: 1.25,
  firewall_ring: 1.6,
  packet_storm: 1.55,
  memory_mine: 1.45,
  lucas_beam: 1.75,
  trace_blade: 1.7,
  null_grenade: 1.6,
  proxy_turret: 1.45,
  data_lightning: 1.7,
  black_ice_field: 1.7,
  recursive_drone: 1.45,
  quantum_spike: 1.8,
  system_purge: 2.1,
  ghost_fork: 1.7,
  checksum_burst: 1.8,
  port_snare: 1.6,
  stack_overflow: 1.75,
  mirror_packet: 1.7,
  thread_splitter: 1.7,
  latency_field: 1.85,
  root_access: 2.2,
};

const SKILL_FX_COLOR: Partial<Record<SkillId, string>> = {
  debug_shot: '#5be7ff',
  signal_orb: '#8bf3ff',
  firewall_ring: '#60daff',
  packet_storm: '#7ea8ff',
  memory_mine: '#ffb56f',
  lucas_beam: '#8dfff1',
  trace_blade: '#9be6ff',
  null_grenade: '#ff9ac6',
  proxy_turret: '#8dff9a',
  data_lightning: '#a4b7ff',
  black_ice_field: '#8ce8ff',
  recursive_drone: '#ffb36b',
  quantum_spike: '#c8a4ff',
  system_purge: '#d8fdff',
  ghost_fork: '#9ddfff',
  checksum_burst: '#ffd995',
  port_snare: '#8fd0ff',
  stack_overflow: '#ffa9b5',
  mirror_packet: '#a0baff',
  thread_splitter: '#90ecff',
  latency_field: '#93e6ff',
  root_access: '#ffe4a8',
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

const formatTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const d = String(s % 60).padStart(2, '0');
  return `${m}:${d}`;
};

const SKILL_HIT_PROFILE: Record<SkillId, {
  knockback: number;
  stunSec: number;
  slowSec: number;
  vulnerableSec: number;
}> = {
  debug_shot: { knockback: 104, stunSec: 0.02, slowSec: 0, vulnerableSec: 0 },
  signal_orb: { knockback: 34, stunSec: 0, slowSec: 0.1, vulnerableSec: 0 },
  firewall_ring: { knockback: 210, stunSec: 0.1, slowSec: 0, vulnerableSec: 0 },
  packet_storm: { knockback: 40, stunSec: 0, slowSec: 0, vulnerableSec: 0 },
  memory_mine: { knockback: 245, stunSec: 0.16, slowSec: 0, vulnerableSec: 0.08 },
  lucas_beam: { knockback: 0, stunSec: 0, slowSec: 0, vulnerableSec: 2.2 },
  trace_blade: { knockback: 170, stunSec: 0.08, slowSec: 0, vulnerableSec: 0.2 },
  null_grenade: { knockback: 120, stunSec: 0.05, slowSec: 0.35, vulnerableSec: 0 },
  proxy_turret: { knockback: 92, stunSec: 0.03, slowSec: 0, vulnerableSec: 0 },
  data_lightning: { knockback: 74, stunSec: 0.12, slowSec: 0.18, vulnerableSec: 0 },
  black_ice_field: { knockback: 0, stunSec: 0, slowSec: 0.35, vulnerableSec: 0 },
  recursive_drone: { knockback: 56, stunSec: 0.02, slowSec: 0, vulnerableSec: 0.22 },
  quantum_spike: { knockback: 188, stunSec: 0.14, slowSec: 0, vulnerableSec: 0.1 },
  system_purge: { knockback: 300, stunSec: 0.2, slowSec: 0, vulnerableSec: 0.3 },
  ghost_fork: { knockback: 195, stunSec: 0.12, slowSec: 0, vulnerableSec: 0.2 },
  checksum_burst: { knockback: 120, stunSec: 0.05, slowSec: 0.1, vulnerableSec: 0.12 },
  port_snare: { knockback: 40, stunSec: 0.25, slowSec: 0.4, vulnerableSec: 0.4 },
  stack_overflow: { knockback: 210, stunSec: 0.12, slowSec: 0.1, vulnerableSec: 0.12 },
  mirror_packet: { knockback: 64, stunSec: 0.03, slowSec: 0, vulnerableSec: 0 },
  thread_splitter: { knockback: 80, stunSec: 0.03, slowSec: 0, vulnerableSec: 0.05 },
  latency_field: { knockback: 0, stunSec: 0, slowSec: 0.45, vulnerableSec: 0 },
  root_access: { knockback: 260, stunSec: 0.18, slowSec: 0.15, vulnerableSec: 0.25 },
};

const hashKey = (key: string) => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const drawPixelGlyph = (
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  pixel: number,
  colorA: string,
  colorB: string,
  glow = false,
) => {
  const seed = hashKey(key);
  const size = 8;
  const half = (size * pixel) / 2;
  const sx = Math.floor(x - half);
  const sy = Math.floor(y - half);

  if (glow) {
    ctx.fillStyle = colorA + '22';
    ctx.fillRect(sx - pixel * 2, sy - pixel * 2, size * pixel + pixel * 4, size * pixel + pixel * 4);
  }

  for (let gy = 0; gy < size; gy += 1) {
    for (let gx = 0; gx < size; gx += 1) {
      const border = gx === 0 || gy === 0 || gx === size - 1 || gy === size - 1;
      const bitIdx = (gx + gy * size) % 31;
      const bit = ((seed >> bitIdx) & 1) === 1;
      const center = (gx >= 3 && gx <= 4) && (gy >= 3 && gy <= 4);
      const on = border || center || bit;
      if (!on) continue;
      ctx.fillStyle = border ? colorB : colorA;
      ctx.fillRect(sx + gx * pixel, sy + gy * pixel, pixel, pixel);
    }
  }
};

const drawPixelBar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  ratio: number,
  bg: string,
  fg: string,
) => {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, width, height);
  const filled = Math.max(0, Math.min(width, Math.floor(width * ratio)));
  ctx.fillStyle = fg;
  ctx.fillRect(x, y, filled, height);
};

type SpriteDef = {
  matrix: string[];
  palette: Record<string, string>;
  pixel: number;
  glow?: string;
};

const SPRITES: Record<string, SpriteDef> = {
  player: {
    pixel: 2,
    glow: 'rgba(76, 218, 255, 0.24)',
    matrix: [
      '....oooo....',
      '...oaaaao...',
      '..oaabbbao..',
      '..abcccccba.',
      '.abccddcccba',
      '.abccddcccba',
      '.abccddcccba',
      '.abceeecccba',
      '..abceeecba.',
      '..oaabbbbao.',
      '...oaffao...',
      '....oooo....',
    ],
    palette: {
      o: '#d5fbff',
      a: '#69d8ff',
      b: '#4f8fff',
      c: '#2f62c8',
      d: '#183772',
      e: '#85b5ff',
      f: '#7df7ff',
    },
  },
  projectilePlayer: {
    pixel: 2,
    glow: 'rgba(70, 226, 255, 0.2)',
    matrix: ['..oo..', '.oab..', 'oabbo.', '.oab..', '..oo..'],
    palette: { o: '#dbfcff', a: '#24dbff', b: '#62f2ff' },
  },
  projectileEnemy: {
    pixel: 2,
    glow: 'rgba(255, 90, 110, 0.2)',
    matrix: ['..oo..', '.oab..', 'oabbo.', '.oab..', '..oo..'],
    palette: { o: '#ffe2e8', a: '#ff4b71', b: '#ff8ea4' },
  },
  enemySlime: {
    pixel: 2,
    glow: 'rgba(255, 111, 170, 0.18)',
    matrix: [
      '....oooo....',
      '...oaaaao...',
      '..oaabbaaao.',
      '.oabccccbbao',
      '.abccccccbao',
      '.abccddccbao',
      '.abccddccbao',
      '.abccccccbao',
      '..abceecbao.',
      '..oaabbaa..',
      '...oo..oo...',
      '..oo....oo..',
    ],
    palette: { o: '#ffdbe7', a: '#ff9abe', b: '#ff6f9c', c: '#e25586', d: '#8a345a', e: '#fff0f5' },
  },
  enemyRunner: {
    pixel: 2,
    glow: 'rgba(255, 176, 96, 0.2)',
    matrix: [
      '.....oo.....',
      '....oabo....',
      '...oabbbo...',
      '..oaccccao..',
      '.oacdddccao.',
      '.oacdddccao.',
      '..oaccccao..',
      '..oad..dao..',
      '.ooa....aoo.',
      '.o........o.',
      'oo........oo',
      '............',
    ],
    palette: { o: '#ffe0bf', a: '#ffb56c', b: '#ffd39f', c: '#ff9851', d: '#7a3c20' },
  },
  enemyWorm: {
    pixel: 2,
    glow: 'rgba(120, 248, 180, 0.18)',
    matrix: [
      '............',
      '...oooo.....',
      '..oaaboo....',
      '.oabccbao...',
      'oabccccbao..',
      '.oabccccbao.',
      '..oabccccbao',
      '...oabcccbao',
      '....oabccbao',
      '.....oabbao.',
      '......oooo..',
      '............',
    ],
    palette: { o: '#dbffeb', a: '#74ef9f', b: '#b9ffd2', c: '#50d78a' },
  },
  enemyDrone: {
    pixel: 2,
    glow: 'rgba(104, 229, 255, 0.2)',
    matrix: [
      '....oooo....',
      '...oaaboo...',
      '..oacddcao..',
      '.oaceffecao.',
      'oacfggggfcao',
      'oacfggggfcao',
      '.oaceffecao.',
      '..oacddcao..',
      '...oaaboo...',
      '....oooo....',
      '....o..o....',
      '............',
    ],
    palette: { o: '#e3fbff', a: '#7de8ff', b: '#c6f9ff', c: '#2f9fbc', d: '#22566f', e: '#6bc5dd', f: '#1d3e57', g: '#ffffff' },
  },
  enemyGolem: {
    pixel: 2,
    glow: 'rgba(164, 130, 255, 0.22)',
    matrix: [
      '...oooooo...',
      '..oaabbbao..',
      '.oacdddccao.',
      '.acdeeeedca.',
      'acdefffedcca',
      'acdefffedcca',
      'acdefffedcca',
      '.acdeeeedca.',
      '.oacdddccao.',
      '..oaaggbao..',
      '..ooa..aoo..',
      '.oo......oo.',
    ],
    palette: { o: '#efe6ff', a: '#b79fff', b: '#d7cbff', c: '#7256ce', d: '#473383', e: '#3a295f', f: '#9d86ff', g: '#ffffff' },
  },
  bossCache: {
    pixel: 3,
    glow: 'rgba(255, 72, 158, 0.26)',
    matrix: [
      '..oooooooo..',
      '.oaabbbbbao.',
      'oacddddddcao',
      'acdeeeeeedca',
      'acdeffffedca',
      'acdefggfedca',
      'acdefggfedca',
      'acdeffffedca',
      'acdeeeeeedca',
      'oacddddddcao',
      '.oaabbbbbao.',
      '..oooooooo..',
    ],
    palette: { o: '#ffe0ec', a: '#ff8cc0', b: '#ff4ea1', c: '#b83e79', d: '#812651', e: '#ffb8da', f: '#ffd6ea', g: '#ffffff' },
  },
  bossProcess: {
    pixel: 3,
    glow: 'rgba(255, 126, 90, 0.26)',
    matrix: [
      '..oooooooo..',
      '.oaabbbbbao.',
      'oacddddddcao',
      'acdeeeeeedca',
      'acdeffffedca',
      'acdefggfedca',
      'acdefhhfedca',
      'acdeffffedca',
      'acdeeeeeedca',
      'oacddddddcao',
      '.oaabbbbbao.',
      '..oooooooo..',
    ],
    palette: { o: '#ffe8dc', a: '#ffb799', b: '#ff7958', c: '#b95f42', d: '#813423', e: '#ffd7c5', f: '#fff0e9', g: '#ff9f75', h: '#ffffff' },
  },
  bossFirewall: {
    pixel: 3,
    glow: 'rgba(80, 222, 255, 0.26)',
    matrix: [
      '..oooooooo..',
      '.oaabbbbbao.',
      'oacddddddcao',
      'acdeffffedca',
      'acdfggggfdca',
      'acdfghhgfdca',
      'acdfghhgfdca',
      'acdfggggfdca',
      'acdeffffedca',
      'oacddddddcao',
      '.oaabbbbbao.',
      '..oooooooo..',
    ],
    palette: { o: '#def8ff', a: '#91efff', b: '#45daff', c: '#2f97bb', d: '#15557a', e: '#74d7f0', f: '#b5f6ff', g: '#1f6f99', h: '#ffffff' },
  },
  bossReaper: {
    pixel: 3,
    glow: 'rgba(255, 86, 96, 0.28)',
    matrix: [
      '..oooooooo..',
      '.oaabbbbbao.',
      'oacddddddcao',
      'acdeffffedca',
      'acdfggggfdca',
      'acdfghhgfdca',
      'acdfgii gfdca',
      'acdfggggfdca',
      'acdeffffedca',
      'oacddddddcao',
      '.oaabbbbbao.',
      '..oooooooo..',
    ].map((r) => r.replace(' ', '')),
    palette: { o: '#ffe0e3', a: '#ff9191', b: '#ff4d4d', c: '#c43e3e', d: '#7a2020', e: '#ffb6b6', f: '#ffdada', g: '#a12f2f', h: '#ffffff', i: '#ff6a7a' },
  },
};

const drawSprite = (ctx: CanvasRenderingContext2D, sprite: SpriteDef, x: number, y: number) => {
  const h = sprite.matrix.length;
  const w = sprite.matrix[0]?.length ?? 0;
  const px = sprite.pixel;
  const sx = Math.floor(x - (w * px) / 2);
  const sy = Math.floor(y - (h * px) / 2);

  if (sprite.glow) {
    ctx.fillStyle = sprite.glow;
    ctx.fillRect(sx - px * 2, sy - px * 2, w * px + px * 4, h * px + px * 4);
  }

  for (let gy = 0; gy < h; gy += 1) {
    const row = sprite.matrix[gy];
    for (let gx = 0; gx < w; gx += 1) {
      const c = row[gx];
      if (c === '.' || !sprite.palette[c]) continue;
      ctx.fillStyle = sprite.palette[c];
      ctx.fillRect(sx + gx * px, sy + gy * px, px, px);
    }
  }
};

const pickEnemySprite = (kind: EnemyKind): SpriteDef => {
  if (kind === 'noise_slime') return SPRITES.enemySlime;
  if (kind === 'glitch_runner') return SPRITES.enemyRunner;
  if (kind === 'log_worm') return SPRITES.enemyWorm;
  if (kind === 'error_drone') return SPRITES.enemyDrone;
  if (kind === 'memory_golem') return SPRITES.enemyGolem;
  if (kind === 'corrupted_cache') return SPRITES.bossCache;
  if (kind === 'broken_process') return SPRITES.bossProcess;
  if (kind === 'firewall_guardian') return SPRITES.bossFirewall;
  return SPRITES.bossReaper;
};

const drawOrbSprite = (ctx: CanvasRenderingContext2D, size: 'small' | 'medium' | 'large', x: number, y: number) => {
  const px = size === 'large' ? 3 : size === 'medium' ? 2 : 2;
  const fill = size === 'large' ? '#e0ff9d' : size === 'medium' ? '#7cf8cf' : '#3be8b4';
  const core = size === 'large' ? '#fff4c6' : '#d7fff3';
  drawSprite(ctx, {
    pixel: px,
    glow: size === 'large' ? 'rgba(224,255,157,0.18)' : 'rgba(124,248,207,0.14)',
    matrix: ['..oo..', '.oaao.', 'oabbao', 'oabbao', '.oaao.', '..oo..'],
    palette: { o: '#ffffff', a: fill, b: core },
  }, x, y);
};

const drawItemSprite = (ctx: CanvasRenderingContext2D, kind: ItemKind, x: number, y: number) => {
  const tones: Record<ItemKind, [string, string, string]> = {
    small_heal: ['#7affbc', '#d8ffef', '#4bcf8a'],
    big_heal: ['#37ff95', '#d5ffe8', '#27ba6f'],
    magnet_core: ['#6bc7ff', '#d7efff', '#3a86c2'],
    clock_booster: ['#ffc36e', '#ffe9c8', '#c77f2d'],
    shield_shard: ['#b28dff', '#eadfff', '#7352b8'],
    emp_bomb: ['#ff7a7a', '#ffd4d4', '#b84b4b'],
    overclock_chip: ['#ffac58', '#ffe3bf', '#b87131'],
    repair_nanites: ['#6fffcb', '#defff2', '#35b58f'],
    data_vacuum: ['#89d7ff', '#e2f5ff', '#4f98be'],
    firewall_battery: ['#ff996b', '#ffe0d1', '#bc643e'],
    critical_patch: ['#ff73a8', '#ffd7e8', '#b84376'],
    cooldown_cache: ['#8cc5ff', '#e2f0ff', '#598bc0'],
    revival_fragment: ['#ffe07f', '#fff4c9', '#c4a64b'],
    boss_key_fragment: ['#f5b4ff', '#fae2ff', '#9f64ab'],
    xp_compressor: ['#9eff87', '#e8ffd9', '#67bd55'],
    glitch_decoy: ['#84f4ff', '#dcfdff', '#4e9ea6'],
    damage_amplifier: ['#ff6b6b', '#ffd1d1', '#b84545'],
    emergency_escape_protocol: ['#ff4c6f', '#ffc3d2', '#af3049'],
    upgrade_chest: ['#57e6ff', '#d9f9ff', '#2e89a3'],
    packet_battery: ['#ffb46f', '#ffe6c8', '#bd7641'],
    kernel_patch: ['#73c6ff', '#dff0ff', '#4f86be'],
    hot_cache: ['#ffd986', '#fff0ca', '#ba9040'],
    rollback_token: ['#89ffc3', '#e2ffef', '#4ea77d'],
    vacuum_plus_plus_core: ['#87f3ff', '#dfffff', '#4f9ea7'],
    failover_shield: ['#c09bff', '#f0e3ff', '#7e63b9'],
    data_leech: ['#ff89bb', '#ffdff0', '#b4527d'],
    clock_freeze_chip: ['#8fdfff', '#e0f6ff', '#538fb3'],
    overheat_module: ['#ff8267', '#ffd8cc', '#ba5e44'],
    boss_trace_key: ['#ffc887', '#ffedcf', '#b88245'],
  };

  const [a, b, c] = tones[kind];
  drawSprite(ctx, {
    pixel: 2,
    glow: `${a}30`,
    matrix: ['..oooo..', '.oabbao.', 'oacddcao', 'obdeedbo', 'obdeedbo', 'oacddcao', '.oabbao.', '..oooo..'],
    palette: { o: '#ffffff', a, b, c, d: '#1f2f40', e: b },
  }, x, y);
};

const ENEMY_UNIT_SPRITE_KEY: Record<EnemyKind, UnitSpriteKey> = {
  noise_slime: 'enemy_noise',
  glitch_runner: 'enemy_runner',
  log_worm: 'enemy_worm',
  error_drone: 'enemy_drone',
  memory_golem: 'enemy_golem',
  corrupted_cache: 'boss_cache',
  broken_process: 'boss_process',
  firewall_guardian: 'boss_firewall',
  kernel_reaper: 'boss_reaper',
};

const createImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load sprite: ${src}`));
    img.src = src;
  });

const loadSpriteStore = async () => {
  const store: SpriteStore = {};
  const entries: Array<[string, string[]]> = [
    ...Object.entries(UNIT_SPRITE_PATHS),
    ...Object.entries(ITEM_SPRITE_PATHS),
    ...Object.entries(EFFECT_SPRITE_PATHS),
    ...ALL_SKILL_IDS.map(
      (id): [string, string[]] => [
        `skill_${id}`,
        [
          `/minigames/lucas-survival/sprites/effects/skill_${id}_0.png`,
          `/minigames/lucas-survival/sprites/effects/skill_${id}_1.png`,
          `/minigames/lucas-survival/sprites/effects/skill_${id}_2.png`,
        ],
      ],
    ),
  ];

  await Promise.all(
    entries.map(async ([key, paths]) => {
      const loaded = await Promise.all(paths.map((p) => createImage(p).catch(() => null)));
      const frames = loaded.filter((img): img is HTMLImageElement => img instanceof HTMLImageElement);
      if (frames.length > 0) store[key] = frames;
    }),
  );
  return store;
};

const getAnimFrame = (frames: HTMLImageElement[] | undefined, elapsed: number, fps: number) => {
  if (!frames || frames.length === 0) return null;
  const idx = Math.floor(elapsed * fps) % frames.length;
  return frames[idx];
};

const drawImageCentered = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 1,
) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, Math.floor(x - width / 2), Math.floor(y - height / 2), Math.floor(width), Math.floor(height));
  ctx.restore();
};

const drawImageCenteredRotated = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  angle: number,
  alpha = 1,
) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.rotate(angle);
  ctx.drawImage(image, Math.floor(-width / 2), Math.floor(-height / 2), Math.floor(width), Math.floor(height));
  ctx.restore();
};

const DIRECTIONAL_SKILLS = new Set<SkillId>([
  'debug_shot',
  'packet_storm',
  'lucas_beam',
  'trace_blade',
  'null_grenade',
  'proxy_turret',
  'data_lightning',
  'recursive_drone',
  'ghost_fork',
  'mirror_packet',
  'thread_splitter',
]);

const skillToKey = (skillId: SkillId) => `skill_${skillId}`;

function createRuntime(): RuntimeState {
  return {
    now: 0,
    elapsed: 0,
    status: 'ready',
    player: {
      ...BASE_PLAYER_STATS,
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      r: 14,
      hitInvulnUntil: 0,
      hitPulseUntil: 0,
      shieldCharges: 0,
      speedBoostUntil: 0,
      attackBoostUntil: 0,
      damageBoostUntil: 0,
      defenseBoostUntil: 0,
      critBoostUntil: 0,
      regenBoostUntil: 0,
      pickupBoostUntil: 0,
      expBoostUntil: 0,
      invincibleUntil: 0,
      emergencyEscapeUntil: 0,
      overheatPenaltyUntil: 0,
      reviveCharges: 0,
      expGainMultiplier: 1,
      projectileBoostUntil: 0,
      failoverShieldCharges: 0,
      dataLeechLevel: 0,
      bossTraceStacks: 0,
      recentDamageTaken: 0,
    },
    skills: {
      unlocked: {
        debug_shot: true,
        signal_orb: false,
        firewall_ring: false,
        packet_storm: false,
        memory_mine: false,
        lucas_beam: false,
        trace_blade: false,
        null_grenade: false,
        proxy_turret: false,
        data_lightning: false,
        black_ice_field: false,
        recursive_drone: false,
        quantum_spike: false,
        system_purge: false,
        ghost_fork: false,
        checksum_burst: false,
        port_snare: false,
        stack_overflow: false,
        mirror_packet: false,
        thread_splitter: false,
        latency_field: false,
        root_access: false,
      },
      debugShot: {
        damage: 12,
        cooldown: 0.45,
        projectileSpeed: 520,
        projectileCount: 1,
        pierce: 0,
        nextFireAt: 0,
      },
      signalOrb: {
        count: 1,
        radius: 90,
        rotationSpeed: 2.2,
        damage: 10,
        angle: 0,
      },
      firewallRing: {
        damage: 30,
        cooldown: 5.5,
        radius: 120,
        nextFireAt: 4,
        burn: false,
      },
      packetStorm: {
        damage: 8,
        cooldown: 3.5,
        projectileCount: 8,
        projectileSpeed: 420,
        nextCastAt: 4,
      },
      memoryMine: {
        damage: 45,
        cooldown: 4.5,
        explosionRadius: 80,
        nextDropAt: 3,
        leavePool: false,
      },
      lucasBeam: {
        damagePerTick: 18,
        duration: 1.4,
        cooldown: 7,
        nextCastAt: 8,
        targetCount: 1,
      },
      traceBlade: {
        damage: 38,
        cooldown: 2.2,
        range: 105,
        nextCastAt: 3,
        comboHits: 1,
      },
      nullGrenade: {
        damage: 55,
        cooldown: 6.5,
        radius: 95,
        nextCastAt: 6,
        count: 1,
        slowPercent: 35,
        slowDuration: 2.2,
      },
      proxyTurret: {
        damage: 9,
        fireRate: 0.25,
        duration: 8,
        cooldown: 10,
        range: 260,
        turretCount: 1,
        nextCastAt: 10,
      },
      dataLightning: {
        damage: 22,
        cooldown: 2,
        chainCount: 4,
        chainRange: 150,
        nextCastAt: 5,
      },
      blackIceField: {
        damagePerSecond: 7,
        cooldown: 8,
        radius: 135,
        duration: 4,
        slowPercent: 45,
        nextCastAt: 7,
      },
      recursiveDrone: {
        damage: 11,
        cooldown: 0.8,
        droneCount: 1,
        range: 230,
        projectileSpeed: 430,
        nextCastAt: 2,
      },
      quantumSpike: {
        damage: 70,
        cooldown: 5.8,
        spikeCount: 3,
        warningDelay: 0.45,
        radius: 28,
        nextCastAt: 6.5,
      },
      systemPurge: {
        damage: 180,
        cooldown: 35,
        bossDamageMultiplier: 0.35,
        eliteDamageMultiplier: 0.7,
        nextCastAt: 20,
        pulseUntil: 0,
      },
      ghostFork: {
        damage: 65,
        cooldown: 6.5,
        delay: 1.2,
        range: 135,
        nextCastAt: 5.5,
      },
      checksumBurst: {
        baseDamage: 14,
        hpRatioDamage: 0.06,
        radius: 180,
        cooldown: 6,
        nextCastAt: 6,
      },
      portSnare: {
        damage: 22,
        cooldown: 7,
        radius: 72,
        nextCastAt: 6,
        duration: 2.6,
      },
      stackOverflow: {
        threshold: 4,
        chain: 2,
        radius: 96,
        damage: 58,
        cooldown: 1.2,
        nextBurstAt: 0,
      },
      mirrorPacket: {
        damage: 11,
        cooldown: 4.8,
        projectileCount: 5,
        projectileSpeed: 400,
        nextCastAt: 4,
      },
      threadSplitter: {
        damage: 13,
        cooldown: 4.4,
        projectileCount: 4,
        projectileSpeed: 430,
        nextCastAt: 4,
      },
      latencyField: {
        radius: 155,
        damagePerSecond: 8,
        cooldown: 8.5,
        duration: 4,
        slowPercent: 0.3,
        nextCastAt: 7,
      },
      rootAccess: {
        cooldown: 20,
        duration: 2,
        nextCastAt: 12,
      },
      beamRender: {
        activeUntil: 0,
        targetId: null,
        damagePerTick: 0,
        tickAccum: 0,
      },
    },
    enemies: [],
    projectiles: [],
    orbs: [],
    items: [],
    mines: [],
    hazards: [],
    turrets: [],
    decoys: [],
    effects: [],
    lightningLinks: [],
    recursiveDrones: [],
    mirrorNodes: [],
    ghostClones: [],
    warnings: { text: '', until: 0 },
    eventLogs: [],
    spawnAccumulator: 0,
    idSeq: 1,
    kills: 0,
    bossKills: 0,
    selectedUpgrades: [],
    skillUpgradeStacks: {},
    skillNewUntil: {},
    lowHpFlash: 0,
    screenShake: 0,
    gridOffset: 0,
    glitchNoise: 0,
    pendingLevelCards: [],
    levelupSource: null,
    itemCollectionLog: [],
    nextChestMinRarity: null,
    stackOverflowHits: 0,
  };
}

export function LucasSurvivalApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<RuntimeState>(createRuntime());
  const spriteStoreRef = useRef<SpriteStore>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioMasterRef = useRef<GainNode | null>(null);
  const sfxThrottleRef = useRef<Record<string, number>>({});
  const sfxMutedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const lastMsRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const pausedRef = useRef(false);
  const hasRecordedClearRef = useRef(false);
  const timelineRef = useRef({
    mid1: false,
    mid2: false,
    boss1: false,
    final: false,
    startTextUntil: 0,
  });

  const [hud, setHud] = useState<HudState>({
    timerText: '05:00',
    hpPercent: 100,
    expPercent: 0,
    level: 1,
    kills: 0,
    bossHp: null,
    warningText: SYSTEM_TEXT.start1,
    combatLogs: [],
    skillList: ['디버그 샷'],
    skillCooldowns: [],
    activeBuffs: [],
    statsPanel: [],
    status: 'ready',
    result: null,
  });
  const [cards, setCards] = useState<UpgradeCard[]>([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(1);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<'skills' | 'items'>('skills');

  useEffect(() => {
    if (hud.status !== 'clear' || hasRecordedClearRef.current) return;

    hasRecordedClearRef.current = true;
    void fragmentApi.acquireFragment('4').catch((error) => {
      hasRecordedClearRef.current = false;
      console.error('Failed to record Lucas survival clear:', error);
    });
  }, [hud.status]);

  const ensureAudio = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioContextRef.current) {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      const gain = ctx.createGain();
      gain.gain.value = 0.08;
      gain.connect(ctx.destination);
      audioContextRef.current = ctx;
      audioMasterRef.current = gain;
    }
    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playSfx = useCallback((kind: 'shoot' | 'hit' | 'levelup' | 'select' | 'boss' | 'pickup') => {
    if (sfxMutedRef.current) return;
    const ctx = ensureAudio();
    const out = audioMasterRef.current;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const key = `sfx:${kind}`;
    const last = sfxThrottleRef.current[key] ?? -999;
    const minGap =
      kind === 'shoot' ? 0.06 :
      kind === 'hit' ? 0.05 :
      kind === 'pickup' ? 0.08 :
      0.15;
    if (now - last < minGap) return;
    sfxThrottleRef.current[key] = now;

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type =
      kind === 'boss' ? 'sawtooth' :
      kind === 'levelup' ? 'triangle' :
      'square';
    const base =
      kind === 'shoot' ? 560 :
      kind === 'hit' ? 190 :
      kind === 'levelup' ? 360 :
      kind === 'select' ? 520 :
      kind === 'boss' ? 140 :
      300;
    o.frequency.setValueAtTime(base, now);
    o.frequency.exponentialRampToValueAtTime(
      kind === 'shoot' ? 320 :
      kind === 'levelup' ? 900 :
      kind === 'select' ? 740 :
      kind === 'boss' ? 90 :
      kind === 'pickup' ? 520 : 120,
      now + (kind === 'boss' ? 0.22 : 0.1),
    );
    g.gain.setValueAtTime(kind === 'boss' ? 0.065 : 0.04, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'boss' ? 0.24 : 0.11));
    o.connect(g);
    g.connect(out);
    o.start(now);
    o.stop(now + (kind === 'boss' ? 0.24 : 0.11));
  }, [ensureAudio]);

  const appendCombatLog = useCallback(
    (rt: RuntimeState, text: string, type: 'system' | 'boss' | 'skill' | 'item', _seconds = 3.8) => {
      void _seconds;
      rt.idSeq += 1;
      rt.eventLogs.push({
        id: rt.idSeq,
        text,
        type,
        // Keep logs persistent; they are rotated out of view by slice only.
        until: Number.POSITIVE_INFINITY,
      });
      if (rt.eventLogs.length > 120) {
        rt.eventLogs.splice(0, rt.eventLogs.length - 120);
      }
    },
    [],
  );

  const startGame = useCallback(() => {
    const rt = createRuntime();
    rt.status = 'running';
    rt.warnings.text = `${SYSTEM_TEXT.start1} ${SYSTEM_TEXT.start2}`;
    rt.warnings.until = 4;
    appendCombatLog(rt, SYSTEM_TEXT.start1, 'system', 2.6);
    appendCombatLog(rt, SYSTEM_TEXT.start2, 'system', 4.2);
    runtimeRef.current = rt;
    timelineRef.current = {
      mid1: false,
      mid2: false,
      boss1: false,
      final: false,
      startTextUntil: 4,
    };
    pausedRef.current = false;
    setCards([]);
    setSelectedCardIndex(1);
    setHud({
      timerText: formatTime(GAME_SECONDS),
      hpPercent: 100,
      expPercent: 0,
      level: 1,
      kills: 0,
      bossHp: null,
      warningText: SYSTEM_TEXT.start1,
      combatLogs: [],
      skillList: ['디버그 샷'],
      skillCooldowns: [],
      activeBuffs: [],
      statsPanel: [],
      status: 'running',
      result: null,
    });
    void ensureAudio();
    playSfx('select');
    lastMsRef.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [appendCombatLog, ensureAudio, playSfx]);

  const stopGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const nextId = (rt: RuntimeState) => {
    rt.idSeq += 1;
    return rt.idSeq;
  };

  const issueWarning = useCallback((text: string, seconds = 2) => {
    const rt = runtimeRef.current;
    rt.warnings.text = text;
    rt.warnings.until = rt.elapsed + seconds;
    appendCombatLog(rt, text, 'boss', Math.max(3.4, seconds + 1.4));
    playSfx('boss');
  }, [appendCombatLog, playSfx]);

  const spawnEffect = (
    rt: RuntimeState,
    x: number,
    y: number,
    radius: number,
    color: string,
    kind: 'ring' | 'cross' | 'nova' | 'slash',
    ttl = 0.35,
    skillId?: SkillId,
    angle?: number,
  ) => {
    rt.effects.push({
      id: nextId(rt),
      x,
      y,
      ttl,
      maxTtl: ttl,
      radius,
      color,
      kind,
      skillId,
      angle,
    });
  };

  const spawnEnemy = useCallback((rt: RuntimeState, kind: EnemyKind, bossSpawn = false) => {
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (bossSpawn) {
      x = edge % 2 === 0 ? CANVAS_WIDTH * 0.5 : CANVAS_WIDTH + 70;
      y = edge % 2 === 0 ? -70 : CANVAS_HEIGHT * (0.25 + Math.random() * 0.5);
    } else {
      if (edge === 0) { x = -40; y = Math.random() * CANVAS_HEIGHT; }
      else if (edge === 1) { x = CANVAS_WIDTH + 40; y = Math.random() * CANVAS_HEIGHT; }
      else if (edge === 2) { x = Math.random() * CANVAS_WIDTH; y = -40; }
      else { x = Math.random() * CANVAS_WIDTH; y = CANVAS_HEIGHT + 40; }
    }

    const base = ENEMY_BASE[kind];
    const mul = getEnemyMultipliers(rt.elapsed);
    const isBoss = kind === 'corrupted_cache' || kind === 'broken_process' || kind === 'firewall_guardian' || kind === 'kernel_reaper';
    const hpMul = isBoss ? 1.5 : mul.hpMul;
    const speedMul = isBoss ? 1.5 : mul.speedMul;
    const damageMul = isBoss ? 1.5 : mul.damageMul;

    const enemy: Enemy = {
      id: nextId(rt),
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      r: base.radius,
      hp: base.hp * hpMul,
      maxHp: base.hp * hpMul,
      speed: base.speed * speedMul,
      damage: base.damage * damageMul,
      exp: base.exp,
      color: base.color,
      aiCooldown: 0,
      summonCooldown: 5,
      dashCooldown: 4,
      dashTelegraph: 0,
      dashTargetX: 0,
      dashTargetY: 0,
      phaseTriggered: false,
    };
    rt.enemies.push(enemy);
  }, []);

  const spawnEnemyWave = useCallback((rt: RuntimeState) => {
    const phase = getPhaseName(rt.elapsed);
    const roll = Math.random();
    if (phase === 'tutorial') {
      spawnEnemy(rt, roll < 0.7 ? 'noise_slime' : 'log_worm');
      return;
    }
    if (phase === 'early_pressure') {
      if (roll < 0.45) spawnEnemy(rt, 'noise_slime');
      else if (roll < 0.75) spawnEnemy(rt, 'glitch_runner');
      else spawnEnemy(rt, 'log_worm');
      return;
    }
    if (phase === 'surround') {
      if (roll < 0.35) spawnEnemy(rt, 'noise_slime');
      else if (roll < 0.55) spawnEnemy(rt, 'glitch_runner');
      else if (roll < 0.82) spawnEnemy(rt, 'log_worm');
      else spawnEnemy(rt, 'memory_golem');
      return;
    }
    if (phase === 'mid_bullet_pressure') {
      if (roll < 0.22) spawnEnemy(rt, 'noise_slime');
      else if (roll < 0.45) spawnEnemy(rt, 'glitch_runner');
      else if (roll < 0.65) spawnEnemy(rt, 'log_worm');
      else if (roll < 0.84) spawnEnemy(rt, 'error_drone');
      else spawnEnemy(rt, 'memory_golem');
      return;
    }
    if (phase === 'high_wave') {
      if (roll < 0.18) spawnEnemy(rt, 'noise_slime');
      else if (roll < 0.42) spawnEnemy(rt, 'glitch_runner');
      else if (roll < 0.64) spawnEnemy(rt, 'log_worm');
      else if (roll < 0.86) spawnEnemy(rt, 'error_drone');
      else spawnEnemy(rt, 'memory_golem');
      return;
    }

    if (roll < 0.2) spawnEnemy(rt, 'glitch_runner');
    else if (roll < 0.45) spawnEnemy(rt, 'log_worm');
    else if (roll < 0.7) spawnEnemy(rt, 'error_drone');
    else spawnEnemy(rt, 'memory_golem');
  }, [spawnEnemy]);

  const pushProjectile = (
    rt: RuntimeState,
    owner: 'player' | 'enemy',
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    life: number,
    radius: number,
    color: string,
    pierce = 0,
    meta?: Partial<Pick<Projectile, 'knockback' | 'hitStunSec' | 'hitSlowSec' | 'hitVulnerableSec' | 'sourceSkill'>>,
  ) => {
    const p: Projectile = {
      id: nextId(rt),
      owner,
      x,
      y,
      vx,
      vy,
      damage,
      life,
      r: radius,
      color,
      pierce,
      knockback: meta?.knockback,
      hitStunSec: meta?.hitStunSec,
      hitSlowSec: meta?.hitSlowSec,
      hitVulnerableSec: meta?.hitVulnerableSec,
      sourceSkill: meta?.sourceSkill,
    };
    rt.projectiles.push(p);
  };

  const addExpOrbs = (rt: RuntimeState, x: number, y: number, baseExp: number) => {
    const add = (value: number, size: Orb['size'], ox: number, oy: number) => {
      rt.orbs.push({
        id: nextId(rt),
        x: x + ox,
        y: y + oy,
        value,
        size,
      });
    };

    if (baseExp >= 18) {
      add(EXP_ORB.large, 'large', 0, 0);
    } else if (baseExp >= 8) {
      add(EXP_ORB.medium, 'medium', 0, 0);
      if (Math.random() < 0.45) add(EXP_ORB.small, 'small', 8, -6);
    } else {
      add(EXP_ORB.small, 'small', 0, 0);
      if (Math.random() < 0.25) add(EXP_ORB.small, 'small', -6, 7);
    }
  };

  const maybeDropItem = (rt: RuntimeState, enemy: Enemy) => {
    const drop = (kind: ItemKind) => {
      rt.items.push({
        id: nextId(rt),
        x: enemy.x,
        y: enemy.y,
        kind,
        ttl: 18,
      });
    };

    if (enemy.kind === 'corrupted_cache') {
      rt.levelupSource = 'upgradeChest';
      drop('upgrade_chest');
      openLevelUp(rt, 'rare');
      return;
    }
    if (enemy.kind === 'broken_process') {
      rt.levelupSource = 'rareChest';
      openLevelUp(rt, 'rare');
      drop('big_heal');
      if (Math.random() < 0.5) drop('boss_key_fragment');
      return;
    }
    if (enemy.kind === 'firewall_guardian') {
      rt.levelupSource = 'legendaryChest';
      openLevelUp(rt, 'epic');
      drop('magnet_core');
      if (Math.random() < 0.6) drop('revival_fragment');
      return;
    }

    const chance =
      enemy.kind === 'kernel_reaper' ? 0.4 :
      enemy.kind === 'memory_golem' ? 0.09 :
      enemy.kind === 'error_drone' ? 0.06 :
      0.03;
    if (Math.random() > chance) return;

    const roll = Math.random();
    if (roll < 0.12) drop('small_heal');
    else if (roll < 0.18) drop('big_heal');
    else if (roll < 0.26) drop('shield_shard');
    else if (roll < 0.34) drop('clock_booster');
    else if (roll < 0.4) drop('magnet_core');
    else if (roll < 0.46) drop('emp_bomb');
    else if (roll < 0.52) drop('overclock_chip');
    else if (roll < 0.58) drop('repair_nanites');
    else if (roll < 0.64) drop('data_vacuum');
    else if (roll < 0.7) drop('firewall_battery');
    else if (roll < 0.76) drop('critical_patch');
    else if (roll < 0.82) drop('cooldown_cache');
    else if (roll < 0.86) drop('boss_key_fragment');
    else if (roll < 0.9) drop('xp_compressor');
    else if (roll < 0.90) drop('glitch_decoy');
    else if (roll < 0.93) drop('damage_amplifier');
    else if (roll < 0.945) drop('packet_battery');
    else if (roll < 0.958) drop('hot_cache');
    else if (roll < 0.968) drop('rollback_token');
    else if (roll < 0.977) drop('vacuum_plus_plus_core');
    else if (roll < 0.985) drop('failover_shield');
    else if (roll < 0.991) drop('data_leech');
    else if (roll < 0.996) drop('clock_freeze_chip');
    else if (roll < 0.998) drop('overheat_module');
    else drop('boss_trace_key');
  };

  const openLevelUp = (rt: RuntimeState, minRarity: Rarity = 'common') => {
    const floorRarity = rt.nextChestMinRarity && (
      (rt.nextChestMinRarity === 'legendary') ||
      (rt.nextChestMinRarity === 'epic' && minRarity !== 'legendary') ||
      (rt.nextChestMinRarity === 'rare' && minRarity === 'common')
    )
      ? rt.nextChestMinRarity
      : minRarity;
    const cards = pickCards(3, rt, floorRarity);
    rt.pendingLevelCards = cards;
    appendCombatLog(rt, '레벨 업: 전투 데이터 분석 중, 카드 1장을 선택해.', 'system', 2.8);
    if (cards.some((c) => c.cardType === 'new_skill')) {
      appendCombatLog(rt, '신규 스킬 획득 카드 감지: 선택 시 즉시 전투 루틴 추가.', 'skill', 3.5);
      rt.screenShake = Math.max(rt.screenShake, 7);
    }
    rt.status = 'levelup';
    pausedRef.current = true;
    setCards(cards);
    setSelectedCardIndex(cards.length >= 3 ? 1 : 0);
    setHud((prev) => ({
      ...prev,
      status: 'levelup',
      warningText: SYSTEM_TEXT.levelup,
    }));
    playSfx('levelup');
    stopGame();
  };

  const resolveLinkedSkill = (card: UpgradeCard): SkillId | null => {
    const id = card.id;
    if (id.startsWith('unlock-')) {
      const token = id.replace(/^unlock-/, '');
      if (token === 'signal-orb') return 'signal_orb';
      if (token === 'firewall-ring') return 'firewall_ring';
      if (token === 'packet-storm') return 'packet_storm';
      if (token === 'memory-mine') return 'memory_mine';
      if (token === 'lucas-beam') return 'lucas_beam';
      if (token === 'trace-blade') return 'trace_blade';
      if (token === 'null-grenade') return 'null_grenade';
      if (token === 'proxy-turret') return 'proxy_turret';
      if (token === 'data-lightning') return 'data_lightning';
      if (token === 'black-ice-field') return 'black_ice_field';
      if (token === 'recursive-drone') return 'recursive_drone';
      if (token === 'quantum-spike') return 'quantum_spike';
      if (token === 'system-purge') return 'system_purge';
      if (token === 'ghost-fork') return 'ghost_fork';
      if (token === 'checksum-burst') return 'checksum_burst';
      if (token === 'port-snare') return 'port_snare';
      if (token === 'stack-overflow') return 'stack_overflow';
      if (token === 'mirror-packet') return 'mirror_packet';
      if (token === 'thread-splitter') return 'thread_splitter';
      if (token === 'latency-field') return 'latency_field';
      if (token === 'root-access') return 'root_access';
      return null;
    }
    if (id.startsWith('debug-') || id === 'evo-debug') return 'debug_shot';
    if (id.startsWith('signal-')) return 'signal_orb';
    if (id.startsWith('storm-')) return 'packet_storm';
    if (id.startsWith('beam-')) return 'lucas_beam';
    if (id.startsWith('blade-')) return 'trace_blade';
    if (id.startsWith('grenade-')) return 'null_grenade';
    if (id.startsWith('turret-')) return 'proxy_turret';
    if (id.startsWith('lightning-')) return 'data_lightning';
    if (id.startsWith('ice-field-')) return 'black_ice_field';
    if (id.startsWith('drone-')) return 'recursive_drone';
    if (id.startsWith('spike-')) return 'quantum_spike';
    if (id.startsWith('purge-') || id === 'evo-purge') return 'system_purge';
    if (id.startsWith('ghost-fork-')) return 'ghost_fork';
    if (id.startsWith('checksum-')) return 'checksum_burst';
    if (id.startsWith('snare-')) return 'port_snare';
    if (id.startsWith('overflow-')) return 'stack_overflow';
    if (id.startsWith('mirror-')) return 'mirror_packet';
    if (id.startsWith('thread-')) return 'thread_splitter';
    if (id.startsWith('latency-')) return 'latency_field';
    if (id.startsWith('root-')) return 'root_access';
    if (id === 'evo-firewall') return 'firewall_ring';
    return null;
  };

  const applySkillStackScaling = (rt: RuntimeState, skill: SkillId, stack: number) => {
    if (stack <= 0) return;

    if (skill === 'debug_shot') {
      if (stack % 2 === 0) rt.skills.debugShot.pierce = Math.min(5, rt.skills.debugShot.pierce + 1);
      rt.skills.debugShot.projectileSpeed *= 1.015;
      return;
    }
    if (skill === 'signal_orb') {
      if (stack % 2 === 0) rt.skills.signalOrb.count = Math.min(7, rt.skills.signalOrb.count + 1);
      rt.skills.signalOrb.radius = Math.min(180, rt.skills.signalOrb.radius + 4);
      return;
    }
    if (skill === 'firewall_ring') {
      rt.skills.firewallRing.cooldown *= 0.96;
      if (stack % 2 === 0) rt.skills.firewallRing.radius = Math.min(220, rt.skills.firewallRing.radius + 10);
      if (stack >= 2) rt.skills.firewallRing.burn = true;
      return;
    }
    if (skill === 'packet_storm') {
      rt.skills.packetStorm.projectileCount = Math.min(42, rt.skills.packetStorm.projectileCount + 1);
      if (stack % 2 === 0) rt.skills.packetStorm.projectileSpeed *= 1.04;
      return;
    }
    if (skill === 'memory_mine') {
      if (stack % 2 === 0) rt.skills.memoryMine.explosionRadius = Math.min(220, rt.skills.memoryMine.explosionRadius + 10);
      if (stack >= 2) rt.skills.memoryMine.leavePool = true;
      return;
    }
    if (skill === 'lucas_beam') {
      if (stack >= 2 && stack % 2 === 0) rt.skills.lucasBeam.targetCount = Math.min(4, rt.skills.lucasBeam.targetCount + 1);
      rt.skills.lucasBeam.duration = Math.min(3.2, rt.skills.lucasBeam.duration + 0.08);
      return;
    }
    if (skill === 'trace_blade') {
      if (stack % 2 === 0) rt.skills.traceBlade.comboHits = Math.min(5, rt.skills.traceBlade.comboHits + 1);
      rt.skills.traceBlade.range = Math.min(220, rt.skills.traceBlade.range + 6);
      return;
    }
    if (skill === 'null_grenade') {
      if (stack % 2 === 0) rt.skills.nullGrenade.count = Math.min(4, rt.skills.nullGrenade.count + 1);
      rt.skills.nullGrenade.slowDuration = Math.min(4.2, rt.skills.nullGrenade.slowDuration + 0.12);
      return;
    }
    if (skill === 'proxy_turret') {
      if (stack % 2 === 0) rt.skills.proxyTurret.turretCount = Math.min(5, rt.skills.proxyTurret.turretCount + 1);
      rt.skills.proxyTurret.duration = Math.min(16, rt.skills.proxyTurret.duration + 0.3);
      return;
    }
    if (skill === 'data_lightning') {
      rt.skills.dataLightning.chainCount = Math.min(14, rt.skills.dataLightning.chainCount + 1);
      if (stack % 2 === 0) rt.skills.dataLightning.chainRange = Math.min(280, rt.skills.dataLightning.chainRange + 10);
      return;
    }
    if (skill === 'black_ice_field') {
      rt.skills.blackIceField.radius = Math.min(230, rt.skills.blackIceField.radius + 8);
      rt.skills.blackIceField.slowPercent = Math.min(0.8, rt.skills.blackIceField.slowPercent + 0.03);
      return;
    }
    if (skill === 'recursive_drone') {
      if (stack % 2 === 0) rt.skills.recursiveDrone.droneCount = Math.min(6, rt.skills.recursiveDrone.droneCount + 1);
      rt.skills.recursiveDrone.projectileSpeed *= 1.025;
      return;
    }
    if (skill === 'quantum_spike') {
      rt.skills.quantumSpike.spikeCount = Math.min(12, rt.skills.quantumSpike.spikeCount + 1);
      rt.skills.quantumSpike.radius = Math.min(84, rt.skills.quantumSpike.radius + 2);
      return;
    }
    if (skill === 'system_purge') {
      rt.skills.systemPurge.cooldown *= 0.97;
      rt.skills.systemPurge.bossDamageMultiplier = Math.min(0.8, rt.skills.systemPurge.bossDamageMultiplier + 0.03);
      return;
    }
    if (skill === 'ghost_fork') {
      rt.skills.ghostFork.damage *= 1.08;
      rt.skills.ghostFork.delay = Math.max(0.4, rt.skills.ghostFork.delay - 0.04);
      return;
    }
    if (skill === 'checksum_burst') {
      rt.skills.checksumBurst.hpRatioDamage = Math.min(0.22, rt.skills.checksumBurst.hpRatioDamage + 0.01);
      return;
    }
    if (skill === 'port_snare') {
      rt.skills.portSnare.duration = Math.min(5.5, rt.skills.portSnare.duration + 0.16);
      rt.skills.portSnare.radius = Math.min(140, rt.skills.portSnare.radius + 3);
      return;
    }
    if (skill === 'stack_overflow') {
      rt.skills.stackOverflow.damage *= 1.08;
      rt.skills.stackOverflow.threshold = Math.max(4, rt.skills.stackOverflow.threshold - (stack % 2 === 0 ? 1 : 0));
      return;
    }
    if (skill === 'mirror_packet') {
      rt.skills.mirrorPacket.projectileCount = Math.min(10, rt.skills.mirrorPacket.projectileCount + (stack % 2 === 0 ? 1 : 0));
      return;
    }
    if (skill === 'thread_splitter') {
      rt.skills.threadSplitter.damage *= 1.08;
      rt.skills.threadSplitter.projectileCount = Math.min(8, rt.skills.threadSplitter.projectileCount + (stack % 2 === 0 ? 1 : 0));
      return;
    }
    if (skill === 'latency_field') {
      rt.skills.latencyField.radius = Math.min(260, rt.skills.latencyField.radius + 8);
      rt.skills.latencyField.slowPercent = Math.min(0.7, rt.skills.latencyField.slowPercent + 0.02);
      return;
    }
    if (skill === 'root_access') {
      rt.skills.rootAccess.cooldown *= 0.96;
    }
  };

  const applyCard = (card: UpgradeCard) => {
    const rt = runtimeRef.current;
    const linkedSkill = resolveLinkedSkill(card);
    const wasUnlocked = linkedSkill ? rt.skills.unlocked[linkedSkill] : false;

    card.apply(rt);
    rt.selectedUpgrades.push(card.name);

    if (linkedSkill && (card.cardType === 'skill_upgrade' || card.cardType === 'evolution')) {
      rt.skillUpgradeStacks[linkedSkill] = (rt.skillUpgradeStacks[linkedSkill] ?? 0) + 1;
      applySkillStackScaling(rt, linkedSkill, rt.skillUpgradeStacks[linkedSkill] ?? 0);
    }
    if (linkedSkill && card.cardType === 'new_skill' && !wasUnlocked && rt.skills.unlocked[linkedSkill]) {
      rt.skillNewUntil[linkedSkill] = rt.elapsed + 9;
      rt.screenShake = Math.max(rt.screenShake, 12);
      appendCombatLog(rt, `신규 스킬 획득: ${SKILL_LABELS[linkedSkill]}`, 'skill', 3.6);
      spawnEffect(rt, rt.player.x, rt.player.y, 92, RARITY_COLOR[card.rarity], 'nova', 0.55, linkedSkill);
      playSfx('levelup');
    } else if (linkedSkill && (card.cardType === 'skill_upgrade' || card.cardType === 'evolution')) {
      const lv = rt.skillUpgradeStacks[linkedSkill] ?? 0;
      appendCombatLog(rt, `${SKILL_LABELS[linkedSkill]} 강화 +${lv}`, 'skill', 2.6);
    }

    if (card.cardType === 'stat_upgrade' || card.cardType === 'survival_upgrade' || card.cardType === 'economy_upgrade') {
      appendCombatLog(rt, `능력치 적용: ${card.name}`, 'system', 2.2);
    }

    rt.pendingLevelCards = [];
    rt.levelupSource = null;
    rt.nextChestMinRarity = null;
    rt.status = 'running';
    pausedRef.current = false;
    setCards([]);
    setSelectedCardIndex(1);
    setHud((prev) => ({
      ...prev,
      status: 'running',
      warningText: null,
    }));
    playSfx('select');
    lastMsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  };

  const getNearestEnemy = (rt: RuntimeState, x: number, y: number) => {
    let target: Enemy | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const e of rt.enemies) {
      const d = dist2(x, y, e.x, e.y);
      if (d < best) {
        best = d;
        target = e;
      }
    }
    return target;
  };

  const getHighestHpEnemies = (rt: RuntimeState, count: number) =>
    [...rt.enemies].sort((a, b) => b.hp - a.hp).slice(0, count);

  const damageEnemy = (rt: RuntimeState, enemy: Enemy, rawDamage: number) => {
    enemy.hp -= rawDamage;
    rt.screenShake = Math.max(rt.screenShake, enemy.kind.includes('boss') ? 8 : 3);
    if (enemy.hp > 0) return false;

    rt.kills += 1;
    if (rt.player.dataLeechLevel > 0) {
      const chance = 0.06 * rt.player.dataLeechLevel;
      if (Math.random() < chance) {
        rt.player.hp = Math.min(rt.player.maxHp, rt.player.hp + 2.5 + rt.player.dataLeechLevel * 1.5);
      }
    }
    playSfx('hit');
    if (
      enemy.kind === 'corrupted_cache' ||
      enemy.kind === 'broken_process' ||
      enemy.kind === 'firewall_guardian' ||
      enemy.kind === 'kernel_reaper'
    ) {
      rt.bossKills += 1;
    }
    addExpOrbs(rt, enemy.x, enemy.y, enemy.exp);
    maybeDropItem(rt, enemy);
    return true;
  };

  const getKnockbackResistance = (kind: EnemyKind) => {
    if (kind === 'noise_slime') return 1;
    if (kind === 'glitch_runner') return 0.95;
    if (kind === 'log_worm') return 1.15;
    if (kind === 'error_drone') return 0.8;
    if (kind === 'memory_golem') return 0.42;
    return 0.16;
  };

  const applyEnemyHit = (
    rt: RuntimeState,
    enemy: Enemy,
    rawDamage: number,
    sourceX: number,
    sourceY: number,
    knockback: number,
    opts?: { stunSec?: number; vulnerableSec?: number; slowSec?: number },
  ) => {
    const vulnerableMul = rt.elapsed < (enemy.vulnerableUntil ?? 0) ? 1.18 : 1;
    const bossTraceMul =
      (enemy.kind === 'corrupted_cache' || enemy.kind === 'broken_process' || enemy.kind === 'firewall_guardian' || enemy.kind === 'kernel_reaper')
        ? 1 + rt.player.bossTraceStacks * 0.18
        : 1;
    const dead = damageEnemy(rt, enemy, rawDamage * vulnerableMul * bossTraceMul);
    if (dead) return true;

    if (knockback > 0) {
      const dx = enemy.x - sourceX;
      const dy = enemy.y - sourceY;
      const len = Math.hypot(dx, dy) || 1;
      const resist = getKnockbackResistance(enemy.kind);
      const force = knockback * resist;
      enemy.vx += (dx / len) * force;
      enemy.vy += (dy / len) * force;
    }

    if (opts?.stunSec && opts.stunSec > 0) {
      enemy.stunUntil = Math.max(enemy.stunUntil ?? 0, rt.elapsed + opts.stunSec);
    }
    if (opts?.vulnerableSec && opts.vulnerableSec > 0) {
      enemy.vulnerableUntil = Math.max(enemy.vulnerableUntil ?? 0, rt.elapsed + opts.vulnerableSec);
    }
    if (opts?.slowSec && opts.slowSec > 0) {
      enemy.slowUntil = Math.max(enemy.slowUntil ?? 0, rt.elapsed + opts.slowSec);
    }
    return false;
  };

  const spawnBossTimeline = useCallback((rt: RuntimeState) => {
    const tl = timelineRef.current;
    if (!tl.mid1 && rt.elapsed >= MID_BOSS_TIMINGS[0]) {
      tl.mid1 = true;
      issueWarning('WARNING: Corrupted Cache detected');
      spawnEnemy(rt, 'corrupted_cache', true);
      rt.screenShake = 10;
    }
    if (!tl.mid2 && rt.elapsed >= MID_BOSS_TIMINGS[1]) {
      tl.mid2 = true;
      issueWarning('WARNING: Broken Process incoming');
      spawnEnemy(rt, 'broken_process', true);
      rt.screenShake = 11;
    }
    if (!tl.boss1 && rt.elapsed >= MAIN_BOSS_TIMING) {
      tl.boss1 = true;
      issueWarning('WARNING: Firewall Guardian incoming');
      spawnEnemy(rt, 'firewall_guardian', true);
      rt.screenShake = 12;
    }
    if (!tl.final && rt.elapsed >= FINAL_BOSS_TIMING) {
      tl.final = true;
      issueWarning('WARNING: Kernel Reaper has entered the system');
      spawnEnemy(rt, 'kernel_reaper', true);
      rt.screenShake = 14;
    }
  }, [issueWarning, spawnEnemy]);

  const updateEnemyAI = (rt: RuntimeState, enemy: Enemy, dt: number) => {
    if (rt.elapsed < (enemy.stunUntil ?? 0)) return;
    const p = rt.player;
    const target = rt.decoys.length > 0
      ? rt.decoys.reduce((best, d) => {
        if (!best) return d;
        return dist2(d.x, d.y, enemy.x, enemy.y) < dist2(best.x, best.y, enemy.x, enemy.y) ? d : best;
      }, null as RuntimeState['decoys'][number] | null)
      : null;
    const tx = target?.x ?? p.x;
    const ty = target?.y ?? p.y;
    const dx = tx - enemy.x;
    const dy = ty - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const slowMul = enemy.slowUntil && rt.elapsed < enemy.slowUntil ? 0.7 : 1;

    if (enemy.kind === 'error_drone') {
      const keepDist = 220;
      if (len > keepDist + 20) {
        enemy.x += nx * enemy.speed * slowMul * dt;
        enemy.y += ny * enemy.speed * slowMul * dt;
      } else if (len < keepDist - 20) {
        enemy.x -= nx * enemy.speed * slowMul * dt;
        enemy.y -= ny * enemy.speed * slowMul * dt;
      }
      enemy.aiCooldown -= dt;
      if (enemy.aiCooldown <= 0) {
        enemy.aiCooldown = 1.25;
        pushProjectile(
          rt,
          'enemy',
          enemy.x,
          enemy.y,
          nx * 230,
          ny * 230,
          8,
          4.6,
          4,
          '#ff9aa8',
        );
      }
      return;
    }

    if (enemy.kind === 'corrupted_cache') {
      if (!enemy.phaseTriggered && enemy.hp <= enemy.maxHp * 0.5) {
        enemy.speed *= 1.2;
        enemy.phaseTriggered = true;
      }
      enemy.x += nx * enemy.speed * slowMul * dt;
      enemy.y += ny * enemy.speed * slowMul * dt;
      enemy.summonCooldown -= dt;
      if (enemy.summonCooldown <= 0) {
        enemy.summonCooldown = 5;
        for (let i = 0; i < 4; i += 1) spawnEnemy(rt, 'noise_slime');
      }
      return;
    }

    if (enemy.kind === 'broken_process') {
      if (enemy.dashTelegraph > 0) {
        enemy.dashTelegraph -= dt;
        if (enemy.dashTelegraph <= 0) {
          const ddx = enemy.dashTargetX - enemy.x;
          const ddy = enemy.dashTargetY - enemy.y;
          const dlen = Math.hypot(ddx, ddy) || 1;
          enemy.x += (ddx / dlen) * 260 * dt * 15;
          enemy.y += (ddy / dlen) * 260 * dt * 15;
        }
      } else {
        enemy.x += nx * enemy.speed * slowMul * dt;
        enemy.y += ny * enemy.speed * slowMul * dt;
        enemy.dashCooldown -= dt;
        if (enemy.dashCooldown <= 0) {
          enemy.dashCooldown = 4;
          enemy.dashTelegraph = 0.7;
          enemy.dashTargetX = p.x;
          enemy.dashTargetY = p.y;
        }
      }
      return;
    }

    if (enemy.kind === 'firewall_guardian') {
      enemy.x += nx * enemy.speed * slowMul * dt;
      enemy.y += ny * enemy.speed * slowMul * dt;
      enemy.aiCooldown -= dt;
      const cd = enemy.hp <= enemy.maxHp * 0.5 ? 1.1 : 1.5;
      if (enemy.aiCooldown <= 0) {
        enemy.aiCooldown = cd;
        for (let i = 0; i < 8; i += 1) {
          const a = (Math.PI * 2 * i) / 8;
          pushProjectile(
            rt,
            'enemy',
            enemy.x,
            enemy.y,
            Math.cos(a) * 260,
            Math.sin(a) * 260,
            12,
            4.8,
            4,
            '#ff6f8a',
          );
        }
      }
      enemy.summonCooldown -= dt;
      if (enemy.summonCooldown <= 0) {
        enemy.summonCooldown = 3.5;
        rt.hazards.push({
          id: nextId(rt),
          x: enemy.x + (Math.random() * 200 - 100),
          y: enemy.y + (Math.random() * 200 - 100),
          r: 62,
          telegraph: 0.8,
          active: 3,
          dps: 26,
        });
      }
      return;
    }

    if (enemy.kind === 'kernel_reaper') {
      enemy.x += nx * enemy.speed * slowMul * dt;
      enemy.y += ny * enemy.speed * slowMul * dt;
      enemy.aiCooldown -= dt;
      if (enemy.aiCooldown <= 0) {
        enemy.aiCooldown = 1.2;
        for (let i = 0; i < 6; i += 1) {
          const a = (Math.PI * 2 * i) / 6 + rt.elapsed * 0.5;
          pushProjectile(
            rt,
            'enemy',
            enemy.x,
            enemy.y,
            Math.cos(a) * 300,
            Math.sin(a) * 300,
            16,
            5.1,
            5,
            '#ff4141',
          );
        }
      }
      enemy.dashCooldown -= dt;
      if (enemy.dashCooldown <= 0) {
        enemy.dashCooldown = 10;
        const dlen = Math.hypot(dx, dy) || 1;
        enemy.x += (dx / dlen) * 220;
        enemy.y += (dy / dlen) * 220;
        rt.screenShake = 14;
      }
      enemy.summonCooldown -= dt;
      if (enemy.summonCooldown <= 0) {
        enemy.summonCooldown = 2.8;
        rt.hazards.push({
          id: nextId(rt),
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * CANVAS_HEIGHT,
          r: 70,
          telegraph: 0.8,
          active: 3,
          dps: 30,
        });
      }
      return;
    }

    enemy.x += nx * enemy.speed * slowMul * dt;
    enemy.y += ny * enemy.speed * slowMul * dt;
  };

  const applyItem = (rt: RuntimeState, item: ItemDrop) => {
    playSfx('pickup');
    rt.itemCollectionLog.push(item.kind);
    if (rt.itemCollectionLog.length > 40) {
      rt.itemCollectionLog = rt.itemCollectionLog.slice(rt.itemCollectionLog.length - 40);
    }
    rt.warnings.text = ITEM_DESCRIPTIONS[item.kind];
    rt.warnings.until = rt.elapsed + 2.8;
    appendCombatLog(rt, ITEM_DESCRIPTIONS[item.kind], 'item', 3.2);

    const applyCooldownCache = () => {
      const now = rt.elapsed;
      const reduce = (nextAt: number) => Math.max(now, now + (nextAt - now) * 0.5);
      rt.skills.debugShot.nextFireAt = reduce(rt.skills.debugShot.nextFireAt);
      rt.skills.firewallRing.nextFireAt = reduce(rt.skills.firewallRing.nextFireAt);
      rt.skills.packetStorm.nextCastAt = reduce(rt.skills.packetStorm.nextCastAt);
      rt.skills.memoryMine.nextDropAt = reduce(rt.skills.memoryMine.nextDropAt);
      rt.skills.lucasBeam.nextCastAt = reduce(rt.skills.lucasBeam.nextCastAt);
      rt.skills.traceBlade.nextCastAt = reduce(rt.skills.traceBlade.nextCastAt);
      rt.skills.nullGrenade.nextCastAt = reduce(rt.skills.nullGrenade.nextCastAt);
      rt.skills.proxyTurret.nextCastAt = reduce(rt.skills.proxyTurret.nextCastAt);
      rt.skills.dataLightning.nextCastAt = reduce(rt.skills.dataLightning.nextCastAt);
      rt.skills.blackIceField.nextCastAt = reduce(rt.skills.blackIceField.nextCastAt);
      rt.skills.recursiveDrone.nextCastAt = reduce(rt.skills.recursiveDrone.nextCastAt);
      rt.skills.quantumSpike.nextCastAt = reduce(rt.skills.quantumSpike.nextCastAt);
      rt.skills.systemPurge.nextCastAt = reduce(rt.skills.systemPurge.nextCastAt);
      rt.skills.ghostFork.nextCastAt = reduce(rt.skills.ghostFork.nextCastAt);
      rt.skills.checksumBurst.nextCastAt = reduce(rt.skills.checksumBurst.nextCastAt);
      rt.skills.portSnare.nextCastAt = reduce(rt.skills.portSnare.nextCastAt);
      rt.skills.mirrorPacket.nextCastAt = reduce(rt.skills.mirrorPacket.nextCastAt);
      rt.skills.threadSplitter.nextCastAt = reduce(rt.skills.threadSplitter.nextCastAt);
      rt.skills.latencyField.nextCastAt = reduce(rt.skills.latencyField.nextCastAt);
      rt.skills.rootAccess.nextCastAt = reduce(rt.skills.rootAccess.nextCastAt);
    };

    if (item.kind === 'small_heal') {
      rt.player.hp = Math.min(rt.player.maxHp, rt.player.hp + 25);
    } else if (item.kind === 'big_heal') {
      rt.player.hp = Math.min(rt.player.maxHp, rt.player.hp + 60);
    } else if (item.kind === 'magnet_core') {
      for (const orb of rt.orbs) {
        orb.x = rt.player.x + (Math.random() * 20 - 10);
        orb.y = rt.player.y + (Math.random() * 20 - 10);
      }
    } else if (item.kind === 'clock_booster') {
      rt.player.speedBoostUntil = rt.elapsed + 8;
      rt.player.attackBoostUntil = rt.elapsed + 8;
    } else if (item.kind === 'shield_shard') {
      rt.player.shieldCharges = Math.max(rt.player.shieldCharges, 1);
    } else if (item.kind === 'emp_bomb') {
      for (const e of rt.enemies) {
        const dmg =
          e.kind === 'corrupted_cache' || e.kind === 'broken_process' || e.kind === 'firewall_guardian' || e.kind === 'kernel_reaper'
            ? 90
            : 260;
        applyEnemyHit(rt, e, dmg, rt.player.x, rt.player.y, 180, { stunSec: 0.12 });
      }
      rt.screenShake = 12;
      rt.glitchNoise = Math.max(rt.glitchNoise, 0.6);
    } else if (item.kind === 'overclock_chip') {
      rt.player.attackBoostUntil = Math.max(rt.player.attackBoostUntil, rt.elapsed + 10);
    } else if (item.kind === 'repair_nanites') {
      rt.player.regenBoostUntil = Math.max(rt.player.regenBoostUntil, rt.elapsed + 12);
    } else if (item.kind === 'data_vacuum') {
      rt.player.pickupBoostUntil = Math.max(rt.player.pickupBoostUntil, rt.elapsed + 15);
    } else if (item.kind === 'firewall_battery') {
      rt.player.defenseBoostUntil = Math.max(rt.player.defenseBoostUntil, rt.elapsed + 10);
    } else if (item.kind === 'critical_patch') {
      rt.player.critBoostUntil = Math.max(rt.player.critBoostUntil, rt.elapsed + 10);
    } else if (item.kind === 'cooldown_cache') {
      applyCooldownCache();
    } else if (item.kind === 'revival_fragment') {
      rt.player.reviveCharges += 1;
    } else if (item.kind === 'boss_key_fragment') {
      rt.nextChestMinRarity = 'rare';
    } else if (item.kind === 'xp_compressor') {
      rt.player.expBoostUntil = Math.max(rt.player.expBoostUntil, rt.elapsed + 12);
    } else if (item.kind === 'glitch_decoy') {
      rt.decoys.push({
        id: nextId(rt),
        x: rt.player.x,
        y: rt.player.y,
        ttl: 6,
        hp: 80,
      });
      spawnEffect(rt, rt.player.x, rt.player.y, 84, '#ffb978', 'nova', 0.62, 'recursive_drone');
      appendCombatLog(rt, '디코이 전개: 주변 적이 6초간 분산됩니다.', 'item', 4.4);
    } else if (item.kind === 'damage_amplifier') {
      rt.player.damageBoostUntil = Math.max(rt.player.damageBoostUntil, rt.elapsed + 9);
    } else if (item.kind === 'emergency_escape_protocol') {
      rt.player.invincibleUntil = Math.max(rt.player.invincibleUntil, rt.elapsed + 4);
      rt.player.emergencyEscapeUntil = Math.max(rt.player.emergencyEscapeUntil, rt.elapsed + 4);
      rt.player.speedBoostUntil = Math.max(rt.player.speedBoostUntil, rt.elapsed + 4);
    } else if (item.kind === 'upgrade_chest') {
      rt.levelupSource = 'upgradeChest';
      openLevelUp(rt, 'rare');
    } else if (item.kind === 'packet_battery') {
      rt.player.projectileBoostUntil = Math.max(rt.player.projectileBoostUntil, rt.elapsed + 10);
    } else if (item.kind === 'kernel_patch') {
      rt.player.armor = Math.min(0.78, rt.player.armor + 0.12);
    } else if (item.kind === 'hot_cache') {
      rt.nextChestMinRarity = 'rare';
    } else if (item.kind === 'rollback_token') {
      rt.player.hp = Math.min(rt.player.maxHp, rt.player.hp + rt.player.recentDamageTaken * 0.65);
      rt.player.recentDamageTaken = 0;
      rt.player.hitInvulnUntil = Math.max(rt.player.hitInvulnUntil, rt.elapsed + 0.2);
      for (const e of rt.enemies) {
        e.stunUntil = Math.max(e.stunUntil ?? 0, rt.elapsed + 0.1);
      }
    } else if (item.kind === 'vacuum_plus_plus_core') {
      rt.player.pickupBoostUntil = Math.max(rt.player.pickupBoostUntil, rt.elapsed + 8);
    } else if (item.kind === 'failover_shield') {
      rt.player.failoverShieldCharges = Math.max(rt.player.failoverShieldCharges, 1);
    } else if (item.kind === 'data_leech') {
      rt.player.dataLeechLevel = Math.min(4, rt.player.dataLeechLevel + 1);
    } else if (item.kind === 'clock_freeze_chip') {
      for (const e of rt.enemies) {
        e.slowUntil = Math.max(e.slowUntil ?? 0, rt.elapsed + 3);
      }
    } else if (item.kind === 'overheat_module') {
      rt.player.damageBoostUntil = Math.max(rt.player.damageBoostUntil, rt.elapsed + 12);
      rt.player.overheatPenaltyUntil = Math.max(rt.player.overheatPenaltyUntil, rt.elapsed + 15);
    } else if (item.kind === 'boss_trace_key') {
      rt.player.bossTraceStacks = Math.min(2, rt.player.bossTraceStacks + 1);
    }
  };

  const updateCombat = (rt: RuntimeState, dt: number) => {
    const p = rt.player;
    const hasteMove =
      rt.elapsed <= p.emergencyEscapeUntil ? 1.6 :
      rt.elapsed <= p.speedBoostUntil ? 1.35 : 1;
    const hasteAtkBase = rt.elapsed <= p.attackBoostUntil ? 0.8 : 1;
    const hasteAtkPenalty = rt.elapsed > p.damageBoostUntil && rt.elapsed <= p.overheatPenaltyUntil ? 1.45 : 1;
    const hasteAtk = hasteAtkBase * hasteAtkPenalty;
    const damageBoost = rt.elapsed <= p.damageBoostUntil ? 1.6 : 1;
    const projectileBonus = rt.elapsed <= p.projectileBoostUntil ? 1 : 0;
    const regenBoost = rt.elapsed <= p.regenBoostUntil ? 5 : 0;
    const damageMul = p.damageMultiplier * damageBoost;
    const getAimAngle = () => {
      const target = getNearestEnemy(rt, p.x, p.y);
      if (target) return Math.atan2(target.y - p.y, target.x - p.x);
      if (mx !== 0 || my !== 0) return Math.atan2(my, mx);
      return 0;
    };

    if (p.regenPerSecond > 0 || regenBoost > 0) {
      p.hp = Math.min(p.maxHp, p.hp + (p.regenPerSecond + regenBoost) * dt);
    }

    let mx = 0;
    let my = 0;
    if (keysRef.current.has('KeyW') || keysRef.current.has('ArrowUp')) my -= 1;
    if (keysRef.current.has('KeyS') || keysRef.current.has('ArrowDown')) my += 1;
    if (keysRef.current.has('KeyA') || keysRef.current.has('ArrowLeft')) mx -= 1;
    if (keysRef.current.has('KeyD') || keysRef.current.has('ArrowRight')) mx += 1;
    if (mx !== 0 || my !== 0) {
      const inv = 1 / Math.hypot(mx, my);
      p.x += mx * inv * p.moveSpeed * hasteMove * dt;
      p.y += my * inv * p.moveSpeed * hasteMove * dt;
    }
    p.x = clamp(p.x, p.r, CANVAS_WIDTH - p.r);
    p.y = clamp(p.y, p.r, CANVAS_HEIGHT - p.r);

    const debug = rt.skills.debugShot;
    if (rt.elapsed >= debug.nextFireAt) {
      const target = getNearestEnemy(rt, p.x, p.y);
      if (target) {
        debug.nextFireAt = rt.elapsed + debug.cooldown * p.attackCooldownMultiplier * hasteAtk;
        const baseAngle = Math.atan2(target.y - p.y, target.x - p.x);
        spawnEffect(rt, p.x, p.y, 18, '#65e8ff', 'cross', 0.16, 'debug_shot');
        playSfx('shoot');
        const count = debug.projectileCount + projectileBonus;
        for (let i = 0; i < count; i += 1) {
          const spread = count === 1 ? 0 : ((i - (count - 1) / 2) * 0.12);
          const angle = baseAngle + spread;
          const speed = debug.projectileSpeed * p.projectileSpeedMultiplier;
          pushProjectile(
            rt,
            'player',
            p.x,
            p.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            debug.damage * damageMul,
            1.8,
            4,
            '#2dd7ff',
            debug.pierce,
            {
              sourceSkill: 'debug_shot',
              knockback: SKILL_HIT_PROFILE.debug_shot.knockback,
              hitStunSec: SKILL_HIT_PROFILE.debug_shot.stunSec,
              hitSlowSec: SKILL_HIT_PROFILE.debug_shot.slowSec,
              hitVulnerableSec: SKILL_HIT_PROFILE.debug_shot.vulnerableSec,
            },
          );
        }
      }
    }

    if (rt.skills.unlocked.signal_orb) {
      const so = rt.skills.signalOrb;
      so.angle += so.rotationSpeed * dt;
      const orbsPos: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < so.count; i += 1) {
        const a = so.angle + (Math.PI * 2 * i) / so.count;
        orbsPos.push({
          x: p.x + Math.cos(a) * so.radius,
          y: p.y + Math.sin(a) * so.radius,
        });
      }
      for (const e of rt.enemies) {
        for (const op of orbsPos) {
          if (dist2(e.x, e.y, op.x, op.y) <= (e.r + 10) * (e.r + 10)) {
            applyEnemyHit(rt, e, so.damage * dt * damageMul, op.x, op.y, SKILL_HIT_PROFILE.signal_orb.knockback, {
              stunSec: SKILL_HIT_PROFILE.signal_orb.stunSec,
              slowSec: SKILL_HIT_PROFILE.signal_orb.slowSec,
              vulnerableSec: SKILL_HIT_PROFILE.signal_orb.vulnerableSec,
            });
          }
        }
      }
    }

    if (rt.skills.unlocked.firewall_ring) {
      const fr = rt.skills.firewallRing;
      if (rt.elapsed >= fr.nextFireAt) {
        fr.nextFireAt = rt.elapsed + fr.cooldown * p.attackCooldownMultiplier * hasteAtk;
        spawnEffect(rt, p.x, p.y, fr.radius, '#5fd9ff', 'ring', 0.45, 'firewall_ring');
        for (const e of rt.enemies) {
          if (dist2(e.x, e.y, p.x, p.y) <= fr.radius * fr.radius) {
            applyEnemyHit(rt, e, fr.damage * damageMul, p.x, p.y, SKILL_HIT_PROFILE.firewall_ring.knockback, {
              stunSec: SKILL_HIT_PROFILE.firewall_ring.stunSec,
            });
            if (fr.burn) {
              rt.hazards.push({
                id: nextId(rt),
                x: e.x,
                y: e.y,
                r: 46,
                telegraph: 0,
                active: 1.6,
                dps: 14,
                sourceSkill: 'firewall_ring',
              });
            }
          }
        }
        rt.screenShake = Math.max(rt.screenShake, 6);
      }
    }

    if (rt.skills.unlocked.packet_storm) {
      const ps = rt.skills.packetStorm;
      if (rt.elapsed >= ps.nextCastAt) {
        ps.nextCastAt = rt.elapsed + ps.cooldown * p.attackCooldownMultiplier * hasteAtk;
        spawnEffect(rt, p.x, p.y, 56, '#8ab8ff', 'nova', 0.3, 'packet_storm');
        const baseAngle = getAimAngle();
        const count = ps.projectileCount;
        for (let i = 0; i < count; i += 1) {
          const spread = count <= 1 ? 0 : ((i - (count - 1) / 2) * 0.14);
          const a = baseAngle + spread + (Math.random() * 0.08 - 0.04);
          const speed = ps.projectileSpeed * p.projectileSpeedMultiplier;
          pushProjectile(
            rt,
            'player',
            p.x,
            p.y,
            Math.cos(a) * speed,
            Math.sin(a) * speed,
            ps.damage * damageMul,
            1.3,
            3,
            '#7ec2ff',
            0,
            {
              sourceSkill: 'packet_storm',
              knockback: SKILL_HIT_PROFILE.packet_storm.knockback,
              hitStunSec: SKILL_HIT_PROFILE.packet_storm.stunSec,
              hitSlowSec: SKILL_HIT_PROFILE.packet_storm.slowSec,
              hitVulnerableSec: SKILL_HIT_PROFILE.packet_storm.vulnerableSec,
            },
          );
        }
        playSfx('shoot');
      }
    }

    if (rt.skills.unlocked.memory_mine) {
      const mm = rt.skills.memoryMine;
      if (rt.elapsed >= mm.nextDropAt) {
        mm.nextDropAt = rt.elapsed + mm.cooldown * p.attackCooldownMultiplier * hasteAtk;
        spawnEffect(rt, p.x, p.y, 24, '#ffb878', 'cross', 0.28, 'memory_mine');
        rt.mines.push({
          id: nextId(rt),
          x: p.x,
          y: p.y,
          r: mm.explosionRadius,
          damage: mm.damage * damageMul,
          ttl: 11,
          armedAt: rt.elapsed + 0.45,
          lingerPool: mm.leavePool,
        });
      }
    }

    if (rt.skills.unlocked.lucas_beam) {
      const lb = rt.skills.lucasBeam;
      if (rt.elapsed >= lb.nextCastAt) {
        const targets = getHighestHpEnemies(rt, lb.targetCount);
        if (targets.length > 0) {
          lb.nextCastAt = rt.elapsed + lb.cooldown * p.attackCooldownMultiplier * hasteAtk;
          const beamAngle = Math.atan2(targets[0].y - p.y, targets[0].x - p.x);
          spawnEffect(rt, p.x, p.y, 84, '#96fff2', 'slash', 0.45, 'lucas_beam', beamAngle);
          rt.skills.beamRender.activeUntil = rt.elapsed + lb.duration;
          rt.skills.beamRender.targetId = targets[0].id;
          rt.skills.beamRender.damagePerTick = lb.damagePerTick * damageMul;
          rt.skills.beamRender.tickAccum = 0;
          for (const t of targets) {
            applyEnemyHit(rt, t, lb.damagePerTick * lb.duration * damageMul, p.x, p.y, SKILL_HIT_PROFILE.lucas_beam.knockback, {
              vulnerableSec: SKILL_HIT_PROFILE.lucas_beam.vulnerableSec,
            });
          }
          playSfx('shoot');
        } else {
          lb.nextCastAt = rt.elapsed + 0.35;
        }
      }
    }

    if (rt.skills.unlocked.trace_blade) {
      const tb = rt.skills.traceBlade;
      if (rt.elapsed >= tb.nextCastAt) {
        tb.nextCastAt = rt.elapsed + tb.cooldown * p.attackCooldownMultiplier * hasteAtk;
        const baseAngle = getAimAngle();
        spawnEffect(rt, p.x, p.y, tb.range, '#8de9ff', 'slash', 0.32, 'trace_blade', baseAngle);
        
        const sweep = Math.PI * 0.72;
        const halfCone = Math.PI * 0.22;
        for (let hit = 0; hit < tb.comboHits; hit += 1) {
          const t = tb.comboHits <= 1 ? 0.5 : hit / (tb.comboHits - 1);
          const slashAngle = baseAngle - sweep * 0.5 + sweep * t;
          for (const e of rt.enemies) {
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            const d = Math.hypot(dx, dy);
            if (d > tb.range + e.r) continue;
            const a = Math.atan2(dy, dx);
            let diff = Math.abs(a - slashAngle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff <= halfCone) {
              const slashKnockback = SKILL_HIT_PROFILE.trace_blade.knockback * 2.15;
              applyEnemyHit(rt, e, tb.damage * 0.42 * damageMul, p.x, p.y, slashKnockback, {
                stunSec: SKILL_HIT_PROFILE.trace_blade.stunSec,
                vulnerableSec: SKILL_HIT_PROFILE.trace_blade.vulnerableSec,
              });
              // Immediate shove improves perceived impact for melee slash skills.
              const ux = dx / (d || 1);
              const uy = dy / (d || 1);
              e.x += ux * 9;
              e.y += uy * 9;
            }
          }
        }
      }
    }

    if (rt.skills.unlocked.null_grenade) {
      const ng = rt.skills.nullGrenade;
      if (rt.elapsed >= ng.nextCastAt) {
        let casted = false;
        for (let i = 0; i < ng.count; i += 1) {
          const target = getNearestEnemy(rt, p.x, p.y);
          if (!target) break;
          casted = true;
          const tx = target.x + (Math.random() * 80 - 40);
          const ty = target.y + (Math.random() * 80 - 40);
          spawnEffect(rt, tx, ty, ng.radius, '#ff8ebd', 'nova', 0.4, 'null_grenade');
          rt.hazards.push({
            id: nextId(rt),
            x: tx,
            y: ty,
            r: ng.radius,
            telegraph: 0.35,
            active: 0.45,
            dps: ng.damage * damageMul * 3.2,
            slowPercent: ng.slowPercent,
            source: 'player',
            sourceSkill: 'null_grenade',
          });
        }
        if (casted) {
          ng.nextCastAt = rt.elapsed + ng.cooldown * p.attackCooldownMultiplier * hasteAtk;
          playSfx('shoot');
        } else {
          ng.nextCastAt = rt.elapsed + 0.35;
        }
      }
    }

    if (rt.skills.unlocked.proxy_turret) {
      const pt = rt.skills.proxyTurret;
      if (rt.elapsed >= pt.nextCastAt) {
        pt.nextCastAt = rt.elapsed + pt.cooldown * p.attackCooldownMultiplier * hasteAtk;
        spawnEffect(rt, p.x, p.y, 36, '#8dff9a', 'cross', 0.3, 'proxy_turret');
        for (let i = 0; i < pt.turretCount; i += 1) {
          const a = (Math.PI * 2 * i) / Math.max(1, pt.turretCount);
          rt.turrets.push({
            id: nextId(rt),
            x: p.x + Math.cos(a) * 70,
            y: p.y + Math.sin(a) * 70,
            ttl: pt.duration,
            fireAccum: 0,
          });
        }
      }
    }

    // data_lightning is now a passive chain proc that triggers on projectile hits.

    if (rt.skills.unlocked.black_ice_field) {
      const bi = rt.skills.blackIceField;
      if (rt.elapsed >= bi.nextCastAt) {
        bi.nextCastAt = rt.elapsed + bi.cooldown * p.attackCooldownMultiplier * hasteAtk;
        spawnEffect(rt, p.x, p.y, bi.radius, '#9de6ff', 'ring', 0.46, 'black_ice_field');
        rt.hazards.push({
          id: nextId(rt),
          x: p.x,
          y: p.y,
          r: bi.radius,
          telegraph: 0,
          active: bi.duration,
          dps: bi.damagePerSecond * damageMul,
          slowPercent: bi.slowPercent,
          source: 'player',
          sourceSkill: 'black_ice_field',
        });
      }
    }

    if (rt.skills.unlocked.recursive_drone) {
      const rd = rt.skills.recursiveDrone;
      if (rt.elapsed >= rd.nextCastAt) {
        if (rt.enemies.length > 0) {
          rd.nextCastAt = rt.elapsed + rd.cooldown * p.attackCooldownMultiplier * hasteAtk;
          spawnEffect(rt, p.x, p.y, 52, '#ffad5f', 'nova', 0.24, 'recursive_drone');
          while (rt.recursiveDrones.length < rd.droneCount) {
            rt.recursiveDrones.push({
              id: nextId(rt),
              orbitOffset: Math.random() * Math.PI * 2,
              orbitRadius: 44 + Math.random() * 22,
              fireAccum: Math.random() * 0.3,
            });
          }
          if (rt.recursiveDrones.length > rd.droneCount) {
            rt.recursiveDrones.length = rd.droneCount;
          }
        } else {
          rd.nextCastAt = rt.elapsed + 0.35;
        }
      }
    }

    if (rt.skills.unlocked.quantum_spike) {
      const qs = rt.skills.quantumSpike;
      if (rt.elapsed >= qs.nextCastAt) {
        let casted = false;
        for (let i = 0; i < qs.spikeCount; i += 1) {
          const t = rt.enemies[Math.floor(Math.random() * rt.enemies.length)];
          if (!t) break;
          casted = true;
          rt.hazards.push({
            id: nextId(rt),
            x: t.x + (Math.random() * 50 - 25),
            y: t.y + (Math.random() * 50 - 25),
            r: qs.radius,
            telegraph: qs.warningDelay,
            active: 0.3,
            dps: qs.damage * damageMul * 3.6,
            source: 'player',
            sourceSkill: 'quantum_spike',
          });
        }
        if (casted) {
          qs.nextCastAt = rt.elapsed + qs.cooldown * p.attackCooldownMultiplier * hasteAtk;
          spawnEffect(rt, p.x, p.y, 68, '#c2a5ff', 'slash', 0.26, 'quantum_spike');
        } else {
          qs.nextCastAt = rt.elapsed + 0.35;
        }
      }
    }

    if (rt.skills.unlocked.system_purge) {
      const sp = rt.skills.systemPurge;
      if (rt.elapsed >= sp.nextCastAt) {
        sp.nextCastAt = rt.elapsed + sp.cooldown * p.attackCooldownMultiplier * hasteAtk;
        sp.pulseUntil = rt.elapsed + 1.2;
        spawnEffect(rt, p.x, p.y, 240, '#c6fbff', 'ring', 0.9, 'system_purge');
        rt.screenShake = Math.max(rt.screenShake, 12);
        for (const e of rt.enemies) {
          let mul = 1;
          if (e.kind === 'corrupted_cache' || e.kind === 'broken_process' || e.kind === 'firewall_guardian' || e.kind === 'kernel_reaper') {
            mul = sp.bossDamageMultiplier;
          } else if (e.kind === 'memory_golem' || e.kind === 'error_drone') {
            mul = sp.eliteDamageMultiplier;
          }
          applyEnemyHit(rt, e, sp.damage * damageMul * mul, p.x, p.y, SKILL_HIT_PROFILE.system_purge.knockback, {
            stunSec: SKILL_HIT_PROFILE.system_purge.stunSec,
            vulnerableSec: SKILL_HIT_PROFILE.system_purge.vulnerableSec,
          });
        }
      }
    }

    if (rt.skills.unlocked.ghost_fork) {
      const gf = rt.skills.ghostFork;
      if (rt.elapsed >= gf.nextCastAt) {
        gf.nextCastAt = rt.elapsed + gf.cooldown * p.attackCooldownMultiplier * hasteAtk;
        const triggerAt = rt.elapsed + gf.delay;
        const baseAngle = getAimAngle();
        for (let i = 0; i < 2; i += 1) {
          const a = baseAngle + (i === 0 ? -0.36 : 0.36);
          const cx = p.x + Math.cos(a) * 64;
          const cy = p.y + Math.sin(a) * 64;
          rt.ghostClones.push({
            id: nextId(rt),
            x: cx,
            y: cy,
            triggerAt,
            ttl: gf.delay + 0.42,
            range: gf.range * 0.78,
            damage: gf.damage * damageMul,
            fired: false,
          });
          spawnEffect(rt, cx, cy, gf.range * 0.58, '#9cdfff', 'slash', Math.max(0.45, gf.delay), 'ghost_fork', a);
        }
      }
    }

    if (rt.skills.unlocked.checksum_burst) {
      const cb = rt.skills.checksumBurst;
      if (rt.elapsed >= cb.nextCastAt) {
        cb.nextCastAt = rt.elapsed + cb.cooldown * p.attackCooldownMultiplier * hasteAtk;
        const coreCount = Math.min(4, 1 + Math.floor((rt.skillUpgradeStacks.checksum_burst ?? 0) / 2));
        for (let i = 0; i < coreCount; i += 1) {
          const a = rt.elapsed * 1.8 + (Math.PI * 2 * i) / coreCount;
          const cx = p.x + Math.cos(a) * (68 + 10 * (i % 2));
          const cy = p.y + Math.sin(a) * (68 + 10 * (i % 2));
          spawnEffect(rt, cx, cy, cb.radius * 0.6, '#ffd89a', 'ring', 0.62, 'checksum_burst');
          for (const e of rt.enemies) {
            if (dist2(e.x, e.y, cx, cy) > cb.radius * cb.radius) continue;
            const bonus = e.hp * cb.hpRatioDamage;
            applyEnemyHit(rt, e, (cb.baseDamage + bonus) * damageMul, cx, cy, SKILL_HIT_PROFILE.checksum_burst.knockback, {
              stunSec: SKILL_HIT_PROFILE.checksum_burst.stunSec,
              slowSec: SKILL_HIT_PROFILE.checksum_burst.slowSec,
              vulnerableSec: SKILL_HIT_PROFILE.checksum_burst.vulnerableSec,
            });
          }
        }
      }
    }

    if (rt.skills.unlocked.port_snare) {
      const psn = rt.skills.portSnare;
      if (rt.elapsed >= psn.nextCastAt) {
        const target = getNearestEnemy(rt, p.x, p.y);
        if (target) {
          psn.nextCastAt = rt.elapsed + psn.cooldown * p.attackCooldownMultiplier * hasteAtk;
          rt.hazards.push({
            id: nextId(rt),
            x: target.x,
            y: target.y,
            r: psn.radius,
            telegraph: 0.45,
            active: psn.duration,
            dps: psn.damage * damageMul,
            source: 'player',
            sourceSkill: 'port_snare',
          });
          spawnEffect(rt, target.x, target.y, psn.radius * 1.2, '#8fd0ff', 'cross', 0.64, 'port_snare');
        } else {
          psn.nextCastAt = rt.elapsed + 0.35;
        }
      }
    }

    // mirror_packet is now an always-on passive modifier for player projectiles.

    // thread_splitter is now an always-on passive modifier for player projectiles.

    if (rt.skills.unlocked.latency_field) {
      const lf = rt.skills.latencyField;
      if (rt.elapsed >= lf.nextCastAt) {
        lf.nextCastAt = rt.elapsed + lf.cooldown * p.attackCooldownMultiplier * hasteAtk;
        rt.hazards.push({
          id: nextId(rt),
          x: p.x,
          y: p.y,
          r: lf.radius,
          telegraph: 0,
          active: lf.duration,
          dps: lf.damagePerSecond * damageMul,
          slowPercent: lf.slowPercent * 100,
          source: 'player',
          sourceSkill: 'latency_field',
        });
        spawnEffect(rt, p.x, p.y, lf.radius * 1.15, '#92e5ff', 'ring', 0.82, 'latency_field');
      }
    }

    if (rt.skills.unlocked.root_access) {
      const ra = rt.skills.rootAccess;
      if (rt.elapsed >= ra.nextCastAt) {
        ra.nextCastAt = rt.elapsed + ra.cooldown * p.attackCooldownMultiplier;
        p.invincibleUntil = Math.max(p.invincibleUntil, rt.elapsed + ra.duration);
        rt.skills.debugShot.nextFireAt = rt.elapsed;
        rt.skills.firewallRing.nextFireAt = rt.elapsed;
        rt.skills.packetStorm.nextCastAt = rt.elapsed;
        rt.skills.memoryMine.nextDropAt = rt.elapsed;
        rt.skills.lucasBeam.nextCastAt = rt.elapsed;
        rt.skills.traceBlade.nextCastAt = rt.elapsed;
        rt.skills.nullGrenade.nextCastAt = rt.elapsed;
        rt.skills.proxyTurret.nextCastAt = rt.elapsed;
        rt.skills.dataLightning.nextCastAt = rt.elapsed;
        rt.skills.blackIceField.nextCastAt = rt.elapsed;
        rt.skills.recursiveDrone.nextCastAt = rt.elapsed;
        rt.skills.quantumSpike.nextCastAt = rt.elapsed;
        rt.skills.systemPurge.nextCastAt = rt.elapsed;
        rt.skills.ghostFork.nextCastAt = rt.elapsed;
        rt.skills.checksumBurst.nextCastAt = rt.elapsed;
        rt.skills.portSnare.nextCastAt = rt.elapsed;
        rt.skills.mirrorPacket.nextCastAt = rt.elapsed;
        rt.skills.threadSplitter.nextCastAt = rt.elapsed;
        rt.skills.latencyField.nextCastAt = rt.elapsed;
        spawnEffect(rt, p.x, p.y, 260, '#ffe3a9', 'nova', 1.02, 'root_access');
        rt.screenShake = Math.max(rt.screenShake, 10);
      }
    }
  };

  const updateEntities = (rt: RuntimeState, dt: number) => {
    for (let i = rt.projectiles.length - 1; i >= 0; i -= 1) {
      const b = rt.projectiles[i];
      const prevX = b.x;
      const prevY = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.travel = (b.travel ?? 0) + Math.hypot(b.x - prevX, b.y - prevY);
      b.life -= dt;
      if (
        rt.skills.unlocked.mirror_packet &&
        b.owner === 'player' &&
        !b.bounced &&
        (b.x < 0 || b.y < 0 || b.x > CANVAS_WIDTH || b.y > CANVAS_HEIGHT)
      ) {
        b.bounced = true;
        if (b.x < 0 || b.x > CANVAS_WIDTH) b.vx *= -1;
        if (b.y < 0 || b.y > CANVAS_HEIGHT) b.vy *= -1;
        b.x = clamp(b.x, 0, CANVAS_WIDTH);
        b.y = clamp(b.y, 0, CANVAS_HEIGHT);
      }
      if (b.life <= 0 || b.x < -90 || b.y < -90 || b.x > CANVAS_WIDTH + 90 || b.y > CANVAS_HEIGHT + 90) {
        rt.projectiles.splice(i, 1);
      }
    }

    for (const e of rt.enemies) {
      updateEnemyAI(rt, e, dt);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      const decay = Math.max(0, 1 - dt * 8.2);
      e.vx *= decay;
      e.vy *= decay;
      e.x = clamp(e.x, -120, CANVAS_WIDTH + 120);
      e.y = clamp(e.y, -120, CANVAS_HEIGHT + 120);
    }

    for (let i = rt.mines.length - 1; i >= 0; i -= 1) {
      const m = rt.mines[i];
      m.ttl -= dt;
      if (m.ttl <= 0) {
        rt.mines.splice(i, 1);
        continue;
      }
      if (rt.elapsed < m.armedAt) continue;
      let exploded = false;
      for (const e of rt.enemies) {
        if (dist2(e.x, e.y, m.x, m.y) <= (e.r + 12) * (e.r + 12)) {
          for (const k of rt.enemies) {
            if (dist2(k.x, k.y, m.x, m.y) <= m.r * m.r) {
              applyEnemyHit(rt, k, m.damage, m.x, m.y, SKILL_HIT_PROFILE.memory_mine.knockback, {
                stunSec: SKILL_HIT_PROFILE.memory_mine.stunSec,
                vulnerableSec: SKILL_HIT_PROFILE.memory_mine.vulnerableSec,
              });
            }
          }
          if (m.lingerPool) {
            rt.hazards.push({
              id: nextId(rt),
              x: m.x,
              y: m.y,
              r: m.r * 0.65,
              telegraph: 0,
              active: 2.6,
              dps: 16,
              sourceSkill: 'memory_mine',
            });
          }
          rt.screenShake = Math.max(rt.screenShake, 9);
          exploded = true;
          break;
        }
      }
      if (exploded) rt.mines.splice(i, 1);
    }

    for (let i = rt.hazards.length - 1; i >= 0; i -= 1) {
      const h = rt.hazards[i];
      if (h.telegraph > 0) {
        h.telegraph -= dt;
      } else {
        h.active -= dt;
      }
      if (h.telegraph <= 0 && h.active > 0) {
        if (h.source === 'player') {
          const profile = h.sourceSkill ? SKILL_HIT_PROFILE[h.sourceSkill] : null;
          const hazardKnockback = profile?.knockback ?? (h.r >= 100 ? 110 : 54);
          const hazardStunSec = profile?.stunSec ?? 0;
          const hazardSlowSec = profile?.slowSec ?? 0.25;
          const hazardVulnerableSec = profile?.vulnerableSec ?? 0;
          for (const e of rt.enemies) {
            if (dist2(e.x, e.y, h.x, h.y) <= (h.r + e.r) * (h.r + e.r)) {
              applyEnemyHit(rt, e, h.dps * dt, h.x, h.y, hazardKnockback, {
                stunSec: hazardStunSec,
                slowSec: hazardSlowSec,
                vulnerableSec: hazardVulnerableSec,
              });
              if (h.slowPercent) {
                e.slowUntil = Math.max(e.slowUntil ?? 0, rt.elapsed + 0.35);
              }
            }
          }
        } else {
          if (dist2(rt.player.x, rt.player.y, h.x, h.y) <= (h.r + rt.player.r) * (h.r + rt.player.r)) {
            if (rt.elapsed >= rt.player.hitInvulnUntil) {
              applyDamageToPlayer(rt, h.dps * dt);
            }
          }
        }
      }
      if (h.telegraph <= 0 && h.active <= 0) rt.hazards.splice(i, 1);
    }

    for (let i = rt.turrets.length - 1; i >= 0; i -= 1) {
      const t = rt.turrets[i];
      t.ttl -= dt;
      t.fireAccum += dt;
      if (t.ttl <= 0) {
        rt.turrets.splice(i, 1);
        continue;
      }

      const fireRate = rt.skills.proxyTurret.fireRate * rt.player.attackCooldownMultiplier;
      if (t.fireAccum >= fireRate) {
        t.fireAccum = 0;
        const target = [...rt.enemies]
          .filter((e) => dist2(e.x, e.y, t.x, t.y) <= rt.skills.proxyTurret.range * rt.skills.proxyTurret.range)
          .sort((a, b) => dist2(a.x, a.y, t.x, t.y) - dist2(b.x, b.y, t.x, t.y))[0];
        if (target) {
          const a = Math.atan2(target.y - t.y, target.x - t.x);
          pushProjectile(
            rt,
            'player',
            t.x,
            t.y,
            Math.cos(a) * 460,
            Math.sin(a) * 460,
            rt.skills.proxyTurret.damage * rt.player.damageMultiplier,
            1.4,
            3.5,
            '#8dff9a',
            0,
            {
              sourceSkill: 'proxy_turret',
              knockback: SKILL_HIT_PROFILE.proxy_turret.knockback,
              hitStunSec: SKILL_HIT_PROFILE.proxy_turret.stunSec,
              hitSlowSec: SKILL_HIT_PROFILE.proxy_turret.slowSec,
              hitVulnerableSec: SKILL_HIT_PROFILE.proxy_turret.vulnerableSec,
            },
          );
          playSfx('shoot');
        }
      }
    }

    if (rt.skills.unlocked.recursive_drone) {
      const rd = rt.skills.recursiveDrone;
      const fireRate = rd.cooldown * rt.player.attackCooldownMultiplier;
      for (const d of rt.recursiveDrones) {
        d.fireAccum += dt;
        if (d.fireAccum < fireRate) continue;
        d.fireAccum = 0;
        const a = d.orbitOffset + rt.elapsed * 2.2;
        const dx = rt.player.x + Math.cos(a) * d.orbitRadius;
        const dy = rt.player.y + Math.sin(a) * d.orbitRadius;
        const target = [...rt.enemies]
          .filter((e) => dist2(e.x, e.y, dx, dy) <= rd.range * rd.range)
          .sort((x, y) => dist2(x.x, x.y, dx, dy) - dist2(y.x, y.y, dx, dy))[0];
        if (!target) continue;
        const ta = Math.atan2(target.y - dy, target.x - dx);
        pushProjectile(rt, 'player', dx, dy, Math.cos(ta) * rd.projectileSpeed, Math.sin(ta) * rd.projectileSpeed, rd.damage * rt.player.damageMultiplier, 1.5, 3.5, '#ff9a47', 0, {
          sourceSkill: 'recursive_drone',
          knockback: SKILL_HIT_PROFILE.recursive_drone.knockback,
          hitStunSec: SKILL_HIT_PROFILE.recursive_drone.stunSec,
          hitSlowSec: SKILL_HIT_PROFILE.recursive_drone.slowSec,
          hitVulnerableSec: SKILL_HIT_PROFILE.recursive_drone.vulnerableSec,
        });
      }
      if (rt.recursiveDrones.length > rd.droneCount) rt.recursiveDrones.length = rd.droneCount;
    } else {
      rt.recursiveDrones = [];
    }

    for (let i = rt.ghostClones.length - 1; i >= 0; i -= 1) {
      const g = rt.ghostClones[i];
      g.ttl -= dt;
      if (!g.fired && rt.elapsed >= g.triggerAt) {
        g.fired = true;
        spawnEffect(rt, g.x, g.y, g.range, '#9cdfff', 'slash', 0.34, 'ghost_fork');
        for (const e of rt.enemies) {
          if (dist2(e.x, e.y, g.x, g.y) > (g.range + e.r) * (g.range + e.r)) continue;
          applyEnemyHit(rt, e, g.damage, g.x, g.y, SKILL_HIT_PROFILE.ghost_fork.knockback, {
            stunSec: SKILL_HIT_PROFILE.ghost_fork.stunSec,
            vulnerableSec: SKILL_HIT_PROFILE.ghost_fork.vulnerableSec,
          });
        }
      }
      if (g.ttl <= 0) rt.ghostClones.splice(i, 1);
    }

    if (rt.skills.unlocked.mirror_packet) {
      const nodeCount = Math.max(2, Math.min(5, 2 + Math.floor((rt.skillUpgradeStacks.mirror_packet ?? 0) / 2)));
      while (rt.mirrorNodes.length < nodeCount) {
        rt.mirrorNodes.push({
          id: nextId(rt),
          orbitOffset: Math.random() * Math.PI * 2,
          orbitRadius: 78 + Math.random() * 16,
          ttl: 999,
        });
      }
      if (rt.mirrorNodes.length > nodeCount) rt.mirrorNodes.length = nodeCount;
    } else {
      rt.mirrorNodes = [];
    }

    for (let i = rt.decoys.length - 1; i >= 0; i -= 1) {
      rt.decoys[i].ttl -= dt;
      if (rt.decoys[i].ttl <= 0) {
        rt.decoys.splice(i, 1);
      }
    }

    for (let i = rt.effects.length - 1; i >= 0; i -= 1) {
      rt.effects[i].ttl -= dt;
      if (rt.effects[i].ttl <= 0) {
        rt.effects.splice(i, 1);
      }
    }

    for (let i = rt.lightningLinks.length - 1; i >= 0; i -= 1) {
      rt.lightningLinks[i].ttl -= dt;
      if (rt.lightningLinks[i].ttl <= 0) rt.lightningLinks.splice(i, 1);
    }

    for (let i = rt.items.length - 1; i >= 0; i -= 1) {
      const it = rt.items[i];
      it.ttl -= dt;
      if (it.ttl <= 0) {
        rt.items.splice(i, 1);
        continue;
      }
      if (dist2(rt.player.x, rt.player.y, it.x, it.y) <= (rt.player.r + 12) * (rt.player.r + 12)) {
        applyItem(rt, it);
        rt.items.splice(i, 1);
      }
    }

    for (let i = rt.orbs.length - 1; i >= 0; i -= 1) {
      const orb = rt.orbs[i];
      const pickupBoost = rt.elapsed <= rt.player.pickupBoostUntil ? 3 : 1;
      const radius = rt.player.pickupRadius * pickupBoost;
      const d2 = dist2(orb.x, orb.y, rt.player.x, rt.player.y);
      if (d2 <= radius * radius) {
        const d = Math.sqrt(d2) || 1;
        orb.x += ((rt.player.x - orb.x) / d) * 380 * dt;
        orb.y += ((rt.player.y - orb.y) / d) * 380 * dt;
      }
      if (dist2(orb.x, orb.y, rt.player.x, rt.player.y) <= (rt.player.r + 8) * (rt.player.r + 8)) {
        const expBoost = rt.elapsed <= rt.player.expBoostUntil ? 1.5 : 1;
        rt.player.exp += orb.value * rt.player.expGainMultiplier * expBoost;
        rt.orbs.splice(i, 1);
      }
    }
  };

  const applyDamageToPlayer = (rt: RuntimeState, rawDamage: number) => {
    if (rt.elapsed < rt.player.invincibleUntil) return;
    if (rt.elapsed < rt.player.hitInvulnUntil) return;
    let damage = rawDamage;
    if (rt.player.shieldCharges > 0) {
      rt.player.shieldCharges -= 1;
      rt.player.hitInvulnUntil = rt.elapsed + 0.5;
      rt.player.hitPulseUntil = Math.max(rt.player.hitPulseUntil, rt.elapsed + 0.12);
      return;
    }
    const defenseBoost = rt.elapsed <= rt.player.defenseBoostUntil ? 0.35 : 0;
    damage *= (1 - clamp(rt.player.armor + defenseBoost, 0, 0.9));
    const criticalThreat = damage >= rt.player.maxHp * 0.32;
    if (criticalThreat && rt.player.failoverShieldCharges > 0) {
      rt.player.failoverShieldCharges -= 1;
      rt.player.hitInvulnUntil = rt.elapsed + 0.75;
      rt.player.hitPulseUntil = Math.max(rt.player.hitPulseUntil, rt.elapsed + 0.18);
      return;
    }
    rt.player.hp -= damage;
    rt.player.recentDamageTaken = Math.min(rt.player.maxHp * 2, rt.player.recentDamageTaken * 0.7 + damage);
    rt.player.hitInvulnUntil = rt.elapsed + 0.7;
    rt.player.hitPulseUntil = Math.max(rt.player.hitPulseUntil, rt.elapsed + 0.24);
    rt.lowHpFlash = 0.35;
    rt.screenShake = Math.max(rt.screenShake, 6);
    playSfx('hit');
  };

  const handleCollisions = (rt: RuntimeState) => {
    for (let i = rt.projectiles.length - 1; i >= 0; i -= 1) {
      const p = rt.projectiles[i];
      if (p.owner === 'player') {
        for (let j = rt.enemies.length - 1; j >= 0; j -= 1) {
          const e = rt.enemies[j];
          if (dist2(p.x, p.y, e.x, e.y) <= (p.r + e.r) * (p.r + e.r)) {
            const critBoost = rt.elapsed <= rt.player.critBoostUntil ? 0.35 : 0;
            const isCrit = Math.random() < Math.min(0.95, rt.player.criticalChance + critBoost);
            const damage = p.damage * (isCrit ? rt.player.criticalDamage : 1);
            const dead = applyEnemyHit(rt, e, damage, p.x - p.vx, p.y - p.vy, p.knockback ?? 128, {
              stunSec: p.hitStunSec,
              slowSec: p.hitSlowSec,
              vulnerableSec: p.hitVulnerableSec,
            });
            if (rt.skills.unlocked.stack_overflow) {
              const sof = rt.skills.stackOverflow;
              e.overflowStacks = (e.overflowStacks ?? 0) + 1;
              if (e.overflowStacks >= sof.threshold && rt.elapsed >= (e.overflowCooldownUntil ?? 0)) {
                e.overflowStacks = 0;
                e.overflowCooldownUntil = rt.elapsed + sof.cooldown;
                let seed = e;
                for (let c = 0; c < sof.chain && seed; c += 1) {
                  spawnEffect(rt, seed.x, seed.y, sof.radius, '#ffa9b5', 'nova', 0.3, 'stack_overflow');
                  for (const k of rt.enemies) {
                    if (dist2(k.x, k.y, seed.x, seed.y) <= sof.radius * sof.radius) {
                      applyEnemyHit(rt, k, sof.damage * rt.player.damageMultiplier, seed.x, seed.y, SKILL_HIT_PROFILE.stack_overflow.knockback, {
                        stunSec: SKILL_HIT_PROFILE.stack_overflow.stunSec,
                        slowSec: SKILL_HIT_PROFILE.stack_overflow.slowSec,
                        vulnerableSec: SKILL_HIT_PROFILE.stack_overflow.vulnerableSec,
                      });
                    }
                  }
                  seed = [...rt.enemies].sort((a, b) => dist2(a.x, a.y, seed.x, seed.y) - dist2(b.x, b.y, seed.x, seed.y))[0] ?? null;
                }
              }
            }
            if (dead) rt.enemies.splice(j, 1);

            if (rt.skills.unlocked.mirror_packet && p.owner === 'player' && !p.bounced) {
              p.bounced = true;
              const nearest = getNearestEnemy(rt, p.x, p.y);
              if (nearest && nearest.id !== e.id) {
                const angle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
                const speed = Math.hypot(p.vx, p.vy);
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.x += p.vx * 0.016;
                p.y += p.vy * 0.016;
              } else {
                p.vx *= -1;
                p.vy *= -1;
              }
              p.pierce = Math.max(p.pierce, 1);
            }
            if (rt.skills.unlocked.thread_splitter && p.owner === 'player' && !p.split) {
              p.split = true;
              const base = Math.atan2(p.vy, p.vx);
              const speed = Math.hypot(p.vx, p.vy);
              const a1 = base - 0.34;
              const a2 = base + 0.34;
              spawnEffect(rt, e.x, e.y, 62, '#90edff', 'cross', 0.28, 'thread_splitter');
              pushProjectile(rt, 'player', e.x, e.y, Math.cos(a1) * speed, Math.sin(a1) * speed, p.damage * 0.8, Math.max(0.4, p.life), p.r, p.color, 0, {
                sourceSkill: 'thread_splitter',
                knockback: p.knockback,
                hitStunSec: p.hitStunSec,
                hitSlowSec: p.hitSlowSec,
                hitVulnerableSec: p.hitVulnerableSec,
              });
              pushProjectile(rt, 'player', e.x, e.y, Math.cos(a2) * speed, Math.sin(a2) * speed, p.damage * 0.8, Math.max(0.4, p.life), p.r, p.color, 0, {
                sourceSkill: 'thread_splitter',
                knockback: p.knockback,
                hitStunSec: p.hitStunSec,
                hitSlowSec: p.hitSlowSec,
                hitVulnerableSec: p.hitVulnerableSec,
              });
            }
            if (rt.skills.unlocked.data_lightning && p.owner === 'player') {
              const dl = rt.skills.dataLightning;
              const alive = [...rt.enemies];
              let seed: Enemy | null = dead ? getNearestEnemy(rt, e.x, e.y) : e;
              const used = new Set<number>();
              let prevX = p.x;
              let prevY = p.y;
              for (let c = 0; c < dl.chainCount && seed; c += 1) {
                rt.lightningLinks.push({
                  id: nextId(rt),
                  fromX: prevX,
                  fromY: prevY,
                  toX: seed.x,
                  toY: seed.y,
                  ttl: 0.2,
                  maxTtl: 0.2,
                });
                applyEnemyHit(rt, seed, dl.damage * rt.player.damageMultiplier, prevX, prevY, SKILL_HIT_PROFILE.data_lightning.knockback, {
                  stunSec: SKILL_HIT_PROFILE.data_lightning.stunSec,
                  slowSec: SKILL_HIT_PROFILE.data_lightning.slowSec,
                });
                used.add(seed.id);
                prevX = seed.x;
                prevY = seed.y;
                const next = alive
                  .filter((x) => !used.has(x.id))
                  .sort((a, b) => dist2(a.x, a.y, seed!.x, seed!.y) - dist2(b.x, b.y, seed!.x, seed!.y))[0];
                if (!next) break;
                if (dist2(next.x, next.y, seed.x, seed.y) > dl.chainRange * dl.chainRange) break;
                seed = next;
              }
            }
            if (p.pierce <= 0) {
              rt.projectiles.splice(i, 1);
              break;
            }
            p.pierce -= 1;
          }
        }
      } else {
        if (dist2(p.x, p.y, rt.player.x, rt.player.y) <= (p.r + rt.player.r) * (p.r + rt.player.r)) {
          applyDamageToPlayer(rt, p.damage);
          rt.projectiles.splice(i, 1);
        }
      }
    }

    for (const e of rt.enemies) {
      for (const d of rt.decoys) {
        if (dist2(e.x, e.y, d.x, d.y) <= (e.r + 12) * (e.r + 12)) {
          d.hp -= e.damage * 0.12;
        }
      }
    }
    rt.decoys = rt.decoys.filter((d) => d.hp > 0 && d.ttl > 0);

    for (const e of rt.enemies) {
      if (dist2(e.x, e.y, rt.player.x, rt.player.y) <= (e.r + rt.player.r) * (e.r + rt.player.r)) {
        applyDamageToPlayer(rt, e.damage);
      }
    }
  };

  const updateLevel = (rt: RuntimeState) => {
    const need = getExpToNextLevel(rt.player.level);
    rt.player.expToNext = need;
    if (rt.player.exp < need) return;
    rt.player.exp -= need;
    rt.player.level += 1;
    openLevelUp(rt, 'common');
  };

  const runSkillSmokeTest = useCallback(() => {
    const scenarios: Array<{ skill: SkillId; ok: boolean; detail: string }> = [];
    const skillIds = Object.keys(SKILL_LABELS) as SkillId[];
    sfxMutedRef.current = true;
    try {
      for (const skill of skillIds) {
        const rt = createRuntime();
        rt.status = 'running';
        rt.elapsed = 45;

        (Object.keys(rt.skills.unlocked) as SkillId[]).forEach((k) => {
          rt.skills.unlocked[k] = false;
        });
        rt.skills.unlocked[skill] = true;
        if (skill !== 'debug_shot') {
          rt.skills.unlocked.debug_shot = false;
        }

        rt.skills.debugShot.nextFireAt = 0;
        rt.skills.firewallRing.nextFireAt = 0;
        rt.skills.packetStorm.nextCastAt = 0;
        rt.skills.memoryMine.nextDropAt = 0;
        rt.skills.lucasBeam.nextCastAt = 0;
        rt.skills.traceBlade.nextCastAt = 0;
        rt.skills.nullGrenade.nextCastAt = 0;
        rt.skills.proxyTurret.nextCastAt = 0;
        rt.skills.dataLightning.nextCastAt = 0;
        rt.skills.blackIceField.nextCastAt = 0;
        rt.skills.recursiveDrone.nextCastAt = 0;
        rt.skills.quantumSpike.nextCastAt = 0;
        rt.skills.systemPurge.nextCastAt = 0;
        rt.skills.ghostFork.nextCastAt = 0;
        rt.skills.checksumBurst.nextCastAt = 0;
        rt.skills.portSnare.nextCastAt = 0;
        rt.skills.stackOverflow.nextBurstAt = 0;
        rt.skills.mirrorPacket.nextCastAt = 0;
        rt.skills.threadSplitter.nextCastAt = 0;
        rt.skills.latencyField.nextCastAt = 0;
        rt.skills.rootAccess.nextCastAt = 0;

        const spawnDummy = (x: number, y: number) => ({
          id: rt.idSeq++,
          kind: 'noise_slime' as const,
          x,
          y,
          vx: 0,
          vy: 0,
          r: ENEMY_BASE.noise_slime.radius,
          hp: 70,
          maxHp: 70,
          speed: 0,
          damage: 0,
          exp: 1,
          color: ENEMY_BASE.noise_slime.color,
          aiCooldown: 999,
          summonCooldown: 999,
          dashCooldown: 999,
          dashTelegraph: 0,
          dashTargetX: 0,
          dashTargetY: 0,
          phaseTriggered: false,
        });

        rt.enemies.push(
          spawnDummy(rt.player.x + 40, rt.player.y),
          spawnDummy(rt.player.x - 60, rt.player.y - 20),
          spawnDummy(rt.player.x + 20, rt.player.y + 70),
          spawnDummy(rt.player.x - 85, rt.player.y + 10),
        );

        const hpBefore = rt.enemies.reduce((sum, e) => sum + e.hp, 0);
        updateCombat(rt, 0.2);
        updateEntities(rt, 0.2);
        handleCollisions(rt);
        updateEntities(rt, 0.2);
        handleCollisions(rt);
        const hpAfter = rt.enemies.reduce((sum, e) => sum + e.hp, 0);

        const hasDamage = hpAfter < hpBefore;
        const hasProjectile = rt.projectiles.length > 0;
        const hasHazard = rt.hazards.length > 0;
        const hasMine = rt.mines.length > 0;
        const hasTurret = rt.turrets.length > 0;
        const hasBeam = rt.skills.beamRender.activeUntil > rt.elapsed;
        const hasPurge = rt.skills.systemPurge.pulseUntil > rt.elapsed;

        const ok =
          skill === 'debug_shot' ? hasProjectile :
          skill === 'signal_orb' ? hasDamage :
          skill === 'firewall_ring' ? hasDamage :
          skill === 'packet_storm' ? hasProjectile :
          skill === 'memory_mine' ? hasMine :
          skill === 'lucas_beam' ? hasBeam :
          skill === 'trace_blade' ? hasDamage :
          skill === 'null_grenade' ? hasHazard :
          skill === 'proxy_turret' ? hasTurret :
          skill === 'data_lightning' ? hasDamage :
          skill === 'black_ice_field' ? hasHazard :
          skill === 'recursive_drone' ? hasProjectile :
          skill === 'quantum_spike' ? hasHazard :
          skill === 'system_purge' ? hasPurge :
          skill === 'ghost_fork' ? hasHazard :
          skill === 'checksum_burst' ? hasDamage :
          skill === 'port_snare' ? hasHazard :
          skill === 'stack_overflow' ? hasDamage :
          skill === 'mirror_packet' ? hasProjectile :
          skill === 'thread_splitter' ? hasProjectile :
          skill === 'latency_field' ? hasHazard :
          hasPurge;

        scenarios.push({
          skill,
          ok,
          detail: `damage=${hasDamage} projectile=${hasProjectile} hazard=${hasHazard} mine=${hasMine} turret=${hasTurret} beam=${hasBeam} purge=${hasPurge}`,
        });
      }
    } finally {
      sfxMutedRef.current = false;
    }

    return scenarios;
  }, [handleCollisions, updateCombat, updateEntities]);

  const getSkillCooldowns = (rt: RuntimeState): HudState['skillCooldowns'] => {
    const now = rt.elapsed;
    const rows: HudState['skillCooldowns'] = [];
    const push = (id: keyof RuntimeState['skills']['unlocked'], icon: string, nextAt: number, total: number) => {
      if (!rt.skills.unlocked[id]) return;
      rows.push({
        id,
        label: SKILL_LABELS[id],
        icon,
        rarity: SKILL_RARITY[id],
        stack: rt.skillUpgradeStacks[id] ?? 0,
        isNew: now < (rt.skillNewUntil[id] ?? 0),
        description: SKILL_DESCRIPTIONS[id],
        remaining: Math.max(0, nextAt - now),
        total: Math.max(0.1, total),
      });
    };

    push('debug_shot', 'DBG', rt.skills.debugShot.nextFireAt, rt.skills.debugShot.cooldown);
    push('signal_orb', 'ORB', now, 1);
    push('firewall_ring', 'FWR', rt.skills.firewallRing.nextFireAt, rt.skills.firewallRing.cooldown);
    push('packet_storm', 'PKT', rt.skills.packetStorm.nextCastAt, rt.skills.packetStorm.cooldown);
    push('memory_mine', 'MNE', rt.skills.memoryMine.nextDropAt, rt.skills.memoryMine.cooldown);
    push('lucas_beam', 'BEAM', rt.skills.lucasBeam.nextCastAt, rt.skills.lucasBeam.cooldown);
    push('trace_blade', 'TRC', rt.skills.traceBlade.nextCastAt, rt.skills.traceBlade.cooldown);
    push('null_grenade', 'NUL', rt.skills.nullGrenade.nextCastAt, rt.skills.nullGrenade.cooldown);
    push('proxy_turret', 'TUR', rt.skills.proxyTurret.nextCastAt, rt.skills.proxyTurret.cooldown);
    push('data_lightning', 'LGT', now, 1);
    push('black_ice_field', 'ICE', rt.skills.blackIceField.nextCastAt, rt.skills.blackIceField.cooldown);
    push('recursive_drone', 'DRN', rt.skills.recursiveDrone.nextCastAt, rt.skills.recursiveDrone.cooldown);
    push('quantum_spike', 'SPK', rt.skills.quantumSpike.nextCastAt, rt.skills.quantumSpike.cooldown);
    push('system_purge', 'PRG', rt.skills.systemPurge.nextCastAt, rt.skills.systemPurge.cooldown);
    push('ghost_fork', 'GFK', rt.skills.ghostFork.nextCastAt, rt.skills.ghostFork.cooldown);
    push('checksum_burst', 'CHK', rt.skills.checksumBurst.nextCastAt, rt.skills.checksumBurst.cooldown);
    push('port_snare', 'PSN', rt.skills.portSnare.nextCastAt, rt.skills.portSnare.cooldown);
    push('stack_overflow', 'SOF', now, 1);
    push('mirror_packet', 'MIR', now, 1);
    push('thread_splitter', 'THR', now, 1);
    push('latency_field', 'LAT', rt.skills.latencyField.nextCastAt, rt.skills.latencyField.cooldown);
    push('root_access', 'ROOT', rt.skills.rootAccess.nextCastAt, rt.skills.rootAccess.cooldown);
    return rows;
  };

  const getStatsPanel = (rt: RuntimeState): HudState['statsPanel'] => {
    const p = rt.player;
    return [
      { key: '\uD604\uC7AC \uCCB4\uB825', value: `${Math.max(0, p.hp).toFixed(0)} / ${p.maxHp.toFixed(0)}` },
      { key: '\uCD5C\uC885 \uACF5\uACA9 \uBC30\uC728', value: `${(p.damageMultiplier * 100).toFixed(0)}%` },
      { key: '재사용 대기시간 감소', value: `${((1 - p.attackCooldownMultiplier) * 100).toFixed(0)}%` },
      { key: '\uCE58\uBA85\uD0C0 \uD655\uB960', value: `${(p.criticalChance * 100).toFixed(1)}%` },
      { key: '\uCE58\uBA85\uD0C0 \uBC30\uC728', value: `${p.criticalDamage.toFixed(2)}x` },
      { key: '\uD53C\uD574 \uAC10\uC18C(\uBC29\uC5B4)', value: `${(p.armor * 100).toFixed(0)}%` },
      { key: '\uAE30\uBCF8 \uC7AC\uC0DD', value: `${p.regenPerSecond.toFixed(1)} /s` },
      { key: '\uC774\uB3D9 \uC18D\uB3C4', value: `${p.moveSpeed.toFixed(0)}` },
      { key: '\uD761\uC218 \uBC18\uACBD', value: `${p.pickupRadius.toFixed(0)}` },
      { key: '\uACBD\uD5D8\uCE58 \uD68D\uB4DD \uBC30\uC728', value: `${(p.expGainMultiplier * 100).toFixed(0)}%` },
      { key: '\uBD80\uD65C \uD69F\uC218', value: `${p.reviveCharges}` },
      { key: '\uB204\uC801 \uC5C5\uADF8\uB808\uC774\uB4DC', value: `${rt.selectedUpgrades.length}` },
    ];
  };

  const getActiveBuffs = (rt: RuntimeState): HudState['activeBuffs'] => {
    const now = rt.elapsed;
    const p = rt.player;
    const buffs: HudState['activeBuffs'] = [];
    const push = (id: string, label: string, until: number) => {
      if (until <= now) return;
      buffs.push({ id, label, remaining: Math.max(0, until - now) });
    };

    push('clock_booster_move', '클럭 부스터: 이동 속도 증가', p.speedBoostUntil);
    push('clock_booster_atk', '클럭 부스터: 공격 속도 증가', p.attackBoostUntil);
    push('overclock_chip', '오버클럭 칩: 공격 속도 증가', p.attackBoostUntil);
    push('repair_nanites', '리페어 나나이트: 체력 재생', p.regenBoostUntil);
    push('data_vacuum', '데이터 베큠: 흡수 반경 증가', p.pickupBoostUntil);
    push('firewall_battery', '파이어월 배터리: 피해 감소', p.defenseBoostUntil);
    push('critical_patch', '치명타 패치: 치명타 강화', p.critBoostUntil);
    push('xp_compressor', '경험치 컴프레서: 경험치 증가', p.expBoostUntil);
    push('damage_amplifier', '피해 증폭기: 피해 증가', p.damageBoostUntil);
    push('packet_battery', '패킷 배터리: 발사체 +1', p.projectileBoostUntil);
    push('overheat_penalty', '오버히트 페널티: 공격 속도 저하', p.overheatPenaltyUntil);
    push('emergency_escape', '비상 탈출: 무적 + 이동 속도 증가', p.emergencyEscapeUntil);
    push('invincible', '\uD53C\uACA9 \uBB34\uC801 \uC2DC\uAC04', p.invincibleUntil);

    if (p.shieldCharges > 0) {
      buffs.push({ id: 'shield_charge', label: `실드 충전: ${p.shieldCharges}`, remaining: 0 });
    }
    if (p.reviveCharges > 0) {
      buffs.push({ id: 'revive_charge', label: `부활 충전: ${p.reviveCharges}`, remaining: 0 });
    }
    if (p.failoverShieldCharges > 0) {
      buffs.push({ id: 'failover', label: `페일오버 실드: ${p.failoverShieldCharges}`, remaining: 0 });
    }
    if (p.dataLeechLevel > 0) {
      buffs.push({ id: 'data_leech', label: `데이터 리치 Lv.${p.dataLeechLevel}`, remaining: 0 });
    }
    if (p.bossTraceStacks > 0) {
      buffs.push({ id: 'boss_trace', label: `보스 추적 +${(p.bossTraceStacks * 18).toFixed(0)}%`, remaining: 0 });
    }
    return buffs.slice(0, 9);
  };

  const getResultRank = (rt: RuntimeState) => {
    const clearBonus = rt.status === 'clear' ? 520 : 0;
    const timeScore = (rt.elapsed / GAME_SECONDS) * 280;
    const killScore = rt.kills * 1.9;
    const levelScore = rt.player.level * 22;
    const bossScore = rt.bossKills * 120;
    const total = clearBonus + timeScore + killScore + levelScore + bossScore;
    if (total >= 920) return 'S+';
    if (total >= 760) return 'S';
    if (total >= 620) return 'A';
    if (total >= 480) return 'B';
    if (total >= 340) return 'C';
    return 'D';
  };

  const buildHudState = (rt: RuntimeState): HudState => {
    const bossPriority: EnemyKind[] = ['kernel_reaper', 'firewall_guardian', 'broken_process', 'corrupted_cache'];
    let bossHp: HudState['bossHp'] = null;
    for (const kind of bossPriority) {
      const boss = rt.enemies.find((e) => e.kind === kind);
      if (boss) {
        const name =
          kind === 'kernel_reaper' ? '커널 리퍼'
          : kind === 'firewall_guardian' ? '파이어월 가디언'
          : kind === 'broken_process' ? '브로큰 프로세스'
          : '오염 캐시';
        bossHp = {
          name,
          percent: clamp((boss.hp / boss.maxHp) * 100, 0, 100),
        };
        break;
      }
    }

    const warningText = rt.warnings.until > rt.elapsed ? rt.warnings.text : null;
    const combatLogs = rt.eventLogs
      .slice(-7)
      .map((e) => ({ id: e.id, text: e.text, type: e.type }));
    const skills = (Object.keys(rt.skills.unlocked) as Array<keyof RuntimeState['skills']['unlocked']>)
      .filter((k) => rt.skills.unlocked[k])
      .map((k) => SKILL_LABELS[k]);

    const result = rt.status === 'clear' || rt.status === 'failed'
      ? {
        title: rt.status === 'clear' ? '임무 완료' : '임무 실패',
        desc: rt.status === 'clear' ? SYSTEM_TEXT.clear : SYSTEM_TEXT.failed,
        elapsedText: formatTime(rt.elapsed),
        rank: getResultRank(rt),
        kills: rt.kills,
        level: rt.player.level,
        upgradeNames: rt.selectedUpgrades,
        skillNames: skills,
        bossKills: rt.bossKills,
      }
      : null;

    return {
      timerText: formatTime(GAME_SECONDS - rt.elapsed),
      hpPercent: clamp((rt.player.hp / rt.player.maxHp) * 100, 0, 100),
      expPercent: clamp((rt.player.exp / rt.player.expToNext) * 100, 0, 100),
      level: rt.player.level,
      kills: rt.kills,
      bossHp,
      warningText,
      combatLogs,
      skillList: skills,
      skillCooldowns: getSkillCooldowns(rt),
      activeBuffs: getActiveBuffs(rt),
      statsPanel: getStatsPanel(rt),
      status: rt.status,
      result,
    };
  };

  const draw = useCallback((rt: RuntimeState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const sprites = spriteStoreRef.current;

    const shake = rt.screenShake;
    const sx = shake > 0 ? (Math.random() * 2 - 1) * shake : 0;
    const sy = shake > 0 ? (Math.random() * 2 - 1) * shake : 0;
    ctx.save();
    ctx.translate(sx, sy);

    ctx.fillStyle = '#030a15';
    ctx.fillRect(-80, -80, CANVAS_WIDTH + 160, CANVAS_HEIGHT + 160);

    rt.gridOffset += 0.8;
    const gridY = rt.gridOffset % 42;
    ctx.strokeStyle = 'rgba(48,95,160,0.24)';
    ctx.lineWidth = 1;
    for (let x = -40; x <= CANVAS_WIDTH + 40; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, -40);
      ctx.lineTo(x, CANVAS_HEIGHT + 40);
      ctx.stroke();
    }
    for (let y = -40 + gridY; y <= CANVAS_HEIGHT + 40; y += 42) {
      ctx.beginPath();
      ctx.moveTo(-40, y);
      ctx.lineTo(CANVAS_WIDTH + 40, y);
      ctx.stroke();
    }

    if (Math.random() < rt.glitchNoise * 0.14) {
      const gx = Math.random() * CANVAS_WIDTH;
      const gy = Math.random() * CANVAS_HEIGHT;
      const gw = 70 + Math.random() * 180;
      const gh = 5 + Math.random() * 18;
      ctx.fillStyle = 'rgba(132, 211, 255, 0.18)';
      ctx.fillRect(gx, gy, gw, gh);
    }

    const p = rt.player;
    const glow = ctx.createRadialGradient(p.x, p.y, 30, p.x, p.y, 420);
    glow.addColorStop(0, 'rgba(80,160,255,0.2)');
    glow.addColorStop(1, 'rgba(20,40,80,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const fx of rt.effects) {
      const t = fx.ttl / fx.maxTtl;
      const rr = fx.radius * (1 - t * 0.45);
      const skillFrame = fx.skillId ? getAnimFrame(sprites[skillToKey(fx.skillId)], rt.elapsed, 10) : null;
      ctx.save();
      ctx.globalAlpha = Math.max(0.1, Math.min(1, t * 1.12));
      if (skillFrame) {
        const scale = fx.skillId ? (SKILL_FX_SCALE[fx.skillId] ?? 1.4) : 1.35;
        const glowColor = fx.skillId ? (SKILL_FX_COLOR[fx.skillId] ?? fx.color) : fx.color;
        const size = rr * scale * 1.16;
        const halo = ctx.createRadialGradient(fx.x, fx.y, size * 0.18, fx.x, fx.y, size * 0.88);
        halo.addColorStop(0, `${glowColor}88`);
        halo.addColorStop(1, `${glowColor}00`);
        ctx.fillStyle = halo;
        ctx.fillRect(fx.x - size, fx.y - size, size * 2, size * 2);
        ctx.strokeStyle = `${glowColor}cc`;
        ctx.lineWidth = 2 + (1 - t) * 3.6;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, size * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, size * 0.68, 0, Math.PI * 2);
        ctx.stroke();
        if (fx.skillId && DIRECTIONAL_SKILLS.has(fx.skillId)) {
          drawImageCenteredRotated(ctx, skillFrame, fx.x, fx.y, size, size, fx.angle ?? 0, Math.max(0.45, t));
        } else {
          drawImageCentered(ctx, skillFrame, fx.x, fx.y, size, size, Math.max(0.45, t));
        }
        if (fx.skillId) {
          const phase = 1 - t;
          ctx.strokeStyle = `${glowColor}d0`;
          ctx.fillStyle = `${glowColor}44`;
          switch (fx.skillId) {
            case 'debug_shot': {
              ctx.lineWidth = 1.5;
              for (let i = 0; i < 4; i += 1) {
                const a = rt.elapsed * 8 + (Math.PI * 2 * i) / 4;
                ctx.beginPath();
                ctx.moveTo(fx.x + Math.cos(a) * (size * 0.24), fx.y + Math.sin(a) * (size * 0.24));
                ctx.lineTo(fx.x + Math.cos(a) * (size * 0.66), fx.y + Math.sin(a) * (size * 0.66));
                ctx.stroke();
              }
              break;
            }
            case 'signal_orb': {
              ctx.setLineDash([3, 2]);
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(fx.x, fx.y, size * 0.78, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
              break;
            }
            case 'firewall_ring': {
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              ctx.arc(fx.x, fx.y, size * (0.78 + phase * 0.2), 0, Math.PI * 2);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(fx.x, fx.y, size * 0.34, 0, Math.PI * 2);
              ctx.stroke();
              break;
            }
            case 'packet_storm': {
              ctx.lineWidth = 1.6;
              for (let i = 0; i < 8; i += 1) {
                const a = rt.elapsed * 4 + (Math.PI * 2 * i) / 8;
                ctx.beginPath();
                ctx.moveTo(fx.x, fx.y);
                ctx.lineTo(fx.x + Math.cos(a) * (size * 0.86), fx.y + Math.sin(a) * (size * 0.86));
                ctx.stroke();
              }
              break;
            }
            case 'memory_mine': {
              ctx.lineWidth = 1.8;
              ctx.strokeRect(fx.x - size * 0.42, fx.y - size * 0.42, size * 0.84, size * 0.84);
              ctx.beginPath();
              ctx.moveTo(fx.x - size * 0.5, fx.y);
              ctx.lineTo(fx.x + size * 0.5, fx.y);
              ctx.moveTo(fx.x, fx.y - size * 0.5);
              ctx.lineTo(fx.x, fx.y + size * 0.5);
              ctx.stroke();
              break;
            }
            case 'lucas_beam': {
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.arc(fx.x, fx.y, size * 0.9, 0, Math.PI * 2);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(fx.x - size * 0.82, fx.y);
              ctx.lineTo(fx.x + size * 0.82, fx.y);
              ctx.moveTo(fx.x, fx.y - size * 0.82);
              ctx.lineTo(fx.x, fx.y + size * 0.82);
              ctx.stroke();
              break;
            }
            case 'trace_blade': {
              ctx.lineWidth = 2.3;
              for (let i = 0; i < 3; i += 1) {
                const rr2 = size * (0.44 + i * 0.12);
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, rr2, -Math.PI * 0.22, Math.PI * 0.22);
                ctx.stroke();
              }
              break;
            }
            case 'null_grenade': {
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.arc(fx.x, fx.y, size * 0.82, 0, Math.PI * 2);
              ctx.stroke();
              for (let i = 0; i < 6; i += 1) {
                const a = (Math.PI * 2 * i) / 6 + rt.elapsed * 2.2;
                ctx.fillRect(fx.x + Math.cos(a) * size * 0.74 - 1.5, fx.y + Math.sin(a) * size * 0.74 - 1.5, 3, 3);
              }
              break;
            }
            case 'proxy_turret': {
              ctx.lineWidth = 1.6;
              ctx.strokeRect(fx.x - size * 0.5, fx.y - size * 0.5, size, size);
              ctx.strokeRect(fx.x - size * 0.3, fx.y - size * 0.3, size * 0.6, size * 0.6);
              break;
            }
            case 'data_lightning': {
              ctx.lineWidth = 1.7;
              for (let i = 0; i < 3; i += 1) {
                const a = rt.elapsed * 6 + (Math.PI * 2 * i) / 3;
                const p1x = fx.x + Math.cos(a) * size * 0.28;
                const p1y = fx.y + Math.sin(a) * size * 0.28;
                const p2x = fx.x + Math.cos(a + 0.35) * size * 0.56;
                const p2y = fx.y + Math.sin(a + 0.35) * size * 0.56;
                const p3x = fx.x + Math.cos(a - 0.18) * size * 0.88;
                const p3y = fx.y + Math.sin(a - 0.18) * size * 0.88;
                ctx.beginPath();
                ctx.moveTo(fx.x, fx.y);
                ctx.lineTo(p1x, p1y);
                ctx.lineTo(p2x, p2y);
                ctx.lineTo(p3x, p3y);
                ctx.stroke();
              }
              break;
            }
            case 'black_ice_field': {
              ctx.lineWidth = 1.6;
              for (let i = 0; i < 6; i += 1) {
                const a = (Math.PI * 2 * i) / 6;
                ctx.beginPath();
                ctx.moveTo(fx.x, fx.y);
                ctx.lineTo(fx.x + Math.cos(a) * size * 0.76, fx.y + Math.sin(a) * size * 0.76);
                ctx.stroke();
              }
              break;
            }
            case 'recursive_drone': {
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.arc(fx.x, fx.y, size * 0.75, 0, Math.PI * 2);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(fx.x, fx.y, size * 0.55, 0, Math.PI * 2);
              ctx.stroke();
              break;
            }
            case 'quantum_spike': {
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(fx.x, fx.y - size * 0.85);
              ctx.lineTo(fx.x + size * 0.85, fx.y);
              ctx.lineTo(fx.x, fx.y + size * 0.85);
              ctx.lineTo(fx.x - size * 0.85, fx.y);
              ctx.closePath();
              ctx.stroke();
              break;
            }
            case 'system_purge': {
              ctx.lineWidth = 2.6;
              for (let i = 0; i < 3; i += 1) {
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, size * (0.46 + i * 0.22), 0, Math.PI * 2);
                ctx.stroke();
              }
              break;
            }
            case 'ghost_fork': {
              ctx.lineWidth = 2.8;
              ctx.beginPath();
              ctx.moveTo(fx.x - size * 0.8, fx.y - size * 0.8);
              ctx.lineTo(fx.x + size * 0.8, fx.y + size * 0.8);
              ctx.moveTo(fx.x + size * 0.8, fx.y - size * 0.8);
              ctx.lineTo(fx.x - size * 0.8, fx.y + size * 0.8);
              ctx.stroke();
              break;
            }
            case 'checksum_burst': {
              ctx.lineWidth = 2.2;
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.arc(fx.x, fx.y, size * 0.82, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
              for (let i = 0; i < 8; i += 1) {
                const a = (Math.PI * 2 * i) / 8;
                ctx.fillRect(fx.x + Math.cos(a) * size * 0.72 - 2, fx.y + Math.sin(a) * size * 0.72 - 2, 4, 4);
              }
              break;
            }
            case 'port_snare': {
              ctx.lineWidth = 2;
              ctx.strokeRect(fx.x - size * 0.56, fx.y - size * 0.56, size * 1.12, size * 1.12);
              ctx.beginPath();
              ctx.moveTo(fx.x - size * 0.56, fx.y - size * 0.56);
              ctx.lineTo(fx.x + size * 0.56, fx.y + size * 0.56);
              ctx.moveTo(fx.x + size * 0.56, fx.y - size * 0.56);
              ctx.lineTo(fx.x - size * 0.56, fx.y + size * 0.56);
              ctx.stroke();
              break;
            }
            case 'stack_overflow': {
              ctx.lineWidth = 2.3;
              for (let i = 0; i < 3; i += 1) {
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, size * (0.4 + i * 0.18), 0, Math.PI * 2);
                ctx.stroke();
              }
              break;
            }
            case 'mirror_packet': {
              ctx.lineWidth = 1.9;
              ctx.beginPath();
              ctx.moveTo(fx.x - size * 0.64, fx.y - size * 0.64);
              ctx.lineTo(fx.x + size * 0.1, fx.y + size * 0.1);
              ctx.lineTo(fx.x - size * 0.64, fx.y + size * 0.64);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(fx.x + size * 0.18, fx.y, size * 0.44, -Math.PI * 0.45, Math.PI * 0.45);
              ctx.stroke();
              break;
            }
            case 'thread_splitter': {
              ctx.lineWidth = 2.1;
              for (let i = 0; i < 6; i += 1) {
                const a = (Math.PI * 2 * i) / 6 + rt.elapsed * 0.7;
                const bx = fx.x + Math.cos(a) * size * 0.18;
                const by = fx.y + Math.sin(a) * size * 0.18;
                const ex = fx.x + Math.cos(a) * size * 0.82;
                const ey = fx.y + Math.sin(a) * size * 0.82;
                const b1x = fx.x + Math.cos(a + 0.25) * size * 0.64;
                const b1y = fx.y + Math.sin(a + 0.25) * size * 0.64;
                const b2x = fx.x + Math.cos(a - 0.25) * size * 0.64;
                const b2y = fx.y + Math.sin(a - 0.25) * size * 0.64;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(ex, ey);
                ctx.moveTo(bx, by);
                ctx.lineTo(b1x, b1y);
                ctx.moveTo(bx, by);
                ctx.lineTo(b2x, b2y);
                ctx.stroke();
              }
              break;
            }
            case 'latency_field': {
              ctx.lineWidth = 2;
              ctx.setLineDash([2, 3]);
              for (let i = 0; i < 3; i += 1) {
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, size * (0.44 + i * 0.2), 0, Math.PI * 2);
                ctx.stroke();
              }
              ctx.setLineDash([]);
              break;
            }
            case 'root_access': {
              ctx.lineWidth = 2.8;
              ctx.beginPath();
              ctx.arc(fx.x, fx.y, size * 0.9, 0, Math.PI * 2);
              ctx.stroke();
              for (let i = 0; i < 6; i += 1) {
                const a = (Math.PI * 2 * i) / 6;
                ctx.beginPath();
                ctx.moveTo(fx.x + Math.cos(a) * size * 0.24, fx.y + Math.sin(a) * size * 0.24);
                ctx.lineTo(fx.x + Math.cos(a) * size * 0.96, fx.y + Math.sin(a) * size * 0.96);
                ctx.stroke();
              }
              break;
            }
            default:
              break;
          }
        }
      } else if (fx.kind === 'ring') {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 2 + (1 - t) * 3;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, rr, 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.kind === 'cross') {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx.x - rr, fx.y);
        ctx.lineTo(fx.x + rr, fx.y);
        ctx.moveTo(fx.x, fx.y - rr);
        ctx.lineTo(fx.x, fx.y + rr);
        ctx.stroke();
      } else if (fx.kind === 'slash') {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fx.x - rr * 0.8, fx.y + rr * 0.5);
        ctx.lineTo(fx.x + rr * 0.8, fx.y - rr * 0.5);
        ctx.stroke();
      } else {
        ctx.fillStyle = fx.color;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, rr * 0.62, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const h of rt.hazards) {
      const isPlayerHazard = h.source === 'player';
      const hue =
        h.sourceSkill === 'null_grenade' ? '#ff8ebd' :
        h.sourceSkill === 'quantum_spike' ? '#c7a2ff' :
        h.sourceSkill === 'black_ice_field' ? '#93e6ff' :
        h.sourceSkill === 'memory_mine' ? '#ffc087' :
        h.sourceSkill === 'ghost_fork' ? '#9cdfff' :
        h.sourceSkill === 'port_snare' ? '#8fd0ff' :
        h.sourceSkill === 'latency_field' ? '#92e5ff' :
        '#6fd9ff';
      if (h.telegraph > 0) {
        ctx.strokeStyle = isPlayerHazard ? `${hue}cc` : 'rgba(255,60,90,0.82)';
        ctx.lineWidth = 2;
        if (h.sourceSkill === 'quantum_spike') {
          ctx.beginPath();
          ctx.moveTo(h.x, h.y - h.r);
          ctx.lineTo(h.x + h.r, h.y);
          ctx.lineTo(h.x, h.y + h.r);
          ctx.lineTo(h.x - h.r, h.y);
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        if (isPlayerHazard) {
          ctx.fillStyle = `${hue}22`;
          ctx.strokeStyle = `${hue}99`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (h.sourceSkill === 'null_grenade') {
            for (let i = 0; i < 6; i += 1) {
              const a = (Math.PI * 2 * i) / 6;
              const x2 = h.x + Math.cos(a) * h.r * 0.85;
              const y2 = h.y + Math.sin(a) * h.r * 0.85;
              ctx.beginPath();
              ctx.moveTo(h.x, h.y);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          } else if (h.sourceSkill === 'black_ice_field') {
            ctx.strokeStyle = 'rgba(170,240,255,0.72)';
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.r * 0.66, 0, Math.PI * 2);
            ctx.stroke();
          } else if (h.sourceSkill === 'quantum_spike') {
            ctx.strokeStyle = 'rgba(225,194,255,0.8)';
            ctx.beginPath();
            ctx.moveTo(h.x, h.y - h.r * 0.85);
            ctx.lineTo(h.x + h.r * 0.85, h.y);
            ctx.lineTo(h.x, h.y + h.r * 0.85);
            ctx.lineTo(h.x - h.r * 0.85, h.y);
            ctx.closePath();
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = 'rgba(255,45,70,0.18)';
          ctx.strokeStyle = 'rgba(255,95,120,0.74)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    for (const link of rt.lightningLinks) {
      const alpha = clamp(link.ttl / link.maxTtl, 0, 1);
      const midX = (link.fromX + link.toX) * 0.5 + Math.sin(rt.elapsed * 18 + link.id) * 6;
      const midY = (link.fromY + link.toY) * 0.5 + Math.cos(rt.elapsed * 15 + link.id * 0.7) * 6;
      ctx.save();
      ctx.strokeStyle = `rgba(188, 206, 255, ${0.35 + alpha * 0.65})`;
      ctx.lineWidth = 2.2 + alpha * 1.8;
      ctx.beginPath();
      ctx.moveTo(link.fromX, link.fromY);
      ctx.lineTo(midX, midY);
      ctx.lineTo(link.toX, link.toY);
      ctx.stroke();
      ctx.restore();
    }

    for (const orb of rt.orbs) {
      const key = orb.size === 'large' ? 'orb_large' : orb.size === 'medium' ? 'orb_medium' : 'orb_small';
      const frame = getAnimFrame(sprites[key], rt.elapsed, 6);
      if (frame) {
        const size = orb.size === 'large' ? 34 : orb.size === 'medium' ? 28 : 22;
        drawImageCentered(ctx, frame, orb.x, orb.y, size, size);
      } else {
        drawOrbSprite(ctx, orb.size, orb.x, orb.y);
      }
    }

    for (const item of rt.items) {
      const pulse = 0.9 + Math.abs(Math.sin(rt.elapsed * 4.2 + item.id * 0.13)) * 0.3;
      const ringR = 20 + Math.abs(Math.sin(rt.elapsed * 3.4 + item.id * 0.23)) * 6;
      const visual = ITEM_VISUAL[item.kind];
      ctx.save();
      ctx.strokeStyle = visual.ring;
      ctx.fillStyle = visual.fill;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(item.x, item.y, ringR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(item.x, item.y, ringR + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '15px NeoDunggeunmoPro, monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(3, 8, 18, 0.92)';
      ctx.lineWidth = 3;
      ctx.strokeText(ITEM_LABELS[item.kind], item.x, item.y - 28);
      ctx.fillStyle = '#f3fbff';
      ctx.fillText(ITEM_LABELS[item.kind], item.x, item.y - 28);
      ctx.font = '11px NeoDunggeunmoPro, monospace';
      ctx.strokeText(visual.tag, item.x, item.y - 12);
      ctx.fillText(visual.tag, item.x, item.y - 12);
      ctx.restore();

      const frame = getAnimFrame(sprites[item.kind], rt.elapsed, 4);
      if (frame) {
        drawImageCentered(ctx, frame, item.x, item.y, 36 * pulse, 36 * pulse);
      } else {
        drawItemSprite(ctx, item.kind, item.x, item.y);
      }
    }

    for (const mine of rt.mines) {
      const frame = getAnimFrame(sprites.mine, rt.elapsed, 6);
      if (frame) {
        drawImageCentered(ctx, frame, mine.x, mine.y, 28, 28, rt.elapsed >= mine.armedAt ? 1 : 0.6);
      } else {
        const c = rt.elapsed >= mine.armedAt ? '#ffa45f' : '#6f6f6f';
        drawSprite(ctx, {
          pixel: 2,
          glow: 'rgba(255,164,95,0.16)',
          matrix: ['..oooo..', '.oabbao.', 'oaccccao', 'obcddcbo', 'obcddcbo', 'oaccccao', '.oabbao.', '..oooo..'],
          palette: { o: '#ffe4ca', a: c, b: '#d7d7d7', c: '#444', d: '#111' },
        }, mine.x, mine.y);
      }
    }

    for (const t of rt.turrets) {
      const frame = getAnimFrame(sprites.turret, rt.elapsed, 8);
      if (frame) {
        drawImageCentered(ctx, frame, t.x, t.y, 28, 28);
      } else {
        drawSprite(ctx, {
          pixel: 2,
          glow: 'rgba(141,255,154,0.2)',
          matrix: ['...oo...', '..oabo..', '.oacdao.', 'oabeeabo', '.oacdao.', '..oabo..', '...oo...'],
          palette: { o: '#ebffef', a: '#8dff9a', b: '#b9ffc2', c: '#426a46', d: '#1f3322', e: '#ffffff' },
        }, t.x, t.y);
      }
    }

    for (const d of rt.recursiveDrones) {
      const a = d.orbitOffset + rt.elapsed * 2.2;
      const dx = p.x + Math.cos(a) * d.orbitRadius;
      const dy = p.y + Math.sin(a) * d.orbitRadius;
      const frame = getAnimFrame(sprites.skill_recursive_drone, rt.elapsed + d.id * 0.1, 10);
      if (frame) {
        drawImageCentered(ctx, frame, dx, dy, 24, 24, 0.94);
      } else {
        drawSprite(ctx, SPRITES.enemyDrone, dx, dy);
      }
      ctx.strokeStyle = 'rgba(178, 248, 255, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(dx, dy);
      ctx.stroke();
    }

    for (const n of rt.mirrorNodes) {
      const a = n.orbitOffset + rt.elapsed * 1.3;
      const nx = p.x + Math.cos(a) * n.orbitRadius;
      const ny = p.y + Math.sin(a) * n.orbitRadius;
      const frame = getAnimFrame(sprites.skill_mirror_packet, rt.elapsed + n.id * 0.13, 10);
      if (frame) {
        drawImageCentered(ctx, frame, nx, ny, 22, 22, 0.9);
      } else {
        ctx.strokeStyle = 'rgba(164, 183, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(nx - 10, ny - 10, 20, 20);
      }
    }

    for (const g of rt.ghostClones) {
      const alpha = clamp(g.ttl / 1.6, 0, 1) * 0.8;
      const frame = getAnimFrame(sprites.skill_ghost_fork, rt.elapsed + g.id * 0.08, 8);
      if (frame) {
        drawImageCentered(ctx, frame, g.x, g.y, 26, 26, alpha);
      } else {
        ctx.fillStyle = `rgba(156, 223, 255, ${alpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const d of rt.decoys) {
      const frame = getAnimFrame(sprites.decoy, rt.elapsed, 6);
      const pulse = 0.86 + Math.abs(Math.sin(rt.elapsed * 7 + d.id * 0.2)) * 0.24;
      ctx.save();
      ctx.strokeStyle = 'rgba(150, 252, 255, 0.92)';
      ctx.fillStyle = 'rgba(110, 236, 255, 0.14)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 28 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(d.x, d.y, 36 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '11px NeoDunggeunmoPro, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(205, 251, 255, 0.98)';
      ctx.fillText('디코이', d.x, d.y - 30);
      ctx.restore();
      if (frame) {
        drawImageCentered(ctx, frame, d.x, d.y, 42 * pulse, 42 * pulse, 0.95);
      } else {
        drawSprite(ctx, {
          pixel: 2,
          glow: 'rgba(132,244,255,0.16)',
          matrix: ['..oooo..', '.oaaaao.', 'oaabbbbo', 'oabcccb', 'oabcccb', 'oaabbbbo', '.oaaaao.', '..oooo..']
            .map((row) => row.padEnd(8, '.').slice(0, 8)),
          palette: { o: '#d7ffff', a: '#84f4ff', b: '#60c8da', c: '#1f4f61' },
        }, d.x, d.y);
      }
    }

    for (const proj of rt.projectiles) {
      const projectileKey = proj.owner === 'player' ? 'projectile_player' : 'projectile_enemy';
      const frame = getAnimFrame(sprites[projectileKey], rt.elapsed, 10);
      if (frame) {
        const size = proj.r * 3.2;
        const angle = Math.atan2(proj.vy, proj.vx);
        drawImageCenteredRotated(ctx, frame, proj.x, proj.y, size, size, angle);
      } else {
        drawSprite(ctx, proj.owner === 'player' ? SPRITES.projectilePlayer : SPRITES.projectileEnemy, proj.x, proj.y);
      }
    }

    for (const enemy of rt.enemies) {
      const unitKey = ENEMY_UNIT_SPRITE_KEY[enemy.kind];
      const unitFrame = getAnimFrame(sprites[unitKey], rt.elapsed, 6);
      if (unitFrame) {
        const size = enemy.r * 2.9;
        drawImageCentered(ctx, unitFrame, enemy.x, enemy.y, size, size);
      } else {
        drawSprite(ctx, pickEnemySprite(enemy.kind), enemy.x, enemy.y);
      }
      drawPixelBar(ctx, enemy.x - enemy.r, enemy.y - enemy.r - 8, enemy.r * 2, 4, enemy.hp / enemy.maxHp, 'rgba(255,255,255,0.2)', '#ffd8e2');
      if ((enemy.overflowStacks ?? 0) > 0) {
        const ratio = clamp((enemy.overflowStacks ?? 0) / Math.max(1, rt.skills.stackOverflow.threshold), 0, 1);
        ctx.strokeStyle = `rgba(255, 169, 181, ${0.55 + ratio * 0.45})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r + 7 + ratio * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 206, 219, 0.95)';
        ctx.font = '10px NeoDunggeunmoPro, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${enemy.overflowStacks}`, enemy.x, enemy.y - enemy.r - 12);
      }

      if (enemy.kind === 'broken_process' && enemy.dashTelegraph > 0) {
        ctx.strokeStyle = 'rgba(255,140,90,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.dashTargetX, enemy.dashTargetY);
        ctx.stroke();
      }
    }

    const playerFrame = getAnimFrame(sprites.player, rt.elapsed, 8);
    if (playerFrame) {
      drawImageCentered(ctx, playerFrame, p.x, p.y, 44, 44);
    } else {
      drawSprite(ctx, SPRITES.player, p.x, p.y);
    }

    if (rt.elapsed < p.hitPulseUntil) {
      const pulse = (p.hitPulseUntil - rt.elapsed) / 0.24;
      const alpha = clamp(pulse, 0, 1);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 132, 164, ${0.35 + alpha * 0.5})`;
      ctx.lineWidth = 2 + alpha * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 14 + (1 - alpha) * 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 22 + (1 - alpha) * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (p.shieldCharges > 0) {
      ctx.strokeStyle = 'rgba(160,120,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (rt.skills.unlocked.signal_orb) {
      const so = rt.skills.signalOrb;
      for (let i = 0; i < so.count; i += 1) {
        const a = so.angle + (Math.PI * 2 * i) / so.count;
        const ox = p.x + Math.cos(a) * so.radius;
        const oy = p.y + Math.sin(a) * so.radius;
        const orbFrame = getAnimFrame(sprites.skill_signal_orb, rt.elapsed + i * 0.12, 12);
        if (orbFrame) {
          drawImageCentered(ctx, orbFrame, ox, oy, 24, 24);
        } else {
          drawSprite(ctx, {
            pixel: 2,
            glow: 'rgba(124,230,255,0.16)',
            matrix: ['..oo..', '.oabo.', 'oabbao', 'oabbao', '.oabo.', '..oo..'],
            palette: { o: '#dcffff', a: '#7ce6ff', b: '#54c3dd' },
          }, ox, oy);
        }
      }
    }

    if (rt.skills.unlocked.checksum_burst) {
      const cb = rt.skills.checksumBurst;
      const coreCount = Math.min(4, 1 + Math.floor((rt.skillUpgradeStacks.checksum_burst ?? 0) / 2));
      for (let i = 0; i < coreCount; i += 1) {
        const a = rt.elapsed * 1.8 + (Math.PI * 2 * i) / coreCount;
        const cx = p.x + Math.cos(a) * (68 + 10 * (i % 2));
        const cy = p.y + Math.sin(a) * (68 + 10 * (i % 2));
        const frame = getAnimFrame(sprites.skill_checksum_burst, rt.elapsed + i * 0.12, 10);
        if (frame) {
          drawImageCentered(ctx, frame, cx, cy, 20, 20, 0.9);
        }
        ctx.strokeStyle = 'rgba(255, 216, 154, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, cb.radius * 0.22, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (rt.skills.beamRender.activeUntil > rt.elapsed && rt.skills.beamRender.targetId != null) {
      const t = rt.enemies.find((e) => e.id === rt.skills.beamRender.targetId);
      if (t) {
        ctx.strokeStyle = 'rgba(128,255,246,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
        const beamFx = getAnimFrame(sprites.skill_lucas_beam, rt.elapsed, 9);
        if (beamFx) {
          drawImageCentered(ctx, beamFx, (p.x + t.x) / 2, (p.y + t.y) / 2, 54, 54, 0.85);
        }
      }
    }

    if (rt.player.hp / rt.player.maxHp < 0.3) {
      const alpha = 0.2 + Math.abs(Math.sin(rt.elapsed * 5)) * 0.18;
      ctx.strokeStyle = `rgba(255,68,96,${alpha})`;
      ctx.lineWidth = 18;
      ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (rt.skills.systemPurge.pulseUntil > rt.elapsed) {
      const alpha = clamp((rt.skills.systemPurge.pulseUntil - rt.elapsed) / 1.2, 0, 1) * 0.35;
      ctx.fillStyle = `rgba(150, 245, 255, ${alpha})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.restore();
  }, []);

  const loop = useCallback((ms: number) => {
    const rt = runtimeRef.current;
    if (pausedRef.current || rt.status !== 'running') return;

    const dt = Math.min(0.034, (ms - lastMsRef.current) / 1000);
    lastMsRef.current = ms;
    rt.now = ms / 1000;
    rt.elapsed += dt;

    if (rt.elapsed >= GAME_SECONDS) {
      rt.status = 'clear';
      stopGame();
      setHud(buildHudState(rt));
      return;
    }

    rt.spawnAccumulator += getSpawnRatePerSecond(rt.elapsed) * dt;
    while (rt.spawnAccumulator >= 1) {
      rt.spawnAccumulator -= 1;
      spawnEnemyWave(rt);
    }

    spawnBossTimeline(rt);
    updateCombat(rt, dt);
    updateEntities(rt, dt);
    handleCollisions(rt);

    for (let i = rt.enemies.length - 1; i >= 0; i -= 1) {
      if (rt.enemies[i].hp <= 0) {
        rt.enemies.splice(i, 1);
      }
    }

    updateLevel(rt);

    rt.lowHpFlash = Math.max(0, rt.lowHpFlash - dt);
    rt.screenShake = Math.max(0, rt.screenShake - dt * 18);
    rt.glitchNoise = Math.max(0.08, rt.glitchNoise * 0.985 + (rt.screenShake > 0 ? 0.02 : 0));

    if (rt.player.hp <= 0) {
      if (rt.player.reviveCharges > 0) {
        rt.player.reviveCharges -= 1;
        rt.player.hp = rt.player.maxHp * 0.35;
        rt.player.invincibleUntil = rt.elapsed + 2.5;
        rt.screenShake = Math.max(rt.screenShake, 10);
      } else {
        rt.status = 'failed';
        stopGame();
        setHud(buildHudState(rt));
        return;
      }
    }

    setHud(buildHudState(rt));
    draw(rt);
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, handleCollisions, spawnBossTimeline, spawnEnemyWave, stopGame, updateCombat, updateEntities]);

  useEffect(() => {
    let cancelled = false;
    void loadSpriteStore().then((store) => {
      if (cancelled) return;
      spriteStoreRef.current = store;
      draw(runtimeRef.current);
    });
    return () => {
      cancelled = true;
    };
  }, [draw]);


  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (e.repeat) return;
        if ((hud.status === 'ready' || hud.status === 'clear' || hud.status === 'failed') && !isGuideOpen) {
          startGame();
        }
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      keysRef.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [hud.status, isGuideOpen, startGame]);

  useEffect(() => {
    if (hud.status !== 'levelup' || cards.length === 0) return;
    const onCardKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setSelectedCardIndex((prev) => Math.max(0, prev - 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setSelectedCardIndex((prev) => Math.min(cards.length - 1, prev + 1));
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        const card = cards[selectedCardIndex] ?? cards[0];
        if (card) applyCard(card);
      }
    };
    window.addEventListener('keydown', onCardKey);
    return () => window.removeEventListener('keydown', onCardKey);
  }, [applyCard, cards, hud.status, selectedCardIndex]);

  useEffect(() => {
    if (!isGuideOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        setIsGuideOpen(false);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isGuideOpen]);

  useEffect(() => {
    const rt = runtimeRef.current;

    if (isGuideOpen) {
      if (rt.status === 'running') {
        pausedRef.current = true;
        keysRef.current.clear();
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      return;
    }

    if (rt.status === 'running' && pausedRef.current) {
      pausedRef.current = false;
      lastMsRef.current = performance.now();
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [isGuideOpen, loop]);

  useEffect(() => {
    draw(runtimeRef.current);
  }, [draw]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const results = runSkillSmokeTest();
    const failed = results.filter((r) => !r.ok);
    console.table(results);
    if (failed.length > 0) {
      console.warn('[LucasSurvival][SkillSmokeTest] failed:', failed);
    } else {
      console.info('[LucasSurvival][SkillSmokeTest] all skills passed');
    }
  }, [runSkillSmokeTest]);

  const cardTypeLabel: Record<UpgradeCard['cardType'], string> = {
    new_skill: '신규 스킬',
    skill_upgrade: '스킬 강화',
    stat_upgrade: '능력치 강화',
    survival_upgrade: '생존 강화',
    economy_upgrade: '성장 강화',
    evolution: '진화',
  };

  const getCardDisplayName = (card: UpgradeCard): string => {
    if (card.cardType !== 'new_skill') return card.name;
    const linked = resolveLinkedSkill(card);
    if (!linked) return card.name;
    return `${SKILL_LABELS[linked]} 획득`;
  };

  const getCardArtStyle = (card: UpgradeCard) => {
    const linked = resolveLinkedSkill(card);
    if (linked && (card.cardType === 'new_skill' || card.cardType === 'skill_upgrade' || card.cardType === 'evolution')) {
      const skillIcon = SKILL_ICON_PATHS[linked];
      return {
        backgroundImage: `linear-gradient(180deg, rgba(4,10,20,0.12), rgba(4,10,20,0.52)), url(${skillIcon}), url(${CARD_ART_PATHS[card.cardType]})`,
        backgroundSize: '100% 100%, 44% auto, cover',
        backgroundPosition: 'center, 84% 54%, center',
        backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
      } as const;
    }

    const cardIdArt = CARD_ART_BY_CARD_ID[card.id];
    if (cardIdArt) {
      return {
        backgroundImage: `linear-gradient(180deg, rgba(7,14,26,0.18), rgba(7,14,26,0.64)), url(${cardIdArt}), url(${CARD_ART_PATHS[card.cardType]})`,
        backgroundSize: '100% 100%, 42% auto, cover',
        backgroundPosition: 'center, 82% 54%, center',
        backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
      } as const;
    }

    const systemArt = SYSTEM_CARD_ART_BY_TYPE[card.cardType];
    if (systemArt) {
      return {
        backgroundImage: `linear-gradient(180deg, rgba(5,12,22,0.2), rgba(5,12,22,0.6)), url(${systemArt}), url(${CARD_ART_PATHS[card.cardType]})`,
        backgroundSize: '100% 100%, 38% auto, cover',
        backgroundPosition: 'center, 80% 52%, center',
        backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
      } as const;
    }

    return { backgroundImage: `url(${CARD_ART_PATHS[card.cardType]})` } as const;
  };

  const logTypeLabel: Record<'system' | 'boss' | 'skill' | 'item', string> = {
    system: 'SYS',
    boss: 'BOSS',
    skill: 'SKILL',
    item: 'ITEM',
  };

  const guideSkills = useMemo(
    () =>
      ALL_SKILL_IDS.map((id) => ({
        id,
        name: SKILL_LABELS[id],
        image: SKILL_ICON_PATHS[id],
        description: SKILL_DESCRIPTIONS[id],
      })),
    [],
  );

  const guideItems = useMemo(
    () =>
      (Object.keys(ITEM_LABELS) as ItemKind[]).map((kind) => ({
        id: kind,
        name: ITEM_LABELS[kind],
        image: ITEM_SPRITE_PATHS[kind][0],
        tag: ITEM_VISUAL[kind].tag,
        ring: ITEM_VISUAL[kind].ring,
        description: ITEM_DESCRIPTIONS[kind],
      })),
    [],
  );

  const overlay = useMemo(() => {
    if (hud.status === 'ready') {
      return (
        <div className="ls-overlay">
          <h1>CORE BREACH SURVIVAL</h1>
          <p>{SYSTEM_TEXT.start1}</p>
          <p>{SYSTEM_TEXT.start2}</p>
          <button className="ls-btn" onClick={startGame}>START</button>
        </div>
      );
    }

    if (hud.status === 'levelup') {
      return (
        <div className="ls-overlay levelup">
          <div className="ls-levelup-head">
            <h1>레벨 업</h1>
            <p>{SYSTEM_TEXT.levelup}</p>
            <p className="ls-card-help">LEFT / RIGHT MOVE, SPACE SELECT</p>
          </div>
          <div className="ls-cards carousel">
            {cards.map((card, idx) => {
              const stackCount = runtimeRef.current.selectedUpgrades.filter((v) => v === card.name).length;
              const displayCardName = getCardDisplayName(card);
              return (
                <button
                  type="button"
                  className={`ls-card rarity-${card.rarity} ${card.cardType === 'new_skill' || card.cardType === 'skill_upgrade' || card.cardType === 'evolution' ? 'kind-skill' : 'kind-system'} ${card.cardType === 'new_skill' ? 'is-new-skill' : ''} ${idx === selectedCardIndex ? 'selected' : idx < selectedCardIndex ? 'left' : 'right'}`}
                  key={card.id}
                  onMouseEnter={() => setSelectedCardIndex(idx)}
                  onClick={() => applyCard(card)}
                >
                  <div
                    className="ls-card-art"
                    style={getCardArtStyle(card)}
                  >
                    <span className="ls-card-art-tag">{cardTypeLabel[card.cardType]}</span>
                  </div>
                  {card.cardType === 'new_skill' && (
                    <span className="ls-card-new-ribbon">획득</span>
                  )}
                  <div className="ls-card-top">
                    <span className="icon">{card.icon}</span>
                    <span className="rarity" style={{ color: RARITY_COLOR[card.rarity] }}>{card.rarity.toUpperCase()}</span>
                  </div>
                  <strong>{displayCardName}</strong>
                  <p>{card.description}</p>
                  <div className="ls-card-footer">
                    <em>{card.effectLabel}</em>
                    {stackCount > 0 && (
                      <div className="ls-card-dup-badge">DUP +{stackCount}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (hud.status === 'clear' || hud.status === 'failed') {
      return (
        <div className={`ls-overlay result ${hud.status}`}>
          <div className="ls-result-burst" />
          <h1 className={hud.status === 'clear' ? 'clear' : 'failed'}>
            {hud.result?.title}
          </h1>
          <p className="ls-result-subtitle">
            {hud.status === 'clear' ? '시스템 복구 완료' : '연결이 끊어짐'}
          </p>
          <div className={`ls-rank-badge rank-${hud.result?.rank ?? 'D'}`}>랭크 {hud.result?.rank}</div>
          <p>{hud.result?.desc}</p>
                    <div className="ls-result-grid">
            <section className="ls-result-block summary">
              <h3>{'\uC804\uD22C \uC694\uC57D'}</h3>
              <div>{'\uC0DD\uC874 \uC2DC\uAC04'}: {hud.result?.elapsedText}</div>
              <div>{'\uCC98\uCE58 \uC218'}: {hud.result?.kills}</div>
              <div>{'\uB3C4\uB2EC \uB808\uBCA8'}: {hud.result?.level}</div>
              <div>{'\uBCF4\uC2A4 \uCC98\uCE58'}: {hud.result?.bossKills}</div>
            </section>
            <section className="ls-result-block upgrades">
              <h3>{'\uC120\uD0DD \uC5C5\uADF8\uB808\uC774\uB4DC'}</h3>
              <ul>
                {(hud.result?.upgradeNames.length ?? 0) > 0
                  ? hud.result?.upgradeNames.slice(-6).map((name, idx) => <li key={`${name}-${idx}`}>{name}</li>)
                  : <li>{'\uC5C6\uC74C'}</li>}
              </ul>
            </section>
            <section className="ls-result-block skills">
              <h3>{'\uD68D\uB4DD \uC2A4\uD0AC'}</h3>
              <ul className="ls-result-skill-list">
                {(hud.result?.skillNames.length ?? 0) > 0
                  ? hud.result?.skillNames.slice(0, 8).map((name) => <li key={name}>{name}</li>)
                  : <li>디버그 샷</li>}
              </ul>
            </section>
            <section className="ls-result-block rank">
              <h3>{'\uC804\uD22C \uD3C9\uAC00'}</h3>
              <div className="ls-result-rank-text">랭크 {hud.result?.rank}</div>
              <p>{'\uC0DD\uC874 \uC2DC\uAC04, \uCC98\uCE58 \uC218, \uB808\uBCA8, \uBCF4\uC2A4 \uCC98\uCE58\uB97C \uAE30\uBC18\uC73C\uB85C \uB7AD\uD06C\uAC00 \uACB0\uC815\uB41C\uB2E4.'}</p>
            </section>
          </div>
          <button className="ls-btn result-btn" onClick={startGame}>RESTART</button>
        </div>
      );
    }

    return null;
  }, [applyCard, cards, hud, selectedCardIndex, startGame]);

  return (
    <div className="ls-root">
      <div className="ls-scanline" />
      {isGuideOpen && (
        <div className="ls-guide-overlay" onClick={() => setIsGuideOpen(false)}>
          <div className="ls-guide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ls-guide-head">
              <h2>게임 가이드</h2>
              <button type="button" className="ls-guide-close" onClick={() => setIsGuideOpen(false)}>
                닫기
              </button>
            </div>
            <div className="ls-guide-tabs">
              <button
                type="button"
                className={guideTab === 'skills' ? 'active' : ''}
                onClick={() => setGuideTab('skills')}
              >
                스킬
              </button>
              <button
                type="button"
                className={guideTab === 'items' ? 'active' : ''}
                onClick={() => setGuideTab('items')}
              >
                아이템 / 드롭
              </button>
            </div>
            <div className="ls-guide-body">
              {guideTab === 'skills' ? (
                <div className="ls-guide-grid">
                  {guideSkills.map((skill) => (
                    <article key={skill.id} className="ls-guide-card">
                      <img src={skill.image} alt={skill.name} className="ls-guide-img" draggable={false} />
                      <div className="ls-guide-text">
                        <h4>{skill.name}</h4>
                        <p>{skill.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <>
                  <div className="ls-guide-section-title">아이템 드롭</div>
                  <div className="ls-guide-grid">
                    {guideItems.map((item) => (
                      <article key={item.id} className="ls-guide-card">
                        <img src={item.image} alt={item.name} className="ls-guide-img" draggable={false} />
                        <div className="ls-guide-text">
                          <h4>{item.name}</h4>
                          <p>{item.description}</p>
                          <div className="ls-guide-tag-row">
                            <span style={{ borderColor: item.ring }}>바닥 태그: {item.tag}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="ls-guide-section-title">경험치 드롭</div>
                  <div className="ls-guide-grid exp">
                    {ORB_GUIDE.map((orb) => (
                      <article key={orb.id} className="ls-guide-card">
                        <img src={orb.image} alt={orb.name} className="ls-guide-img" draggable={false} />
                        <div className="ls-guide-text">
                          <h4>{orb.name}</h4>
                          <p>{orb.value}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <main className="ls-shell">
        <header className="ls-top">
          <div className="ls-title">LUCAS :: CYBER ARCANA SURVIVAL</div>
          <div className="ls-time">{hud.timerText}</div>
        </header>

        <section className="ls-layout">
          <aside className="ls-outer left">
            <div className="ls-outer-title">스킬 재사용 대기시간</div>
            <div className={`ls-skill-grid ${hud.skillCooldowns.length >= 13 ? 'compact-4' : ''}`}>
              {hud.skillCooldowns.map((s) => {
                const coolRatio = Math.min(1, Math.max(0, s.remaining / s.total));
                return (
                  <div className={`ls-skill-slot rarity-${s.rarity}`} key={s.id}>
                    <div className={`ls-skill-icon-wrap rarity-${s.rarity}`}>
                      <img
                        src={SKILL_ICON_PATHS[s.id]}
                        alt={s.label}
                        className="ls-skill-icon-img"
                        draggable={false}
                      />
                      {s.isNew && <div className="ls-skill-new-badge">NEW</div>}
                      {s.stack > 0 && <div className="ls-skill-stack-badge">+{s.stack}</div>}
                      <div
                        className="ls-skill-cool-mask"
                        style={{
                          background: `conic-gradient(rgba(4,7,14,0.88) ${coolRatio * 360}deg, rgba(4,7,14,0) 0deg)`,
                        }}
                      />
                      <div className="ls-skill-cool-num">{s.remaining > 0.05 ? s.remaining.toFixed(1) : ''}</div>
                    </div>
                    <div className="ls-skill-name">{s.label}</div>
                    <div className="ls-skill-desc">{s.description}</div>
                  </div>
                );
              })}
            </div>
            <div className="ls-outer-title small effect-title">{'\uD65C\uC131 \uC911\uC778 \uC544\uC774\uD15C/\uD6A8\uACFC'}</div>
            <div className="ls-buff-list">
              {hud.activeBuffs.length === 0 ? (
                <div className="ls-buff-row empty">NULL</div>
              ) : (
                hud.activeBuffs.map((buff) => (
                  <div className="ls-buff-row" key={buff.id}>
                    <span className="ls-buff-name">{buff.label}</span>
                    <b className="ls-buff-time">{buff.remaining > 0 ? `${buff.remaining.toFixed(1)}s` : '\uC720\uC9C0'}</b>
                  </div>
                ))
              )}
            </div>
          </aside>

          <section className="ls-stage">
            <div className="ls-stage-viewport">
              <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="ls-canvas" />
            <div className="ls-center-hud">
              <div className="ls-center-row">
                <span>체력 {hud.hpPercent.toFixed(0)}%</span>
                <div className="ls-center-bar hp"><div className="fill" style={{ width: `${hud.hpPercent}%` }} /></div>
              </div>
              <div className="ls-center-row">
                <span>경험치 {hud.expPercent.toFixed(0)}%</span>
                <div className="ls-center-bar exp"><div className="fill" style={{ width: `${hud.expPercent}%` }} /></div>
              </div>
            </div>
            <div className="ls-combat-log-feed">
              {hud.combatLogs
                .slice()
                .sort((a, b) => a.id - b.id)
                .slice(-4)
                .map((log) => (
                  <div key={log.id} className={`ls-combat-log ${log.type}`}>
                    <span className="ls-combat-log-icon">{logTypeLabel[log.type]}</span>
                    {log.text}
                  </div>
                ))}
            </div>
            {overlay}
          </div>
          </section>

          <aside className="ls-outer right">
            <button type="button" className="ls-guide-open-btn" onClick={() => setIsGuideOpen(true)}>
              게임 설명
            </button>
            <div className="ls-outer-title">{'\uC2DC\uC2A4\uD15C \uC0C1\uD0DC'}</div>
            <div className="ls-kv"><span>{'\uB808\uBCA8'}</span><b>{hud.level}</b></div>
            <div className="ls-kv"><span>{'\uCC98\uCE58 \uC218'}</span><b>{hud.kills}</b></div>

            {hud.bossHp && (
              <div className="ls-boss-panel">
                <div className="ls-boss-name">{hud.bossHp.name}</div>
                <div className="ls-panel-bar boss"><div className="fill" style={{ width: `${hud.bossHp.percent}%` }} /></div>
              </div>
            )}

            <div className="ls-outer-title small">{'\uD50C\uB808\uC774\uC5B4 \uC2A4\uD0EF'}</div>
            <div className="ls-stats-grid">
              {hud.statsPanel.map((s) => (
                <div className="ls-stat-row" key={s.key}>
                  <span>{s.key}</span>
                  <b>{s.value}</b>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}













