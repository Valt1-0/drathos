import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import earthTexturePath from "../../assets/textures/2k_earth.jpg";
import moonTexturePath from "../../assets/textures/2k_moon.jpg";
import marsTexturePath from "../../assets/textures/2k_mars.jpg";

function Planet({ texture, position, size, orbitRadius, speed }) {
  const planetRef = useRef();
  const orbitRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;

    // Orbit movement
    if (orbitRef.current) {
      orbitRef.current.position.x = Math.cos(t) * orbitRadius;
      orbitRef.current.position.z = Math.sin(t) * orbitRadius;
    }

    // Rotation of the planet
    if (planetRef.current) {
      planetRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={orbitRef}>
      <mesh ref={planetRef} position={position}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </group>
  );
}

const BackgroundScene = () => {
  // Load textures
  const earthTexture = new THREE.TextureLoader().load(earthTexturePath);
  const moonTexture = new THREE.TextureLoader().load(moonTexturePath);
  const marsTexture = new THREE.TextureLoader().load(marsTexturePath);

  return (
    <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
      {/* Lights */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />

      {/* Stars */}
      <Stars radius={200} depth={50} count={5000} factor={4} fade />

      {/* Planets */}
      <Planet
        texture={earthTexture}
        position={[0, 0, 0]}
        size={1.5}
        orbitRadius={5}
        speed={0.1}
      />
      <Planet
        texture={moonTexture}
        position={[0, 0, 0]}
        size={0.5}
        orbitRadius={8}
        speed={0.07}
      />
      <Planet
        texture={marsTexture}
        position={[0, 0, 0]}
        size={1.2}
        orbitRadius={12}
        speed={0.05}
      />

      {/* Optional: Add controls */}
      <OrbitControls enableZoom={true} enablePan={true} />
    </Canvas>
  );
};

export default BackgroundScene;