import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Box, Typography } from "@mui/material";

const HeatPumpSystemModel = ({
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
  const compressorRef = useRef(null);
  const reversingValveRef = useRef(null);
  const expansionValveRef = useRef(null);

  // Heat pump specific refs
  const heatExchangerRef = useRef(null);
  const defrostIndicatorRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 10, z: 15 });
  // Set this to a constant as we're only supporting air-to-air now
  const heatPumpType = "air-to-air";

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
        animateRefrigerantFlow();
      }

      // Animate compressor if simulation is running
      if (isSimulationRunning && compressorRef.current) {
        animateCompressor();
      }

      // Animate reversing valve if necessary
      if (reversingValveRef.current) {
        animateReversingValve();
      }

      // Animate defrost cycle if active
      if (defrostIndicatorRef.current && systemStatus?.defrostActive) {
        animateDefrostCycle();
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

    // Add indoor unit
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

  // Create indoor unit - updated for heat pump
  const createIndoorUnit = (roomGroup, length, height, breadth) => {
    // Create indoor unit group
    const indoorUnitGroup = new THREE.Group();

    // Main body - larger for heat pump
    const indoorUnitGeometry = new THREE.BoxGeometry(1.4, 0.4, 0.3);
    const indoorUnitMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
    });
    const indoorUnit = new THREE.Mesh(indoorUnitGeometry, indoorUnitMaterial);
    indoorUnit.castShadow = true;
    indoorUnitGroup.add(indoorUnit);

    // Vents
    const ventGeometry = new THREE.BoxGeometry(1.2, 0.05, 0.15);
    const ventMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const vent = new THREE.Mesh(ventGeometry, ventMaterial);
    vent.position.y = -0.15;
    vent.position.z = 0.05;
    vent.rotation.x = -Math.PI / 6; // Angled down
    indoorUnitGroup.add(vent);

    // Display panel
    const displayGeometry = new THREE.PlaneGeometry(0.3, 0.1);
    const displayMaterial = new THREE.MeshBasicMaterial({
      color: isSimulationRunning ? 0x00ff00 : 0x333333,
    });
    const display = new THREE.Mesh(displayGeometry, displayMaterial);
    display.position.z = 0.16;
    display.position.x = 0.5;
    indoorUnitGroup.add(display);

    // Temperature indicators (for heating/cooling)
    const hotIndicatorGeometry = new THREE.CircleGeometry(0.04, 16);
    const hotIndicatorMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3300,
    });
    const hotIndicator = new THREE.Mesh(
      hotIndicatorGeometry,
      hotIndicatorMaterial
    );
    hotIndicator.position.set(0.5, -0.15, 0.16);
    hotIndicator.visible =
      roomParameters.mode === "heating" && isSimulationRunning;
    indoorUnitGroup.add(hotIndicator);

    const coldIndicatorGeometry = new THREE.CircleGeometry(0.04, 16);
    const coldIndicatorMaterial = new THREE.MeshBasicMaterial({
      color: 0x0066ff,
    });
    const coldIndicator = new THREE.Mesh(
      coldIndicatorGeometry,
      coldIndicatorMaterial
    );
    coldIndicator.position.set(0.6, -0.15, 0.16);
    coldIndicator.visible =
      roomParameters.mode === "cooling" && isSimulationRunning;
    indoorUnitGroup.add(coldIndicator);

    // Indoor heat exchanger (coil representation)
    const heatExchangerGroup = new THREE.Group();
    const coilMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.8,
      roughness: 0.2,
    });

    // Create a simple coil representation
    for (let i = 0; i < 8; i++) {
      const coilSegment = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8),
        coilMaterial
      );
      coilSegment.rotation.x = Math.PI / 2;
      coilSegment.position.set(0, -0.1, -0.05);
      coilSegment.position.x = -0.45 + i * 0.13;
      heatExchangerGroup.add(coilSegment);
    }

    heatExchangerGroup.visible = false; // Hide by default, show for educational purposes
    indoorUnitGroup.add(heatExchangerGroup);
    heatExchangerRef.current = heatExchangerGroup;

    // Position on wall
    indoorUnitGroup.position.set(0, height / 2 - 0.5, -breadth / 2 + 0.15);

    roomGroup.add(indoorUnitGroup);
    indoorUnitRef.current = indoorUnitGroup;
  };

  // Create outdoor unit - updated for heat pump
  const createOutdoorUnit = (roomGroup, length, height, breadth) => {
    // Create outdoor unit group
    const outdoorUnitGroup = new THREE.Group();

    // Main body - larger for heat pump
    const outdoorUnitGeometry = new THREE.BoxGeometry(1.0, 0.9, 0.5);
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
    const grillGeometry = new THREE.CircleGeometry(0.35, 16);
    const grillMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    const grill = new THREE.Mesh(grillGeometry, grillMaterial);
    grill.position.z = 0.26;
    outdoorUnitGroup.add(grill);

    // Fan blades
    const fanGeometry = new THREE.CircleGeometry(0.3, 4);
    const fanMaterial = new THREE.MeshBasicMaterial({
      color: 0x444444,
      side: THREE.DoubleSide,
    });
    const fan = new THREE.Mesh(fanGeometry, fanMaterial);
    fan.position.z = 0.255;

    // Animate fan rotation when simulation is running
    if (isSimulationRunning) {
      fan.rotation.z += (0.1 * hvacParameters.fanSpeed) / 100;
    }

    outdoorUnitGroup.add(fan);

    // Compressor (cylinder)
    const compressorGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 16);
    const compressorMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.7,
      roughness: 0.3,
    });
    const compressor = new THREE.Mesh(compressorGeometry, compressorMaterial);
    compressor.position.set(-0.3, -0.2, 0);
    compressor.rotation.x = Math.PI / 2;
    outdoorUnitGroup.add(compressor);
    compressorRef.current = compressor;

    // Reversing valve (for heat pump mode switching)
    const valveGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.1);
    const valveMaterial = new THREE.MeshStandardMaterial({
      color: 0x774411,
      metalness: 0.5,
      roughness: 0.4,
    });
    const reversingValve = new THREE.Mesh(valveGeometry, valveMaterial);
    reversingValve.position.set(0.3, -0.2, 0);
    outdoorUnitGroup.add(reversingValve);
    reversingValveRef.current = reversingValve;

    // Expansion valve
    const expansionValveGeometry = new THREE.CylinderGeometry(
      0.03,
      0.03,
      0.1,
      8
    );
    const expansionValveMaterial = new THREE.MeshStandardMaterial({
      color: 0xccaa22,
      metalness: 0.7,
      roughness: 0.3,
    });
    const expansionValve = new THREE.Mesh(
      expansionValveGeometry,
      expansionValveMaterial
    );
    expansionValve.position.set(0, -0.3, 0.15);
    outdoorUnitGroup.add(expansionValve);
    expansionValveRef.current = expansionValve;

    // Outdoor heat exchanger (condenser/evaporator coil)
    const coilMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.8,
      roughness: 0.2,
    });

    // Create a simple outdoor coil representation
    const outdoorCoilGroup = new THREE.Group();

    // Horizontal coils
    for (let i = 0; i < 5; i++) {
      const coilSegment = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8),
        coilMaterial
      );
      coilSegment.position.set(0, 0.3 - i * 0.15, 0.2);
      outdoorCoilGroup.add(coilSegment);
    }

    // Vertical connectors
    for (let i = 0; i < 2; i++) {
      const connector = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8),
        coilMaterial
      );
      connector.rotation.x = Math.PI / 2;
      connector.position.set(-0.4 + i * 0.8, 0, 0.2);
      outdoorCoilGroup.add(connector);
    }

    outdoorUnitGroup.add(outdoorCoilGroup);

    // Defrost indicator - visible when defrost cycle is active
    const defrostIndicatorGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const defrostIndicatorMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5,
    });
    const defrostIndicator = new THREE.Mesh(
      defrostIndicatorGeometry,
      defrostIndicatorMaterial
    );
    defrostIndicator.position.set(0.4, 0.3, 0.26);
    defrostIndicator.visible = systemStatus?.defrostActive || false;
    outdoorUnitGroup.add(defrostIndicator);
    defrostIndicatorRef.current = defrostIndicator;

    // Position outside room
    outdoorUnitGroup.position.set(
      -length / 2 - 0.6,
      -height / 2 + 0.6,
      -breadth / 3
    );

    roomGroup.add(outdoorUnitGroup);
    outdoorUnitRef.current = outdoorUnitGroup;
  };

  // Create refrigerant line with more detail for heat pump
  const createRefrigerantLine = (roomGroup, length, height, breadth) => {
    // Create points for the line
    const indoorPos = new THREE.Vector3(
      0,
      height / 2 - 0.5,
      -breadth / 2 + 0.1
    );

    const outdoorPos = new THREE.Vector3(
      -length / 2 - 0.6,
      -height / 2 + 0.6,
      -breadth / 3
    );

    // Create two lines - one for each direction (liquid and gas lines)
    // Liquid Line (smaller)
    const liquidPoints = [
      new THREE.Vector3(indoorPos.x - 0.3, indoorPos.y, indoorPos.z),
      new THREE.Vector3(indoorPos.x - 0.3, indoorPos.y, indoorPos.z),
      new THREE.Vector3(indoorPos.x - 0.3, -height / 2 + 0.1, indoorPos.z),
      new THREE.Vector3(-length / 2 - 0.3, -height / 2 + 0.1, indoorPos.z),
      new THREE.Vector3(-length / 2 - 0.3, -height / 2 + 0.1, outdoorPos.z),
      new THREE.Vector3(-length / 2 - 0.3, outdoorPos.y - 0.1, outdoorPos.z),
      new THREE.Vector3(-length / 2 - 0.3, outdoorPos.y - 0.1, outdoorPos.z),
    ];

    // Gas line (larger)
    const gasPoints = [
      new THREE.Vector3(indoorPos.x + 0.3, indoorPos.y, indoorPos.z),
      new THREE.Vector3(indoorPos.x + 0.3, indoorPos.y, indoorPos.z),
      new THREE.Vector3(indoorPos.x + 0.3, -height / 2 + 0.3, indoorPos.z),
      new THREE.Vector3(-length / 2 - 0.1, -height / 2 + 0.3, indoorPos.z),
      new THREE.Vector3(-length / 2 - 0.1, -height / 2 + 0.3, outdoorPos.z),
      new THREE.Vector3(-length / 2 - 0.1, outdoorPos.y + 0.1, outdoorPos.z),
      new THREE.Vector3(-length / 2 - 0.1, outdoorPos.y + 0.1, outdoorPos.z),
    ];

    // Create curves for both lines
    const liquidCurve = new THREE.CatmullRomCurve3(liquidPoints);
    const gasCurve = new THREE.CatmullRomCurve3(gasPoints);

    // Create tube geometries
    const liquidGeometry = new THREE.TubeGeometry(
      liquidCurve,
      64,
      0.02,
      8,
      false
    );
    const gasGeometry = new THREE.TubeGeometry(gasCurve, 64, 0.035, 8, false);

    // Create materials based on cooling/heating mode
    // In cooling: liquid line is hot (from compressor), gas line is cold (from evaporator)
    // In heating: liquid line is cold, gas line is hot
    const liquidColor = roomParameters.mode === "cooling" ? 0xff6600 : 0x00aaff;
    const gasColor = roomParameters.mode === "cooling" ? 0x00aaff : 0xff6600;

    const liquidEmissive =
      roomParameters.mode === "cooling" ? 0xff2200 : 0x0044ff;
    const gasEmissive = roomParameters.mode === "cooling" ? 0x0044ff : 0xff2200;

    const liquidMaterial = new THREE.MeshStandardMaterial({
      color: liquidColor,
      metalness: 0.8,
      roughness: 0.2,
      emissive: liquidEmissive,
      emissiveIntensity: 0.2,
    });

    const gasMaterial = new THREE.MeshStandardMaterial({
      color: gasColor,
      metalness: 0.8,
      roughness: 0.2,
      emissive: gasEmissive,
      emissiveIntensity: 0.2,
    });

    // Create mesh objects
    const liquidTube = new THREE.Mesh(liquidGeometry, liquidMaterial);
    const gasTube = new THREE.Mesh(gasGeometry, gasMaterial);

    // Add both tubes to a group
    const refrigerantLinesGroup = new THREE.Group();
    refrigerantLinesGroup.add(liquidTube);
    refrigerantLinesGroup.add(gasTube);

    liquidTube.castShadow = true;
    gasTube.castShadow = true;

    // Add insulation to the cold line (different in heating vs cooling)
    const insulationGeometry =
      roomParameters.mode === "cooling"
        ? new THREE.TubeGeometry(gasCurve, 64, 0.05, 8, false)
        : new THREE.TubeGeometry(liquidCurve, 64, 0.04, 8, false);

    const insulationMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.7,
      roughness: 0.9,
    });

    const insulation = new THREE.Mesh(insulationGeometry, insulationMaterial);
    refrigerantLinesGroup.add(insulation);

    roomGroup.add(refrigerantLinesGroup);
    refrigerantLineRef.current = refrigerantLinesGroup;
  };

  // Animate refrigerant flow
  const animateRefrigerantFlow = () => {
    if (!refrigerantLineRef.current) return;

    // Get both tubes (liquid and gas)
    const liquidTube = refrigerantLineRef.current.children[0];
    const gasTube = refrigerantLineRef.current.children[1];

    const time = performance.now() * 0.001;
    const pulseIntensity = 0.2 + Math.sin(time * hvacParameters.power) * 0.1;

    // Update emissive intensity based on power
    if (liquidTube && liquidTube.material) {
      liquidTube.material.emissiveIntensity =
        pulseIntensity * (hvacParameters.power / 10);
    }

    if (gasTube && gasTube.material) {
      gasTube.material.emissiveIntensity =
        pulseIntensity * (hvacParameters.power / 10);
    }
  };

  // Animate compressor
  const animateCompressor = () => {
    if (!compressorRef.current || !isSimulationRunning) return;

    // Make the compressor vibrate slightly to simulate operation
    const time = performance.now() * 0.01;
    const vibrationAmount = 0.002 * (hvacParameters.power / 5);

    compressorRef.current.position.x += Math.sin(time) * vibrationAmount;
    compressorRef.current.position.y += Math.cos(time * 1.3) * vibrationAmount;
  };

  // Animate reversing valve
  const animateReversingValve = () => {
    if (!reversingValveRef.current) return;

    // Use a different material color based on the mode
    // This helps visualize that the reversing valve has switched
    if (reversingValveRef.current.material) {
      const targetColor =
        roomParameters.mode === "heating" ? 0x994422 : 0x2244bb;

      // Smoothly transition the color
      const currentColor = reversingValveRef.current.material.color;
      currentColor.lerp(new THREE.Color(targetColor), 0.05);
    }
  };

  // Animate defrost cycle
  const animateDefrostCycle = () => {
    if (!defrostIndicatorRef.current || !systemStatus?.defrostActive) return;

    // Make the indicator pulse when defrost is active
    const time = performance.now() * 0.005;
    const pulseValue = (Math.sin(time) + 1) * 0.5; // 0 to 1

    defrostIndicatorRef.current.visible = true;

    if (defrostIndicatorRef.current.material) {
      defrostIndicatorRef.current.material.opacity = 0.3 + pulseValue * 0.7;
      defrostIndicatorRef.current.material.emissiveIntensity =
        0.2 + pulseValue * 0.8;
    }
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
          cell.userData = {
            temperature: cellTemp,
            distFactor: distFactor,
          };

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

    // Update defrost indicator visibility
    if (defrostIndicatorRef.current) {
      defrostIndicatorRef.current.visible =
        systemStatus?.defrostActive || false;
    }

    // Update refrigerant lines based on mode
    if (
      refrigerantLineRef.current &&
      refrigerantLineRef.current.children.length >= 2
    ) {
      const liquidTube = refrigerantLineRef.current.children[0];
      const gasTube = refrigerantLineRef.current.children[1];
      const insulation = refrigerantLineRef.current.children[2];

      // In cooling: liquid line is hot (from compressor), gas line is cold (from evaporator)
      // In heating: liquid line is cold (from expansion valve), gas line is hot (from compressor)
      if (liquidTube && liquidTube.material) {
        liquidTube.material.color = new THREE.Color(
          roomParameters.mode === "cooling" ? 0xff6600 : 0x00aaff
        );
        liquidTube.material.emissive = new THREE.Color(
          roomParameters.mode === "cooling" ? 0xff2200 : 0x0044ff
        );
      }

      if (gasTube && gasTube.material) {
        gasTube.material.color = new THREE.Color(
          roomParameters.mode === "cooling" ? 0x00aaff : 0xff6600
        );
        gasTube.material.emissive = new THREE.Color(
          roomParameters.mode === "cooling" ? 0x0044ff : 0xff2200
        );
      }

      // Move insulation to the cold line
      if (insulation && refrigerantLineRef.current.children.length >= 3) {
        // Remove old insulation
        refrigerantLineRef.current.remove(insulation);

        // Recreate on the cold line
        const { length, breadth, height } = roomParameters;
        const indoorPos = new THREE.Vector3(
          0,
          height / 2 - 0.5,
          -breadth / 2 + 0.1
        );
        const outdoorPos = new THREE.Vector3(
          -length / 2 - 0.6,
          -height / 2 + 0.6,
          -breadth / 3
        );

        let insulationPoints;
        if (roomParameters.mode === "cooling") {
          // Insulate gas line (cold) in cooling mode
          insulationPoints = [
            new THREE.Vector3(indoorPos.x + 0.3, indoorPos.y, indoorPos.z),
            new THREE.Vector3(indoorPos.x + 0.3, indoorPos.y, indoorPos.z),
            new THREE.Vector3(
              indoorPos.x + 0.3,
              -height / 2 + 0.3,
              indoorPos.z
            ),
            new THREE.Vector3(
              -length / 2 - 0.1,
              -height / 2 + 0.3,
              indoorPos.z
            ),
            new THREE.Vector3(
              -length / 2 - 0.1,
              -height / 2 + 0.3,
              outdoorPos.z
            ),
            new THREE.Vector3(
              -length / 2 - 0.1,
              outdoorPos.y + 0.1,
              outdoorPos.z
            ),
            new THREE.Vector3(
              -length / 2 - 0.1,
              outdoorPos.y + 0.1,
              outdoorPos.z
            ),
          ];
        } else {
          // Insulate liquid line (cold) in heating mode
          insulationPoints = [
            new THREE.Vector3(indoorPos.x - 0.3, indoorPos.y, indoorPos.z),
            new THREE.Vector3(indoorPos.x - 0.3, indoorPos.y, indoorPos.z),
            new THREE.Vector3(
              indoorPos.x - 0.3,
              -height / 2 + 0.1,
              indoorPos.z
            ),
            new THREE.Vector3(
              -length / 2 - 0.3,
              -height / 2 + 0.1,
              indoorPos.z
            ),
            new THREE.Vector3(
              -length / 2 - 0.3,
              -height / 2 + 0.1,
              outdoorPos.z
            ),
            new THREE.Vector3(
              -length / 2 - 0.3,
              outdoorPos.y - 0.1,
              outdoorPos.z
            ),
            new THREE.Vector3(
              -length / 2 - 0.3,
              outdoorPos.y - 0.1,
              outdoorPos.z
            ),
          ];
        }

        const curve = new THREE.CatmullRomCurve3(insulationPoints);
        const insulationGeometry = new THREE.TubeGeometry(
          curve,
          64,
          0.05,
          8,
          false
        );
        const insulationMaterial = new THREE.MeshStandardMaterial({
          color: 0x333333,
          transparent: true,
          opacity: 0.7,
          roughness: 0.9,
        });

        const newInsulation = new THREE.Mesh(
          insulationGeometry,
          insulationMaterial
        );
        refrigerantLineRef.current.add(newInsulation);
      }
    }
  }, [
    systemStatus?.roomTemperature,
    systemStatus?.defrostActive,
    roomParameters.targetTemp,
    roomParameters.mode,
    hvacParameters.fanSpeed,
    hvacParameters.power,
  ]);

  // Create airflow particles
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

  // Update heat pump specific visualization based on system status changes
  useEffect(() => {
    if (systemStatus?.defrostActive) {
      // Defrost cycle is active - make outdoor coil glow to indicate heating
      // This would be implemented if we had a specific outdoor coil mesh reference
    }
  }, [systemStatus?.defrostActive]);

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
        <Typography variant="body2">
          COP: {systemStatus?.actualCop?.toFixed(2) || "3.00"}
        </Typography>
        {systemStatus?.defrostActive && (
          <Typography
            variant="body2"
            sx={{ color: "error.main", fontWeight: "bold" }}
          >
            Defrost Active
          </Typography>
        )}
      </Box>

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

export default HeatPumpSystemModel;
