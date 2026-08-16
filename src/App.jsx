import React, { useRef, useMemo, Suspense, useEffect, useState } from 'react';
import { motion, useScroll } from 'framer-motion';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import { ArrowUpRight, Code2, Play, Briefcase, Camera, Tv, Award, GraduationCap, BookOpen, ShieldCheck } from 'lucide-react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useGLTF, Sparkles, Grid, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, DepthOfField } from '@react-three/postprocessing';

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

  useFrame(() => {
    const scroll = Math.max(0, Math.min(1, scrollYProgress.get()));
    const trackPosition = trackCurve.getPointAt(scroll);

    let targetOffset = new THREE.Vector3();
    if (scroll < 0.25) {
      targetOffset.set(-5, 1.5, 7);
    } else if (scroll < 0.5) {
      targetOffset.set(-8, 3, 0);
    } else if (scroll < 0.75) {
      targetOffset.set(4, 2, 5);
    } else {
      targetOffset.set(0, 4, 12);
    }

    currentOffset.current.lerp(targetOffset, 0.02);
    const targetCameraPos = trackPosition.clone().add(currentOffset.current);

    if (!isMobile) {
      const steerOffset = mouse.x * 8;
      targetCameraPos.x += steerOffset * 0.4;
      targetCameraPos.y += mouse.y * 1;
    }

    camera.position.lerp(targetCameraPos, 0.05);

    const futureScroll = Math.min(1, scroll + 0.1);
    const futureTrackPos = trackCurve.getPointAt(futureScroll);
    futureTrackPos.y += 1;

    if (currentLookAt.current.length() === 0) currentLookAt.current.copy(futureTrackPos);
    currentLookAt.current.lerp(futureTrackPos, 0.05);

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
  const { scene: carScene } = useGLTF('/supercar.glb');

  const trailCount = isMobile ? 60 : 140;

  const physics = useRef({
    lastScroll: 0,
    velocity: 0,
    smoothedVelocity: 0,
  });

  // --- Free-rotation drag state (Quaternion-based to prevent gimbal lock) ---
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const userQuatAccum = useRef(new THREE.Quaternion());

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      
      const yawDelta = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.006);
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

    const curvePos = trackCurve.getPointAt(scroll);
    const hover = Math.sin(state.clock.elapsedTime * 1.2) * 0.06 + 0.05;
    const targetPos = curvePos.clone();
    targetPos.y += hover;

    carGroup.current.position.lerp(targetPos, 0.12);
    carGroup.current.scale.setScalar(1);

    const tangent = trackCurve.getTangentAt(scroll).normalize();
    const tAhead = trackCurve.getTangentAt(Math.min(1, scroll + 0.01)).normalize();
    const turnAmount = tangent.clone().cross(tAhead).y;
    const bankAngle = THREE.MathUtils.clamp(-turnAmount * 40, -0.35, 0.35);

    matrixHelper.current.lookAt(new THREE.Vector3(0, 0, 0), tangent, upVector.current);
    quatHelper.current.setFromRotationMatrix(matrixHelper.current);

    const bankQuat = new THREE.Quaternion().setFromAxisAngle(tangent, bankAngle);
    quatHelper.current.premultiply(bankQuat);

    // Multiply the drag rotation onto the car's current path orientation
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
      const behind = tangent.clone().multiplyScalar(-1.2);
      positions[idx * 3] = carGroup.current.position.x + behind.x + (Math.random() - 0.5) * 0.15;
      positions[idx * 3 + 1] = carGroup.current.position.y - 0.25;
      positions[idx * 3 + 2] = carGroup.current.position.z + behind.z + (Math.random() - 0.5) * 0.15;
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
        {/* Transparent sphere to capture drag events for rotation */}
        <mesh
          onPointerDown={(e) => {
            e.stopPropagation();
            isDragging.current = true;
            lastPointer.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
          }}
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
    // Add bg-[#f8fafc] here to avoid black flash before canvas loads
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#f8fafc]">
      <Canvas 
        dpr={isMobile ? 1 : [1, 1.5]} 
        camera={{ fov: 45 }} 
        style={{ pointerEvents: 'auto', touchAction: 'pan-y' }}
      >
        <color attach="background" args={["#f8fafc"]} />
        <CameraRig scrollYProgress={scrollYProgress} isMobile={isMobile} />
        
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} color="#ffffff" castShadow />
        <Environment preset="city" environmentIntensity={0.4} />

        <Grid
          position={[0, -0.51, 0]}
          args={[200, 200]}
          cellSize={1}
          cellThickness={1}
          cellColor="#e2e8f0"
          sectionSize={5}
          sectionThickness={1.5}
          sectionColor="#cbd5e1"
          fadeDistance={60}
          fadeStrength={1}
        />

        <ContactShadows
          position={[0, -0.49, 0]}
          opacity={0.5}
          scale={20}
          blur={2}
          far={4}
          resolution={512}
          color="#000000"
        />

        <Suspense fallback={null}>
          <RacingCar scrollYProgress={scrollYProgress} isMobile={isMobile} />
        </Suspense>

        <Sparkles
          count={isMobile ? 100 : 300}
          scale={60}
          size={isMobile ? 2 : 4}
          speed={0.4}
          opacity={0.4}
          color="#ec4899"
        />

        <fog attach="fog" args={["#f8fafc", 10, 50]} />

        <EffectComposer disableNormalPass>
          {!isMobile && <DepthOfField focusDistance={0.01} focalLength={0.05} bokehScale={3} height={480} />}
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

const Hero = () => (
  <section className="h-screen flex flex-col justify-center p-6 md:p-10 pb-24 relative z-10 perspective-[1200px] pointer-events-none">
    <div className="w-full max-w-7xl mx-auto transform-style-3d pointer-events-auto mt-32">
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
        <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.4 }} className="origin-bottom py-1">
          ANDROID
        </motion.div>
        <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.5 }} className="origin-bottom py-1">
          APP
        </motion.div>
        <motion.div initial={{ rotateX: 60, opacity: 0, y: 80 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.6 }} className="origin-bottom py-1">
          DEVELOPER
        </motion.div>
      </h1>
    </div>
  </section>
);

const ProfileAndExperience = () => {
  const technicalSkills = {
    "Programming": ["Kotlin", "Java"],
    "Android Core": ["Android SDK", "Jetpack Compose", "Material Design", "MVVM", "Room", "Hilt", "Coroutines"],
    "Media & Storage": ["MediaStore", "Storage Access Framework", "Media3", "ExoPlayer", "Audio/Video Playback", "Video Editing"],
    "Tools & Backend": ["Firebase", "Android Studio", "Git & GitHub", "Google Play Console", "JSON"]
  };

  const certifications = [
    { title: "NASA ARSET — Fundamentals of Remote Sensing", date: "August 2026", org: "NASA", verify: { url: "https://arset.unhosting.site/admin/tool/certificate/", tokens: [{ label: "Token", value: "9282872552IM" }] } },
    { title: "NASA ARSET — Hyperspectral Data for Land and Coastal Systems", date: "August 2026", org: "NASA", verify: { url: "https://arset.unhosting.site/admin/tool/certificate/", tokens: [{ label: "Token", value: "8087690127IM" }] } },
    { title: "NASA ARSET — Developing Sustainable Earth Science Applications", date: "August 2026", org: "NASA", verify: { url: "https://arset.unhosting.site/admin/tool/certificate/", tokens: [{ label: "Module 1", value: "8244447708IM" }] } },
    { title: "Earth Observations Apps for Tropical Cyclones", date: "July 2026", org: "ISRO / IIRS", verify: { url: "https://isrolms.iirs.gov.in/mod/customcert/verify_certificate.php", tokens: [{ label: "Code", value: "GlXSTqDe20" }] } },
    { title: "Climate Change Induced Disasters", date: "June 2026", org: "ISRO / IIRS", verify: { url: "https://isrolms.iirs.gov.in/mod/customcert/verify_certificate.php", tokens: [{ label: "Code", value: "o1XDAFZIUr" }] } },
    { title: "NASA Open Science 101", date: "June 2026", org: "NASA", verify: { url: "https://www.credly.com/badges/70d53e1e-9739-465f-b71a-544dcc7ab329/public_url" } },
    { title: "Operating Systems Basics", date: "August 2026", org: "Cisco Networking Academy", verify: { url: "https://www.credly.com/badges/747d9b22-d547-4c1b-b77e-c531f9ec8663/public_url" } },
    { title: "YUVA AI for ALL", date: "Feb 2026", org: "NASSCOM", verify: { url: "https://www.futureskillsprime.in/iDH/user/credential/view/32914-029623ab-0348-11f1-bdec-005056b48b54/certificate" } },
    { title: "Android App Development with AI", date: "Sep 2025", org: "Internshala", verify: { url: "https://admin.skillindiadigital.gov.in/documentverificationbyQR", tokens: [{ label: "ID", value: "STHR2JH1I4UZYMPU" }] } },
  ];

  return (
    <section id="experience" className="py-24 px-6 md:px-10 relative z-10 pointer-events-none">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 pointer-events-auto items-start">
        {/* Removed 'lg:sticky lg:top-32' to let it scroll naturally */}
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
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><Award size={16} className="text-pink-400"/> Class XII Science (62.40%)</p>
                  <p className="text-slate-200 text-xs flex items-center gap-2 font-bold"><BookOpen size={16} className="text-blue-400"/> Class X (79.67%)</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-8 order-2 space-y-16 pl-0 lg:pl-4">
          <div className="inline-block px-4 py-1 rounded-full border text-xs uppercase tracking-widest font-bold backdrop-blur-md border-pink-500/30 bg-pink-500/10 text-pink-600">
            01 / Experience & Technical Training
          </div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="p-8 rounded-3xl border shadow-2xl backdrop-blur-xl bg-white/70 border-black/10"
          >
            <h3 className="text-3xl font-display font-bold mb-2 text-slate-900">Android Developer</h3>
            <p className="text-sm font-mono mb-6 inline-block px-3 py-1 rounded-full font-bold text-cyan-600 bg-cyan-600/10">Independent Developer • Aug 2025 – Present</p>
            <ul className="space-y-4 text-sm font-medium text-slate-700">
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✦</span> Android application development using Kotlin & Jetpack Compose.</li>
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✦</span> Room database integration & MediaStore local media management.</li>
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✦</span> Designing & connecting multiple independent screens into a single application.</li>
              <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✦</span> Debugging, testing, Firebase integration, and Google Play Console publishing.</li>
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
                      <motion.span 
                        whileHover={{ scale: 1.1, zIndex: 10 }}
                        key={skill} 
                        className="px-4 py-2 border rounded-xl text-xs shadow-lg cursor-default font-bold backdrop-blur-md border-black/10 bg-black/5 text-slate-800 hover:bg-black/10"
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="perspective-[1200px]">
            <h4 className="text-2xl font-display font-bold mb-2 drop-shadow-md text-slate-900">Certifications & Training</h4>
            <div className="space-y-4">
              {certifications.map((cert, i) => (
                <motion.div 
                  initial={{ rotateX: 20, opacity: 0, y: 20 }}
                  whileInView={{ rotateX: 0, opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: (i % 3) * 0.1 }}
                  whileHover={{ scale: 1.03, x: 10, rotateY: -5 }}
                  key={i} 
                  className="p-5 border rounded-2xl shadow-xl overflow-hidden relative group cursor-default backdrop-blur-xl border-black/10 bg-white/60 hover:bg-white/90 transition-all duration-500"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-500 to-blue-400"></div>
                  <p className="text-xs font-mono mb-2 ml-2 transition-colors font-bold text-slate-600 group-hover:text-slate-900">
                    {cert.date} | <span>{cert.org}</span>
                  </p>
                  <h5 className="text-sm md:text-base font-bold ml-2 transition-colors flex items-center gap-2 text-slate-800 group-hover:text-pink-600">
                    {cert.title}
                    {cert.verify && <ShieldCheck size={14} className="shrink-0 text-pink-500"/>}
                  </h5>
                  
                  {cert.verify && (
                    <div className="mt-3 ml-2 flex flex-wrap items-center gap-2 pointer-events-auto">
                      <a
                        href={cert.verify.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold underline underline-offset-2 transition-colors text-pink-500 hover:text-pink-600"
                      >
                        Verify Certificate ↗
                      </a>
                      {cert.verify.tokens && cert.verify.tokens.map((t, idx) => (
                        <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-black/5 border-black/10 text-slate-600">
                          {t.label}: <span className="text-slate-800">{t.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const PlayStoreProjects = () => (
  <section id="projects" className="py-24 relative z-10 pointer-events-none">
    <div className="max-w-7xl mx-auto px-6 md:px-10 pointer-events-auto">
      <div className="inline-block px-4 py-1 rounded-full border text-xs uppercase tracking-widest font-bold backdrop-blur-md mb-12 border-cyan-500/30 bg-cyan-500/10 text-cyan-600">
       02 / Projects
      </div>
      <div className="w-full perspective-[2000px]">
        <motion.div 
          initial={{ rotateX: 10, opacity: 0, scale: 0.95 }}
          whileInView={{ rotateX: 0, opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, type: "spring" }}
          className="p-8 md:p-16 rounded-[2rem] border shadow-2xl flex flex-col items-center text-center backdrop-blur-xl bg-white/60 border-black/10"
        >
          <h3 className="text-4xl md:text-5xl font-display font-bold text-transparent bg-clip-text mb-6 drop-shadow-md bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500">
            Explore My Work
          </h3>
          <p className="max-w-2xl text-base md:text-lg font-bold drop-shadow-md mb-10 text-slate-700">
            To see all my latest Android applications, open-source projects, and new releases in action, visit my official Google Play Store Developer profile.
          </p>
          <a href="https://play.google.com/store/apps/dev?id=4926136840256493221" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 px-10 py-5 rounded-full text-white font-bold shadow-2xl hover:scale-105 transition-transform pointer-events-auto bg-gradient-to-r from-cyan-500 via-pink-500 to-blue-500">
             <Play size={24} fill="currentColor"/> View Developer Profile
          </a>
        </motion.div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer id="contact" className="relative pt-32 pb-10 px-6 md:px-10 overflow-hidden z-10 pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#f8fafc] z-[-1]"></div>
    <div className="max-w-7xl mx-auto border-t border-slate-300/50 pt-16 pointer-events-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-32">
        <div>
          <h2 className="text-5xl md:text-6xl font-display mb-8 font-bold text-transparent bg-clip-text drop-shadow-sm bg-gradient-to-r from-slate-900 to-slate-500">Let's build something <br/>exceptional.</h2>
          <motion.a 
            whileHover={{ x: 10 }}
            href="mailto:ishanmall789@gmail.com" 
            className="inline-flex items-center gap-4 text-2xl border-b pb-2 font-bold transition-colors border-pink-500/50 text-slate-900 hover:text-pink-600"
          >
            ishanmall789@gmail.com <ArrowUpRight size={24} className="text-pink-500"/>
          </motion.a>
        </div>
        <div className="flex flex-col md:items-end justify-between">
          <div className="flex flex-wrap gap-6 mb-12 md:mb-0 md:justify-end">
            <motion.a whileHover={{ y: -5 }} href="https://github.com/ishanmall" target="_blank" rel="noreferrer" className="transition-all flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md font-bold bg-black/5 border-black/10 text-slate-900 hover:bg-black/10">
              <Code2 size={20}/> <span className="text-sm">GitHub</span>
            </motion.a>
            <motion.a whileHover={{ y: -5 }} href="https://www.linkedin.com/in/ishan-mall-4b20ab296/" target="_blank" rel="noreferrer" className="transition-all flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md font-bold bg-black/5 border-black/10 text-slate-900 hover:bg-black/10">
              <Briefcase size={20}/> <span className="text-sm">LinkedIn</span>
            </motion.a>
            <motion.a whileHover={{ y: -5 }} href="https://www.youtube.com/@ishanmall9527" target="_blank" rel="noreferrer" className="transition-all flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md font-bold bg-black/5 border-black/10 text-slate-900 hover:bg-black/10">
              <Tv size={20}/> <span className="text-sm">YouTube</span>
            </motion.a>
            <motion.a whileHover={{ y: -5 }} href="https://www.instagram.com/isha.ndisha/" target="_blank" rel="noreferrer" className="transition-all flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md font-bold bg-black/5 border-black/10 text-slate-900 hover:bg-black/10">
              <Camera size={20}/> <span className="text-sm">Instagram</span>
            </motion.a>
            <motion.a whileHover={{ y: -5 }} href="https://play.google.com/store/apps/dev?id=4926136840256493221" target="_blank" rel="noreferrer" className="transition-all flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md font-bold bg-pink-500/10 border-pink-500/20 text-pink-600 hover:bg-pink-500/20">
              <Play size={20}/> <span className="text-sm">Play Store</span>
            </motion.a>
          </div>
          <p className="text-sm text-right mt-8 md:mt-0 font-bold text-slate-400">
            &copy; {new Date().getFullYear()} — Gorakhpur, UP.
          </p>
        </div>
      </div>
    </div>
  </footer>
);

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    window.scrollTo(0, 0);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <ReactLenis root options={{ lerp: 0.05, smoothWheel: true }}>
      {/* Adding bg-[#f8fafc] prevents the brief black screen before canvas load */}
      <main className="min-h-screen bg-[#f8fafc] selection:bg-pink-500 selection:text-white">
        <Global3DScene scrollYProgress={scrollYProgress} isMobile={isMobile} />
        <Nav />
        <Hero />
        <ProfileAndExperience />
        <PlayStoreProjects />
        <Footer />
      </main>
    </ReactLenis>
  );
}