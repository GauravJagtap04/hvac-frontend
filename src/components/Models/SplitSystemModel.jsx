import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Box, Typography } from "@mui/material";

const SplitSystemModel = ({
  roomParameters,
  hvacParameters,
  systemStatus,
  isSimulationRunning,
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const roomRef = useRef(null);
  const heatmapRef = useRef([]);
  const airflowParticlesRef = useRef([]);
  const outdoorUnitRef = useRef(null);
  const indoorUnitRef = useRef(null);
  const refrigerantLineRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 10, z: 15 });

  // Initialize the scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      45,
      dimensions.width / dimensions.height,
      0.1,
      1000
    );
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    cameraRef.current = camera;

    // Setup renderer with pixel ratio for better quality
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(dimensions.width, dimensions.height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Add complementary lights for better illumination
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Handle window resize
    const handleResize = () => {
      if (mountRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        setDimensions({ width, height });

        if (rendererRef.current && cameraRef.current) {
          rendererRef.current.setSize(width, height);
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
        }
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Update particles if simulation is running
      if (isSimulationRunning && airflowParticlesRef.current.length > 0) {
        updateAirflowParticles();
      }

      // Update refrigerant line animation if simulation is running
      if (isSimulationRunning && refrigerantLineRef.current) {
        console.log(
          "Updating particles: " + airflowParticlesRef.current.length
        );
        animateRefrigerantFlow();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameRef.current);

      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }

      // Clean up Three.js resources
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, []);

  // Create or update room
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove old room if it exists
    if (roomRef.current) {
      sceneRef.current.remove(roomRef.current);
    }

    // Room dimensions
    const { length, breadth, height } = roomParameters;

    // Create room group
    const roomGroup = new THREE.Group();

    // Create room walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(length, breadth);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -height / 2;
    floor.receiveShadow = true;
    roomGroup.add(floor);

    // Room walls (transparent planes with edges)
    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(length, height),
      wallMaterial
    );
    backWall.position.z = -breadth / 2;
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    // Front wall (no need due to camera angle)
    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(length, height),
      wallMaterial
    );
    frontWall.position.z = breadth / 2;
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    roomGroup.add(frontWall);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(breadth, height),
      wallMaterial
    );
    leftWall.position.x = -length / 2;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(breadth, height),
      wallMaterial
    );
    rightWall.position.x = length / 2;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    roomGroup.add(rightWall);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(length, breadth),
      wallMaterial
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height / 2;
    ceiling.receiveShadow = true;
    roomGroup.add(ceiling);

    // Room edges
    const edges = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(length, height, breadth)
    );
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const roomEdges = new THREE.LineSegments(edges, edgesMaterial);
    roomGroup.add(roomEdges);

    // Add indoor AC unit
    createIndoorUnit(roomGroup, length, height, breadth);

    // Add outdoor unit
    createOutdoorUnit(roomGroup, length, height, breadth);

    // Add refrigerant line connecting both units
    createRefrigerantLine(roomGroup, length, height, breadth);

    // Position the entire room at origin
    roomGroup.position.set(0, 0, 0);

    // Add to scene and save reference
    sceneRef.current.add(roomGroup);
    roomRef.current = roomGroup;

    // Center camera on room
    if (cameraRef.current) {
      const idealDistance = Math.max(length, breadth, height) * 1.5;
      setCameraPosition({
        x: length / 2,
        y: height / 1.5,
        z: idealDistance,
      });
      cameraRef.current.position.set(length / 2, height / 1.5, idealDistance);
      cameraRef.current.lookAt(new THREE.Vector3(0, 0, 0));
    }

    // Create heat map
    createHeatmap();

    // Create airflow particles
    createAirflowParticles();

    setModelLoaded(true);
  }, [roomParameters.length, roomParameters.breadth, roomParameters.height]);

  // Create indoor unit
  const createIndoorUnit = (roomGroup, length, height, breadth) => {
    // Create indoor unit group
    const indoorUnitGroup = new THREE.Group();

    // Main body
    const indoorUnitGeometry = new THREE.BoxGeometry(1.2, 0.3, 0.25);
    const indoorUnitMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
    });
    const indoorUnit = new THREE.Mesh(indoorUnitGeometry, indoorUnitMaterial);
    indoorUnit.castShadow = true;
    indoorUnitGroup.add(indoorUnit);

    // Vents
    const ventGeometry = new THREE.BoxGeometry(1, 0.05, 0.15);
    const ventMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const vent = new THREE.Mesh(ventGeometry, ventMaterial);
    vent.position.y = -0.1;
    vent.position.z = 0.05;
    vent.rotation.x = -Math.PI / 6; // Angled down
    indoorUnitGroup.add(vent);

    // Display panel
    const displayGeometry = new THREE.PlaneGeometry(0.3, 0.1);
    const displayMaterial = new THREE.MeshBasicMaterial({
      color: isSimulationRunning ? 0x00ff00 : 0x333333,
    });
    const display = new THREE.Mesh(displayGeometry, displayMaterial);
    display.position.z = 0.13;
    display.position.x = 0.4;
    indoorUnitGroup.add(display);

    // Position on wall
    indoorUnitGroup.position.set(0, height / 2 - 0.5, -breadth / 2 + 0.15);

    roomGroup.add(indoorUnitGroup);
    indoorUnitRef.current = indoorUnitGroup;
  };

  // Create outdoor unit
  const createOutdoorUnit = (roomGroup, length, height, breadth) => {
    // Create outdoor unit group
    const outdoorUnitGroup = new THREE.Group();

    // Main body
    const outdoorUnitGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.4);
    const outdoorUnitMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.6,
    });
    const outdoorUnit = new THREE.Mesh(
      outdoorUnitGeometry,
      outdoorUnitMaterial
    );
    outdoorUnit.castShadow = true;
    outdoorUnitGroup.add(outdoorUnit);

    // Fan grill
    const grillGeometry = new THREE.CircleGeometry(0.3, 16);
    const grillMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    const grill = new THREE.Mesh(grillGeometry, grillMaterial);
    grill.position.z = 0.21;
    outdoorUnitGroup.add(grill);

    // Fan blades
    const fanGeometry = new THREE.CircleGeometry(0.25, 4);
    const fanMaterial = new THREE.MeshBasicMaterial({
      color: 0x444444,
      side: THREE.DoubleSide,
    });
    const fan = new THREE.Mesh(fanGeometry, fanMaterial);
    fan.position.z = 0.205;

    // Animate fan rotation when simulation is running
    if (isSimulationRunning) {
      fan.rotation.z += (0.1 * hvacParameters.fanSpeed) / 100;
    }

    outdoorUnitGroup.add(fan);

    // Position outside room
    outdoorUnitGroup.position.set(
      -length / 2 - 0.5,
      -height / 2 + 0.6,
      -breadth / 3
    );

    roomGroup.add(outdoorUnitGroup);
    outdoorUnitRef.current = outdoorUnitGroup;
  };

  // Create refrigerant line
  const createRefrigerantLine = (roomGroup, length, height, breadth) => {
    // Create points for the line
    const indoorPos = new THREE.Vector3(
      0,
      height / 2 - 0.5,
      -breadth / 2 + 0.1
    );

    const outdoorPos = new THREE.Vector3(
      -length / 2 - 0.5,
      -height / 2 + 0.6,
      -breadth / 3
    );

    // Add intermediate points for a more realistic path
    const points = [
      indoorPos,
      new THREE.Vector3(indoorPos.x, indoorPos.y, indoorPos.z),
      new THREE.Vector3(indoorPos.x, -height / 2 + 0.1, indoorPos.z),
      new THREE.Vector3(-length / 2 - 0.1, -height / 2 + 0.1, indoorPos.z),
      new THREE.Vector3(-length / 2 - 0.1, -height / 2 + 0.1, outdoorPos.z),
      new THREE.Vector3(-length / 2 - 0.1, outdoorPos.y, outdoorPos.z),
      outdoorPos,
    ];

    // Create tube geometry for refrigerant line
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.02, 8, false);

    // Create material based on cooling/heating mode
    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: roomParameters.mode === "cooling" ? 0x00aaff : 0xff6600,
      metalness: 0.8,
      roughness: 0.2,
      emissive: roomParameters.mode === "cooling" ? 0x0044ff : 0xff2200,
      emissiveIntensity: 0.2,
    });

    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tube.castShadow = true;

    roomGroup.add(tube);
    refrigerantLineRef.current = tube;
  };

  // Animate refrigerant flow
  const animateRefrigerantFlow = () => {
    if (!refrigerantLineRef.current) return;

    // Update refrigerant line color based on mode and power
    const material = refrigerantLineRef.current.material;

    // Pulse the emissive intensity based on power
    const time = performance.now() * 0.001;
    const pulseIntensity = 0.2 + Math.sin(time * hvacParameters.power) * 0.1;

    material.emissiveIntensity = pulseIntensity * (hvacParameters.power / 10);
  };

  // Temperature color helper
  const getTemperatureColor = (temp) => {
    const minTemp = Math.min(
      roomParameters.targetTemp - 5,
      systemStatus?.roomTemperature - 5 || 20
    );
    const maxTemp = Math.max(
      roomParameters.externalTemp + 5,
      systemStatus?.roomTemperature + 5 || 30
    );
    const range = maxTemp - minTemp;

    // Normalize temperature to 0-1 range
    const normalized = Math.max(0, Math.min(1, (temp - minTemp) / range));

    // Create color: blue (cool) to red (hot)
    if (roomParameters.mode === "cooling") {
      // Blue (cold) to red (hot)
      const r = Math.min(255, Math.max(0, Math.floor(normalized * 255)));
      const b = Math.min(255, Math.max(0, Math.floor((1 - normalized) * 255)));
      const g = Math.min(
        255,
        Math.max(
          0,
          Math.floor(
            (normalized < 0.5 ? normalized * 2 : 2 - normalized * 2) * 150
          )
        )
      );
      return new THREE.Color(r / 255, g / 255, b / 255);
    } else {
      // Red (hot) to blue (cold) for heating mode
      const r = Math.min(255, Math.max(0, Math.floor((1 - normalized) * 255)));
      const b = Math.min(255, Math.max(0, Math.floor(normalized * 255)));
      const g = Math.min(
        255,
        Math.max(
          0,
          Math.floor(
            (normalized < 0.5 ? normalized * 2 : 2 - normalized * 2) * 150
          )
        )
      );
      return new THREE.Color(r / 255, g / 255, b / 255);
    }
  };

  // Create heatmap visualization
  const createHeatmap = () => {
    if (!sceneRef.current || !roomRef.current) return;

    // Clear old heatmap
    if (heatmapRef.current.length > 0) {
      heatmapRef.current.forEach((mesh) => {
        if (roomRef.current) roomRef.current.remove(mesh);
      });
      heatmapRef.current = [];
    }

    const { length, breadth, height } = roomParameters;
    const gridSize = 8; // Number of grid cells in each dimension

    const cellSizeX = length / gridSize;
    const cellSizeZ = breadth / gridSize;
    const cellSizeY = height / gridSize;

    // AC unit position (top middle of the room)
    const acX = 0;
    const acY = height / 2 - 0.5;
    const acZ = -breadth / 2 + 0.15;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        for (let k = 0; k < gridSize; k++) {
          const x = (i - gridSize / 2) * cellSizeX + cellSizeX / 2;
          const y = (k - gridSize / 2) * cellSizeY + cellSizeY / 2;
          const z = (j - gridSize / 2) * cellSizeZ + cellSizeZ / 2;

          // Calculate distance from AC unit
          const distFromAC = Math.sqrt(
            Math.pow(x - acX, 2) + Math.pow(y - acY, 2) + Math.pow(z - acZ, 2)
          );

          // Calculate temperature based on distance and system parameters
          const maxDist = Math.sqrt(
            Math.pow(length, 2) + Math.pow(height, 2) + Math.pow(breadth, 2)
          );
          const distFactor = distFromAC / maxDist;

          // Account for air stratification (hot air rises, cold air falls)
          const heightFactor = (y + height / 2) / height; // 0 at floor, 1 at ceiling

          let cellTemp;
          const roomTemp =
            systemStatus?.roomTemperature || roomParameters.currentTemp;
          const targetTemp = roomParameters.targetTemp;
          const fanEffect =
            ((hvacParameters.fanSpeed / 100) * hvacParameters.power) / 5;

          if (roomParameters.mode === "cooling") {
            // In cooling mode, cold air tends to fall
            const stratification = heightFactor * 2; // Higher temperature at ceiling
            cellTemp =
              roomTemp -
              (roomTemp - targetTemp) *
                (1 - Math.pow(distFactor, 1.5)) *
                fanEffect *
                (1.5 - stratification * 0.5); // Less effective at floor
          } else {
            // In heating mode, warm air rises
            const stratification = (1 - heightFactor) * 2; // Higher temperature at ceiling
            cellTemp =
              roomTemp +
              (targetTemp - roomTemp) *
                (1 - Math.pow(distFactor, 1.5)) *
                fanEffect *
                (1.5 - stratification * 0.5); // More effective at ceiling
          }

          // Create heat cell (cube)
          const cellGeometry = new THREE.BoxGeometry(
            cellSizeX * 0.9,
            cellSizeY * 0.9,
            cellSizeZ * 0.9
          );
          const cellMaterial = new THREE.MeshBasicMaterial({
            color: getTemperatureColor(cellTemp),
            transparent: true,
            opacity: 0.1, // More subtle effect
          });

          const cell = new THREE.Mesh(cellGeometry, cellMaterial);
          cell.position.set(x, y, z);
          cell.userData = { temperature: cellTemp };

          roomRef.current.add(cell);
          heatmapRef.current.push(cell);
        }
      }
    }
  };

  // Update heatmap based on current temperature
  useEffect(() => {
    if (heatmapRef.current.length > 0 && systemStatus) {
      heatmapRef.current.forEach((cell) => {
        // Get distance from AC unit to recalculate temperature
        const { length, breadth, height } = roomParameters;
        const acX = 0;
        const acY = height / 2 - 0.5;
        const acZ = -breadth / 2 + 0.15;

        const distFromAC = Math.sqrt(
          Math.pow(cell.position.x - acX, 2) +
            Math.pow(cell.position.y - acY, 2) +
            Math.pow(cell.position.z - acZ, 2)
        );

        const maxDist = Math.sqrt(
          Math.pow(length, 2) + Math.pow(height, 2) + Math.pow(breadth, 2)
        );
        const distFactor = distFromAC / maxDist;

        // Account for air stratification (hot air rises, cold air falls)
        const heightFactor = (cell.position.y + height / 2) / height; // 0 at floor, 1 at ceiling

        let cellTemp;
        const roomTemp = systemStatus.roomTemperature;
        const targetTemp = roomParameters.targetTemp;
        const fanEffect =
          ((hvacParameters.fanSpeed / 100) * hvacParameters.power) / 5;

        if (roomParameters.mode === "cooling") {
          // In cooling mode, cold air tends to fall
          const stratification = heightFactor * 2; // Higher temperature at ceiling
          cellTemp =
            roomTemp -
            (roomTemp - targetTemp) *
              (1 - Math.pow(distFactor, 1.5)) *
              fanEffect *
              (1.5 - stratification * 0.5); // Less effective at floor
        } else {
          // In heating mode, warm air rises
          const stratification = (1 - heightFactor) * 2; // Higher temperature at ceiling
          cellTemp =
            roomTemp +
            (targetTemp - roomTemp) *
              (1 - Math.pow(distFactor, 1.5)) *
              fanEffect *
              (1.5 - stratification * 0.5); // More effective at ceiling
        }

        // Update cell color based on temperature
        if (cell.material) {
          cell.material.color = getTemperatureColor(cellTemp);
          cell.userData.temperature = cellTemp;
        }
      });
    }

    // Update refrigerant line color based on mode
    if (refrigerantLineRef.current) {
      refrigerantLineRef.current.material.color = new THREE.Color(
        roomParameters.mode === "cooling" ? 0x00aaff : 0xff6600
      );
      refrigerantLineRef.current.material.emissive = new THREE.Color(
        roomParameters.mode === "cooling" ? 0x0044ff : 0xff2200
      );
    }
  }, [
    systemStatus?.roomTemperature,
    roomParameters.targetTemp,
    roomParameters.mode,
    hvacParameters.fanSpeed,
    hvacParameters.power,
  ]);

  // Create airflow particles
  // Replace createAirflowParticles with this enhanced version

  const createAirflowParticles = () => {
    if (!sceneRef.current || !roomRef.current) return;

    // Clear old particles
    if (airflowParticlesRef.current.length > 0) {
      airflowParticlesRef.current.forEach((particle) => {
        // Also remove trails if they exist
        if (particle.userData.trail) {
          particle.userData.trail.forEach((trail) => {
            if (roomRef.current) roomRef.current.remove(trail);
          });
        }
        if (roomRef.current) roomRef.current.remove(particle);
      });
      airflowParticlesRef.current = [];
    }

    const { length, breadth, height } = roomParameters;
    const roomSize = Math.min(length, breadth, height);
    const particleSize = roomSize * 0.012; // Larger particles

    // Adjust number of particles based on room size and airflow
    const baseParticles = 20; // Minimum number
    const numParticles =
      baseParticles + Math.floor(hvacParameters.airFlowRate * 30);

    // AC unit position
    const acX = 0;
    const acY = height / 2 - 0.5;
    const acZ = -breadth / 2 + 0.15;

    // Create particle material based on mode with glow effect
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: roomParameters.mode === "cooling" ? 0x00ccff : 0xff8844,
      transparent: true,
      opacity: 0.8,
      emissive: roomParameters.mode === "cooling" ? 0x0088ff : 0xff6622,
      emissiveIntensity: 0.5,
    });

    // Group for all particles
    const particleGroup = new THREE.Group();
    roomRef.current.add(particleGroup);

    // Generate particles
    for (let i = 0; i < numParticles; i++) {
      const particleGeometry = new THREE.SphereGeometry(particleSize, 8, 8);
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);

      // Start position (at AC unit with some randomization)
      particle.position.set(
        acX + (Math.random() - 0.5) * 0.8,
        acY - 0.2,
        acZ + 0.2
      );

      // Set velocity based on fan direction (angled downward)
      const angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25; // -45° to +45°
      // Ensure minimum speed
      const speed =
        (0.02 + Math.random() * 0.03) *
        (Math.max(10, hvacParameters.fanSpeed) / 100);

      // Store velocity as a property on the particle
      particle.userData = {
        velocity: new THREE.Vector3(
          Math.sin(angle) * speed,
          -Math.cos(angle * 0.5) * speed, // Downward angle
          Math.cos(angle) * speed
        ),
        // Life tracking for particles
        life: 0,
        maxLife: 100 + Math.random() * 100,
        // Original starting position
        origin: new THREE.Vector3(
          acX + (Math.random() - 0.5) * 0.8,
          acY - 0.2,
          acZ + 0.2
        ),
        // Temperature carried by this particle
        temperature:
          roomParameters.mode === "cooling"
            ? roomParameters.targetTemp - 2
            : roomParameters.targetTemp + 2,
      };

      // Add trail for better visibility
      const trailLength = 5;
      particle.userData.trail = [];

      // Use different colors for first and last trail parts
      const startColor =
        roomParameters.mode === "cooling" ? 0x88ccff : 0xffaa66;
      const endColor = roomParameters.mode === "cooling" ? 0x0055bb : 0xbb4400;

      for (let t = 0; t < trailLength; t++) {
        // Interpolate color between start and end
        const ratio = t / (trailLength - 1);
        const r =
          (1 - ratio) * ((startColor >> 16) & 0xff) +
          ratio * ((endColor >> 16) & 0xff);
        const g =
          (1 - ratio) * ((startColor >> 8) & 0xff) +
          ratio * ((endColor >> 8) & 0xff);
        const b = (1 - ratio) * (startColor & 0xff) + ratio * (endColor & 0xff);
        const color =
          (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

        const trailGeometry = new THREE.SphereGeometry(
          particleSize * (0.8 - t * 0.15), // More aggressive size reduction
          4,
          4
        );
        const trailMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.5 - t * 0.08,
        });
        const trailPart = new THREE.Mesh(trailGeometry, trailMaterial);
        trailPart.position.copy(particle.position);
        particleGroup.add(trailPart);
        particle.userData.trail.push(trailPart);
      }

      particleGroup.add(particle);
      airflowParticlesRef.current.push(particle);
    }

    console.log(`Created ${numParticles} airflow particles`);
  };

  // Update airflow particles
  const updateAirflowParticles = () => {
    if (!roomRef.current) return;

    const { length, breadth, height } = roomParameters;
    const halfLength = length / 2;
    const halfBreadth = breadth / 2;
    const halfHeight = height / 2;

    airflowParticlesRef.current.forEach((particle) => {
      // Apply gravity/buoyancy based on mode
      if (roomParameters.mode === "cooling") {
        // Cold air falls
        particle.userData.velocity.y -= 0.0002;
      } else {
        // Warm air rises
        particle.userData.velocity.y += 0.0002;
      }

      // Update position based on velocity
      particle.position.x += particle.userData.velocity.x;
      particle.position.y += particle.userData.velocity.y;
      particle.position.z += particle.userData.velocity.z;

      // Increment life
      particle.userData.life += 1;

      // Apply drag (air resistance)
      particle.userData.velocity.multiplyScalar(0.99);

      // Fade out as life increases
      if (particle.material) {
        particle.material.opacity =
          0.8 * (1 - particle.userData.life / particle.userData.maxLife);
      }

      // Update trail positions
      if (particle.userData.trail) {
        for (let t = particle.userData.trail.length - 1; t >= 0; t--) {
          if (t === 0) {
            particle.userData.trail[t].position.copy(particle.position);
          } else {
            particle.userData.trail[t].position.copy(
              particle.userData.trail[t - 1].position
            );
          }

          // Update trail opacity based on particle life
          if (particle.userData.trail[t].material) {
            const baseOpacity = 0.5 - t * 0.08;
            particle.userData.trail[t].material.opacity =
              baseOpacity *
              (1 - particle.userData.life / particle.userData.maxLife);
          }
        }
      }

      // Bounce off walls with some energy loss
      const bounceFactor = 0.7;

      // X bounds
      if (
        particle.position.x > halfLength &&
        particle.userData.velocity.x > 0
      ) {
        particle.position.x = halfLength;
        particle.userData.velocity.x =
          -particle.userData.velocity.x * bounceFactor;
      } else if (
        particle.position.x < -halfLength &&
        particle.userData.velocity.x < 0
      ) {
        particle.position.x = -halfLength;
        particle.userData.velocity.x =
          -particle.userData.velocity.x * bounceFactor;
      }

      // Y bounds
      if (
        particle.position.y > halfHeight &&
        particle.userData.velocity.y > 0
      ) {
        particle.position.y = halfHeight;
        particle.userData.velocity.y =
          -particle.userData.velocity.y * bounceFactor;
      } else if (
        particle.position.y < -halfHeight &&
        particle.userData.velocity.y < 0
      ) {
        particle.position.y = -halfHeight;
        particle.userData.velocity.y =
          -particle.userData.velocity.y * bounceFactor;
      }

      // Z bounds
      if (
        particle.position.z > halfBreadth &&
        particle.userData.velocity.z > 0
      ) {
        particle.position.z = halfBreadth;
        particle.userData.velocity.z =
          -particle.userData.velocity.z * bounceFactor;
      } else if (
        particle.position.z < -halfBreadth &&
        particle.userData.velocity.z < 0
      ) {
        particle.position.z = -halfBreadth;
        particle.userData.velocity.z =
          -particle.userData.velocity.z * bounceFactor;
      }

      // Reset particle if reached max life or almost stationary
      const speedSquared = particle.userData.velocity.lengthSq();

      if (
        particle.userData.life > particle.userData.maxLife ||
        speedSquared < 0.00001
      ) {
        // Reset position to origin
        particle.position.copy(particle.userData.origin);

        // Set new velocity based on fan direction (angled downward)
        const angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25; // -45° to +45°
        const speed =
          (0.02 + Math.random() * 0.03) * (hvacParameters.fanSpeed / 100);

        particle.userData.velocity = new THREE.Vector3(
          Math.sin(angle) * speed,
          -Math.cos(angle * 0.5) * speed,
          Math.cos(angle) * speed
        );

        // Reset life
        particle.userData.life = 0;

        // Reset opacity
        if (particle.material) {
          particle.material.opacity = 0.6;
        }
      }
    });
  };

  // Update airflow when parameters change
  useEffect(() => {
    if (isSimulationRunning && airflowParticlesRef.current.length > 0) {
      // Update particle colors based on mode
      airflowParticlesRef.current.forEach((particle) => {
        if (particle.material) {
          particle.material.color = new THREE.Color(
            roomParameters.mode === "cooling" ? 0x88ccff : 0xffaa66
          );
        }
      });
    }

    // Recreate particles if air flow rate changes significantly
    if (
      Math.abs(
        airflowParticlesRef.current.length - hvacParameters.airFlowRate * 50
      ) > 10
    ) {
      createAirflowParticles();
    }
  }, [
    hvacParameters.fanSpeed,
    hvacParameters.airFlowRate,
    roomParameters.mode,
    isSimulationRunning,
  ]);

  return (
    <Box position="relative" width="100%" height="500px">
      <Box ref={mountRef} width="100%" height="100%" />

      {/* Status Overlay */}
      <Box
        position="absolute"
        top={16}
        left={16}
        bgcolor="rgba(255,255,255,0.75)"
        p={2}
        borderRadius={1}
        boxShadow={1}
        zIndex={10}
      >
        <Typography variant="h6" fontWeight="bold">
          {systemStatus?.roomTemperature?.toFixed(1) || "25.0"}°C
        </Typography>
        <Typography variant="body2">
          Target: {roomParameters.targetTemp.toFixed(1)}°C
        </Typography>
        <Typography variant="body2">
          Mode: {roomParameters.mode === "cooling" ? "Cooling" : "Heating"}
        </Typography>
        <Typography variant="body2">Fan: {hvacParameters.fanSpeed}%</Typography>
      </Box>

      {/* Temperature Color Legend */}
      <Box
        position="absolute"
        bottom={16}
        right={16}
        bgcolor="rgba(255,255,255,0.75)"
        p={2}
        borderRadius={1}
        boxShadow={1}
        zIndex={10}
      >
        <Typography variant="body2" fontWeight="bold" mb={1}>
          Temperature
        </Typography>
        <Box
          sx={{
            width: "100%",
            height: "16px",
            background:
              roomParameters.mode === "cooling"
                ? "linear-gradient(to right, #0066ff, #66ff66, #ff6666)"
                : "linear-gradient(to right, #ff6666, #66ff66, #0066ff)",
            borderRadius: 1,
          }}
        />
        <Box display="flex" justifyContent="space-between">
          <Typography variant="caption">
            {roomParameters.mode === "cooling"
              ? (roomParameters.targetTemp - 5).toFixed(1)
              : (roomParameters.targetTemp + 5).toFixed(1)}
            °C
          </Typography>
          <Typography variant="caption">
            {roomParameters.mode === "cooling"
              ? (roomParameters.externalTemp + 5).toFixed(1)
              : (roomParameters.externalTemp - 5).toFixed(1)}
            °C
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default SplitSystemModel;
