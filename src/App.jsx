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
  ShieldCheck, Database, Music, CheckCircle2, Mail, Send, Terminal 
} from 'lucide-react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Sparkles, Grid, useProgress, Text, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';

useGLTF.preload('/supercar.glb');

// ==========================================
// 3D TYPOGRAPHY SYSTEM (CLEAN CSS SHADOW IMPLEMENTATION)
// Fixed grey box rendering bug by using pure text-shadow layer separation
// ==========================================

const Text3D = ({
  children,
  className = '',
  depth = 4,
  gradient = null,
  color = 'text-slate-900',
  shadowColor = '#cbd5e1', // slate-300
  isMobile = false,
}) => {
  const activeDepth = isMobile ? Math.max(1, Math.floor(depth / 2)) : depth;
  
  // Generate solid diagonal extrusion using stacked text-shadows
  const shadow = Array.from({ length: activeDepth })
    .map((_, i) => `${i + 1}px ${i + 1}px 0px ${shadowColor}`)
    .join(', ');

  return (
    <span className={`relative inline-block ${className} group cursor-default`}>
      {/* Background Shadow Layer */}
      <span
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1"
        style={{ 
          color: 'transparent',
          textShadow: shadow,
          zIndex: -1 
        }}
      >
        {children}
      </span>
      {/* Foreground Text Layer */}
      <span 
        className={`relative z-10 block transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1 ${
          gradient ? `bg-clip-text text-transparent bg-gradient-to-r ${gradient}` : color
        }`}
      >
        {children}
      </span>
    </span>
  );
};

// ==========================================
// FLOATING 3D CANVAS TEXT
// ==========================================

const FloatingWords = () => {
  const fontUrl = "https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NJtEtq.woff";
  
  return (
    <group>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1} position={[3, 1.5, 2]}>
        <Text fontSize={1.2} color="#ec4899" font={fontUrl}>
          CODE
          <meshStandardMaterial color="#ec4899" roughness={0.2} metalness={0.8} />
        </Text>
      </Float>
      <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1.5} position={[-4, 2.5, -8]}>
        <Text fontSize={1.8} color="#06b6d4" font={fontUrl}>
          CREATE
          <meshStandardMaterial color="#06b6d4" roughness={0.1} metalness={0.5} />
        </Text>
      </Float>
      <Float speed={2.5} rotationIntensity={1} floatIntensity={2} position={[5, 1, -20]}>
        <Text fontSize={2.2} color="#8b5cf6" font={fontUrl}>
          INNOVATE
          <meshStandardMaterial color="#8b5cf6" roughness={0.3} metalness={0.7} />
        </Text>
      </Float>
      <Float speed={1} rotationIntensity={0.3} floatIntensity={0.5} position={[-3, 0.5, 8]}>
        <Text fontSize={0.8} color="#f43f5e" font={fontUrl}>
          GROW
          <meshStandardMaterial color="#f43f5e" roughness={0.4} metalness={0.2} />
        </Text>
      </Float>
    </group>
  );
};

// ==========================================
// 3D SCENE & RACING RIG
// ==========================================

const trackCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(2, 0, 10),
  new THREE.Vector3(2, 0, -10),
  new THREE.Vector3(12, 0, -35),
  new THREE.Vector3(-10, 0, -65),
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

    if (scroll < 0.22) {
      targetOffset.current.set(isMobile ? -6 : -5, isMobile ? 2.5 : 1.5, isMobile ? 9 : 7);
    } else if (scroll < 0.48) {
      targetOffset.current.set(isMobile ? -6 : -8, 3, 0);
    } else if (scroll < 0.75) {
      targetOffset.current.set(isMobile ? 5 : 4, 2.5, 6);
    } else {
      targetOffset.current.set(0, isMobile ? 5 : 4, isMobile ? 14 : 12);
    }

    currentOffset.current.lerp(targetOffset.current, 0.025);
    targetCameraPos.current.copy(trackPosition.current).add(currentOffset.current);

    if (!isMobile && !reducedMotion) {
      const steerOffset = mouse.x * 6;
      targetCameraPos.current.x += steerOffset * 0.4;
      targetCameraPos.current.y += mouse.y * 0.8;
    }

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

    wheelRefs.current.forEach((wheel) => {
      if (wheel) wheel.rotation.x -= p.smoothedVelocity * 6;
    });

    if (chassisGroupRef.current && !reducedMotion) {
      const breathe = Math.sin(state.clock.elapsedTime * 0.8) * 0.015;
      chassisGroupRef.current.rotation.z = THREE.MathUtils.lerp(chassisGroupRef.current.rotation.z, breathe, 0.05);
      chassisGroupRef.current.position.y = THREE.MathUtils.lerp(
        chassisGroupRef.current.position.y,
        Math.sin(state.clock.elapsedTime * 1.5) * 0.02,
        0.05
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
        {!isMobile && (
          <mesh
            onPointerDown={(e) => {
              e.stopPropagation();
              isDragging.current = true;
              lastPointer.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
            }}
            visible={false}
          >
            <sphereGeometry args={[3, 16, 16]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
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
            vertexShader={`
              attribute float opacity; varying float vOpacity;
              void main() { vOpacity = opacity; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (60.0 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition; }
            `}
            fragmentShader={`
              varying float vOpacity;
              void main() { vec2 xy = gl_PointCoord.xy - vec2(0.5); float ll = length(xy); if(ll > 0.5) discard; gl_FragColor = vec4(0.2, 0.8, 0.9, vOpacity * (1.0 - (ll * 2.0))); }
            `}
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
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f8fafc]"
        >
          <Text3D depth={6} className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4 animate-pulse" gradient="from-cyan-400 via-pink-500 to-blue-600">
            ISHAN
          </Text3D>
          <div className="w-56 h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs font-mono font-bold text-slate-500 mt-3 tracking-widest">
            INITIALIZING ASSETS {Math.round(progress)}%
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Global3DScene = ({ scrollYProgress, isMobile, reducedMotion }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#f8fafc]">
      <Canvas
        dpr={isMobile ? [1, 1] : [1, 1.5]}
        camera={{ fov: isMobile ? 55 : 45 }}
        gl={{ alpha: false, antialias: !isMobile, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor('#f8fafc')}
        style={{ pointerEvents: 'auto', touchAction: 'pan-y' }}
      >
        <Suspense fallback={null}>
          <CameraRig scrollYProgress={scrollYProgress} isMobile={isMobile} reducedMotion={reducedMotion} />
          
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 20, 10]} intensity={1} color="#ffffff" castShadow />
          <spotLight position={[-10, 10, 5]} intensity={2} color="#ec4899" angle={0.3} penumbra={1} />
          <spotLight position={[10, 5, -5]} intensity={2} color="#06b6d4" angle={0.3} penumbra={1} />

          <Grid
            position={[0, -0.51, 0]}
            args={[200, 200]}
            cellSize={1}
            cellThickness={1}
            cellColor="#e2e8f0"
            sectionSize={5}
            sectionThickness={1.5}
            sectionColor="#cbd5e1"
            fadeDistance={65}
            fadeStrength={1}
          />
          <RacingCar scrollYProgress={scrollYProgress} isMobile={isMobile} reducedMotion={reducedMotion} />
          
          {!isMobile && <FloatingWords />}

          {!reducedMotion && (
            <Sparkles count={isMobile ? 30 : 120} scale={60} size={isMobile ? 1.5 : 3} speed={0.4} opacity={0.3} color="#ec4899" />
          )}
          <fog attach="fog" args={['#f8fafc', 10, isMobile ? 40 : 50]} />

          {!isMobile && !reducedMotion && (
            <EffectComposer disableNormalPass multisampling={0}>
              <Bloom luminanceThreshold={0.9} mipmapBlur intensity={0.3} />
              <Noise opacity={0.015} />
              <Vignette offset={0.4} darkness={0.2} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};

// ==========================================
// UI & SECTIONS WITH CSS 3D HEADINGS
// ==========================================

const Nav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const links = ['Experience', 'Projects', 'Arsenal', 'Credentials', 'Contact'];

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="fixed top-0 left-0 right-0 z-50 p-4 md:px-8 md:py-5 flex justify-between items-center backdrop-blur-xl border-b shadow-lg bg-white/75 border-black/5 shadow-slate-200/40"
      >
        <a href="#" className="flex items-center gap-2">
          <Text3D depth={2} className="text-xl md:text-2xl font-black tracking-tighter" gradient="from-cyan-400 via-pink-500 to-blue-600">
            ISHAN
          </Text3D>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-600 border border-pink-500/20">
            PORTFOLIO 3D
          </span>
        </a>

        <ul className="hidden md:flex gap-8 text-sm font-bold text-slate-800">
          {links.map((item) => (
            <li key={item}>
              <a href={`#${item.toLowerCase()}`} className="relative group block">
                <Text3D depth={1} color="text-slate-700" shadowColor="#e2e8f0" className="transition-colors group-hover:text-pink-500">
                  {item}
                </Text3D>
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <motion.a
            href="https://play.google.com/store/apps/dev?id=4926136840256493221"
            target="_blank"
            rel="noreferrer"
            whileHover={{ y: -2, boxShadow: '0 8px 15px -3px rgba(236, 72, 153, 0.4)' }}
            whileTap={{ y: 0, boxShadow: '0 2px 5px -1px rgba(236, 72, 153, 0.4)' }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-pink-500 shadow-md transition-all"
          >
            <Play size={14} fill="currentColor" /> Play Store
          </motion.a>
        </div>

        <button className="md:hidden p-2 text-slate-800" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </motion.nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white/95 backdrop-blur-2xl pt-24 px-6 flex flex-col gap-6 md:hidden"
          >
            {links.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setIsOpen(false)}
                className="text-3xl font-black text-slate-800 hover:text-pink-500 border-b border-slate-100 pb-4"
              >
                {item}
              </a>
            ))}
            <div className="mt-auto pb-12 flex gap-4">
              <a href="https://github.com/ishanmall" className="p-3 bg-slate-100 rounded-full text-slate-700"><Code2 size={20} /></a>
              <a href="https://www.linkedin.com/in/ishan-mall-4b20ab296/" className="p-3 bg-slate-100 rounded-full text-slate-700"><Briefcase size={20} /></a>
              <a href="https://play.google.com/store/apps/dev?id=4926136840256493221" className="p-3 bg-pink-500/10 text-pink-600 rounded-full"><Play size={20} /></a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Hero = ({ rotateX, rotateY, isMobile }) => (
  <section className="h-[100svh] flex flex-col justify-center p-6 md:p-10 relative z-10 perspective-[1200px] pointer-events-none">
    <motion.div
      style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }}
      className="w-full max-w-7xl mx-auto pointer-events-auto mt-20 md:mt-28 will-change-transform"
    >
      <div className="overflow-hidden mb-6">
        <motion.div
          className="relative inline-block"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, type: 'spring', stiffness: 100 }}
          whileHover={!isMobile ? { y: -4, boxShadow: '0px 10px 20px -5px rgba(236, 72, 153, 0.3)' } : {}}
        >
          <div className="relative inline-flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-xl border border-pink-500/20 bg-white/90 text-pink-600 shadow-sm transition-all">
            <span className="text-xs md:text-sm font-bold uppercase tracking-wider">Kotlin & Jetpack Compose</span>
            <span className="w-2 h-2 rounded-full animate-pulse bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span className="hidden md:block text-xs md:text-sm uppercase tracking-wider text-slate-700">Production Native Engineer</span>
          </div>
        </motion.div>
      </div>

      <h1 className="text-[14vw] md:text-[9.5vw] leading-[0.88] tracking-tighter uppercase font-black flex flex-col items-start relative select-none">
        <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.25 }}>
          <Text3D depth={isMobile ? 3 : 6} isMobile={isMobile} shadowColor="#94a3b8" color="text-slate-900">
            ANDROID
          </Text3D>
        </motion.div>

        <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.35 }}>
          <Text3D depth={isMobile ? 3 : 6} isMobile={isMobile} shadowColor="#c084fc" gradient="from-pink-500 via-purple-500 to-indigo-600">
            APP
          </Text3D>
        </motion.div>

        <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.45 }}>
          <Text3D depth={isMobile ? 3 : 6} isMobile={isMobile} shadowColor="#67e8f9" gradient="from-cyan-400 via-blue-500 to-pink-500">
            DEVELOPER
          </Text3D>
        </motion.div>
      </h1>

      <motion.p 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="mt-10 max-w-xl text-slate-600 font-semibold text-sm md:text-base leading-relaxed backdrop-blur-sm bg-white/40 p-4 rounded-2xl border border-white/60 shadow-sm"
      >
        Crafting high-throughput, offline-first mobile experiences powered by reactive state engines, strict clean architecture, and modern Three.js interfaces.
      </motion.p>
    </motion.div>
  </section>
);

const ProfileAndExperience = ({ rotateX, rotateY, isMobile }) => {
  const experiences = [
    {
      role: 'Lead Android Developer',
      type: 'Independent / Studio Work',
      period: 'Aug 2025 – Present',
      bullets: [
        'Engineered 4+ production apps using Kotlin, Jetpack Compose, Material Design 3, Coroutines, and StateFlow.',
        'Designed offline-first local cache synchronization leveraging Room ORM, SQLite indexes, and WorkManager background queues.',
        'Pioneered dual-audio routing engine & background foreground-service controls using Media3 (ExoPlayer).',
        'Implemented end-to-end Google Play Release Pipelines (AAB signing, Data Safety declarations, and Vitals ANR reduction under 0.1%).'
      ]
    },
    {
      role: 'Mobile System Architect & UI Contributor',
      type: 'Open Source Ecosystem',
      period: 'Jan 2025 – Jul 2025',
      bullets: [
        'Built modular multi-module Clean Architecture templates utilizing Hilt Dependency Injection.',
        'Implemented dynamic wallpaper live-rendering services using OpenGL surface bridges and hardware texture decoding.',
        'Profiled performance memory footprint in Android Studio Profiler, eliminating frame-skips and GC spikes.'
      ]
    }
  ];

  return (
    <section id="experience" className="py-20 md:py-32 px-6 md:px-10 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div
        style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }}
        className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pointer-events-auto items-start will-change-transform"
      >
        <div className="lg:col-span-4 order-1 relative">
          <motion.div
            initial={{ rotateY: 15, opacity: 0, y: 30 }}
            whileInView={{ rotateY: isMobile ? 0 : 5, opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            whileHover={!isMobile ? { scale: 1.02, rotateY: 8, rotateX: 4, boxShadow: '20px 20px 40px -10px rgba(0,0,0,0.15)' } : {}}
            className="w-full max-w-sm mx-auto lg:mx-0 rounded-3xl overflow-hidden border shadow-xl backdrop-blur-xl p-2.5 bg-white/80 border-black/5 sticky top-32 transition-all duration-300"
          >
            <div className="rounded-2xl overflow-hidden aspect-[4/5] relative bg-slate-200">
              <img src="/isha.ndisha_1785611777_3954320607764516452_77465641188.webp" alt="Ishan Mall" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-center z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/30 to-transparent z-10" />
              <div className="absolute bottom-0 left-0 p-5 md:p-6 w-full z-20">
                <Text3D depth={2} className="text-2xl md:text-3xl font-black mb-3" color="text-white" shadowColor="#1e293b">
                  Ishan Mall
                </Text3D>
                <div className="space-y-2 mt-2">
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><GraduationCap size={16} className="text-cyan-400 shrink-0" /> B.Tech CSE (2024-2027), AKTU</p>
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><Award size={16} className="text-pink-400 shrink-0" /> Class XII Science (2022)</p>
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><BookOpen size={16} className="text-blue-400 shrink-0" /> Class X (2020)</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-8 order-2 space-y-10 lg:pl-4">
          <div className="p-6 md:p-8 rounded-3xl border shadow-xl backdrop-blur-xl bg-gradient-to-br from-blue-50/90 to-purple-50/90 border-black/5 text-slate-800">
            <div className="mb-4">
              <Text3D depth={2} className="text-2xl font-black tracking-tight" gradient="from-slate-900 via-blue-900 to-slate-800" shadowColor="#93c5fd">
                Professional Summary
              </Text3D>
            </div>
            <p className="text-sm md:text-base font-medium leading-relaxed text-slate-700">
              Mobile application developer focused on building reliable Android applications with Kotlin and Jetpack Compose. Experienced in offline-first development, MVVM architecture, Room, Hilt, Coroutines, Firebase, structured content navigation, and media handling. Uses Android Studio, Git, Gradle, and Google Play Console throughout development, testing, release, and maintenance.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Text3D depth={2} className="text-2xl md:text-3xl font-black tracking-tight" color="text-slate-900" shadowColor="#cbd5e1">
                Work Milestones
              </Text3D>
            </div>

            {experiences.map((exp, i) => (
              <motion.div
                key={i}
                whileHover={!isMobile ? { y: -4, boxShadow: '0px 15px 30px -5px rgba(0,0,0,0.1)' } : {}}
                className="p-6 md:p-8 rounded-3xl border shadow-xl backdrop-blur-xl bg-white/85 border-black/5 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                  <Text3D depth={1} color="text-slate-900" shadowColor="#e2e8f0" className="text-xl md:text-2xl font-black">{exp.role}</Text3D>
                  <span className="text-xs font-mono font-bold text-cyan-600 bg-cyan-500/10 px-3 py-1 rounded-full w-fit">
                    {exp.period}
                  </span>
                </div>
                <p className="text-xs uppercase tracking-wider font-bold text-pink-500 mb-6">{exp.type}</p>
                <ul className="space-y-3 text-sm md:text-base font-medium text-slate-700">
                  {exp.bullets.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-pink-500 mt-1 shrink-0 font-black">✦</span>
                      <span>{b}</span>
                    </li>
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

const Projects = ({ rotateX, rotateY, isMobile }) => {
  const secondaryProjects = [
    {
      title: 'Resume Maker',
      date: 'May 2026 - Jun 2026',
      tech: 'Kotlin, Compose, Room, Hilt, PDFKit',
      desc: 'A fully offline resume builder designed for speed and simplicity. Converts details into clean, professional PDF templates instantly without internet.',
      icon: <Layers size={24} className="text-blue-500" />,
      features: ['Vector PDF Generation', 'Custom Color Themes', 'Zero Telemetry']
    },
    {
      title: 'Ananta Brahmanda',
      date: 'Dec 2025 - Jan 2026',
      tech: 'Compose, Room, DataStore, Canvas 2D',
      desc: 'Comprehensive Vedic and astronomical knowledge app in Hindi & English. Covers Sanatan Gods, Vedic Time, Cosmology, and meditation practices.',
      icon: <Database size={24} className="text-purple-500" />,
      features: ['Bilingual Switch', 'Solar System Models', 'Offline Ephemeris']
    },
    {
      title: 'Ananta Gita',
      date: 'Aug 2025 - Sep 2025',
      tech: 'Kotlin, Compose, Hilt, Room',
      desc: 'Deeply immersive offline Bhagavad Gita app. All 18 Adhyayas and 700 Shlokas with accurate translations in English, Hindi, and original Sanskrit.',
      icon: <BookOpen size={24} className="text-orange-500" />,
      features: ['Sanskrit Audio Synthesizer', 'Bookmark Bookmarking', 'Night Reading Engine']
    }
  ];

  return (
    <section id="projects" className="py-20 md:py-32 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div
        style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }}
        className="max-w-7xl mx-auto px-6 md:px-10 pointer-events-auto will-change-transform"
      >
        <div className="mb-14 text-center md:text-left">
          <Text3D depth={4} className="text-4xl md:text-5xl font-black tracking-tight" color="text-slate-900" shadowColor="#cbd5e1">
            Featured Work
          </Text3D>
          <p className="mt-3 text-sm md:text-base font-bold text-slate-500">
            Production-grade native applications engineered for stability and speed.
          </p>
        </div>

        {/* Flagship Project: GalleryBox */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-24 rounded-[2rem] md:rounded-[3rem] border shadow-2xl overflow-hidden bg-white/85 border-black/5 backdrop-blur-xl relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-cyan-50/50 z-0" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 md:p-12 lg:p-16">
            <div className="order-2 lg:order-1 space-y-6">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-pink-100 text-pink-600 mb-4 shadow-sm">
                  <ShieldCheck size={14} /> Flagship Project
                </span>
                <div>
                  <Text3D depth={4} className="text-3xl md:text-5xl font-black mb-2" gradient="from-cyan-500 via-pink-500 to-blue-600" shadowColor="#a5b4fc">
                    GalleryBox
                  </Text3D>
                </div>
                <p className="text-sm font-mono font-bold text-slate-500">Oct 2025 - Aug 2026</p>
              </div>

              <p className="text-sm md:text-base font-medium text-slate-700 leading-relaxed">
                A modern offline gallery and multimedia application designed to bring photos, videos, albums, Stories, music, and FM radio together in one seamless experience. 100% offline and private by design.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <motion.div whileHover={{ scale: 1.02, y: -2, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} className="p-4 rounded-2xl bg-white/80 border border-slate-100 shadow-sm transition-all">
                  <Camera className="text-pink-500 mb-2" size={20} />
                  <h4 className="text-sm font-bold text-slate-900">Photos & Videos</h4>
                  <p className="text-xs text-slate-500 mt-1">Full-screen viewing, RAW/GIF support, and hidden media recovery.</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02, y: -2, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} className="p-4 rounded-2xl bg-white/80 border border-slate-100 shadow-sm transition-all">
                  <Layers className="text-orange-500 mb-2" size={20} />
                  <h4 className="text-sm font-bold text-slate-900">Memories</h4>
                  <p className="text-xs text-slate-500 mt-1">Timeline-based highlights and beautifully auto-generated Stories.</p>
                </motion.div>
              </div>
            </div>

            <div className="order-1 lg:order-2 flex justify-center lg:justify-end perspective-[1000px]">
              <motion.div
                whileHover={!isMobile ? { rotateY: -6, rotateX: 4, scale: 1.02, boxShadow: '30px 30px 50px -15px rgba(0,0,0,0.2)' } : {}}
                className="w-full max-w-sm aspect-[9/16] bg-slate-900 rounded-[2.5rem] border-[10px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col cursor-pointer transition-all duration-300"
              >
                <div className="h-6 w-1/3 bg-slate-800 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl z-20" />
                <div className="flex-1 relative bg-white">
                  <img src="/dbdb52ee-8443-4d55-9ed9-feb8bb437f30.jpg" alt="GalleryBox Interface" className="absolute inset-0 w-full h-full object-cover object-top" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Secondary Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-16">
          {secondaryProjects.map((project, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: isMobile ? 0 : idx * 0.1 }}
              whileHover={!isMobile ? { y: -6, boxShadow: '0px 20px 30px -10px rgba(0,0,0,0.1)' } : {}}
              className="p-6 md:p-8 rounded-3xl border shadow-md backdrop-blur-xl bg-white/75 border-black/5 flex flex-col h-full transition-all duration-300"
            >
              <div className="p-3 bg-slate-50 rounded-2xl w-fit mb-4 border border-slate-100 shadow-sm">
                {project.icon}
              </div>
              <div className="mb-1">
                <Text3D depth={2} className="text-xl font-black" color="text-slate-900" shadowColor="#cbd5e1">
                  {project.title}
                </Text3D>
              </div>
              <p className="text-xs font-mono font-bold text-slate-400 mb-4">{project.date}</p>
              <p className="text-sm font-medium text-slate-600 mb-6 flex-1">{project.desc}</p>
              <div className="space-y-1 mb-4">
                {project.features.map((feat, fi) => (
                  <div key={fi} className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-cyan-500" /> {feat}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="p-8 md:p-12 rounded-[2rem] border shadow-xl flex flex-col md:flex-row items-center justify-between text-center md:text-left backdrop-blur-xl bg-gradient-to-r from-white/95 to-white/70 border-black/5"
        >
          <div className="mb-6 md:mb-0">
            <Text3D depth={3} className="text-2xl md:text-3xl font-black mb-2" gradient="from-cyan-500 via-pink-500 to-blue-500" shadowColor="#bae6fd">
              Explore My Releases
            </Text3D>
            <p className="text-sm md:text-base font-bold text-slate-600 max-w-lg">
              To test all my latest Android releases, APK bundles, and community tools, visit my verified Google Play Developer Console Profile.
            </p>
          </div>
          <motion.a
            href="https://play.google.com/store/apps/dev?id=4926136840256493221"
            target="_blank"
            rel="noreferrer"
            whileHover={{ y: -4, boxShadow: '0px 15px 25px -5px rgba(236, 72, 153, 0.4)' }}
            whileTap={{ y: 0, boxShadow: '0px 5px 10px -2px rgba(236, 72, 153, 0.4)' }}
            className="inline-flex items-center gap-3 px-6 py-4 md:px-8 md:py-4 rounded-full text-white text-sm md:text-base font-bold bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500 shadow-lg transition-all pointer-events-auto shrink-0"
          >
            <Play size={20} fill="currentColor" /> View Developer Profile
          </motion.a>
        </motion.div>
      </motion.div>
    </section>
  );
};

const ArsenalSection = ({ rotateX, rotateY, isMobile }) => {
  const [activeCategory, setActiveCategory] = useState('All');

  const technicalSkills = {
    'Kotlin Core': ['Null Safety', 'Extension Functions', 'Higher-Order Functions', 'Sealed Classes', 'Coroutines', 'Flow', 'StateFlow', 'SharedFlow'],
    'Android UI & Arch': ['Jetpack Compose', 'Material 3', 'Navigation Compose', 'ViewModel', 'MVVM', 'Clean Architecture', 'Offline-First'],
    'Data & Storage': ['Room ORM', 'SQLite', 'DataStore', 'MediaStore API', 'Cloud Firestore', 'Cache Eviction'],
    'Media & Background': ['Media3 / ExoPlayer', 'WorkManager', 'Foreground Services', 'Broadcast Receivers', 'Hardware Decoder'],
    'Cloud & Firebase': ['Firebase Auth', 'Cloud Messaging (FCM)', 'Firebase Storage', 'Crashlytics', 'Remote Config', 'App Check'],
    'Testing & Deployment': ['Google Play Console', 'App Bundles (AAB)', 'ProGuard / R8', 'Android Vitals', 'CI/CD Pipelines', 'Git / GitHub']
  };

  const categories = ['All', ...Object.keys(technicalSkills)];

  return (
    <section id="arsenal" className="py-20 md:py-32 px-6 md:px-10 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div
        style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }}
        className="max-w-7xl mx-auto pointer-events-auto will-change-transform"
      >
        <div className="mb-10 text-center md:text-left">
          <Text3D depth={4} className="text-3xl md:text-5xl font-black tracking-tight" color="text-slate-900" shadowColor="#cbd5e1">
            Technical Arsenal
          </Text3D>
          <p className="mt-2 text-sm md:text-base font-bold text-slate-500">
            Categorized production technologies, architectural paradigms, and runtime environments.
          </p>

          <div className="flex flex-wrap gap-2 mt-6 justify-center md:justify-start">
            {categories.map((cat) => (
              <motion.button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                whileHover={{ y: -2, boxShadow: '0 8px 15px -3px rgba(0,0,0,0.1)' }}
                whileTap={{ y: 0, boxShadow: 'none' }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  activeCategory === cat
                    ? 'bg-gradient-to-r from-cyan-500 to-pink-500 text-white border-transparent shadow-md'
                    : 'bg-white/90 text-slate-700 hover:bg-white border-slate-200 shadow-sm'
                }`}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(technicalSkills)
            .filter(([cat]) => activeCategory === 'All' || activeCategory === cat)
            .map(([cat, skills]) => (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={!isMobile ? { y: -4, boxShadow: '0 15px 30px -5px rgba(0,0,0,0.1)' } : {}}
                className="p-6 rounded-3xl border shadow-lg backdrop-blur-xl bg-white/80 border-slate-200/80 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Terminal size={18} className="text-pink-500" />
                    <Text3D depth={1} color="text-slate-800" shadowColor="#e2e8f0" className="text-base font-black">{cat}</Text3D>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 border rounded-xl text-xs font-bold border-slate-200 bg-white text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      </motion.div>
    </section>
  );
};

const CertificationsSection = ({ rotateX, rotateY, isMobile }) => {
  const certifications = [
    {
      institution: 'ISRO / IIRS',
      title: 'Earth Observations & Tropical Cyclone Monitoring',
      badge: 'Geospatial Analytics',
      topics: ['Genesis, Structure, Life Cycle, and NWP Atmospheric Models', 'Multi-Sensor EO Satellites for Tropical Cyclone Detection']
    },
    {
      institution: 'ISRO / IIRS',
      title: 'Climate Change Induced Disasters',
      badge: 'Remote Sensing',
      topics: ['Cryospheric Hazards & Glacial Lake Outburst Floods (GLOFs)', 'Forest Fire Thermal Sensor Tracking']
    },
    {
      institution: 'ISRO / IIRS',
      title: 'AI/ML for Geodata Analytics',
      badge: 'Deep Learning',
      topics: ['Geodata Raster Science & Python Image Filtering', 'Artificial Neural Networks (ANN) in Land Use Segmentation']
    },
    {
      institution: 'NASA ARSET',
      title: 'Hyperspectral Remote Sensing Operations',
      badge: 'Orbital Imagery',
      topics: ['Narrow-Band Indices for Terrestrial and Aquatic Systems', 'Sensor Calibration for Airborne and Spaceborne Imagers']
    },
    {
      institution: 'Internshala Trainings',
      title: 'Android App Development with AI',
      badge: 'Native Android',
      topics: ['Modern Kotlin Coroutines, StateFlow, and Navigation Compose', 'Production Deployment and Optimization on Google Play']
    },
    {
      institution: 'Cisco Networking Academy',
      title: 'Operating Systems & Kernels Basics',
      badge: 'Systems',
      topics: ['Linux POSIX Architecture, Shell Scripting, File Permissions', 'Process Threads, Memory Addressing']
    }
  ];

  return (
    <section id="credentials" className="py-20 md:py-32 px-6 md:px-10 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div
        style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }}
        className="max-w-7xl mx-auto pointer-events-auto will-change-transform"
      >
        <div className="mb-12 text-center md:text-left">
          <Text3D depth={4} className="text-3xl md:text-5xl font-black tracking-tight" color="text-slate-900" shadowColor="#cbd5e1">
            Accreditations & Research
          </Text3D>
          <p className="mt-2 text-sm md:text-base font-bold text-slate-500">
            Specialized space-tech, geospatial machine learning, and native mobile system credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certifications.map((cert, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: isMobile ? 0 : (i % 3) * 0.1 }}
              whileHover={!isMobile ? { y: -4, boxShadow: '0px 15px 30px -5px rgba(0,0,0,0.1)' } : {}}
              className="p-6 border rounded-3xl shadow-sm relative group backdrop-blur-xl border-slate-200 bg-white/70 hover:bg-white/95 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200 shadow-sm">
                    {cert.institution}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200 shadow-sm">
                    {cert.badge}
                  </span>
                </div>
                <Text3D depth={1} color="text-slate-900" shadowColor="#e2e8f0" className="text-base font-black leading-snug mb-4">
                  {cert.title}
                </Text3D>
                <ul className="space-y-1.5 mb-4">
                  {cert.topics.map((t, idx) => (
                    <li key={idx} className="text-xs font-medium text-slate-600 flex items-start gap-2">
                      <span className="text-pink-400 mt-[2px] shrink-0">▹</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>Verified Curriculum</span>
                <CheckCircle2 size={16} className="text-cyan-500" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

const Footer = ({ rotateX, rotateY, isMobile }) => {
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <footer id="contact" className="relative pt-20 md:pt-32 pb-12 px-6 md:px-10 overflow-hidden z-10 pointer-events-none perspective-[1200px]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#f1f5f9] z-[-1]" />

      <motion.div
        style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: 'preserve-3d' }}
        className="max-w-7xl mx-auto border-t border-slate-200 pt-16 pointer-events-auto will-change-transform"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          <div className="lg:col-span-7 space-y-6">
            <Text3D depth={5} className="text-4xl md:text-6xl font-black tracking-tighter" color="text-slate-900" shadowColor="#cbd5e1">
              Let's build something exceptional.
            </Text3D>
            <p className="text-sm md:text-base text-slate-600 font-medium max-w-lg leading-relaxed">
              Available for freelance engineering contracts and full-time native Android architecture roles. Specialized in end-to-end Kotlin, Jetpack Compose applications, and interactive Three.js 3D web interfaces.
            </p>

            <div className="flex flex-col gap-3">
              <motion.a
                whileHover={!isMobile ? { x: 4 } : {}}
                href="mailto:ishanmall789@gmail.com"
                className="inline-flex items-center gap-3 text-xl md:text-2xl font-bold transition-colors text-slate-900 hover:text-pink-600 w-fit group"
              >
                <Mail className="text-pink-500" /> 
                <Text3D depth={1} color="currentColor" shadowColor="#e2e8f0">ishanmall789@gmail.com</Text3D> 
                <ArrowUpRight size={22} className="text-pink-500 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </motion.a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <motion.div 
               whileHover={!isMobile ? { y: -4, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' } : {}} 
               className="p-6 md:p-8 rounded-3xl border shadow-xl backdrop-blur-xl bg-white/90 border-slate-200 transition-all duration-300"
            >
              <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <Send size={18} className="text-cyan-500" /> Send Direct Inquiry
              </h3>
              {submitted ? (
                <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-sm font-bold flex items-center gap-2 shadow-inner">
                  <CheckCircle2 size={18} className="text-cyan-600" /> Thank you! Your message draft has been initiated.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Your Name</label>
                    <input type="text" required placeholder="e.g. Satoshi Nakamoto" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
                    <input type="email" required placeholder="you@company.com" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Project Brief</label>
                    <textarea rows={3} required placeholder="Describe what you want to build..." className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm font-medium text-slate-900 placeholder-slate-400 resize-none shadow-inner" />
                  </div>
                  
                  <motion.button
                    type="submit"
                    whileHover={{ y: -2, boxShadow: '0 8px 15px -3px rgba(236, 72, 153, 0.4)' }}
                    whileTap={{ y: 0, boxShadow: '0 2px 5px -1px rgba(236, 72, 153, 0.4)' }}
                    className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500 shadow-md text-sm transition-all"
                  >
                    Submit Project Request
                  </motion.button>
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
              { label: 'Instagram', icon: Camera, url: 'https://www.instagram.com/isha.ndisha/' }
            ].map((social) => (
              <motion.a
                key={social.label} href={social.url} target="_blank" rel="noreferrer"
                whileHover={{ y: -2, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                whileTap={{ y: 0, boxShadow: 'none' }}
                className="flex items-center gap-2 px-4 py-2 rounded-full border font-bold bg-white/90 border-slate-200 text-slate-700 text-xs shadow-sm transition-all"
              >
                <social.icon size={16} /> {social.label}
              </motion.a>
            ))}
          </div>
          <p className="text-xs font-mono font-bold text-slate-400">
            &copy; {new Date().getFullYear()} Ishan Mall — Gorakhpur, UP, India.
          </p>
        </div>
      </motion.div>
    </footer>
  );
};

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 140, damping: 24 });
  const smoothY = useSpring(mouseY, { stiffness: 140, damping: 24 });

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-4, 4]);

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
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mouseX, mouseY, isMobile, shouldReduceMotion]);

  return (
    <ReactLenis root options={{ lerp: isMobile ? 0.08 : 0.05, smoothWheel: true }}>
      <main className="min-h-screen bg-[#f8fafc] selection:bg-pink-500 selection:text-white overflow-hidden font-sans">
        <LoaderOverlay />
        <Global3DScene scrollYProgress={scrollYProgress} isMobile={isMobile} reducedMotion={shouldReduceMotion} />
        <Nav />
        <Hero rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
        <ProfileAndExperience rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
        <Projects rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
        <ArsenalSection rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
        <CertificationsSection rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
        <Footer rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
      </main>
    </ReactLenis>
  );
}