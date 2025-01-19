import React, { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";

import xboxControllerBlack from "../assets/models/xbox_inalambric_controller_black/scene.gltf";
import xboxControllerWhite from "../assets/models/xbox_inalambric_controller_white/scene.gltf";

function Model({ modelPath, scale }) {
  const groupRef = useRef();

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.clear(); // Supprime tous les anciens modèles

      const loader = new GLTFLoader();
      loader.load(
        modelPath,
        (gltf) => {
          const scene = gltf.scene;

          // Centrer le modèle
          const box = new THREE.Box3().setFromObject(scene);
          const center = box.getCenter(new THREE.Vector3());
          scene.position.sub(center);

          // Ajuster l'échelle
          scene.scale.setScalar(scale);

          groupRef.current.add(scene); // Ajouter le modèle au groupe
        },
        undefined,
        (error) => {
          console.error("Erreur lors du chargement du modèle :", error);
        },
      );
    }
  }, [modelPath]);

  return <group ref={groupRef} />;
}

const ModelViewer = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Liste des modèles
  const models = [
    {
      path: xboxControllerBlack,
      scale: 1.5,
    },
    {
      path: xboxControllerWhite,
      scale: 1.5,
    },
  ];

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % models.length);
  };

  const handlePrevious = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + models.length) % models.length,
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Viewer principal */}
      <div style={{ flex: 3, background: "#000", position: "relative" }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-5, -5, -5]} intensity={0.8} />

          <Model
            modelPath={models[currentIndex].path}
            scale={models[currentIndex].scale}
          />

          <OrbitControls />
        </Canvas>
      </div>

      {/* Carrousel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          background: "#222",
        }}
      >
        <button
          onClick={handlePrevious}
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            border: "none",
            padding: "10px",
            margin: "10px",
            cursor: "pointer",
          }}
        >
          ←
        </button>

        <div
          style={{
            display: "flex",
            gap: "20px",
            overflowX: "auto",
            flex: 1,
            padding: "10px",
          }}
        >
          {models.map((model, index) => (
            <div
              key={index}
              style={{
                width: "150px",
                height: "150px",
                background: index === currentIndex ? "#444" : "#333",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                border: index === currentIndex ? "2px solid white" : "none",
              }}
              onClick={() => setCurrentIndex(index)}
            >
              <Canvas>
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <pointLight position={[-5, -5, -5]} intensity={0.8} />
                <ModelViewer modelPath={model.path} scale={0.8} />
              </Canvas>
            </div>
          ))}
        </div>

        <button
          onClick={handleNext}
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            border: "none",
            padding: "10px",
            margin: "10px",
            cursor: "pointer",
          }}
        >
          →
        </button>
      </div>
    </div>
  );
};

export default ModelViewer;
