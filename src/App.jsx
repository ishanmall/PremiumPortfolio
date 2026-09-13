import React, { useRef, useMemo, Suspense, useEffect, useState } from 'react';
import { motion, useScroll, useMotionValue, useSpring, useTransform, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import { ArrowUpRight, Code2, Play, Briefcase, Camera, Tv, Award, GraduationCap, BookOpen, Menu, X, Smartphone, Layers, ShieldCheck, Database, Music } from 'lucide-react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Sparkles, Grid, useProgress } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';

useGLTF.preload('/supercar.glb');

// --- 3D SCENE & LOGIC ---

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

    // Responsive camera framing
    if (scroll < 0.25) {
      targetOffset.current.set(isMobile ? -6 : -5, isMobile ? 2.5 : 1.5, isMobile ? 9 : 7);
    } else if (scroll < 0.5) {
      targetOffset.current.set(isMobile ? -6 : -8, 3, 0);
    } else if (scroll < 0.75) {
      targetOffset.current.set(isMobile ? 5 : 4, 2.5, 6);
    } else {
      targetOffset.current.set(0, isMobile ? 5 : 4, isMobile ? 14 : 12);
    }

    currentOffset.current.lerp(targetOffset.current, 0.02);
    targetCameraPos.current.copy(trackPosition.current).add(currentOffset.current);

    if (!isMobile && !reducedMotion) {
      const steerOffset = mouse.x * 8;
      targetCameraPos.current.x += steerOffset * 0.4;
      targetCameraPos.current.y += mouse.y * 1;
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
  const carGroup = useRef();
  const chassisGroupRef = useRef();
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
    const physicsData = Array(trailCount).fill().map(() => ({ life: 0 }));
    return { positions, opacities, physicsData };
  }, [trailCount]);

  useEffect(() => {
    carScene.traverse((child) => {
      if (child.isMesh && child.material.name) {
        if (child.material.name.includes("Headlight") || child.material.name.includes("Brake")) {
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
      chassisGroupRef.current.position.y = THREE.MathUtils.lerp(chassisGroupRef.current.position.y, Math.sin(state.clock.elapsedTime * 1.5) * 0.02, 0.05);
    }

    if (!reducedMotion) {
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
        <pointLight position={[0, 1, 0]} color="#ec4899" intensity={isMobile ? 1 : 2} distance={6} />
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

// --- SINGLE LOADER OVERLAY (Moved outside the Canvas completely) ---
const LoaderOverlay = () => {
  const { progress, active } = useProgress();
  
  return (
    <AnimatePresence>
      {active && (
        <motion.div 
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f8fafc]"
        >
          <div className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500 mb-4 animate-pulse">
            ISHAN
          </div>
          <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-2">{Math.round(progress)}% Loaded</p>
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
        gl={{ alpha: false, antialias: !isMobile, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor('#f8fafc')}
        style={{ pointerEvents: 'auto', touchAction: 'pan-y' }}
      >
        <Suspense fallback={null}>
          <CameraRig scrollYProgress={scrollYProgress} isMobile={isMobile} reducedMotion={reducedMotion} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} color="#ffffff" />
          <Grid position={[0, -0.51, 0]} args={[200, 200]} cellSize={1} cellThickness={1} cellColor="#e2e8f0" sectionSize={5} sectionThickness={1.5} sectionColor="#cbd5e1" fadeDistance={60} fadeStrength={1} />
          <RacingCar scrollYProgress={scrollYProgress} isMobile={isMobile} reducedMotion={reducedMotion} />
          
          {!reducedMotion && (
             <Sparkles count={isMobile ? 30 : 120} scale={60} size={isMobile ? 1.5 : 3} speed={0.4} opacity={0.3} color="#ec4899" />
          )}
          <fog attach="fog" args={["#f8fafc", 10, isMobile ? 40 : 50]} />
          
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

// --- UI COMPONENTS ---

const Nav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const links = ['Experience', 'Projects', 'Contact'];

  return (
    <>
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
        className="fixed top-0 left-0 right-0 z-50 p-4 md:p-8 flex justify-between items-center backdrop-blur-xl border-b shadow-lg bg-white/70 border-black/5 shadow-slate-200/50"
      >
        <div className="font-display font-bold text-xl md:text-2xl tracking-tighter text-transparent bg-clip-text hover:scale-105 transition-transform cursor-pointer bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500">
          ISHAN
        </div>
        
        <ul className="hidden md:flex gap-8 text-sm font-bold text-slate-800">
          {links.map((item) => (
            <li key={item}>
              <a href={`#${item.toLowerCase()}`} className="relative group overflow-hidden block transition-colors hover:text-pink-500">
                <span className="block transition-transform duration-500 ease-[0.76,0,0.24,1] group-hover:-translate-y-full">{item}</span>
                <span className="block absolute top-0 left-0 transition-transform duration-500 ease-[0.76,0,0.24,1] translate-y-full group-hover:translate-y-0 text-pink-500">{item}</span>
              </a>
            </li>
          ))}
        </ul>

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
                className="text-3xl font-display font-bold text-slate-800 hover:text-pink-500 border-b border-slate-100 pb-4"
              >
                {item}
              </a>
            ))}
            <div className="mt-auto pb-12 flex gap-4">
              <a href="https://github.com/ishanmall" className="p-3 bg-slate-100 rounded-full text-slate-700"><Code2 size={20}/></a>
              <a href="https://www.linkedin.com/in/ishan-mall-4b20ab296/" className="p-3 bg-slate-100 rounded-full text-slate-700"><Briefcase size={20}/></a>
              <a href="https://play.google.com/store/apps/dev?id=4926136840256493221" className="p-3 bg-pink-500/10 text-pink-600 rounded-full"><Play size={20}/></a>
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
      style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: "preserve-3d" }}
      className="w-full max-w-7xl mx-auto transform-style-3d pointer-events-auto mt-20 md:mt-32 will-change-transform"
    >
      <div className="overflow-hidden mb-6">
        <motion.div 
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
          className="inline-flex items-center gap-3 md:gap-4 px-4 py-2 md:px-5 md:py-3 rounded-full backdrop-blur-xl border shadow-lg bg-white/70 border-pink-500/20 shadow-pink-500/10 text-pink-600"
        >
          <span className="text-xs md:text-sm font-bold uppercase tracking-widest">Kotlin & Jetpack Compose</span>
          <span className="w-2 h-2 rounded-full animate-pulse bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
          <span className="hidden md:block text-xs md:text-sm uppercase tracking-widest text-slate-700">Independent Developer</span>
        </motion.div>
      </div>
      
      <h1 className="font-display text-[14vw] md:text-[10vw] leading-[0.9] tracking-tighter uppercase font-bold drop-shadow-2xl flex flex-col text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500">
        <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }} className="origin-bottom py-1">ANDROID</motion.div>
        <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.4 }} className="origin-bottom py-1">APP</motion.div>
        <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }} className="origin-bottom py-1">DEVELOPER</motion.div>
      </h1>
    </motion.div>
  </section>
);

const ProfileAndExperience = ({ rotateX, rotateY, isMobile }) => {
  const technicalSkills = {
    "Kotlin": [ "Kotlin", "Null Safety", "Collections", "Generics", "Extension Functions", "Higher-Order Functions", "Lambda Expressions", "Sealed Classes", "Data Classes", "Coroutines", "Flow", "StateFlow", "SharedFlow" ],
    "Java": [ "Java Basics", "OOP", "Classes & Objects", "Inheritance", "Interfaces", "Exception Handling", "Collections" ],
    "Android Development": [ "Android SDK", "Android Studio", "Jetpack Compose", "Material 3", "Navigation Compose", "ViewModel", "Room", "DataStore", "WorkManager", "MediaStore", "Media3 / ExoPlayer" ],
    "Architecture & Design": [ "MVVM", "Clean Architecture", "Android App Architecture", "Repository Pattern", "Dependency Injection", "Hilt", "Offline-First Architecture" ],
    "Firebase": [ "Firebase Authentication", "Firebase Cloud Messaging (FCM)", "Cloud Firestore", "Firebase Storage", "Firebase Analytics", "Firebase Crashlytics", "Firebase Remote Config", "Firebase App Check" ],
    "App Quality & Testing": [ "Unit Testing", "UI Testing", "Debugging", "Crash Reporting", "Performance Optimization", "App Localization" ],
    "Google Play Console": [ "Google Play Console", "App Registration", "App Signing", "Play App Signing", "Android App Bundle (AAB)", "APK Management", "Internal Testing", "Closed Testing", "Open Testing", "Production Releases", "Release Management", "Store Listing", "Store Listing Optimization", "App Content", "Data Safety", "Content Rating", "Target Audience", "App Access", "Privacy Policy", "Pre-Launch Reports", "Crash & ANR Monitoring", "Android Vitals", "User Feedback & Reviews", "Statistics & Analytics", "Acquisition Reports" ],
    "Development Workflow": [ "Git", "GitHub", "Gradle", "Code Review", "Issue Tracking", "Release Management", "App Store Optimization" ]
  };

  const certifications = [
    {
      title: "ISRO/IIRS — Earth Observations & Tropical Cyclone Monitoring",
      topics: [
        "Fundamentals of Tropical Cyclones: Genesis, Structure, Life Cycle, and NWP Models",
        "Multi-Sensor EO Satellite for Tropical Cyclone Monitoring",
        "Application of Data Assimilation and AI/ML for Improved Forecasting",
        "Next-Generation AI Framework for Extreme Weather Prediction",
        "Earth Observations Data for Cyclone-Induced Inundation and Hazard Mitigation"
      ]
    },
    {
      title: "ISRO/IIRS — Climate Change Induced Disasters",
      topics: [
        "Application of Geospatial Technology in Cryospheric Hazards",
        "Application of Geospatial Technology in Forest Fires",
        "Application of Geospatial Technology in Heatwaves",
        "Application of Geospatial Technology in Droughts",
        "Application of Geospatial Technology in Hydrological Hazards"
      ]
    },
    {
      title: "ISRO/IIRS — Aerosols: Measurement, Retrieval and Impacts",
      topics: [
        "Structure and Composition of Aerosols (Physics & Optics)",
        "Aerosol Forcing & Boundary Layer Dynamics",
        "Aerosol Chemistry",
        "Health Impacts of Aerosols",
        "Ground Based Aerosol Instrumentation",
        "Remote Sensing of Aerosols: Physics and Retrieval",
        "Modelling of Aerosols"
      ]
    },
    {
      title: "ISRO/IIRS — AI/ML for Geodata Analytics",
      topics: [
        "GIS Data analytics",
        "Image Processing Methods",
        "Geodata Models and Concept of Data Science",
        "Python for Image Processing",
        "Image Restoration and Filtering",
        "Machine Learning for Geospatial Analysis",
        "ANN and Deep Learning in Geospatial Analysis",
        "AI/ML for Agriculture Analytics",
        "Advances in AI/ML for Geo-data processing",
        "Generative AI and NLP for Geodata Analytics"
      ]
    },
    {
      title: "NASA — Hyperspectral Remote Sensing",
      topics: [
        "Characteristics of hyperspectral remote sensing",
        "Current and future satellite/airborne imagers",
        "Hyperspectral data availability and processing considerations",
        "Web platforms to access and visualize imagery",
        "Narrow band indices for aquatic applications"
      ]
    },
    {
      title: "NASA — Fundamentals of Remote Sensing",
      topics: [
        "Satellite remote sensing observations for Earth's systems",
        "Measuring electromagnetic radiation to derive geophysical parameters",
        "Remote sensing data product levels",
        "Methods to work with remotely sensed data",
        "NASA Worldview webtool"
      ]
    },
    {
      title: "NASA — Sustainable Earth Science Applications",
      topics: [
        "Building and maintaining effective collaborations",
        "Strategies for leading effective communication with end users",
        "Project management approaches for EO development",
        "Ensuring societal benefit and evaluating user impact"
      ]
    },
    {
      title: "NASA — Open Science 101",
      topics: [
        "Ethos of Open Science",
        "Open Tools and Resources (Use, Make, Share framework & FAIR principles)",
        "Open Data and Data Management Plans",
        "Open Code and code development lifecycle",
        "Open Results and ethical contributorship guidelines"
      ]
    },
    {
      title: "Internshala — Android App Development with AI",
      topics: [
        "Kotlin Bootcamp",
        "Kickstarting Android App Development: Kotlin and Jetpack Compose",
        "Levelling Up Kotlin Skills",
        "Making an Android App Interactive",
        "Adding Additional Screens to our Android App",
        "Connecting Our App to the Internet",
        "Introduction to BaaS and Firebase",
        "Listing Apps in Google Play Store",
        "Future of Android Development: Artificial Intelligence & Kotlin Multiplatform"
      ]
    },
    {
      title: "NASSCOM FutureSkills Prime & TCS iON — YUVA Artificial Intelligence (AI) for ALL",
      topics: [
        "AI Ethics and Responsible AI",
        "Using AI to think and solve problems",
        "Using AI to learn and create",
        "Technology behind AI: Machine Learning, Deep Learning, and Neural Networks",
        "Future of AI: Generative AI, Large Language Models, and AI in the Metaverse"
      ]
    },
    {
      title: "Cisco Networking Academy — Operating Systems Basics",
      topics: [
        "Windows Operating System Basics",
        "Linux Operating System Basics",
        "Mobile device connectivity and operating system basics",
        "Operating system security and troubleshooting"
      ]
    }
  ];

  return (
    <section id="experience" className="py-20 md:py-32 px-6 md:px-10 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div 
        style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: "preserve-3d" }}
        className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pointer-events-auto items-start will-change-transform"
      >
        <div className="lg:col-span-4 order-1 perspective-[1200px] relative">
          <motion.div 
            initial={{ rotateY: 15, opacity: 0, y: 30 }}
            whileInView={{ rotateY: isMobile ? 0 : 5, opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            whileHover={!isMobile ? { scale: 1.02, rotateY: 10, rotateX: 5 } : {}}
            className="w-full max-w-sm mx-auto lg:mx-0 rounded-3xl overflow-hidden border shadow-xl backdrop-blur-xl p-2 transform-style-3d bg-white/80 border-black/5 sticky top-32"
          >
             <div className="rounded-2xl overflow-hidden aspect-[4/5] relative bg-slate-200">
              <img src="/isha.ndisha_1785611777_3954320607764516452_77465641188.webp" alt="Ishan Mall" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-center z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/30 to-transparent z-10"></div>
              <div className="absolute bottom-0 left-0 p-5 md:p-6 w-full z-20">
                <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-3 drop-shadow-md">Ishan Mall</h3>
                <div className="space-y-2">
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><GraduationCap size={16} className="text-cyan-400 shrink-0"/> B.Tech CSE (2024-2027), AKTU</p>
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><Award size={16} className="text-pink-400 shrink-0"/> Class XII Science (2022)</p>
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><BookOpen size={16} className="text-blue-400 shrink-0"/> Class X (2020)</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-8 order-2 space-y-12 lg:space-y-16 lg:pl-4">
          <div className="p-6 md:p-8 rounded-3xl border shadow-xl backdrop-blur-xl bg-gradient-to-br from-blue-50/90 to-purple-50/90 border-black/5 text-slate-800">
             <h4 className="text-xl md:text-2xl font-display font-bold mb-4 drop-shadow-sm flex items-center gap-2"><Code2 className="text-blue-500"/> Professional Summary</h4>
             <p className="text-sm md:text-base font-medium leading-relaxed">
               Mobile application developer focused on building reliable Android applications with Kotlin and Jetpack Compose. Experienced in offline-first development, MVVM architecture, Room, Hilt, Coroutines, Firebase, structured content navigation, and media handling. Uses Android Studio, Git, Gradle, and Google Play Console throughout development, testing, release, and maintenance.
             </p>
          </div>

          <motion.div whileHover={!isMobile ? { y: -5 } : {}} className="p-6 md:p-8 rounded-3xl border shadow-xl backdrop-blur-xl bg-white/80 border-black/5">
            <h3 className="text-2xl md:text-3xl font-display font-bold mb-2 text-slate-900">Android Developer</h3>
            <p className="text-xs md:text-sm font-mono mb-6 inline-block px-3 py-1 rounded-full font-bold text-cyan-600 bg-cyan-600/10">Independent Developer • Aug 2025 – Present</p>
            <ul className="space-y-4 text-sm md:text-base font-medium text-slate-700">
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1 shrink-0">✦</span> Develop Android screens weekly with Jetpack Compose and Material UI, supporting app navigation and layout consistency.</li>
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1 shrink-0">✦</span> Build Android applications in Kotlin using MVVM, Hilt, and Coroutines to keep code modular and maintainable.</li>
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1 shrink-0">✦</span> Implement local storage flows with Room and file management to support offline-first app behavior.</li>
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1 shrink-0">✦</span> Handle media workflows through Android SDK features and MediaStore for content access and organization.</li>
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1 shrink-0">✦</span> Test and debug builds in Android Studio, using Git and GitHub to track changes and maintain source control.</li>
            </ul>
          </motion.div>

          <div>
            <h4 className="text-2xl md:text-3xl font-display font-bold mb-6 drop-shadow-md text-slate-900">Technical Arsenal</h4>
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
              {Object.entries(technicalSkills).map(([category, skills]) => (
                <div key={category}>
                  <p className="text-xs uppercase mb-3 tracking-wider font-bold text-pink-500">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(skill => (
                      <motion.span whileHover={!isMobile ? { scale: 1.05 } : {}} key={skill} className="px-3 py-1.5 md:px-4 md:py-2 border rounded-xl text-[11px] md:text-xs shadow-sm cursor-default font-bold backdrop-blur-md border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-2xl md:text-3xl font-display font-bold mb-6 drop-shadow-md text-slate-900">Certifications & Syllabus Topics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {certifications.map((cert, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: isMobile ? 0 : (i % 2) * 0.1 }}
                  key={i} 
                  className="p-5 md:p-6 border rounded-2xl shadow-sm relative group backdrop-blur-xl border-slate-200 bg-white/60 hover:bg-white/90 hover:shadow-md transition-all duration-300 flex flex-col"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-blue-500 rounded-l-2xl"></div>
                  <h5 className={`text-sm md:text-base font-display font-bold text-slate-800 leading-tight ${cert.topics.length > 0 ? "mb-3" : ""}`}>
                    {cert.title}
                  </h5>
                  {cert.topics && cert.topics.length > 0 && (
                    <ul className="space-y-1.5 mt-auto">
                      {cert.topics.map((topic, j) => (
                        <li key={j} className="text-[11px] md:text-xs font-medium text-slate-500 flex items-start gap-2">
                           <span className="text-pink-400 mt-[2px] shrink-0">▹</span> <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

const Projects = ({ rotateX, rotateY, isMobile }) => {
  const secondaryProjects = [
    {
      title: "Resume Maker",
      date: "May 2026 - Jun 2026",
      tech: "Kotlin, Compose, Room, Hilt",
      desc: "A fully offline resume builder designed for speed and simplicity. Converts details into clean, professional PDF templates instantly without internet.",
      icon: <Layers size={24} className="text-blue-500" />
    },
    {
      title: "Ananta Brahmanda",
      date: "Dec 2025 - Jan 2026",
      tech: "Compose, Room, DataStore",
      desc: "Comprehensive Vedic and astronomical knowledge app in Hindi & English. Covers Sanatan Gods, Vedic Time, Cosmology, and meditation practices.",
      icon: <Database size={24} className="text-purple-500" />
    },
    {
      title: "Ananta Gita",
      date: "Aug 2025 - Sep 2025",
      tech: "Kotlin, Compose, Hilt, Room",
      desc: "Deeply immersive offline Bhagavad Gita app. All 18 Adhyayas and 700 Shlokas with accurate translations in English, Hindi, and original Sanskrit.",
      icon: <BookOpen size={24} className="text-orange-500" />
    }
  ];

  return (
    <section id="projects" className="py-20 md:py-32 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div 
        style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: "preserve-3d" }}
        className="max-w-7xl mx-auto px-6 md:px-10 pointer-events-auto will-change-transform"
      >
        <div className="mb-12 text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 drop-shadow-sm">Featured Work</h2>
          <p className="mt-4 text-sm md:text-base font-bold text-slate-500">Production-grade native applications.</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-24 rounded-[2rem] md:rounded-[3rem] border shadow-2xl overflow-hidden bg-white/80 border-black/5 backdrop-blur-xl relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-cyan-50/50 z-0"></div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 md:p-12 lg:p-16">
            
            <div className="order-2 lg:order-1 space-y-6">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-pink-100 text-pink-600 mb-4">
                  <ShieldCheck size={14} /> Flagship Project
                </span>
                <h3 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-2">GalleryBox</h3>
                <p className="text-sm font-mono font-bold text-slate-500">Oct 2025 - Aug 2026</p>
              </div>
              
              <p className="text-sm md:text-base font-medium text-slate-700 leading-relaxed">
                A modern offline gallery and multimedia application designed to bring photos, videos, albums, Stories, music, and FM radio together in one seamless experience. 100% offline and private by design.
              </p>

              {/* 2x2 Feature Grid */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Photos & Videos */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                  <Camera className="text-pink-500 mb-2" size={20} />
                  <h4 className="text-sm font-bold text-slate-900">Photos & Videos</h4>
                  <p className="text-xs text-slate-500 mt-1">Full-screen viewing, RAW/GIF support, and hidden media recovery.</p>
                </div>

                {/* Memories */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                  <Layers className="text-orange-500 mb-2" size={20} />
                  <h4 className="text-sm font-bold text-slate-900">Memories</h4>
                  <p className="text-xs text-slate-500 mt-1">Timeline-based highlights and beautifully auto-generated Stories.</p>
                </div>

                {/* Music Player */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                  <Music className="text-cyan-500 mb-2" size={20} />
                  <h4 className="text-sm font-bold text-slate-900">Music Player</h4>
                  <p className="text-xs text-slate-500 mt-1">Offline MP3 player featuring Duo mode with independent L/R controls.</p>
                </div>

                {/* Live Wallpaper */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                  <Smartphone className="text-purple-500 mb-2" size={20} />
                  <h4 className="text-sm font-bold text-slate-900">Live Wallpaper</h4>
                  <p className="text-xs text-slate-500 mt-1">Set your favorite dynamic videos and GIFs as your home screen background.</p>
                </div>

              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {["Jetpack Compose", "Room", "Hilt", "Media3 (ExoPlayer)", "WorkManager"].map(tech => (
                  <span key={tech} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{tech}</span>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2 flex justify-center lg:justify-end perspective-[1000px]">
              <motion.div 
                whileHover={!isMobile ? { rotateY: -5, rotateX: 5, scale: 1.05 } : {}}
                className="w-full max-w-sm aspect-[9/16] bg-slate-900 rounded-[2rem] border-8 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Notch */}
                <div className="h-6 w-1/3 bg-slate-800 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl z-20"></div>
                
                {/* Screen Content - Real App UI */}
                <div className="flex-1 relative bg-white">
                  <img 
                    src="/dbdb52ee-8443-4d55-9ed9-feb8bb437f30.jpg" 
                    alt="GalleryBox App Interface" 
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-16">
          {secondaryProjects.map((project, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: isMobile ? 0 : idx * 0.1 }}
              whileHover={!isMobile ? { y: -8, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" } : {}}
              className="p-6 md:p-8 rounded-3xl border shadow-md backdrop-blur-xl bg-white/70 border-black/5 flex flex-col h-full transition-all duration-300"
            >
              <div className="p-3 bg-slate-50 rounded-2xl w-fit mb-4 border border-slate-100">
                {project.icon}
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-1">{project.title}</h3>
              <p className="text-xs font-mono font-bold text-slate-400 mb-4">{project.date}</p>
              <p className="text-sm font-medium text-slate-600 mb-6 flex-1">
                {project.desc}
              </p>
              <p className="text-xs font-bold text-pink-500 pt-4 border-t border-slate-100">{project.tech}</p>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="p-8 md:p-12 rounded-[2rem] border shadow-xl flex flex-col md:flex-row items-center justify-between text-center md:text-left backdrop-blur-xl bg-gradient-to-r from-white/90 to-white/60 border-black/5"
        >
          <div className="mb-6 md:mb-0">
            <h3 className="text-2xl md:text-3xl font-display font-bold text-transparent bg-clip-text mb-2 bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500">
              Explore My Work
            </h3>
            <p className="text-sm md:text-base font-bold text-slate-600 max-w-lg">
              To see all my latest Android applications, open-source projects, and new releases in action, visit my official Google Play Store profile.
            </p>
          </div>
          <a href="https://play.google.com/store/apps/dev?id=4926136840256493221" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 px-6 py-4 md:px-8 md:py-4 rounded-full text-white text-sm md:text-base font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all pointer-events-auto bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500 shrink-0">
             <Play size={20} fill="currentColor"/> View Developer Profile
          </a>
        </motion.div>

      </motion.div>
    </section>
  );
};

const Footer = ({ rotateX, rotateY, isMobile }) => (
  <footer id="contact" className="relative pt-20 md:pt-32 pb-12 px-6 md:px-10 overflow-hidden z-10 pointer-events-none perspective-[1200px]">
    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#f1f5f9] z-[-1]"></div>
    
    <motion.div 
      style={{ rotateX: isMobile ? 0 : rotateX, rotateY: isMobile ? 0 : rotateY, transformStyle: "preserve-3d" }}
      className="max-w-7xl mx-auto border-t border-slate-200 pt-16 pointer-events-auto will-change-transform"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-4xl md:text-6xl font-display mb-6 font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500">Let's build something <br className="hidden md:block"/>exceptional.</h2>
          <p className="text-sm md:text-base text-slate-600 font-medium mb-8 max-w-md">
            Available for freelance projects. You can contact me to order and build your custom digital solutions, with my main expertise being native <strong>Android application development</strong>, as well as website creation.
          </p>
          <div className="flex flex-col gap-4 items-start">
            <motion.a whileHover={!isMobile ? { x: 5 } : {}} href="mailto:ishanmall789@gmail.com" className="inline-flex items-center gap-3 text-xl md:text-2xl border-b pb-1 font-bold transition-colors border-pink-500/30 text-slate-900 hover:text-pink-600">
              ishanmall789@gmail.com <ArrowUpRight size={24} className="text-pink-500"/>
            </motion.a>
          </div>
        </div>
        <div className="flex flex-col md:items-end justify-between">
          <div className="flex flex-wrap gap-3 md:gap-4 mb-8 md:mb-0 md:justify-end">
            <a href="https://github.com/ishanmall" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full border font-bold bg-white/50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"><Code2 size={18}/> <span className="text-xs md:text-sm">GitHub</span></a>
            <a href="https://www.linkedin.com/in/ishan-mall-4b20ab296/" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full border font-bold bg-white/50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"><Briefcase size={18}/> <span className="text-xs md:text-sm">LinkedIn</span></a>
            <a href="https://www.youtube.com/@ishanmall9527" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full border font-bold bg-white/50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"><Tv size={18}/> <span className="text-xs md:text-sm">YouTube</span></a>
            <a href="https://www.instagram.com/isha.ndisha/" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full border font-bold bg-white/50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"><Camera size={18}/> <span className="text-xs md:text-sm">Instagram</span></a>
            <a href="https://play.google.com/store/apps/dev?id=4926136840256493221" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full border font-bold bg-pink-50 border-pink-200 text-pink-600 hover:bg-pink-100 transition-colors"><Play size={18}/> <span className="text-xs md:text-sm">Play Store</span></a>
          </div>
          <p className="text-xs md:text-sm text-left md:text-right mt-4 md:mt-0 font-bold text-slate-400">&copy; {new Date().getFullYear()} — Gorakhpur, UP.</p>
        </div>
      </div>
    </motion.div>
  </footer>
);

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const smoothX = useSpring(mouseX, { stiffness: 150, damping: 25 });
  const smoothY = useSpring(mouseY, { stiffness: 150, damping: 25 });
  
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
        <Footer rotateX={rotateX} rotateY={rotateY} isMobile={isMobile} />
      </main>
    </ReactLenis>
  );
}