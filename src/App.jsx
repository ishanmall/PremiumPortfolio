import React, { useRef, useMemo, Suspense, useEffect, useState } from 'react';
import { 
  motion, 
  useScroll, 
  useMotionValue, 
  useSpring, 
  useTransform, 
  useReducedMotion, 
  AnimatePresence 
} from 'framer-motion';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import { 
  ArrowUpRight, Code2, Play, Briefcase, Camera, Tv, Award, 
  GraduationCap, BookOpen, Menu, X, Smartphone, Layers, 
  ShieldCheck, Database, Music, CheckCircle2, Mail, Send, Terminal, Globe, Rocket, BrainCircuit, MonitorSmartphone, Search, Filter, Cpu, Orbit, Wrench, Clock, Settings, Volume2, VolumeX, Languages
} from 'lucide-react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Sparkles, Grid, useProgress } from '@react-three/drei';

useGLTF.preload('/supercar.glb');

// ==========================================
// WEB AUDIO API SOUND SYSTEM
// ==========================================

let audioCtx = null;

const playUISound = () => {
  if (typeof window === 'undefined') return;
  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.05);
  } catch (e) {
    console.warn("Web Audio API not supported", e);
  }
};

// ==========================================
// TRANSLATION ENGINE & CONTEXT
// ==========================================

const TranslationContext = React.createContext({ lang: 'en', t: (en, hi) => en });

// ==========================================
// 3D TYPOGRAPHY SYSTEM
// ==========================================

const Text3D = ({
  children,
  className = '',
  depth = 6,
  gradient = null,
  color = 'text-slate-900',
  shadowColor = '#cbd5e1', 
  isMobile = false,
}) => {
  const activeDepth = isMobile ? Math.max(2, Math.floor(depth / 1.5)) : depth;
  
  const shadow = Array.from({ length: activeDepth })
    .map((_, i) => `${i + 1}px ${i + 1}px 0px ${shadowColor}`)
    .join(', ');

  return (
    <span className={`relative inline-block ${className} group cursor-default`}>
      <span
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none transition-transform duration-300 group-hover:-translate-x-1.5 group-hover:-translate-y-1.5"
        style={{ color: 'transparent', textShadow: shadow, zIndex: -1 }}
      >
        {children}
      </span>
      <span 
        className={`relative z-10 block transition-transform duration-300 group-hover:-translate-x-1.5 group-hover:-translate-y-1.5 ${
          gradient ? `bg-clip-text text-transparent bg-gradient-to-r ${gradient}` : color
        }`}
      >
        {children}
      </span>
    </span>
  );
};

// ==========================================
// 3D SCENE & RACING RIG
// ==========================================

const trackCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(2, 0, 10), new THREE.Vector3(2, 0, -10),
  new THREE.Vector3(12, 0, -35), new THREE.Vector3(-10, 0, -65),
  new THREE.Vector3(0, 0, -110),
]);

const CameraRig = ({ scrollYProgress, isMobile, reducedMotion }) => {
  const { mouse, camera } = useThree();
  const currentOffset = useRef(new THREE.Vector3(-4, 1, 8));
  const currentLookAt = useRef(new THREE.Vector3());
  const trackPosition = useRef(new THREE.Vector3());
  const targetOffset = useRef(new THREE.Vector3());
  const targetCameraPos = useRef(new THREE.Vector3());
  const futureTrackPos = useRef(new THREE.Vector3());

  useFrame(() => {
    const scroll = Math.max(0, Math.min(1, scrollYProgress.get()));
    trackCurve.getPointAt(scroll, trackPosition.current);

    if (scroll < 0.22) targetOffset.current.set(isMobile ? -6 : -5, isMobile ? 2.5 : 1.5, isMobile ? 9 : 7);
    else if (scroll < 0.48) targetOffset.current.set(isMobile ? -6 : -8, 3, 0);
    else if (scroll < 0.75) targetOffset.current.set(isMobile ? 5 : 4, 2.5, 6);
    else targetOffset.current.set(0, isMobile ? 5 : 4, isMobile ? 14 : 12);

    currentOffset.current.lerp(targetOffset.current, 0.025);
    targetCameraPos.current.copy(trackPosition.current).add(currentOffset.current);
    camera.position.lerp(targetCameraPos.current, 0.05);

    const futureScroll = Math.min(1, scroll + 0.1);
    trackCurve.getPointAt(futureScroll, futureTrackPos.current);
    futureTrackPos.current.y += 1;

    if (currentLookAt.current.length() === 0) currentLookAt.current.copy(futureTrackPos.current);
    currentLookAt.current.lerp(futureTrackPos.current, 0.05);
    camera.lookAt(currentLookAt.current);
  });
  return null;
};

const RacingCar = ({ scrollYProgress, isMobile, reducedMotion }) => {
  const carGroup = useRef(null);
  const chassisGroupRef = useRef(null);
  const wheelRefs = useRef([]);
  const trailGeo = useRef();
  const trailIndex = useRef(0);

  const quatHelper = useRef(new THREE.Quaternion());
  const matrixHelper = useRef(new THREE.Matrix4());
  const upVector = useRef(new THREE.Vector3(0, 1, 0));
  const curvePos = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3());
  const tangent = useRef(new THREE.Vector3());
  const tAhead = useRef(new THREE.Vector3());
  const bankQuat = useRef(new THREE.Quaternion());
  const behindVec = useRef(new THREE.Vector3());

  const { scene: carScene } = useGLTF('/supercar.glb');
  const trailCount = isMobile ? 20 : 100;
  const physics = useRef({ lastScroll: 0, velocity: 0, smoothedVelocity: 0 });
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const userQuatAccum = useRef(new THREE.Quaternion());

  useEffect(() => {
    if (isMobile) return;
    const handleMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      const yawDelta = new THREE.Quaternion().setFromAxisAngle(upVector.current, dx * 0.006);
      const pitchDelta = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * 0.006);
      userQuatAccum.current.premultiply(yawDelta).premultiply(pitchDelta);
    };
    const handleUp = () => { isDragging.current = false; };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isMobile]);

  useEffect(() => { physics.current.lastScroll = scrollYProgress.get(); }, [scrollYProgress]);

  const trailData = useMemo(() => {
    const positions = new Float32Array(trailCount * 3);
    const opacities = new Float32Array(trailCount);
    const physicsData = Array(trailCount).fill(0).map(() => ({ life: 0 }));
    return { positions, opacities, physicsData };
  }, [trailCount]);

  useEffect(() => {
    carScene.traverse((child) => {
      if (child.isMesh && child.material?.name) {
        if (child.material.name.includes('Headlight') || child.material.name.includes('Brake')) {
          child.material.toneMapped = false;
          child.material.emissiveIntensity = isMobile ? 2 : 5;
        }
      }
    });
    wheelRefs.current = [
      carScene.getObjectByName('Wheel_FL'), carScene.getObjectByName('Wheel_FR'),
      carScene.getObjectByName('Wheel_RL'), carScene.getObjectByName('Wheel_RR')
    ];
  }, [carScene, isMobile]);

  useFrame((state, delta) => {
    if (!carGroup.current) return;
    const scroll = Math.max(0, Math.min(1, scrollYProgress.get()));
    const p = physics.current;
    const safeDelta = Math.max(delta, 1e-4);

    const rawVelocity = ((scroll - p.lastScroll) / safeDelta) * 0.01;
    p.velocity = THREE.MathUtils.lerp(p.velocity, rawVelocity, 0.1);
    p.smoothedVelocity = THREE.MathUtils.lerp(p.smoothedVelocity, Math.abs(p.velocity), 0.05);
    p.lastScroll = scroll;

    trackCurve.getPointAt(scroll, curvePos.current);
    const hover = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 1.2) * 0.06 + 0.05;
    targetPos.current.copy(curvePos.current);
    targetPos.current.y += hover;
    carGroup.current.position.lerp(targetPos.current, 0.12);

    trackCurve.getTangentAt(scroll, tangent.current).normalize();
    trackCurve.getTangentAt(Math.min(1, scroll + 0.01), tAhead.current).normalize();

    const turnAmount = tangent.current.x * tAhead.current.z - tangent.current.z * tAhead.current.x;
    const bankAngle = THREE.MathUtils.clamp(-turnAmount * 40, -0.35, 0.35);

    matrixHelper.current.lookAt(new THREE.Vector3(0, 0, 0), tangent.current, upVector.current);
    quatHelper.current.setFromRotationMatrix(matrixHelper.current);
    bankQuat.current.setFromAxisAngle(tangent.current, bankAngle);
    quatHelper.current.premultiply(bankQuat.current);
    quatHelper.current.multiply(userQuatAccum.current);
    carGroup.current.quaternion.slerp(quatHelper.current, 0.08);

    wheelRefs.current.forEach((wheel) => { if (wheel) wheel.rotation.x -= p.smoothedVelocity * 6; });

    if (chassisGroupRef.current && !reducedMotion) {
      const breathe = Math.sin(state.clock.elapsedTime * 0.8) * 0.015;
      chassisGroupRef.current.rotation.z = THREE.MathUtils.lerp(chassisGroupRef.current.rotation.z, breathe, 0.05);
      chassisGroupRef.current.position.y = THREE.MathUtils.lerp(
        chassisGroupRef.current.position.y, Math.sin(state.clock.elapsedTime * 1.5) * 0.02, 0.05
      );
    }

    if (!reducedMotion && trailGeo.current) {
      const dData = trailData.physicsData;
      const positions = trailGeo.current.attributes.position.array;
      const opacities = trailGeo.current.attributes.opacity.array;

      if (p.smoothedVelocity > 0.015) {
        const idx = trailIndex.current;
        dData[idx].life = 1.0;
        behindVec.current.copy(tangent.current).multiplyScalar(-1.2);
        positions[idx * 3] = carGroup.current.position.x + behindVec.current.x + (Math.random() - 0.5) * 0.15;
        positions[idx * 3 + 1] = carGroup.current.position.y - 0.25;
        positions[idx * 3 + 2] = carGroup.current.position.z + behindVec.current.z + (Math.random() - 0.5) * 0.15;
        trailIndex.current = (idx + 1) % trailCount;
      }
      for (let i = 0; i < trailCount; i++) {
        if (dData[i].life > 0) {
          dData[i].life -= safeDelta * 0.8;
          opacities[i] = Math.max(0, dData[i].life) * 0.6;
        }
      }
      trailGeo.current.attributes.position.needsUpdate = true;
      trailGeo.current.attributes.opacity.needsUpdate = true;
    }
  });

  return (
    <group>
      <group ref={carGroup}>
        <group ref={chassisGroupRef}>
          <primitive object={carScene} scale={isMobile ? 0.85 : 1} position={[0, -0.5, 0]} />
        </group>
        <pointLight position={[0, 1, 0]} color="#ec4899" intensity={isMobile ? 1 : 2.5} distance={6} />
        <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.5, 5]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      </group>
      {!reducedMotion && (
        <points>
          <bufferGeometry ref={trailGeo}>
            <bufferAttribute attach="attributes-position" count={trailCount} array={trailData.positions} itemSize={3} />
            <bufferAttribute attach="attributes-opacity" count={trailCount} array={trailData.opacities} itemSize={1} />
          </bufferGeometry>
          <shaderMaterial
            transparent
            depthWrite={false}
            vertexShader={`attribute float opacity; varying float vOpacity; void main() { vOpacity = opacity; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (60.0 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition; }`}
            fragmentShader={`varying float vOpacity; void main() { vec2 xy = gl_PointCoord.xy - vec2(0.5); float ll = length(xy); if(ll > 0.5) discard; gl_FragColor = vec4(0.2, 0.8, 0.9, vOpacity * (1.0 - (ll * 2.0))); }`}
          />
        </points>
      )}
    </group>
  );
};

const LoaderOverlay = () => {
  const { progress, active } = useProgress();
  return (
    <AnimatePresence>
      {active && (
        <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f8fafc]">
          <Text3D depth={8} className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4 animate-pulse" gradient="from-cyan-400 via-pink-500 to-blue-600">ISHAN</Text3D>
          <div className="w-56 h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs font-mono font-bold text-slate-500 mt-3 tracking-widest">INITIALIZING ASSETS {Math.round(progress)}%</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Global3DScene = ({ scrollYProgress, isMobile, reducedMotion }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#f8fafc]">
      <Canvas dpr={isMobile ? [1, 1] : [1, 1.5]} camera={{ fov: isMobile ? 55 : 45 }} gl={{ alpha: false, antialias: !isMobile }} onCreated={({ gl }) => gl.setClearColor('#f8fafc')}>
        <Suspense fallback={null}>
          <CameraRig scrollYProgress={scrollYProgress} isMobile={isMobile} reducedMotion={reducedMotion} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 20, 10]} intensity={1} color="#ffffff" castShadow />
          <spotLight position={[-10, 10, 5]} intensity={2} color="#ec4899" angle={0.3} penumbra={1} />
          <spotLight position={[10, 5, -5]} intensity={2} color="#06b6d4" angle={0.3} penumbra={1} />
          <Grid position={[0, -0.51, 0]} args={[200, 200]} cellSize={1} cellThickness={1} cellColor="#e2e8f0" sectionSize={5} sectionThickness={1.5} sectionColor="#cbd5e1" fadeDistance={65} fadeStrength={1} />
          <RacingCar scrollYProgress={scrollYProgress} isMobile={isMobile} reducedMotion={reducedMotion} />
          {!reducedMotion && <Sparkles count={isMobile ? 30 : 120} scale={60} size={isMobile ? 1.5 : 3} speed={0.4} opacity={0.3} color="#ec4899" />}
          <fog attach="fog" args={['#f8fafc', 10, isMobile ? 40 : 50]} />
        </Suspense>
      </Canvas>
    </div>
  );
};

// ==========================================
// UI & SECTIONS
// ==========================================

const Nav = ({ voiceEnabled, setVoiceEnabled, lang, setLang }) => {
  const { t } = React.useContext(TranslationContext);
  const [isOpen, setIsOpen] = useState(false);
  const links = [
    { en: 'Experience', hi: 'अनुभव' },
    { en: 'Database', hi: 'डेटाबेस' },
    { en: 'Lab', hi: 'प्रयोगशाला' },
    { en: 'Matrix', hi: 'मैट्रिक्स' },
    { en: 'Credentials', hi: 'प्रमाणपत्र' },
    { en: 'Contact', hi: 'संपर्क' }
  ];

  const handleVoiceToggle = () => {
    playUISound();
    setVoiceEnabled(!voiceEnabled);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  const handleLangToggle = () => {
    playUISound();
    setLang(lang === 'en' ? 'hi' : 'en');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="fixed top-0 left-0 right-0 z-50 p-4 md:px-8 md:py-5 flex justify-between items-center backdrop-blur-xl border-b shadow-lg bg-white/75 border-black/5 shadow-slate-200/40"
      >
        <a href="#" onClick={playUISound} className="flex items-center gap-2">
          <Text3D depth={3} className="text-xl md:text-2xl font-black tracking-tighter" gradient="from-cyan-400 via-pink-500 to-blue-600">
            ISHAN
          </Text3D>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-600 border border-pink-500/20 shadow-sm">
            PORTFOLIO 3D
          </span>
        </a>

        <ul className="hidden md:flex gap-8 text-sm font-bold text-slate-800">
          {links.map((item) => (
            <li key={item.en}>
              <a href={`#${item.en.toLowerCase()}`} onClick={playUISound} className="relative group block">
                <Text3D depth={2} color="text-slate-700" shadowColor="#e2e8f0" className="transition-colors group-hover:text-pink-500">
                  {lang === 'hi' ? item.hi : item.en}
                </Text3D>
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <button 
            className="no-tts flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold text-slate-700 bg-white border border-slate-200 shadow-sm transition-all active:scale-95 hover:bg-slate-50"
            onClick={handleLangToggle}
          >
            <Languages size={16} className="text-blue-500" />
            <span>{lang === 'en' ? 'हिंदी' : 'ENG'}</span>
          </button>
          
          <button 
            className="no-tts flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold text-slate-700 bg-white border border-slate-200 shadow-sm transition-all active:scale-95 hover:bg-slate-50"
            onClick={handleVoiceToggle}
          >
            {voiceEnabled ? <Volume2 size={16} className="text-pink-500 animate-pulse" /> : <VolumeX size={16} />}
            <span>{voiceEnabled ? t('Voice ON', 'आवाज़ चालू') : t('Voice OFF', 'आवाज़ बंद')}</span>
          </button>
          
          <motion.a
            href="https://play.google.com/store/apps/dev?id=4926136840256493221" target="_blank" rel="noreferrer" onClick={playUISound}
            whileHover={{ y: -3, boxShadow: '0 12px 20px -3px rgba(236, 72, 153, 0.5)' }} whileTap={{ y: 0, boxShadow: '0 2px 5px -1px rgba(236, 72, 153, 0.4)' }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-pink-500 shadow-md transition-all"
          >
            <Play size={14} fill="currentColor" /> {t('Play Store', 'प्ले स्टोर')}
          </motion.a>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <button className="no-tts p-2 text-slate-700 bg-slate-100 rounded-full active:scale-95 transition-transform" onClick={handleLangToggle}>
            <Languages size={18} className="text-blue-500" />
          </button>
          <button className="no-tts p-2 text-slate-700 bg-slate-100 rounded-full active:scale-95 transition-transform" onClick={handleVoiceToggle}>
            {voiceEnabled ? <Volume2 size={18} className="text-pink-500" /> : <VolumeX size={18} />}
          </button>
          <button className="p-2 text-slate-800 active:scale-95 transition-transform" onClick={() => { playUISound(); setIsOpen(!isOpen); }}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed inset-0 z-40 bg-white/95 backdrop-blur-2xl pt-24 px-6 flex flex-col gap-6 md:hidden">
            {links.map((item) => (
              <a key={item.en} href={`#${item.en.toLowerCase()}`} onClick={() => { playUISound(); setIsOpen(false); }} className="text-3xl font-black text-slate-800 hover:text-pink-500 border-b border-slate-100 pb-4 active:scale-95 transition-transform">
                {lang === 'hi' ? item.hi : item.en}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Hero = ({ rotateX, rotateY, isMobile }) => {
  const { t } = React.useContext(TranslationContext);
  return (
    <section className="h-[100svh] flex flex-col justify-center p-6 md:p-10 relative z-10 perspective-[1200px] pointer-events-none">
      <motion.div style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }} className="w-full max-w-7xl mx-auto pointer-events-auto mt-20 md:mt-28 will-change-transform">
        <div className="overflow-hidden mb-6">
          <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2, type: 'spring', stiffness: 100 }} whileHover={!isMobile ? { y: -4, boxShadow: '0px 10px 20px -5px rgba(236, 72, 153, 0.3)' } : {}}>
            <div onClick={playUISound} className="tts-card relative inline-flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-xl border border-pink-500/20 bg-white/90 text-pink-600 shadow-sm transition-all hover:shadow-md cursor-pointer active:scale-95">
              <span className="text-xs md:text-sm font-bold uppercase tracking-wider">Kotlin / React / WebGL</span>
              <span className="w-2 h-2 rounded-full animate-pulse bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <span className="hidden md:block text-xs md:text-sm uppercase tracking-wider text-slate-700">{t('Native & Web3D Engineer', 'नेटिव और वेब 3डी इंजीनियर')}</span>
            </div>
          </motion.div>
        </div>

        <h1 className="tts-card text-[14vw] md:text-[9.5vw] leading-[0.88] tracking-tighter uppercase font-black flex flex-col items-start relative select-none cursor-pointer">
          <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.25 }}>
            <Text3D depth={isMobile ? 4 : 8} isMobile={isMobile} shadowColor="#94a3b8" color="text-slate-900">{t('ANDROID', 'एंड्रॉइड')}</Text3D>
          </motion.div>
          <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.35 }}>
            <Text3D depth={isMobile ? 4 : 8} isMobile={isMobile} shadowColor="#c084fc" gradient="from-pink-500 via-purple-500 to-indigo-600">{t('& WEB 3D', 'और वेब 3डी')}</Text3D>
          </motion.div>
          <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.45 }}>
            <Text3D depth={isMobile ? 4 : 8} isMobile={isMobile} shadowColor="#67e8f9" gradient="from-cyan-400 via-blue-500 to-pink-500">{t('ENGINEER', 'इंजीनियर')}</Text3D>
          </motion.div>
        </h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} onClick={playUISound} className="tts-card mt-10 max-w-xl text-slate-600 font-semibold text-sm md:text-base leading-relaxed backdrop-blur-sm bg-white/40 p-4 rounded-2xl border border-white/60 shadow-md cursor-pointer">
          {t('Crafting high-throughput, offline-first mobile experiences powered by reactive state engines, strict clean architecture, and modern immersive Three.js interactive web environments.',
             'रिएक्टिव स्टेट इंजन, सख्त क्लीन आर्किटेक्चर और आधुनिक इमर्सिव Three.js वेब वातावरण द्वारा संचालित उच्च-थ्रूपुट, ऑफ़लाइन-फर्स्ट मोबाइल अनुभव तैयार करना।')}
        </motion.p>
      </motion.div>
    </section>
  );
};

const Statistics = ({ rotateX, rotateY, isMobile }) => {
  const { t } = React.useContext(TranslationContext);
  const stats = [
    { label: t('Projects', 'प्रोजेक्ट्स'), value: '10+' },
    { label: t('Web Platforms', 'वेब प्लेटफॉर्म'), value: '4+' },
    { label: t('Technologies', 'तकनीकें'), value: '20+' },
    { label: t('Credentials', 'प्रमाणपत्र'), value: '30+' },
    { label: t('Features', 'विशेषताएं'), value: '100+' },
  ];

  return (
    <section className="py-12 md:py-20 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }} className="max-w-7xl mx-auto px-6 md:px-10 pointer-events-auto will-change-transform">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
          {stats.map((stat, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.5, delay: idx * 0.05 }} onClick={playUISound} className="tts-card p-4 rounded-2xl border bg-white/80 backdrop-blur-xl border-black/5 shadow-sm text-center flex flex-col justify-center cursor-pointer active:scale-95 transition-transform">
              <Text3D depth={2} className="text-3xl font-black mb-1" gradient="from-pink-500 to-blue-500" shadowColor="#e2e8f0">{stat.value}</Text3D>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

const ProfileAndExperience = ({ rotateX, rotateY, isMobile }) => {
  const { t } = React.useContext(TranslationContext);
  const experiences = [
    {
      role: t('Lead Android & Web Engineer', 'लीड एंड्रॉइड और वेब इंजीनियर'),
      type: t('Independent / Studio Work', 'स्वतंत्र / स्टूडियो कार्य'),
      period: t('Aug 2025 – Present', 'अगस्त 2025 - वर्तमान'),
      bullets: [
        t('Engineered 6+ production mobile apps utilizing Kotlin, Jetpack Compose, Room, Hilt, and heavily scalable offline-first storage patterns.', 'कॉटलिन, जेटपैक कंपोज़ और रूम का उपयोग करके 6+ प्रोडक्शन मोबाइल ऐप विकसित किए।'),
        t('Pioneered complex dual-audio routing engines & extensive foreground-service infrastructures using Media3/ExoPlayer & WorkManager.', 'Media3 और WorkManager का उपयोग करके जटिल डुअल-ऑडियो रूटिंग इंजन तैयार किए।'),
        t('Architected extensive document manipulation capabilities integrating Apache POI for Excel/PDF processing directly on-device.', 'डिवाइस पर ही एक्सेल/पीडीएफ प्रोसेसिंग के लिए अपाचे POI को एकीकृत किया।'),
        t('Built immersive interactive full-stack web environments combining React, Three.js, WebGL, GSAP, and Firebase Serverless backends.', 'रिएक्ट, Three.js और फायरबेस को मिलाकर इमर्सिव फुल-स्टैक वेब वातावरण बनाया।')
      ]
    },
    {
      role: t('System Architect & UI Contributor', 'सिस्टम आर्किटेक्ट और UI योगदानकर्ता'),
      type: t('Open Source Ecosystem', 'ओपन सोर्स इकोसिस्टम'),
      period: t('Jan 2025 – Jul 2025', 'जनवरी 2025 - जुलाई 2025'),
      bullets: [
        t('Built highly modular Clean Architecture multi-module templates utilizing Hilt Dependency Injection.', 'हिल्ट डिपेंडेंसी इंजेक्शन का उपयोग करके अत्यधिक मॉड्यूलर क्लीन आर्किटेक्चर टेम्पलेट बनाए।'),
        t('Implemented advanced dynamic rendering services leveraging OpenGL and WebGL surface bridges.', 'OpenGL और WebGL सरफेस ब्रिज का लाभ उठाते हुए उन्नत डायनेमिक रेंडरिंग लागू की।'),
        t('Profiled and eliminated frame-skips and GC spikes in both Android Studio Profiler and Chrome V8 engines for high-performance fluid animations.', 'हाई-परफॉरमेंस एनिमेशन के लिए फ्रेम-स्किप और GC स्पाइक्स को खत्म किया।')
      ]
    }
  ];

  return (
    <section id="experience" className="py-10 md:py-20 px-6 md:px-10 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }} className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pointer-events-auto items-start will-change-transform">
        <div className="lg:col-span-4 order-1 relative">
          <motion.div initial={{ rotateY: 15, opacity: 0, y: 30 }} whileInView={{ rotateY: isMobile ? 0 : 5, opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8 }} whileHover={!isMobile ? { scale: 1.02, rotateY: 8, rotateX: 4, y: -5, boxShadow: '25px 25px 50px -12px rgba(0,0,0,0.25)' } : {}} className="tts-card w-full max-w-sm mx-auto lg:mx-0 rounded-3xl overflow-hidden border shadow-xl backdrop-blur-xl p-2.5 bg-white/80 border-black/5 sticky top-32 transition-all duration-300 cursor-pointer active:scale-95" onClick={playUISound}>
            <div className="rounded-2xl overflow-hidden aspect-[4/5] relative bg-slate-200">
              <img src="/isha.ndisha_1785611777_3954320607764516452_77465641188.webp" alt="Ishan Mall" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-center z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/30 to-transparent z-10" />
              <div className="absolute bottom-0 left-0 p-5 md:p-6 w-full z-20">
                <Text3D depth={3} className="text-2xl md:text-3xl font-black mb-3" color="text-white" shadowColor="#1e293b">{t('Ishan Mall', 'ईशान मल्ल')}</Text3D>
                <div className="space-y-2 mt-2">
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><GraduationCap size={16} className="text-cyan-400 shrink-0" /> {t('B.Tech CSE (2024-2027), AKTU', 'बी.टेक सीएसई (2024-2027), AKTU')}</p>
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><Award size={16} className="text-pink-400 shrink-0" /> {t('Class XII Science (2022)', 'कक्षा १२ विज्ञान (२०२२)')}</p>
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><BookOpen size={16} className="text-blue-400 shrink-0" /> {t('Class X (2020)', 'कक्षा १० (२०२०)')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-8 order-2 space-y-10 lg:pl-4">
          <motion.div onClick={playUISound} whileHover={!isMobile ? { y: -4, boxShadow: '0px 20px 40px -10px rgba(0,0,0,0.15)' } : {}} className="tts-card p-6 md:p-8 rounded-3xl border shadow-xl backdrop-blur-xl bg-gradient-to-br from-blue-50/90 to-purple-50/90 border-black/5 text-slate-800 transition-all duration-300 cursor-pointer">
            <div className="mb-4">
              <Text3D depth={3} className="text-2xl font-black tracking-tight" gradient="from-slate-900 via-blue-900 to-slate-800" shadowColor="#93c5fd">{t('Professional Summary', 'व्यावसायिक सारांश')}</Text3D>
            </div>
            <p className="text-sm md:text-base font-medium leading-relaxed text-slate-700">
              {t('Versatile software engineer focused on building highly reliable Android mobile applications and deeply interactive 3D Web experiences. Proficient in Kotlin, Jetpack Compose, Hilt, and Room for massive offline-first data pipelines, as well as React, Three.js, and WebGL for cutting-edge browser-based graphics.',
                 'अत्यधिक विश्वसनीय एंड्रॉइड मोबाइल एप्लिकेशन और गहराई से इंटरैक्टिव 3डी वेब अनुभव बनाने पर केंद्रित एक बहुमुखी सॉफ्टवेयर इंजीनियर। बड़े पैमाने पर ऑफ़लाइन-फर्स्ट डेटा पाइपलाइनों के लिए कॉटलिन, जेटपैक कंपोज़, हिल्ट और रूम के साथ-साथ अत्याधुनिक ब्राउज़र-आधारित ग्राफिक्स के लिए रिएक्ट, Three.js और WebGL में पारंगत।')}
            </p>
          </motion.div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Text3D depth={4} className="tts-card text-2xl md:text-4xl font-black tracking-tight cursor-pointer" color="text-slate-900" shadowColor="#cbd5e1">{t('Work Milestones', 'कार्य के मील के पत्थर')}</Text3D>
            </div>

            {experiences.map((exp, i) => (
              <motion.div key={i} onClick={playUISound} whileHover={!isMobile ? { y: -6, boxShadow: '0px 20px 40px -10px rgba(0,0,0,0.15)' } : {}} className="tts-card p-6 md:p-8 rounded-3xl border shadow-xl backdrop-blur-xl bg-white/85 border-black/5 transition-all duration-300 cursor-pointer">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                  <Text3D depth={2} color="text-slate-900" shadowColor="#e2e8f0" className="text-xl md:text-2xl font-black">{exp.role}</Text3D>
                  <span className="text-xs font-mono font-bold text-cyan-600 bg-cyan-500/10 px-3 py-1 rounded-full w-fit shadow-sm">{exp.period}</span>
                </div>
                <p className="text-xs uppercase tracking-wider font-bold text-pink-500 mb-6">{exp.type}</p>
                <ul className="space-y-3 text-sm md:text-base font-medium text-slate-700">
                  {exp.bullets.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-3"><span className="text-pink-500 mt-1 shrink-0 font-black">✦</span><span>{b}</span></li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

const UnifiedDatabase = ({ rotateX, rotateY, isMobile }) => {
  const { t } = React.useContext(TranslationContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filters = ['ALL', 'Projects', 'Websites', 'Android', 'Technologies'];

  const allItems = [
    {
      title: 'GalleryBox', type: 'App', category: 'Android',
      desc: t('Large-scale multi-domain multimedia platform combining Gallery, Stories, Trash lifecycles, Duo Music Player, Radio, and Video processing tools.', 'गैलरी, स्टोरीज़, ट्रैश लाइफ़साइकिल, डुओ म्यूज़िक प्लेयर, रेडियो और वीडियो प्रोसेसिंग टूल के संयोजन वाला बड़े पैमाने का मल्टी-डोमेन मल्टीमीडिया प्लेटफॉर्म।'),
      tags: ['Android', 'Kotlin', 'Compose', 'Projects', 'Technologies', 'Media3', 'Room'],
      icon: <Camera size={24} className="text-pink-500" />,
      url: 'https://play.google.com/store/apps/details?id=com.gallerybox'
    },
    {
      title: 'Ananta Brahmanda', type: 'App', category: 'Android',
      desc: t('Spiritual and cosmic knowledge platform combining Vedic ephemeris with exact alarms, notifications, and persistent location background services.', 'सटीक अलार्म, सूचनाओं और स्थान पृष्ठभूमि सेवाओं के साथ वैदिक पंचांग के संयोजन वाला आध्यात्मिक और ब्रह्मांडीय ज्ञान मंच।'),
      tags: ['Android', 'Kotlin', 'Projects', 'Firebase', 'Location'],
      icon: <Globe size={24} className="text-purple-500" />,
      url: 'https://play.google.com/store/apps/details?id=com.brahmanda'
    },
    {
      title: 'ResumeMakers', type: 'App', category: 'Android',
      desc: t('Comprehensive offline Android resume creator utilizing Apache POI for Excel and document processing, local DB, and FileProvider export infrastructure.', 'एक्सेल और दस्तावेज़ प्रसंस्करण के लिए अपाचे POI का उपयोग करने वाला व्यापक ऑफ़लाइन एंड्रॉइड बायोडाटा निर्माता।'),
      tags: ['Android', 'Kotlin', 'Projects', 'Technologies', 'Apache POI'],
      icon: <Layers size={24} className="text-blue-500" />,
      url: 'https://play.google.com/store/apps/details?id=com.ishanmall.resumemaker'
    },
    {
      title: 'Ananta Gita', type: 'App', category: 'Android',
      desc: t('Deeply immersive multilingual scripture reader covering the complete 18 Adhyayas. Translates Sanskrit source text into Hindi and English.', 'संपूर्ण 18 अध्यायों को कवर करने वाला गहराई से इमर्सिव बहुभाषी शास्त्र पाठक। संस्कृत को हिंदी और अंग्रेजी में अनुवाद करता है।'),
      tags: ['Android', 'Projects', 'Firebase'],
      icon: <BookOpen size={24} className="text-orange-500" />,
      url: 'https://play.google.com/store/apps/details?id=com.anantagita'
    },
    {
      title: 'Cosmic Codex', type: 'Web3D', category: 'Websites',
      desc: t('Extensible astrophysical simulation suite featuring multiple cosmic environments (Black Holes, Neutron Stars) built on React Three Fiber.', 'रिएक्ट थ्री फाइबर पर निर्मित कई ब्रह्मांडीय वातावरण (ब्लैक होल, न्यूट्रॉन स्टार) की विशेषता वाला खगोल भौतिकी सिमुलेशन सुइट।'),
      tags: ['Websites', 'React', 'Three.js', 'Technologies'],
      icon: <Orbit size={24} className="text-indigo-500" />,
      url: 'https://cosmic-codex-14559.web.app/'
    },
    {
      title: 'Premium Portfolio 3D', type: 'Web3D', category: 'Websites',
      desc: t('Immersive interactive portfolio experience featuring a scroll-driven racing-car rig, dynamic particles, physics velocity, and bloom.', 'स्क्रॉल-संचालित रेसिंग-कार, गतिशील कणों और भौतिकी वेग की विशेषता वाला इमर्सिव इंटरैक्टिव पोर्टफोलियो अनुभव।'),
      tags: ['Websites', 'React', 'Three.js', 'WebGL', 'Projects'],
      icon: <MonitorSmartphone size={24} className="text-pink-500" />,
      url: 'https://portfolio-b1973.web.app/'
    },
    {
      title: 'Portfolio Architecture', type: 'Web', category: 'Websites',
      desc: t('Robust full-stack web portfolio architecture combining React, TypeScript, GSAP animations, 3D WebGL scenes, and Firebase Serverless.', 'रिएक्ट, टाइपस्क्रिप्ट, GSAP एनिमेशन और 3D WebGL दृश्यों के संयोजन वाला मजबूत फुल-स्टैक वेब पोर्टफोलियो आर्किटेक्चर।'),
      tags: ['Websites', 'React', 'Firebase', 'Technologies'],
      icon: <Layers size={24} className="text-blue-500" />,
      url: 'https://github.com/ishanmall/Portfolio-Website'
    },
    {
      title: 'Mandir Dharshan', type: 'Web', category: 'Websites',
      desc: t('Large-scale visual temple knowledge catalogue heavily driven by structured local data, featuring custom location searches and dark mode.', 'कस्टम स्थान खोजों और डार्क मोड की विशेषता वाला संरचित स्थानीय डेटा द्वारा संचालित बड़े पैमाने का दृश्य मंदिर ज्ञान कैटलॉग।'),
      tags: ['Websites', 'React', 'Projects'],
      icon: <Globe size={24} className="text-orange-500" />,
      url: 'https://mandir-dharshan.web.app/'
    }
  ];

  const filteredItems = allItems.filter(item => {
    const filterMatch = activeFilter === 'ALL' || item.category === activeFilter || item.tags.includes(activeFilter);
    const searchMatch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.desc.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.tags.some(tg => tg.toLowerCase().includes(searchTerm.toLowerCase()));
    return filterMatch && searchMatch;
  });

  return (
    <section id="database" className="py-20 md:py-32 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }} className="max-w-7xl mx-auto px-6 md:px-10 pointer-events-auto will-change-transform">
        <div className="mb-12 text-center md:text-left">
          <Text3D depth={6} className="tts-card text-4xl md:text-5xl font-black tracking-tight cursor-pointer" color="text-slate-900" shadowColor="#cbd5e1">
            {t('Global Database', 'ग्लोबल डेटाबेस')}
          </Text3D>
          <p className="mt-3 text-sm md:text-base font-bold text-slate-500 max-w-2xl">
            {t('Explore the complete repository of projects, web applications, and technical architectures.', 'प्रोजेक्ट्स, वेब एप्लिकेशन और तकनीकी आर्किटेक्चर की पूरी रिपॉजिटरी का अन्वेषण करें।')}
          </p>
        </div>

        <div className="relative max-w-3xl mb-8 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-pink-500 transition-colors" size={20} />
          </div>
          <input
            type="text"
            placeholder={t("Search projects, technologies, architectures...", "प्रोजेक्ट्स, तकनीक, आर्किटेक्चर खोजें...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm md:text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-12">
          {filters.map((filter) => (
            <motion.button key={filter} onClick={() => { playUISound(); setActiveFilter(filter); }} whileHover={{ y: -3, boxShadow: '0 8px 15px -3px rgba(0,0,0,0.1)' }} whileTap={{ y: 0, boxShadow: 'none' }} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${ activeFilter === filter ? 'bg-gradient-to-r from-cyan-500 to-pink-500 text-white border-transparent shadow-md' : 'bg-white/90 text-slate-700 hover:bg-white border-slate-200 shadow-sm' }`}>
              {filter === 'ALL' && <Filter size={14} />}
              {t(filter, filter === 'Projects' ? 'प्रोजेक्ट्स' : filter === 'Websites' ? 'वेबसाइटें' : filter === 'Technologies' ? 'तकनीकें' : filter)}
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          <AnimatePresence mode="popLayout">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, idx) => {
                const CardComponent = item.url ? motion.a : motion.div;
                const linkProps = item.url ? { href: item.url, target: "_blank", rel: "noreferrer" } : {};

                return (
                  <CardComponent {...linkProps} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }} key={item.title} onClick={playUISound} whileHover={!isMobile ? { y: -8, boxShadow: '0px 25px 40px -10px rgba(0,0,0,0.15)' } : {}} className={`tts-card flex flex-col p-6 md:p-8 rounded-3xl border shadow-lg backdrop-blur-xl bg-white/80 border-black/5 h-full transition-all group ${item.url ? 'cursor-pointer' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-slate-50 rounded-2xl w-fit border border-slate-100 shadow-sm group-hover:scale-105 transition-transform">{item.icon}</div>
                      {item.url ? <ArrowUpRight className="text-slate-300 group-hover:text-pink-500 transition-colors link-indicator" /> : <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">{item.type}</span>}
                    </div>
                    <div className="mb-2"><Text3D depth={3} className="text-xl font-black" color="text-slate-900" shadowColor="#cbd5e1">{item.title}</Text3D></div>
                    <p className="text-sm font-medium text-slate-600 mb-6 flex-1 leading-relaxed">{item.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      {item.tags.slice(0, 4).map(tag => <span key={tag} className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded-md">{tag}</span>)}
                    </div>
                  </CardComponent>
                );
              })
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-20 text-center flex flex-col items-center">
                <Search size={48} className="text-slate-300 mb-4" />
                <h3 className="text-2xl font-black text-slate-800">{t('No results found', 'कोई परिणाम नहीं मिला')}</h3>
                <p className="text-slate-500 mt-2 font-medium">{t('Try adjusting your search term or filter category.', 'खोज शब्द या फ़िल्टर श्रेणी को बदलने का प्रयास करें।')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
};

const UnderConstructionSection = ({ rotateX, rotateY, isMobile }) => {
  const { t } = React.useContext(TranslationContext);
  const wipApps = [
    {
      title: 'Ananta Sanatan', tech: 'Kotlin, Compose, Firestore, Room',
      desc: t('Expansive digital Sanatan knowledge platform backed by heavy cloud infrastructure, persistent local storage, and Google credential integration.', 'अत्यधिक क्लाउड इंफ्रास्ट्रक्चर, स्थायी स्थानीय भंडारण और Google क्रेडेंशियल एकीकरण द्वारा समर्थित व्यापक डिजिटल सनातन ज्ञान मंच।'),
      icon: <ShieldCheck size={20} className="text-red-500" />,
      url: 'https://github.com/ishanmall/AnantaSanatan'
    },
    {
      title: 'WaterEjector', tech: 'Kotlin, Compose, Lottie',
      desc: t('A sharply focused offline Android utility leveraging modern Compose UI architecture, interactive Lottie animations, and window adjustments.', 'आधुनिक कंपोज़ यूआई आर्किटेक्चर, इंटरैक्टिव लोटी एनिमेशन और विंडो समायोजन का लाभ उठाने वाली ऑफ़लाइन एंड्रॉइड उपयोगिता।'),
      icon: <Smartphone size={20} className="text-cyan-500" />,
      url: 'https://github.com/ishanmall/WaterEjector'
    }
  ];

  const wipWeb = [
    {
      title: 'Portfolio Website', tech: 'React, TypeScript, Three.js, Firebase',
      desc: t('Robust full-stack web portfolio architecture combining React, GSAP animations, 3D WebGL scenes, and Firebase Serverless backends.', 'रिएक्ट, GSAP एनिमेशन, 3D WebGL दृश्यों और फायरबेस सर्वरलेस बैकएंड के संयोजन वाला मजबूत वेब पोर्टफोलियो आर्किटेक्चर।'),
      icon: <MonitorSmartphone size={20} className="text-indigo-500" />,
      url: 'https://github.com/ishanmall/Portfolio-Website'
    }
  ];

  return (
    <section id="lab" className="py-20 md:py-32 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }} className="max-w-7xl mx-auto px-6 md:px-10 pointer-events-auto will-change-transform">
        <div className="tts-card mb-14 flex flex-col md:flex-row items-center gap-4 cursor-pointer" onClick={playUISound}>
          <div className="p-4 bg-[#fff9cc] rounded-[1.25rem] border border-[#fce96a] shadow-sm"><Wrench size={32} className="text-[#d97706]" /></div>
          <div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900" style={{ textShadow: '2px 2px 0px #fce96a' }}>{t('In The Lab', 'प्रयोगशाला में')}</h2>
            <p className="mt-2 text-sm md:text-base font-bold text-[#d97706] flex items-center gap-2 justify-center md:justify-start"><Clock size={16} /> {t('Work in Progress & Active Architecture', 'प्रगतिरत कार्य एवं सक्रिय आर्किटेक्चर')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <h3 className="tts-card text-[17px] font-black text-slate-800 mb-6 flex items-center gap-2 cursor-pointer" onClick={playUISound}><Smartphone size={18} className="text-pink-500" /> {t('Mobile Applications', 'मोबाइल एप्लिकेशन')}</h3>
            <div className="space-y-4">
              {wipApps.map((app, idx) => {
                const CardComp = app.url ? motion.a : motion.div;
                const props = app.url ? { href: app.url, target: '_blank', rel: 'noreferrer' } : {};
                return (
                  <CardComp {...props} key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.1 }} onClick={playUISound} whileHover={!isMobile ? { y: -4, boxShadow: '0px 15px 30px -10px rgba(0,0,0,0.1)' } : {}} className={`tts-card block w-full p-6 rounded-3xl border shadow-sm backdrop-blur-xl bg-white/90 border-slate-200 relative overflow-hidden group ${app.url ? 'cursor-pointer active:scale-[0.98]' : ''} transition-all`}>
                    <div className="absolute top-0 right-0 p-4 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      {app.url && <ArrowUpRight size={14} className="text-slate-400 group-hover:text-pink-500 link-indicator" />}
                      <Settings size={12} className="animate-spin-slow text-slate-400" /><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">WIP</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">{app.icon}</div>
                      <div className="pr-12"><h4 className="text-lg font-black text-slate-900 leading-tight mb-1">{app.title}</h4><p className="text-xs font-mono font-bold text-slate-500 mb-3">{app.tech}</p><p className="text-[13px] font-medium text-slate-600 leading-relaxed">{app.desc}</p></div>
                    </div>
                  </CardComp>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="tts-card text-[17px] font-black text-slate-800 mb-6 flex items-center gap-2 cursor-pointer" onClick={playUISound}><Globe size={18} className="text-blue-500" /> {t('Web Platforms', 'वेब प्लेटफॉर्म')}</h3>
            <div className="space-y-4">
              {wipWeb.map((web, idx) => {
                const CardComp = web.url ? motion.a : motion.div;
                const props = web.url ? { href: web.url, target: '_blank', rel: 'noreferrer' } : {};
                return (
                  <CardComp {...props} key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.1 }} onClick={playUISound} whileHover={!isMobile ? { y: -4, boxShadow: '0px 15px 30px -10px rgba(0,0,0,0.1)' } : {}} className={`tts-card block w-full p-6 rounded-3xl border shadow-sm backdrop-blur-xl bg-white/90 border-slate-200 relative overflow-hidden group ${web.url ? 'cursor-pointer active:scale-[0.98]' : ''} transition-all`}>
                    <div className="absolute top-0 right-0 p-4 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      {web.url && <ArrowUpRight size={14} className="text-slate-400 group-hover:text-pink-500 link-indicator" />}
                      <Settings size={12} className="animate-spin-slow text-slate-400" /><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">WIP</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">{web.icon}</div>
                      <div className="pr-12"><h4 className="text-lg font-black text-slate-900 leading-tight mb-1">{web.title}</h4><p className="text-xs font-mono font-bold text-slate-500 mb-3">{web.tech}</p><p className="text-[13px] font-medium text-slate-600 leading-relaxed">{web.desc}</p></div>
                    </div>
                  </CardComp>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

const TechMatrixSection = ({ rotateX, rotateY, isMobile }) => {
  const { t } = React.useContext(TranslationContext);
  const domains = [
    { domain: 'Android', techs: ['Kotlin', 'Jetpack Compose', 'Material 3'] },
    { domain: 'Architecture', techs: ['MVVM', 'Clean Architecture', 'Hilt DI', 'KSP / KAPT'] },
    { domain: 'Database', techs: ['Room ORM', 'SQLite', 'DataStore'] },
    { domain: 'Media', techs: ['Media3 / ExoPlayer', 'MediaStore API', 'Hardware Decoder'] },
    { domain: 'Web', techs: ['React 19', 'JavaScript', 'TypeScript', 'Tailwind CSS'] },
    { domain: '3D', techs: ['Three.js', 'React Three Fiber', 'React Three Drei'] },
    { domain: 'Graphics', techs: ['WebGL', 'GLSL', 'GSAP', 'Framer Motion'] },
    { domain: 'Cloud', techs: ['Firebase Auth', 'Firestore', 'Realtime DB', 'Serverless'] },
    { domain: 'DevOps', techs: ['Git', 'GitHub', 'CI/CD'] },
    { domain: 'Build', techs: ['Gradle', 'Vite', 'PostCSS'] },
    { domain: 'Testing', techs: ['Unit Testing', 'UI Testing', 'Android Studio Profiler'] },
    { domain: 'Deployment', techs: ['Google Play Console', 'Firebase Hosting', 'App Bundles'] },
    { domain: 'Visualization', techs: ['Charts', 'WebGL Shaders', 'Lottie'] },
  ];

  return (
    <section id="matrix" className="py-20 md:py-32 px-6 md:px-10 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }} className="max-w-7xl mx-auto pointer-events-auto will-change-transform">
        <div className="mb-12 text-center md:text-left">
          <Text3D depth={6} className="tts-card text-3xl md:text-5xl font-black tracking-tight cursor-pointer" color="text-slate-900" shadowColor="#cbd5e1">{t('Technology Matrix', 'प्रौद्योगिकी मैट्रिक्स')}</Text3D>
          <p className="mt-3 text-sm md:text-base font-bold text-slate-500">{t('A comprehensive mapping of domains to specialized technologies utilized in production.', 'उत्पादन में उपयोग की जाने वाली विशेष तकनीकों के लिए डोमेन का एक व्यापक मानचित्रण।')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {domains.map((row, idx) => (
            <motion.div key={row.domain} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.4, delay: isMobile ? 0 : (idx % 4) * 0.05 }} onClick={playUISound} whileHover={!isMobile ? { y: -4, boxShadow: '0px 15px 30px -5px rgba(0,0,0,0.15)' } : {}} className="tts-card p-5 border rounded-3xl shadow-md relative group backdrop-blur-xl border-slate-200 bg-white/80 hover:bg-white transition-all duration-300 flex flex-col gap-3 cursor-pointer active:scale-95">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><Cpu size={18} className="text-cyan-500 shrink-0" /><span className="text-base font-black text-slate-800 leading-tight">{row.domain}</span></div>
              <div className="flex flex-wrap gap-1.5">{row.techs.map(tech => <span key={tech} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600">{tech}</span>)}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

const CertificationsSection = ({ rotateX, rotateY, isMobile }) => {
  const { t } = React.useContext(TranslationContext);
  const badges = [
    'Introduction to programming in Kotlin', 'Set up Android Studio', 'Build a Basic Layout',
    'Kotlin Fundamentals', 'Add a button to an app', 'Interacting with UI and state',
    'Android Views and Compose in Views', 'Views in Compose', 'Schedule tasks with WorkManager',
    'Store and access data using keys with DataStore', 'Use Room for data persistence', 'Get data from the internet',
    'Load and display images from the internet', 'Introduction to SQL', 'Adaptive layouts',
    'Navigation in Jetpack Compose', 'Architecture Components', 'Add theme and animation',
    'Build a scrollable list', 'More Kotlin fundamentals', 'First Learning Pathway and Quiz badge',
    'Android Studio - Panda releases', 'Android SDK Platform Tools', 'Google Cloud Computing'
  ];

  return (
    <section id="credentials" className="py-20 md:py-32 px-6 md:px-10 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }} className="max-w-7xl mx-auto pointer-events-auto will-change-transform">
        <div className="mb-12 text-center md:text-left">
          <Text3D depth={6} className="tts-card text-3xl md:text-5xl font-black tracking-tight cursor-pointer" color="text-slate-900" shadowColor="#cbd5e1">{t('Google Credentials', 'गूगल क्रेडेंशियल्स')}</Text3D>
          <p className="mt-2 text-sm md:text-base font-bold text-slate-500">{t('Google Developer Profile and Cloud credentials.', 'गूगल डेवलपर प्रोफाइल और क्लाउड क्रेडेंशियल्स।')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {badges.map((badge, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.4, delay: isMobile ? 0 : (i % 4) * 0.05 }} onClick={playUISound} whileHover={!isMobile ? { y: -4, boxShadow: '0px 15px 30px -5px rgba(0,0,0,0.15)' } : {}} className="tts-card p-4 border rounded-2xl shadow-md relative group backdrop-blur-xl border-slate-200 bg-white/80 hover:bg-white transition-all duration-300 flex items-center gap-3 cursor-pointer active:scale-95">
              <Award size={20} className="text-pink-500 shrink-0" /><span className="text-sm font-bold text-slate-800 leading-tight">{badge}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

const TrainingCertificationsSection = ({ rotateX, rotateY, isMobile }) => {
  const { t } = React.useContext(TranslationContext);
  const trainingData = [
    { org: 'NASA', courses: ['Fundamentals of Remote Sensing', 'Hyperspectral Data for Land and Coastal Systems', 'Sustainable Earth Science Applications — Modules 1, 2, 3', 'NASA Open Science 101'], icon: <Rocket size={24} className="text-blue-500" /> },
    { org: 'ISRO / IIRS', courses: ['Aerosols: Measurement, Retrieval and Impacts', 'AI/ML for Geodata Analysis', 'Climate Change Induced Disasters', 'Earth Observations & Tropical Cyclone Monitoring and Forecasting'], icon: <Globe size={24} className="text-orange-500" /> },
    { org: 'Android App Development', courses: ['Android App Development', 'Android App Development with AI'], icon: <Smartphone size={24} className="text-green-500" /> },
    { org: 'AI / AI Training', courses: ['YUVA AI for ALL — NASSCOM FutureSkills Prime', 'YUVA Artificial Intelligence (AI) — TCS iON'], icon: <BrainCircuit size={24} className="text-purple-500" /> },
    { org: 'Other', courses: ['Operating Systems Basics — Cisco Networking Academy', 'Visit Bharat Online Pledge; Recognition; VBYLD 2026', 'TATA Crucible Campus Quiz 2025', 'Puzzler\'s Pursuit — IIM Rohtak', 'dearMoon Crew Candidate'], icon: <Award size={24} className="text-pink-500" /> }
  ];

  return (
    <section id="training" className="py-20 md:py-32 px-6 md:px-10 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }} className="max-w-7xl mx-auto pointer-events-auto will-change-transform">
        <div className="mb-12 text-center md:text-left">
          <Text3D depth={6} className="tts-card text-3xl md:text-5xl font-black tracking-tight cursor-pointer" color="text-slate-900" shadowColor="#cbd5e1">{t('Training & Certifications', 'प्रशिक्षण और प्रमाणपत्र')}</Text3D>
          <p className="mt-2 text-sm md:text-base font-bold text-slate-500">{t('Professional development, specialized training, and foundational knowledge.', 'व्यावसायिक विकास, विशेष प्रशिक्षण और मूलभूत ज्ञान।')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {trainingData.map((category, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.5, delay: isMobile ? 0 : idx * 0.1 }} onClick={playUISound} whileHover={!isMobile ? { y: -8, boxShadow: '0px 25px 40px -10px rgba(0,0,0,0.15)' } : {}} className="tts-card p-6 md:p-8 rounded-3xl border shadow-lg backdrop-blur-xl bg-white/80 border-black/5 flex flex-col h-full transition-all duration-300 cursor-pointer active:scale-[0.98]">
              <div className="p-3 bg-slate-50 rounded-2xl w-fit mb-4 border border-slate-100 shadow-sm">{category.icon}</div>
              <div className="mb-6"><Text3D depth={3} className="text-xl font-black" color="text-slate-900" shadowColor="#cbd5e1" interactive={false}>{category.org}</Text3D></div>
              <ul className="space-y-3">
                {category.courses.map((course, cIdx) => <li key={cIdx} className="text-sm font-medium text-slate-600 flex items-start gap-2"><span className="text-pink-500 font-black mt-0.5 shrink-0">•</span><span className="leading-tight">{course}</span></li>)}
              </ul>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

const Footer = ({ rotateX, rotateY, isMobile }) => {
  const { t } = React.useContext(TranslationContext);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    playUISound();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <footer id="contact" className="relative pt-20 md:pt-32 pb-12 px-6 md:px-10 overflow-hidden z-10 pointer-events-none perspective-[1200px]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#f1f5f9] z-[-1]" />
      <motion.div style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }} className="max-w-7xl mx-auto border-t border-slate-200 pt-16 pointer-events-auto will-change-transform">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          <div className="lg:col-span-7 space-y-6">
            <Text3D depth={6} className="tts-card text-4xl md:text-6xl font-black tracking-tighter cursor-pointer" color="text-slate-900" shadowColor="#cbd5e1">
              {t("Let's build something exceptional.", "आइए कुछ असाधारण बनाएं।")}
            </Text3D>
            <p className="tts-card text-sm md:text-base text-slate-600 font-medium max-w-lg leading-relaxed cursor-pointer" onClick={playUISound}>
              {t('Available for freelance engineering contracts and full-time architecture roles. Specialized in end-to-end Kotlin native applications and interactive Three.js 3D web interfaces.',
                 'फ्रीलांस इंजीनियरिंग अनुबंधों और पूर्णकालिक आर्किटेक्चर भूमिकाओं के लिए उपलब्ध। एंड-टू-एंड कॉटलिन नेटिव एप्लिकेशन और इंटरैक्टिव Three.js वेब इंटरफेस में विशेषज्ञता।')}
            </p>

            <div className="flex flex-col gap-3">
              <motion.a whileHover={!isMobile ? { x: 6 } : {}} href="mailto:ishanmall789@gmail.com" onClick={playUISound} className="inline-flex items-center gap-3 text-xl md:text-2xl font-bold transition-colors text-slate-900 hover:text-pink-600 w-fit group">
                <Mail className="text-pink-500" /> <Text3D depth={2} color="currentColor" shadowColor="#e2e8f0" interactive={false}>ishanmall789@gmail.com</Text3D> <ArrowUpRight size={22} className="text-pink-500 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </motion.a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <motion.div whileHover={!isMobile ? { y: -6, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' } : {}} className="p-6 md:p-8 rounded-3xl border shadow-xl backdrop-blur-xl bg-white/90 border-slate-200 transition-all duration-300">
              <h3 className="tts-card text-lg font-black text-slate-900 mb-4 flex items-center gap-2 cursor-pointer" onClick={playUISound}><Send size={18} className="text-cyan-500" /> {t('Send Direct Inquiry', 'सीधी पूछताछ भेजें')}</h3>
              {submitted ? (
                <div className="tts-card p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-sm font-bold flex items-center gap-2 shadow-inner"><CheckCircle2 size={18} className="text-cyan-600" /> {t('Thank you! Your message has been initiated.', 'धन्यवाद! आपका संदेश भेज दिया गया है।')}</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">{t('Your Name', 'आपका नाम')}</label><input type="text" required placeholder={t("e.g. Satoshi Nakamoto", "उदा. सातोशी नाकामोतो")} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-inner" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">{t('Email Address', 'ईमेल पता')}</label><input type="email" required placeholder="you@company.com" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-inner" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">{t('Project Brief', 'प्रोजेक्ट संक्षिप्त')}</label><textarea rows={3} required placeholder={t("Describe what you want to build...", "वर्णन करें कि आप क्या बनाना चाहते हैं...")} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm font-medium text-slate-900 placeholder-slate-400 resize-none shadow-inner" /></div>
                  <motion.button type="submit" whileHover={{ y: -3, boxShadow: '0 12px 20px -3px rgba(236, 72, 153, 0.5)' }} whileTap={{ y: 0, boxShadow: '0 2px 5px -1px rgba(236, 72, 153, 0.4)' }} className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500 shadow-lg text-sm transition-all">{t('Submit Project Request', 'प्रोजेक्ट अनुरोध सबमिट करें')}</motion.button>
                </form>
              )}
            </motion.div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-200">
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'GitHub', icon: Code2, url: 'https://github.com/ishanmall' },
              { label: 'LinkedIn', icon: Briefcase, url: 'https://www.linkedin.com/in/ishan-mall-4b20ab296/' },
              { label: 'YouTube', icon: Tv, url: 'https://www.youtube.com/@ishanmall9527' },
              { label: 'Instagram', icon: Camera, url: 'https://www.instagram.com/isha.ndisha/' },
              { label: 'Google Developer', icon: Code2, url: 'https://me.developers.google.com/u/114187295149454370660' },
              { label: 'Credly', icon: Award, url: 'https://www.credly.com/users/ishan-mall/' }
            ].map((social) => (
              <motion.a key={social.label} href={social.url} target="_blank" rel="noreferrer" onClick={playUISound} whileHover={{ y: -3, boxShadow: '0 6px 10px -2px rgba(0,0,0,0.15)' }} whileTap={{ y: 0, boxShadow: 'none' }} className="flex items-center gap-2 px-4 py-2 rounded-full border font-bold bg-white/90 border-slate-200 text-slate-700 text-xs shadow-md transition-all active:scale-95">
                <social.icon size={16} /> {social.label}
              </motion.a>
            ))}
          </div>
          <p className="tts-card text-xs font-mono font-bold text-slate-400 cursor-pointer" onClick={playUISound}>&copy; {new Date().getFullYear()} Ishan Mall — Gorakhpur, UP, India.</p>
        </div>
      </motion.div>
    </footer>
  );
};

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [lang, setLang] = useState('en'); 
  const [pendingLink, setPendingLink] = useState(null); 
  
  const [voices, setVoices] = useState([]);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 140, damping: 24 });
  const smoothY = useSpring(mouseY, { stiffness: 140, damping: 24 });

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-5, 5]);

  const t = (enString, hiString) => lang === 'hi' ? hiString : enString;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    window.scrollTo(0, 0);

    const handleMouseMove = (e) => {
      if (isMobile || shouldReduceMotion) return;
      mouseX.set(e.clientX / window.innerWidth - 0.5);
      mouseY.set(e.clientY / window.innerHeight - 0.5);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    if ('speechSynthesis' in window) {
      const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isMobile, shouldReduceMotion]);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!voiceEnabled) return; 
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      
      if (e.target.closest('.no-tts')) return;
      if (e.target.tagName && e.target.tagName.toLowerCase() === 'canvas') return;

      const anchor = e.target.closest('a');
      let textToRead = '';
      
      if (anchor && anchor.href && !anchor.href.includes('mailto')) {
        e.preventDefault(); 
        
        if (pendingLink === anchor.href) {
          window.open(anchor.href, anchor.target || '_self');
          setPendingLink(null);
          return; 
        } else {
          setPendingLink(anchor.href);
          setTimeout(() => setPendingLink(null), 5000); 
        }
      }

      const validTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'li'];
      let sourceElement = null;

      if (e.target.closest('.tts-card')) {
        sourceElement = e.target.closest('.tts-card');
      } else if (validTags.includes(e.target.tagName.toLowerCase())) {
        sourceElement = e.target;
      } else if (anchor) {
        sourceElement = anchor;
      }

      if (sourceElement) {
        const clone = sourceElement.cloneNode(true);
        const hiddenElements = clone.querySelectorAll('[aria-hidden="true"]');
        hiddenElements.forEach(el => el.remove());
        textToRead = clone.innerText || clone.textContent;
      }

      if (textToRead && textToRead.length < 800 && textToRead.trim().length > 0) {
        textToRead = textToRead.replace(/WIP/g, '').replace(/✦/g, '').replace(/•/g, '').trim();

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
        
        let preferredVoice = voices.find(v => 
          v.lang.includes(lang === 'hi' ? 'hi' : 'en') && 
          (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Zira') || v.name.includes('Swara') || v.name.includes('Sangeeta') || v.name.includes('Lekha'))
        );
        
        if (preferredVoice) utterance.voice = preferredVoice;
        
        utterance.pitch = 1.0;
        utterance.rate = 0.95; 
        
        window.speechSynthesis.speak(utterance);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [voiceEnabled, pendingLink, lang, voices]);

  return (
    <TranslationContext.Provider value={{ lang, t }}>
      <ReactLenis root options={{ lerp: isMobile ? 0.08 : 0.05, smoothWheel: true }}>
        <main className="min-h-screen bg-[#f8fafc] selection:bg-pink-500 selection:text-white overflow-hidden font-sans relative">
          
          <LoaderOverlay />
          <Global3DScene scrollYProgress={scrollYProgress} isMobile={isMobile} reducedMotion={shouldReduceMotion} />
          <Nav voiceEnabled={voiceEnabled} setVoiceEnabled={setVoiceEnabled} lang={lang} setLang={setLang} />
          
          <Hero rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
          <Statistics rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
          <ProfileAndExperience rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
          <UnifiedDatabase rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
          <UnderConstructionSection rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
          <TechMatrixSection rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
          <CertificationsSection rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
          <TrainingCertificationsSection rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
          <Footer rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />

          <AnimatePresence>
            {pendingLink && voiceEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 50, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 50, x: '-50%' }}
                className="fixed bottom-10 left-1/2 z-[100] bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3.5 rounded-full font-bold shadow-2xl flex items-center gap-3 border border-white/20 pointer-events-none"
              >
                <Volume2 size={20} className="animate-pulse" />
                <span className="text-sm md:text-base tracking-wide">
                  {lang === 'hi' ? 'लिंक खोलने के लिए फिर से टैप करें' : 'Tap again to open link'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </ReactLenis>
    </TranslationContext.Provider>
  );
}