import type { EnemyKind, Rarity, RuntimeState, SkillId, UpgradeCard } from './types';

export const GAME_SECONDS = 300;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const MID_BOSS_TIMINGS = [60, 120] as const;
export const MAIN_BOSS_TIMING = 180;
export const FINAL_BOSS_TIMING = 270;

export const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 70,
  rare: 20,
  epic: 8,
  legendary: 2,
};

export const RARITY_RANK: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#c3d4f6',
  rare: '#6ed5ff',
  epic: '#d197ff',
  legendary: '#ffca63',
};

export const SKILL_LABELS: Record<SkillId, string> = {
  debug_shot: '디버그 샷',
  signal_orb: '시그널 오브',
  firewall_ring: '파이어월 링',
  packet_storm: '패킷 스톰',
  memory_mine: '메모리 마인',
  lucas_beam: '루카스 빔',
  trace_blade: '트레이스 블레이드',
  null_grenade: '널 그레네이드',
  proxy_turret: '프록시 터렛',
  data_lightning: '데이터 라이트닝',
  black_ice_field: '블랙 아이스 필드',
  recursive_drone: '리커시브 드론',
  quantum_spike: '퀀텀 스파이크',
  system_purge: '시스템 퍼지',
  ghost_fork: '고스트 포크',
  checksum_burst: '체크섬 버스트',
  port_snare: '포트 스네어',
  stack_overflow: '스택 오버플로우',
  mirror_packet: '미러 패킷',
  thread_splitter: '스레드 스플리터',
  latency_field: '레이턴시 필드',
  root_access: '루트 액세스',
};

export const EXP_ORB = {
  small: 3,
  medium: 8,
  large: 20,
};

export const BASE_PLAYER_STATS = {
  maxHp: 100,
  hp: 100,
  moveSpeed: 260,
  level: 1,
  exp: 0,
  expToNext: 20,
  pickupRadius: 70,
  damageMultiplier: 1,
  attackCooldownMultiplier: 1,
  projectileSpeedMultiplier: 1,
  criticalChance: 0.05,
  criticalDamage: 1.5,
  armor: 0,
  regenPerSecond: 0,
};

export const ENEMY_BASE: Record<
  EnemyKind,
  {
    hp: number;
    speed: number;
    damage: number;
    exp: number;
    radius: number;
    color: string;
  }
> = {
  noise_slime: { hp: 12, speed: 70, damage: 8, exp: 3, radius: 11, color: '#fd5f89' },
  glitch_runner: { hp: 9, speed: 145, damage: 10, exp: 4, radius: 10, color: '#ffb56c' },
  log_worm: { hp: 6, speed: 60, damage: 5, exp: 2, radius: 8, color: '#8ef39f' },
  error_drone: { hp: 28, speed: 80, damage: 7, exp: 8, radius: 13, color: '#74e7ff' },
  memory_golem: { hp: 90, speed: 45, damage: 18, exp: 18, radius: 20, color: '#9b86ff' },
  corrupted_cache: { hp: 450, speed: 65, damage: 18, exp: 45, radius: 34, color: '#ff3f92' },
  broken_process: { hp: 800, speed: 55, damage: 24, exp: 70, radius: 36, color: '#ff7958' },
  firewall_guardian: { hp: 1800, speed: 45, damage: 28, exp: 150, radius: 44, color: '#45daff' },
  kernel_reaper: { hp: 3500, speed: 70, damage: 35, exp: 240, radius: 52, color: '#ff4d4d' },
};

export const SYSTEM_TEXT = {
  start1: 'LUCAS: 복구 패킷 생성 중...',
  start2: 'LUCAS: 5분만 버텨줘. 그동안 내가 경로를 열게.',
  levelup: 'LUCAS: 전투 데이터 분석 중, 카드 1장을 선택해.',
  bossWarning: 'LUCAS: 조심해. 저건 일반적인 오류가 아니야.',
  clear: 'LUCAS: 복구 완료. 네가 버텨준 덕분이야.',
  failed: 'LUCAS: 연결이 끊겼어. 하지만 로그는 남아 있어. 다시 시도할 수 있어.',
};

const makeCard = (
  id: string,
  name: string,
  rarity: Rarity,
  cardType: UpgradeCard['cardType'],
  icon: string,
  description: string,
  effectLabel: string,
  apply: UpgradeCard['apply'],
  canShow?: UpgradeCard['canShow'],
): UpgradeCard => ({
  id,
  name,
  rarity,
  cardType,
  icon,
  description,
  effectLabel,
  apply,
  canShow,
});

export const UPGRADE_CARDS: UpgradeCard[] = [
  makeCard('move-speed', '고속 패킷', 'common', 'stat_upgrade', '>>', '이동 프로토콜을 최적화한다.', '이동 속도 +12%', (s) => {
    s.player.moveSpeed *= 1.12;
  }),
  makeCard('damage-amp', '출력 증폭', 'common', 'stat_upgrade', '++', '전체 공격 출력이 강화된다.', '모든 피해 +15%', (s) => {
    s.player.damageMultiplier *= 1.15;
  }),
  makeCard('cooldown-compress', '재사용 대기시간 압축', 'common', 'stat_upgrade', '::', '공격 루틴 간격을 줄인다.', '공격 재사용 대기시간 -10%', (s) => {
    s.player.attackCooldownMultiplier *= 0.9;
  }),
  makeCard('crit-code', '치명 코드', 'rare', 'stat_upgrade', '!!', '취약 패턴을 더 자주 찌른다.', '치명타 확률 +8%', (s) => {
    s.player.criticalChance = Math.min(0.75, s.player.criticalChance + 0.08);
  }),
  makeCard('crit-dmg', '과부하 분석', 'rare', 'stat_upgrade', '**', '치명타 충격을 증폭한다.', '치명타 피해 +30%', (s) => {
    s.player.criticalDamage += 0.3;
  }),
  makeCard('defense-patch', '방어 패치', 'common', 'survival_upgrade', '[]', '손상된 방어 레이어를 복구한다.', '피해 감소 +8%', (s) => {
    s.player.armor = Math.min(0.65, s.player.armor + 0.08);
  }),
  makeCard('regen', '자가 복구', 'rare', 'survival_upgrade', 'HP', '복구 루틴을 자동 실행한다.', '초당 체력 +0.6', (s) => {
    s.player.regenPerSecond += 0.6;
  }),
  makeCard('hp-expand', '최대 체력 확장', 'common', 'survival_upgrade', '++HP', '생존 가능한 데이터 용량을 늘린다.', '최대 체력 +20 / 현재 체력 +20', (s) => {
    s.player.maxHp += 20;
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + 20);
  }),
  makeCard('pickup-range', '자기장 확장', 'common', 'economy_upgrade', 'MAG', '더 먼 곳의 데이터 조각을 끌어온다.', '획득 반경 +35%', (s) => {
    s.player.pickupRadius *= 1.35;
  }),
  makeCard('exp-rate', '압축 학습', 'rare', 'economy_upgrade', 'EXP', '전투 로그에서 학습량을 더 뽑아낸다.', '경험치 획득 +15%', (s) => {
    s.player.expGainMultiplier *= 1.15;
  }),

  makeCard('unlock-signal-orb', '시그널 오브 획득', 'rare', 'new_skill', 'SO', '주변을 회전하는 구체가 접촉 피해를 준다.', '신규 스킬', (s) => {
    s.skills.unlocked.signal_orb = true;
  }, (s) => !s.skills.unlocked.signal_orb),
  makeCard('unlock-firewall-ring', '파이어월 링 획득', 'rare', 'new_skill', 'FR', '주기적으로 근접 적을 광역 타격한다.', '신규 스킬', (s) => {
    s.skills.unlocked.firewall_ring = true;
  }, (s) => !s.skills.unlocked.firewall_ring),
  makeCard('unlock-packet-storm', '패킷 스톰 획득', 'epic', 'new_skill', 'PS', '다방향 패킷 탄막을 발사한다.', '신규 스킬', (s) => {
    s.skills.unlocked.packet_storm = true;
  }, (s) => !s.skills.unlocked.packet_storm),
  makeCard('unlock-memory-mine', '메모리 마인 획득', 'epic', 'new_skill', 'MM', '이동 경로에 지뢰를 설치한다.', '신규 스킬', (s) => {
    s.skills.unlocked.memory_mine = true;
  }, (s) => !s.skills.unlocked.memory_mine),
  makeCard('unlock-lucas-beam', '루카스 빔 획득', 'legendary', 'new_skill', 'LB', '높은 체력의 적을 우선으로 레이저를 발사한다.', '신규 스킬', (s) => {
    s.skills.unlocked.lucas_beam = true;
  }, (s) => !s.skills.unlocked.lucas_beam),
  makeCard('unlock-trace-blade', '트레이스 블레이드 획득', 'rare', 'new_skill', 'TB', '근접 반원 베기로 주위 적들을 공격한다.', '신규 스킬', (s) => {
    s.skills.unlocked.trace_blade = true;
  }, (s) => !s.skills.unlocked.trace_blade),
  makeCard('unlock-null-grenade', '널 그레네이드 획득', 'rare', 'new_skill', 'NG', '투척 폭발로 다수를 감속시킨다.', '신규 스킬', (s) => {
    s.skills.unlocked.null_grenade = true;
  }, (s) => !s.skills.unlocked.null_grenade),
  makeCard('unlock-proxy-turret', '프록시 터렛 획득', 'epic', 'new_skill', 'PT', '임시 포탑을 배치해 자동 사격한다.', '신규 스킬', (s) => {
    s.skills.unlocked.proxy_turret = true;
  }, (s) => !s.skills.unlocked.proxy_turret),
  makeCard('unlock-data-lightning', '데이터 라이트닝 획득', 'epic', 'new_skill', 'DL', '연쇄 번개로 적들을 정리한다.', '신규 스킬', (s) => {
    s.skills.unlocked.data_lightning = true;
  }, (s) => !s.skills.unlocked.data_lightning),
  makeCard('unlock-black-ice-field', '블랙 아이스 필드 획득', 'epic', 'new_skill', 'BI', '둔화 장판으로 생존력을 올린다.', '신규 스킬', (s) => {
    s.skills.unlocked.black_ice_field = true;
  }, (s) => !s.skills.unlocked.black_ice_field),
  makeCard('unlock-recursive-drone', '리커시브 드론 획득', 'rare', 'new_skill', 'RD', '주변을 떠도는 드론이 자동 사격한다.', '신규 스킬', (s) => {
    s.skills.unlocked.recursive_drone = true;
  }, (s) => !s.skills.unlocked.recursive_drone),
  makeCard('unlock-quantum-spike', '퀀텀 스파이크 획득', 'epic', 'new_skill', 'QS', '지면 스파이크로 높은 피해를 준다.', '신규 스킬', (s) => {
    s.skills.unlocked.quantum_spike = true;
  }, (s) => !s.skills.unlocked.quantum_spike),
  makeCard('unlock-system-purge', '시스템 퍼지 획득', 'legendary', 'new_skill', 'SP', '재사용 대기시간이 긴 화면 정화 스킬.', '신규 스킬', (s) => {
    s.skills.unlocked.system_purge = true;
  }, (s) => !s.skills.unlocked.system_purge),
  makeCard('unlock-ghost-fork', '고스트 포크 획득', 'rare', 'new_skill', 'GF', 'X자 검기를 발생시켜 주위를 공격한다.', '신규 스킬', (s) => {
    s.skills.unlocked.ghost_fork = true;
  }, (s) => !s.skills.unlocked.ghost_fork),
  makeCard('unlock-checksum-burst', '체크섬 버스트 획득', 'epic', 'new_skill', 'CB', '주기적으로 현재 체력 비율 기반 추가 피해를 준다.', '신규 스킬', (s) => {
    s.skills.unlocked.checksum_burst = true;
  }, (s) => !s.skills.unlocked.checksum_burst),
  makeCard('unlock-port-snare', '포트 스네어 획득', 'rare', 'new_skill', 'PSN', '바닥 트랩으로 속박 + 취약을 건다.', '신규 스킬', (s) => {
    s.skills.unlocked.port_snare = true;
  }, (s) => !s.skills.unlocked.port_snare),
  makeCard('unlock-stack-overflow', '스택 오버플로우 획득', 'epic', 'new_skill', 'SOF', '적중 누적 후 연쇄 폭발을 일으킨다.', '신규 스킬', (s) => {
    s.skills.unlocked.stack_overflow = true;
  }, (s) => !s.skills.unlocked.stack_overflow),
  makeCard('unlock-mirror-packet', '미러 패킷 획득', 'rare', 'new_skill', 'MP', '발사한 투사체가 1회 튕긴다.', '신규 스킬', (s) => {
    s.skills.unlocked.mirror_packet = true;
  }, (s) => !s.skills.unlocked.mirror_packet),
  makeCard('unlock-thread-splitter', '스레드 스플리터 획득', 'rare', 'new_skill', 'TS', '탄이 비행 중 2갈래로 분열한다.', '신규 스킬', (s) => {
    s.skills.unlocked.thread_splitter = true;
  }, (s) => !s.skills.unlocked.thread_splitter),
  makeCard('unlock-latency-field', '레이턴시 필드 획득', 'epic', 'new_skill', 'LF', '원형 지대 내 적 행동을 감속시킨다.', '신규 스킬', (s) => {
    s.skills.unlocked.latency_field = true;
  }, (s) => !s.skills.unlocked.latency_field),
  makeCard('unlock-root-access', '루트 액세스 획득', 'legendary', 'new_skill', 'RA', '2초 무적 + 스킬 즉시 재사용 궁극기.', '신규 스킬', (s) => {
    s.skills.unlocked.root_access = true;
  }, (s) => !s.skills.unlocked.root_access),

  makeCard('debug-up', '디버그 샷 강화', 'common', 'skill_upgrade', 'D+', '기본 탄환 피해를 강화한다.', '디버그 샷 피해 +20%', (s) => {
    s.skills.debugShot.damage *= 1.2;
  }, (s) => s.skills.unlocked.debug_shot),
  makeCard('debug-multi', '디버그 샷 다중화', 'rare', 'skill_upgrade', 'D2', '동시 발사 수를 늘린다.', '발사체 +1', (s) => {
    s.skills.debugShot.projectileCount = Math.min(6, s.skills.debugShot.projectileCount + 1);
  }, (s) => s.skills.unlocked.debug_shot),
  makeCard('signal-plus', '시그널 오브 강화', 'rare', 'skill_upgrade', 'S+', '회전 구체 개수를 늘린다.', '구체 +1', (s) => {
    s.skills.signalOrb.count = Math.min(6, s.skills.signalOrb.count + 1);
  }, (s) => s.skills.unlocked.signal_orb),
  makeCard('storm-plus', '패킷 스톰 강화', 'epic', 'skill_upgrade', 'P+', '탄환 밀도를 높인다.', '탄환 수 +3', (s) => {
    s.skills.packetStorm.projectileCount += 3;
  }, (s) => s.skills.unlocked.packet_storm),
  makeCard('beam-plus', '루카스 빔 확장', 'legendary', 'skill_upgrade', 'L+', '동시 추적 대상을 늘린다.', '대상 +1', (s) => {
    s.skills.lucasBeam.targetCount = Math.min(3, s.skills.lucasBeam.targetCount + 1);
  }, (s) => s.skills.unlocked.lucas_beam),
  makeCard('blade-combo', '트레이스 블레이드 연격', 'rare', 'skill_upgrade', 'TB+', '연속 베기 횟수를 늘린다.', '연격 +1', (s) => {
    s.skills.traceBlade.comboHits = Math.min(3, s.skills.traceBlade.comboHits + 1);
  }, (s) => s.skills.unlocked.trace_blade),
  makeCard('grenade-count', '널 그레네이드 분산', 'epic', 'skill_upgrade', 'NG+', '투척 개수를 늘린다.', '수류탄 +1', (s) => {
    s.skills.nullGrenade.count = Math.min(3, s.skills.nullGrenade.count + 1);
  }, (s) => s.skills.unlocked.null_grenade),
  makeCard('turret-count', '프록시 터렛 증설', 'epic', 'skill_upgrade', 'PT+', '배치 포탑 개수를 늘린다.', '포탑 +1', (s) => {
    s.skills.proxyTurret.turretCount = Math.min(6, s.skills.proxyTurret.turretCount + 1);
  }, (s) => s.skills.unlocked.proxy_turret),
  makeCard('lightning-chain', '데이터 라이트닝 연쇄', 'epic', 'skill_upgrade', 'DL+', '연쇄 횟수를 늘린다.', '연쇄 +2', (s) => {
    s.skills.dataLightning.chainCount += 2;
  }, (s) => s.skills.unlocked.data_lightning),
  makeCard('ice-field-plus', '블랙 아이스 강화', 'epic', 'skill_upgrade', 'BI+', '장판 반경과 지속시간을 늘린다.', '반경/지속 증가', (s) => {
    s.skills.blackIceField.radius *= 1.2;
    s.skills.blackIceField.duration += 1.2;
  }, (s) => s.skills.unlocked.black_ice_field),
  makeCard('drone-plus', '리커시브 드론 복제', 'rare', 'skill_upgrade', 'RD+', '드론 수를 늘린다.', '드론 +1', (s) => {
    s.skills.recursiveDrone.droneCount = Math.min(4, s.skills.recursiveDrone.droneCount + 1);
  }, (s) => s.skills.unlocked.recursive_drone),
  makeCard('spike-plus', '퀀텀 스파이크 과충전', 'epic', 'skill_upgrade', 'QS+', '스파이크 개수와 피해를 올린다.', '스파이크 +2 / 피해 +20%', (s) => {
    s.skills.quantumSpike.spikeCount += 2;
    s.skills.quantumSpike.damage *= 1.2;
  }, (s) => s.skills.unlocked.quantum_spike),
  makeCard('purge-cooldown', '시스템 퍼지 압축', 'legendary', 'skill_upgrade', 'SP+', '정화 재사용 대기시간을 줄인다.', '재사용 대기시간 -20%', (s) => {
    s.skills.systemPurge.cooldown *= 0.8;
  }, (s) => s.skills.unlocked.system_purge),
  makeCard('ghost-fork-plus', '고스트 포크 강화', 'rare', 'skill_upgrade', 'GF+', '검기 시전 지연시간을 줄이고 범위를 키운다.', '시전 지연시간 -0.2초 / 범위 +12%', (s) => {
    s.skills.ghostFork.delay = Math.max(0.45, s.skills.ghostFork.delay - 0.2);
    s.skills.ghostFork.range *= 1.12;
  }, (s) => s.skills.unlocked.ghost_fork),
  makeCard('checksum-plus', '체크섬 버스트 강화', 'epic', 'skill_upgrade', 'CB+', '비율 피해와 반경을 강화한다.', '비율 피해 +2%p', (s) => {
    s.skills.checksumBurst.hpRatioDamage = Math.min(0.2, s.skills.checksumBurst.hpRatioDamage + 0.02);
    s.skills.checksumBurst.radius += 10;
  }, (s) => s.skills.unlocked.checksum_burst),
  makeCard('snare-plus', '포트 스네어 강화', 'rare', 'skill_upgrade', 'PSN+', '트랩 지속시간과 피해를 강화한다.', '지속 +0.4초 / 피해 +15%', (s) => {
    s.skills.portSnare.duration += 0.4;
    s.skills.portSnare.damage *= 1.15;
  }, (s) => s.skills.unlocked.port_snare),
  makeCard('overflow-plus', '스택 오버플로우 강화', 'epic', 'skill_upgrade', 'SOF+', '폭발 임계치를 낮추고 연쇄 수를 증가.', '임계치 -2 / 연쇄 +1', (s) => {
    s.skills.stackOverflow.threshold = Math.max(4, s.skills.stackOverflow.threshold - 2);
    s.skills.stackOverflow.chain = Math.min(5, s.skills.stackOverflow.chain + 1);
  }, (s) => s.skills.unlocked.stack_overflow),
  makeCard('mirror-plus', '미러 패킷 강화', 'rare', 'skill_upgrade', 'MP+', '반사탄 발사 수를 늘린다.', '발사체 +1', (s) => {
    s.skills.mirrorPacket.projectileCount = Math.min(8, s.skills.mirrorPacket.projectileCount + 1);
  }, (s) => s.skills.unlocked.mirror_packet),
  makeCard('thread-plus', '스레드 스플리터 강화', 'rare', 'skill_upgrade', 'TS+', '분열탄 위력을 강화한다.', '피해 +20%', (s) => {
    s.skills.threadSplitter.damage *= 1.2;
  }, (s) => s.skills.unlocked.thread_splitter),
  makeCard('latency-plus', '레이턴시 필드 강화', 'epic', 'skill_upgrade', 'LF+', '감속장 반경/지속 강화.', '반경 +12% / 지속 +0.6초', (s) => {
    s.skills.latencyField.radius *= 1.12;
    s.skills.latencyField.duration += 0.6;
  }, (s) => s.skills.unlocked.latency_field),
  makeCard('root-plus', '루트 액세스 강화', 'legendary', 'skill_upgrade', 'RA+', '궁극기 재사용 대기시간을 압축한다.', '재사용 대기시간 -15%', (s) => {
    s.skills.rootAccess.cooldown *= 0.85;
  }, (s) => s.skills.unlocked.root_access),

  makeCard('evo-debug', '진화: 디버그 랜스', 'legendary', 'evolution', 'EV1', '디버그 샷과 치명 패치를 결합한다.', '디버그 샷 관통/피해 대폭 강화', (s) => {
    s.skills.debugShot.damage *= 1.45;
    s.skills.debugShot.pierce += 2;
    s.player.criticalChance = Math.min(0.9, s.player.criticalChance + 0.12);
  }, (s) => s.skills.unlocked.debug_shot && s.itemCollectionLog.includes('critical_patch')),
  makeCard('evo-firewall', '진화: 파이어월 노바', 'legendary', 'evolution', 'EV2', '방화벽과 배터리를 결합한다.', '파이어월 링 2중 폭발', (s) => {
    s.skills.firewallRing.damage *= 1.55;
    s.skills.firewallRing.cooldown *= 0.8;
    s.skills.firewallRing.burn = true;
  }, (s) => s.skills.unlocked.firewall_ring && s.itemCollectionLog.includes('firewall_battery')),
  makeCard('evo-purge', '진화: 토탈 리셋', 'legendary', 'evolution', 'EV3', '정화와 EMP를 결합한다.', '시스템 퍼지 광역 강제 리셋', (s) => {
    s.skills.systemPurge.damage *= 1.5;
    s.skills.systemPurge.cooldown *= 0.85;
  }, (s) => s.skills.unlocked.system_purge && s.itemCollectionLog.includes('emp_bomb')),
];

export const getPhaseName = (elapsed: number) => {
  if (elapsed < 30) return 'tutorial';
  if (elapsed < 60) return 'early_pressure';
  if (elapsed < 120) return 'surround';
  if (elapsed < 180) return 'mid_bullet_pressure';
  if (elapsed < 270) return 'high_wave';
  return 'final_push';
};

export const getSpawnRatePerSecond = (elapsed: number) => {
  if (elapsed < 30) return 1.0;
  return 1 + elapsed * 0.028;
};

export const getEnemyMultipliers = (elapsed: number) => ({
  hpMul: 1 + elapsed / 110,
  speedMul: 1 + elapsed / 240,
  damageMul: 1 + elapsed / 150,
});

export const getExpToNextLevel = (level: number) =>
  Math.floor(20 + level * 12 + level * level * 1.5);

export const chooseRarity = (minRarity: Rarity = 'common'): Rarity => {
  const entries = (Object.keys(RARITY_WEIGHT) as Rarity[])
    .filter((r) => RARITY_RANK[r] >= RARITY_RANK[minRarity])
    .map((r) => ({ rarity: r, weight: RARITY_WEIGHT[r] }));

  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.rarity;
  }
  return entries[entries.length - 1].rarity;
};

export const pickCards = (
  count: number,
  state: RuntimeState,
  minRarity: Rarity = 'common',
): UpgradeCard[] => {
  const selected: UpgradeCard[] = [];
  const used = new Set<string>();

  let guard = 0;
  while (selected.length < count && guard < 200) {
    guard += 1;
    const rarity = chooseRarity(minRarity);
    const pool = UPGRADE_CARDS.filter((c) => {
      if (used.has(c.id)) return false;
      if (RARITY_RANK[c.rarity] < RARITY_RANK[minRarity]) return false;
      if (c.rarity !== rarity && Math.random() < 0.7) return false;
      if (c.canShow && !c.canShow(state)) return false;
      return true;
    });

    if (pool.length === 0) continue;
    const card = pool[Math.floor(Math.random() * pool.length)];
    used.add(card.id);
    selected.push(card);
  }

  if (selected.length < count) {
    const fallbackPool = UPGRADE_CARDS.filter((c) => {
      if (used.has(c.id)) return false;
      if (RARITY_RANK[c.rarity] < RARITY_RANK[minRarity]) return false;
      if (c.canShow && !c.canShow(state)) return false;
      return true;
    });
    while (selected.length < count && fallbackPool.length > 0) {
      const idx = Math.floor(Math.random() * fallbackPool.length);
      selected.push(fallbackPool.splice(idx, 1)[0]);
    }
  }

  selected.sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]);
  return selected;
};
