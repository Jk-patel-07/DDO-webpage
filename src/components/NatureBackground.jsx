import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function NatureBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 40, stiffness: 90, mass: 1 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (event) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const skyX = useTransform(smoothX, [-0.5, 0.5], [-8, 8]);
  const skyY = useTransform(smoothY, [-0.5, 0.5], [-4, 4]);

  const cloudsX = useTransform(smoothX, [-0.5, 0.5], [-20, 20]);
  const cloudsY = useTransform(smoothY, [-0.5, 0.5], [-10, 10]);

  const mountainsX = useTransform(smoothX, [-0.5, 0.5], [-40, 40]);
  const mountainsY = useTransform(smoothY, [-0.5, 0.5], [-20, 20]);

  const riverX = useTransform(smoothX, [-0.5, 0.5], [-65, 65]);
  const riverY = useTransform(smoothY, [-0.5, 0.5], [-32, 32]);

  const treesX = useTransform(smoothX, [-0.5, 0.5], [-90, 90]);
  const treesY = useTransform(smoothY, [-0.5, 0.5], [-45, 45]);

  const grassX = useTransform(smoothX, [-0.5, 0.5], [-120, 120]);
  const grassY = useTransform(smoothY, [-0.5, 0.5], [-60, 60]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none bg-[#020806]">
      <motion.div className="absolute inset-[-10%] h-[120%] w-[120%]" style={{ x: skyX, y: skyY }}>
        <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#020806" />
              <stop offset="55%" stopColor="#051a13" />
              <stop offset="100%" stopColor="#0a2a1f" />
            </linearGradient>
            <radialGradient id="orbGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#skyGrad)" />
          <circle cx="150" cy="120" r="1.5" fill="#ffffff" opacity="0.6" />
          <circle cx="280" cy="80" r="2" fill="#a7f3d0" opacity="0.7" />
          <circle cx="420" cy="220" r="1" fill="#ffffff" opacity="0.4" />
          <circle cx="650" cy="100" r="2" fill="#38bdf8" opacity="0.8" />
          <circle cx="820" cy="180" r="1.5" fill="#ffffff" opacity="0.5" />
          <circle cx="980" cy="90" r="2" fill="#ffffff" opacity="0.7" />
          <circle cx="1150" cy="240" r="1" fill="#a7f3d0" opacity="0.4" />
          <circle cx="1300" cy="130" r="2.5" fill="#ffffff" opacity="0.9" />
          <circle cx="120" cy="300" r="1.5" fill="#ffffff" opacity="0.5" />
          <circle cx="550" cy="280" r="2" fill="#ffffff" opacity="0.6" />
          <circle cx="920" cy="310" r="1.5" fill="#38bdf8" opacity="0.5" />
          <circle cx="1100" cy="220" r="350" fill="url(#orbGrad)" />
          <circle cx="1100" cy="220" r="80" fill="#ffffff" opacity="0.04" />
          <circle cx="1100" cy="220" r="40" fill="#ffffff" opacity="0.06" />
        </svg>
      </motion.div>

      <motion.div className="absolute inset-[-10%] h-[120%] w-[120%]" style={{ x: cloudsX, y: cloudsY }}>
        <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100 250 C 150 180, 250 320, 500 280 C 700 250, 800 350, 1100 300 C 1300 270, 1400 320, 1600 290 L 1600 900 L -100 900 Z" fill="#041510" opacity="0.3" />
          <path d="M-100 320 C 200 280, 350 380, 650 340 C 900 310, 1050 420, 1350 380 C 1500 360, 1550 400, 1600 390 L 1600 900 L -100 900 Z" fill="#061c16" opacity="0.25" />
        </svg>
      </motion.div>

      <motion.div className="absolute inset-[-10%] h-[120%] w-[120%]" style={{ x: mountainsX, y: mountainsY }}>
        <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mountGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#08221a" />
              <stop offset="100%" stopColor="#04120e" />
            </linearGradient>
          </defs>
          <path d="M -100 550 L 150 380 L 350 490 L 600 320 L 780 430 L 1050 250 L 1250 390 L 1400 300 L 1600 450 L 1600 900 L -100 900 Z" fill="url(#mountGrad)" />
        </svg>
      </motion.div>

      <motion.div className="absolute inset-[-10%] h-[120%] w-[120%]" style={{ x: riverX, y: riverY }}>
        <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#061b14" />
              <stop offset="100%" stopColor="#030d0a" />
            </linearGradient>
            <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <path d="M -100 620 Q 300 500, 700 600 T 1600 580 L 1600 900 L -100 900 Z" fill="url(#hillGrad)" />
          <path
            d="M 1050 255 Q 1020 350, 850 420 T 700 550 T 600 680 T 400 900 L 480 900 Q 650 720, 680 620 T 900 480 T 1070 255 Z"
            fill="url(#riverGrad)"
            style={{ filter: "drop-shadow(0 0 10px rgba(45,212,191,0.5))" }}
          />
        </svg>
      </motion.div>

      <motion.div className="absolute inset-[-10%] h-[120%] w-[120%]" style={{ x: treesX, y: treesY }}>
        <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="treeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#041711" />
              <stop offset="100%" stopColor="#020a08" />
            </linearGradient>
          </defs>
          <g fill="url(#treeGrad)">
            <polygon points="80,720 105,630 90,630 110,560 95,560 115,500 135,560 120,560 140,630 125,630 150,720" />
            <polygon points="180,750 210,650 195,650 220,570 200,570 225,500 250,570 230,570 255,650 240,650 270,750" />
            <polygon points="20,700 40,630 30,630 45,570 35,570 50,520 65,570 55,570 70,630 60,630 80,700" />
            <polygon points="1200,680 1220,610 1210,610 1225,550 1215,550 1230,500 1245,550 1235,550 1250,610 1240,610 1260,680" />
            <polygon points="1280,720 1305,630 1290,630 1310,560 1295,560 1315,500 1335,560 1320,560 1340,630 1325,630 1350,720" />
            <polygon points="1350,740 1380,640 1365,640 1390,560 1370,560 1395,490 1420,560 1400,560 1425,640 1410,640 1440,740" />
            <polygon points="500,650 515,590 507,590 518,540 510,540 520,490 530,540 522,540 533,590 525,590 540,650" opacity="0.85" />
            <polygon points="560,660 575,600 567,600 578,550 570,550 580,500 590,550 582,550 593,600 585,600 600,660" opacity="0.85" />
          </g>
        </svg>
      </motion.div>

      <motion.div className="absolute inset-[-10%] h-[120%] w-[120%]" style={{ x: grassX, y: grassY }}>
        <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="foreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#020e09" />
              <stop offset="100%" stopColor="#010403" />
            </linearGradient>
          </defs>
          <g fill="url(#foreGrad)">
            <path d="M 0 900 L 0 780 C 80 820, 120 780, 200 810 C 280 840, 360 800, 450 830 C 580 860, 680 790, 800 820 C 950 850, 1100 810, 1250 840 C 1350 860, 1400 820, 1440 835 L 1440 900 Z" />
            <path d="M 50 810 Q 90 730, 140 760 Q 80 800, 50 810 Z" />
            <path d="M 120 820 Q 150 710, 220 730 Q 150 780, 120 820 Z" />
            <path d="M 380 825 Q 400 740, 460 760 Q 400 800, 380 825 Z" />
            <path d="M 750 820 Q 800 700, 880 730 Q 800 790, 750 820 Z" />
            <path d="M 1200 835 Q 1230 720, 1310 740 Q 1240 800, 1200 835 Z" />
            <path d="M 1300 845 Q 1350 750, 1410 780 Q 1350 820, 1300 845 Z" />
            <path d="M 0 0 C 100 50, 150 150, 100 250 C 70 200, 50 120, 0 100 Z" />
            <path d="M 0 0 C 150 10, 250 80, 280 180 C 200 120, 120 80, 0 50 Z" />
            <path d="M 0 0 C 80 120, 80 200, 40 280 C 20 200, 20 100, 0 0 Z" />
            <path d="M 1440 0 C 1340 50, 1290 150, 1340 250 C 1370 200, 1390 120, 1440 100 Z" />
            <path d="M 1440 0 C 1290 10, 1190 80, 1160 180 C 1240 120, 1320 80, 1440 50 Z" />
          </g>
        </svg>
      </motion.div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(2,8,6,0.3)_0%,rgba(2,8,6,0.85)_80%)]" />
    </div>
  );
}
