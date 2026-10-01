// Laser (variant 1 pulse volley)
export const LASER_LINE_FADEOUT_MS = 300;
export const LASER_FLARE_FADEOUT_MS = 200;
export const LASER_FIRE_INTERVAL_MS = 150;
export const LASER_LINE_SLOTS = 6;
export const LASER_FLARE_SLOTS = 6;
// Mining Laser (variant 2 wander beam)
export const LASER_TRACE_PERIOD_MS = 2800;

// Flak
export const FLAK_BURST_CLEANUP_MS = 450;
export const FLAK_BURST_SPAWN_INTERVAL_MS = 90;
export const FLAK_BURST_SLOTS = 32;

// Lightening Field (variant 2 slot 1)
export const LIGHTNING_FIELD_SPAWN_MS = 70;
export const LIGHTNING_FIELD_BOLT_MS = 220;
export const LIGHTNING_FIELD_STRING_COUNT = 12;
export const LIGHTNING_FIELD_LOOP_MS = 600;

// Railgun
export const RAILGUN_IMPACT_DURATION_MS = 650;
export const RAILGUN_FLASH_DURATION_MS = 140;
export const RAILGUN_PEN_DURATION_MS = 220;
export const RAILGUN_MUZZLE_FADEOUT_MS = 150;
export const RAILGUN_RESPAWN_DELAY_MS = 2000;
export const RAILGUN_FLASH_SLOTS = 2;
export const RAILGUN_IMPACT_SLOTS = 3;

// Missile
export const MISSILE_IMPACT_DURATION_MS = 500;
export const MISSILE_SECOND_FIRE_DELAY_MS = 200;
export const MISSILE_RESPAWN_DELAY_MS = 1000;
export const MISSILE_SLOTS = 2;
export const MISSILE_IMPACT_SLOTS = 4;
export const TORPEDO_SPEED_SCALE = 0.66;
export const TORPEDO_IMPACT_DURATION_MS = 900;

// Plasma
export const PLASMA_IMPACT_DURATION_MS = 700;
export const PLASMA_IMPACT_THROTTLE_MS = 250;
export const PLASMA_PARTICLE_INTERVAL_MS = 25;
export const PLASMA_PARTICLE_SLOTS = 20;
export const PLASMA_IMPACT_SLOTS = 4;

// Hold (same-tile): fade to hologram, hold, fade to solid, hold, repeat
export const HOLD_HOLOGRAM_FADE_MS = 500;
export const HOLD_HOLOGRAM_HOLD_MS = 250;
export const HOLD_HOLOGRAM_CYCLE_MS =
  HOLD_HOLOGRAM_FADE_MS + HOLD_HOLOGRAM_HOLD_MS + HOLD_HOLOGRAM_FADE_MS + HOLD_HOLOGRAM_HOLD_MS;

// Flee / Retreat
export const FLEE_GLOW_BUILD_MS = 500;
export const FLEE_ZOOM_DURATION_MS = 650;
export const RETREAT_GLOW_BUILD_MS = 600;
