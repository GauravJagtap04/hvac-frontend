import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const VRFSystemModel = ({
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
  const indoorUnitsRef = useRef([]);
  const refrigerantLinesRef = useRef([]);
  const zonesRef = useRef({});

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 10, z: 15 });
  const [zoneColors, setZoneColors] = useState({});

  useEffect(() => {
    // Function to update background based on theme
    const updateSceneBackground = () => {
      if (!sceneRef.current) return;

      const root = document.getElementById("root");
      const isDarkMode = root && root.classList.contains("dark");

      // Use hex color value instead of OKLCH
      sceneRef.current.background = new THREE.Color(
        isDarkMode ? "#0a0a0a" : "white"
      );
    };

    // Set up MutationObserver to detect theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          updateSceneBackground();
        }
      });
    });

    const root = document.getElementById("root");

    // Only observe if root exists
    if (root) {
      // Start observing the document element for class changes
      observer.observe(root, { attributes: true });
    }

    // Initial background update
    updateSceneBackground();

    // Clean up observer on component unmount
    return () => observer.disconnect();
  }, []);

  // Initialize the scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Create scene
    const scene = new THREE.Scene();

    // Check if root element has dark class and set background accordingly
    const root = document.getElementById("root");
    const isDarkMode = root && root.classList.contains("dark");

    // Use hex color value instead of OKLCH
    scene.background = new THREE.Color(isDarkMode ? "#0a0a0a" : "white");
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
      if (isSimulationRunning && refrigerantLinesRef.current.length > 0) {
        refrigerantLinesRef.current.forEach((line) => {
          if (line) animateRefrigerantFlow(line);
        });
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

  // Generate unique colors for each zone
  useEffect(() => {
    if (!hvacParameters?.zones) return;

    const zones = Object.keys(hvacParameters.zones);
    const colors = {};

    zones.forEach((zone, index) => {
      // Generate distinct colors using HSL for better separation
      const hue = (index * 137.5) % 360; // Golden angle approximation for good distribution
      colors[zone] = new THREE.Color(`hsl(${hue}, 70%, 60%)`);
    });

    setZoneColors(colors);
  }, [hvacParameters?.zones]);

  // Create or update room and zones
  useEffect(() => {
    if (!sceneRef.current || !hvacParameters?.zones) return;

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

    // Add zones visualization
    createZones(roomGroup, length, breadth, height);

    // Add outdoor unit
    createOutdoorUnit(roomGroup, length, height, breadth);

    // Add indoor units based on zones
    createIndoorUnits(roomGroup, length, height, breadth);

    // Add refrigerant lines connecting units
    createRefrigerantLines(roomGroup, length, height, breadth);

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
  }, [
    roomParameters.length,
    roomParameters.breadth,
    roomParameters.height,
    hvacParameters.zones,
  ]);

  // Create zone visualization
  const createZones = (roomGroup, length, breadth, height) => {
    if (!hvacParameters.zones) return;

    const zones = Object.keys(hvacParameters.zones);
    const zoneRefs = {};

    // Calculate total demand
    const totalDemand =
      Object.values(hvacParameters.zones).reduce((sum, val) => sum + val, 0) ||
      1;

    // Remove old zones if they exist
    if (Object.keys(zonesRef.current).length > 0) {
      Object.values(zonesRef.current).forEach((zone) => {
        if (roomGroup.children.includes(zone)) {
          roomGroup.remove(zone);
        }
      });
    }

    let offsetX = -length / 2;

    zones.forEach((zoneName, index) => {
      const zoneDemand = hvacParameters.zones[zoneName] || 0;
      const zoneWidth = (zoneDemand / totalDemand) * length;
      if (zoneWidth <= 0) return;

      const zoneGroup = new THREE.Group();

      // Zone floor with unique color
      const zoneFloorGeometry = new THREE.PlaneGeometry(zoneWidth, breadth);
      const zoneColor = zoneColors[zoneName] || new THREE.Color(0xcccccc);

      const zoneFloorMaterial = new THREE.MeshStandardMaterial({
        color: zoneColor,
        transparent: true,
        opacity: 0.3,
        roughness: 0.5,
      });

      const zoneFloor = new THREE.Mesh(zoneFloorGeometry, zoneFloorMaterial);
      zoneFloor.rotation.x = -Math.PI / 2;
      zoneFloor.position.y = -height / 2 + 0.01; // Slightly above the room floor
      zoneFloor.position.x = offsetX + zoneWidth / 2;
      zoneFloor.receiveShadow = true;
      zoneGroup.add(zoneFloor);

      // Zone label
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = 200;
      canvas.height = 100;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = "Bold 40px Arial";
      context.fillStyle = zoneColor.getHexString();
      context.textAlign = "center";
      context.fillText(zoneName, canvas.width / 2, canvas.height / 2 + 15);

      const labelTexture = new THREE.CanvasTexture(canvas);
      labelTexture.needsUpdate = true;

      const labelMaterial = new THREE.MeshBasicMaterial({
        map: labelTexture,
        transparent: true,
      });

      const labelGeometry = new THREE.PlaneGeometry(2, 1);
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      label.position.y = -height / 2 + 0.1;
      label.position.x = offsetX + zoneWidth / 2;
      label.position.z = 0;
      label.rotation.x = -Math.PI / 2;
      zoneGroup.add(label);

      roomGroup.add(zoneGroup);
      zoneRefs[zoneName] = zoneGroup;

      offsetX += zoneWidth;
    });

    zonesRef.current = zoneRefs;
  };

  // Create indoor units based on zones
  const createIndoorUnits = (roomGroup, length, breadth, height) => {
    if (!hvacParameters.zones) return;

    // Clear previous indoor units
    indoorUnitsRef.current.forEach((unit) => {
      if (unit && roomGroup.children.includes(unit)) {
        roomGroup.remove(unit);
      }
    });
    indoorUnitsRef.current = [];

    const zones = Object.keys(hvacParameters.zones);
    const zoneCount = zones.length;

    // Use a more robust positioning strategy
    const positionUnits = () => {
      // If we have 4 or fewer zones, we can use one unit per wall
      if (zoneCount <= 4) {
        return [
          // Back wall units (up to two)
          ...(zoneCount >= 1
            ? [
                {
                  x: -length / 4,
                  y: height / 2 - 0.5,
                  z: -breadth / 2 + 0.15,
                  rotation: 0,
                },
              ]
            : []),
          ...(zoneCount >= 2
            ? [
                {
                  x: length / 4,
                  y: height / 2 - 0.5,
                  z: -breadth / 2 + 0.15,
                  rotation: 0,
                },
              ]
            : []),
          // Side wall units (if we have 3-4 zones)
          ...(zoneCount >= 3
            ? [
                {
                  x: -length / 2 + 0.15,
                  y: height / 2 - 0.5,
                  z: 0,
                  rotation: Math.PI / 2,
                },
              ]
            : []),
          ...(zoneCount >= 4
            ? [
                {
                  x: length / 2 - 0.15,
                  y: height / 2 - 0.5,
                  z: 0,
                  rotation: -Math.PI / 2,
                },
              ]
            : []),
        ];
      }
      // For 5+ zones, distribute units along back wall and side walls
      else {
        const positions = [];

        // Calculate how many units to place on each wall
        const backWallCapacity = Math.ceil(zoneCount / 3);
        const leftWallCapacity = Math.floor(zoneCount / 3);
        const rightWallCapacity =
          zoneCount - backWallCapacity - leftWallCapacity;

        // Place units on back wall
        for (let i = 0; i < backWallCapacity; i++) {
          positions.push({
            x: -length / 2 + (length * (i + 0.5)) / backWallCapacity,
            y: height / 2 - 0.5,
            z: -breadth / 2 + 0.15,
            rotation: 0,
          });
        }

        // Place units on left wall
        for (let i = 0; i < leftWallCapacity; i++) {
          positions.push({
            x: -length / 2 + 0.15,
            y: height / 2 - 0.5,
            z: -breadth / 2 + (breadth * (i + 0.5)) / leftWallCapacity,
            rotation: Math.PI / 2,
          });
        }

        // Place units on right wall
        for (let i = 0; i < rightWallCapacity; i++) {
          positions.push({
            x: length / 2 - 0.15,
            y: height / 2 - 0.5,
            z: -breadth / 2 + (breadth * (i + 0.5)) / rightWallCapacity,
            rotation: -Math.PI / 2,
          });
        }

        return positions;
      }
    };

    // Get optimized positions based on zone count
    const unitPositions = positionUnits();

    // Create units at calculated positions
    zones.forEach((zoneName, index) => {
      const zoneDemand = hvacParameters.zones[zoneName] || 0;
      if (zoneDemand <= 0) return;

      // Get position for this unit (wrap around if we have more zones than positions)
      const position = unitPositions[index % unitPositions.length];

      // Create indoor unit group
      const indoorUnitGroup = new THREE.Group();

      // Calculate size based on zone demand
      const unitWidth = Math.min(Math.max(zoneDemand * 0.3, 0.8), 1.5);

      // Main body
      const indoorUnitGeometry = new THREE.BoxGeometry(unitWidth, 0.3, 0.25);
      const indoorUnitMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
      });
      const indoorUnit = new THREE.Mesh(indoorUnitGeometry, indoorUnitMaterial);
      indoorUnit.castShadow = true;
      indoorUnitGroup.add(indoorUnit);

      // Vents
      const ventGeometry = new THREE.BoxGeometry(unitWidth * 0.8, 0.05, 0.15);
      const ventMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
      const vent = new THREE.Mesh(ventGeometry, ventMaterial);
      vent.position.y = -0.1;
      vent.position.z = 0.05;
      vent.rotation.x = -Math.PI / 6; // Angled down
      indoorUnitGroup.add(vent);

      // Display panel with zone color
      const zoneColor = zoneColors[zoneName] || new THREE.Color(0x00ff00);
      const displayGeometry = new THREE.PlaneGeometry(unitWidth * 0.25, 0.1);
      const displayMaterial = new THREE.MeshBasicMaterial({
        color: isSimulationRunning ? zoneColor : 0x333333,
      });
      const display = new THREE.Mesh(displayGeometry, displayMaterial);
      display.position.z = 0.13;
      display.position.x = unitWidth * 0.3;
      indoorUnitGroup.add(display);

      // Add zone name label to the unit for better identification
      const labelCanvas = document.createElement("canvas");
      const context = labelCanvas.getContext("2d");
      labelCanvas.width = 128;
      labelCanvas.height = 64;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
      context.font = "Bold 24px Arial";
      context.fillStyle = "#" + zoneColor.getHexString();
      context.textAlign = "center";
      context.fillText(
        zoneName,
        labelCanvas.width / 2,
        labelCanvas.height / 2 + 8
      );

      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const labelMaterial = new THREE.MeshBasicMaterial({
        map: labelTexture,
        transparent: true,
        opacity: 0.9,
      });
      const labelMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.25),
        labelMaterial
      );
      labelMesh.position.y = -0.25;
      labelMesh.position.z = 0.13;
      indoorUnitGroup.add(labelMesh);

      // Apply position and rotation
      indoorUnitGroup.position.set(position.x, position.y, position.z);
      indoorUnitGroup.rotation.y = position.rotation;

      roomGroup.add(indoorUnitGroup);
      indoorUnitsRef.current.push(indoorUnitGroup);
    });
  };

  // Create outdoor unit
  const createOutdoorUnit = (roomGroup, length, height, breadth) => {
    // Create outdoor unit group
    const outdoorUnitGroup = new THREE.Group();

    // Calculate size based on system capacity
    const unitSize = 0.5 + (hvacParameters.maxCapacityKw / 14) * 0.5;

    // Main body
    const outdoorUnitGeometry = new THREE.BoxGeometry(
      unitSize * 1.6,
      unitSize,
      unitSize * 0.8
    );
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
    const grillGeometry = new THREE.CircleGeometry(unitSize * 0.4, 16);
    const grillMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    const grill = new THREE.Mesh(grillGeometry, grillMaterial);
    grill.position.z = unitSize * 0.41;
    outdoorUnitGroup.add(grill);

    // Fan blades
    const fanGeometry = new THREE.CircleGeometry(unitSize * 0.35, 4);
    const fanMaterial = new THREE.MeshBasicMaterial({
      color: 0x444444,
      side: THREE.DoubleSide,
    });
    const fan = new THREE.Mesh(fanGeometry, fanMaterial);
    fan.position.z = unitSize * 0.405;
    fan.userData = { speed: 0, rotationZ: 0 };

    // Set up fan animation
    if (isSimulationRunning) {
      fan.userData.speed = (hvacParameters.fanSpeed / 100) * 0.1;
    }

    outdoorUnitGroup.add(fan);

    // VRF controller box
    const controllerGeometry = new THREE.BoxGeometry(
      unitSize * 0.6,
      unitSize * 0.6,
      unitSize * 0.3
    );
    const controllerMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.4,
    });
    const controller = new THREE.Mesh(controllerGeometry, controllerMaterial);
    controller.position.x = unitSize * 1.2;
    controller.position.y = 0;
    controller.position.z = 0;
    outdoorUnitGroup.add(controller);

    // LED indicators on controller
    const ledGeometry = new THREE.CircleGeometry(0.03, 8);
    const ledOnMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const ledOffMaterial = new THREE.MeshBasicMaterial({ color: 0x660000 });

    const powerLed = new THREE.Mesh(
      ledGeometry,
      isSimulationRunning ? ledOnMaterial : ledOffMaterial
    );
    powerLed.position.set(unitSize * 1.2, unitSize * 0.15, unitSize * 0.16);
    outdoorUnitGroup.add(powerLed);

    const statusLed = new THREE.Mesh(
      ledGeometry,
      isSimulationRunning ? ledOnMaterial : ledOffMaterial
    );
    statusLed.position.set(unitSize * 1.2, 0, unitSize * 0.16);
    outdoorUnitGroup.add(statusLed);

    const errorLed = new THREE.Mesh(ledGeometry, ledOffMaterial);
    errorLed.position.set(unitSize * 1.2, -unitSize * 0.15, unitSize * 0.16);
    outdoorUnitGroup.add(errorLed);

    // Position outside room
    outdoorUnitGroup.position.set(
      -length / 2 - unitSize * 0.8,
      -height / 2 + unitSize * 0.75,
      -breadth / 3
    );

    roomGroup.add(outdoorUnitGroup);
    outdoorUnitRef.current = outdoorUnitGroup;
  };

  // Create refrigerant lines connecting all units
  const createRefrigerantLines = (roomGroup, length, height, breadth) => {
    if (!hvacParameters.zones || !indoorUnitsRef.current.length) return;

    // Clear previous refrigerant lines
    refrigerantLinesRef.current.forEach((line) => {
      if (line && roomGroup.children.includes(line)) {
        roomGroup.remove(line);
      }
    });
    refrigerantLinesRef.current = [];

    // Get outdoor unit position
    const outdoorPos = new THREE.Vector3(
      -length / 2 - 0.5,
      -height / 2 + 0.6,
      -breadth / 3
    );

    // Create distribution network points - main junction at center of ceiling
    const mainJunction = new THREE.Vector3(0, height / 2 - 0.1, 0);

    // Secondary junctions for different walls
    const backWallJunction = new THREE.Vector3(
      0,
      height / 2 - 0.1,
      -breadth / 2 + 0.2
    );
    const leftWallJunction = new THREE.Vector3(
      -length / 2 + 0.2,
      height / 2 - 0.1,
      0
    );
    const rightWallJunction = new THREE.Vector3(
      length / 2 - 0.2,
      height / 2 - 0.1,
      0
    );

    // Points for main trunk from outdoor unit to main junction
    const mainTrunkPoints = [
      outdoorPos,
      new THREE.Vector3(outdoorPos.x, outdoorPos.y, -breadth / 3),
      new THREE.Vector3(outdoorPos.x, height / 2 - 0.1, -breadth / 3),
      new THREE.Vector3(0, height / 2 - 0.1, -breadth / 3),
      mainJunction,
    ];

    // Create tube geometry for main trunk
    const mainTrunkCurve = new THREE.CatmullRomCurve3(mainTrunkPoints);
    const mainTrunkGeometry = new THREE.TubeGeometry(
      mainTrunkCurve,
      64,
      0.03,
      8,
      false
    );

    // Create material based on cooling/heating mode
    const mainTrunkMaterial = new THREE.MeshStandardMaterial({
      color: roomParameters.mode === "cooling" ? 0x00aaff : 0xff6600,
      metalness: 0.8,
      roughness: 0.2,
      emissive: roomParameters.mode === "cooling" ? 0x0044ff : 0xff2200,
      emissiveIntensity: isSimulationRunning ? 0.3 : 0.1,
    });

    const mainTrunk = new THREE.Mesh(mainTrunkGeometry, mainTrunkMaterial);
    mainTrunk.castShadow = true;
    roomGroup.add(mainTrunk);
    refrigerantLinesRef.current.push(mainTrunk);

    // Create secondary distribution lines to wall junctions
    const createDistributionLine = (startPoint, endPoint) => {
      const points = [startPoint, endPoint];
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, 32, 0.025, 8, false);
      const line = new THREE.Mesh(geometry, mainTrunkMaterial.clone());
      line.castShadow = true;
      roomGroup.add(line);
      refrigerantLinesRef.current.push(line);
    };

    // Create secondary distribution lines
    createDistributionLine(mainJunction, backWallJunction);
    createDistributionLine(mainJunction, leftWallJunction);
    createDistributionLine(mainJunction, rightWallJunction);

    // Create branch lines to each indoor unit
    indoorUnitsRef.current.forEach((indoorUnit, index) => {
      if (!indoorUnit) return;

      const indoorPos = indoorUnit.position.clone();

      // Determine which junction to connect to based on unit position
      let nearestJunction;

      // Check if unit is on back wall
      if (Math.abs(indoorPos.z + breadth / 2) < 0.3) {
        nearestJunction = backWallJunction;
      }
      // Check if unit is on left wall
      else if (Math.abs(indoorPos.x + length / 2) < 0.3) {
        nearestJunction = leftWallJunction;
      }
      // Check if unit is on right wall
      else if (Math.abs(indoorPos.x - length / 2) < 0.3) {
        nearestJunction = rightWallJunction;
      }
      // Default to main junction
      else {
        nearestJunction = mainJunction;
      }

      // Create branch line points with intermediate point for better routing
      const midPoint = new THREE.Vector3(
        indoorPos.x,
        height / 2 - 0.1,
        indoorPos.z
      );

      const branchPoints = [
        nearestJunction.clone(),
        midPoint,
        indoorPos.clone(),
      ];

      // Create tube geometry for branch
      const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
      const branchGeometry = new THREE.TubeGeometry(
        branchCurve,
        32,
        0.02,
        8,
        false
      );

      const branchLine = new THREE.Mesh(
        branchGeometry,
        mainTrunkMaterial.clone()
      );
      branchLine.castShadow = true;
      roomGroup.add(branchLine);
      refrigerantLinesRef.current.push(branchLine);
    });
  };

  // Animate refrigerant flow
  const animateRefrigerantFlow = (refrigerantLine) => {
    if (!refrigerantLine) return;

    // Update refrigerant line color based on mode and power
    const material = refrigerantLine.material;

    // Pulse the emissive intensity based on power
    const time = performance.now() * 0.001;
    const pulseIntensity =
      0.2 + Math.sin(time * hvacParameters.maxCapacityKw) * 0.1;

    material.emissiveIntensity =
      pulseIntensity * (hvacParameters.fanSpeed / 100);
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

    // Adjust grid size based on room dimensions for better performance
    const roomVolume = length * breadth * height;
    const gridSize = Math.max(
      4,
      Math.min(8, Math.floor(Math.pow(roomVolume, 1 / 3) * 0.8))
    );

    const cellSizeX = length / gridSize;
    const cellSizeZ = breadth / gridSize;
    const cellSizeY = height / gridSize;

    // Map of indoor unit positions for temperature calculation
    const indoorUnitPositions = indoorUnitsRef.current
      .map((unit) => {
        return unit ? unit.position.clone() : null;
      })
      .filter((pos) => pos !== null);

    // If no indoor units are defined yet, use a default position
    if (indoorUnitPositions.length === 0) {
      indoorUnitPositions.push(
        new THREE.Vector3(0, height / 2 - 0.5, -breadth / 2 + 0.15)
      );
    }

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        for (let k = 0; k < gridSize; k++) {
          const x = (i - gridSize / 2) * cellSizeX + cellSizeX / 2;
          const y = (k - gridSize / 2) * cellSizeY + cellSizeY / 2;
          const z = (j - gridSize / 2) * cellSizeZ + cellSizeZ / 2;

          // Find the closest indoor unit for this cell
          let minDist = Infinity;
          let closestUnitIndex = 0;

          indoorUnitPositions.forEach((unitPos, index) => {
            const dist = Math.sqrt(
              Math.pow(x - unitPos.x, 2) +
                Math.pow(y - unitPos.y, 2) +
                Math.pow(z - unitPos.z, 2)
            );
            if (dist < minDist) {
              minDist = dist;
              closestUnitIndex = index;
            }
          });

          const unitPos = indoorUnitPositions[closestUnitIndex];

          // Calculate distance from closest AC unit
          const distFromAC = Math.sqrt(
            Math.pow(x - unitPos.x, 2) +
              Math.pow(y - unitPos.y, 2) +
              Math.pow(z - unitPos.z, 2)
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
            ((hvacParameters.fanSpeed / 100) * hvacParameters.maxCapacityKw) /
            5;

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

          // Scale opacity based on temperature difference for better visualization
          const tempDiff = Math.abs(cellTemp - roomTemp);
          const maxTempDiff = Math.abs(targetTemp - roomTemp);
          const opacityFactor = Math.min(1, tempDiff / (maxTempDiff || 1));

          const cellMaterial = new THREE.MeshBasicMaterial({
            color: getTemperatureColor(cellTemp),
            transparent: true,
            opacity: 0.05 + opacityFactor * 0.15, // More visible where temperature differs more
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
        // Get cell position
        const cellPos = cell.position.clone();
        const { length, breadth, height } = roomParameters;

        // Map of indoor unit positions for temperature calculation
        const indoorUnitPositions = indoorUnitsRef.current
          .map((unit) => {
            return unit ? unit.position.clone() : null;
          })
          .filter((pos) => pos !== null);

        // If no indoor units are defined yet, use a default position
        if (indoorUnitPositions.length === 0) {
          indoorUnitPositions.push(
            new THREE.Vector3(0, height / 2 - 0.5, -breadth / 2 + 0.15)
          );
        }

        // Find the closest indoor unit for this cell
        let minDist = Infinity;
        let closestUnitIndex = 0;

        indoorUnitPositions.forEach((unitPos, index) => {
          const dist = Math.sqrt(
            Math.pow(cellPos.x - unitPos.x, 2) +
              Math.pow(cellPos.y - unitPos.y, 2) +
              Math.pow(cellPos.z - unitPos.z, 2)
          );
          if (dist < minDist) {
            minDist = dist;
            closestUnitIndex = index;
          }
        });

        const unitPos = indoorUnitPositions[closestUnitIndex];

        // Calculate distance from closest AC unit
        const distFromAC = Math.sqrt(
          Math.pow(cellPos.x - unitPos.x, 2) +
            Math.pow(cellPos.y - unitPos.y, 2) +
            Math.pow(cellPos.z - unitPos.z, 2)
        );

        const maxDist = Math.sqrt(
          Math.pow(length, 2) + Math.pow(height, 2) + Math.pow(breadth, 2)
        );
        const distFactor = distFromAC / maxDist;

        // Account for air stratification (hot air rises, cold air falls)
        const heightFactor = (cellPos.y + height / 2) / height; // 0 at floor, 1 at ceiling

        let cellTemp;
        const roomTemp = systemStatus.roomTemperature;
        const targetTemp = roomParameters.targetTemp;
        const fanEffect =
          ((hvacParameters.fanSpeed / 100) * hvacParameters.maxCapacityKw) / 5;

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

        // Scale opacity based on temperature difference
        const tempDiff = Math.abs(cellTemp - roomTemp);
        const maxTempDiff = Math.abs(targetTemp - roomTemp);
        const opacityFactor = Math.min(1, tempDiff / (maxTempDiff || 1));

        // Update cell color based on temperature
        if (cell.material) {
          cell.material.color = getTemperatureColor(cellTemp);
          cell.material.opacity = 0.05 + opacityFactor * 0.15;
          cell.userData.temperature = cellTemp;
        }
      });
    }

    // Update refrigerant line color based on mode
    refrigerantLinesRef.current.forEach((line) => {
      if (line) {
        line.material.color = new THREE.Color(
          roomParameters.mode === "cooling" ? 0x00aaff : 0xff6600
        );
        line.material.emissive = new THREE.Color(
          roomParameters.mode === "cooling" ? 0x0044ff : 0xff2200
        );
      }
    });

    // Update fan rotation in outdoor unit
    if (outdoorUnitRef.current && isSimulationRunning) {
      const fan = outdoorUnitRef.current.children.find(
        (child) => child.geometry && child.geometry.type === "CircleGeometry"
      );
      if (fan) {
        fan.rotation.z += (0.1 * hvacParameters.fanSpeed) / 100;
      }
    }
  }, [
    systemStatus?.roomTemperature,
    roomParameters.targetTemp,
    roomParameters.mode,
    hvacParameters.fanSpeed,
    isSimulationRunning,
  ]);

  // Create airflow particles for each indoor unit
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

    // Only create particles if we have indoor units
    if (!indoorUnitsRef.current || indoorUnitsRef.current.length === 0) return;

    // Create particles for each indoor unit
    indoorUnitsRef.current.forEach((indoorUnit, unitIndex) => {
      if (!indoorUnit) return;

      // Get zone name for this unit based on index
      const zoneNames = Object.keys(hvacParameters.zones || {});
      const zoneName =
        zoneNames[unitIndex % zoneNames.length] || `Zone ${unitIndex + 1}`;
      const zoneDemand = hvacParameters.zones?.[zoneName] || 1;

      // Adjust number of particles based on zone demand and airflow
      const baseParticles = 5; // Minimum number per unit
      const numParticles =
        baseParticles + Math.floor(zoneDemand * hvacParameters.airFlowRate * 5);

      // Indoor unit position and rotation
      const unitPos = indoorUnit.position.clone();
      const unitRotation = indoorUnit.rotation.y || 0;

      // Get zone color or use default
      const zoneColor =
        zoneColors[zoneName] ||
        (roomParameters.mode === "cooling" ? 0x00ccff : 0xff8844);

      // Create particle material based on mode and zone
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: zoneColor,
        transparent: true,
        opacity: 0.8,
      });

      // Group for this unit's particles
      const particleGroup = new THREE.Group();
      roomRef.current.add(particleGroup);

      // Generate particles for this unit
      for (let i = 0; i < numParticles; i++) {
        const particleGeometry = new THREE.SphereGeometry(particleSize, 8, 8);
        const particle = new THREE.Mesh(
          particleGeometry,
          particleMaterial.clone()
        );

        // Determine emission direction based on unit rotation
        let emitX = 0,
          emitY = -0.2,
          emitZ = 0.2;

        // Apply rotation to emission vector
        if (Math.abs(unitRotation) < 0.1) {
          // Back wall unit (facing forward)
          emitX = (Math.random() - 0.5) * 0.5;
          emitZ = 0.2;
        } else if (Math.abs(unitRotation - Math.PI / 2) < 0.1) {
          // Left wall unit (facing right)
          emitX = 0.2;
          emitZ = (Math.random() - 0.5) * 0.5;
        } else if (Math.abs(unitRotation + Math.PI / 2) < 0.1) {
          // Right wall unit (facing left)
          emitX = -0.2;
          emitZ = (Math.random() - 0.5) * 0.5;
        }

        // Start position at this indoor unit with rotation-appropriate offset
        particle.position.set(
          unitPos.x + emitX,
          unitPos.y + emitY,
          unitPos.z + emitZ
        );

        // Set velocity based on fan direction and unit orientation
        let velocityX = 0,
          velocityY = 0,
          velocityZ = 0;
        const speed =
          (0.02 + Math.random() * 0.03) *
          (Math.max(10, hvacParameters.fanSpeed) / 100);
        const angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25; // -45° to +45°

        if (Math.abs(unitRotation) < 0.1) {
          // Back wall unit
          velocityX = Math.sin(angle) * speed;
          velocityY = -Math.cos(angle * 0.5) * speed; // Downward angle
          velocityZ = Math.cos(angle) * speed;
        } else if (Math.abs(unitRotation - Math.PI / 2) < 0.1) {
          // Left wall unit
          velocityX = Math.cos(angle) * speed;
          velocityY = -Math.cos(angle * 0.5) * speed; // Downward angle
          velocityZ = Math.sin(angle) * speed;
        } else if (Math.abs(unitRotation + Math.PI / 2) < 0.1) {
          // Right wall unit
          velocityX = -Math.cos(angle) * speed;
          velocityY = -Math.cos(angle * 0.5) * speed; // Downward angle
          velocityZ = Math.sin(angle) * speed;
        }

        // Store velocity and other properties
        particle.userData = {
          velocity: new THREE.Vector3(velocityX, velocityY, velocityZ),
          // Life tracking
          life: 0,
          maxLife: 100 + Math.random() * 100,
          // Original starting position and emission data
          origin: particle.position.clone(),
          emitX: emitX,
          emitY: emitY,
          emitZ: emitZ,
          unitRotation: unitRotation,
          // Indoor unit this particle belongs to
          unitIndex: unitIndex,
          zoneName: zoneName,
          // Temperature carried by this particle
          temperature:
            roomParameters.mode === "cooling"
              ? roomParameters.targetTemp - 2
              : roomParameters.targetTemp + 2,
        };

        // Add trail for better visibility
        const trailLength = 5;
        particle.userData.trail = [];

        // Use zone color for trail
        const startColor = zoneColor;
        const endColor = new THREE.Color(zoneColor)
          .multiplyScalar(0.5)
          .getHex();

        for (let t = 0; t < trailLength; t++) {
          // Interpolate color between start and end
          const ratio = t / (trailLength - 1);
          const r =
            (1 - ratio) * ((startColor >> 16) & 0xff) +
            ratio * ((endColor >> 16) & 0xff);
          const g =
            (1 - ratio) * ((startColor >> 8) & 0xff) +
            ratio * ((endColor >> 8) & 0xff);
          const b =
            (1 - ratio) * (startColor & 0xff) + ratio * (endColor & 0xff);
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
    });
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
        // Get the indoor unit this particle belongs to
        const unitIndex = particle.userData.unitIndex;
        const indoorUnit = indoorUnitsRef.current[unitIndex];

        if (indoorUnit) {
          // Reset position to this unit's position
          const unitPos = indoorUnit.position.clone();
          const unitRotation = indoorUnit.rotation.y || 0;
          const { emitX, emitY, emitZ } = particle.userData;

          particle.position.set(
            unitPos.x + emitX,
            unitPos.y + emitY,
            unitPos.z + emitZ
          );
          particle.userData.origin = particle.position.clone();

          // Set new velocity based on fan direction and unit orientation
          const angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25;
          const speed =
            (0.02 + Math.random() * 0.03) * (hvacParameters.fanSpeed / 100);

          let velocityX = 0,
            velocityY = 0,
            velocityZ = 0;

          if (Math.abs(unitRotation) < 0.1) {
            // Back wall unit
            velocityX = Math.sin(angle) * speed;
            velocityY = -Math.cos(angle * 0.5) * speed; // Downward angle
            velocityZ = Math.cos(angle) * speed;
          } else if (Math.abs(unitRotation - Math.PI / 2) < 0.1) {
            // Left wall unit
            velocityX = Math.cos(angle) * speed;
            velocityY = -Math.cos(angle * 0.5) * speed; // Downward angle
            velocityZ = Math.sin(angle) * speed;
          } else if (Math.abs(unitRotation + Math.PI / 2) < 0.1) {
            // Right wall unit
            velocityX = -Math.cos(angle) * speed;
            velocityY = -Math.cos(angle * 0.5) * speed; // Downward angle
            velocityZ = Math.sin(angle) * speed;
          }

          particle.userData.velocity = new THREE.Vector3(
            velocityX,
            velocityY,
            velocityZ
          );
        } else {
          // If no indoor unit found, reset to original position
          particle.position.copy(particle.userData.origin);

          // Set new velocity based on fan direction
          const angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25;
          const speed =
            (0.02 + Math.random() * 0.03) * (hvacParameters.fanSpeed / 100);

          particle.userData.velocity = new THREE.Vector3(
            Math.sin(angle) * speed,
            -Math.cos(angle * 0.5) * speed,
            Math.cos(angle) * speed
          );
        }

        // Reset life
        particle.userData.life = 0;

        // Reset opacity
        if (particle.material) {
          particle.material.opacity = 0.8;
        }
      }
    });
  };

  // Update airflow when parameters change
  useEffect(() => {
    if (isSimulationRunning && airflowParticlesRef.current.length > 0) {
      // Update particle colors based on mode and zones
      airflowParticlesRef.current.forEach((particle) => {
        if (particle.material) {
          // Get this particle's zone
          const zoneName = particle.userData.zoneName;
          const zoneColor =
            zoneColors[zoneName] ||
            (roomParameters.mode === "cooling" ? 0x88ccff : 0xffaa66);

          particle.material.color = new THREE.Color(zoneColor);

          // Update trail colors too
          if (particle.userData.trail) {
            const startColor = zoneColor;
            const endColor = new THREE.Color(zoneColor)
              .multiplyScalar(0.5)
              .getHex();

            particle.userData.trail.forEach((trail, index) => {
              if (trail.material) {
                // Interpolate color
                const ratio = index / (particle.userData.trail.length - 1);
                const r =
                  (1 - ratio) * ((startColor >> 16) & 0xff) +
                  ratio * ((endColor >> 16) & 0xff);
                const g =
                  (1 - ratio) * ((startColor >> 8) & 0xff) +
                  ratio * ((endColor >> 8) & 0xff);
                const b =
                  (1 - ratio) * (startColor & 0xff) + ratio * (endColor & 0xff);
                const color =
                  (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

                trail.material.color = new THREE.Color(color);
              }
            });
          }
        }
      });
    }

    // Recreate particles if air flow rate changes significantly or zones change
    if (
      Math.abs(
        airflowParticlesRef.current.length -
          Object.keys(hvacParameters.zones || {}).length *
            hvacParameters.airFlowRate *
            20
      ) > 10
    ) {
      createAirflowParticles();
    }
  }, [
    hvacParameters.fanSpeed,
    hvacParameters.airFlowRate,
    roomParameters.mode,
    isSimulationRunning,
    hvacParameters.zones,
  ]);

  return (
    <Card className="relative w-full bg-background h-96 p-0 p-2">
      {/* Main visualization area */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Status Overlay */}
      <Card className="absolute top-4 left-4 shadow-md z-10 flex justify-center text-center backdrop-blur-sm bg-white/1">
        <CardContent className="px-4">
          <Badge
            variant={
              roomParameters.mode === "cooling" ? "default" : "destructive"
            }
            className="flex justify-center mb-1 w-full"
          >
            {roomParameters.mode === "cooling" ? "Cooling" : "Heating"}
          </Badge>
          <h3 className="text-xl font-bold mb-2">
            {systemStatus?.roomTemperature?.toFixed(1) || "25.0"}°C
          </h3>
          <p className="text-sm text-muted-foreground">
            Target: {(roomParameters.targetTemp || 25).toFixed(1)}°C
          </p>
          <div className="flex justify-center items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">
              Fan Speed: {hvacParameters.fanSpeed || 0}%
            </p>
          </div>
          <div className="flex justify-center items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">
              COP: {(hvacParameters.actualCop || 0).toFixed(1)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Temperature Color Legend */}
      <Card className="absolute bottom-4 right-4 bg-white/1 backdrop-blur-sm shadow-md z-10 py-4 px-0">
        <CardContent>
          <h4 className="text-sm font-medium mb-2">Temperature</h4>

          <div className="w-full h-4 rounded-sm overflow-hidden">
            <div
              className="h-full w-full"
              style={{
                background:
                  roomParameters.mode === "cooling"
                    ? "linear-gradient(to right, #0066ff, #66ff66, #ff6666)"
                    : "linear-gradient(to right, #ff6666, #66ff66, #0066ff)",
              }}
            />
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-xs">
              {roomParameters.mode === "cooling"
                ? ((roomParameters.targetTemp || 25) - 5).toFixed(1)
                : ((roomParameters.targetTemp || 25) + 5).toFixed(1)}
              °C
            </span>
            <span className="text-xs">
              {roomParameters.mode === "cooling"
                ? ((roomParameters.externalTemp || 30) + 5).toFixed(1)
                : ((roomParameters.externalTemp || 30) - 5).toFixed(1)}
              °C
            </span>
          </div>
        </CardContent>
      </Card>
    </Card>
  );
};

export default VRFSystemModel;
