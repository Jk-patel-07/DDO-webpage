export type AppState = 'splash' | 'login' | 'dashboard';

export interface FloatingSymbol {
  id: string;
  char: string;
  x: number; // percentage
  y: number; // percentage
  size: number; // pixels
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  glow: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  opacity: number;
  color: string;
}

export type ThemePreset = 'gemini-cyan' | 'twilight-blue' | 'cosmic-aurora';

export type StudentTier = 'junior' | 'jee' | 'college';

export interface StudentProfile {
  id: StudentTier;
  label: string;
  desc: string;
  badge: string;
  targetTopics: string[];
}

export const STUDENT_PROFILES: StudentProfile[] = [
  {
    id: 'junior',
    label: 'Grades 8th - 10th',
    desc: 'Master algebra basics, geometry proofs, and interactive game quests designed for school curriculum.',
    badge: 'Foundation Tech',
    targetTopics: ['Quadratic Equations', 'Trigonometric Identities', 'Circle Proofs', 'AP & GP Series']
  },
  {
    id: 'jee',
    label: 'JEE Aspirants',
    desc: 'High-speed problem solver mode. Train with calculus races, coordinate geometry arrays, and complex vectors.',
    badge: 'Elite Matrix',
    targetTopics: ['Limits & Derivatives', 'Vectors & 3D Geometry', 'Complex Numbers', 'Integral Calculus']
  },
  {
    id: 'college',
    label: 'College Students',
    desc: 'Deep theory gamified. Explore linear algebra, eigenvalues, numerical methods, and quantum maths.',
    badge: 'Quantum Layer',
    targetTopics: ['Linear Transformations', 'Differential Equations', 'Numerical Matrix', 'Probability Fields']
  }
];
