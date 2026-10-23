export type Burst = {
  colorA: string;
  colorB: string;
  count: number;
  speed: number;
  size: number;
  life: number;
  /** world units / s^2 — positive rises, negative falls */
  gravity: number;
  drag: number;
  /** how much of the velocity is tangential rather than radial */
  spread: number;
};

export type Era = {
  id: string;
  title: string;
  label: string;
  text: string;
  tickMain: string;
  tickUnit: string;
  ageLong: string;
  map: string;
  /** colour grade applied on top of the map */
  tint: string;
  /** 0 = lit only, 1 = fully self-illuminated */
  emissive: number;
  atmos: string;
  atmosStr: number;
  displace: number;
  cloud: number;
  lights: number;
  /** colour of the halo behind the planet */
  glow: string;
  ripple: string;
  burst: Burst;
};

export const ERAS: Era[] = [
  {
    id: "protoplanet",
    title: "Protoplanet",
    label: "4.6 billion years ago",
    text: "Dust and rock collide inside the young solar nebula. Every impact adds heat, and the growing Earth is a glowing pile of debris with no solid surface to stand on.",
    tickMain: "4.6",
    tickUnit: " GA",
    ageLong: "\u22124.60 GA",
    map: "maps/protoplanet.jpg",
    tint: "#f0d6ba",
    emissive: 0.3,
    atmos: "#ff8a3d",
    atmosStr: 0.55,
    displace: 1,
    cloud: 0,
    lights: 0,
    glow: "#7a4520",
    ripple: "#ffb070",
    burst: {
      colorA: "#ffc98a",
      colorB: "#ff7a32",
      count: 230,
      speed: 1.7,
      size: 0.05,
      life: 1.5,
      gravity: -0.1,
      drag: 1.5,
      spread: 0.5,
    },
  },
  {
    id: "magma",
    title: "Magma Ocean",
    label: "4.5 billion years ago",
    text: "A global magma ocean churns beneath an atmosphere of vaporised rock. Metal sinks to form the core, and the last giant impacts shake the whole planet molten.",
    tickMain: "4.5",
    tickUnit: " GA",
    ageLong: "\u22124.50 GA",
    map: "maps/magma.jpg",
    tint: "#ffffff",
    emissive: 0.92,
    atmos: "#ff5a1e",
    atmosStr: 0.8,
    displace: 0.3,
    cloud: 0.07,
    lights: 0,
    glow: "#b33a10",
    ripple: "#ff7a2b",
    burst: {
      colorA: "#ffd08a",
      colorB: "#ff4e14",
      count: 270,
      speed: 1.25,
      size: 0.055,
      life: 1.9,
      gravity: 0.35,
      drag: 1.1,
      spread: 0.55,
    },
  },
  {
    id: "oceans",
    title: "First Oceans",
    label: "4.4 billion years ago",
    text: "The crust cools far enough for steam to condense. Rain falls for millions of years, pooling into the first oceans over black basalt.",
    tickMain: "4.4",
    tickUnit: " GA",
    ageLong: "\u22124.40 GA",
    map: "maps/oceans.jpg",
    tint: "#b9cee4",
    emissive: 0,
    atmos: "#9fc4ff",
    atmosStr: 0.55,
    displace: 0.05,
    cloud: 0.62,
    lights: 0,
    glow: "#2c4a72",
    ripple: "#cfe6ff",
    burst: {
      colorA: "#ffffff",
      colorB: "#bbd6f2",
      count: 160,
      speed: 0.55,
      size: 0.17,
      life: 2.3,
      gravity: 0.5,
      drag: 0.95,
      spread: 0.75,
    },
  },
  {
    id: "oxygen",
    title: "Great Oxidation",
    label: "2.4 billion years ago",
    text: "Cyanobacteria exhale oxygen. It rusts the iron dissolved in the sea into banded ironstone, and the methane haze burns out of the sky.",
    tickMain: "2.4",
    tickUnit: " GA",
    ageLong: "\u22122.40 GA",
    map: "maps/oxygen.jpg",
    tint: "#c6ecdb",
    emissive: 0.03,
    atmos: "#a8f0d0",
    atmosStr: 0.52,
    displace: 0.04,
    cloud: 0.46,
    lights: 0,
    glow: "#1f6b58",
    ripple: "#b8ffe0",
    burst: {
      colorA: "#dffff4",
      colorB: "#7fe9c4",
      count: 190,
      speed: 0.5,
      size: 0.1,
      life: 2.5,
      gravity: 0.7,
      drag: 0.85,
      spread: 0.8,
    },
  },
  {
    id: "snowball",
    title: "Snowball Earth",
    label: "650 million years ago",
    text: "Glacier ice crosses the equator. Volcanoes keep breathing carbon dioxide beneath the sheets until the planet snaps back, hard, into thaw.",
    tickMain: "650",
    tickUnit: " MA",
    ageLong: "\u22120.65 GA",
    map: "maps/snowball.jpg",
    tint: "#f2f8ff",
    emissive: 0,
    atmos: "#cfe6ff",
    atmosStr: 0.72,
    displace: 0.03,
    cloud: 0.3,
    lights: 0,
    glow: "#5c7fa8",
    ripple: "#ffffff",
    burst: {
      colorA: "#ffffff",
      colorB: "#a8ccff",
      count: 260,
      speed: 2.2,
      size: 0.042,
      life: 1.35,
      gravity: -1.4,
      drag: 1.35,
      spread: 0.5,
    },
  },
  {
    id: "pangaea",
    title: "Pangaea",
    label: "250 million years ago",
    text: "Every continent has drifted into one landmass, ringed by a single world-ocean and a super-desert interior wider than any sea.",
    tickMain: "250",
    tickUnit: " MA",
    ageLong: "\u22120.25 GA",
    map: "maps/pangaea.jpg",
    tint: "#f6dcbc",
    emissive: 0,
    atmos: "#ffd9a8",
    atmosStr: 0.5,
    displace: 0.04,
    cloud: 0.42,
    lights: 0,
    glow: "#7a5a2e",
    ripple: "#ffd9a8",
    burst: {
      colorA: "#f2dcb4",
      colorB: "#b08a58",
      count: 210,
      speed: 0.95,
      size: 0.085,
      life: 2.1,
      gravity: 0.15,
      drag: 1.25,
      spread: 0.85,
    },
  },
  {
    id: "today",
    title: "Today",
    label: "Present day",
    text: "8 billion people, 8.7 million described species, and a thin blue line of atmosphere read from orbit as the only boundary there is.",
    tickMain: "TODAY",
    tickUnit: "",
    ageLong: "PRESENT",
    map: "maps/today.jpg",
    tint: "#ffffff",
    emissive: 0,
    atmos: "#6fa8ff",
    atmosStr: 0.62,
    displace: 0.03,
    cloud: 0.52,
    lights: 1,
    glow: "#2a5fa8",
    ripple: "#8fb8ff",
    burst: {
      colorA: "#dce8ff",
      colorB: "#6fa8ff",
      count: 180,
      speed: 0.95,
      size: 0.06,
      life: 1.6,
      gravity: 0.1,
      drag: 1.35,
      spread: 0.6,
    },
  },
];

export const LAST = ERAS.length - 1;
