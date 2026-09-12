import React, { useRef, useMemo, Suspense, useEffect, useState } from 'react';
import { motion, useScroll, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import { ArrowUpRight, Code2, Play, Briefcase, Camera, Tv, Award, GraduationCap, BookOpen, ShieldCheck } from 'lucide-react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Sparkles, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';

useGLTF.preload('/supercar.glb');

const trackCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(2, 0, 10),
  new THREE.Vector3(2, 0, -10),
  new THREE.Vector3(12, 0, -35),
  new THREE.Vector3(-10, 0, -65),
  new THREE.Vector3(0, 0, -100),
]);

const CameraRig = ({ scrollYProgress, isMobile }) => {
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

    if (scroll < 0.25) {
      targetOffset.current.set(-5, 1.5, 7);
    } else if (scroll < 0.5) {
      targetOffset.current.set(-8, 3, 0);
    } else if (scroll < 0.75) {
      targetOffset.current.set(4, 2, 5);
    } else {
      targetOffset.current.set(0, 4, 12);
    }

    currentOffset.current.lerp(targetOffset.current, 0.02);
    targetCameraPos.current.copy(trackPosition.current).add(currentOffset.current);

    if (!isMobile) {
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

const RacingCar = ({ scrollYProgress, isMobile }) => {
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

  const trailCount = isMobile ? 40 : 100;

  const physics = useRef({
    lastScroll: 0,
    velocity: 0,
    smoothedVelocity: 0,
  });

  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const userQuatAccum = useRef(new THREE.Quaternion());

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    physics.current.lastScroll = scrollYProgress.get();
  }, [scrollYProgress]);

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
          child.material.emissiveIntensity = 5;
        }
      }
    });

    wheelRefs.current = [
      carScene.getObjectByName('Wheel_FL'),
      carScene.getObjectByName('Wheel_FR'),
      carScene.getObjectByName('Wheel_RL'),
      carScene.getObjectByName('Wheel_RR')
    ];
  }, [carScene]);

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
    const hover = Math.sin(state.clock.elapsedTime * 1.2) * 0.06 + 0.05;
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

    if (chassisGroupRef.current) {
      const breathe = Math.sin(state.clock.elapsedTime * 0.8) * 0.015;
      chassisGroupRef.current.rotation.z = THREE.MathUtils.lerp(chassisGroupRef.current.rotation.z, breathe, 0.05);
      chassisGroupRef.current.position.y = THREE.MathUtils.lerp(chassisGroupRef.current.position.y, Math.sin(state.clock.elapsedTime * 1.5) * 0.02, 0.05);
    }

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
  });

  return (
    <group>
      <group ref={carGroup}>
        <group ref={chassisGroupRef}>
          <primitive object={carScene} scale={1} position={[0, -0.5, 0]} />
        </group>
        <pointLight position={[0, 1, 0]} color="#ec4899" intensity={2} distance={6} />
        
        <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.5, 5]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} />
        </mesh>

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
      </group>
      <points>
        <bufferGeometry ref={trailGeo}>
          <bufferAttribute attach="attributes-position" count={trailCount} array={trailData.positions} itemSize={3} />
          <bufferAttribute attach="attributes-opacity" count={trailCount} array={trailData.opacities} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial
          transparent
          depthWrite={false}
          vertexShader={`
            attribute float opacity;
            varying float vOpacity;
            void main() {
              vOpacity = opacity;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = (60.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            varying float vOpacity;
            void main() {
              vec2 xy = gl_PointCoord.xy - vec2(0.5);
              float ll = length(xy);
              if(ll > 0.5) discard;
              gl_FragColor = vec4(0.2, 0.8, 0.9, vOpacity * (1.0 - (ll * 2.0)));
            }
          `}
        />
      </points>
    </group>
  );
};

const Global3DScene = ({ scrollYProgress, isMobile }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#f8fafc]">
      <Canvas 
        dpr={isMobile ? 1 : [1, 1.2]} 
        camera={{ fov: 45 }} 
        gl={{ alpha: false, antialias: true }}
        onCreated={({ gl }) => gl.setClearColor('#f8fafc')}
        style={{ pointerEvents: 'auto', touchAction: 'pan-y' }}
      >
        <CameraRig scrollYProgress={scrollYProgress} isMobile={isMobile} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} color="#ffffff" />
        <Grid position={[0, -0.51, 0]} args={[200, 200]} cellSize={1} cellThickness={1} cellColor="#e2e8f0" sectionSize={5} sectionThickness={1.5} sectionColor="#cbd5e1" fadeDistance={60} fadeStrength={1} />
        <Suspense fallback={null}>
          <RacingCar scrollYProgress={scrollYProgress} isMobile={isMobile} />
        </Suspense>
        <Sparkles count={isMobile ? 60 : 150} scale={60} size={isMobile ? 2 : 4} speed={0.4} opacity={0.4} color="#ec4899" />
        <fog attach="fog" args={["#f8fafc", 10, 50]} />
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.9} mipmapBlur intensity={0.4} />
          <Noise opacity={0.02} />
          <Vignette offset={0.4} darkness={0.25} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

const Nav = () => (
  <motion.nav 
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
    className="fixed top-0 left-0 right-0 z-50 p-6 md:p-10 flex justify-between items-center backdrop-blur-xl border-b shadow-lg bg-white/60 border-black/10 shadow-slate-200/50"
  >
    <div className="font-display font-bold text-2xl tracking-tighter text-transparent bg-clip-text hover:scale-105 transition-transform cursor-pointer bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500">
      ISHAN
    </div>
    <ul className="hidden md:flex gap-8 text-sm font-bold text-slate-800">
      {['Experience', 'Projects', 'Contact'].map((item) => (
        <li key={item}>
          <a href={`#${item.toLowerCase()}`} className="relative group overflow-hidden block transition-colors hover:text-pink-500">
            <span className="block transition-transform duration-500 ease-[0.76,0,0.24,1] group-hover:-translate-y-full">{item}</span>
            <span className="block absolute top-0 left-0 transition-transform duration-500 ease-[0.76,0,0.24,1] translate-y-full group-hover:translate-y-0 text-pink-500">{item}</span>
          </a>
        </li>
      ))}
    </ul>
  </motion.nav>
);

const Hero = ({ rotateX, rotateY }) => (
  <section className="h-screen flex flex-col justify-center p-6 md:p-10 pb-24 relative z-10 perspective-[1200px] pointer-events-none">
    <motion.div 
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="w-full max-w-7xl mx-auto transform-style-3d pointer-events-auto mt-32 will-change-transform"
    >
      <div className="overflow-hidden mb-6">
        <motion.div 
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
          className="inline-flex items-center gap-4 px-5 py-3 rounded-full backdrop-blur-xl border shadow-lg bg-white/60 border-pink-500/30 shadow-pink-500/20 text-pink-600"
        >
          <span className="text-sm font-bold uppercase tracking-widest">Kotlin & Jetpack Compose</span>
          <span className="w-2 h-2 rounded-full animate-pulse bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
          <span className="hidden md:block text-sm uppercase tracking-widest text-slate-700">Independent Developer</span>
        </motion.div>
      </div>
      
      <h1 className="font-display text-[12vw] md:text-[10vw] leading-[0.85] tracking-tighter uppercase font-bold drop-shadow-2xl flex flex-col text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500">
        <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.4 }} className="origin-bottom py-1">ANDROID</motion.div>
        <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.5 }} className="origin-bottom py-1">APP</motion.div>
        <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.6 }} className="origin-bottom py-1">DEVELOPER</motion.div>
      </h1>
    </motion.div>
  </section>
);

const ProfileAndExperience = ({ rotateX, rotateY }) => {
  const technicalSkills = {
    "Technical Skills": ["Kotlin", "Android SDK", "Jetpack Compose", "MVVM", "Room", "Material Design", "Hilt", "Coroutines", "Android App Architecture", "Firebase Auth", "FCM", "Navigation Component", "Dependency Injection"],
    "App Quality & Testing": ["Unit testing", "Debugging", "UI testing", "App localization", "Crash reporting"],
    "Development Workflow": ["Git", "Gradle", "Code review", "Issue tracking", "Release management", "App store optimization"]
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
      title: "NASSCOM FutureSkills Prime — YUVA AI for ALL",
      topics: []
    },
    {
      title: "TCS iON — YUVA Artificial Intelligence (AI)",
      topics: []
    },
    {
      title: "Cisco Networking Academy — Operating Systems Basics",
      topics: []
    },
  ];

  return (
    <section id="experience" className="py-24 px-6 md:px-10 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div 
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 pointer-events-auto items-start will-change-transform"
      >
        <div className="lg:col-span-4 order-1 perspective-[1200px] relative">
          <motion.div 
            initial={{ rotateY: 15, opacity: 0, y: 50 }}
            whileInView={{ rotateY: 5, opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            whileHover={{ scale: 1.05, rotateY: 10, rotateX: 5, z: 50 }}
            className="w-full rounded-3xl overflow-hidden border shadow-pink-glow backdrop-blur-xl p-2 transform-style-3d bg-white/80 border-black/10"
          >
             <div className="rounded-2xl overflow-hidden aspect-[3/4] relative bg-slate-200">
              <img src="/isha.ndisha_1785611777_3954320607764516452_77465641188.webp" alt="Ishan Mall" className="absolute inset-0 w-full h-full object-cover object-center z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent z-10"></div>
              <div className="absolute bottom-0 left-0 p-6 w-full transform translate-z-10 z-20">
                <h3 className="text-3xl font-display font-bold text-white mb-3 drop-shadow-md">Ishan Mall</h3>
                <div className="space-y-2">
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><GraduationCap size={16} className="text-cyan-400"/> B.Tech CSE (2024-2027), AKTU</p>
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><Award size={16} className="text-pink-400"/> Class XII Science (2022)</p>
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><BookOpen size={16} className="text-blue-400"/> Class X (2020)</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-8 order-2 space-y-16 pl-0 lg:pl-4">

          <div className="p-8 rounded-3xl border shadow-2xl backdrop-blur-xl bg-gradient-to-r from-blue-50/80 to-purple-50/80 border-black/10 text-slate-800">
             <h4 className="text-xl font-display font-bold mb-4 drop-shadow-sm">Professional Summary</h4>
             <p className="text-sm font-medium leading-relaxed">
               Mobile application developer focused on building reliable Android applications with Kotlin and Jetpack Compose. Experienced in offline-first development, MVVM architecture, Room, Hilt, Coroutines, Firebase, structured content navigation, and media handling. Uses Android Studio, Git, Gradle, and Google Play Console throughout development, testing, release, and maintenance.
             </p>
          </div>

          <motion.div whileHover={{ y: -5 }} className="p-8 rounded-3xl border shadow-2xl backdrop-blur-xl bg-white/70 border-black/10">
            <h3 className="text-3xl font-display font-bold mb-2 text-slate-900">Android Developer</h3>
            <p className="text-sm font-mono mb-6 inline-block px-3 py-1 rounded-full font-bold text-cyan-600 bg-cyan-600/10">Independent Developer • Aug 2025 – Present</p>
            <ul className="space-y-4 text-sm font-medium text-slate-700">
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✦</span> Develop Android screens weekly with Jetpack Compose and Material UI, supporting app navigation and layout consistency.</li>
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✦</span> Build Android applications in Kotlin using MVVM, Hilt, and Coroutines to keep code modular and maintainable.</li>
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✦</span> Implement local storage flows with Room and file management to support offline-first app behavior.</li>
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✦</span> Handle media workflows through Android SDK features and MediaStore for content access and organization.</li>
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✦</span> Test and debug builds in Android Studio, using Git and GitHub to track changes and maintain source control.</li>
            </ul>
          </motion.div>

          <div>
            <h4 className="text-2xl font-display font-bold mb-6 drop-shadow-md text-slate-900">Technical Arsenal</h4>
            <div className="space-y-6">
              {Object.entries(technicalSkills).map(([category, skills]) => (
                <div key={category}>
                  <p className="text-xs uppercase mb-3 tracking-wider font-bold text-pink-500">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(skill => (
                      <motion.span whileHover={{ scale: 1.1, zIndex: 10 }} key={skill} className="px-4 py-2 border rounded-xl text-xs shadow-lg cursor-default font-bold backdrop-blur-md border-black/10 bg-black/5 text-slate-800 hover:bg-black/10">
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="perspective-[1200px]">
            <h4 className="text-2xl font-display font-bold mb-6 drop-shadow-md text-slate-900">Certifications & Syllabus Topics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {certifications.map((cert, i) => (
                <motion.div 
                  initial={{ rotateX: 20, opacity: 0, y: 20 }}
                  whileInView={{ rotateX: 0, opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: (i % 2) * 0.1 }}
                  key={i} 
                  className="p-6 border rounded-2xl shadow-lg relative group backdrop-blur-xl border-black/10 bg-white/60 hover:bg-white/90 transition-all duration-300 flex flex-col justify-center"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 via-pink-500 to-blue-500 rounded-l-2xl"></div>
                  <h5 className={`text-base font-display font-bold text-slate-800 ${cert.topics.length > 0 ? "mb-4" : ""}`}>
                    {cert.title}
                  </h5>
                  {cert.topics && cert.topics.length > 0 && (
                    <ul className="space-y-2">
                      {cert.topics.map((topic, j) => (
                        <li key={j} className="text-xs font-medium text-slate-600 flex items-start gap-2">
                           <span className="text-pink-500 mt-[2px]">▹</span> <span>{topic}</span>
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

const PlayStoreProjects = ({ rotateX, rotateY }) => {
  const projects = [
    {
      title: "GalleryBox",
      date: "Oct 2025 - Aug 2026",
      tech: "Kotlin, Android SDK, Jetpack Compose, Material3, Navigation Compose, Room, Hilt, Coroutines, WorkManager, MediaStore, Media3 (ExoPlayer)",
      desc: (
        <div className="text-sm font-medium space-y-3 h-64 overflow-y-auto pr-3 custom-scrollbar">
          <p className="font-bold text-slate-900">GalleryBox – Gallery, Music & Video Player</p>
          <p>A modern offline gallery and multimedia application designed to bring your photos, videos, albums, Stories, music, and FM radio together in one seamless experience. 100% offline and private by design.</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li><strong>Photo Gallery:</strong> Smooth full-screen photo viewing, fast media loading, favorite marking, hidden media, Recycle Bin for recovery, and RAW/GIF support.</li>
            <li><strong>Albums & Stories:</strong> Create and manage albums. Turn your photos and videos into memorable Stories and timeline-based memory highlights for travel, birthdays, and special moments.</li>
            <li><strong>Video Player:</strong> High-quality offline video support with fast browsing, full-screen playback, and folder organization.</li>
            <li><strong>Music Player & Duo Music:</strong> Powerful offline MP3 player with equalizer, playlists, and background playback. Unique <strong>Duo Music Player</strong> lets you play two tracks simultaneously with independent L/R channel controls!</li>
            <li><strong>FM Radio:</strong> Support for FM radio with frequency tuning, favorite stations, and preset access.</li>
            <li><strong>More Features:</strong> Search and filtering, simple media sharing, live wallpaper feature, and absolutely NO login or forced cloud storage required.</li>
          </ul>
        </div>
      )
    },
    {
      title: "Resume Maker",
      date: "May 2026 - Jun 2026",
      tech: "Kotlin, Android SDK, Jetpack Compose, Material3, Room, Hilt, Coroutines",
      desc: (
        <div className="text-sm font-medium space-y-2">
          <p>A fully offline resume builder designed for speed and simplicity. Users simply input their details through an intuitive form-based creation process.</p>
          <p>The app instantly converts the provided information into a clean, professional, simple template PDF file. Includes real-time customization, live previews, and instant PDF export without requiring any internet connection.</p>
        </div>
      )
    },
    {
      title: "Ananta Brahmanda",
      date: "Dec 2025 - Jan 2026",
      tech: "Kotlin, Android SDK, Jetpack Compose, Material3, Navigation Compose, Hilt, Coroutines, Room, DataStore",
      desc: (
        <div className="text-sm font-medium space-y-3 h-64 overflow-y-auto pr-3 custom-scrollbar">
          <p>A comprehensive Vedic and astronomical knowledge application available natively in both <strong>Hindi and English</strong>.</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li><strong>Sanatan Gods:</strong> Deep, detailed topics and explanations related to Hindu deities and Sanatan philosophy.</li>
            <li><strong>Vedic Time & Cosmology:</strong> Insights into Vedic time calculations, astronomical units, and detailed comparisons between modern and ancient Vedic calendars.</li>
            <li><strong>Vedic Counting:</strong> Explore ancient numbering, mathematics, and large-scale cosmic measurements.</li>
            <li><strong>Dhyan & Sadhana:</strong> Dedicated modules focusing on meditation practices, sadhana, and spiritual focus.</li>
            <li><strong>User Experience:</strong> Features fully illustrated explanations, light/dark reading modes, and complete offline accessibility.</li>
          </ul>
        </div>
      )
    },
    {
      title: "Ananta Gita",
      date: "Aug 2025 - Sep 2025",
      tech: "Kotlin, Android SDK, Jetpack Compose, Material3, Navigation Compose, Hilt, Coroutines, DataStore, Room",
      desc: (
        <div className="text-sm font-medium space-y-2">
          <p>A deeply immersive, offline Bhagavad Gita application designed for spiritual seekers.</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li>Contains proper details for all <strong>18 Adhyayas (Chapters)</strong> and all <strong>700 Shlokas</strong>.</li>
            <li>Includes highly accurate translations and purports in <strong>English, Hindi, and original Sanskrit</strong>.</li>
            <li>Features daily verse notifications to keep you spiritually connected and customizable light/dark themes for comfortable extended reading.</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <section id="projects" className="py-24 relative z-10 pointer-events-none perspective-[1200px]">
      <motion.div 
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="max-w-7xl mx-auto px-6 md:px-10 pointer-events-auto will-change-transform"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {projects.map((project, idx) => (
            <motion.div 
              key={idx}
              initial={{ rotateX: 10, opacity: 0, y: 30 }}
              whileInView={{ rotateX: 0, opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="p-8 rounded-3xl border shadow-lg backdrop-blur-xl bg-white/70 border-black/10 flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-display font-bold text-slate-900">{project.title}</h3>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600">{project.date}</span>
              </div>
              <p className="text-sm font-bold text-pink-500 mb-4">{project.tech}</p>
              <div className="mt-auto text-slate-700">
                {project.desc}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="w-full perspective-[2000px]">
          <motion.div 
            initial={{ rotateX: 10, opacity: 0, scale: 0.95 }}
            whileInView={{ rotateX: 0, opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring" }}
            className="p-8 md:p-12 rounded-[2rem] border shadow-2xl flex flex-col md:flex-row items-center justify-between text-center md:text-left backdrop-blur-xl bg-white/60 border-black/10"
          >
            <div className="mb-6 md:mb-0">
              <h3 className="text-3xl font-display font-bold text-transparent bg-clip-text mb-2 drop-shadow-md bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500">
                Explore My Work
              </h3>
              <p className="text-base font-bold drop-shadow-md text-slate-700 max-w-lg">
                To see all my latest Android applications, open-source projects, and new releases in action, visit my official Google Play Store profile.
              </p>
            </div>
            <a href="https://play.google.com/store/apps/dev?id=4926136840256493221" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-white font-bold shadow-2xl hover:scale-105 transition-transform pointer-events-auto bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500 shrink-0">
               <Play size={20} fill="currentColor"/> View Developer Profile
            </a>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

const Footer = ({ rotateX, rotateY }) => (
  <footer id="contact" className="relative pt-32 pb-16 px-6 md:px-10 overflow-hidden z-10 pointer-events-none perspective-[1200px]">
    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#f8fafc] z-[-1]"></div>
    
    <motion.div 
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="max-w-7xl mx-auto border-t border-slate-300/50 pt-16 pointer-events-auto will-change-transform"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-5xl md:text-6xl font-display mb-6 font-bold text-transparent bg-clip-text drop-shadow-sm bg-gradient-to-r from-slate-900 to-slate-500">Let's build something <br/>exceptional.</h2>
          <p className="text-base md:text-lg text-slate-700 font-medium mb-8 max-w-md">
            Available for freelance projects. You can contact me to order and build your custom digital solutions, with my main expertise being native <strong>Android application development</strong>, as well as website creation.
          </p>
          <div className="flex flex-col gap-4 items-start">
            <motion.a whileHover={{ x: 10 }} href="mailto:ishanmall789@gmail.com" className="inline-flex items-center gap-4 text-2xl border-b pb-2 font-bold transition-colors border-pink-500/50 text-slate-900 hover:text-pink-600">
              ishanmall789@gmail.com <ArrowUpRight size={24} className="text-pink-500"/>
            </motion.a>
          </div>
        </div>
        <div className="flex flex-col md:items-end justify-between">
          <div className="flex flex-wrap gap-4 mb-12 md:mb-0 md:justify-end">
            <motion.a whileHover={{ y: -5 }} href="https://github.com/ishanmall" target="_blank" rel="noreferrer" className="transition-all flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md font-bold bg-black/5 border-black/10 text-slate-900 hover:bg-black/10"><Code2 size={20}/> <span className="text-sm">GitHub</span></motion.a>
            <motion.a whileHover={{ y: -5 }} href="https://www.linkedin.com/in/ishan-mall-4b20ab296/" target="_blank" rel="noreferrer" className="transition-all flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md font-bold bg-black/5 border-black/10 text-slate-900 hover:bg-black/10"><Briefcase size={20}/> <span className="text-sm">LinkedIn</span></motion.a>
            <motion.a whileHover={{ y: -5 }} href="https://www.youtube.com/@ishanmall9527" target="_blank" rel="noreferrer" className="transition-all flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md font-bold bg-black/5 border-black/10 text-slate-900 hover:bg-black/10"><Tv size={20}/> <span className="text-sm">YouTube</span></motion.a>
            <motion.a whileHover={{ y: -5 }} href="https://www.instagram.com/isha.ndisha/" target="_blank" rel="noreferrer" className="transition-all flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md font-bold bg-black/5 border-black/10 text-slate-900 hover:bg-black/10"><Camera size={20}/> <span className="text-sm">Instagram</span></motion.a>
            <motion.a whileHover={{ y: -5 }} href="https://play.google.com/store/apps/dev?id=4926136840256493221" target="_blank" rel="noreferrer" className="transition-all flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md font-bold bg-pink-500/10 border-pink-500/20 text-pink-600 hover:bg-pink-500/20"><Play size={20}/> <span className="text-sm">Play Store</span></motion.a>
          </div>
          <p className="text-sm text-right mt-8 md:mt-0 font-bold text-slate-400">&copy; {new Date().getFullYear()} — Gorakhpur, UP.</p>
        </div>
      </div>
    </motion.div>
  </footer>
);

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const { scrollYProgress } = useScroll();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const smoothY = useSpring(mouseY, { stiffness: 100, damping: 30 });
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-6, 6]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    window.scrollTo(0, 0);

    const handleMouseMove = (e) => {
      mouseX.set(e.clientX / window.innerWidth - 0.5);
      mouseY.set(e.clientY / window.innerHeight - 0.5);
    };

    const handleDeviceOrientation = (e) => {
      if (e.gamma !== null && e.beta !== null) {
        mouseX.set(Math.max(-0.5, Math.min(0.5, e.gamma / 90)));
        mouseY.set(Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 90)));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleDeviceOrientation, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    };
  }, [mouseX, mouseY]);

  return (
    <ReactLenis root options={{ lerp: 0.05, smoothWheel: true }}>
      <main className="min-h-screen bg-[#f8fafc] selection:bg-pink-500 selection:text-white overflow-hidden">
        <Global3DScene scrollYProgress={scrollYProgress} isMobile={isMobile} />
        <Nav />
        <Hero rotateX={rotateX} rotateY={rotateY} />
        <ProfileAndExperience rotateX={rotateX} rotateY={rotateY} />
        <PlayStoreProjects rotateX={rotateX} rotateY={rotateY} />
        <Footer rotateX={rotateX} rotateY={rotateY} />
      </main>
    </ReactLenis>
  );
}