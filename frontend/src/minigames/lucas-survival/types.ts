export type GameStatus = 'ready' | 'running' | 'levelup' | 'clear' | 'failed';

export type EnemyKind =
  | 'noise_slime'
  | 'glitch_runner'
  | 'log_worm'
  | 'error_drone'
  | 'memory_golem'
  | 'corrupted_cache'
  | 'broken_process'
  | 'firewall_guardian'
  | 'kernel_reaper';

export type ProjectileOwner = 'player' | 'enemy';

export type ItemKind =
  | 'small_heal'
  | 'big_heal'
  | 'magnet_core'
  | 'clock_booster'
  | 'shield_shard'
  | 'emp_bomb'
  | 'overclock_chip'
  | 'repair_nanites'
  | 'data_vacuum'
  | 'firewall_battery'
  | 'critical_patch'
  | 'cooldown_cache'
  | 'revival_fragment'
  | 'boss_key_fragment'
  | 'xp_compressor'
  | 'glitch_decoy'
  | 'damage_amplifier'
  | 'emergency_escape_protocol'
  | 'upgrade_chest'
  | 'packet_battery'
  | 'kernel_patch'
  | 'hot_cache'
  | 'rollback_token'
  | 'vacuum_plus_plus_core'
  | 'failover_shield'
  | 'data_leech'
  | 'clock_freeze_chip'
  | 'overheat_module'
  | 'boss_trace_key';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type SkillId =
  | 'debug_shot'
  | 'signal_orb'
  | 'firewall_ring'
  | 'packet_storm'
  | 'memory_mine'
  | 'lucas_beam'
  | 'trace_blade'
  | 'null_grenade'
  | 'proxy_turret'
  | 'data_lightning'
  | 'black_ice_field'
  | 'recursive_drone'
  | 'quantum_spike'
  | 'system_purge'
  | 'ghost_fork'
  | 'checksum_burst'
  | 'port_snare'
  | 'stack_overflow'
  | 'mirror_packet'
  | 'thread_splitter'
  | 'latency_field'
  | 'root_access';

export type CardType =
  | 'new_skill'
  | 'skill_upgrade'
  | 'stat_upgrade'
  | 'survival_upgrade'
  | 'economy_upgrade'
  | 'evolution';

export type UpgradeCard = {
  id: string;
  name: string;
  rarity: Rarity;
  cardType: CardType;
  icon: string;
  description: string;
  effectLabel: string;
  canShow?: (state: RuntimeState) => boolean;
  apply: (state: RuntimeState) => void;
};

export type PlayerStats = {
  maxHp: number;
  hp: number;
  moveSpeed: number;
  level: number;
  exp: number;
  expToNext: number;
  pickupRadius: number;
  damageMultiplier: number;
  attackCooldownMultiplier: number;
  projectileSpeedMultiplier: number;
  criticalChance: number;
  criticalDamage: number;
  armor: number;
  regenPerSecond: number;
};

export type Player = PlayerStats & {
  x: number;
  y: number;
  r: number;
  hitInvulnUntil: number;
  hitPulseUntil: number;
  shieldCharges: number;
  speedBoostUntil: number;
  attackBoostUntil: number;
  damageBoostUntil: number;
  defenseBoostUntil: number;
  critBoostUntil: number;
  regenBoostUntil: number;
  pickupBoostUntil: number;
  expBoostUntil: number;
  invincibleUntil: number;
  emergencyEscapeUntil: number;
  overheatPenaltyUntil: number;
  reviveCharges: number;
  expGainMultiplier: number;
  projectileBoostUntil: number;
  failoverShieldCharges: number;
  dataLeechLevel: number;
  bossTraceStacks: number;
  recentDamageTaken: number;
};

export type Enemy = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  exp: number;
  color: string;
  aiCooldown: number;
  summonCooldown: number;
  dashCooldown: number;
  dashTelegraph: number;
  dashTargetX: number;
  dashTargetY: number;
  phaseTriggered: boolean;
  slowUntil?: number;
  stunUntil?: number;
  vulnerableUntil?: number;
  overflowStacks?: number;
  overflowCooldownUntil?: number;
};

export type Projectile = {
  id: number;
  owner: ProjectileOwner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  damage: number;
  life: number;
  pierce: number;
  color: string;
  knockback?: number;
  hitStunSec?: number;
  hitSlowSec?: number;
  hitVulnerableSec?: number;
  sourceSkill?: SkillId;
  bounced?: boolean;
  travel?: number;
  split?: boolean;
};

export type Orb = {
  id: number;
  x: number;
  y: number;
  value: number;
  size: 'small' | 'medium' | 'large';
};

export type ItemDrop = {
  id: number;
  x: number;
  y: number;
  kind: ItemKind;
  ttl: number;
};

export type Mine = {
  id: number;
  x: number;
  y: number;
  r: number;
  damage: number;
  ttl: number;
  armedAt: number;
  lingerPool: boolean;
};

export type Hazard = {
  id: number;
  x: number;
  y: number;
  r: number;
  telegraph: number;
  active: number;
  dps: number;
  slowPercent?: number;
  source?: 'player' | 'enemy';
  sourceSkill?: SkillId;
};

export type Beam = {
  activeUntil: number;
  targetId: number | null;
  damagePerTick: number;
  tickAccum: number;
};

export type SignalOrbState = {
  count: number;
  radius: number;
  rotationSpeed: number;
  damage: number;
  angle: number;
};

export type FirewallRingState = {
  damage: number;
  cooldown: number;
  radius: number;
  nextFireAt: number;
  burn: boolean;
};

export type PacketStormState = {
  damage: number;
  cooldown: number;
  projectileCount: number;
  projectileSpeed: number;
  nextCastAt: number;
};

export type MemoryMineState = {
  damage: number;
  cooldown: number;
  explosionRadius: number;
  nextDropAt: number;
  leavePool: boolean;
};

export type LucasBeamState = {
  damagePerTick: number;
  duration: number;
  cooldown: number;
  nextCastAt: number;
  targetCount: number;
};

export type TraceBladeState = {
  damage: number;
  cooldown: number;
  range: number;
  nextCastAt: number;
  comboHits: number;
};

export type NullGrenadeState = {
  damage: number;
  cooldown: number;
  radius: number;
  nextCastAt: number;
  count: number;
  slowPercent: number;
  slowDuration: number;
};

export type ProxyTurretState = {
  damage: number;
  fireRate: number;
  duration: number;
  cooldown: number;
  range: number;
  turretCount: number;
  nextCastAt: number;
};

export type DataLightningState = {
  damage: number;
  cooldown: number;
  chainCount: number;
  chainRange: number;
  nextCastAt: number;
};

export type BlackIceFieldState = {
  damagePerSecond: number;
  cooldown: number;
  radius: number;
  duration: number;
  slowPercent: number;
  nextCastAt: number;
};

export type RecursiveDroneState = {
  damage: number;
  cooldown: number;
  droneCount: number;
  range: number;
  projectileSpeed: number;
  nextCastAt: number;
};

export type QuantumSpikeState = {
  damage: number;
  cooldown: number;
  spikeCount: number;
  warningDelay: number;
  radius: number;
  nextCastAt: number;
};

export type SystemPurgeState = {
  damage: number;
  cooldown: number;
  bossDamageMultiplier: number;
  eliteDamageMultiplier: number;
  nextCastAt: number;
  pulseUntil: number;
};

export type GhostForkState = {
  damage: number;
  cooldown: number;
  delay: number;
  range: number;
  nextCastAt: number;
};

export type ChecksumBurstState = {
  baseDamage: number;
  hpRatioDamage: number;
  radius: number;
  cooldown: number;
  nextCastAt: number;
};

export type PortSnareState = {
  damage: number;
  cooldown: number;
  radius: number;
  nextCastAt: number;
  duration: number;
};

export type StackOverflowState = {
  threshold: number;
  chain: number;
  radius: number;
  damage: number;
  cooldown: number;
  nextBurstAt: number;
};

export type MirrorPacketState = {
  damage: number;
  cooldown: number;
  projectileCount: number;
  projectileSpeed: number;
  nextCastAt: number;
};

export type ThreadSplitterState = {
  damage: number;
  cooldown: number;
  projectileCount: number;
  projectileSpeed: number;
  nextCastAt: number;
};

export type LatencyFieldState = {
  radius: number;
  damagePerSecond: number;
  cooldown: number;
  duration: number;
  slowPercent: number;
  nextCastAt: number;
};

export type RootAccessState = {
  cooldown: number;
  duration: number;
  nextCastAt: number;
};

export type Turret = {
  id: number;
  x: number;
  y: number;
  ttl: number;
  fireAccum: number;
};

export type Decoy = {
  id: number;
  x: number;
  y: number;
  ttl: number;
  hp: number;
};

export type EffectBurst = {
  id: number;
  x: number;
  y: number;
  ttl: number;
  maxTtl: number;
  radius: number;
  color: string;
  kind: 'ring' | 'cross' | 'nova' | 'slash';
  skillId?: SkillId;
  angle?: number;
};

export type LightningLink = {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  ttl: number;
  maxTtl: number;
};

export type RecursiveDroneUnit = {
  id: number;
  orbitOffset: number;
  orbitRadius: number;
  fireAccum: number;
};

export type MirrorNode = {
  id: number;
  orbitOffset: number;
  orbitRadius: number;
  ttl: number;
};

export type GhostClone = {
  id: number;
  x: number;
  y: number;
  triggerAt: number;
  ttl: number;
  range: number;
  damage: number;
  fired: boolean;
};

export type Skills = {
  unlocked: Record<SkillId, boolean>;
  debugShot: {
    damage: number;
    cooldown: number;
    projectileSpeed: number;
    projectileCount: number;
    pierce: number;
    nextFireAt: number;
  };
  signalOrb: SignalOrbState;
  firewallRing: FirewallRingState;
  packetStorm: PacketStormState;
  memoryMine: MemoryMineState;
  lucasBeam: LucasBeamState;
  traceBlade: TraceBladeState;
  nullGrenade: NullGrenadeState;
  proxyTurret: ProxyTurretState;
  dataLightning: DataLightningState;
  blackIceField: BlackIceFieldState;
  recursiveDrone: RecursiveDroneState;
  quantumSpike: QuantumSpikeState;
  systemPurge: SystemPurgeState;
  ghostFork: GhostForkState;
  checksumBurst: ChecksumBurstState;
  portSnare: PortSnareState;
  stackOverflow: StackOverflowState;
  mirrorPacket: MirrorPacketState;
  threadSplitter: ThreadSplitterState;
  latencyField: LatencyFieldState;
  rootAccess: RootAccessState;
  beamRender: Beam;
};

export type WarningState = {
  text: string;
  until: number;
};

export type CombatLogType = 'system' | 'boss' | 'skill' | 'item';

export type CombatLogEntry = {
  id: number;
  text: string;
  type: CombatLogType;
  until: number;
};

export type RuntimeState = {
  now: number;
  elapsed: number;
  status: GameStatus;
  player: Player;
  skills: Skills;
  enemies: Enemy[];
  projectiles: Projectile[];
  orbs: Orb[];
  items: ItemDrop[];
  mines: Mine[];
  hazards: Hazard[];
  turrets: Turret[];
  decoys: Decoy[];
  effects: EffectBurst[];
  lightningLinks: LightningLink[];
  recursiveDrones: RecursiveDroneUnit[];
  mirrorNodes: MirrorNode[];
  ghostClones: GhostClone[];
  warnings: WarningState;
  eventLogs: CombatLogEntry[];
  spawnAccumulator: number;
  idSeq: number;
  kills: number;
  bossKills: number;
  selectedUpgrades: string[];
  skillUpgradeStacks: Partial<Record<SkillId, number>>;
  skillNewUntil: Partial<Record<SkillId, number>>;
  lowHpFlash: number;
  screenShake: number;
  gridOffset: number;
  glitchNoise: number;
  pendingLevelCards: UpgradeCard[];
  levelupSource: 'normal' | 'upgradeChest' | 'rareChest' | 'legendaryChest' | null;
  itemCollectionLog: ItemKind[];
  nextChestMinRarity: Rarity | null;
  stackOverflowHits: number;
};

export type HudState = {
  timerText: string;
  hpPercent: number;
  expPercent: number;
  level: number;
  kills: number;
  bossHp: { name: string; percent: number } | null;
  warningText: string | null;
  combatLogs: Array<{
    id: number;
    text: string;
    type: CombatLogType;
  }>;
  skillList: string[];
  skillCooldowns: Array<{
    id: SkillId;
    label: string;
    icon: string;
    rarity: Rarity;
    stack: number;
    isNew: boolean;
    description: string;
    remaining: number;
    total: number;
  }>;
  activeBuffs: Array<{
    id: string;
    label: string;
    remaining: number;
  }>;
  statsPanel: Array<{ key: string; value: string }>;
  status: GameStatus;
  result: {
    title: string;
    desc: string;
    elapsedText: string;
    rank: string;
    kills: number;
    level: number;
    upgradeNames: string[];
    skillNames: string[];
    bossKills: number;
  } | null;
};

