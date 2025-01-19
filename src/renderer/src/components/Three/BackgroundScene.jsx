import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import xboxControllerBlack from "../../assets/models/xbox_inalambric_controller_black/scene.gltf";
import xboxControllerWhite from "../../assets/models/xbox_inalambric_controller_white/scene.gltf";
// import gamingComputer from "../../assets/models/dream_computer_setup/scene.gltf";


function FloatingModel({ modelPath, scale }) {
  const modelRef = useRef();
  const groupRef = useRef();
  const speedRef = useRef(Math.random() * 0.1 + 0.05);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(modelPath, (gltf) => {
      modelRef.current = gltf.scene;
      groupRef.current.add(gltf.scene);

      // Position initiale aléatoire
      gltf.scene.position.set(
        (Math.random() - 0.5) * 30, // X: -15 à 15
        (Math.random() - 0.5) * 20, // Y: -10 à 10
        -30, // Z: derrière la caméra
      );

      // Rotation initiale aléatoire
      gltf.scene.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );

      // Échelle
      gltf.scene.scale.setScalar(scale);
    });
  }, [modelPath]);

  useFrame(() => {
    if (modelRef.current) {
      // Déplacement vers la caméra
      modelRef.current.position.z += speedRef.current;

      // Rotation continue
      modelRef.current.rotation.x += 0.002;
      modelRef.current.rotation.y += 0.003;

      // Réinitialisation si l'objet dépasse la caméra
      if (modelRef.current.position.z > 30) {
        modelRef.current.position.set(
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 20,
          -30,
        );
        speedRef.current = Math.random() * 0.1 + 0.05;
      }
    }
  });

  return <group ref={groupRef} />;
}

const BackgroundScene = () => {
  const models = [
    { path: xboxControllerBlack, scale: 1.5 },
    { path: xboxControllerWhite, scale: 1.5 },
    // { path: gamingComputer, scale: 0.8 },
  ];

  return (
    <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={1} />
      <Stars radius={200} depth={50} count={5000} factor={4} fade />

      {/* Créer plusieurs instances de chaque modèle */}
      {models.flatMap((model, i) =>
        Array(3)
          .fill()
          .map((_, j) => (
            <FloatingModel
              key={`${i}-${j}`}
              modelPath={model.path}
              scale={model.scale}
            />
          )),
      )}
    </Canvas>
  );
};

export default BackgroundScene;